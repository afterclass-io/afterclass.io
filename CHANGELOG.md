<a id="v1.3.0"></a>
# [v1.3.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v1.3.0) - 2025-01-06

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* chore: use shadcn components for Form Label and Input by [@davidlhw](https://github.com/davidlhw) in [#357](https://github.com/afterclass-io/afterclass.io/pull/357)
* feat(ui): sidebar rework to use shadcn components by [@davidlhw](https://github.com/davidlhw) in [#358](https://github.com/afterclass-io/afterclass.io/pull/358)
* feat(ui): dev-only themes preview page by [@davidlhw](https://github.com/davidlhw) in [#365](https://github.com/afterclass-io/afterclass.io/pull/365)
* feat(ui): global progress bar to show routing progress by [@davidlhw](https://github.com/davidlhw) in [#369](https://github.com/afterclass-io/afterclass.io/pull/369)
### 👾 Bug Fixes
* fix: forgot password form redirects twice if user is v1 by [@davidlhw](https://github.com/davidlhw) in [#359](https://github.com/afterclass-io/afterclass.io/pull/359)
* fix: next dev slow compilation - split tailwindcss process by [@davidlhw](https://github.com/davidlhw) in [#363](https://github.com/afterclass-io/afterclass.io/pull/363)
* fix: submit review scroll issue - use native a element instead of Link component by [@davidlhw](https://github.com/davidlhw) in [#362](https://github.com/afterclass-io/afterclass.io/pull/362)
### 🆙 Performance Improvements
* perf: use indexes suggested by supabase performance advisor by [@davidlhw](https://github.com/davidlhw) in [#364](https://github.com/afterclass-io/afterclass.io/pull/364)
### Other Changes
* chore: remove unused suspense by [@davidlhw](https://github.com/davidlhw) in [#352](https://github.com/afterclass-io/afterclass.io/pull/352)
* fix: prof and course review section inaccurate metadata by [@davidlhw](https://github.com/davidlhw) in [#350](https://github.com/afterclass-io/afterclass.io/pull/350)
* chore: update deps and upstream components from t3app by [@davidlhw](https://github.com/davidlhw) in [#355](https://github.com/afterclass-io/afterclass.io/pull/355)
* fix: aborterror fetch is aborted by [@davidlhw](https://github.com/davidlhw) in [#360](https://github.com/afterclass-io/afterclass.io/pull/360)
* chore: see more only for review item on home by [@davidlhw](https://github.com/davidlhw) in [#370](https://github.com/afterclass-io/afterclass.io/pull/370)
* feat(ui): show more details on review items by [@davidlhw](https://github.com/davidlhw) in [#371](https://github.com/afterclass-io/afterclass.io/pull/371)
* fix: progresslink component fails to push routes if href is urlobject by [@davidlhw](https://github.com/davidlhw) in [#373](https://github.com/afterclass-io/afterclass.io/pull/373)
* fix: tag component not able to be active if not clickable by [@davidlhw](https://github.com/davidlhw) in [#372](https://github.com/afterclass-io/afterclass.io/pull/372)
* feat(ui): alertdialog shadcn component by [@davidlhw](https://github.com/davidlhw) in [#374](https://github.com/afterclass-io/afterclass.io/pull/374)
* feat(ui): toast sonnor component by [@davidlhw](https://github.com/davidlhw) in [#375](https://github.com/afterclass-io/afterclass.io/pull/375)
* feat(ui): themes respect user prefers-color-scheme config by [@davidlhw](https://github.com/davidlhw) in [#377](https://github.com/afterclass-io/afterclass.io/pull/377)
* feat(ui): avatar shadcn component by [@davidlhw](https://github.com/davidlhw) in [#378](https://github.com/afterclass-io/afterclass.io/pull/378)


**Full Changelog**: https://github.com/afterclass-io/afterclass.io/compare/v1.2.0...v1.3.0

[Changes][v1.3.0]


<a id="v1.2.0"></a>
# [v1.2.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v1.2.0) - 2024-12-14

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat: setup sentry with custom sentry breadcrumbs by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#326](https://github.com/AfterClass-io/afterclass.io-v2/pull/326)
* feat(ui): dynamic ogimage metadata for prof and course pages by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#346](https://github.com/AfterClass-io/afterclass.io-v2/pull/346)
### Other Changes
* chore(tests): introduce cypress e2e testing by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#322](https://github.com/AfterClass-io/afterclass.io-v2/pull/322)
* refactor: clean up modules and rearrange components by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#323](https://github.com/AfterClass-io/afterclass.io-v2/pull/323)
* chore(auth): upgrade nextauth to use authjs v5 by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#327](https://github.com/AfterClass-io/afterclass.io-v2/pull/327)
* feat(auth): redirect to acct creation on v1 acct pwd reset by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#329](https://github.com/AfterClass-io/afterclass.io-v2/pull/329)
* fix: multizonal hosting of umami public share url by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#336](https://github.com/AfterClass-io/afterclass.io-v2/pull/336)
* feat: feature flagging with vercel edge config by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#338](https://github.com/AfterClass-io/afterclass.io-v2/pull/338)
* chore: prisma github action to deploy migrations to stg and prd by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#342](https://github.com/AfterClass-io/afterclass.io-v2/pull/342)
* feat: use umami identify feature by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#343](https://github.com/AfterClass-io/afterclass.io-v2/pull/343)
* feat: local config fallback for invalid edge config by [@jeromeandrewong](https://github.com/jeromeandrewong) in [AfterClass-io/afterclass.io-v2#345](https://github.com/AfterClass-io/afterclass.io-v2/pull/345)


**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v1.1.0...v1.2.0

[Changes][v1.2.0]


<a id="v1.1.0"></a>
# [v1.1.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v1.1.0) - 2024-10-22

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* perf: optimize load time with proper suspense and compact queries by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#316](https://github.com/AfterClass-io/afterclass.io-v2/pull/316)
* feat: password reset flow by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#317](https://github.com/AfterClass-io/afterclass.io-v2/pull/317)


**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v1.0.0...v1.1.0

[Changes][v1.1.0]


<a id="v1.0.0"></a>
# [v1.0.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v1.0.0) - 2024-09-22

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat: implement like button functionality on review item by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#242](https://github.com/AfterClass-io/afterclass.io-v2/pull/242)
* feat(ui): implement infinite scrolling by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#243](https://github.com/AfterClass-io/afterclass.io-v2/pull/243)
### Other Changes
* chore: add renovate config by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#245](https://github.com/AfterClass-io/afterclass.io-v2/pull/245)
* chore(deps): use bun pkgmr and pin dependencies by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#284](https://github.com/AfterClass-io/afterclass.io-v2/pull/284)

## New Contributors
* [@renovate](https://github.com/renovate) made their first contribution in [AfterClass-io/afterclass.io-v2#247](https://github.com/AfterClass-io/afterclass.io-v2/pull/247)

**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.8.0...v1.0.0

[Changes][v1.0.0]


<a id="v0.8.0"></a>
# [v0.8.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.8.0) - 2024-09-15

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat(ui): implement noticecard component on coming soon and error pages by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#236](https://github.com/AfterClass-io/afterclass.io-v2/pull/236)
* feat(ui): disallow mobile to zoom on form input by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#238](https://github.com/AfterClass-io/afterclass.io-v2/pull/238)
* feat(ui): show no result if reviews or rating is empty by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#237](https://github.com/AfterClass-io/afterclass.io-v2/pull/237)
* feat(ui): review form improvements by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#241](https://github.com/AfterClass-io/afterclass.io-v2/pull/241)


**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.7.0...v0.8.0

[Changes][v0.8.0]


<a id="v0.7.0"></a>
# [v0.7.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.7.0) - 2024-09-01

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat: mobile view for rating section by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#227](https://github.com/AfterClass-io/afterclass.io-v2/pull/227)
* feat: enable feature flag on announcement banner by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#225](https://github.com/AfterClass-io/afterclass.io-v2/pull/225)
* chore: update book and clipboard icons by [@AlvinLingg](https://github.com/AlvinLingg) in [AfterClass-io/afterclass.io-v2#229](https://github.com/AfterClass-io/afterclass.io-v2/pull/229)
* feat(ui): filter section responsive mobile viewport by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#228](https://github.com/AfterClass-io/afterclass.io-v2/pull/228)
* feat: add AC telegram channel and helpdesk links by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#231](https://github.com/AfterClass-io/afterclass.io-v2/pull/231)
* feat: mobile view for review submission by [@AlvinLingg](https://github.com/AlvinLingg) in [AfterClass-io/afterclass.io-v2#232](https://github.com/AfterClass-io/afterclass.io-v2/pull/232)
* feat: mobile add review submission and contribute buttons to the sidebar drawer by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#234](https://github.com/AfterClass-io/afterclass.io-v2/pull/234)
* feat(ui): more reviews can be loaded with a see more button by [@Jansen52x](https://github.com/Jansen52x) in [AfterClass-io/afterclass.io-v2#194](https://github.com/AfterClass-io/afterclass.io-v2/pull/194)
### 👾 Bug Fixes
* fix: review submission form removes review section completely if skipped by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#221](https://github.com/AfterClass-io/afterclass.io-v2/pull/221)
* fix: mobile view login button by [@AlvinLingg](https://github.com/AlvinLingg) in [AfterClass-io/afterclass.io-v2#230](https://github.com/AfterClass-io/afterclass.io-v2/pull/230)
### Other Changes
* chore: allow passing icons as props to ctacard by [@AlvinLingg](https://github.com/AlvinLingg) in [AfterClass-io/afterclass.io-v2#224](https://github.com/AfterClass-io/afterclass.io-v2/pull/224)
* fix: removed the Tag and SchoolIcon to become SchoolTag by [@AlvinLingg](https://github.com/AlvinLingg) in [AfterClass-io/afterclass.io-v2#233](https://github.com/AfterClass-io/afterclass.io-v2/pull/233)

## New Contributors
* [@AlvinLingg](https://github.com/AlvinLingg) made their first contribution in [AfterClass-io/afterclass.io-v2#224](https://github.com/AfterClass-io/afterclass.io-v2/pull/224)

**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.6.0...v0.7.0

[Changes][v0.7.0]


<a id="v0.6.0"></a>
# [v0.6.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.6.0) - 2024-08-18

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat(ui): tooltip component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#208](https://github.com/AfterClass-io/afterclass.io-v2/pull/208)
* feat(ui): mobile view for auth flows by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#212](https://github.com/AfterClass-io/afterclass.io-v2/pull/212)
* feat(ui): review item responsive mobile viewport  by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#210](https://github.com/AfterClass-io/afterclass.io-v2/pull/210)
### 👾 Bug Fixes
* fix: course specific review not showing if where in clause is empty array by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#215](https://github.com/AfterClass-io/afterclass.io-v2/pull/215)
* fix(ui): review label tag on review form not reactive to clicks by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#214](https://github.com/AfterClass-io/afterclass.io-v2/pull/214)
* fix(ui): mobile view not scrollable by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#216](https://github.com/AfterClass-io/afterclass.io-v2/pull/216)


**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.5.0...v0.6.0

[Changes][v0.6.0]


<a id="v0.5.0"></a>
# [v0.5.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.5.0) - 2024-08-06

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat(ui): review modal responsive mobile viewport by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#209](https://github.com/AfterClass-io/afterclass.io-v2/pull/209)
### 👾 Bug Fixes
* fix: review item not wrapping text on long word causing container to grow by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#195](https://github.com/AfterClass-io/afterclass.io-v2/pull/195)
* fix: add whitespace pre wrap for modal body by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#211](https://github.com/AfterClass-io/afterclass.io-v2/pull/211)
### Other Changes
* fix: coming soon page by [@whoisdavidd](https://github.com/whoisdavidd) in [AfterClass-io/afterclass.io-v2#197](https://github.com/AfterClass-io/afterclass.io-v2/pull/197)


**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.4.0...v0.5.0

[Changes][v0.5.0]


<a id="v0.4.0"></a>
# [v0.4.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.4.0) - 2024-07-22

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat(ui): see more button links to respective page on review modal by [@minthukha12](https://github.com/minthukha12) in [AfterClass-io/afterclass.io-v2#190](https://github.com/AfterClass-io/afterclass.io-v2/pull/190)
### 👾 Bug Fixes
* fix: inaccurate review statistics on filter by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#191](https://github.com/AfterClass-io/afterclass.io-v2/pull/191)
* fix: prevent review modal close button autofocus by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#196](https://github.com/AfterClass-io/afterclass.io-v2/pull/196)
* fix: prof filter on course page not correctly filtering reviews by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#193](https://github.com/AfterClass-io/afterclass.io-v2/pull/193)
### Other Changes
* chore: hide search result item statistics on unauthenticated client by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#192](https://github.com/AfterClass-io/afterclass.io-v2/pull/192)


**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.3.0...v0.4.0

[Changes][v0.4.0]


<a id="v0.3.0"></a>
# [v0.3.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.3.0) - 2024-07-07

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat(ui): coming soon page by [@whoisdavidd](https://github.com/whoisdavidd) in [AfterClass-io/afterclass.io-v2#183](https://github.com/AfterClass-io/afterclass.io-v2/pull/183)
* feat(ui): implement breadcrumbs on navigation header by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#184](https://github.com/AfterClass-io/afterclass.io-v2/pull/184)
### Other Changes
* feat: search result includes review statistics by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#185](https://github.com/AfterClass-io/afterclass.io-v2/pull/185)

## New Contributors
* [@whoisdavidd](https://github.com/whoisdavidd) made their first contribution in [AfterClass-io/afterclass.io-v2#183](https://github.com/AfterClass-io/afterclass.io-v2/pull/183)

**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.2.0...v0.3.0

[Changes][v0.3.0]


<a id="v0.2.0"></a>
# [v0.2.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.2.0) - 2024-06-23

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 🚀 Features
* feat: posthog analytics by [@onebignick](https://github.com/onebignick) in [AfterClass-io/afterclass.io-v2#143](https://github.com/AfterClass-io/afterclass.io-v2/pull/143)
* feat: search api integration with postgres fulltext search by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#161](https://github.com/AfterClass-io/afterclass.io-v2/pull/161)
* feat(ui): add login button to header by [@minthukha12](https://github.com/minthukha12) in [AfterClass-io/afterclass.io-v2#176](https://github.com/AfterClass-io/afterclass.io-v2/pull/176)
* feat(ui): removed unused items from sidebar by [@ananyabhat29](https://github.com/ananyabhat29) in [AfterClass-io/afterclass.io-v2#173](https://github.com/AfterClass-io/afterclass.io-v2/pull/173)
* feat(ui): add user profile component on school layout by [@haithisisme](https://github.com/haithisisme) in [AfterClass-io/afterclass.io-v2#175](https://github.com/AfterClass-io/afterclass.io-v2/pull/175)
* feat: expose user fields to session object by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#178](https://github.com/AfterClass-io/afterclass.io-v2/pull/178)

### Other Changes
* chore: generate initial migrations by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#170](https://github.com/AfterClass-io/afterclass.io-v2/pull/170)
* refactor(ui): format review details data by [@Jansen52x](https://github.com/Jansen52x) in [AfterClass-io/afterclass.io-v2#174](https://github.com/AfterClass-io/afterclass.io-v2/pull/174)
* refactor(ui): hide see more reviews outside of home page by [@gnzat](https://github.com/gnzat) in [AfterClass-io/afterclass.io-v2#177](https://github.com/AfterClass-io/afterclass.io-v2/pull/177)

## New Contributors
* [@onebignick](https://github.com/onebignick) made their first contribution in [AfterClass-io/afterclass.io-v2#143](https://github.com/AfterClass-io/afterclass.io-v2/pull/143)
* [@Jansen52x](https://github.com/Jansen52x) made their first contribution in [AfterClass-io/afterclass.io-v2#174](https://github.com/AfterClass-io/afterclass.io-v2/pull/174)
* [@minthukha12](https://github.com/minthukha12) made their first contribution in [AfterClass-io/afterclass.io-v2#176](https://github.com/AfterClass-io/afterclass.io-v2/pull/176)
* [@ananyabhat29](https://github.com/ananyabhat29) made their first contribution in [AfterClass-io/afterclass.io-v2#173](https://github.com/AfterClass-io/afterclass.io-v2/pull/173)
* [@haithisisme](https://github.com/haithisisme) made their first contribution in [AfterClass-io/afterclass.io-v2#175](https://github.com/AfterClass-io/afterclass.io-v2/pull/175)
* [@gnzat](https://github.com/gnzat) made their first contribution in [AfterClass-io/afterclass.io-v2#177](https://github.com/AfterClass-io/afterclass.io-v2/pull/177)

**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/compare/v0.1.0...v0.2.0

[Changes][v0.2.0]


<a id="v0.1.0"></a>
# [v0.1.0](https://github.com/afterclass-io/afterclass.io/releases/tag/v0.1.0) - 2024-06-10

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### 💥 Breaking Changes
* fix: unintentional disabling of `Command` after upgrading cmdk to v1.x by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#96](https://github.com/AfterClass-io/afterclass.io-v2/pull/96)
* fix: remove resend button by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#138](https://github.com/AfterClass-io/afterclass.io-v2/pull/138)
### 🚀 Features
* feat: theming system by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#3](https://github.com/AfterClass-io/afterclass.io-v2/pull/3)
* feat: NextAuth Supabase login by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#4](https://github.com/AfterClass-io/afterclass.io-v2/pull/4)
* feat: login layout by [@jeromeandrewong](https://github.com/jeromeandrewong) in [AfterClass-io/afterclass.io-v2#10](https://github.com/AfterClass-io/afterclass.io-v2/pull/10)
* feat: add custom icon boilerplate; add iconify library by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#15](https://github.com/AfterClass-io/afterclass.io-v2/pull/15)
* feat: input component by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#19](https://github.com/AfterClass-io/afterclass.io-v2/pull/19)
* feat: layout sidebar by [@jeromeandrewong](https://github.com/jeromeandrewong) in [AfterClass-io/afterclass.io-v2#18](https://github.com/AfterClass-io/afterclass.io-v2/pull/18)
* feat(auth): password reset flow by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#22](https://github.com/AfterClass-io/afterclass.io-v2/pull/22)
* feat(UI): form component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#27](https://github.com/AfterClass-io/afterclass.io-v2/pull/27)
* feat: button component by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#29](https://github.com/AfterClass-io/afterclass.io-v2/pull/29)
* feat(auth): login flow by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#37](https://github.com/AfterClass-io/afterclass.io-v2/pull/37)
* feat(auth): ui for signup and verify email otp by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#38](https://github.com/AfterClass-io/afterclass.io-v2/pull/38)
* feat(db): Prisma schema and example CRUD operations by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#39](https://github.com/AfterClass-io/afterclass.io-v2/pull/39)
* feat: button ghost, disabled and loading states by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#42](https://github.com/AfterClass-io/afterclass.io-v2/pull/42)
* feat(ui): checkbox component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#43](https://github.com/AfterClass-io/afterclass.io-v2/pull/43)
* feat(ui): popover component without style by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#47](https://github.com/AfterClass-io/afterclass.io-v2/pull/47)
* feat(ui): dialog component without style by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#48](https://github.com/AfterClass-io/afterclass.io-v2/pull/48)
* feat(ui): command component without style by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#54](https://github.com/AfterClass-io/afterclass.io-v2/pull/54)
* feat(ui): rating section component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#55](https://github.com/AfterClass-io/afterclass.io-v2/pull/55)
* feat(ui): combobox without style by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#46](https://github.com/AfterClass-io/afterclass.io-v2/pull/46)
* feat: desktop and mobile layout component by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#57](https://github.com/AfterClass-io/afterclass.io-v2/pull/57)
* style: modal component by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#59](https://github.com/AfterClass-io/afterclass.io-v2/pull/59)
* style: popover and command by [@Aztriltus](https://github.com/Aztriltus) in [AfterClass-io/afterclass.io-v2#62](https://github.com/AfterClass-io/afterclass.io-v2/pull/62)
* feat(ui): tag component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#63](https://github.com/AfterClass-io/afterclass.io-v2/pull/63)
* feat(ui): add avatar component by [@k3ithloh](https://github.com/k3ithloh) in [AfterClass-io/afterclass.io-v2#65](https://github.com/AfterClass-io/afterclass.io-v2/pull/65)
* feat(ui): review item component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#64](https://github.com/AfterClass-io/afterclass.io-v2/pull/64)
* feat(api): reviews trpc router by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#76](https://github.com/AfterClass-io/afterclass.io-v2/pull/76)
* feat(ui): breadcrumb component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#80](https://github.com/AfterClass-io/afterclass.io-v2/pull/80)
* feat(ui): ToggleGroup component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#81](https://github.com/AfterClass-io/afterclass.io-v2/pull/81)
* feat(ui): Textarea component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#82](https://github.com/AfterClass-io/afterclass.io-v2/pull/82)
* feat(ui): FilterToggleSection component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#92](https://github.com/AfterClass-io/afterclass.io-v2/pull/92)
* feat: validate school domain for user sign up by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#93](https://github.com/AfterClass-io/afterclass.io-v2/pull/93)
* feat(api): courses trpc router by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#77](https://github.com/AfterClass-io/afterclass.io-v2/pull/77)
* feat(ui): `SchoolTag` component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#100](https://github.com/AfterClass-io/afterclass.io-v2/pull/100)
* feat(ui): `RatingGroup` component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#99](https://github.com/AfterClass-io/afterclass.io-v2/pull/99)
* feat(ui): `PageTitle` component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#101](https://github.com/AfterClass-io/afterclass.io-v2/pull/101)
* feat(ui): ReviewSection component by [@jeromeandrewong](https://github.com/jeromeandrewong) in [AfterClass-io/afterclass.io-v2#104](https://github.com/AfterClass-io/afterclass.io-v2/pull/104)
* feat(ui): `TagGroup` component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#105](https://github.com/AfterClass-io/afterclass.io-v2/pull/105)
* feat: Email verification after sign up by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#103](https://github.com/AfterClass-io/afterclass.io-v2/pull/103)
* feat(ui): select component by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#110](https://github.com/AfterClass-io/afterclass.io-v2/pull/110)
* feat(ui): review home page integration by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#111](https://github.com/AfterClass-io/afterclass.io-v2/pull/111)
* feat: add course router query by prof slug by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#123](https://github.com/AfterClass-io/afterclass.io-v2/pull/123)
* feat: add review router query by prof slug by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#122](https://github.com/AfterClass-io/afterclass.io-v2/pull/122)
* feat(ui): loading skeleton ui by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#119](https://github.com/AfterClass-io/afterclass.io-v2/pull/119)
* feat: routers for professor and reviews by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#121](https://github.com/AfterClass-io/afterclass.io-v2/pull/121)
* feat(ui) professor page integration by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#126](https://github.com/AfterClass-io/afterclass.io-v2/pull/126)
* feat(auth): authenticate user with existing v1 credentials by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#128](https://github.com/AfterClass-io/afterclass.io-v2/pull/128)
* feat(ui): home page review section implementation by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#137](https://github.com/AfterClass-io/afterclass.io-v2/pull/137)
* feat(UI): Course Page Integration by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#133](https://github.com/AfterClass-io/afterclass.io-v2/pull/133)
* feat(UI): Course Page Info Card by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#146](https://github.com/AfterClass-io/afterclass.io-v2/pull/146)
* feat(UI): Course Page Detail Card by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#147](https://github.com/AfterClass-io/afterclass.io-v2/pull/147)
* feat: create user on first login if not exist  by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#136](https://github.com/AfterClass-io/afterclass.io-v2/pull/136)
* feat: review submission flow by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#108](https://github.com/AfterClass-io/afterclass.io-v2/pull/108)
* refactor(ui): make main content scrollable without scrolling header by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#150](https://github.com/AfterClass-io/afterclass.io-v2/pull/150)
* feat: add favicon and og image by [@jeromeandrewong](https://github.com/jeromeandrewong) in [AfterClass-io/afterclass.io-v2#155](https://github.com/AfterClass-io/afterclass.io-v2/pull/155)
* feat(ui): search ui flow by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#152](https://github.com/AfterClass-io/afterclass.io-v2/pull/152)
### 👾 Bug Fixes
* fix([#97](https://github.com/afterclass-io/afterclass.io/issues/97)): checkbox storybook not rendering correctly on local dev by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#98](https://github.com/AfterClass-io/afterclass.io-v2/pull/98)
* fix: svg tsx props by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#116](https://github.com/AfterClass-io/afterclass.io-v2/pull/116)
* fix: explicit redirect to login instead of root by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#132](https://github.com/AfterClass-io/afterclass.io-v2/pull/132)
* fix: close button autofocus instead of input on open modal by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#149](https://github.com/AfterClass-io/afterclass.io-v2/pull/149)
### Other Changes
* chore: migrate to app router with next@14 by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#30](https://github.com/AfterClass-io/afterclass.io-v2/pull/30)
* feat: introduce component storybooks  by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#73](https://github.com/AfterClass-io/afterclass.io-v2/pull/73)
* feat(devtool): local development environment with docker by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#75](https://github.com/AfterClass-io/afterclass.io-v2/pull/75)
* chore: prettier formatting & linting by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#107](https://github.com/AfterClass-io/afterclass.io-v2/pull/107)
* chore: remove dev-only components page by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#120](https://github.com/AfterClass-io/afterclass.io-v2/pull/120)
* fix: remove migration files by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#145](https://github.com/AfterClass-io/afterclass.io-v2/pull/145)
* refactor(ui): minor ui changes for command, modal and field components by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#151](https://github.com/AfterClass-io/afterclass.io-v2/pull/151)
* feat: automatically generate release notes with changelog by [@Jaylin0312](https://github.com/Jaylin0312) in [AfterClass-io/afterclass.io-v2#156](https://github.com/AfterClass-io/afterclass.io-v2/pull/156)
* docs: github community standard by [@davidlhw](https://github.com/davidlhw) in [AfterClass-io/afterclass.io-v2#154](https://github.com/AfterClass-io/afterclass.io-v2/pull/154)

## New Contributors
* [@Aztriltus](https://github.com/Aztriltus) made their first contribution in [AfterClass-io/afterclass.io-v2#3](https://github.com/AfterClass-io/afterclass.io-v2/pull/3)
* [@davidlhw](https://github.com/davidlhw) made their first contribution in [AfterClass-io/afterclass.io-v2#4](https://github.com/AfterClass-io/afterclass.io-v2/pull/4)
* [@jeromeandrewong](https://github.com/jeromeandrewong) made their first contribution in [AfterClass-io/afterclass.io-v2#10](https://github.com/AfterClass-io/afterclass.io-v2/pull/10)
* [@Jaylin0312](https://github.com/Jaylin0312) made their first contribution in [AfterClass-io/afterclass.io-v2#39](https://github.com/AfterClass-io/afterclass.io-v2/pull/39)
* [@k3ithloh](https://github.com/k3ithloh) made their first contribution in [AfterClass-io/afterclass.io-v2#65](https://github.com/AfterClass-io/afterclass.io-v2/pull/65)

**Full Changelog**: https://github.com/AfterClass-io/afterclass.io-v2/commits/v0.1.0

[Changes][v0.1.0]


[v1.3.0]: https://github.com/afterclass-io/afterclass.io/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/afterclass-io/afterclass.io/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/afterclass-io/afterclass.io/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.8.0...v1.0.0
[v0.8.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.7.0...v0.8.0
[v0.7.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.6.0...v0.7.0
[v0.6.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.5.0...v0.6.0
[v0.5.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.4.0...v0.5.0
[v0.4.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.3.0...v0.4.0
[v0.3.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/afterclass-io/afterclass.io/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/afterclass-io/afterclass.io/tree/v0.1.0

<!-- Generated by https://github.com/rhysd/changelog-from-release v3.8.1 -->
