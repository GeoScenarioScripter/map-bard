import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STAGE1_CAPABILITIES, critique } from '@mapbard/knowledge';
import type { Compiled, Diagnostic, ValidatedProject } from '@mapbard/schema';
import { loadProject } from '../project/load.js';
import { compileProject } from './compile.js';
import { critiqueProject } from './critique.js';
import {
  aggregateHexbins,
  cellValue,
  fromMercator,
  hexCell,
  hexRing,
  hexSize,
  hexbinTitle,
  toMercator,
} from './aggregate.js';
import { changeLabel, changeValue } from './change.js';

// The MapLibre technique gallery (step 5.2, M): real Potomac gauges, Census 2020 states and
// USGS earthquakes, one scene per technique. Tests break copies of it in memory.
const galleryRoot = resolve(process.cwd(), '../../fixtures/visual/gallery-maplibre');

async function gallery(): Promise<ValidatedProject> {
  const loaded = await loadProject(galleryRoot);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  return loaded.value;
}

function compiled(project: ValidatedProject): Compiled {
  const result = compileProject(project, STAGE1_CAPABILITIES, { offline: true });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 1));
  return result.value;
}

const errors = (project: ValidatedProject): Diagnostic[] =>
  compileProject(project, STAGE1_CAPABILITIES, { offline: true }).diagnostics.filter(
    (entry) => entry.severity === 'error',
  );

const scene = (project: ValidatedProject, id: string) =>
  project.narrative.scenes.find((item) => item.id === id)!;
const layerOf = (project: ValidatedProject, sceneId: string, layerId: string) =>
  scene(project, sceneId).layers.find((item) => item.id === layerId)!;
const compiledLayer = (story: Compiled, sceneId: string, layerId: string) =>
  story.scenes
    .find((item) => item.id === sceneId)!
    .layers.find((item) => item.authoredLayerId === layerId)!;

describe('gallery-maplibre', () => {
  it('compiles every technique and is critic-clean', async () => {
    const project = await gallery();
    const story = compiled(project);
    expect(critiqueProject(project, story)).toEqual([]);
    expect(
      story.scenes.map(
        (item) =>
          item.layers.find((layer) => layer.technique !== 'fill' && layer.technique !== 'line')!
            .technique,
      ),
    ).toEqual(['column', 'column', 'change', 'change', 'extrusion', 'hexbin', 'hexbin']);
    expect(story.scenes.flatMap((item) => item.layers).every((l) => l.backend === 'maplibre')).toBe(
      true,
    );
  });
});

describe('columns', () => {
  it('keeps its points and footprint radius; the player tessellates', async () => {
    const story = compiled(await gallery());
    expect(compiledLayer(story, 'columns', 'gauges')).toMatchObject({
      technique: 'column',
      sourceId: 'potomac-2024',
      scaleId: 'discharge-height',
      column: { radiusMeters: 1800 },
    });
    expect(story.scales.find((s) => s.id === 'discharge-height')).toMatchObject({
      kind: 'numeric-height',
      domain: [0, 23600],
      maxHeightMeters: 30000,
    });
  });

  it('defaults the radius to 6 px at the scene camera', async () => {
    const project = await gallery();
    delete layerOf(project, 'columns', 'gauges').column;
    // Zoom 8.1 at 39.22° N is about 221 m per pixel.
    expect(compiledLayer(compiled(project), 'columns', 'gauges').column).toEqual({
      radiusMeters: 1300,
    });
  });

  it('needs a height encoding', async () => {
    const project = await gallery();
    layerOf(project, 'columns', 'gauges').encode!.visualVariable = 'size';
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          message: 'A column needs a height encoding.',
        }),
      ]),
    );
  });
});

