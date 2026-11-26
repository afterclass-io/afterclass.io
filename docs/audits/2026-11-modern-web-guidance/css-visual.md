# CSS & visual design audit
Guides reviewed: 40 (css/animate-to-intrinsic-sizes, css/atrule-support-conditionals, css/calculate-with-intrinsic-sizes, css/child-state-based-styling, css/content-based-styling, css/css-layout, css/css, css/design-token-reactivity, css/dynamic-sibling-styling, css/fluid-scaling, css/individual-transform-properties, css/overflow-clipping-control, css/reduce-style-repetition, css/responsive-design, css/selector-atrule-combinations, css/size-aware-styling, css/style-parent-with-has, css/usage-aware-component-variations, visual-design/adapt-scrollbar-to-contrast-preferences, visual-design/apply-webgl-shaders, visual-design/browser-ui-theming, visual-design/color, visual-design/complex-shapes, visual-design/contrast-color, visual-design/custom-text-decorations, visual-design/customize-scrollbar-color-and-thickness, visual-design/dark-mode, visual-design/equal-width-text-lines, visual-design/export-html-media-from-canvas, visual-design/expose-canvas-content-to-browser-features, visual-design/improve-text-layout-and-legibility, visual-design/interactive-content-in-3d-scenes, visual-design/precise-text-alignment, visual-design/shaped-cutouts, visual-design/teaser, visual-design/typography, visual-design/visual-effects, visual-design/visually-stable-font-fallbacks, visual-design/visually-stable-mixed-fonts, visual-design/visually-texture-content)

Scope: all of `src/common/styles/*.css`, `src/common/tour/tour.css`, Tailwind v4 config (`@theme` in `globals.css`/`shadcn.css`), every `.tsx` under `src/` and `views/`. Contrast ratios below were computed from the actual oklch token values (oklch → sRGB → WCAG relative luminance; alpha composited in sRGB).

## Findings

### [High] Global `*` font-size reset stops text size from inheriting, so container `text-*` classes silently do nothing
- Guide: `css/css` — "**DO NOT** use global resets (styles on `*`) as they cannot be overridden by web components or lower-priority cascade layers (without `!important`). Instead, apply reset styles to specific element types and/or conditions."
- Where: `src/common/styles/shadcn.css:146-148` (`* { @apply border-border outline-ring/50 text-sm md:text-base; }`). Confirmed visible breakage:
  - `src/modules/reviews/components/InformationSection/DetailCard/DetailCard.tsx:34,39,45,52`: `text-base` / `md:text-lg` on the row `<div>`s never reach the child `<p>` elements, which render at `text-sm md:text-base`.
  - `src/modules/timetable/components/TimetableAgenda.tsx:118-120`: the time column sets `text-2xs leading-tight`, but its two `<span>`s render at 14px/16px with the default line height. This is the dense cell that the `--text-2xs` token was added for (`shadcn.css:50`).
  - `src/modules/meetings/components/room/MeetingGroupPanel.tsx:43-46` (legend `text-xs`), `src/common/components/auth-wall.tsx:137-139` (compact title `text-xs`), `src/modules/roadmaps/components/PublicRoadmapsGallery.tsx:200-201` (meta row `text-xs`), `src/modules/bidding/components/BidPredictionCard.tsx:99-100` (`text-xs sm:text-sm` grid). In each, the child spans or divs are larger than intended.
  - Workaround clutter: `BidPredictionCard.tsx:66-78` repeats `text-2xl sm:text-3xl` on the `CardTitle` and on each of its child spans, because the size does not inherit.
- Problem: the selector puts `font-size` and `line-height` on every element. Any element without its own `text-*` class drops back to 14px/16px instead of inheriting from its parent. Line height also does not inherit, because Tailwind v4 registers `--tw-leading` with `inherits: false`. This also cancels UA sizing for `h1`–`h6`, `small`, `sub` and `sup`.
- Fix: replace the `*` font-size with an inherited base on the root, and keep only `border-color` on `*` (the shadcn convention):
  ```css
  @layer base {
    * { @apply border-border outline-ring/50; }
    html { @apply text-sm md:text-base; }   /* inherited by everything */
    body { @apply bg-background text-foreground; }
  }
  ```
  Then audit spots that relied on the reset (search for containers with a `text-*` class whose children have none), and delete redundant per-child repeats such as `BidPredictionCard.tsx:67,71,78`.

