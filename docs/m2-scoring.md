# M2 — Potomac scoring sheets

## V2 review — step 5.4 (prepared 2026-11-08)

The owner scores both variants against the same quality bar, with a V2
target of **≥ 80/100 each**. Scores below are deliberately pending. The V1
review and scores are preserved below as historical evidence.

Use the preview commands below after building. Review both desktop and
phone widths, scroll through each scene, and check reduced motion. Offline
goldens cannot establish terrain placement: inspect the online 2024 scene
at p = 0.5 and the 2025 scene at p = 1 as well.

| Area (points)                     | V2 review focus                                                               | Atlas       | Night       |
| --------------------------------- | ----------------------------------------------------------------------------- | ----------- | ----------- |
| Sense of place (15)               | Basemap, terrain contact at column bases, readable context                    | Pending     | Pending     |
| Encoding clarity and honesty (20) | Shared zero-based height scale; 2024 ghosts versus 2025 solids; change labels | Pending     | Pending     |
| Motion and camera (15)            | Downstream growth, shrinking columns, orbit and pull-back; reduced motion     | Pending     | Pending     |
| Attention and annotation (15)     | Column-top labels and legibility during flights                               | Pending     | Pending     |
| Typography and layout (15)        | Phone rail, legend, narration and small overview columns                      | Pending     | Pending     |
| Depth and atmosphere (10)         | Useful pitched views, terrain and ghost contrast                              | Pending     | Pending     |
| Performance and polish (10)       | Loading, smooth interaction and failed-network behavior                       | Pending     | Pending     |
| **Total (100)**                   | **Target ≥ 80 for each variant**                                              | **Pending** | **Pending** |

### V2 named gaps — review fixes (2026-11-08)

The owner confirmed this recorded list as the defect list and requested
step 5.5 preparation. Scores remain **pending**; neither that instruction
nor the V1 scores constitutes V2 visual approval.

- **Faint ghosts:** use theme foreground at 45% opacity, with the same
  legend key. Inspected night offline/stub/live captures show the before
  columns more clearly.
- **Small phone columns:** double the common display height to 60,000 m
  for 23,600 ft³/s, use 2.6 km footprints and a closer comparison camera.
  Both periods retain the same zero-based scale and every observed value.
  Very small after values remain proportionately small; they are labelled.
- **Flight occlusions:** widen the river flight, return through a wide
  north-up view, and start the closing pull-back with all gauges in view.
  Both final Linux offline and unavailable sweeps have zero findings (24
  captures, 134 flight samples per variant), including the taller fallback
  notice. All 90 affected golden images match exactly. See the execution
  plan for the complete validation record.
- **Live idle checks:** an earlier night sweep recorded two 15 s timeouts
  (2024 desktop p = 0.65 and phone p = 0.55) and a scope phone overlap.
  After the final framing changes, with Docker stopped and captures run
  serially, night passes all 24 captures and 134 flight samples with zero
  findings. Atlas has no overlaps but retains one 15 s idle timeout at
  2024 phone p = 0.55. The live gap remains open. The timeout is unchanged;
  complete-looking screenshots were never counted as successful idle checks.
- **Performance remains open:** skip symbol projection while no callouts
  are visible. The new `scripts/morph-probe.mjs` runs the production adapter
  with 1,000 explicitly synthetic columns, reporting frame intervals and
  feature-state update cost separately. With Docker stopped, the final
  default-WebGL run still selected SwiftShader: morph p99 33.4 ms desktop /
  16.8 ms phone, update p95 0.6 / 0.3 ms. The final night story measured
  50.1 / 16.8 ms. This does not meet the 16.7 ms desktop target or establish
  real-device performance. The previously missing probe is now run.

Step 5.5 preparation has started at the owner's request. Release review
still needs V2 scores and disposition of the open live/performance gaps.

## V1 review (historical)

