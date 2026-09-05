#!/usr/bin/env bash
# Downloads the offline Chinese speech model used by "Recognize on this device".
# The model is ~42 MB and is not stored in git.
set -euo pipefail

MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip"
DEST="public/models"
ARCHIVE="$DEST/vosk-cn.tar.gz"

if [ -f "$ARCHIVE" ]; then
  echo "Model already present at $ARCHIVE"
  exit 0
fi

mkdir -p "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading the Chinese speech model (~42 MB)..."
curl -fL --progress-bar -o "$TMP/model.zip" "$MODEL_URL"
unzip -q "$TMP/model.zip" -d "$TMP"
mv "$TMP"/vosk-model-small-cn-* "$DEST/vosk-cn"
# vosk-browser fetches the model as a gzipped tarball and unpacks it itself.
tar -czf "$ARCHIVE" -C "$DEST" vosk-cn
rm -rf "$DEST/vosk-cn"
echo "Model ready at $ARCHIVE"
