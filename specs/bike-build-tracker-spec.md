# Bike Build Tracker — App Build Plan

A single-purpose web app for spec'ing out and tracking a custom bike build
(road, gravel, mountain, commuter, etc.): users add components grouped by
category, enter price/weight manually, check items off as they're acquired,
see running totals, save locally, and export/import as CSV. No backend, no
accounts, no external APIs.

Hand this whole document to a coding agent as the spec.

---

## 1. Goals & Non-Goals

**Goals**
- Let a user build a parts list for any custom bike build (road, gravel,
  mountain, commuter, touring, etc.), grouped into category groups.
- Manual entry only — no pulling prices/weights from anywhere.
- Let users track acquisition progress: check off each part as they buy or
  find it, separate from just listing it.
- Persist across sessions with zero setup (localStorage).
- Export the build to CSV; re-import a CSV to restore/edit a build.
- Support multiple saved builds (e.g. "Gravel bike", "XC race bike", "Winter commuter").
- Deploy as a static site to Netlify with no build step required (or a trivial one).

**Non-Goals**
- No server, no database, no auth, no user accounts.
- No calls to any third-party API (no live pricing, no product lookups).
- No framework (React/Vue/etc.) — vanilla HTML/CSS/JS only.
- No compatibility-checking logic (headset standards, BB standards, etc.) —
  out of scope for v1.

---

## 2. Tech Stack

- **HTML5 + CSS3 + vanilla JavaScript (ES6+ modules)** — no build tooling required.
- No npm dependencies. No bundler needed for v1 (plain `<script type="module">` files).
- Storage: `window.localStorage` only.
- Deployment target: **Netlify**, static site, drag-and-drop or git-connected deploy.

