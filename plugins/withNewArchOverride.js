/**
 * plugins/withNewArchOverride.js
 *
 * Allows the EXPO_NEW_ARCH_ENABLED environment variable to override the
 * newArchEnabled setting in android/gradle.properties at prebuild time.
 *
 * Why: @shopify/react-native-skia 2.2.12 has a codegen gap with New
 * Architecture — SkiaPictureViewManager is missing generated view-manager
 * setters, which causes a silent render failure in production builds with
 * newArchEnabled=true. The dev client works because it doesn't run the
 * same codegen path at runtime.
 *
 * Setting EXPO_NEW_ARCH_ENABLED=false in the EAS production profile
 * disables New Architecture for the store build until a Skia version
 * that fully supports New Architecture codegen is available.
 *
 * app.json newArchEnabled stays true so local dev builds (expo run:android)
 * continue using New Architecture unchanged.
 */
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withNewArchOverride(config) {
  // Only apply the override when explicitly set via environment variable.
  const override = process.env.EXPO_NEW_ARCH_ENABLED;
  if (override === undefined || override === '') {
    // No override — leave whatever app.json / gradle.properties specifies.
    return config;
  }

  const enabled = override === 'true';

  return withGradleProperties(config, (config) => {
    // Find and replace the existing newArchEnabled entry, or add it.
    const props = config.modResults;
    const idx = props.findIndex(
      (item) => item.type === 'property' && item.key === 'newArchEnabled'
    );
    const newEntry = { type: 'property', key: 'newArchEnabled', value: String(enabled) };
    if (idx >= 0) {
      props[idx] = newEntry;
    } else {
      props.push(newEntry);
    }
    return config;
  });
};
