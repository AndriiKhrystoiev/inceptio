#!/bin/bash
set -e

# Flow path (default: wedding-full, override with first arg)
FLOW=${1:-apps/mobile/maestro/flows/01-wedding-full.yaml}
OUTPUT=~/Desktop/inceptio-demo-$(date +%Y%m%d-%H%M%S).mp4

# Kill any stray Android emulator so Maestro targets iOS
adb kill-server 2>/dev/null || true

echo "==> Recording to: $OUTPUT"
xcrun simctl io booted recordVideo --codec=h264 "$OUTPUT" &
REC_PID=$!

# Let recording warm up
sleep 2

echo "==> Running flow: $FLOW"
maestro test "$FLOW"

echo "==> Stopping recording (finalizing video)..."
kill -INT $REC_PID
wait $REC_PID 2>/dev/null || true

echo "==> Done: $OUTPUT"
open "$OUTPUT"