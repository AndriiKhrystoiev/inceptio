#!/usr/bin/env bash
# Local production build for Inceptio (no EAS). Produces a store-ready artifact.
# Usage:  scripts/release-build.sh android
#         scripts/release-build.sh ios
# Upload is intentionally NOT automated (outward-facing) — the script prints the
# exact upload command at the end.
set -euo pipefail

PLATFORM="${1:-}"
case "$PLATFORM" in ios|android) ;; *) echo "usage: $0 ios|android" >&2; exit 2 ;; esac

export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
NODE_BIN="$HOME/.nvm/versions/node/v22.14.0/bin/node"
cd "$(dirname "$0")/.."                     # → apps/mobile
ROOT="$(pwd)"

# --- .env neutralization: blank ONLY the astrology dev creds (Metro inlines them
#     into the prod bundle). KEEP EXPO_PUBLIC_VERSION_POLICY_URL — the update gate
#     must ship. Always restored via trap, even on failure/^C. ---
ENV_FILE="$ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  ENV_BAK="$(mktemp)"; cp "$ENV_FILE" "$ENV_BAK"
  trap 'cp "$ENV_BAK" "$ENV_FILE"; rm -f "$ENV_BAK"; echo "↩︎  .env restored"' EXIT
  /usr/bin/sed -i '' -E \
    -e 's#^(EXPO_PUBLIC_ASTROLOGY_BASE_URL)=.*#\1=#' \
    -e 's#^(EXPO_PUBLIC_ASTROLOGY_DEV_KEY)=.*#\1=#' "$ENV_FILE"
  echo "✓ .env dev creds blanked (gate URL kept)"
fi

if [ "$PLATFORM" = "android" ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17
  KS="$HOME/.config/inceptio/inceptio-upload.keystore"
  CREDS="$HOME/.config/inceptio/keystore-credentials.txt"
  STORE_PASS="$(grep -E '^store password' "$CREDS" | sed -E 's/.*: *//')"
  KEY_PASS="$(grep -E '^key password'   "$CREDS" | sed -E 's/.*: *//')"

  npx expo prebuild --clean -p android
  printf 'sdk.dir=%s\n' "$HOME/Library/Android/sdk" > "$ROOT/android/local.properties"

  # Fail loud if the signing plugin didn't inject the upload signingConfig —
  # better to abort than ship a debug-signed .aab Play will reject.
  grep -q 'INCEPTIO_UPLOAD_STORE_FILE' android/app/build.gradle \
    || { echo "✗ release signingConfig missing — withAndroidReleaseSigning plugin didn't apply" >&2; exit 1; }

  ( cd android && ./gradlew :app:bundleRelease \
      -PINCEPTIO_UPLOAD_STORE_FILE="$KS" \
      -PINCEPTIO_UPLOAD_STORE_PASSWORD="$STORE_PASS" \
      -PINCEPTIO_UPLOAD_KEY_ALIAS="inceptio-upload" \
      -PINCEPTIO_UPLOAD_KEY_PASSWORD="$KEY_PASS" )

  AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
  echo "✓ AAB: $AAB"
  # Verify it's signed by the upload key, not debug:
  unzip -p "$AAB" META-INF/*.RSA 2>/dev/null | keytool -printcert 2>/dev/null | grep -i 'SHA256' || true
  echo
  echo "NEXT (manual — Play API upload is blocked): upload this .aab in Play Console →"
  echo "  Internal testing or Production, then promote/roll out."
  exit 0
fi

# ---------- iOS ----------
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
ISSUER="5726f3a0-ca34-4403-a767-3dae735b72bc"
KEY_ID="8NQS9JA767"

npx expo prebuild --clean -p ios
echo "export NODE_BINARY=$NODE_BIN" > ios/.xcode.env.local

# prebuild --clean wipes ios/, so recreate the export options used for v1.0.0.
cat > ios/exportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>T29RJZB64F</string>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>uploadSymbols</key><true/>
</dict></plist>
PLIST

( cd ios && pod install )

xcodebuild -workspace ios/Inceptio.xcworkspace -scheme Inceptio \
  -configuration Release -archivePath ios/build/Inceptio.xcarchive \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8" \
  -authenticationKeyID "$KEY_ID" -authenticationKeyIssuerID "$ISSUER" \
  DEVELOPMENT_TEAM=T29RJZB64F CODE_SIGN_STYLE=Automatic clean archive

xcodebuild -exportArchive -archivePath ios/build/Inceptio.xcarchive \
  -exportOptionsPlist ios/exportOptions.plist -exportPath ios/build/export \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8" \
  -authenticationKeyID "$KEY_ID" -authenticationKeyIssuerID "$ISSUER"

IPA="$(ls ios/build/export/*.ipa | head -1)"
echo "✓ Dev key absent in bundle? (must print nothing below)"
strings ios/build/export/Payload/*.app/main.jsbundle 2>/dev/null | grep -c '^ask_' || true
echo "✓ IPA: $ROOT/$IPA"
echo
echo "VALIDATE, then UPLOAD when ready:"
echo "  xcrun altool --validate-app -f \"$IPA\" -t ios --apiKey $KEY_ID --apiIssuer $ISSUER"
echo "  xcrun altool --upload-app   -f \"$IPA\" -t ios --apiKey $KEY_ID --apiIssuer $ISSUER"
