# Bike Build Tracker

A single-purpose, offline-first web app for spec'ing out and tracking a custom
bike build (road, gravel, mountain, commuter, etc.). Add components grouped by
category, enter price/weight manually, check items off as you buy them, see
running totals, save locally, and export/import as CSV.

**No backend, no accounts, no frameworks, no build step.** Everything is plain
HTML/CSS/vanilla JS and lives in `localStorage` on your own device.

## Features

- Multiple saved builds with a build switcher (e.g. "Gravel bike", "XC racer").
- A default category taxonomy (groups → categories) you can extend with custom
  categories.
- Inline add / edit / delete of line items (name, brand, price, weight, qty,
  notes, link).
- Per-build settings: freeform currency symbol and a weight unit toggle
  (grams ⟷ ounces) — weights are stored internally in grams.
- **Acquisition tracking**: check each part off as you buy/find it; the sticky
  summary bar shows totals, item count, and an "acquired vs. remaining"
  breakdown (count, $ spent, weight). Filter the list to acquired/remaining
  only for a shopping trip.
- Totals (price + weight) at category, group, and build level, updated live.
- **CSV export/import** for a single build (import as a new build / replace
  current / append), with proper comma/quote escaping and invalid-row warnings.
- **Full backup** as JSON (export / import all builds).
- Autosaves on every change (debounced).

## Run it locally

The app is fully static with no build step. Serve the repo root with any static
server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open <http://localhost:8080>. (Tip: serve over HTTP, not `file://`, so
ES modules and browser storage behave normally.) No file needs to be compiled.

## Deploy to Netlify

The repo is already Netlify-ready:

- `index.html` is at the project root.
- `netlify.toml` sets `publish = "."` with an empty build command and adds the
  `X-Frame-Options` / `X-Content-Type-Options` headers.

Deploy either way:

1. **Drag-and-drop**: in the Netlify dashboard, drag the project folder onto
   the deploy area. Done.
2. **Git-connected**: push this repo to GitHub, then connect it in Netlify and
   keep the publish directory at the repo root. It auto-deploys on push.

Because there's no server or backend, data is stored per-browser in
`localStorage`. The same URL will behave identically on any browser/device,
each with its own independent data.

## Storage & data

- Key: `bikeBuildTracker:v1` in `localStorage`.
- "Reset all data" (footer) clears it and returns to the first-run state.
- Use **Export Backup (JSON)** before resetting if you want to keep anything.

## Project layout

```
/
├── index.html            # app shell
├── css/styles.css        # styling + responsive layout
├── js/
│   ├── categories.js     # default category-group → category taxonomy
│   ├── model.js          # Build/Item shapes + totals calculations
│   ├── storage.js        # localStorage load/save/migrate/reset
│   ├── csv.js            # CSV serialize/parse + JSON backup/restore helpers
│   ├── utils.js          # uuid, unit conversion, formatting, CSV escaping
│   ├── ui/render.js      # header, summary bar, modal/toast rendering
│   ├── ui/categorySection.js  # group/category/item row rendering
│   ├── ui/buildSwitcher.js    # build dropdown population
│   └── main.js           # app entry point + event wiring
├── netlify.toml
└── README.md
```

## Testing

The codebase is dependency-free; there is no test runner in the project. The
feature logic (totals, unit conversion, CSV round-trip, import paths) was
verified with a temporary jsdom harness during development.