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
 * - `false` in `production` profile (v1.0) — simplifies Data Safety declaration
 *   ("no data collected, no data shared").
 * - `true` in `development` and `preview` profiles so the feature remains
 *   testable during development.
 * - Will be flipped to `true` in the `production` profile for v1.1 once the
 *   Play Store listing has been updated with the Cloud AI Data Safety disclosure.
 */
export const ENABLE_CLOUD_AI: boolean =
  process.env.EXPO_PUBLIC_ENABLE_CLOUD_AI === 'true';
