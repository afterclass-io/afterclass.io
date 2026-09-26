# #519 — Verify and correct the skeleton dimensions

Base commit: `62cf817f`. Method: static measurement from the working tree — each row's
rendered classes read directly, line boxes = font-size × line-height (Tailwind default
scale, no `@theme` overrides found in `src/common/styles/*.css`). Where a class list
gives a fixed height (`h-8`, `h-9`, …) that value is used verbatim. No browser tooling
was available; the orchestrator re-measures CLS in a real browser at the end.

Tailwind line boxes used below:
`text-xs`=16, `text-sm`=20, `text-base`/`leading-5`=24/20, `text-lg`=28, `text-xl`=28,
`text-2xl`=32, `text-3xl`=36. Fixed: `h-4`=16, `h-5`=20, `h-6`=24, `h-7`=28, `h-8`=32,
`h-9`=36, `h-11`=44.

---

## Row 1 — `ReviewItemSkeleton` vs `ReviewItem` — CONFIRMED

Skeleton root vs `ReviewItem.tsx:52`: root `gap-2 md:gap-4` matches; header class did
not. Rendered header (`ReviewItem.tsx:32`):
`flex flex-col content-center gap-3 self-stretch overflow-hidden md:flex-row-reverse md:justify-between`.
Skeleton header was missing `flex-col`, `overflow-hidden`, and `md:justify-between`,
so it laid out as a row on mobile instead of stacking.

Missing body rows (`ReviewBody.tsx:13-19`, all inside `flex flex-col gap-2`):
- rating: `RatingGroup iconSize={16}` → icons 16px tall → line box 16px (`h-4`), width 5×16 + 4×4 = 96 (`w-24`).
- labels: `ReviewLabelGroup` span inherits `text-base` → 24px line box (`h-6`).
- body: `line-clamp-3 md:text-sm` → 20px line boxes (unchanged).

Missing footer (`ReviewFooter.tsx:19-41`): outer `space-y-2`, actions row `flex gap-4`
whose tallest children are `VoteGroup h-8` (32), reaction button `size-8` (32),
share button `h-8` (32); views cell (`size-4` icon) stretches to the 32px row.
Rendered footer = 32px (no reactions) / 36+8+32 = 76px (reactions present, the group
renders `h-9` buttons). Ticket lead ≈44px; skeleton reserves `min-h-11` (44px).

Fix: mirror the header classes, add rating (`h-4 w-24`) + label (`h-6 w-[160px]`) rows
inside `flex flex-col gap-2`, and a `min-h-11` footer row with `h-8`/`size-8` controls.

## Row 2 — `stat-item.tsx` — CLOSED (premise failed / sub-noise)

Rendered value (`stat-item.tsx:37-45`):
- horizontal: `text-3xl` → 36px line box; skeleton `h-[32px]` → **4px delta**.
- vertical: `text-2xl` → 32px; skeleton `h-[28px]` → **4px delta**.
- label: `text-base font-medium` → 24px; skeleton `h-[20px]` → 4px delta.

The audited `w-12` vs `w-[130px]` width mismatch no longer exists (both label/value
bars use `w-[130px]`; the horizontal value is `w-[54.4px]`). 4px per row is below the
CLS relevance floor for a single stat block and the component is not a page-level
boundary. No change.

## Row 3 — `InformationCardSkeleton` + course loading container — CONFIRMED

Rendered card (`InformationCard.tsx`):
- root `bg-card flex h-full w-full …` — skeleton was missing **`h-full`**.
- description `line-clamp-6 leading-5` → max 6×20 = **120px**; skeleton wrapper was
  `line-clamp-5 md:line-clamp-3` with a fixed `h-[60px]` bar → under-sized by 60px.
- child (`InformationCard.LoginButton` = `ProgressLink variant="link"` → default
  button size `h-9` = 36px; or `InformationModal` trigger `Button variant="link"`
  `h-9`) — skeleton had **no** child placeholder.

Loading container `@information/course/loading.tsx` used `flex flex-wrap gap-6
md:flex-nowrap` with `md:w-2/3` / `md:w-1/3`; rendered page uses
`grid w-full grid-cols-25 gap-4 md:gap-6` with `col-span-25 md:col-span-16` /
`md:col-span-9` (page.tsx:21-35).

Fix: add `h-full`; description bar `h-[120px]` in `line-clamp-6 leading-5`; add an
`h-9` button-shaped placeholder; rebuild the loading container as the page grid.

## Row 4 — `DetailCardSkeleton` vs `DetailCard` — CONFIRMED