### [High] Focus indicators disappear in Windows forced-colors mode (`outline-none` + box-shadow ring)
- Guide: `visual-design/color` — "**Don't rely on `background-image`, `box-shadow`, or `border-image` to convey borders, separators, or state**: In forced colors they disappear … ensure there's an alternative in forced colors mode, such as `outline` or `border` with system color keywords".
- Where (16 instances, including the most-used primitives): `src/common/components/button.tsx:8`, `toggle.tsx:10`, `checkbox.tsx:17`, `radio-group.tsx:30`, `select.tsx:40`, `textarea.tsx:10`, `kbd.tsx:8`, `calendar.tsx:161,177,264`, `date-range-picker.tsx:165`, `input.tsx:176` (inner input `focus:outline-none`; the wrapper's focus state at `input.tsx:65` is a 1px `ring`), `src/modules/timetable/components/CourseSearchPanel.tsx:166`, `src/modules/assistant/session-list.tsx:129,137`, `src/modules/assistant/composer.tsx:35`.
- Problem: in Tailwind v4, `outline-none` means `outline-style: none`; the v3 transparent-outline behaviour moved to `outline-hidden`. With the outline removed, the only focus cue left is `ring-*`, which is a `box-shadow`, and forced-colors mode removes box-shadows. The `border-ring` colour change is also overridden by the system border colour. Keyboard users in High Contrast mode get no visible focus on buttons, inputs, selects, checkboxes or radios across the whole app. No `forced-colors` rule exists anywhere (0 matches).
- Fix: replace `outline-none` with `outline-hidden` in these 16 class strings. That keeps the ring in normal mode and draws a system-coloured outline in forced colors. Many other components (`sidebar.tsx`, `dropdown-menu.tsx`, `dialog.tsx:74`) already do this. Optionally add `forced-colors:outline-[CanvasText]` on `focus-visible`. Add a lint or test (like `no-phantom-classes.test.ts`) that forbids `outline-none` on interactive elements.

### [High] Status colours used as small text fail WCAG 1.4.3 (success 2.0–2.4:1, info 2.7–3.4:1, error 3.1–4.2:1)
- Guide: `visual-design/color` — "**Minimum contrast standards**: Maintain 4.5:1 for normal text and 3:1 for large text … or icons".
- Where:
  - Tokens: `--success` `oklch(0.7023 0.1879 162.94)`, `--info` `oklch(0.6637 0.2266 259.26)` and `--error` `oklch(0.6126 0.2559 28.9)` (`shadcn.css:90-98`) are used directly as text colours.
  - `src/common/components/tag.tsx:76,82,95,101,133,139` (outline and soft variants; for example, soft success text on `bg-success/15` measures **1.99:1**).
  - `tag.tsx` filled variants: `text-white` on `bg-success` is **2.35:1** and on `bg-info` **3.35:1**.
  - In use: the sidebar "beta" tags `src/modules/home/components/AppSidebar/AppSidebar.tsx:210,254` (outline success, size xs, about 2.2:1); the exam tag `src/modules/timetable/components/TimetableSlotCard.tsx:132` (soft error, about 3.1:1); `src/modules/roadmaps/components/RoadmapConflictBadge.tsx:28,32`; `src/app/(school)/timetable/page.tsx:157` (`text-error text-xs` link, about 3.7–4.1:1); `src/modules/search/components/SearchCmdk/SearchCmdk.tsx:177`.
  - Raw palette colours: `src/modules/auth/components/ResetPasswordForm.tsx:67` (`text-green-500` success message, **1.97–2.2:1**); `src/modules/assistant/quota-meter/quota-meter.tsx:46,48,73` (`text-emerald-600` / `text-amber-600` on `/15` tints: **3.1:1 / 2.8:1**, and `text-xs` uppercase); `src/app/not-found.tsx:21` (`text-gray-500` on `bg-background`, **4.28:1** light, about 4.1:1 dark).
  - Icons below 3:1: `src/modules/roadmaps/components/RoadmapList.tsx:260` (`text-success` Globe icon, about 2.3:1); `src/modules/assistant/tool-call-card.tsx:54` (`text-emerald-500`, about 2.4:1).
- Problem: only warning has a separate darkened text token (`--warning-text`, guarded by `warning-contrast.test.ts`). Success, info and error reuse their fill colour as text on light surfaces. Dark mode passes (4.2–7.6:1).
- Fix: add `--success-text`, `--info-text` and `--error-text` (for example light `oklch(0.50 0.13 163)`, `oklch(0.50 0.20 259)`, `oklch(0.52 0.22 29)`, tuned to ≥4.5:1 on `--card` and on the `/15` tint). Map them in `@theme inline` as `--color-*-text`, use them in `tag.tsx` outline/soft variants, and add the cases to `warning-contrast.cases.json`. For filled success/info, use a dark foreground or darken the fill. Replace raw `text-green-500`, `text-emerald-*`, `text-amber-600` and `text-gray-500` with the semantic tokens (`text-success-text`, `text-muted-foreground`).

### [Medium] Focus ring (`ring-ring/50`) and default outline colour are about 2.3:1 against the surface
- Guide: `visual-design/color` — "**Ensure non-text contrast standards**: Maintain a minimum contrast ratio of 3:1 … This also includes visual elements indicating active states within a component (e.g., … custom focus indicators)."
- Where: `focus-visible:ring-ring/50` in `button.tsx:8`, `toggle.tsx:10`, `checkbox.tsx:17`, `radio-group.tsx:30`, `select.tsx:40`, `textarea.tsx:10`; the global `outline-ring/50` at `shadcn.css:147`, which also tints the browser's default focus outline; and `.focus-ring` at `src/common/styles/components.css:3` (`ring-primary/20`, **1.37:1**; only elements with a visible border also get the solid `border-primary`, for example `ReviewItem.tsx:33` has no border).
- Problem: primary at 50% alpha composited over `--background`/`--card` measures **2.34–2.41:1** in light mode and **2.26:1** in dark mode. A solid `--ring` measures 5.3–7.0:1. On the filled default button there is no border, so the 2.3:1 ring is the only focus cue.
- Fix: use a solid ring (`focus-visible:ring-ring` or `ring-ring/80`, and `outline-ring` without the `/50`), or a 2px `outline-ring` with an offset. Change `.focus-ring` to `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`.

### [Medium] Form-field borders are about 1.1–1.5:1, and there is no `prefers-contrast` reinforcement
- Guide: `visual-design/color` — "Maintain a minimum contrast ratio of 3:1 for user interface component boundaries … (e.g., input field borders)"; "Reach for `@media (prefers-contrast: more)` when the design uses low-contrast accents (e.g., subtle borders, muted secondary text)".
- Where: `--input`/`--border` `oklch(0.92 0.004 286.32)` (`shadcn.css:73-74`). Against `--background` this is **1.12:1** and against `--card` **1.23:1**. Dark `--input` `oklch(1 0 0 / 15%)` is **1.47:1**. Used by transparent-background fields: `input.tsx:62` (`InputRoot`, `border-input bg-transparent`), `textarea.tsx:10`, `select.tsx:40`, `checkbox.tsx:17`, `radio-group.tsx:30` (9 `border-input` usages). There are 0 `prefers-contrast` / `contrast-more` rules.
- Problem: with transparent fills, the 1px border is the only cue that a text field or checkbox exists.
- Fix: darken `--input` (and the checkbox/radio border) to at least 3:1 against `--card` (for example light `oklch(0.62 0.01 286)`, dark `oklch(1 0 0 / 40%)`). Keep `--border` subtle for decorative card dividers. Add a `@media (prefers-contrast: more)` block on `:root`/`.dark` that strengthens `--border`, `--muted-foreground` and `--ring`.

### [Medium] Colour-only data visualisations vanish in forced colors (meetings heatmap, paint grid, progress bars)
- Guide: `visual-design/color` — "**Use `forced-color-adjust: none` only where color is essential information** (syntax highlighter, color picker swatch)" and "Don't use color alone to indicate the presence of a user interface component or its state".
- Where: `src/modules/meetings/components/grid/MeetingHeatmapCell.tsx:43` (inline `backgroundColor` is the only availability signal; the `aria-label` at `MeetingMatrixGrid.tsx:248` gives only the date and time); `src/modules/meetings/components/grid/MeetingMatrixGrid.tsx:268-271` (painted available / if-needed slots are background-only); `src/common/components/progress.tsx:17,24` (fill and track are both backgrounds); `src/modules/assistant/quota-meter/quota-meter.tsx` bar.
- Problem: in forced-colors mode, author backgrounds are replaced with `Canvas`/`ButtonFace`, so every heatmap cell, painted slot and progress fill looks the same. For non-AT users the availability ratio is also not in the cell's accessible name.
- Fix: add `forced-color-adjust: none` (Tailwind `forced-color-adjust-none`) on the heatmap/matrix cells and on the progress indicator, since colour is the data there. Give the progress indicator a `forced-colors:bg-[Highlight]` fallback. Add the availability count to each heatmap cell's `aria-label` (for example "Tue 3 Mar 10:00, 4 of 6 available").

### [Medium] Dark-mode bootstrap: no `<meta name="color-scheme">`, and a misleading body-scoped `color-scheme`
- Guide: `visual-design/dark-mode` — "MANDATORY: To help prevent a "flash of un-themed content" (FOUC), place a `<meta>` tag in your `<head>`"; "MANDATORY: Apply the `color-scheme` property to the `html` element or the `:root` pseudo-class … If applied only to the `body`, these global UI surfaces may remain in light mode".
- Where: `src/app/layout.tsx:64-71` (no colour-scheme meta); `src/common/styles/shadcn.css:56` (`:root { color-scheme: light }`) and `shadcn.css:152-157` (`.dark body { color-scheme: dark }`, with the comment "Chromium only honors class-selected color-scheme on non-root elements").
- Problem: the root is pinned to `light` in CSS. The only thing that switches the root (viewport scrollbar and canvas) to dark is next-themes' default `enableColorScheme`, which writes an inline `style="color-scheme: dark"` on `<html>` after its inline script runs. Dark-preferring users therefore get a light canvas until that script executes. The comment is wrong: `color-scheme` set on `html.dark` is honoured. The body rule is redundant at best, and is a trap if someone later sets `enableColorScheme={false}`.
- Fix: add `<meta name="color-scheme" content="light dark" />` in `layout.tsx` `<head>` (Next 16 can also emit it through the `viewport.colorScheme` export). Replace `shadcn.css:56` and `:152-157` with `:root { color-scheme: light; } :root.dark { color-scheme: dark; }`, and delete the incorrect comment. Baseline: `color-scheme` is Widely available.

### [Medium] Floating assistant panel uses viewport breakpoints inside a user-resizable box (use container queries)
- Guide: `css/size-aware-styling` — "Size-aware styling allows components to change their layout or appearance based on the space available to them, rather than the size of the whole screen"; `css/responsive-design` — "Use `@container` queries to create component-driven responsive layouts".
- Where: `src/modules/assistant/assistant-widget.tsx:70-85` (dialog with JS `size.width`/`size.height`) hosts `ChatPanel`, which uses `sm:` viewport variants: `src/modules/assistant/chat-panel.tsx:180` (`sm:text-2xl`), `src/modules/assistant/suggestions.tsx:46` (`sm:px-3.5 sm:py-1.5 sm:text-sm`). `src/modules/assistant/mcp-recommendation.tsx:28` (`sm:flex-row`) is also shared with the full page. The codebase uses only 1 `@container` (`card.tsx:23`, with no `@`-variant consumers) against 379 viewport-variant usages.
- Problem: on any desktop viewport `sm:` is true, so a narrow (about 360px) resized widget gets the wide-screen typography and spacing, while the full-page `/assistant` view gets the same values for a different width.
- Fix: add `@container` to the widget dialog and to the chat-page `<main>`, and switch these components to `@sm:` / `@md:` container variants (Tailwind v4 built-in). Baseline: container size queries are Widely available, so no fallback is needed.

### [Low] `InputRoot` tracks focus in React state to style the wrapper; use `:focus-within` / `:has()`
- Guide: `css/css` — "**DO** use `:has()` to style parents based on child state instead of managing classes in JS".
- Where: `src/common/components/input.tsx:39` (`useState(false)`), `:49` (context setter), `:65` (`focused && "ring-ring ring-1"`).
- Fix: drop the state and apply `has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2` (or `focus-within:`) on the wrapper. This removes a re-render on every focus and blur. `:has()` is Widely available.

### [Low] Headings and long-form text do not use `text-wrap: balance` / `pretty`
- Guide: `visual-design/typography` — "Use `text-wrap: balance` for balanced headlines and headline-like content … Use `text-wrap: pretty` for long-form body text".
- Where: the shared `src/common/components/heading.tsx:25`, `card.tsx:35` (`CardTitle`, also `leading-none`, which crams wrapped titles) and the dialog/sheet titles have no `text-balance`; it appears only in `not-found.tsx:18`, `error-screen.tsx:13` and `assistant/connect-gate.tsx:31`. Review and agenda bodies have no `text-pretty`: `ReviewModal.tsx:97`, `MeetingDetailsPanel.tsx:23`, `InformationModal.tsx:39`, `RoadmapCourseDialog.tsx:66`. `BidWindowScheduleCard.tsx:199,213` use `text-wrap`, which is the default and does nothing.
- Fix: add `text-balance` to `Heading`, `CardTitle`, `DialogTitle` and `SheetTitle`, and replace `leading-none` with `leading-tight`. Add `text-pretty` to the long-form containers above. Both are progressive enhancements (balance is Newly available; pretty has Limited availability), so no fallback is needed.

### [Low] `px` font sizes in MCP views and the tour popover; views never declare `color-scheme`
- Guide: `visual-design/typography` — "**DON'T** use `px` for font-size. Prefer `rem` to honor the user's browser font-size preferences"; `visual-design/dark-mode` — "MANDATORY: Apply the `color-scheme` property to the `html` element or the `:root`".
- Where: 88 numeric `fontSize` values (rendered as px, 9–14px) across `views/**` (for example `views/timetable/view.tsx:253-471`, including `fontSize: 9` for hour ticks at `:302`; `views/shared/components/ReviewCard.tsx:33-109`; `views/roadmap-view/view.tsx:84-232`). Also `src/common/tour/tour.css:17,23,37,47` (15/13/12px). `views/timetable/view.tsx:238-250`: the views pick `TOKENS.dark` from `useViewTheme()` but never set `color-scheme`, so in dark hosts the iframe's native scrollbars (the grid uses `overflowX: "auto"`, `:263`) and controls stay light. Chromium may also paint an opaque light canvas when the iframe's scheme differs from the embedder's. Unless the `mcp-use` shell sets it, which could not be verified because `node_modules` is absent. `views/shared/tokens.tsx:71` uses the deprecated `clip: rect(0,0,0,0)` for the visually-hidden text.
- Fix: use `"0.75rem"`-style strings (or `em` relative to a root `fontSize`) and raise the 9–10px labels to at least `0.6875rem`. Set `colorScheme: dark ? "dark" : "light"` on the view root (and on `document.documentElement` in the view bootstrap). Replace `clip` with `clipPath: "inset(50%)"` plus `whiteSpace: "nowrap"`.

### [Low] Raw palette and hex colours bypass the token system
- Guide: `css/css` — "**DO NOT** specify nontrivial styling values inline. E.g. `background: transparent` or `padding: 0` is ok, but `background: #f06` … are not."
- Where: `src/modules/timetable/components/CreditTotalBadge.tsx:38-42` (emerald/amber/red-100/800), `src/modules/assistant/quota-alert-bar.tsx:59-86`, `quota-meter.tsx:10-12,46-50,73`, `src/app/oauth/consent/consent-ui.tsx:88`, `src/modules/bidding/components/BiddingClassList.tsx:64`, `ModAlternativesCard.tsx:85,125` (`text-gray-500`), `src/modules/bidding/components/BidChart.tsx:33,37,259` (hex `#2563eb`/`#d97706`, no dark variant), `src/app/layout.tsx:32-33` (`themeColor` hexes: the dark `#131316` does not match `--background` `#09090b`, and the value follows `prefers-color-scheme` rather than the user's manual theme choice).
- Fix: map these to `success`/`warning`/`error`/`muted-foreground`/`chart-*` tokens (use `var(--chart-1)` in the chart config). Derive `themeColor` from the same token values. If the manual toggle should drive the browser UI colour, update `<meta name="theme-color">` from the theme effect.

### [Low] `color-mix(in srgb, …)` for heatmap tints
- Guide: `visual-design/visual-effects` — "*DON'T* use `in srgb` unless you have a specific reason to do so"; "Prefer `in oklab` by default for `color-mix()`".
- Where: `src/modules/meetings/utils/matrix.ts:239`, `src/modules/meetings/components/grid/MeetingMatrixGrid.tsx:269,271`.
- Fix: use `color-mix(in oklab, var(--mt-available) N%, transparent)`, or Tailwind's opacity modifier `bg-(--mt-available)/75`, which already emits `in oklab`.

### [Low] Physical spacing and alignment utilities almost everywhere
- Guide: `css/css` — "Prefer **logical properties and values** over physical ones (e.g. `margin-inline-start` instead of `margin-left`) … external translation tools often display translated text in context."
- Where: about 300 physical utilities (`mr-` 55, `text-left` 50, `pr-` 42, `pl-` 41, `left-` 27, `ml-` 24, `right-` 22, …) against 3 logical ones across `src/` and `views/`. Examples: `button.tsx` icon spacing, `tag.tsx` start/end icon margins (`[&>.start-icon]:ml-0.5 -mr-1`), `CourseSearchPanel.tsx:166` (`text-left`).
- Fix: when touching components, prefer `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start` where the value should follow reading direction. Keep physical values for genuinely physical placement, such as a draggable widget's `left`/`top`.

### [Low] Dead or phantom CSS
- Guide: `css/css` — "Be allergic to knowledge duplication. … prefer built-in conventions".
- Where: `src/common/styles/radix-dialog.css:19-39` (`dialog-content-show/hide` keyframes, never referenced; only the overlay keyframes are used at `dialog.tsx:41`); `src/common/styles/components.css:5-13` (`.break-anywhere`, never used and duplicating Tailwind v4's `wrap-anywhere`, which the code already uses); `src/common/components/dialog.tsx:142` (`custom-scrollbar` class with no definition).
- Fix: delete these, and add `custom-scrollbar` to `no-phantom-classes.test.ts`.

### [Low] `user-select: none` on content tags; inline monospace not size-normalised
- Guide: `visual-design/browser-ui-theming` — "**DON'T** apply `user-select: none` to content text — breaks copy-paste, translation tools"; `visual-design/visually-stable-mixed-fonts` — "Apply `font-size-adjust` to elements where font consistency is critical, such as … blocks with mixed font families."
- Where: `src/common/components/tag.tsx:8` (every tag, including course codes and section labels like "T01" in `ClassCard`, cannot be selected); `FilterToggleSection.tsx:17` (whole panel). Inline `font-mono` spans inside sans text, 33 uses (for example `ReviewReactionsGroup.tsx:48`, `ReviewFooter.tsx:37`, `BidPredictionCard.tsx:71,78`).
- Fix: drop `select-none` from `Tag` (keep it on drag chips and the paint grid, where it is justified). Add `font-size-adjust: from-font` (Tailwind arbitrary `[font-size-adjust:from-font]`) on the mono utility or the containers. Baseline: Newly available, so it is a progressive enhancement.

### [Low] `100vw` / `100vh` where dynamic units or `%` are safer
- Guide: `css/css-layout` — "Don't use `100vw` for full-width layout — it ignores scrollbar width and causes horizontal overflow"; `css/responsive-design` — "Use dynamic viewport units (`dvh`, `dvw`) instead of `vh`/`vw`".
- Where: `src/modules/assistant/assistant-widget.tsx:74,82` (`max-w-[calc(100vw-1rem)]` and `maxWidth: calc(100vw - 16px)` on a fixed panel); `src/modules/roadmaps/components/MyRoadmapsEditor.tsx:548` and `src/app/(school)/timetable/page.tsx:647` (`lg:max-h-[calc(100vh-…)]`, which also applies on tablets with dynamic toolbars).
- Fix: use `max-w-[calc(100%-1rem)]` (for a fixed element, `%` resolves against the viewport without the scrollbar) and `100dvh`. Neighbouring code (`chat-page.tsx:145`) already uses `dvh`.

## Done well
- Design tokens are defined in oklch with a clear semantic layer (`shadcn.css` `@theme inline` → `--color-*`), dark overrides live in one place, and the views mirror them with a drift test (`views/shared/tokens.drift.test.ts`). Token contrast is guarded by tests (`warning-contrast.test.ts`, `meetings-theme-contrast.test.ts`, `no-hsl-wrapped-tokens.test.ts`, `no-phantom-classes.test.ts`).
- Tailwind v4 cascade layers are used (`@layer base/components`), and the sidebar breakpoint is a CSS `@theme` breakpoint (`globals.css:15`), so the server-rendered shell is correct at first paint, with no JavaScript layout shift.
- `scrollbar-gutter: stable` on scroll panels (`CourseSearchPanel.tsx:125`, `CourseSearchSidebar.tsx:171`); `field-sizing: content` on the textarea and composer (`textarea.tsx:10`, `composer.tsx:35`); `svh`/`dvh` in the sidebar and chat layouts; no legacy hacks found (no padding-top aspect ratios, floats, `::-webkit-scrollbar` or unnecessary `-webkit-` prefixes).
- `:has()` is used for parent state in several primitives (`button.tsx` `has-[>svg]`, `sidebar.tsx`, `card.tsx`). Many interactive components correctly use `outline-hidden`, which keeps forced-colors outlines.
- next-themes is set to `defaultTheme="system"` with `disableTransitionOnChange`, and the theme toggle avoids a hydration mismatch.

## Guides with no applicable code
- css/animate-to-intrinsic-sizes: no height/auto expand animations in app CSS (Radix collapsibles handle their own sizing).
- css/calculate-with-intrinsic-sizes: no math on intrinsic sizes is needed or attempted.
- css/atrule-support-conditionals: no `@supports` usage or at-rule detection anywhere.
- css/content-based-styling: no JavaScript-injected content-modifier classes found; layouts are decided at render time in JSX.
- css/design-token-reactivity: no density or theme higher-order tokens beyond light/dark (handled by the `.dark` class).
- css/dynamic-sibling-styling: no per-index styling loops; colour lanes are chosen in JavaScript from data, not position.
- css/fluid-scaling: no fluid or `vw`-based type or spacing (no `clamp()` font sizes).
- css/individual-transform-properties: Tailwind v4 `scale-`/`translate-` utilities already emit the individual properties; the only raw `transform`s are dnd-kit output and the unused keyframes (listed above).
- css/overflow-clipping-control: no clipped-shadow wrapper hacks or nested-radius clipping that needs `overflow-clip-margin`.
- css/reduce-style-repetition: `@function` has Limited availability, and repetition is handled through CVA variants.
- css/selector-atrule-combinations: dark mode is a single class path (no media-query plus class duplication).
- css/style-parent-with-has: forms use react-hook-form, which sets `aria-invalid` (styled with `aria-invalid:`), not `:user-invalid`. Belongs with the forms audit.
- css/usage-aware-component-variations: no contextual variant switching by container.
- visual-design/adapt-scrollbar-to-contrast-preferences, visual-design/customize-scrollbar-color-and-thickness: no custom scrollbar colours or widths anywhere (native scrollbars via `color-scheme`).
- visual-design/contrast-color: no runtime or user-defined background colours that need automatic foregrounds (course colours come from fixed palettes).
- visual-design/custom-text-decorations: links use native `underline-offset-4 hover:underline`; no faked underlines.
- visual-design/complex-shapes, shaped-cutouts, visually-texture-content, teaser: no masks, cutouts, textures or teaser fades in the UI.
- visual-design/equal-width-text-lines, precise-text-alignment: no poster lockups; `text-box` is Limited availability, and nothing currently needs trimming.
- visual-design/visually-stable-font-fallbacks: no web fonts are loaded (system font stack, no `next/font` or `@font-face`), so there is no fallback swap.
- visual-design/apply-webgl-shaders, export-html-media-from-canvas, expose-canvas-content-to-browser-features, interactive-content-in-3d-scenes: no `<canvas>`/WebGL rendering in app code (charts are SVG via recharts and React Flow).
