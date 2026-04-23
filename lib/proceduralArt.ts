/**
 * lib/proceduralArt.ts
 *
 * Generates a deterministic, palette-coherent abstract artwork for each Rose/Thorn entry.
 * Uses @shopify/react-native-skia to render off-screen, then saves to expo-file-system.
 *
 * Invariants:
 * - Same inputs → same image (deterministic via seeded RNG)
 * - Never blocks screen transitions — callers should await in the background
 * - Rose mood: warm amber/rose palette; Thorn mood: cooler emerald/slate palette
 */

import { Skia, PaintStyle, BlurStyle, TileMode } from '@shopify/react-native-skia';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';

export type ArtMood = 'rose' | 'thorn';

export interface ProceduralArtParams {
  text: string;
  memberName: string;
  seed?: number;
  mood: ArtMood;
}

export interface ArtResult {
  uri: string;
  seed: number;
}

const IMAGE_SIZE = 512;

function getImagesDir(): string {
  return `${documentDirectory ?? ''}roseandthorn/images/`;
}

// ─── Seeded pseudo-random number generator (mulberry32) ─────────────────────
function mulberry32(seed: number) {
  let s = seed;
  return function (): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Hash a string to a stable 32-bit integer seed ──────────────────────────
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function computeSeed(text: string, memberName: string): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return hashString(`${memberName}|${text}|${today}`);
}

// ─── Color palettes ──────────────────────────────────────────────────────────
const ROSE_PALETTE = [
  '#fffbeb', // amber-50 (background)
  '#fef3c7', // amber-100
  '#fde68a', // amber-200
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#ffe4e6', // rose-100
  '#fb7185', // rose-400
  '#fbbf24', // amber-400
];

const THORN_PALETTE = [
  '#f0fdf4', // emerald-50 (background)
  '#d1fae5', // emerald-100
  '#a7f3d0', // emerald-200
  '#059669', // emerald-600
  '#064e3b', // emerald-900
  '#6b7280', // gray-500
  '#34d399', // emerald-400
  '#1e3a2f', // deep forest
];

// ─── Main generation function ────────────────────────────────────────────────
export async function generateProceduralArt(
  params: ProceduralArtParams,
  filename: string
): Promise<ArtResult> {
  const seed = params.seed ?? computeSeed(params.text, params.memberName);
  const rng = mulberry32(seed);
  const palette = params.mood === 'rose' ? ROSE_PALETTE : THORN_PALETTE;

  // Ensure images directory exists
  const imagesDir = getImagesDir();
  const dirInfo = await getInfoAsync(imagesDir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(imagesDir, { intermediates: true });
  }

  const filePath = `${imagesDir}${filename}`;

  // Create an off-screen Skia surface
  const surface = Skia.Surface.Make(IMAGE_SIZE, IMAGE_SIZE);
  if (!surface) {
    throw new Error('Failed to create Skia surface');
  }

  const canvas = surface.getCanvas();

  // ── Background ──────────────────────────────────────────────────────────────
  const bgPaint = Skia.Paint();
  bgPaint.setColor(Skia.Color(palette[0]));
  canvas.drawRect(Skia.XYWHRect(0, 0, IMAGE_SIZE, IMAGE_SIZE), bgPaint);

  // ── Radial gradient background wash ─────────────────────────────────────────
  const gradCx = IMAGE_SIZE * (0.3 + rng() * 0.4);
  const gradCy = IMAGE_SIZE * (0.3 + rng() * 0.4);
  const gradR = IMAGE_SIZE * (0.5 + rng() * 0.4);
  const gradPaint = Skia.Paint();
  const gradShader = Skia.Shader.MakeRadialGradient(
    { x: gradCx, y: gradCy },
    gradR,
    [Skia.Color(palette[7] ?? palette[1]), Skia.Color(palette[0])],
    [0, 1],
    TileMode.Clamp
  );
  gradPaint.setShader(gradShader);
  gradPaint.setAlphaf(0.55);
  canvas.drawRect(Skia.XYWHRect(0, 0, IMAGE_SIZE, IMAGE_SIZE), gradPaint);

  // ── Layered blobs (organic circles with varying alpha) ─────────────────────
  const BLOB_COUNT = 6 + Math.floor(rng() * 6);
  for (let i = 0; i < BLOB_COUNT; i++) {
    const cx = rng() * IMAGE_SIZE;
    const cy = rng() * IMAGE_SIZE;
    const r = IMAGE_SIZE * (0.08 + rng() * 0.22);
    const colorIndex = Math.floor(rng() * palette.length);
    const alpha = 0.15 + rng() * 0.45;

    const blobPaint = Skia.Paint();
    blobPaint.setColor(Skia.Color(palette[colorIndex]));
    blobPaint.setAlphaf(alpha);
    // Use blur mask for soft-edged blobs
    const blur = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, r * 0.5, true);
    blobPaint.setMaskFilter(blur);
    canvas.drawCircle(cx, cy, r, blobPaint);
  }

  // ── Accent circles (crisp, semi-transparent) ─────────────────────────────
  const ACCENT_COUNT = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < ACCENT_COUNT; i++) {
    const cx = rng() * IMAGE_SIZE;
    const cy = rng() * IMAGE_SIZE;
    const r = IMAGE_SIZE * (0.015 + rng() * 0.06);
    const colorIndex = Math.floor(rng() * palette.length);
    const alpha = 0.5 + rng() * 0.5;

    const accentPaint = Skia.Paint();
    accentPaint.setColor(Skia.Color(palette[colorIndex]));
    accentPaint.setAlphaf(alpha);
    canvas.drawCircle(cx, cy, r, accentPaint);
  }

  // ── Flowing lines (bezier curves as abstract tendrils) ────────────────────
  const LINE_COUNT = 4 + Math.floor(rng() * 5);
  for (let i = 0; i < LINE_COUNT; i++) {
    const path = Skia.Path.Make();
    const sx = rng() * IMAGE_SIZE;
    const sy = rng() * IMAGE_SIZE;
    path.moveTo(sx, sy);

    const cp1x = rng() * IMAGE_SIZE;
    const cp1y = rng() * IMAGE_SIZE;
    const cp2x = rng() * IMAGE_SIZE;
    const cp2y = rng() * IMAGE_SIZE;
    const ex = rng() * IMAGE_SIZE;
    const ey = rng() * IMAGE_SIZE;
    path.cubicTo(cp1x, cp1y, cp2x, cp2y, ex, ey);

    const linePaint = Skia.Paint();
    linePaint.setStyle(PaintStyle.Stroke);
    const colorIndex = Math.floor(rng() * palette.length);
    linePaint.setColor(Skia.Color(palette[colorIndex]));
    linePaint.setAlphaf(0.2 + rng() * 0.4);
    linePaint.setStrokeWidth(1 + rng() * 3);
    linePaint.setAntiAlias(true);
    canvas.drawPath(path, linePaint);
  }

  // ── Snapshot → base64 → file ─────────────────────────────────────────────
  surface.flush();
  const image = surface.makeImageSnapshot();
  const base64 = image.encodeToBase64();
  await writeAsStringAsync(filePath, base64, {
    encoding: EncodingType.Base64,
  });

  return { uri: `file://${filePath}`, seed };
}
