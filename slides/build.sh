#!/bin/sh
# Render slides/index.html to the talk PDF with headless Chrome.
set -e
cd "$(dirname "$0")"
OUT="${1:-../Anatomy of an AI Agent.pdf}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --virtual-time-budget=8000 --allow-file-access-from-files \
  --print-to-pdf="$OUT" "file://$PWD/index.html" 2>/dev/null
echo "wrote $OUT"
