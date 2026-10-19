# G1 direct-file browser evidence — reader report complete

Session 15 prepared this procedure; Session 16 received four reader screenshots
of the legacy output opened from `D:/code/MapBard/out/index.html` in a browser.
They are **partial direct-file visual evidence, not a passing report**. The reader
reached the intro, both scenes and outro by dragging the page scrollbar, and
reported that the mouse wheel over the map zoomed it instead of advancing the
story. The screenshots show a neutral background, point layers, the first scene's
blue panel image, and the second scene's slider. The blue panel matches the
checked-in placeholder image; it is not evidence of an image-load failure. The
browser/version, Console and Network records, wheel behavior after repair, spike,
offline run, relocation and full hashes remain unreported. G1 stays open.

Session 17 received two further direct-file screenshots after the text and wheel
repair. The intro and first-scene text are readable, but the map is still a flat
neutral field with isolated points. This confirms that the authored PMTiles
request was not being rendered; it does not establish whether wheel scrolling
now works. The candidate bundle was then regenerated with an **explicit local
San Francisco context map** from pinned city shoreline and street geometry.
The reader then hard-refreshed the direct-file page and confirmed that pale land,
blue-green water, street lines and the city attribution are visible. This is a
bounded visual confirmation of the local context map; no screenshot, browser
version, Console/Network, offline or relocation record accompanied it.

The legacy player now disables map wheel zoom and uses legible dark text/panels;
`out/` was regenerated. The change passed local build/tests/lint/syntax and a Node
mock probe; the reader's post-fix visual confirmation covers map context only.
Sessions 13–14 recorded a browser URL-policy rejection of the local file. A later localhost attempt also returned
`net::ERR_BLOCKED_BY_CLIENT`; it did not supply browser evidence.

Session 18 prepared the current candidate again: five packages built, 55 tests and
lint passed, the G1 fixture verifier passed, and the spike's Node VM check passed.
The six review-file hashes below were recorded. A copy of the full generated
`out/` tree in a fresh temporary directory outside the checkout had 14 files;
all 14 SHA-256 hashes matched the originals. This proves byte preservation during
copy, **not** relocated browser playback or offline operation. Browser automation
could not supply the missing observations: its inventory failed, Chrome was
unavailable, Edge failed to connect, and the in-app browser explicitly rejected
the `file:` URL under its browser security policy. No alternate browser route was
used after that rejection.

Session 19 received the reader's direct-file report for Windows, Edge
`155.0.4283.45` and Chrome `155.0.8059.80` (exact review time was not supplied).
The reader reported that the legacy story interactions work, with the popup
opening after a manual marker click; this matches the authored `marker` trigger.
The spike page displayed its disposable-probe message and
`typeof window.MapBardSpike?.createPlayer` returned `"function"`. The reader
reported no Console errors and no failed or remote Network requests after reload.
They confirmed that networking and cache were disabled while reloading both the
original and relocated story and spike files, and that all four behaved the same.
This is a reader report, not an automated browser assertion or a compiled-player
test. No screenshots or exported DevTools logs accompanied it.

Current generated SHA-256 values are
`index.html` `39DD4FB250A4DFB43AD9810CDBF96A21BB3C7B07606B8D6160C6EC95AA6114E0`,
`app.js` `9C8A5D7C30E4B947ED247868760CCA1F8B1A02F105BD9906BDA445C7957371DD`,
`style.css` `D6A4B5E5022103C28081884E84FBA2AD258B8E653003BACF907E0CFFCBB1E315`,
`bundle-data.js` `2D1B6B875EF2BE86EC2C3B9A72F799508FAC7B9BA4A606E9A7DAC602FA30EC76`,
`runtime-spike/index.html` `74191B7E40748F3358756CE3229F5437B72E144AA34BE923189D571180C7A57A`,
and `runtime-spike/player.js` `902F22A35542F8A810421A2B6AB2823C053A1A5020A71F68D087FF0EF86651D4`.
The reviewer should confirm that the files opened in the browser have these
hashes, or report any changed bytes.

