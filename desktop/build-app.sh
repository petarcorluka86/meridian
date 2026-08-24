#!/bin/bash
set -euo pipefail

# Builds Meridian.app into ~/Applications. The bundle is a WKWebView window plus
# a launcher for `npm run dev` in this checkout — the repo stays the app.

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="${APP_DIR:-$HOME/Applications/Meridian.app}"
PORT="${PORT:-3210}"
COMMAND="${COMMAND:-npm run dev}"
ICON_SRC="$PROJECT_DIR/public/icon-512.png"
ICONSET="$(mktemp -d)/Meridian.iconset"

echo "Building Meridian.app"
echo "  repo   $PROJECT_DIR"
echo "  port   $PORT"
echo "  serve  $COMMAND"

mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

swiftc "$PROJECT_DIR/desktop/Meridian.swift" \
    -O \
    -o "$APP_DIR/Contents/MacOS/Meridian" \
    -framework Cocoa \
    -framework WebKit

# icon-512.png is the filled tile rasterised from brand/meridian-icon.svg — see
# the Brand section in CLAUDE.md. The mark alone disappears at Dock sizes.
mkdir -p "$ICONSET"
for size in 16 32 64 128 256 512; do
    sips -z "$size" "$size" "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null
    double=$((size * 2))
    if [ "$double" -le 1024 ]; then
        sips -z "$double" "$double" "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null
    fi
done
iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns"
rm -rf "$(dirname "$ICONSET")"

cat > "$APP_DIR/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Meridian</string>
    <key>CFBundleIdentifier</key>
    <string>com.petarcorluka.meridian</string>
    <key>CFBundleName</key>
    <string>Meridian</string>
    <key>CFBundleDisplayName</key>
    <string>Meridian</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>MeridianProjectDir</key>
    <string>$PROJECT_DIR</string>
    <key>MeridianPort</key>
    <string>$PORT</string>
    <key>MeridianCommand</key>
    <string>$COMMAND</string>
</dict>
</plist>
PLIST

# Ad-hoc signature: unsigned bundles get killed on arm64 after any rebuild.
codesign --force --deep --sign - "$APP_DIR" > /dev/null 2>&1 || true

/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
    -f "$APP_DIR" 2>/dev/null || true

echo "Installed to $APP_DIR"
echo "Open it once, then drag it from ~/Applications to the Dock."
