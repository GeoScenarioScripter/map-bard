import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseGeoNarrative } from '@mapbard/schema';
import { render } from './index.js';
import type { DataMap } from './types.js';

function readExample(): { narrative: ReturnType<typeof parseGeoNarrative>; data: DataMap } {
  const root = new URL('../../../examples/', import.meta.url);
  const narrative = parseGeoNarrative(
    JSON.parse(readFileSync(fileURLToPath(new URL('sf-waterfront.geonarrative.json', root)), 'utf8')),
  );
  const landmarks = JSON.parse(
    readFileSync(fileURLToPath(new URL('data/landmarks.geojson', root)), 'utf8'),
  );
  return { narrative, data: { landmarks } };
}

describe('render() against the M1 example', () => {
  it('produces index.html with the title, intent, and every scene', () => {
    const { narrative, data } = readExample();
    const html = render(narrative, data).files['index.html']!;
    expect(html).toContain('Along the San Francisco Waterfront');
    expect(html).toContain('then drill into its busiest landmark');
    expect(html).toContain('The waterfront');
    expect(html).toContain('At the Ferry Building');
    // wiring to the runtime + vendor libs
    expect(html).toContain('src="app.js"');
    expect(html).toContain('vendor/maplibre-gl.js');
    expect(html).toContain('bundle-data.js');
  });

  it('renders scene-panel media inline but leaves map-anchored media to the runtime', () => {
    const { narrative, data } = readExample();
    const html = render(narrative, data).files['index.html']!;
    // skyline is a panel figure -> in the HTML
    expect(html).toContain('media/skyline.png');
    // ferry-building is a map anchor only -> NOT in the static HTML (added by app.js)
    expect(html).not.toContain('media/ferry-building.png');
  });

  it('inlines narrative + data into bundle-data.js (no fetch needed)', () => {
    const { narrative, data } = readExample();
    const js = render(narrative, data).files['bundle-data.js']!;
    expect(js).toContain('window.MAPBARD');
    expect(js).toContain('"daily_visitors"');
    expect(js).toContain('sf-waterfront');
    // no raw </script> sequence can survive the escaping
    expect(js).not.toContain('</script>');
  });

  it('lists both local images to copy, with bundle-relative destinations', () => {
    const { narrative, data } = readExample();
    const { mediaCopies } = render(narrative, data);
    const dests = mediaCopies.map((m) => m.to).sort();
    expect(dests).toEqual(['media/ferry-building.png', 'media/skyline.png']);
    // each absolute source path ends with the asset's own file name
    expect(mediaCopies.every((m) => m.from.replace(/\\/g, '/').endsWith(m.to))).toBe(true);
  });

  it('warns when a declared data source has no data', () => {
    const { narrative } = readExample();
    const { warnings } = render(narrative, {});
    expect(warnings.some((w) => w.includes('landmarks'))).toBe(true);
  });

  it('is clean when all data is supplied', () => {
    const { narrative, data } = readExample();
    expect(render(narrative, data).warnings).toEqual([]);
  });
});
