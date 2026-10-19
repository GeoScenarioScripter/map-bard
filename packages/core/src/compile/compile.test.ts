import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import type { CapabilityCatalog, ValidatedProject } from '@mapbard/schema';
import { loadProject } from '../project/load.js';
import { compileProject } from './compile.js';

const fixtureRoot = resolve(process.cwd(), '../../docs/stage-1/specimens');

async function fixture(): Promise<ValidatedProject> {
  const loaded = await loadProject(fixtureRoot);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  return loaded.value;
}

function replaceData(project: ValidatedProject, id: string, data: unknown): void {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  project.dataMap[id] = data as ValidatedProject['dataMap'][string];
  project.dataBytes.find((entry) => entry.id === id)!.bytes = bytes;
  project.project.resources.data.find((entry) => entry.id === id)!.sha256 = digest;
  project.input.resources.find((entry) => entry.id === id)!.sha256 = digest;
}

describe('compileProject', () => {
  it('matches the frozen shared-scale semantic oracle and is deterministic and pure', async () => {
    const project = await fixture();
    const before = JSON.stringify(project);
    const expected = JSON.parse(
      await readFile(resolve(fixtureRoot, 'compiled.expected.json'), 'utf8'),
    );
    const actual = JSON.parse(
      await readFile(resolve(process.cwd(), 'src/compile/fixtures/compiled.g1-r1.json'), 'utf8'),
    );
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('compiler attempted network access');
    });
    let first: ReturnType<typeof compileProject>;
    let second: ReturnType<typeof compileProject>;
    try {
      first = compileProject(project, STAGE1_CAPABILITIES);
      second = compileProject(project, STAGE1_CAPABILITIES);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
    expect(first).toEqual(second);
    expect(JSON.stringify(project)).toBe(before);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(JSON.stringify(first.diagnostics));
    expect(first.value).toEqual(actual);
    expect(first.value).toEqual({ ...expected, compilerVersion: first.value.compilerVersion });
  });

  it('blocks unsupported basemaps, classification and scope controls', async () => {
    const project = await fixture();
    project.narrative.basemap.style = 'protomaps-light';
    project.narrative.scenes[0]!.layers[0]!.classification!.method = 'quantile';
    project.narrative.scenes[0]!.controls![0]!.bindsTo.property = 'filter';
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(false);
    expect(
      result.diagnostics.filter((item) => item.code === 'CAPABILITY_UNSUPPORTED'),
    ).toHaveLength(3);
  });

  it('rejects nonnumeric values and all-missing numeric scales with counts', async () => {
    const wrong = await fixture();
    const data = structuredClone(wrong.dataMap['period-a']) as {
      features: { properties: { value: unknown } }[];
    };
    data.features[1]!.properties.value = '10';
    replaceData(wrong, 'period-a', data);
    const invalid = compileProject(wrong, STAGE1_CAPABILITIES);
    expect(invalid.ok).toBe(false);
    expect(invalid.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'VALUE_INVALID',
        path: ['features', 1, 'properties', 'value'],
        ids: expect.objectContaining({ sourceId: 'period-a', featureId: 'p2' }),
        counts: expect.objectContaining({ invalid: 1, total: 7 }),
      }),
    );

    const missing = await fixture();
    for (const id of ['period-a', 'period-b']) {
      const all = structuredClone(missing.dataMap[id]) as {
        features: { properties: { value: unknown } }[];
      };
      all.features.forEach((feature) => {
        feature.properties.value = null;
      });
      replaceData(missing, id, all);
    }
    const result = compileProject(missing, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'VALUE_INVALID',
        counts: expect.objectContaining({ missing: 14, total: 14 }),
      }),
    );
  });

  it('blocks a changed byte buffer and invalid measurement declaration', async () => {
    const stale = await fixture();
    stale.dataBytes[0]!.bytes = new TextEncoder().encode('{}');
    expect(compileProject(stale, STAGE1_CAPABILITIES).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'INPUT_STALE' }),
    );

    const identifier = await fixture();
    const value = identifier.project.resources.data[0]!.attributes[1]!;
    value.role = 'identifier';
    value.level = 'nominal';
    value.unit = null;
    const result = compileProject(identifier, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'MEASUREMENT_REQUIRED' }),
    );
  });

  it('resolves a typed filter over complete source values', async () => {
    const project = await fixture();
    project.design.scenes[0]!.layers[0]!.filter = { attribute: 'value', op: '>=', value: 20 };
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value.scenes[0]!.layers[0]!.filter).toEqual({
      attribute: 'value',
      op: '>=',
      value: 20,
    });
    expect(result.value.scales[0]).toEqual(
      expect.objectContaining({ counts: { valid: 11, missing: 0, invalid: 0 }, domain: [20, 120] }),
    );
  });

  it('compiles seven categorical values from data, beyond a five-value profile sample', async () => {
    const project = await fixture();
    project.design.sharedScales = [];
    project.narrative.theme = {
      palette: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'],
    };
    for (const scene of project.narrative.scenes) {
      const layer = scene.layers[0]!;
      layer.technique = 'categorical';
      layer.encode = { attribute: 'site', visualVariable: 'color' };
      delete layer.classification;
    }
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value.scales).toHaveLength(2);
    expect(result.value.scales[0]).toEqual(
      expect.objectContaining({
        kind: 'category-color',
        counts: { valid: 7, missing: 0, invalid: 0 },
      }),
    );
    const first = result.value.scales[0]!;
    if (first.kind !== 'category-color') throw new Error('expected category scale');
    expect(first.categories.map((entry) => entry.value)).toEqual([
      'Five',
      'Four',
      'One',
      'Seven',
      'Six',
      'Three',
      'Two',
    ]);
  });

  it('checks point geometry, graduated area prerequisites and radius control conflicts', async () => {
    const project = await fixture();
    project.design.sharedScales = [];
    const layer = project.narrative.scenes[0]!.layers[0]!;
    layer.technique = 'graduated-symbol';
    layer.encode = { attribute: 'value', visualVariable: 'size' };
    delete layer.classification;
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'MEASUREMENT_INCOMPATIBLE' }),
    );

    project.project.resources.data[0]!.attributes[1]!.level = 'ratio';
    project.narrative.scenes[0]!.controls![0]!.bindsTo.property = 'circle-radius';
    const control = compileProject(project, STAGE1_CAPABILITIES);
    expect(control.ok).toBe(false);
    expect(control.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'MEASUREMENT_INCOMPATIBLE', artifact: 'narrative' }),
    );

    project.narrative.scenes[0]!.controls = [];
    const polygon = structuredClone(project.dataMap['period-a']) as {
      features: { geometry: { type: string } }[];
    };
    polygon.features[0]!.geometry.type = 'Polygon';
    replaceData(project, 'period-a', polygon);
    const geometry = compileProject(project, STAGE1_CAPABILITIES);
    expect(geometry.ok).toBe(false);
    expect(geometry.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'VALUE_INVALID', artifact: 'data' }),
    );
  });

  it('blocks incompatible shared units and an annotation whose feature is missing', async () => {
    const project = await fixture();
    project.project.resources.data[1]!.attributes[1]!.unit = 'different units';
    project.design.scenes[0]!.annotations[0]!.target = {
      kind: 'features',
      sourceId: 'period-a',
      featureIds: ['missing'],
    };
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'MEASUREMENT_INCOMPATIBLE' }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'REFERENCE_MISSING',
        ids: expect.objectContaining({ featureId: 'missing' }),
      }),
    );
  });

  it('compiles nonnegative ratio values to point area without replacing the binding', async () => {
    const project = await fixture();
    project.design.sharedScales = [];
    const layer = project.narrative.scenes[0]!.layers[0]!;
    layer.technique = 'graduated-symbol';
    layer.encode = { attribute: 'value', visualVariable: 'size' };
    delete layer.classification;
    project.project.resources.data[0]!.attributes[1]!.level = 'ratio';
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value.scales[0]).toEqual(
      expect.objectContaining({
        kind: 'numeric-size',
        domain: [0, 50],
        radiusRange: [0, 16],
        counts: { valid: 6, missing: 1, invalid: 0 },
      }),
    );
  });

  it('retains registered media display metadata and declares remote network needs', async () => {
    const project = await fixture();
    const url = 'https://example.org/supplied-photo.jpg';
    project.project.resources.media.push({
      id: 'photo',
      kind: 'image',
      location: { type: 'url', url },
      attribution: { label: 'Supplied image', qualification: 'Illustrative only.' },
    });
    project.narrative.mediaAssets.push({
      id: 'photo',
      name: 'Supplied photo',
      kind: 'image',
      source: 'url',
      path: url,
      caption: 'A supplied image',
      credit: 'Image creator',
      location: [-77.2, 39.2],
    });
    project.narrative.scenes[0]!.media = [{ assetId: 'photo', placement: 'figure' }];
    project.narrative.scenes[0]!.mediaAnchors = [{ assetId: 'photo' }];
    const result = compileProject(project, STAGE1_CAPABILITIES);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value.resources).toContainEqual(
      expect.objectContaining({
        id: 'photo',
        remoteUrl: url,
        caption: 'A supplied image',
        credit: 'Image creator',
        qualification: 'Illustrative only.',
      }),
    );
    expect(result.value.scenes[0]!.mediaAnchors).toEqual([
      { assetId: 'photo', at: [-77.2, 39.2], trigger: 'marker' },
    ]);
    expect(result.value.requiredNetwork).toEqual([url]);
  });

  it('respects the supplied capability catalog and does not substitute a technique', async () => {
    const project = await fixture();
    const restricted = {
      ...STAGE1_CAPABILITIES,
      ids: STAGE1_CAPABILITIES.ids.filter((id) => id !== 'color.equal-interval'),
    };
    const result = compileProject(project, restricted);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'CAPABILITY_UNSUPPORTED',
        ids: expect.objectContaining({ scaleId: 'period-color' }),
      }),
    );
    const unknown = { version: '0.1.0', ids: ['invented'] } as unknown as CapabilityCatalog;
    expect(compileProject(project, unknown).diagnostics[0]?.code).toBe('CAPABILITY_UNSUPPORTED');
    const future = { version: '9.0.0', ids: [] } as unknown as CapabilityCatalog;
    expect(compileProject(project, future).diagnostics[0]?.code).toBe('VERSION_UNSUPPORTED');
  });
});