describe('extrusions', () => {
  it('draw the height scale and colour classes of the same attribute', async () => {
    const story = compiled(await gallery());
    const layer = compiledLayer(story, 'extrusion', 'density');
    expect(story.scales.find((s) => s.id === layer.scaleId)?.kind).toBe('numeric-height');
    expect(story.scales.find((s) => s.id === layer.colorScaleId)).toMatchObject({
      kind: 'numeric-color',
      effectiveClasses: 5,
    });
  });

  it('need a ratio with a declared denominator, like a choropleth', async () => {
    const project = await gallery();
    const states = project.project.resources.data.find((r) => r.id === 'census-states')!;
    delete states.attributes.find((a) => a.name === 'density_per_km2')!.denominator;
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MEASUREMENT_REQUIRED',
          ids: expect.objectContaining({ layerId: 'density' }),
        }),
      ]),
    );
    const broken = await gallery();
    broken.project.resources.data
      .find((r) => r.id === 'census-states')!
      .attributes.find((a) => a.name === 'density_per_km2')!.denominator!.attribute = 'nothing';
    expect(errors(broken)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'REFERENCE_MISSING' })]),
    );
  });
});

describe('change symbols', () => {
  it('compute signed and percent change, dropping the percentage after a zero', () => {
    expect(changeValue(23600, 2020)).toMatchObject({ change: -21580, sign: -1 });
    expect(changeLabel(changeValue(23600, 2020), 'ft^3/s')).toBe('−21,580 ft³/s (−91%)');
    expect(changeLabel(changeValue(0, 12), 'ft^3/s')).toBe('+12 ft³/s');
    expect(changeLabel(changeValue(1000, 1004), null)).toBe('+4 (+<1%)');
    expect(changeLabel(changeValue(5, 5), null)).toBe('No change');
  });

  it('join before-values by feature ID into a derived source with provenance', async () => {
    const story = compiled(await gallery());
    const layer = compiledLayer(story, 'change-height', 'gauges');
    expect(layer.change).toMatchObject({
      form: 'height',
      before: { sourceId: 'potomac-2024', label: '2024-10-01' },
      after: { sourceId: 'potomac-2025', label: '2025-10-01' },
      colors: { decrease: '#b2182b', increase: '#2166ac' },
      signs: ['decrease'],
    });
    const derived = story.derived.find((d) => d.id === layer.sourceId)!;
    expect(derived.kind).toBe('change');
    expect(derived.inputs.map((input) => input.sourceId)).toEqual(['potomac-2024', 'potomac-2025']);
    const rocks = derived.data.features.find((f) => f.id === 'USGS-01638500')!.properties!;
    expect(rocks).toMatchObject({
      daily_mean_discharge: 2020,
      'mb:before': 23600,
      'mb:change': -21580,
      'mb:sign': -1,
    });
    expect(rocks['mb:percent']).toBeCloseTo(-91.44, 2);
  });

  it('add generated callouts that list their inputs, after the author callouts', async () => {
    const story = compiled(await gallery());
    const callouts = story.scenes.find((s) => s.id === 'change-height')!.callouts;
    expect(callouts.map((c) => c.text)).toEqual([
      '−5,000 ft³/s (−90%)',
      '−21,580 ft³/s (−91%)',
      '−15,500 ft³/s (−90%)',
    ]);
    expect(callouts[1]!.generated).toEqual({
      operation: 'change',
      inputs: [
        {
          sourceId: 'potomac-2024',
          featureId: 'USGS-01638500',
          attribute: 'daily_mean_discharge',
          value: 23600,
        },
        {
          sourceId: 'potomac-2025',
          featureId: 'USGS-01638500',
          attribute: 'daily_mean_discharge',
          value: 2020,
        },
      ],
    });
    // Size form: the target is the larger of ring and disc on the size scale.
    const size = story.scenes.find((s) => s.id === 'change-size')!.callouts;
    expect(size.map((c) => c.targets[0]!.radius)).toEqual([13.64, 27, 23.26]);
  });

  it('span their before-values on a local scale', async () => {
    const story = compiled(await gallery());
    const layer = compiledLayer(story, 'change-size', 'gauges');
    expect(story.scales.find((s) => s.id === layer.scaleId)).toMatchObject({
      kind: 'numeric-size',
      domain: [0, 23600],
    });
  });

  it('diagnose a missing, self or unknown compare source', async () => {
    const project = await gallery();
    delete layerOf(project, 'change-size', 'gauges').compare;
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_INVALID',
          path: ['scenes', 3, 'layers', 2, 'compare'],
        }),
      ]),
    );
    const self = await gallery();
    layerOf(self, 'change-size', 'gauges').compare = { sourceId: 'potomac-2025' };
    expect(errors(self)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_INVALID',
          path: ['scenes', 3, 'layers', 2, 'compare', 'sourceId'],
        }),
      ]),
    );
    const unknown = await gallery();
    layerOf(unknown, 'change-size', 'gauges').compare = { sourceId: 'nowhere' };
    expect(errors(unknown)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'REFERENCE_MISSING' })]),
    );
  });

  it('need a size or height encoding', async () => {
    const project = await gallery();
    layerOf(project, 'change-size', 'gauges').encode = {
      attribute: 'daily_mean_discharge',
      visualVariable: 'color',
    };
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'A change layer needs a size or height encoding.' }),
      ]),
    );
  });

  it('need the same unit in both observations', async () => {
    const project = await gallery();
    // Shared scales check units first, so take them (and the morph that needs one) away.
    project.design.sharedScales = [];
    layerOf(project, 'morph', 'gauges').transition = undefined;
    project.project.resources.data
      .find((r) => r.id === 'potomac-2024')!
      .attributes.find((a) => a.name === 'daily_mean_discharge')!.unit = 'm^3/s';
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MEASUREMENT_INCOMPATIBLE',
          ids: expect.objectContaining({ sourceId: 'potomac-2024' }),
        }),
      ]),
    );
  });

  it('list drawn features without a match in the compared source', async () => {
    const project = await gallery();
    layerOf(project, 'change-size', 'gauges').compare = { sourceId: 'earthquakes' };
    project.project.resources.data
      .find((r) => r.id === 'earthquakes')!
      .attributes.push(
        structuredClone(
          project.project.resources.data.find((r) => r.id === 'potomac-2024')!.attributes[1]!,
        ),
      );
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REFERENCE_MISSING',
          message: expect.stringContaining(
            '3 drawn features have no match in earthquakes: USGS-01613000, USGS-01638500, USGS-01646500',
          ),
        }),
      ]),
    );
  });

  it('reject before-values above a shared scale that leaves the compared layer out', async () => {
    const project = await gallery();
    // Without the 2024 columns, the shared scale tops out at 2025's 2,020 ft³/s.
    project.design.sharedScales[0]!.members.shift();
    layerOf(project, 'morph', 'gauges').transition = undefined;
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SCALE_INCONSISTENT',
          path: ['scenes', 2, 'layers', 2, 'compare'],
          ids: expect.objectContaining({ scaleId: 'discharge-height', featureId: 'USGS-01613000' }),
        }),
      ]),
    );
  });
});

