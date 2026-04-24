/**
 * lib/cloudImage.ts
 *
 * Provider-agnostic adapter for cloud-based FLUX.1 schnell image generation.
 *
 * All five supported providers (fal.ai, Fireworks, Together AI, Replicate,
 * WaveSpeed) run FLUX.1 schnell at 4 steps / 512×512, so visual output
 * is comparable regardless of which provider the family chooses.
 *
 * Design rules:
 *   - No provider SDKs. Each provider is a plain REST POST + bearer auth.
 *   - Uses fetch() + AbortController for timeouts. No Node.js assumptions.
 *   - Returns raw Uint8Array bytes; disk-write happens in the caller (lib/imageGen.ts).
 *   - Dynamic-import target: this file is only imported when cloud is active.
 */

export type CloudProvider = 'fal' | 'fireworks' | 'together' | 'replicate' | 'wavespeed';

export interface CloudGenerateParams {
  prompt: string;
  seed: number;
  width: number;   // 512
  height: number;  // 512
  provider: CloudProvider;
  apiKey: string;
  timeoutMs?: number; // default 8000
}

export interface CloudGenerateResult {
  bytes: Uint8Array;
  contentType: 'image/png' | 'image/jpeg';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function b64ToUint8Array(b64: string): Uint8Array {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

async function downloadImageAsBytes(url: string, signal: AbortSignal): Promise<{ bytes: Uint8Array; contentType: 'image/png' | 'image/jpeg' }> {
  const resp = await fetch(url, { signal });
  if (!resp.ok) {
    throw new Error(`Image download failed: ${resp.status}`);
  }
  const ct = resp.headers.get('content-type') ?? '';
  const contentType: 'image/png' | 'image/jpeg' = ct.includes('png') ? 'image/png' : 'image/jpeg';
  const arrayBuf = await resp.arrayBuffer();
  return { bytes: new Uint8Array(arrayBuf), contentType };
}

// ---------------------------------------------------------------------------
// Provider: fal.ai
// https://fal.ai/models/fal-ai/flux/schnell
// Response: { images: [{ url: string, content_type: string }] }
// ---------------------------------------------------------------------------
async function generateFal(params: CloudGenerateParams, signal: AbortSignal): Promise<CloudGenerateResult> {
  const body = {
    prompt: params.prompt,
    num_inference_steps: 4,
    image_size: { width: params.width, height: params.height },
    seed: params.seed,
    num_images: 1,
    output_format: 'jpeg',
  };

  const resp = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`fal.ai error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json() as { images: Array<{ url: string; content_type?: string }> };
  const imageUrl = json.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal.ai: no image URL in response');

  return downloadImageAsBytes(imageUrl, signal);
}

// ---------------------------------------------------------------------------
// Provider: Fireworks
// https://fireworks.ai/models/fireworks/flux-1-schnell-fp8
// Response: { output: [{ url: string }] }  -or-  binary stream
// ---------------------------------------------------------------------------
async function generateFireworks(params: CloudGenerateParams, signal: AbortSignal): Promise<CloudGenerateResult> {
  const body = {
    prompt: params.prompt,
    num_inference_steps: 4,
    width: params.width,
    height: params.height,
    seed: params.seed,
    cfg_scale: 3.5,
    output_image_format: 'JPEG',
  };

  const resp = await fetch('https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/flux-1-schnell-fp8', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'image/jpeg',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Fireworks error ${resp.status}: ${text.slice(0, 200)}`);
  }

  // Fireworks returns raw image bytes directly
  const arrayBuf = await resp.arrayBuffer();
  const ct = resp.headers.get('content-type') ?? '';
  const contentType: 'image/png' | 'image/jpeg' = ct.includes('png') ? 'image/png' : 'image/jpeg';
  return { bytes: new Uint8Array(arrayBuf), contentType };
}

// ---------------------------------------------------------------------------
// Provider: Together AI
// https://docs.together.ai/docs/images
// Response: { data: [{ url?: string; b64_json?: string }] }
// ---------------------------------------------------------------------------
async function generateTogether(params: CloudGenerateParams, signal: AbortSignal): Promise<CloudGenerateResult> {
  const body = {
    model: 'black-forest-labs/FLUX.1-schnell',
    prompt: params.prompt,
    steps: 4,
    width: params.width,
    height: params.height,
    seed: params.seed,
    n: 1,
    response_format: 'b64_json',
  };

  const resp = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Together AI error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json() as { data: Array<{ b64_json?: string; url?: string }> };
  const item = json.data?.[0];
  if (!item) throw new Error('Together AI: empty data in response');

  if (item.b64_json) {
    return { bytes: b64ToUint8Array(item.b64_json), contentType: 'image/jpeg' };
  }
  if (item.url) {
    return downloadImageAsBytes(item.url, signal);
  }
  throw new Error('Together AI: neither b64_json nor url in response item');
}

