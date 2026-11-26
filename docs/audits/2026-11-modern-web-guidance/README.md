# Modern Web Guidance audit — November 2026

An audit of `src/` and `views/` against Chrome's
[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) (package
`modern-web-guidance@1.0.2`, 211 guides). Every guide was read and checked against the code by one of seven
parallel reviewers, one per guide area. The per-area reports in this folder hold each finding's guide ID, a
verbatim quote of the rule, every `file:line`, and the suggested fix.

**Browser target:** the repo has no browserslist and no written policy, so the audit uses the guidance
default: features that are Baseline *Widely available* need no fallback, and anything newer needs the
fallback its guide gives.

**Method and limits:** findings come from reading the code. Nothing was run in a browser or a screen reader,
and `node_modules` was not installed, so claims that depend on library internals are marked "verify" in the
area reports. The guidance's automated `legacy-scan` was not run. The findings marked ✅ in the table below
were re-checked against the source by hand.

| Area | Report | High | Medium | Low |
|---|---|---:|---:|---:|
| Accessibility, HTML & forms | [a11y-html-forms.md](a11y-html-forms.md) | 8 | 12 | 6 |
| UI components & atoms | [ui-components.md](ui-components.md) | 5 | 13 | 7 |
| UI behaviors & UX | [ui-behaviors.md](ui-behaviors.md) | 4 | 8 | 3 |
| CSS & visual design | [css-visual.md](css-visual.md) | 3 | 5 | 9 |
| Security & privacy | [security.md](security.md) | 3 | 6 | 3 |
| Performance / Core Web Vitals | [performance.md](performance.md) | 2 | 4 | 6 |
| JS platform, PWA, built-in AI, WebMCP | [js-platform.md](js-platform.md) | 2 | 2 | 6 |
| **Total (before de-duplication)** | | **27** | **50** | **40** |

Several issues were reported by more than one area. The list below merges them.

## Priority 1: fix first

Each of these breaks things for users, blocks access, or exposes them to risk.