describe('morph', () => {
  it('derives from-values and a default play track', async () => {
    const story = compiled(await gallery());
    const layer = compiledLayer(story, 'morph', 'gauges');
    expect(layer.morph).toEqual({
      from: { sceneId: 'columns', layerId: 'gauges' },
      fromAttribute: 'mb:from',
      fadeAttribute: 'mb:fade',
    });
    const derived = story.derived.find((d) => d.id === layer.sourceId)!;
    expect(derived.inputs.map((i) => i.sourceId)).toEqual(['potomac-2025', 'potomac-2024']);
    expect(
      derived.data.features.map((f) => [
        f.id,
        f.properties!['mb:from'],
        f.properties!.daily_mean_discharge,
      ]),
    ).toEqual([
      ['USGS-01613000', 5580, 580],
      ['USGS-01638500', 23600, 2020],
      ['USGS-01646500', 17300, 1800],
    ]);
    expect(story.scenes.find((s) => s.id === 'morph')!.motion.layers).toEqual([
      expect.objectContaining({
        property: 'morph',
        mode: 'play',
        durationMs: 1200,
        final: 1,
        runtimeLayerId: layer.runtimeId,
      }),
    ]);
  });

  it('grows new features in and fades old ones out', async () => {
    const project = await gallery();
    // Filter Hancock out of the 2025 layer: it is then only in the layer morphed from.
    const design = project.design.scenes.find((s) => s.sceneId === 'morph')!;
    design.layers = [
      { layerId: 'gauges', filter: { attribute: 'station_name', op: '!=', value: 'Hancock' } },
    ];
    const derived = compiled(project).derived.find((d) => d.kind === 'morph')!;
    const hancock = derived.data.features.find((f) => f.id === 'USGS-01613000')!.properties!;
    expect(hancock).toMatchObject({ daily_mean_discharge: 0, 'mb:from': 5580, 'mb:fade': 1 });
  });

  it('yields to an authored morph track', async () => {
    const project = await gallery();
    project.authoredMotion = {
      scenes: { morph: { layers: [{ layerId: 'gauges', property: 'morph', mode: 'scrub' }] } },
    };
    expect(compiled(project).scenes.find((s) => s.id === 'morph')!.motion.layers).toEqual([
      expect.objectContaining({ property: 'morph', mode: 'scrub' }),
    ]);
  });

  it('needs an existing source scene and layer of the same family on one shared scale', async () => {
    const cases: [string, (p: ValidatedProject) => void, string][] = [
      [
        'REFERENCE_MISSING',
        (p) => (layerOf(p, 'morph', 'gauges').transition = { from: { sceneId: 'nowhere' } }),
        'sceneId',
      ],
      [
        'VALUE_INVALID',
        (p) => (layerOf(p, 'morph', 'gauges').transition = { from: { sceneId: 'morph' } }),
        'sceneId',
      ],
      [
        'REFERENCE_MISSING',
        (p) =>
          (layerOf(p, 'morph', 'gauges').transition = {
            from: { sceneId: 'columns', layerId: 'x' },
          }),
        'layerId',
      ],
      [
        'SCALE_INCONSISTENT',
        (p) =>
          (layerOf(p, 'morph', 'gauges').transition = {
            from: { sceneId: 'extrusion', layerId: 'density' },
          }),
        'layerId',
      ],
      ['SCALE_INCONSISTENT', (p) => p.design.sharedScales[0]!.members.splice(1, 1), 'sceneId'],
    ];
    for (const [code, mutate, field] of cases) {
      const project = await gallery();
      mutate(project);
      expect(errors(project)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code,
            path: ['scenes', 1, 'layers', 2, 'transition', 'from', field],
          }),
        ]),
      );
    }
    // Five gallery loads and compiles; the whole-repo run shares the CPU with other packages.
  }, 30_000);
});

