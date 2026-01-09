# Quick Browse Footer Unification Notes

The **quick browse footer** is a shared component that appears across the NH48 experience, including injected app shells and static HTML pages. To keep it unified, treat the footer as a single, cohesive component whose copy and styling should stay consistent wherever it is rendered.

## Where the footer lives

* **`pages/footer.html`** — canonical markup for the footer and the baseline embedded style block.
* **`css/quick-browse-footer.css`** — shared stylesheet for pages that link the CSS directly.
* **`js/quick-browse-footer.js`** — injects the footer partial and ensures the CSS is in sync for app pages.
* **`js/unified-footer.js`** — builds the footer dynamically for routes that skip the partial.

## Keeping the footer unified

* Keep the copy, link order, and visual treatments aligned across all four sources so the footer feels identical regardless of the page that renders it.
* Prefer adjusting shared variables (like `--nh48-footer-accent`) or shared class styles so the component stays cohesive without introducing page-specific tweaks.
* When introducing a new visual emphasis (like button-style links), implement it in the shared footer styles and use a consistent class name so the behavior is repeatable.

## Why this matters

The footer is a navigation and discovery surface, so consistency improves usability and reduces drift between the static pages and the app shells. Keeping the component unified also makes it easier for future updates to land cleanly without surprises.