// ---------------------------------------------------------------------------
// Provider: Replicate
// https://replicate.com/black-forest-labs/flux-schnell
// Async API: POST /predictions → poll until succeeded, then download output URL
// ---------------------------------------------------------------------------
async function generateReplicate(params: CloudGenerateParams, signal: AbortSignal): Promise<CloudGenerateResult> {
  // Create prediction
  const createResp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=25',  // server-sent wait; avoids polling for most requests
    },
    body: JSON.stringify({
      input: {
        prompt: params.prompt,
        num_inference_steps: 4,
        width: params.width,
        height: params.height,
        seed: params.seed,
        output_format: 'jpg',
        output_quality: 85,
      },
    }),
    signal,
  });

  if (!createResp.ok) {
    const text = await createResp.text().catch(() => '');
    throw new Error(`Replicate error ${createResp.status}: ${text.slice(0, 200)}`);
  }

  type ReplicatePrediction = { id: string; status: string; output?: string[]; urls?: { get: string } };
  let prediction = await createResp.json() as ReplicatePrediction;

  // Poll if not yet complete (happens when Prefer: wait is ignored)
  const pollUrl = prediction.urls?.get;
  let pollCount = 0;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    if (pollCount++ > 20) throw new Error('Replicate: timed out polling for result');
    await new Promise((r) => setTimeout(r, 500));
    if (signal.aborted) throw new Error('Replicate: aborted');
    if (!pollUrl) throw new Error('Replicate: no polling URL');
    const pollResp = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${params.apiKey}` },
      signal,
    });
    if (!pollResp.ok) throw new Error(`Replicate poll error ${pollResp.status}`);
    prediction = await pollResp.json() as ReplicatePrediction;
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(`Replicate: prediction ${prediction.status}`);
  }

  const imageUrl = prediction.output?.[0];
  if (!imageUrl) throw new Error('Replicate: no output URL in succeeded prediction');

  return downloadImageAsBytes(imageUrl, signal);
}

// ---------------------------------------------------------------------------
// Provider: WaveSpeed
// https://wavespeed.ai  (ParaAttention-accelerated FLUX.1 schnell)
// Response: { images: [{ url: string }] }
// ---------------------------------------------------------------------------
async function generateWaveSpeed(params: CloudGenerateParams, signal: AbortSignal): Promise<CloudGenerateResult> {
  const body = {
    prompt: params.prompt,
    num_inference_steps: 4,
    width: params.width,
    height: params.height,
    seed: params.seed,
    num_images: 1,
    output_format: 'jpeg',
  };

  const resp = await fetch('https://api.wavespeed.ai/api/v2/wavespeed-ai/flux-schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`WaveSpeed error ${resp.status}: ${text.slice(0, 200)}`);
  }

  // WaveSpeed may return synchronously (sub-second) or with a result URL
  const contentTypeHeader = resp.headers.get('content-type') ?? '';
  if (contentTypeHeader.startsWith('image/')) {
    const arrayBuf = await resp.arrayBuffer();
    const contentType: 'image/png' | 'image/jpeg' = contentTypeHeader.includes('png') ? 'image/png' : 'image/jpeg';
    return { bytes: new Uint8Array(arrayBuf), contentType };
  }

  type WaveSpeedResponse = { images?: Array<{ url: string }>; data?: { images?: Array<{ url: string }> } };
  const json = await resp.json() as WaveSpeedResponse;
  // Handle both top-level and nested 'data' envelope shapes
  const images = json.images ?? json.data?.images;
  const imageUrl = images?.[0]?.url;
  if (!imageUrl) throw new Error('WaveSpeed: no image URL in response');

  return downloadImageAsBytes(imageUrl, signal);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an image using the specified cloud provider.
 * Returns raw bytes + content type; the caller writes to disk.
 *
 * Throws on any failure — callers in lib/imageGen.ts must wrap in try/catch
 * and fall back to procedural.
 */
export async function generateCloudImage(params: CloudGenerateParams): Promise<CloudGenerateResult> {
  const timeout = params.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    switch (params.provider) {
      case 'fal':        return await generateFal(params, controller.signal);
      case 'fireworks':  return await generateFireworks(params, controller.signal);
      case 'together':   return await generateTogether(params, controller.signal);
      case 'replicate':  return await generateReplicate(params, controller.signal);
      case 'wavespeed':  return await generateWaveSpeed(params, controller.signal);
      default: {
        const _exhaustive: never = params.provider;
        throw new Error(`Unknown cloud provider: ${_exhaustive}`);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate that the given API key works for the given provider.
 * Uses a minimal 1-step generation with a 3 s timeout to keep cost near zero.
 *
 * Returns { ok: true } on success, or { ok: false, message } on any failure.
 */
export async function testCloudCredentials(
  provider: CloudProvider,
  apiKey: string
): Promise<{ ok: boolean; message: string }> {
  try {
    await generateCloudImage({
      prompt: 'test, simple colored circle',
      seed: 42,
      width: 512,
      height: 512,
      provider,
      apiKey,
      timeoutMs: 10000,
    });
    return { ok: true, message: 'Key works' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.includes('403')) {
      return { ok: false, message: 'Key rejected (invalid API key)' };
    }
    if (msg.includes('abort') || msg.includes('timed out') || msg.includes('timeout')) {
      return { ok: false, message: 'Provider unreachable (timeout)' };
    }
    return { ok: false, message: `Error: ${msg.slice(0, 120)}` };
  }
}
