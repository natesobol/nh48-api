file location for all landing page images and other UI images.

PNG icons used for the animated splash background live directly in this folder so they can be dropped in without path changes.

Primary and secondary logo marks also live here. When adding or swapping logos, keep the transparent padding intact so the updated wrappers and border styles render cleanly on both light and dark hero areas.

## Shared navigation/footer assets

* The site-wide nav and quick-browse footer both reference the primary logo and OG cover art stored in this folder; keep filenames stable when updating assets so every live page continues to load consistent branding.
* If a navigation or footer refresh introduces new icons, drop the PNG/SVG here and update all pages in lockstep so the menus and CTA grid stay visually aligned across localized and dataset pages.
* Only style the live app shells (landing, catalog, trails, long-trails, virtual hike, and `/pages/*`), not the prerendered redirect or peak pages—they're bot-only and shouldn't receive UI polish.

## SEO Notes for Media Assets

* Use descriptive, hyphenated filenames (e.g., `white-mountain-hiking-icon.png`) to reinforce keywords like **“White Mountain trails”** and **“NH48 summit photos.”**
* Pair every image with ALT text and captions in templates to support accessibility and improve image search rankings.
* Keep hero graphics lightweight so pages featuring **New Hampshire hiking data** maintain fast performance and strong Core Web Vitals.
