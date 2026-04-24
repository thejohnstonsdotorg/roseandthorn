/**
 * plugins/withReleaseSigning.js
 *
 * Expo config plugin that patches android/app/build.gradle to add
 * conditional release signing. When RELEASE_STORE_FILE is present in
 * Gradle properties (injected by EAS Build automatically from its managed
 * credentials), the release build type uses it. Otherwise it falls back to
 * the debug keystore so local assembleDebug/assembleRelease still works.
 *
 * This approach keeps the signing logic in source control without committing
 * the android/ CNG directory, which EAS regenerates from scratch on each build.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING_CONFIG = `
    // ── Release signing (added by plugins/withReleaseSigning.js) ─────────────
    // EAS Build injects RELEASE_STORE_FILE and related properties automatically
    // via its managed credentials flow. Local debug builds fall back to the
    // debug keystore when those properties are absent.
    if (project.hasProperty('RELEASE_STORE_FILE')) {
      release {
        storeFile file(RELEASE_STORE_FILE)
        storePassword RELEASE_STORE_PASSWORD
        keyAlias RELEASE_KEY_ALIAS
        keyPassword RELEASE_KEY_PASSWORD
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
`;

const RELEASE_SIGNING_CONFIG = `
            // ── Release signing (added by plugins/withReleaseSigning.js) ─────
            if (project.hasProperty('RELEASE_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }
            // ─────────────────────────────────────────────────────────────────
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Skip if already patched
    if (contents.includes('withReleaseSigning.js')) {
      return config;
    }

    // 1. Inject the release signingConfig block after the debug signingConfig
    let patched = contents.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}\s*\})/,
      (match) => match + SIGNING_CONFIG
    );

    // 2. Replace the hardcoded `signingConfig signingConfigs.debug` in the
    //    release buildType with the conditional version
    patched = patched.replace(
      /(\s*release\s*\{[\s\S]*?)(\s*\/\/\s*Caution[\s\S]*?\n\s*signingConfig signingConfigs\.debug)/,
      (match, before) => before + RELEASE_SIGNING_CONFIG
    );

    config.modResults.contents = patched;
    return config;
  });
};
