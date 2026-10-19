import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseCompiled,
  parseProjectArtifacts,
  validateProject,
  validateProjectReferences,
} from './project-validation.js';
import type { JsonValue } from './project.js';

function json(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`../../../docs/stage-1/specimens/${name}`, import.meta.url), 'utf8'),
  );
}
function fixture() {
  return {
    project: json('mapbard.project.json'),
    narrative: json('narrative.geonarrative.json'),
    design: json('design.json'),
  };
}
function fullData(): Record<string, JsonValue> {
  return {
    'period-a': json('data/period-a.geojson') as JsonValue,
    'period-b': json('data/period-b.geojson') as JsonValue,
  };
}
function codes(result: { diagnostics: { code: string }[] }) {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

describe('g1-r1 project contracts', () => {
  it('accepts a loaded project with matching snapshot and byte membership', () => {
    const inputs = fixture();
    const snapshot = (json('compiled.expected.json') as { input: unknown }).input;
    const loaded = {
      ...inputs,
      root: 'fixture-root',
      dataMap: fullData(),
      dataBytes: ['period-a', 'period-b'].map((id) => ({
        id,
        bytes: readFileSync(
          new URL(`../../../docs/stage-1/specimens/data/${id}.geojson`, import.meta.url),
        ),
      })),
      input: snapshot,
      resolvedAssets: [],
    };
    expect(validateProject(loaded).ok).toBe(true);
    (loaded.input as { resources: { id: string }[] }).resources.pop();
    expect(codes(validateProject(loaded))).toContain('INPUT_STALE');
  });

  it('parses the frozen positive specimens and full-data references', () => {
    const parsed = parseProjectArtifacts(fixture());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(validateProjectReferences(parsed.value, fullData()).ok).toBe(true);
    expect(parseCompiled(json('compiled.expected.json')).ok).toBe(true);
  });

  it('dispatches versions before parsing and rejects unknown nested fields', () => {
    const input = fixture();
    (input.project as Record<string, unknown>).projectVersion = '9.0.0';
    const unsupported = parseProjectArtifacts(input);
    expect(codes(unsupported)).toContain('VERSION_UNSUPPORTED');
    expect(unsupported.diagnostics[0]?.path).toEqual(['projectVersion']);

    const nested = fixture();
    const scenes = (nested.design as { scenes: Record<string, unknown>[] }).scenes;
    scenes[0]!.unregistered = true;
    const unknown = parseProjectArtifacts(nested);
    expect(unknown.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FIELD_UNKNOWN',
          artifact: 'design',
          path: ['scenes', 0, 'unregistered'],
        }),
      ]),
    );

    const narrative = fixture();
    const rawScenes = (narrative.narrative as { scenes: { layers: Record<string, unknown>[] }[] })
      .scenes;
    rawScenes[0]!.layers[0]!.unregistered = true;
    expect(parseProjectArtifacts(narrative).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FIELD_UNKNOWN',
          artifact: 'narrative',
          path: ['scenes', 0, 'layers', 0, 'unregistered'],
        }),
      ]),
    );
  });

  it('round-trips optional JSON extensions and blocks required extensions', () => {
    const input = fixture();
    (input.design as Record<string, unknown>).extensions = {
      'org.example.tool': { required: false, payload: { typed: [1, true, null, 'x'] } },
    };
    const parsed = parseProjectArtifacts(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.design.extensions).toEqual(
      (input.design as Record<string, unknown>).extensions,
    );
    expect(validateProjectReferences(parsed.value, fullData()).ok).toBe(true);
    parsed.value.design.extensions!['org.example.tool']!.required = true;
    expect(codes(validateProjectReferences(parsed.value, fullData()))).toContain(
      'EXTENSION_REQUIRED',
    );
  });

  it('diagnoses duplicate scene IDs and mismatched comparison members', () => {
    const input = fixture();
    (input.narrative as { scenes: { id: string }[] }).scenes[1]!.id = 'a';
    const parsed = parseProjectArtifacts(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(validateProjectReferences(parsed.value, fullData()).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ID_DUPLICATE', path: ['scenes', 1, 'id'] }),
      ]),
    );

    const other = parseProjectArtifacts(fixture());
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    other.value.design.sharedScales[0]!.members[1]!.sourceId = 'period-a';
    expect(validateProjectReferences(other.value, fullData()).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REFERENCE_MISSING',
          path: ['sharedScales', 0, 'members', 1, 'sourceId'],
        }),
      ]),
    );
  });

  it('checks feature targets against full data rather than profile samples', () => {
    const parsed = parseProjectArtifacts(fixture());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    parsed.value.design.scenes[0]!.annotations[0]!.target = {
      kind: 'features',
      sourceId: 'period-a',
      featureIds: ['missing'],
    };
    expect(validateProjectReferences(parsed.value, fullData()).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REFERENCE_MISSING',
          path: ['scenes', 0, 'annotations', 0, 'target', 'featureIds', 0],
        }),
      ]),
    );
  });

  it('rejects duplicate feature keys, including a numeric/string collision', () => {
    const parsed = parseProjectArtifacts(fixture());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const data = fullData();
    const features = (data['period-a'] as { features: { id: string | number }[] }).features;
    features[1]!.id = 1;
    features[0]!.id = '1';
    expect(validateProjectReferences(parsed.value, data).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REFERENCE_AMBIGUOUS',
          artifact: 'data',
          path: ['features', 1, 'id'],
        }),
      ]),
    );
  });

  it('requires declared quantities and compatible units for shared numeric scales', () => {
    const parsed = parseProjectArtifacts(fixture());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const first = parsed.value.project.resources.data[0]!.attributes[1]!;
    first.role = 'identifier';
    first.level = 'nominal';
    first.unit = null;
    expect(codes(validateProjectReferences(parsed.value, fullData()))).toContain(
      'MEASUREMENT_REQUIRED',
    );
    first.role = 'quantity';
    first.level = 'interval';
    first.unit = 'other units';
    expect(codes(validateProjectReferences(parsed.value, fullData()))).toContain(
      'MEASUREMENT_INCOMPATIBLE',
    );
  });

  it('rejects unsafe paths and invalid feature coordinates', () => {
    const parsed = parseProjectArtifacts(fixture());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    parsed.value.project.resources.data[0]!.path = '../period-a.geojson';
    const data = fullData();
    const features = (data['period-a'] as { features: { geometry: { coordinates: number[] } }[] })
      .features;
    features[0]!.geometry.coordinates = [190, 39];
    const result = validateProjectReferences(parsed.value, data);
    expect(codes(result)).toContain('ASSET_PATH_INVALID');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VALUE_INVALID',
          artifact: 'data',
          path: ['features', 0, 'geometry', 'coordinates'],
        }),
      ]),
    );
  });

  it('rejects inconsistent compiled scales and resource locations', () => {
    const compiled = json('compiled.expected.json') as {
      scales: { edges: number[] }[];
      resources: { bundlePath?: string; remoteUrl?: string }[];
    };
    compiled.scales[0]!.edges = [0, 40, 40, 120];
    compiled.resources[0]!.remoteUrl = 'https://example.com/also-remote';
    const result = parseCompiled(compiled);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'VALUE_INVALID', path: ['scales', 0] }),
        expect.objectContaining({ code: 'VALUE_INVALID', path: ['resources', 0] }),
      ]),
    );
  });
});
