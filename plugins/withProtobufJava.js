/**
 * plugins/withProtobufJava.js
 *
 * Expo config plugin that patches android/build.gradle to substitute
 * protobuf-javalite with protobuf-java globally across all subprojects.
 *
 * Why: MediaPipe's Java API was compiled against protobuf-java (full runtime,
 * GeneratedMessage hierarchy). At runtime, protobuf-javalite is resolved
 * instead (pulled in by React Native), causing NoSuchMethodError on
 * Any$Builder.build() because javalite's Any$Builder extends
 * GeneratedMessageLite$Builder which doesn't expose build() on the subclass.
 *
 * The substitution is applied at the root Gradle level so it wins over any
 * module-scoped resolution and affects the final merged APK dex.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const PROTOBUF_SUBSTITUTION = `
// ── protobuf-java substitution (added by plugins/withProtobufJava.js) ────────
// MediaPipe requires protobuf-java (full runtime). Replace protobuf-javalite
// globally so Any\$Builder.build() is available at runtime.
subprojects {
  configurations.all {
    resolutionStrategy.dependencySubstitution {
      substitute module('com.google.protobuf:protobuf-javalite') using module('com.google.protobuf:protobuf-java:4.26.1')
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────
`;

module.exports = function withProtobufJava(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('protobuf-java substitution')) {
      config.modResults.contents += PROTOBUF_SUBSTITUTION;
    }
    return config;
  });
};