describe('hexbins', () => {
  it('anchor a flat-topped Web Mercator grid at (0, 0)', () => {
    expect(hexCell([0, 0], 1000)).toEqual([0, 0]);
    expect(hexCell([1500, 866], 1000)).toEqual([1, 0]);
    expect(hexCell([0, 1732], 1000)).toEqual([0, 1]);
    const ring = hexRing([0, 0], 1000);
    expect(ring).toHaveLength(7);
    expect(ring[0]).toEqual(ring[6]);
    const [x] = toMercator(ring[0]!);
    expect(x).toBeCloseTo(1000, 0);
    expect(fromMercator(toMercator([-117.5, 34.25]))[1]).toBeCloseTo(34.25, 9);
    // 25 km wide on the ground at 60° N is 50 km in Mercator metres; size is half the width.
    expect(hexSize(25, 60)).toBeCloseTo(25000, 6);
  });

  it('count, sum and average the points in each cell', () => {
    const cells = aggregateHexbins(
      [
        { at: [0, 0], value: 2 },
        { at: [0.001, 0], value: 4 },
        { at: [0.002, 0] },
        { at: [1, 1], value: 10 },
      ],
      1000,
    );
    expect(
      cells.map((cell) => [cell.count, cellValue(cell, 'sum'), cellValue(cell, 'mean')]),
    ).toEqual([
      [3, 6, 3],
      [1, 10, 10],
    ]);
    expect(hexbinTitle({ cellKm: 25, op: 'count' }, undefined)).toBe('Count per 25 km cell');
    expect(hexbinTitle({ cellKm: 1500, op: 'mean', attribute: 'm' }, 'Magnitude')).toBe(
      'Mean Magnitude per 1,500 km cell',
    );
  });

  it('aggregate into a derived polygon source with provenance and a compiled ramp', async () => {
    const story = compiled(await gallery());
    const flat = compiledLayer(story, 'hexbin-flat', 'quakes');
    expect(flat).toMatchObject({ geometry: 'polygon', attribute: 'count' });
    expect(flat.heightScaleId).toBeUndefined();
    const derived = story.derived.find((d) => d.id === flat.sourceId)!;
    expect(derived.parameters).toMatchObject({ cellKm: 25, op: 'count', points: 457 });
    const counts = derived.data.features.map((f) => f.properties!.count as number);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(457);
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(story.scales.find((s) => s.id === flat.scaleId)).toMatchObject({
      kind: 'numeric-color',
      title: 'Count per 25 km cell',
    });
    const extruded = compiledLayer(story, 'hexbin-extruded', 'quakes');
    expect(story.scales.find((s) => s.id === extruded.heightScaleId)).toMatchObject({
      kind: 'numeric-height',
      maxHeightMeters: 60000,
    });
  });

  it('diagnose a missing aggregate, an encode, no classification and a transition', async () => {
    const project = await gallery();
    const layer = layerOf(project, 'hexbin-flat', 'quakes');
    delete layer.classification;
    layer.encode = { attribute: 'place', visualVariable: 'color' };
    layer.transition = { from: { sceneId: 'hexbin-extruded' } };
    const found = errors(project).map((d) => d.path.slice(4).join('.'));
    expect(found).toEqual(expect.arrayContaining(['encode', 'classification', 'transition']));
    const none = await gallery();
    delete layerOf(none, 'hexbin-flat', 'quakes').aggregate;
    expect(errors(none)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['scenes', 5, 'layers', 1, 'aggregate'] }),
      ]),
    );
  });

  it('need a declared numeric quantity to sum', async () => {
    const project = await gallery();
    layerOf(project, 'hexbin-flat', 'quakes').aggregate = {
      cellKm: 25,
      op: 'sum',
      attribute: 'place',
    };
    expect(errors(project)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'MEASUREMENT_REQUIRED' })]),
    );
    const missing = await gallery();
    layerOf(missing, 'hexbin-flat', 'quakes').aggregate = {
      cellKm: 25,
      op: 'mean',
      attribute: 'nothing',
    };
    expect(errors(missing)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'REFERENCE_MISSING' })]),
    );
  });
});

