# Store Assets — Rose & Thorn

Guide for producing the visual assets required by the Google Play Console.

---

## Required assets checklist

| Asset | Required? | Size | Format | Status |
|-------|-----------|------|--------|--------|
| App icon | ✅ Yes | 512 × 512 px | PNG, no transparency | Use `assets/icon.png` (verify outer frame has no transparency — Play rejects fully transparent outer rings) |
| Feature graphic | ✅ Yes | 1024 × 500 px | PNG or JPG | ❌ Not yet created |
| Phone screenshots | ✅ Yes (≥ 2, up to 8) | ≥ 1080 × 1920 px | PNG or JPG | ❌ Not yet captured |
| Tablet screenshots | Optional | ≥ 1200 × 1920 px | PNG or JPG | Defer to post-launch |
| Promo video | Optional | YouTube URL | — | Defer |

---

## Feature graphic (1024 × 500 px)

### Option A — screenshot the static HTML template (fastest)

Create a simple HTML page locally, open in Chrome, screenshot at exactly
1024 × 500 px.

Suggested content:
- Background: warm amber gradient `#fffbeb` → `#fde68a`
- Large centered text: **Rose & Thorn** (serif or rounded sans)
- Tagline below: *A dinner-table ritual for your family*
- Two emoji characters side-by-side: 🌹 🌿
- No screenshot of the app itself (avoids device frame issues)

Screenshot command (macOS Chrome headless):
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless --screenshot=docs/store-assets/feature-graphic.png \
  --window-size=1024,500 \
  --hide-scrollbars \
  docs/store-assets/feature-graphic.html
```

### Option B — design externally

Use Figma / Canva / Photoshop. Save to `docs/store-assets/feature-graphic.png`.

---

## Screenshots (phone — 1080 × 1920 px minimum)

### Capture plan (6 screens, in order)

| # | Screen | State to show | File name |
|---|--------|---------------|-----------|
| 1 | Home screen | App freshly opened, "Begin Dinner" button visible | `01-home.png` |
| 2 | Setup / Family screen | Family name + 3 members with emoji badges | `02-setup.png` |
| 3 | Rose screen | A Rose entry typed in, deepening prompt visible below | `03-rose.png` |
| 4 | Thorn screen | A Thorn entry typed in, deepening prompt visible | `04-thorn.png` |
| 5 | Summary screen | Multiple entries with procedural artwork thumbnails | `05-summary.png` |
| 6 | History screen | Session list with artwork thumbnails | `06-history.png` |

### adb screenshot commands (Pixel 10 Pro serial 57150DLCH001ZQ)

Run from repo root after connecting device:

```bash
scripts/capture-screenshots.sh
```

Or individually:
```bash
adb -s 57150DLCH001ZQ exec-out screencap -p > docs/store-assets/screenshots/raw/01-home.png
adb -s 57150DLCH001ZQ exec-out screencap -p > docs/store-assets/screenshots/raw/02-setup.png
# ... etc (see scripts/capture-screenshots.sh)
```

### Post-processing

The raw screenshots will be at native Pixel 10 Pro resolution (2856 × 1260 px —
it's a landscape phone spec, so portrait screenshots are ~1260 × 2856 px).
Play Console accepts any portrait screenshot ≥ 320 px wide with a 16:9 to 9:16
aspect ratio. The raw captures should work as-is.

Optional: use ImageMagick to add a consistent border or resize:
```bash
# Requires: brew install imagemagick
mogrify -strip docs/store-assets/screenshots/raw/*.png
```

---

## App icon verification

Play requires the 512 × 512 icon to have no transparent outer frame (it will
apply its own adaptive icon mask). Verify with:

```bash
# Requires: brew install imagemagick
identify -verbose assets/icon.png | grep -E "Alpha|Matte|Geometry"
```

If the icon has full transparency at the outermost pixels, re-export from the
design source with a filled background. The splash-screen amber `#fffbeb` works
well as a background color.

---

## Directory structure

```
docs/store-assets/
├── feature-graphic.html    (optional HTML template for Option A)
├── feature-graphic.png     (final 1024x500 upload)
└── screenshots/
    └── raw/
        ├── 01-home.png
        ├── 02-setup.png
        ├── 03-rose.png
        ├── 04-thorn.png
        ├── 05-summary.png
        └── 06-history.png
```
