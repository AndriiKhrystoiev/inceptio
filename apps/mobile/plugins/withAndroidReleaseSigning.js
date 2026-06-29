const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Injects a `release` signingConfig into android/app/build.gradle that reads the
 * Inceptio upload key from gradle properties (-PINCEPTIO_UPLOAD_*). Without this,
 * `expo prebuild --clean` regenerates build.gradle signing the release build with
 * the DEBUG keystore — Play rejects that. Keeping it as a config plugin makes every
 * clean prebuild produce a release-signable project (no manual build.gradle edit).
 *
 * Secrets stay OUT of the repo: the actual key path/passwords are passed at build
 * time via gradle properties (see scripts/release-build.sh).
 */
const RELEASE_SIGNING = `        release {
            if (project.hasProperty('INCEPTIO_UPLOAD_STORE_FILE')) {
                storeFile file(INCEPTIO_UPLOAD_STORE_FILE)
                storePassword INCEPTIO_UPLOAD_STORE_PASSWORD
                keyAlias INCEPTIO_UPLOAD_KEY_ALIAS
                keyPassword INCEPTIO_UPLOAD_KEY_PASSWORD
            }
        }
`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('INCEPTIO_UPLOAD_STORE_FILE')) return cfg; // idempotent

    // 1) declare signingConfigs.release right after the `signingConfigs {` opener.
    if (!/signingConfigs\s*\{/.test(src)) {
      throw new Error('[withAndroidReleaseSigning] no signingConfigs block found in build.gradle');
    }
    src = src.replace(/signingConfigs\s*\{\s*\n/, (m) => m + RELEASE_SIGNING);

    // 2) point buildTypes.release at it (RN template defaults to signingConfigs.debug).
    const before = src;
    src = src.replace(
      /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
      '$1signingConfigs.release',
    );
    if (src === before) {
      throw new Error('[withAndroidReleaseSigning] could not repoint buildTypes.release signingConfig');
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