| # | Issue | Where | ✅ | Areas |
|---|---|---|:-:|---|
| 1 | **No security headers in production.** `headers()` returns `[]` outside development, `vercel.json` has no `headers`, and there is no proxy or middleware. That means no CSP, no `frame-ancestors`/XFO, no nosniff, Referrer-Policy, Permissions-Policy or COOP. | `next.config.js:128` | ✅ | security |
| 2 | **The OAuth consent page can be framed (clickjacking).** A framed `/oauth/consent` can trick a user into clicking Approve, granting an MCP client read/write access. Fix: `frame-ancestors 'none'`. | `src/app/oauth/consent/consent-ui.tsx:124` | | security |
| 3 | **The consent card's trust label can be spoofed.** Any `redirect_uri` containing `user_bound_custom-mcp` is shown as "Your AI agent (via Google)". | `consent-ui.tsx:50` | ✅ | security |
| 4 | **Assistant markdown renders remote images, so a prompt injection can leak data with no click.** Only `a` is overridden. Override `img` and back it with CSP `img-src`. | `src/modules/assistant/markdown.tsx:19` | ✅ | security |
| 5 | **Assistant chat history leaks across accounts on a shared browser.** It uses one IndexedDB name, not keyed by user, and nothing clears it at sign-out. | `src/modules/assistant/idb.ts:1` | ✅ | security |
| 6 | **Pressing "/" anywhere opens search, so "/" can't be typed** in any input on pages with the sidebar. It also closes the open search box. Skip editable targets and `isComposing`. | `SearchCmdk.tsx:76-86` | ✅ | performance, ui-components |
| 7 | **Auth inputs have no label.** `FormControl` wraps the `InputRoot` div, so `id`/`aria-*` and `<label for>` land on the div. Also `autoComplete="on"` with no `username`/`current-password`/`new-password`, no `type="email"`, and 16 positive `tabIndex` values. | `EmailField.tsx:44`, `PasswordField.tsx:46` | ✅ | a11y, security |
| 8 | **A review can't be submitted by keyboard or screen reader.** The rating is clickable SVGs inside `role="img"`. Tag checkboxes are `display:none` and share one id, which also breaks the bid-analytics Round/Window filters. | `rating-group.tsx`, `tag-toggle-group.tsx:27-52` | ✅ | a11y, ui-components |
| 9 | **Review cards can't be opened by keyboard.** The modal trigger is a non-focusable `<div>` that also wraps the vote, react and share buttons, and review text is clamped. | `ReviewItem.tsx:31-40` | ✅ | ui-components |
| 10 | **Reactions only work on mouse hover.** It uses a Radix HoverCard, which ignores touch and Tab, and the emoji `onClick` is on an inner `<span>`. Use a Popover with real buttons. | `reaction-picker-button.tsx:32-62` | ✅ | a11y, ui-components, ui-behaviors |
| 11 | **Roadmap drag-and-drop has no keyboard path.** The chip's own `onKeyDown`, placed after `{...listeners}`, replaces dnd-kit's keyboard sensor, and there's no "Move to term" fallback. | `RoadmapCourseChip.tsx:139-144`, `CourseSearchSidebar.tsx:65-76` | ✅ | ui-behaviors |
| 12 | **Meeting availability painting needs a pointer, and the heatmap shows details only on hover.** Cells are pointer-only `div`s, `touch-action:none` blocks scrolling on phones, and cell labels omit counts. | `MeetingMatrixGrid.tsx:143-148, 245-283`, `HeatmapHoverCard.tsx` | | ui-behaviors, ui-components, css |
| 13 | **Meeting dates are probably wrong outside UTC+0…+8.** Grid code reads browser-local `Date` fields from dates stored as UTC midnight. The `.ics` export writes local clock time labelled `TZID=Asia/Singapore`. Confirm with a test run in another `TZ`. | `meetings/utils/matrix.ts`, `common/functions/ical.ts:25-43` | ◐ | js-platform |
| 14 | **The global `*` font-size reset breaks inheritance.** `md:text-lg` on containers does nothing, dense text renders at 14–16px, and inputs at 14px trigger iOS zoom on focus. Move the size to `html`. | `src/common/styles/shadcn.css:147` | ✅ | css, a11y |
| 15 | **Focus is invisible in Windows High Contrast mode** for 16 primitives (`outline-none` plus a box-shadow ring), and no `forced-colors` rules exist. Use `outline-hidden`. The 15 bare `Input`s have no border or focus style at all. | `common/components/*`, `input.tsx:337` | ✅ | css, a11y |
| 16 | **Status-color text fails 4.5:1 contrast** (`text-success`/`info`/`error`, about 2.0–4.2:1). Add `*-text` tokens, as was done for warning. | Tag, quota badges, reset-password message | | css |
| 17 | **Information shown only in tooltips on non-focusable `<span>`s**: conflict badges, the bidding disclaimer, the "Seats Taken" definition, and reasons for disabled buttons. Use toggletips or inline text, and `aria-disabled`. | see ui-behaviors #4 | | ui-behaviors, ui-components |
| 18 | **The assistant chat ships on every route.** It's statically imported in the root layout, and the closed widget still starts `useChat` and reads IndexedDB. Use `next/dynamic` and mount on first open. | `assistant-provider.tsx:8` | | performance |
| 19 | **Sentry Replay loads before hydration** with `replaysOnErrorSampleRate: 1.0`, recording DOM changes in every session. Lazy-load it. | `instrumentation-client.ts:17,37` | ✅ | performance |

## Priority 2: clear deviations

