---
'@mapbard/renderer': patch
'mapbard': patch
---

Publications opened from `file://` now draw their basemap and story layers.
Browsers refuse a worker script from a `file://` URL, so the page loads
MapLibre's worker source with a classic script and starts a classic worker
from a Blob URL. `check --visual` no longer launches Chromium with
`--allow-file-access-from-files`, so it sees `file://` pages as readers do.