## Prepare the exact files

From the repository root in PowerShell, using the existing dependency tree:

```powershell
corepack pnpm -r build
node packages/renderer/scripts/render-example.mjs
node docs/stage-1/runtime-spike/build.mjs
Copy-Item -LiteralPath docs/stage-1/runtime-spike/index.html -Destination out/runtime-spike/index.html
node docs/stage-1/runtime-spike/verify.mjs
Get-FileHash -Algorithm SHA256 -LiteralPath out/index.html,out/app.js,out/style.css,out/bundle-data.js,out/runtime-spike/index.html,out/runtime-spike/player.js
```

Stop if a command fails. Capture the hashes with the report; rebuilding after
review requires checking whether the reviewed bytes changed. Successful commands
and the VM probe are not browser evidence. Do not change browser security flags.

## Review in a normal browser

1. Record browser/version, OS, reviewer and time. Open `out/index.html` directly
   using the browser's Open File action. Confirm the address starts with `file:`.
   Record the Console and Network observations after a reload. Local vendored
   MapLibre/scrollama, styles, data and images should load; record every failed or
   remote request rather than suppressing it.
2. Use the mouse wheel while the pointer is over the map, then scroll overview →
   Ferry Building → overview. Record whether the document advances rather than
   the map zooming. Confirm local land/water shapes, streets and the visible
   City and County of San Francisco attribution. Record camera changes, point
   layers, panel images, anchored media/popup and the size slider. The local
   context is a bounded example substitution: PMTiles and quantile classes are
   still not implemented, and the radius control conflicts with data encoding.
   This is not a faithful Stage 1 compiled-player acceptance test.
3. Open `out/runtime-spike/index.html` directly. In the Console evaluate
   `typeof window.MapBardSpike?.createPlayer`; record whether it returns
   `"function"`, plus any errors and requests. The spike has no visible map and
   does not establish MapLibre or interaction correctness; its scene-isolation
   assertions remain separate Node VM evidence.
4. Disable networking for the test and reload both files, with cache disabled.
   Record whether the map, images and spike initialization still work and whether
   any attempted network dependency appears. Restore the prior network setting
   after the check. Do not count a successful online/cached page as an offline pass.
5. Copy the generated `out` directory to a fresh temporary directory outside the
   checkout, open both copied HTML files with `file:` and repeat the offline checks.
   Record the relocated file hashes and observed outcomes. Report failure as
   failure; do not silently switch to a development server.

## Evidence to return

| Field                                                       | Result                                                                                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Reviewer / time / browser version / OS                      | Reader; 2026-10-19, exact time not supplied; Windows; Edge `155.0.4283.45` and Chrome `155.0.8059.80`                        |
| Original file hashes and `file:` location                   | Six hashes recorded above; reader tested the direct-file original candidate                                                  |
| Legacy local requests and console                           | Reader reports no Console errors and no failed or remote Network requests after reload                                       |
| Legacy scroll/camera/layer/image/popup/control observations | Reader reports interactions work; popup requires marker click as authored; local context was confirmed earlier               |
| Spike global initialization / requests / console            | Probe message displayed; global type returned `"function"`; no errors or failed/remote requests reported                     |
| Offline mechanism, cache state and results                  | Reader confirms networking and cache disabled for reloads of both pages; behavior matched online checks                      |
| Relocated hashes and offline results                        | All 14 copied file hashes match; reader confirms both relocated pages behaved the same offline                               |
| Failures, baseline limitations, screenshot/log references   | No failure reported; no screenshot or exported log supplied; PMTiles, quantile and compiled player remain outside this check |
| Coordinator disposition and remaining work                  | G1 review accepts the report for runtime build selection; later gates still require production playback checks               |

The G1 coordinator accepts this report for the bounded direct-file gate and
records the runtime build choice in [the review](g1-review.md). It does not
certify the Stage 1 compiled player or the full capability matrix. G2–G4 still
require their own production and real-story checks. Stage 2 remains unstarted.