Prepared 2026-10-23 for step 4.3 of [m2-visual.md](m2-visual.md). The owner
scores each variant against the [quality bar](visual-engine.md#quality-bar);
the target is **≥ 75** for each. Defects the owner names are fixed before
step 4.4 (L), and the scores go in [STATUS.md](STATUS.md). The same sheets,
with the captures and a score field per area, are on a private page for the
owner: <https://claude.ai/artifact/VCucYZWxTmuzEFApeNBkWM>.

The two variants share their data, media, story text and motion, so most of
the evidence is shared. Each sheet below lists only what differs.

## How to look at the stories

From the repository root after `corepack pnpm -r build`:

```sh
node packages/cli/dist/bin.js --project examples/projects/potomac preview --open
node packages/cli/dist/bin.js --project examples/projects/potomac-night preview --open
```

To regenerate the evidence (contact sheet, captures and `report.json` land in
`<project>/.mapbard-visual/captures/`):

```sh
node packages/cli/dist/bin.js --project examples/projects/potomac check --visual --network live
node packages/cli/dist/bin.js --project examples/projects/potomac check --visual --frames
```

Run one `check --visual` at a time. Two runs side by side on this machine
made the map miss the 15 s idle timeout during the 2024 flight (1 error at
stub for night, 2 at live for each variant); each run alone passed.

## Shared evidence

Collected 2026-10-23 on Windows 11 (headless Chromium, SwiftShader), commit
`0e806d0`.

| Check                                   | Atlas                                      | Night                       |
| --------------------------------------- | ------------------------------------------ | --------------------------- |
| `check` (critic)                        | clean                                      | clean                       |
| `check --visual` errors, stub           | 0                                          | 0                           |
| … offline                               | 0                                          | 0                           |
| … unavailable (every tile host fails)   | 0                                          | 0                           |
| … live (OpenFreeMap, Mapterhorn)        | 0                                          | 0                           |
| Rest findings (24 captures)             | 0 at every network                         | 0 at every network          |
| Flight warnings (98 sweep samples)      | 8 stub/live, 6 offline, 7 unavailable      | same                        |
| Callout findings at any sample          | 0                                          | 0                           |
| Frame p99, offline build, desktop/phone | 8.5 / 8.5 ms                               | not rerun (same player)     |
| Core JS, gzip (budget 450 KB)           | 409 KB                                     | 409 KB                      |
| Data / media / fonts, gzip              | 198 KB / 795 KB / 53 KB                    | same                        |
| Goldens                                 | Linux; Windows differs 2.7% (warning only) | Linux; Windows differs 2.9% |

The flight warnings are all point symbols passing under an overlay while the
camera moves: on desktop, a gauge under the media at 2024 p = 0.45 and under
the story column at p = 0.9; on phones, a gauge under the attribution
(p = 0.75) or a scale bar (p = 0.85) in the 2024 flight, and under the legend
in the limits push-in (p = 0.45, 0.65) and the scope pull-back (p = 0.25,
0.45). Frame times come from software WebGL, so they show main-thread cost,
not a real GPU's frame rate.

Captures inspected for this sheet: both variants' live and offline contact
sheets; at full size, live atlas 2024 flight p = 0.5 and 2025 p = 1
(desktop and phone), live night 2024 p = 0 and p = 0.5 (desktop) and p = 1
(phone).

## Sheet 1 — Atlas (`examples/projects/potomac`)

Positron basemap tinted to warm paper, Mapterhorn terrain (1.5×) with
hillshade and sky, rust gauges, Source Serif 4 type.

| Area (points)                     | Evidence                                                                                                                                                                                                       | Known gaps                                                                                                                                                                                                                                                   |  Score |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -----: |
| Sense of place (15)               | Hillshade reads clearly on the Ridge-and-Valley; tinted roads and water; the opening shows the Chesapeake before closing in; context fill is a light outline so the basemap shows                              | Basemap labels are sparse at story zooms (few town names to orient by); the generalized river line has visible gaps in the pitched flight                                                                                                                    |     13 |
| Encoding clarity and honesty (20) | One shared size scale (area ∝ discharge, 26 px max) across all scenes; legend titled with units (ft³/s); every value, date and qualification in the narration; critic clean                                    | The 2025 drop is read by remembering 2024: no 2024 ghost or side-by-side, and Hancock 2025 (580 ft³/s) draws at about 4 px radius. The legend's reference circles (23,600 and 5,900) are both above every 2025 value. Only Point of Rocks has a 2025 callout |     16 |
| Motion and camera (15)            | Reveal from the Chesapeake, river fly-along pitched to 70°, push-in on Little Falls, pull-back; scroll-scrubbed; staggered gauge reveal; reduced motion gets each scene's final view (unit-tested); p99 8.5 ms | Reduced motion was not captured in a browser for this sheet. During the flight, callouts fade out, so the reader sees unnamed gauges. The 2025 scene has no camera move, only a brief highlight                                                              |      9 |
| Attention and annotation (15)     | Callouts with leaders and halos, placed clear of panels and controls every frame; 0 callout findings at all 98 sweep samples; callouts fade in downstream                                                      | 8 in-flight warnings where a gauge slides under an overlay (listed above). On phones at some 2024 rest positions one of three callouts can be hidden for lack of room                                                                                        |     10 |
| Typography and layout (15)        | Sidecar on desktop, bottom sheet on phone; deliberate serif type scale; `TEXT_OVERFLOW_LIKELY` clean, so no narration scrolls inside the phone sheet; 0 rest findings at desktop and phone                     | The desktop story column is wide and mostly empty above and below the card. On phones the attribution box is four lines tall over the map, and the legend plus photo take the top quarter, leaving a small map                                               |     12 |
| Depth and atmosphere (10)         | Terrain with hillshade; sky and horizon haze in the pitched flight                                                                                                                                             | No lighting or 3D data (deck.gl and three.js tiers are V2 and V3). The offline build has no terrain or basemap                                                                                                                                               |      8 |
| Performance and polish (10)       | No console errors in any run; works from `file://`; offline build makes zero requests; basemap fallback and notice tested with every host failing; 409 KB core JS within budget                                | No visible loading state (only `data-mb-state="loading"`); about 1.5 MB gzip in all, 795 KB of it the photograph. Not tested on a real phone or mid-range laptop GPU                                                                                         |      9 |
| **Total (100)**                   |                                                                                                                                                                                                                |                                                                                                                                                                                                                                                              | **77** |

## Sheet 2 — Night (`examples/projects/potomac-night`)

OpenFreeMap Dark tinted navy, the same terrain and sky, amber gauges, Inter
type. Everything in the atlas sheet applies, except:

| Area (points)                     | Differs from atlas                                                                                                                                                                   |  Score |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -----: |
| Sense of place (15)               | Hillshade is faint on the dark land. In the opening view the Chesapeake barely separates from the land, so the "start from the bay" framing reads weaker. Road shields are prominent |     13 |
| Encoding clarity and honesty (20) | Amber on navy gives the gauges very high contrast; the bright blue river highlight reads well. Same 2025 gaps as atlas                                                               |     16 |
| Motion and camera (15)            | Same                                                                                                                                                                                 |      9 |
| Attention and annotation (15)     | Same; the halos stand out more on dark                                                                                                                                               |     10 |
| Typography and layout (15)        | Inter sans on dark panels; the same column and phone gaps                                                                                                                            |     12 |
| Depth and atmosphere (10)         | The sky gradient reads more clearly than on atlas; the relief reads less clearly                                                                                                     |      8 |
| Performance and polish (10)       | Same                                                                                                                                                                                 |      9 |
| **Total (100)**                   |                                                                                                                                                                                      | **77** |

## Owner's scores and named defects

Scored 2026-10-23 by the owner, after viewing both stories online in
`preview`: **atlas 77, night 77**, both above the V1 target of 75.

| Area (points)                     | Atlas | Night |
| --------------------------------- | ----: | ----: |
| Sense of place (15)               |    13 |    13 |
| Encoding clarity and honesty (20) |    16 |    16 |
| Motion and camera (15)            |     9 |     9 |
| Attention and annotation (15)     |    10 |    10 |
| Typography and layout (15)        |    12 |    12 |
| Depth and atmosphere (10)         |     8 |     8 |
| Performance and polish (10)       |     9 |     9 |
| **Total (100)**                   |    77 |    77 |

The owner named no defects to fix before step 4.4. The weakest areas,
relative to their weight, are motion and camera (9/15) and attention and
annotation (10/15). The known gaps listed for those areas are the starting
points for raising Potomac toward the ≥ 85 that V4 needs.