- **`ProgressLink` cancels every click**, which breaks Cmd/Ctrl/middle-click and `target="_blank"` across about 20 files. Use Next 16 `Link onNavigate` plus `useLinkStatus`. (`progress-link.tsx:50`) ✅
- **Radix overlay animations are dead.** The `animate-in`/`fade`/`zoom` classes are used in 10 files, but `tw-animate-css` is never imported. Reduced motion is also honoured in only 4 places.
- **Landmarks are wrong.** The `<main>` contains the header, 7 pages nest a second `<main>`, the sidebar is not a `<nav>`, there's no `aria-current`, and there's no skip link. About 20 routes have no `title`.
- **Form errors aren't announced.** Required fields are marked only with "*", and 7 Enter-to-submit handlers ignore `isComposing`, which breaks CJK input methods.
- **The assistant widget**, a hand-built non-modal dialog, has no Esc, drops focus on open and close, doesn't announce streamed replies (no `aria-live`), and leaves focus on `<body>` when Stop disappears.
- **The `Progress` wrapper never passes `value`**, so every bar is announced as indeterminate. The rc-slider has no name. Pressed, selected and expanded states are shown only visually.
- **Security:** missing nosniff, Referrer-Policy, Permissions-Policy, COOP and CORP headers; `/api/chat` and `/api/assistant/consent` have no Origin or Sec-Fetch check; `confirm-account` is an open redirect for phishing.
- **Performance:** markdown is re-parsed for every message on each streaming tick, and the widget drag writes `localStorage` on every pointer move. Review-view tracking sends one mutation per card. The feed has no `content-visibility`. The timetable makes 3+ sequential client round-trips.
- **Focus rings are about 2.3:1** (the `.focus-ring` utility is 1.37:1), input borders are 1.1–1.5:1, and there's no `prefers-contrast` support.
- **Dark mode** has no `<meta name="color-scheme">`. It relies on JS setting the color scheme.
- **Google Calendar sync** builds its own timeout, so leaving the page mid-sync shows a false "timed out" toast. Use `AbortSignal.any` with `AbortSignal.timeout`.
- **Sortable tables:** the MCP history table sorts on a click on `<th>` only. `BidTable` sorts sections G1, G10, G2 (use `Intl.Collator` with `numeric`).
- **No `scroll-padding`** under the sticky header and above the fixed bottom bars. The theme toggle can't get back to "System". Toasts fire while a modal is open.

## Priority 3: modernization and polish

Native primitives could replace dependencies: `<progress>`/`<meter>` instead of `@radix-ui/react-progress`,
`<input type="range">` instead of `rc-slider`, `<details name>` for course-search results, and
`popover="hint"` with anchor positioning for the heatmap card. Also: `text-wrap: balance/pretty` on
headings; logical properties (about 300 physical versus 3 logical); `dvh` instead of `100vh`; container
queries in the resizable assistant panel; `toSorted`/`findLast`/`Object.groupBy` (raise tsconfig `lib` to
ES2024); a web app manifest; Trusted Types in report-only mode; `__Host-` cookie prefix; Sentry `beforeSend`
scrubbing of share and iCal tokens; and WebMCP page tools as an opportunity for agent access.

## Done well

Reviewers in every area pointed to solid foundations:
- **Rendering and loading:** system fonts only; recharts, @xyflow and driver.js loaded on demand; `next/image` with AVIF/WebP; server prefetch with Suspense on review pages.
- **Security:** a strict link allowlist and no raw HTML in assistant markdown; consent API protected by an Origin check plus a CSRF token; tokens kept in the encrypted httpOnly session cookie; Replay masks all text.
- **Accessibility:** correct `aria-sort` in `BidTable`/`BidsTable`; native `<details>` disclosures; touch-aware hover actions in the assistant session list.

## Suggested order of work

1. Add a security header baseline via `src/proxy.ts` (CSP report-only, `frame-ancestors 'none'`, nosniff, Referrer-Policy) and fix items 3–5.
2. Fix the one-line bugs: "/" shortcut (6), `ProgressLink` modifier clicks, `*` font-size rule (14), `outline-none` → `outline-hidden` (15), import `tw-animate-css`.
3. Accessibility pass on the review flow (7–10), the reaction picker and the tooltip-only information.
4. Keyboard alternatives for roadmap and meetings, plus the timezone tests (11–13).
5. Performance: lazy-load the assistant and Replay (18–19), then the Priority 2 items.
6. Write a browser-support policy into `CLAUDE.md`/`AGENTS.md` (for example "Baseline Widely available; Newly
   available only with feature detection") so future fallback decisions are explicit.
