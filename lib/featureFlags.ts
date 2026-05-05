/**
 * lib/featureFlags.ts
 *
 * Build-time feature flags sourced from Expo public env vars.
 * Set values per-profile in eas.json under the `env` key.
 *
 * Rules:
 *   - All flags default to the safest/simplest option for production builds.
 *   - `development` and `preview` profiles in eas.json can override to `true`.
 *   - Never read these at import time in hot-path code — they are evaluated once
 *     at module load and are effectively constants.
 *
 * Adding a new flag:
 *   1. Add `EXPO_PUBLIC_<NAME>=<value>` to each eas.json profile that needs a
 *      non-default value.
 *   2. Export a typed constant here.
 *   3. Gate the feature in the relevant component or module.
 */

/**
 * Whether Cloud AI image generation (FLUX.1 schnell via BYO API key) is
 * available in this build.
 *
 * - `true` in `production` profile (v1.1) — users can supply their own API key
 *   for cloud-based image generation.
 * - `true` in `development` and `preview` profiles for testing.
 * - Requires Play Store Data Safety disclosure: data is sent to cloud providers
 *   (fal.ai, Fireworks, Together AI, Replicate, WaveSpeed) for image generation.
 */
export const ENABLE_CLOUD_AI: boolean =
  process.env.EXPO_PUBLIC_ENABLE_CLOUD_AI === 'true';
