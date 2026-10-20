# S1-W4-C — compiled browser and accessibility review

Session 32, 2026-10-20. **The original candidate failed browser acceptance; a
corrected page passed reader retest in Session 34.** A reader opened the
direct-file Potomac page and supplied a screenshot and brief interaction report.
The report exposes a wheel-navigation defect and an unacceptable blank geographic
background. Other checks remain unreported. This is a defect handoff to G4, not a
passing direct-file report.

## Candidate and preparation

- The public-package real example built at `out/w4c-session32/` with no
  diagnostics or required network URLs. `verification.json` lists eight published
  files; the directory also contains `verification.json` and
  `verification-environment.json`.
- The page is `out/w4c-session32/index.html`, SHA-256
  `76b7386c62e07943056abf9babe09874601423e11b2011e9bdb9d8bf3e688532`.
  The built player hash is recorded in `verification.json` as
  `218895a79d77ff4f80d12716b8dcda73a22a936177bbe7cb33841323957f528d`.
- A copy of the complete ten-file output at
  `%TEMP%/MapBard-w4c-session32-20261020/` has the same relative paths and
  SHA-256 hashes as the original. This proves copy integrity only.
- The authored Potomac story has three scenes, one local context photograph,
  five feature-bound annotations and a shared equal-interval color scale. It has
  no authored controls, videos, posters or media popups. Those capabilities need
  a separate compiled specimen for browser coverage.

## Browser access and results

| Check                                                         | Status       | Evidence or gap                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser, version, OS and `file:` address                      | Partial      | Reader's Windows screenshot shows the local `D:/code/MapBard/out/w4c-session32/index.html` file in a Chromium browser. Browser product/version and review time were not supplied.                                                                                                        |
| First scene, comparison, limits and revisits                  | Partial/fail | Screenshots show the intro, comparison and limits scenes with their prose and point markers. Reader says other interactions worked, but wheel input over the map zooms it instead of scrolling the page. Revisit behavior was not documented.                                            |
| Map points, same scale, legends and annotations               | Partial/fail | All three screenshots show points and a legend on a plain neutral background; no geographic context is visible. Legend labels expose long raw decimal interval bounds. The comparison and limits pages retain the legend; exact scale continuity and popup behavior were not documented. |
| Photograph, alt text, caption and credit                      | Partial/fail | Screenshot shows the local photograph, but its caption, credit and qualification are cramped into narrow adjacent columns. Alt text and screen-reader output were not observed.                                                                                                          |
| Console and failed or remote Network requests                 | Blocked      | Build declares no required network URLs; no DevTools observation.                                                                                                                                                                                                                        |
| Keyboard, focus, narrow viewport, contrast and reduced motion | Blocked      | Source inspection below is not an accessibility pass.                                                                                                                                                                                                                                    |
| Network-disabled reload with cache disabled                   | Blocked      | No offline browser observation.                                                                                                                                                                                                                                                          |
| Relocated `file:` page                                        | Blocked      | Copy hashes match; relocated playback was not observed.                                                                                                                                                                                                                                  |
| Localhost                                                     | Skipped      | HTTP would not establish the required direct-file result.                                                                                                                                                                                                                                |

The browser-use inventory returned no browsers and a connection error. A Windows
computer-use attempt stopped because it could not determine the current Edge URL
with sufficient confidence. A direct browser-use request to open this local
`file:` page was then denied by its URL policy, which explicitly forbade an
alternate browser route for the same action. The reader's own direct-file report
supplied the browser evidence above. No browser automation, security setting
change or indirect route was attempted after the denial.

The neutral background was the authored Stage 1 configuration, not a failed
asset request. The reader rejected it as insufficient geographic context. G4
must resolve that product issue explicitly rather than report the neutral map as
an accepted basemap. The wheel behavior is a playback defect; the long legend
labels and cramped media caption are visible presentation defects.

## Static accessibility review

The generated HTML has a document title, language, heading hierarchy, scene
headings, main region, source list and a labeled map host. The image markup uses
its caption/name for `alt` and includes the credit and qualification. Player
source creates button markers with accessible labels, a labeled native range or
checkbox for each compiled control, and visible focus outlines for markers,
controls and popup close buttons. CSS has a `max-width: 640px` layout and removes
card transitions under `prefers-reduced-motion`; the player changes scene
cameras with a cut when reduced motion is requested.

These are source-level findings. The map itself is not proven usable through a
screen reader. Reading order, focus behavior after scene changes, visual overlap,
actual contrast, zoom, touch, wheel scrolling and reduced-motion playback still
need observation. The fixed map and multiple overlay hosts make the narrow-screen
check especially important.

## Session 32 direct-file review request

Use a normal browser's Open File action on `out/w4c-session32/index.html` and
record browser/version, OS, time and the `file:` address. Reload with DevTools
Console and Network visible. Scroll through context → comparison → limits and
back; check that points, camera, same legend scale, all annotations, photograph,
caption, credit and source qualifications appear without playback errors. Use Tab,
Enter and Escape on the map annotations and check focus visibility. Repeat at a
narrow viewport and with reduced motion enabled. Disable networking and cache,
reload, and record any failed or remote requests. Open the copied page from its
temporary directory with networking and cache still disabled, then compare
behavior and file hashes.

The separate G3 compiled specimen at `out/g3-example/index.html` should also be
reviewed for its presentation control; the Potomac example cannot establish that
capability. Neither page covers video posters or anchored media in a browser.
Record any failure as a defect for the owning player or publication session. G4
may close only after actual browser evidence and any needed correction/retest.

## Session 34 corrected-page reader retest

The corrected example is `out/w4c-session33-review/index.html`. It includes
local Census state outlines and Maryland iMAP Potomac River segments below the
gauge points, integer-readable legend labels, a stacked photograph caption and
credit, and a compiled bootstrap that disables map wheel zoom. A fresh build
produced eight publication files with no diagnostics or required network URLs;
two fresh builds had identical `verification.json` bytes. Those are build checks,
separate from the following browser report.

The reader opened the corrected direct-file page, hard-refreshed it, and reported
that wheel input over the map advances the story and that the outlines and river
line provide enough geographic context. In response to the remaining G4 request,
the reader reported **Edge 155.0.4283.45**, no errors, and that the Console/Network,
network-disabled cache-disabled reload, relocated offline copy, Tab annotation,
narrow-window and reduced-motion checks all worked well. This is a reader report;
no automated browser observation or DevTools export was available. Exact OS build,
viewport dimensions, review timestamp and individual annotation steps were not
provided. The real Potomac page has no presentation control, poster or anchored
media, so the report does not certify those capabilities.

A separate synthetic control page was built at `out/g4-control-review/index.html`
with the published Opacity slider and no required network URLs or diagnostics.
The reader reported that, offline in Edge, keyboard arrows changed the slider
and points, scrolling away and back reset the control, and the Console showed no
errors. This is a bounded browser pass for the presentation control. The
[G4 review](g4-review.md) combines the checks and records remaining limits.
