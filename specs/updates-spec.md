# Project updates

## Todo (all done — implemented 2026-08-03)

- [x] All catagories without items in them should by default be closed accordions instead of open
- [x] Move the footer with it's import/export/reset controls to a right column at larger viewport sizes
- [x] Instead of allowing custom subcatagories to be created. I want to be able to create custom top level catagories. Custom subcatagories creates too much complexity.
- [x] Front/rear brake items should just be "Brakes"
- [x] component weights should be in grams but total build weight should be in lbs and kgs

## Decisions

- **Accordions:** Collapsing stays at the *group* level only (no per-category accordions). Groups with no items start collapsed; groups with items start expanded; the manual toggle is retained. "+ Add item" on a collapsed group expands it first.
- **Right column:** The export/import/reset controls moved out of the footer into a **sticky** right-hand sidebar on large screens (≥ ~1080px). Below that breakpoint the sidebar reflows into a footer-style bar.
- **Custom top-level categories:** Replaced per-group custom subcategories with custom **top-level categories** (new group sections). Creating one makes a group with a single auto category of the same name; items are added under it.
- **Custom lifecycle:** Custom top-level categories support **rename** and **delete**. Deleting one also deletes the items in it (confirmed). Default groups can't be renamed/deleted.
- **Brakes:** The default taxonomy now has a single "Brakes" category (front/rear merged).
- **Weight units:** The per-build grams/oz toggle was **removed**. Components are always entered and displayed in **grams**. All totals (summary bar, group and category subtotals, acquired weight) display **both** pounds and kilograms, e.g. `4.30 lb · 1.95 kg`.
- **Schema:** No formal migration. The schema was changed in place and kept at `version: 1`. Legacy data is tolerated on load: any custom subcategory (anything not in the current default taxonomy, e.g. old "Brakes (Front)" items) is lifted to its own top-level category so nothing is lost. CSV exports weights in grams and no longer includes a `weightUnit` column (import still tolerates one).

