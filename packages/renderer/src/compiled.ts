import { createHash } from 'node:crypto';
import {
  CompiledSchema,
  PublicationInputsSchema,
  RenderCompiledOptionsSchema,
  type Compiled,
  type CompiledBundle,
  type Diagnostic,
  type PublicationInputs,
  type RenderCompiledOptions,
  type Result,
} from '@mapbard/schema';

const unsafeScript = /[<>\u2028\u2029]/g;
const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(
    unsafeScript,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

function issue(
  code: Diagnostic['code'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  ids: Diagnostic['ids'] = {},
): Diagnostic {
  return { code, severity: 'error', artifact: 'export', path, ids, message, remedy };
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function safePath(path: string): boolean {
  return (
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !/^[A-Za-z]:/.test(path) &&
    path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

function themeCss(compiled: Compiled): string {
  const font = (value: string | undefined): string | undefined =>
    value && /^[\p{L}\p{N} ._-]+$/u.test(value) ? `'${value}'` : undefined;
  const display = font(compiled.theme?.displayFont);
  const body = font(compiled.theme?.bodyFont);
  const accent = compiled.theme?.palette?.at(-1);
  const vars = [
    display && `--mb-display-font:${display}`,
    body && `--mb-body-font:${body}`,
    accent && /^#[0-9a-fA-F]{3,8}$/.test(accent) && `--mb-accent-color:${accent}`,
  ].filter(Boolean);
  return vars.length ? `<style>:root{${vars.join(';')}}</style>` : '';
}

function html(compiled: Compiled): string {
  const scenes = compiled.scenes
    .map(
      (scene) =>
        `<section class="scene" data-scene-id="${escapeHtml(scene.id)}"><div class="scene-card"><h2>${escapeHtml(scene.title)}</h2><div class="scene-narration">${scene.narration
          .split(/\n\s*\n/)
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join('')}</div></div></section>`,
    )
    .join('\n');
  const credits = compiled.resources
    .filter((resource) => resource.credit || resource.qualification)
    .map(
      (resource) =>
        `<li>${escapeHtml(resource.name ?? resource.id)}: ${escapeHtml(resource.credit ?? '')}${resource.qualification ? ` — ${escapeHtml(resource.qualification)}` : ''}</li>`,
    )
    .join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(compiled.title)}</title><link rel="stylesheet" href="vendor/maplibre-gl.css"><link rel="stylesheet" href="style.css">${themeCss(compiled)}<style>.mb-compiled-media{position:fixed;right:16px;top:16px;z-index:3;width:min(300px,28vw);max-height:45vh;overflow:auto;background:var(--mb-card-bg);padding:12px;border-radius:10px}.mb-compiled-media:empty{display:none}@media(max-width:640px){.mb-compiled-media{top:auto;bottom:82px;right:14px;width:min(230px,55vw);max-height:24vh}}</style></head>
<body><div id="map" aria-label="Story map"></div><aside id="controls" class="mb-controls" hidden></aside><aside id="legends" class="mb-legend-host" hidden></aside><aside id="media" class="mb-compiled-media"></aside>
<main id="story"><header class="mb-intro"><div class="mb-intro-panel"><h1>${escapeHtml(compiled.title)}</h1><p>${escapeHtml(compiled.intent)}</p><p class="mb-scroll-hint">Scroll to explore the story</p></div></header>
${scenes}<footer class="mb-outro"><div class="mb-intro-panel"><p>Made with MapBard.</p>${credits ? `<h2>Sources and qualifications</h2><ul>${credits}</ul>` : ''}</div></footer></main>
<script src="vendor/maplibre-gl.js"></script><script src="compiled-data.js"></script><script src="player.js"></script><script src="compiled-app.js"></script></body></html>\n`;
}

const app = `(() => {
  'use strict';
  const payload = window.MAPBARD_COMPILED;
  const api = window.MapBardCompiledPlayer;
  const scenes = [...document.querySelectorAll('[data-scene-id]')];
  const root = document.documentElement;
  root.dataset.mbState = 'loading';
  const showError = (error) => {
    root.dataset.mbState = 'error';
    const panel = document.createElement('p');
    panel.setAttribute('role', 'alert');
    panel.textContent = 'Story playback failed: ' + String(error);
    document.querySelector('#story').prepend(panel);
  };
  try {
    if (!payload || !api || !window.maplibregl || !scenes.length) throw new Error('Required player or story data is missing');
    const first = payload.story.scenes[0];
    const base = payload.story.basemap;
    const styles = typeof base === 'object' && base.provider !== 'none' ? base.styles : [];
    let styleIndex = 0;
    let ready = false;
    let switching = false;
    let cleanup;
    let attribution;
    let timer;
    const notice = (message) => {
      let panel = document.querySelector('#mb-basemap-notice');
      if (!panel) { panel = document.createElement('p'); panel.id = 'mb-basemap-notice'; panel.setAttribute('role', 'status'); document.body.append(panel); }
      panel.textContent = message;
    };
    maplibregl.setWorkerUrl('vendor/maplibre-gl-worker.js');
    const map = new maplibregl.Map({
      container: 'map', style: styles[0] ? styles[0].url : { version: 8, sources: {}, layers: [] },
      center: first.camera.center, zoom: first.camera.zoom, attributionControl: false,
    });
    map.scrollZoom.disable();
    const failStyle = () => {
      if (switching || styleIndex >= styles.length) return;
      switching = true;
      clearTimeout(timer);
      if (cleanup) { cleanup(); cleanup = undefined; }
      root.dataset.mbState = 'loading';
      if (attribution) { map.removeControl(attribution); attribution = undefined; }
      ready = false;
      styleIndex++;
      if (styles[styleIndex]) { map.setStyle(styles[styleIndex].url); timer = setTimeout(failStyle, 12000); }
      else { notice('Online basemap unavailable; showing local story layers.'); map.setStyle({ version: 8, sources: {}, layers: [] }); }
    };
    if (styles.length) timer = setTimeout(failStyle, 12000);
    map.on('style.load', () => {
      try {
        clearTimeout(timer);
        ready = true;
        const chosen = styles[styleIndex];
        const credit = document.createElement('span');
        credit.textContent = chosen ? chosen.attribution : '';
        attribution = new maplibregl.AttributionControl({ customAttribution: credit.innerHTML });
        map.addControl(attribution);
        if (chosen && base.labels !== 'full') {
          for (const layer of map.getStyle().layers || []) {
            if (layer.type === 'symbol' && (base.labels === 'off' || /poi|place|label/i.test(layer.id)))
              map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
        if (chosen && base.terrain) {
          map.addSource('mb-terrain', { type: 'raster-dem', tiles: [base.terrain.tiles], tileSize: base.terrain.tileSize, encoding: 'terrarium', attribution: base.terrain.attribution });
          map.setTerrain({ source: 'mb-terrain', exaggeration: base.terrain.exaggeration });
        }
        const adapter = api.createMapLibreAdapter(payload.story, payload.data, map, maplibregl);
        const view = api.createDomView({ scenes, media: document.querySelector('#media'), controls: document.querySelector('#controls'), legends: document.querySelector('#legends') });
        const player = api.createPlayer(payload.story, adapter, view, { reducedMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches });
        player.enter(first.id);
        const disconnect = api.observeScenes(player, scenes);
        // Readiness hook for visual QA and the workbench; reading it never changes playback.
        window.MapBardStory = {
          sceneIds: payload.story.scenes.map((scene) => scene.id),
          activeSceneId: () => player.activeSceneId(),
          whenIdle: () => new Promise((resolve) => { map.once('idle', () => resolve()); map.triggerRepaint(); }),
        };
        cleanup = () => { disconnect(); player.dispose(); delete window.MapBardStory; };
        switching = false;
        root.dataset.mbState = 'ready';
      } catch (error) { showError(error); map.remove(); }
    });
    map.on('error', (event) => { if (styles.length && styleIndex < styles.length) failStyle(); else if (ready) console.error(event.error || 'Map error'); });
    addEventListener('pagehide', () => { clearTimeout(timer); if (cleanup) cleanup(); map.remove(); }, { once: true });
  } catch (error) { showError(error); }
})();\n`;

/** Pure publication generation. The caller supplies a fresh input snapshot and exact data bytes. */
export function renderCompiled(
  compiled: Compiled,
  publication: PublicationInputs,
  options: RenderCompiledOptions = {},
): Result<CompiledBundle> {
  if (
    !CompiledSchema.safeParse(compiled).success ||
    !PublicationInputsSchema.safeParse(publication).success ||
    !RenderCompiledOptionsSchema.safeParse(options).success
  ) {
    return {
      ok: false,
      diagnostics: [
        issue(
          'VALUE_INVALID',
          [],
          'Publication inputs do not match the compiled contract.',
          'Recompile and provide validated publication inputs.',
        ),
      ],
    };
  }
  const diagnostics: Diagnostic[] = [];
  if (JSON.stringify(publication.currentInput) !== JSON.stringify(compiled.input))
    diagnostics.push(
      issue(
        'INPUT_STALE',
        ['currentInput'],
        'Authored project input differs from this compilation.',
        'Reload and recompile the current project.',
      ),
    );
  const expected = new Map(compiled.input.resources.map((item) => [item.id, item.sha256]));
  const dataResources = compiled.resources.filter((item) => item.kind === 'data');
  const data = new Map<string, unknown>();
  if (
    publication.dataBytes.length !== dataResources.length ||
    new Set(publication.dataBytes.map((item) => item.id)).size !== publication.dataBytes.length
  )
    diagnostics.push(
      issue(
        'INPUT_STALE',
        ['dataBytes'],
        'Data byte membership differs from compiled resources.',
        'Reload and recompile the current data.',
      ),
    );
  for (const resource of dataResources) {
    const item = publication.dataBytes.find((entry) => entry.id === resource.id);
    if (!item || sha256(item.bytes) !== expected.get(resource.id)) {
      diagnostics.push(
        issue(
          'INPUT_STALE',
          ['dataBytes'],
          'Data bytes differ from the compilation.',
          'Reload and recompile this source.',
          { sourceId: resource.id },
        ),
      );
      continue;
    }
    try {
      const value: unknown = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(item.bytes),
      );
      if (
        !value ||
        typeof value !== 'object' ||
        !('type' in value) ||
        value.type !== 'FeatureCollection' ||
        !('features' in value) ||
        !Array.isArray(value.features)
      )
        throw new Error('Not GeoJSON');
      data.set(resource.id, value);
    } catch {
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          ['dataBytes'],
          'Compiled source is not a GeoJSON FeatureCollection.',
          'Supply valid GeoJSON bytes and recompile.',
          { sourceId: resource.id },
        ),
      );
    }
  }
  const localMedia = compiled.resources.filter((item) => item.kind !== 'data' && item.bundlePath);
  if (
    publication.assets.length !== localMedia.length ||
    new Set(publication.assets.map((item) => item.id)).size !== publication.assets.length
  )
    diagnostics.push(
      issue(
        'RESOURCE_MISSING',
        ['assets'],
        'Local asset membership differs from compiled resources.',
        'Reload the project assets.',
      ),
    );
  for (const resource of compiled.resources) {
    const path = resource.bundlePath;
    if (path && !safePath(path))
      diagnostics.push(
        issue(
          'ASSET_PATH_INVALID',
          ['resources'],
          'Compiled bundle path is unsafe.',
          'Use a project-relative path without traversal.',
          { assetId: resource.id },
        ),
      );
    if (resource.kind !== 'data' && Boolean(path) === Boolean(resource.remoteUrl))
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          ['resources'],
          'Media must have exactly one local or remote location.',
          'Recompile this media resource.',
          { assetId: resource.id },
        ),
      );
    if (
      resource.posterId &&
      !compiled.resources.some((item) => item.id === resource.posterId && item.kind === 'image')
    )
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          ['resources'],
          'Video poster does not refer to an image resource.',
          'Register the poster image and recompile.',
          { assetId: resource.id },
        ),
      );
  }
  for (const resource of localMedia) {
    const asset = publication.assets.find((item) => item.id === resource.id);
    if (
      !asset ||
      asset.bundlePath !== resource.bundlePath ||
      asset.sha256 !== expected.get(resource.id)
    )
      diagnostics.push(
        issue(
          'INPUT_STALE',
          ['assets'],
          'Local media declaration differs from the compilation.',
          'Reload and recompile this asset.',
          { assetId: resource.id },
        ),
      );
  }
  const basemapNetwork =
    typeof compiled.basemap === 'object' && compiled.basemap.provider !== 'none'
      ? [
          ...compiled.basemap.styles.map((style) => style.url),
          ...(compiled.basemap.terrain ? [compiled.basemap.terrain.tiles] : []),
        ]
      : [];
  const expectedNetwork = [
    ...new Set([
      ...compiled.resources.flatMap((resource) => (resource.remoteUrl ? [resource.remoteUrl] : [])),
      ...basemapNetwork,
    ]),
  ].sort();
  if (
    JSON.stringify(expectedNetwork) !== JSON.stringify(compiled.requiredNetwork) ||
    expectedNetwork.some((url) => !/^https?:\/\//i.test(url))
  )
    diagnostics.push(
      issue(
        'VALUE_INVALID',
        ['requiredNetwork'],
        'Remote dependencies are not declared consistently.',
        'Recompile with explicit HTTP(S) media dependencies.',
      ),
    );
  if (diagnostics.length) return { ok: false, diagnostics };
  const payload = Object.fromEntries(data);
  const files = {
    'index.html': html(compiled),
    'compiled-data.js': `window.MAPBARD_COMPILED = ${safeJson({ story: compiled, data: payload })};\n`,
    'compiled-app.js': app,
  };
  return {
    ok: true,
    value: {
      files,
      mediaCopies: publication.assets,
      input: compiled.input,
      diagnostics: [],
      requiredNetwork: compiled.requiredNetwork,
    },
    diagnostics: [],
  };
}
