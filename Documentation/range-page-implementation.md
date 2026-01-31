# Range catalog + range detail implementation notes

These notes describe how to update the range catalog and add a range detail page so the site uses the correct imagery and links for each range.

## Goals

1. **Range catalog cards** use the **primary photo of the tallest peak in the range** (from `data/nh48.json`) and link to the range detail page.
2. **Range detail page** looks like a peak detail page: a gallery (single image for now), followed by a table of all peaks in the range with photos and metadata.

## Data source and helpers

- Use `data/nh48.json` as the source of truth for peaks, ranges, and photos.
- Prefer a helper that:
  - Groups peaks by range.
  - Finds the tallest peak in each range.
  - Extracts the **primary** photo: the photo with `default: true` or the first photo.
  - Generates a stable range slug (use the same slugify logic everywhere).

Example helper (pseudo-code):

```ts
// utils/rangeUtils.ts
import peaks from '../data/nh48.json';
import slugify from 'slugify';

export function getPrimaryPhoto(photos: any[]) {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const primary = photos.find((photo) => photo.default);
  return (primary || photos[0]).url || '';
}

export function buildRangeCatalog() {
  const ranges: Record<string, any[]> = {};
  peaks.forEach((peak) => {
    const range = peak.range || 'Unknown';
    ranges[range] = ranges[range] || [];
    ranges[range].push(peak);
  });

  return Object.entries(ranges).map(([rangeName, rangePeaks]) => {
    const tallest = rangePeaks.reduce((max, peak) =>
      peak.elevation > max.elevation ? peak : max,
    );
    return {
      name: rangeName,
      slug: slugify(rangeName, { lower: true }),
      imageUrl: getPrimaryPhoto(tallest.photos),
      tallestPeakName: tallest.name,
    };
  });
}
```

## 1. Fix range catalog cards

**Problem:** The range catalog currently uses the wrong slug to fetch images.

**Fix:** Derive the range image from the tallest peak in that range, then render that image and link to `/range/[rangeSlug]`.

Implementation outline:

1. Load peaks from `data/nh48.json` at build time (preferred) or client-side.
2. Group peaks by range and compute each range’s tallest peak.
3. Use the tallest peak’s primary photo for the card image.
4. Generate the range card link using the range slug, not the peak slug.

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

- **Gallery carousel** (for now: a single image, using the tallest peak’s primary photo).
- **Peak table** listing all peaks in the range with:
  - Primary photo thumbnail
  - Name (linked to `/peak/[slug]`)
  - Elevation
  - Difficulty (if available)
- Optional: **Photo metadata** panel (photographer/date/license) when the data exists.

Implementation outline:

1. Add a dynamic route `pages/range/[rangeSlug].tsx`.
2. At build time, compute all range slugs using the same helper as the catalog.
3. In `getStaticProps`, filter peaks by `slugify(peak.range) === rangeSlug`.
4. Compute the tallest peak for the gallery image.
5. Render the gallery and a table of peaks.

Pseudo-code skeleton:

```tsx
import Link from 'next/link';
import slugify from 'slugify';
import peaks from '../../data/nh48.json';
import GalleryCarousel from '../../components/GalleryCarousel';
import { getPrimaryPhoto } from '../../utils/rangeUtils';

export async function getStaticPaths() {
  const ranges = [...new Set(peaks.map((peak) => peak.range).filter(Boolean))];
  return {
    paths: ranges.map((range) => ({
      params: { rangeSlug: slugify(range, { lower: true }) },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const { rangeSlug } = params;
  const peaksInRange = peaks.filter(
    (peak) => peak.range && slugify(peak.range, { lower: true }) === rangeSlug,
  );
  const tallestPeak = peaksInRange.reduce((max, peak) =>
    peak.elevation > max.elevation ? peak : max,
  );
  return {
    props: {
      rangeName: tallestPeak?.range ?? rangeSlug,
      galleryImage: getPrimaryPhoto(tallestPeak?.photos ?? []),
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

These instructions keep the implementation consistent with existing peak detail pages while correcting the range catalog imagery by always using the tallest peak’s primary photo.