Optional (only if the coding agent wants a dev convenience, not required):
- A tiny local dev server (e.g. `npx serve` or Python's `http.server`) for local testing — not a dependency of the shipped app.

---

## 3. Information Architecture

### 3.1 Core concept: "Builds"
A **Build** is a named collection of **Line Items**. A user can have multiple
builds saved locally (e.g. different bikes, or draft vs. final versions of
the same bike) and switch between them.

### 3.2 Category Groups & Categories (default taxonomy)
Categories are organized into a two-level hierarchy: a small number of
**Category Groups** (sections in the UI), each containing several
**Categories** (the actual rows items get added under). This keeps a build
with 25+ line-item categories navigable — the UI renders one collapsible
section per group, not per category.

Ship with a sensible default, generic-enough-for-any-bike-type taxonomy, but
let users add custom categories (within a group) and custom groups too (see
3.3). Suggested default structure:

**Frame & Suspension**
1. Frame
2. Rear Shock (if full suspension)
3. Fork
4. Headset

**Drivetrain**
5. Bottom Bracket
6. Crankset
7. Chainring(s)
8. Pedals
9. Front Derailleur
10. Rear Derailleur
11. Shifter(s)
12. Cassette
13. Chain

**Wheels & Tires**
14. Wheelset (or Front Wheel / Rear Wheel separately)
15. Tires
16. Tubes / Sealant (tubeless setup)

**Brakes**
17. Brakes (Front)
18. Brakes (Rear)
19. Rotors

**Cockpit & Touchpoints**
20. Handlebar
21. Stem
22. Grips / Bar Tape
23. Seatpost (incl. dropper)
24. Seatpost Clamp
25. Saddle

**Other**
26. Misc Hardware
27. Other / Misc (catch-all)

This structure (groups → categories) should live as a simple JS constant
(array of group objects, each with a `name` and a `categories` array) so
it's trivial to edit or reorder later.

### 3.3 Line Item fields
Each line item (a single component the user has added to a build):

| Field       | Type      | Notes                                              |
|-------------|-----------|-----------------------------------------------------|
| id          | string    | generated (e.g. `crypto.randomUUID()`)              |
| categoryGroup | string  | one of the default groups, or a custom string       |
| category    | string    | one of the default categories, or a custom string   |
| name        | string    | e.g. "Fox 36 Factory 160mm"                          |
| brand       | string    | optional                                             |
| price       | number    | user-entered, in user's chosen currency (no conversion) |
| weight      | number    | user-entered                                         |
| weightUnit  | enum      | "g" or "lb/oz" — pick ONE unit per build for simplicity (see 3.4) |
| notes       | string    | optional freeform (e.g. size, color, part number)    |
| link        | string    | optional URL, manually pasted, just stored as text/link — not fetched |
| quantity    | number    | default 1 (e.g. 2 tubes, 2 rotors)                   |
| acquired    | boolean   | default `false` — checked off once the user has purchased/found the part (see 3.6) |

### 3.4 Units
- Each Build has a single **weight unit** setting: grams or ounces (store
  everything internally in grams, convert for display only). Keep this simple:
  a per-build toggle, not per-item.
- Currency: freeform — just a symbol/prefix setting per build (e.g. "$", "€"),
  purely cosmetic label, no conversion logic.

### 3.5 Totals
For each build, compute and display:
- Total price (sum of price × quantity across all line items)
- Total weight (sum of weight × quantity, converted to build's display unit)
- Subtotals per category and per category group (collapsible sections)
- Item count
- **Acquired vs. remaining** breakdown (see 3.6): count and $ /weight of
  acquired items vs. not-yet-acquired items.

### 3.6 Acquisition Tracking
Each line item has an `acquired` boolean (checkbox). This is separate from
simply "having a row for it" — it lets the user plan out a full build up
front (every part they intend to buy) and then track real progress as they
actually purchase/find each part.

- A checkbox/toggle on each line item row marks it acquired. Toggling should
  be a single click/tap, no separate "edit mode" required.
- Visually distinguish acquired rows (e.g. muted/checked style, or a strike
  or checkmark) so progress is scannable at a glance.
- Show a **progress summary** in the sticky totals bar: e.g. "12 / 27 items
  acquired", plus "$ spent so far" (sum of price×qty for acquired items) vs.
  "$ remaining" (sum for un-acquired items). Same breakdown for weight is
  optional/nice-to-have (e.g. "weight acquired so far" if the user wants to
  track partial-build weight as they go).
- Acquired state must round-trip through CSV export/import (see Section 5).
- Filter/toggle in the UI (optional but recommended): "Show all / Show
  acquired only / Show remaining only" to help focus a shopping trip.

---

## 4. Data Model & Storage

### 4.1 localStorage schema
Use a single top-level key to avoid clutter and make export/reset simple:

```json
{
  "version": 1,
  "activeBuildId": "uuid-string",
  "builds": [
    {
      "id": "uuid-string",
      "name": "Trail Bike v2",
      "weightUnit": "g",
      "currencySymbol": "$",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "items": [
        {
          "id": "uuid-string",
          "categoryGroup": "Frame & Suspension",
          "category": "Fork",
          "name": "Fox 36 Factory",
          "brand": "Fox",
          "price": 1099.00,
          "weight": 2100,
          "quantity": 1,
          "notes": "160mm, Grip2 damper",
          "link": "",
          "acquired": false
        }
      ]
    }
  ]
}
```

Storage key name: `bikeBuildTracker:v1`

### 4.2 Versioning
Include a `version` field now so future migrations are possible without a
rewrite. On load, if `version` is missing or older than current, run a
migration function (even if it's a no-op for v1).

### 4.3 Persistence rules
- Autosave on every mutation (add/edit/delete item, rename build, change
  unit/currency) — debounce writes (~300ms) to avoid thrashing localStorage.
- Handle `localStorage` quota errors gracefully (try/catch, show a toast/error
  message — data sets here are tiny so this is a rare edge case, but code
  defensively).
- Provide an explicit **"Reset all data"** action (with confirmation) that
  clears the storage key.

---

## 5. CSV Import / Export

### 5.1 Export
- Button: "Export CSV" — exports the **currently active build** as a CSV file
  named like `bike-build-{sanitized-build-name}-{yyyy-mm-dd}.csv`.
- Columns: `categoryGroup,category,name,brand,price,weight,weightUnit,quantity,acquired,notes,link`
  (`acquired` exported as `true`/`false` or `1`/`0` — pick one and be
  consistent; parse both leniently on import.)
- Use the browser's native `Blob` + `URL.createObjectURL` + a temporary `<a download>`
  to trigger download — no library needed.
- Properly escape commas/quotes/newlines per CSV spec (quote fields containing
  commas, quotes, or newlines; escape embedded quotes by doubling them).

### 5.2 Import
- Button/drop-zone: "Import CSV" — file input (`<input type="file" accept=".csv">`)
  and/or drag-and-drop onto a designated zone.
- Parse CSV manually (write a small, dependency-free parser — the format is
  simple enough not to need a library; handle quoted fields with embedded
  commas/newlines).
- On import, ask the user: **"Import as a new build"** vs **"Replace current
  build's items"** vs **"Append to current build"** (simple modal/confirm with
  3 options).
- Validate rows: missing/invalid numeric fields should default to 0 and flag
  a warning summary after import (e.g. "3 rows had invalid price/weight and were set to 0").

### 5.3 Whole-app backup (bonus, not required for v1 but easy to include)
- "Export all builds (JSON)" — dumps the entire localStorage object as a
  downloadable `.json` file.
- "Import all builds (JSON)" — restores it, overwriting current storage
  (with confirmation).

---

## 6. UI / UX

### 6.1 Layout
Single-page app, no routing needed (or trivial hash-based routing if the
agent wants deep-linkable build IDs — optional, not required).

Suggested layout:
- **Header**: app name ("Bike Build Tracker"), build name (editable inline),
  build switcher (dropdown or list of saved builds + "New Build" button),
  unit toggle, currency input.
- **Category group sections**: one collapsible section per **category
  group** (e.g. "Frame & Suspension", "Drivetrain", "Wheels & Tires",
  "Brakes", "Cockpit & Touchpoints", "Other"). Within each group, render its
  categories as sub-headings or grouped table rows, each showing line items
  in a table/list, an "Add item" row/button per category, and subtotals at
  both the category and group level (price + weight + acquired count).
- **Sticky summary bar** (top or bottom): total price, total weight, item
  count, and acquired progress (e.g. "12 / 27 acquired · $840 spent / $1,200
  remaining") — always visible while scrolling.
- **Footer/actions**: Export CSV, Import CSV, Export/Import full backup,
  Reset data.

### 6.2 Adding/editing items
- Inline "add row" at the bottom of each category — user fills in
  name/brand/price/weight/qty/notes/link directly in the row, hits "Add" or
  presses Enter. New items default to `acquired: false`.
- Each row has an **"Acquired" checkbox** as the leftmost (or otherwise
  prominent) column — a single click marks the part as purchased/found and
  visually updates the row (e.g. muted text, checkmark, strikethrough on
  name) plus updates all totals/progress counters immediately.
- Items editable in place (click to edit, or an edit icon that turns the row
  into inputs). Delete via a trash icon with a lightweight confirm (or an
  "undo" toast instead of a confirm dialog — either is fine, pick one).
- Allow adding a **custom category** (text input + "Add category" button)
  within an existing group, and a **custom category group** (for build types
  that don't fit the default groups) in addition to the defaults.

### 6.3 Empty/first-run state
- On first visit (no localStorage data), auto-create a build named "My Build"
  pre-populated with the default category-group/category taxonomy (all
  sections present, no items yet) so the user sees structure immediately.

### 6.4 Responsiveness
- Mobile-friendly: category tables should collapse to stacked
  card-style rows below ~600px width rather than horizontally scrolling tables.

### 6.5 Visual style
- Clean, utilitarian, bike-shop-garage feel is fine — this is a tool, not a
  marketing site. Prioritize legibility of numbers (align price/weight
  columns right, monospace or tabular-nums for figures).
- No need for a component library — plain CSS (flexbox/grid), a small
  custom stylesheet is sufficient.

---

## 7. File Structure

```
/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js            # app entry point, wires everything together
│   ├── storage.js         # localStorage get/set/migrate logic
│   ├── model.js           # Build/Item factory functions, totals calculations
│   ├── categories.js       # default category-group → categories taxonomy constant
│   ├── csv.js              # CSV export + import/parsing logic
│   ├── ui/
│   │   ├── render.js       # DOM rendering functions
│   │   ├── buildSwitcher.js
│   │   └── categorySection.js
│   └── utils.js           # uuid helper, unit conversion, formatting, CSV escaping
├── netlify.toml
└── README.md
```

Keep modules small and single-purpose so a coding agent (or future you) can
navigate the codebase easily. No transpilation needed — target evergreen
browsers with native ES modules (`<script type="module" src="js/main.js">`).

---

## 8. Netlify Deployment

Since this is a fully static site with no build step:

**netlify.toml**
```toml
[build]
  publish = "."
  command = ""

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

- No build command needed since there's no bundling/transpilation.
- Deploy options to document in README: (a) drag-and-drop the project folder
  onto Netlify's dashboard, or (b) connect a GitHub repo and let Netlify
  auto-deploy on push, with publish directory set to the repo root (or `/`
  if using `netlify.toml` as above).
- Confirm `index.html` is at the project root so Netlify's default publish
  directory just works.

---

## 9. Build Order / Milestones (for the coding agent)

1. **Scaffold**: file structure, empty `index.html` shell, `netlify.toml`.
2. **Data layer**: `model.js` (Build/Item shape + factories), `storage.js`
   (load/save/migrate), `categories.js` (default group → category taxonomy).
3. **Core UI shell**: render build switcher, category-group sections
   (empty), sticky totals bar — wire to storage so refreshing the page
   preserves state.
4. **Item CRUD**: add/edit/delete line items within a category, recalculate
   totals live.
5. **Acquired tracking**: checkbox per item, live progress summary (count +
   $ spent/remaining) in the sticky bar, optional acquired/remaining filter.
6. **Build management**: create/rename/delete/switch builds; unit & currency
   settings per build.
7. **CSV export**: implement and manually test with a build containing
   commas/quotes in notes, and mixed acquired/unacquired items, to confirm
   escaping and the `acquired` column round-trip works.
8. **CSV import**: parser + the 3-way import modal (new/replace/append) +
   validation/warning summary.
9. **Polish**: empty state, responsive/mobile layout, custom category/group
   support, reset-all-data action, full JSON backup/restore (bonus).
10. **Deploy**: push to a GitHub repo, connect to Netlify (or drag-and-drop
    deploy), verify the live URL persists data correctly in a real browser
    (not just localhost).

---

## 10. Acceptance Criteria (checklist)

- [ ] Works fully offline after first load (no network calls at all).
- [ ] No console errors on load or during normal use.
- [ ] Refreshing the page preserves all builds and items exactly.
- [ ] Can create, rename, and delete multiple builds independently.
- [ ] Can add a line item to any default category (within its group) and to
      a user-created custom category/group.
- [ ] Editing a price or weight updates category subtotal, group subtotal,
      and grand total immediately.
- [ ] Checking/unchecking "acquired" on an item immediately updates the
      acquired count and $ spent/remaining in the sticky summary bar.
- [ ] CSV export downloads a correctly formatted file, including the
      `acquired` column; re-importing that same file (as "replace")
      reproduces the identical build, including acquired state.
- [ ] CSV with a comma or quote inside a `notes` field exports and re-imports
      without corrupting columns.
- [ ] Weight unit toggle (g ⟷ oz) correctly converts displayed values without
      losing precision in storage.
- [ ] Mobile layout (≤600px) is usable without horizontal scrolling of tables.
- [ ] "Reset all data" clears localStorage and returns to first-run empty state.
- [ ] Deployed Netlify URL behaves identically to local testing (data is
      per-browser/localStorage, so this just confirms no broken paths/assets).
- [ ] No frameworks, no npm dependencies, no external API calls anywhere in
      the codebase (grep for `fetch(` should turn up nothing, or only the
      CSV/JSON file download/upload code which is local-only).

---

## 11. Explicit Constraints Recap (do not violate)

- **No database** — localStorage only.
- **No authentication** — single anonymous local user.
- **No external APIs** — all prices/weights are manually typed in by the user;
  nothing is fetched from any product catalog, pricing API, or similar.
- **Vanilla JS only** — no React/Vue/Svelte/etc., no build step required to
  run the app.
- **Netlify-ready** — static files at repo root, `index.html` present,
  optional `netlify.toml` for headers only (no actual build command needed).
