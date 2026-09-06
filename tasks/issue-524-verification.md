# Verification Report: Slot-Metadata Premise on a Live Run

**Issue**: [#524 — [SEO] P0: Verify the slot-metadata premise on a live run](https://github.com/afterclass-io/afterclass.io/issues/524)  
**Parent Issue**: [#503 — [Perf] Improve SEO](https://github.com/afterclass-io/afterclass.io/issues/503)  
**Spec Reference**: `.scratch/specs/seo.md` (Further Notes — The Runtime Assumption; Implementation Decisions)  
**Date**: 2026-09-06  
**Status**: **VERIFIED — PREMISE CONFIRMED**

---

## 1. Executive Summary

The per-route SEO metadata design outlined in `.scratch/specs/seo.md` rests on a foundational runtime claim: **`generateMetadata` exported from a named parallel-route slot (specifically `@reviews`) reaches the rendered HTML `<head>`.**

This runtime assumption was verified through both:
1. **Next.js App Router resolver source inspection** (`next@15.4.8`), confirming that the metadata resolution tree traverses all named parallel slots and merges their metadata.
2. **A live local server execution** against `GET /course/IS215`, inspecting the raw server HTML (pre-hydration) for:
   - File-convention metadata from `src/app/(school)/(reviews)/@reviews/course/[code]/opengraph-image.tsx`.
   - Dynamic `generateMetadata` exports from `src/app/(school)/(reviews)/@reviews/course/[code]/page.tsx`.

### Outcome
**The premise holds completely.**
- Next.js App Router collects both static route file conventions (`opengraph-image.tsx`) and dynamic `generateMetadata` exports from named parallel slots (`@reviews`).
- The original audit claim ("slot files cannot export metadata for the URL segment") is refuted.
- **Architectural implication**: Issue [#526](https://github.com/afterclass-io/afterclass.io/issues/526) (`Give course, professor and home pages their own head`) is **additive** rather than architectural. No new `children` `page.tsx` needs to be invented, and `(reviews)/layout.tsx` does not need to be refactored.

---

## 2. Next.js Resolver Source Analysis (`next@15.4.8`)

Investigation of `node_modules/next/dist/esm/lib/metadata/resolve-metadata.js` reveals the exact resolution mechanism:

### A. Full traversal across all parallel routes
```javascript
async function resolveMetadataItemsImpl(
  metadataItems,
  tree,
  treePrefix,
  parentParams,
  searchParams,
  errorConvention,
  errorMetadataItem,
  getDynamicParamFromSegment,
  workStore
) {
  // ... collect current node metadata ...
  await collectMetadata({ tree, metadataItems, props: layerProps, route: ... });

  // Recurse into EVERY key of parallelRoutes with NO filter on slot names:
  for (const key in parallelRoutes) {
    const childTree = parallelRoutes[key];
    await resolveMetadataItemsImpl(
      metadataItems,
      childTree,
      currentTreePrefix,
      currentParams,
      searchParams,
      errorConvention,
      errorMetadataItem,
      getDynamicParamFromSegment,
      workStore
    );
  }
}
```
Next.js treats all parallel route keys (whether default `children` or named slots like `@reviews`, `@header`, `@rating`, `@filter`, `@information`) uniformly. Every slot subtree is traversed and its metadata collected into `metadataItems`.

### B. Static conventions & dynamic metadata extraction in `collectMetadata`
```javascript
async function collectMetadata({ tree, metadataItems, props, route }) {
  const { mod: layoutOrPageMod, modType: layoutOrPageModType } =
    await getLayoutOrPageModule(tree);

  const staticFilesMetadata = await resolveStaticMetadata(tree[2], props);
  const metadataExport = layoutOrPageMod
    ? getDefinedMetadata(layoutOrPageMod, props, { route })
    : null;

  metadataItems.push([metadataExport, staticFilesMetadata]);
}
```
- `resolveStaticMetadata`: Reads `tree[2]` for file conventions including `openGraph` images (`opengraph-image.tsx`), icons, and apple icons.
- `getDefinedMetadata`: Reads `mod.generateMetadata` or `mod.metadata` from the slot's page component.

### C. Accumulation and merge order (`accumulateMetadata` & `mergeMetadata`)
Metadata items merge sequentially in traversal order. Later nodes override earlier values for identical fields.
Because slots under the same layout are traversed in Object key iteration order:
> **Crucial architectural constraint**: Exactly **one slot** must own metadata for a given route (designated to `@reviews`, which already owns the link-preview image). If multiple slots export metadata, the winning slot depends on tree traversal order.

---

## 3. Live Run Verification

### Setup
- Next.js 15.4.8 dev server run locally against the seeded local database (15 courses in SMU catalog).
- Route tested: `/course/IS215` (`Digital Business - Technologies and Transformation`).
- Tested via raw HTTP requests (`fetch` pre-hydration) to verify what web crawlers and search engine bots actually receive.

### Test 1: Existing named-slot file convention (`@reviews/.../opengraph-image.tsx`)
Request:
```bash
bun -e "const res = await fetch('http://localhost:3001/course/IS215'); const html = await res.text(); ..."
```

Observed raw server `<head>` tags:
```html
<meta property="og:image:alt" content="AfterClass"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image" content="http://localhost:3001/course/IS215/opengraph-image-2yw25k?3a27894b8e21d84b"/>
<meta property="og:image:width" content="720"/>
<meta property="og:image:height" content="400"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image:alt" content="AfterClass"/>
<meta name="twitter:image:type" content="image/png"/>
<meta name="twitter:image" content="http://localhost:3001/course/IS215/opengraph-image-2yw25k?3a27894b8e21d84b"/>
<meta name="twitter:image:width" content="720"/>
<meta name="twitter:image:height" content="400"/>
```
All parameters (`width: 720`, `height: 400`, `alt: "AfterClass"`, `contentType: "image/png"`, and generated image URL `/course/IS215/opengraph-image-...`) originated directly from `src/app/(school)/(reviews)/@reviews/course/[code]/opengraph-image.tsx`.

### Test 2: Named-slot dynamic `generateMetadata` export
A test `generateMetadata` function was exported from `src/app/(school)/(reviews)/@reviews/course/[code]/page.tsx`:
```tsx
export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  return {
    title: `Verified Slot Title - ${code.toUpperCase()}`,
    description: `Verified Slot Description for ${code.toUpperCase()}`,
  };
}
```

Observed raw server `<head>` tags:
```html
<title>Verified Slot Title - IS215</title>
<meta name="description" content="Verified Slot Description for IS215"/>
<meta property="og:image" content="http://localhost:3001/course/IS215/opengraph-image-2yw25k?3a27894b8e21d84b"/>
```

Both `<title>` and `<meta name="description">` from the `@reviews` slot reached the HTML document `<head>`.

---

## 4. Acceptance Criteria Status

- [x] **Local run; the head of a course page read from the raw server HTML (not the hydrated DOM)**
  - Server returned HTTP 200; raw HTML head confirmed containing slot-derived OpenGraph tags and slot `generateMetadata` tags.
- [x] **Outcome recorded on this ticket, with the observed tag**
  - Observed tag: `<meta property="og:image" content="http://localhost:3001/course/IS215/opengraph-image-2yw25k?3a27894b8e21d84b"/>`
  - Observed slot metadata: `<title>Verified Slot Title - IS215</title>`
- [x] **If the premise fails: the finding posted on the per-route metadata sibling under #503 so it is re-planned, not forced**
  - Premise SUCCEEDED. No re-planning required; sibling ticket #526 can proceed as designed.

---

## 5. Next Steps for Implementation

1. **Issue #525 (`[SEO] P0: Point the metadata base URL at the validated site URL`)**:
   - Delete raw access to `process.env.VERCEL_URL` in `src/app/layout.tsx`.
   - Point `metadataBase` to validated URL from `src/env.ts`.
2. **Issue #526 (`[SEO] P0: Give course, professor and home pages their own head`)**:
   - Implement `generateMetadata` in:
     - `src/app/(school)/(reviews)/@reviews/course/[code]/page.tsx`
     - `src/app/(school)/(reviews)/@reviews/professor/[slug]/page.tsx`
     - `src/app/(school)/(reviews)/@reviews/page.tsx`
   - Enforce single-slot ownership: only `@reviews` exports metadata for these routes (with ownership comment documented).
   - Leverage React `cache()` for request deduplication.
   - Configure root `title.template` in `src/app/layout.tsx`.