Both shells have `h-full` (matches). Rendered rows (`DetailCard.tsx:34,40,47`):
`flex gap-2 font-medium md:gap-3 md:text-lg` → 24px line box mobile / **28px** desktop.
Skeleton rows were fixed `h-[20px]` → 4/8px delta.

Conditional area: description-link row (`h-9` Button) + `hr` + bidding block
(`text-sm` 20 + `text-xs` 16 + gaps ≈ 64px), rendered only when course data has a
class/outline. A loading boundary cannot render data-dependent blocks, so the rows
container gets a modest `min-h-[120px]` to reserve that area.

Fix: rows `h-6 md:h-7`, container `min-h-[120px]`.

## Row 5 — `PublicRoadmapsGallery` loading — CONFIRMED

Loading rendered 6 × `<Skeleton className="h-32">` (128px) while `PAGE_SIZE = 12`.
Rendered card (`Card`/`CardHeader`/`CardContent`): `py-6` (48) + `gap-6` (24) + title
`text-lg` (28) + content (desc 2×20 + 8 + author 20 + 8 + stats 16 = 92) ≈ **192px**.

Fix: `PAGE_SIZE` card-shaped skeletons (Card/CardHeader/CardContent blocks) ≈ 172–192px.

## Row 6 — `@header/course|professor/loading.tsx` — CONFIRMED (bar geometry)

`PageTitle` heading is `text-lg md:text-3xl` (`page-title.tsx:27`) → 28px / **36px**
line box. Skeleton bars were `h-[23.98px]`. Fix to `h-7 md:h-9`.

Note: the `PageTitle` row height is actually driven by `contentLeft` icon `h-9 w-9`
(36px) on both breakpoints, so this correction changes the bar geometry but **not**
the row height — CLS contribution ≈ 0. Still corrected so the bar matches its text.

Tag: `SchoolTag` = `Tag size=md` (`h-8`, fixed) with a `SchoolIcon` avatar `size-6`
(24px) and a `Heading as="h5"` inheriting `Tag`'s `text-sm` → 20px line box. The tag
itself is already `h-8` (fixed by `Tag`), so the inner bar cannot affect layout; the
text bar was set to `h-5` (`text-sm` line box) instead of `h-[23.98px]`. Avatar
skeleton kept at `h-6 w-6`.

---

## P2.6 items — CONFIRMED, out of scope (no change)

1. `src/common/components/icons/school-icon/school-icon.tsx:27` — `<TooltipTrigger>`
   without `asChild` wraps `<CustomIcon>`. Radix `TooltipTrigger` falls back to its own
   `<button>`; `CustomIcon` (`custom-icon.tsx:8-30`) is a plain function component with
   no `forwardRef` and no `asChild`, so it cannot be passed through as a child of
   `Slot`. `SchoolTag` (avatar) is rendered inside `PageTitle`, and `RevieweeGroup`
   (`RevieweeGroup.tsx:20`) renders `SchoolIcon` inside `ProgressLink` anchors →
   `<button>` nested in `<a>` (invalid DOM, a11y/interaction defect). This is a
   component/DOM fix, not a CWV skeleton change. Out of this batch.

2. `src/modules/bidding/components/ClassCard.tsx:46` — fixed `w-64` (256px)
   `ProgressLink` inside the bidding analytics responsive grid. Confirmed the class is
   present. Changing it is a layout/visual change with no loading-boundary angle.
   Out of this batch.

---

## Measured layout-shift contribution (before → after, static)

| Row | Skeleton before | Rendered | Delta before | After |
|-----|-----------------|----------|--------------|-------|
| 1 header | row on mobile; desktop missing justify-between | stacked mobile / reverse row desktop | mobile ~0–24px structure | structural match |
| 1 body | 1 block (body only) | rating 16 + 8 + labels 24 + 8 + body | ~56px missing | added |
| 1 footer | 0 | 32–76px (≈44 reserved) | ~44px missing | `min-h-11` |
| 2 stat | 28/32 | 32/36 | 4px | closed, unchanged |
| 3 card | desc 60, no child | desc ≤120, child 36 | ~96px missing | `h-[120px]` + `h-9` |
| 3 container | 2/3–1/3 flex | 25-col grid 16/9 | column widths differ | grid matched |
| 4 rows | 20×2 | 24/28×2 | 8–16px per row | `h-6 md:h-7` + `min-h-[120px]` |
| 5 gallery | 6 × 128px | 12 × ~192px | 6 cards + 64px each | 12 card-shaped |
| 6 header | 23.98 heading | 28/36 (row icon-bound 36) | visual only | `h-7 md:h-9` |
