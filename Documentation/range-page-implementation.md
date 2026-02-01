# Range catalog + range detail implementation notes

These notes describe how to update the range catalog and add a range detail page so the site uses the correct imagery and links for each range.

## Goals

1. **Range catalog cards** use the **primary photo of the highest peak in each range**, sourced from `data/nh48.json`, and link to the range detail page.
2. **Range detail page** looks like a peak detail page: a gallery (single image for now), followed by a table of all peaks in the range with photos and metadata.

## Data source and helpers

- Use `data/wmnf-ranges.json` as the source of truth for range names, slugs, peak lists, and highest peaks.
- Use `data/nh48.json` to look up full peak details (slugs, elevation, difficulty, peak photos) when building the peaks table and when selecting the range catalog hero images.
- **Important:** range photo subfolders do not exist in R2. Always pull range catalog imagery from the highest peak’s **primary** photo in `nh48.json`, which already points to the correct peak-name subfolder.
- Prefer a helper that:
  - Reads ranges from `wmnf-ranges.json` (do not group peaks by range labels from `nh48.json`).
  - Selects the **primary** photo (`isPrimary: true`) from the highest peak in each range, falling back to the first photo for that peak.
  - Maps each `peakList` entry back to the matching peak record in `nh48.json`.

Example helper (pseudo-code):

```ts
// utils/rangeUtils.ts
import peaks from '../data/nh48.json';
import ranges from '../data/wmnf-ranges.json';

const peaksByName = new Map();
Object.values(peaks).forEach((peak) => {
  if (peak.peakName) peaksByName.set(peak.peakName, peak);
});

export function getPrimaryPhoto(photos: any[]) {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const primary = photos.find((photo) => photo.isPrimary);
  return (primary || photos[0]).url || '';
}

export function buildRangeCatalog() {
  return Object.values(ranges).map((range) => ({
    name: range.rangeName,
    slug: range.slug,
    imageUrl: getPrimaryPhoto(peaksByName.get(range.highestPoint?.peakName)?.photos || []),
    tallestPeakName: range.highestPoint?.peakName,
    peakCount: range.peakCount,
  }));
}

export function mapRangePeaks(range) {
  const peakMap = new Map();
  peaks.forEach((peak) => {
    if (peak.name) peakMap.set(peak.name, peak);
    if (peak.peakName) peakMap.set(peak.peakName, peak);
  });
  return range.peakList.map((name) => peakMap.get(name)).filter(Boolean);
}
```

## 1. Fix range catalog cards

**Problem:** The range catalog currently uses the wrong slug to fetch images.

**Fix:** Derive the range image from the **primary photo of the highest peak** in `nh48.json`, then render that image and link to `/range/[rangeSlug]`.

Implementation outline:

1. Load ranges from `data/wmnf-ranges.json` at build time (preferred) or client-side.
2. Use the highest peak’s primary photo (from `nh48.json`) for the card image.
3. Generate the range card link using the `slug` from the range dataset.

Example usage in a catalog page (pseudo-code):

```tsx
import Link from 'next/link';
import { buildRangeCatalog } from '../utils/rangeUtils';

export default function RangeCatalogPage() {
  const ranges = buildRangeCatalog();
  return (
    <div className="range-grid">
      {ranges.map((range) => (
        <Link key={range.slug} href={`/range/${range.slug}`}>
          <a className="range-card">
            <img src={range.imageUrl} alt={range.tallestPeakName} />
            <h3>{range.name}</h3>
          </a>
        </Link>
      ))}
    </div>
  );
}
```

## 2. Add a range detail page

**Goal:** Create a range detail page that mirrors the peak detail layout:

- **Gallery carousel** (for now: a single image, using the tallest peak’s primary photo from `nh48.json`).
- **Peak table** listing all peaks in the range with:
  - Primary photo thumbnail
  - Name (linked to `/peak/[slug]`)
  - Elevation
  - Difficulty (if available)
- Optional: **Photo metadata** panel (photographer/date/license) when the data exists.

Implementation outline:

1. Add a dynamic route `pages/range/[rangeSlug].tsx`.
2. At build time, compute all range slugs from `wmnf-ranges.json`.
3. In `getStaticProps`, read the matching range entry by slug.
4. Map `range.peakList` to full peak data from `nh48.json`.
5. Render the gallery using the tallest peak’s primary photo and a table of peaks.

Pseudo-code skeleton:

```tsx
import Link from 'next/link';
import peaks from '../../data/nh48.json';
import ranges from '../../data/wmnf-ranges.json';
import GalleryCarousel from '../../components/GalleryCarousel';
import { getPrimaryPhoto } from '../../utils/rangeUtils';

export async function getStaticPaths() {
  return {
    paths: Object.keys(ranges).map((rangeSlug) => ({
      params: { rangeSlug },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const { rangeSlug } = params;
  const range = ranges[rangeSlug];
  const peakMap = new Map();
  peaks.forEach((peak) => {
    if (peak.name) peakMap.set(peak.name, peak);
    if (peak.peakName) peakMap.set(peak.peakName, peak);
  });
  const peaksInRange = range.peakList.map((name) => peakMap.get(name)).filter(Boolean);
  const heroPhoto = getPrimaryPhoto(peakMap.get(range.highestPoint?.peakName)?.photos || []);
  return {
    props: {
      rangeName: range.rangeName,
      galleryImage: heroPhoto,
      peaksInRange,
    },
  };
}

export default function RangeDetailPage({ rangeName, galleryImage, peaksInRange }) {
  return (
    <main>
      <h1>{rangeName}</h1>
      <GalleryCarousel images={[{ url: galleryImage, caption: rangeName }]} />

      <section className="range-peaks-table">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Peak</th>
              <th>Elevation</th>
              <th>Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {peaksInRange.map((peak) => {
              const photoUrl = getPrimaryPhoto(peak.photos || []);
              return (
                <tr key={peak.slug}>
                  <td>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={peak.name}
                        className="peak-thumbnail"
                      />
                    ) : null}
                  </td>
                  <td>
                    <Link href={`/peak/${peak.slug}`}>
                      <a>{peak.name}</a>
                    </Link>
                  </td>
                  <td>{peak.elevation}</td>
                  <td>{peak.difficulty || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Optional photo metadata panel for the tallest peak */}
      {/* Render if the photo has author/date/license metadata */}
    </main>
  );
}
```

## 3. Navigation update

Ensure the site navigation includes a link to the range catalog, if not already present:

```tsx
<li>
  <Link href="/range">
    <a>Ranges</a>
  </Link>
</li>
```

## 4. Styling guidance

- Reuse the same classes used in the peak detail page for consistent layout.
- Ensure the gallery carousel matches existing peak detail styling.
- Thumbnail images in the table should be small and use `object-fit: cover` to avoid distortion.

## Optional extras (only if simple)

- Add a small photo metadata panel under the gallery (photographer, date, license).
- If trail data is already loaded in the front-end, add a “related trails/routes” section for peaks in the range.

---

These instructions keep the implementation consistent with existing peak detail pages while correcting the range catalog imagery by always using the tallest peak’s primary photo (from `nh48.json`, not range-based folders).
