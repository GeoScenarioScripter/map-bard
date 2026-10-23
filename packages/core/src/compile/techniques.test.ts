import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { V2_TECHNIQUES, type ValidatedProject } from '@mapbard/schema';
import { loadProject } from '../project/load.js';
import { compileProject, defaultMaxHeightMeters, metresPerPixel } from './compile.js';
import { READY_V2_TECHNIQUES, TECHNIQUE_COMPILERS } from './dispatch.js';
import { numericHeightScale, numericWidthScale, type ScaleInput } from './scales.js';

const fixtureRoot = resolve(process.cwd(), '../../fixtures/two-period');

/** The two-period fixture, read as if it were authored in format 0.2. */
async function fixture(format: '0.1' | '0.2' = '0.2'): Promise<ValidatedProject> {
  const loaded = await loadProject(fixtureRoot);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  if (format === '0.2') loaded.value.authoredFormat = '0.2.0';
  return loaded.value;
}

function compileErrors(project: ValidatedProject) {
  const result = compileProject(project, STAGE1_CAPABILITIES);
  return result.diagnostics.filter((entry) => entry.severity === 'error');
}

const scaleInput = (values: unknown[], extra: Partial<ScaleInput> = {}): ScaleInput => ({
  id: 'flow',
  title: 'Flow',
  memberKeys: [{ sceneId: 's', layerId: 'l', sourceId: 'd' }],
  unit: 'ft^3/s',
  values,
  palette: [],
  classes: 0,
  path: ['features'],
  ...extra,
});

describe('V2 technique dispatch (step 5.1)', () => {
  it('gives every V2 technique a module, none of them ready yet', () => {
    expect(Object.keys(TECHNIQUE_COMPILERS).sort()).toEqual([...V2_TECHNIQUES].sort());
    expect(READY_V2_TECHNIQUES).toEqual([]);
  });

  it('compiles V1 layers with the maplibre backend and no derived sources', async () => {
    const result = compileProject(await fixture(), STAGE1_CAPABILITIES);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value.compiledVersion).toBe('0.4.0');
    expect(result.value.derived).toEqual([]);
    const backends = result.value.scenes.flatMap((scene) => scene.layers.map((l) => l.backend));
    expect(new Set(backends)).toEqual(new Set(['maplibre']));
  });

  it.each(V2_TECHNIQUES)(
    'answers CAPABILITY_UNSUPPORTED for %s until its module is ready',
    async (technique) => {
      const project = await fixture();
      const layer = project.narrative.scenes[0]!.layers[0]!;
      layer.technique = technique;
      expect(compileErrors(project)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'CAPABILITY_UNSUPPORTED',
            path: ['scenes', 0, 'layers', 0, 'technique'],
            message: `Technique ${technique} is not compiled yet.`,
            ids: expect.objectContaining({ layerId: layer.id }),
          }),
        ]),
      );
    },
  );

  it('keeps V2 techniques and fields out of format 0.1 projects', async () => {
    const project = await fixture('0.1');
    project.narrative.scenes[0]!.layers[0]!.technique = 'column';
    expect(compileErrors(project)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'VERSION_UNSUPPORTED' })]),
    );
    expect(compileErrors(project)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Technique column is not compiled yet.' }),
      ]),
    );
  });

  it('diagnoses V2 fields and encodings on techniques they do not apply to', async () => {
    const project = await fixture();
    const layer = project.narrative.scenes[0]!.layers[0]!;
    layer.compare = { sourceId: 'period-b' };
    layer.encode = { ...layer.encode!, maxHeightMeters: 1000 };
    const errors = compileErrors(project);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          path: ['scenes', 0, 'layers', 0, 'compare'],
          message: 'compare applies to change layers, not point.',
        }),
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          path: ['scenes', 0, 'layers', 0, 'encode', 'maxHeightMeters'],
        }),
      ]),
    );
    const width = await fixture();
    width.narrative.scenes[0]!.layers[0]!.encode!.visualVariable = 'width';
    expect(compileErrors(width)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          message: 'A width encoding applies to arc layers, not point.',
        }),
      ]),
    );
  });
});

describe('V2 track properties', () => {
  it('keeps grow, morph and trail to the techniques that draw them', async () => {
    const project = await fixture();
    const scene = project.narrative.scenes[0]!;
    const layerId = scene.layers[0]!.id;
    project.authoredMotion = {
      scenes: {
        [scene.id]: {
          layers: [
            { layerId, property: 'grow' },
            { layerId, property: 'trail', mode: 'play', stagger: { delayMs: 100 } },
          ],
        },
      },
    };
    const errors = compileErrors(project);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          message: `grow applies to column, extrusion, change, hexbin layers; layer ${layerId} is point.`,
        }),
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          message: `trail applies to trip layers; layer ${layerId} is point.`,
        }),
      ]),
    );
  });
});

describe('height and width scales', () => {
  it('maps height linearly from zero and names the tallest value', () => {
    const { scale, diagnostics } = numericHeightScale(
      scaleInput([2000, 23600, null], { maxHeightMeters: 30000 }),
    );
    expect(diagnostics).toEqual([]);
    expect(scale).toMatchObject({
      kind: 'numeric-height',
      domain: [0, 23600],
      mapping: 'linear',
      maxHeightMeters: 30000,
      tallest: { value: 23600, label: '23,600' },
      unitLabel: 'ft³/s',
      counts: { valid: 2, missing: 1, invalid: 0 },
    });
  });

  it('rejects negative heights with a remedy that points to change symbols', () => {
    const { scale, diagnostics } = numericHeightScale(scaleInput([-5, 10], { maxHeightMeters: 1 }));
    expect(scale).toBeUndefined();
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'MEASUREMENT_INCOMPATIBLE',
        remedy: 'Show signed values with change symbols, or encode colour.',
      }),
    ]);
  });

  it('maps width linearly from zero with example widths', () => {
    const { scale } = numericWidthScale(scaleInput([10, 40]));
    expect(scale).toMatchObject({
      kind: 'numeric-width',
      domain: [0, 40],
      maxWidth: 8,
      legend: [
        { value: 10, width: 2, label: '10' },
        { value: 20, width: 4, label: '20' },
        { value: 40, width: 8, label: '40' },
      ],
    });
  });

  it('defaults the tallest column to a fifth of the reference view, to two figures', () => {
    expect(metresPerPixel(0, 0)).toBeCloseTo(78271.5, 1);
    // Potomac's flight: zoom 9.4 at 39.3° N is about 90 m per pixel, 900 px tall.
    expect(defaultMaxHeightMeters({ center: [-77.6, 39.3], zoom: 9.4 })).toBe(16000);
  });
});