describe('V2 critic rules', () => {
  it('warns about heights in a scene whose camera never pitches', async () => {
    const project = await gallery();
    scene(project, 'columns').camera.pitch = 0;
    scene(project, 'hexbin-extruded').camera.pitch = 0;
    const story = compiled(project);
    expect(
      critique({ compiled: story, features: {} }).filter((d) => d.code === 'DEPTH_UNSEEN'),
    ).toEqual([
      expect.objectContaining({
        path: ['scenes', 0, 'camera'],
        ids: { sceneId: 'columns', layerId: 'gauges' },
      }),
      expect.objectContaining({ ids: { sceneId: 'hexbin-extruded', layerId: 'quakes' } }),
    ]);
  });

  it('warns when hexbin cells change ground area by more than 10%', async () => {
    const project = await gallery();
    const story = compiled(project);
    expect(
      critique({ compiled: story, features: {} }).filter(
        (d) => d.code === 'ENCODING_AREA_DISTORTED',
      ),
    ).toEqual([]);
    // Stretch one cell north to 48° N: the span now loses about 37% of ground area.
    const source = story.derived.find((d) => d.kind === 'hexbin')!;
    (source.data.features[0]!.geometry as { coordinates: number[][][] }).coordinates[0]![0]![1] =
      48;
    expect(
      critique({ compiled: story, features: {} }).filter(
        (d) => d.code === 'ENCODING_AREA_DISTORTED',
      ),
    ).toEqual([
      expect.objectContaining({ message: expect.stringContaining('% less ground at 48.0°') }),
    ]);
  });

  it('flags different hexbin mappings with a remedy hexbins can follow', async () => {
    const project = await gallery();
    layerOf(project, 'hexbin-extruded', 'quakes').classification = {
      method: 'equal-interval',
      classes: 3,
    };
    expect(critiqueProject(project, compiled(project))).toEqual([
      expect.objectContaining({
        code: 'SCALE_INCONSISTENT',
        remedy: expect.stringContaining('same manual classification'),
      }),
    ]);
  });
});
