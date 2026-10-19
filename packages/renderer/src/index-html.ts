/**
 * Generates `index.html` for a story: the map container, the controls host, and
 * one stacked `<section>` per scene with its narration and panel media. Map
 * camera, layer toggling, markers, and controls are wired at runtime by app.js;
 * this file only emits the static scaffold and per-scene panel content.
 */
import type { GeoNarrative, MediaAsset, Scene, SceneMedia } from '@mapbard/schema';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/** Split narration on blank lines into paragraphs. */
function narrationHtml(narration: string): string {
  const paras = narration
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks = paras.length ? paras : [narration.trim()];
  return blocks.map((p) => `<p>${esc(p)}</p>`).join('\n          ');
}

function findAsset(narrative: GeoNarrative, assetId: string): MediaAsset | undefined {
  return narrative.mediaAssets.find((a) => a.id === assetId);
}

function panelMediaHtml(asset: MediaAsset, m: SceneMedia): string {
  const caption = m.caption ?? asset.caption ?? '';
  const credit = asset.credit ? `<span class="mb-credit">${esc(asset.credit)}</span>` : '';
  const inner =
    asset.kind === 'video'
      ? `<video controls preload="metadata"${
          asset.poster ? ` poster="${esc(asset.poster)}"` : ''
        } src="${esc(asset.path)}"></video>`
      : `<img loading="lazy" src="${esc(asset.path)}" alt="${esc(caption || asset.name)}">`;
  const figcap =
    caption || credit ? `<figcaption>${caption ? esc(caption) : ''}${credit}</figcaption>` : '';
  return `<figure class="mb-media">${inner}${figcap}</figure>`;
}

function sceneSection(narrative: GeoNarrative, scene: Scene, index: number): string {
  // A "background" placement turns the card itself into a cover image.
  const bg = (scene.media ?? []).find((m) => m.placement === 'background');
  const bgAsset = bg ? findAsset(narrative, bg.assetId) : undefined;
  const cardClass = bgAsset && bgAsset.kind === 'image' ? 'scene-card has-bg' : 'scene-card';
  const cardStyle =
    bgAsset && bgAsset.kind === 'image'
      ? ` style="background-image:url('${esc(bgAsset.path)}')"`
      : '';

  const panels = (scene.media ?? [])
    .filter((m) => m.placement !== 'background')
    .map((m) => {
      const asset = findAsset(narrative, m.assetId);
      return asset ? panelMediaHtml(asset, m) : '';
    })
    .filter(Boolean)
    .join('\n          ');

  return `      <section class="scene" data-index="${index}">
        <div class="${cardClass}"${cardStyle}>
          <h2>${esc(scene.title)}</h2>
          <div class="scene-narration">
          ${narrationHtml(scene.narration)}
          </div>
          ${panels}
        </div>
      </section>`;
}

function themeStyle(narrative: GeoNarrative): string {
  const t = narrative.theme;
  const vars: string[] = [];
  if (t?.displayFont) vars.push(`--mb-display-font:'${t.displayFont}',Georgia,serif`);
  if (t?.bodyFont) vars.push(`--mb-body-font:'${t.bodyFont}',system-ui,sans-serif`);
  if (t?.palette && t.palette.length)
    vars.push(`--mb-accent-color:${t.palette[t.palette.length - 1]}`);
  return vars.length ? `\n    <style>:root{${vars.join(';')}}</style>` : '';
}

export function buildIndexHtml(narrative: GeoNarrative): string {
  const sections = narrative.scenes.map((s, i) => sceneSection(narrative, s, i)).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(narrative.title)}</title>
    <link rel="stylesheet" href="vendor/maplibre-gl.css" />
    <link rel="stylesheet" href="style.css" />${themeStyle(narrative)}
  </head>
  <body>
    <div id="map"></div>
    <aside id="map-credit" aria-label="Map data attribution" hidden></aside>
    <aside id="controls" class="mb-controls" hidden></aside>
    <main id="story">
      <header class="mb-intro">
        <div class="mb-intro-panel">
          <h1>${esc(narrative.title)}</h1>
          <p>${esc(narrative.intent)}</p>
          <p class="mb-scroll-hint">Scroll to explore the story</p>
        </div>
      </header>
${sections}
      <footer class="mb-outro">
        <p>Made with MapBard.</p>
      </footer>
    </main>
    <script src="vendor/maplibre-gl.js"></script>
    <script src="vendor/scrollama.min.js"></script>
    <script src="bundle-data.js"></script>
    <script src="app.js"></script>
  </body>
</html>
`;
}
