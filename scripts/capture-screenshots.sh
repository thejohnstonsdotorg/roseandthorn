#!/usr/bin/env bash
# scripts/capture-screenshots.sh
#
# Capture Play Store screenshots from the connected Pixel 10 Pro.
# Run from the repo root with the device connected over USB + ADB enabled.
#
# Prerequisites:
#   adb in PATH  (brew install android-platform-tools, or via Android Studio)
#   App already installed and running on device
#
# Usage:
#   chmod +x scripts/capture-screenshots.sh
#   scripts/capture-screenshots.sh
#
# Screenshots are saved to docs/store-assets/screenshots/raw/

set -euo pipefail

DEVICE="57150DLCH001ZQ"
OUTPUT_DIR="docs/store-assets/screenshots/raw"

# Verify device is connected
if ! adb -s "$DEVICE" get-state > /dev/null 2>&1; then
  echo "ERROR: Device $DEVICE not connected. Run: adb devices"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

capture() {
  local name="$1"
  local label="$2"
  echo "Capturing: $label → $OUTPUT_DIR/$name"
  echo "  → Navigate to the $label screen now, then press ENTER to capture..."
  read -r
  adb -s "$DEVICE" exec-out screencap -p > "$OUTPUT_DIR/$name"
  echo "  ✓ Saved $name"
}

echo "=== Rose & Thorn — Play Store Screenshot Capture ==="
echo ""
echo "Make sure the app is open on the device."
echo "You will be prompted before each capture."
echo ""

capture "01-home.png"    "Home screen (Begin Dinner button visible)"
capture "02-setup.png"   "Setup / Family screen (members with emoji badges)"
capture "03-rose.png"    "Rose screen (entry typed, deepening prompt visible)"
capture "04-thorn.png"   "Thorn screen (entry typed, deepening prompt visible)"
capture "05-summary.png" "Summary screen (multiple entries with artwork thumbnails)"
capture "06-history.png" "History screen (session list with artwork thumbnails)"

echo ""
echo "=== Done! ==="
echo "Screenshots saved to $OUTPUT_DIR/"
echo ""
echo "Next steps:"
echo "  1. Review screenshots — they should be at native device resolution."
echo "  2. Upload to Play Console → Main store listing → Phone screenshots."
echo "  3. (Optional) brew install imagemagick && mogrify -strip $OUTPUT_DIR/*.png"
