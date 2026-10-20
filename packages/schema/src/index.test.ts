import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GeoNarrativeSchema,
  SCHEMA_VERSION,
  parseGeoNarrative,
  safeParseGeoNarrative,
  type GeoNarrative,
} from './index.js';

/** Load the authored project example. */
function loadExample(): unknown {
  const path = fileURLToPath(
    new URL('../../../examples/projects/first-slice/narrative.geonarrative.json', import.meta.url),
  );
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** A structural clone so each test can mutate its own copy. */
function exampleClone(): GeoNarrative {
  // The example is known-valid, so parse once to get a typed object to mutate.
  return parseGeoNarrative(loadExample());
}

describe('SCHEMA_VERSION', () => {
  it('matches the example fixture', () => {
    const example = loadExample() as { schemaVersion: string };
    expect(example.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('the hand-written example', () => {
  it('validates against GeoNarrativeSchema', () => {
    expect(safeParseGeoNarrative(loadExample()).success).toBe(true);
  });

  it('exercises panel media', () => {
    const story = exampleClone();
    const hasPanelMedia = story.scenes.some((s) => (s.media?.length ?? 0) > 0);
    expect(hasPanelMedia).toBe(true);
  });

  it('accepts a control bound to a layer in its scene', () => {
    const story = exampleClone();
    story.scenes[0]!.controls = [
      {
        id: 'opacity',
        kind: 'slider',
        label: 'Opacity',
        bindsTo: { layerId: 'gauges', property: 'opacity' },
        range: [0, 1],
      },
    ];
    expect(safeParseGeoNarrative(story).success).toBe(true);
  });
});

describe('structural validation', () => {
  it('rejects a missing required field (discourse.narrativeRole)', () => {
    const broken = exampleClone() as unknown as Record<string, unknown>;
    const scenes = broken.scenes as Array<{ discourse: Record<string, unknown> }>;
    delete scenes[0]!.discourse.narrativeRole;
    expect(safeParseGeoNarrative(broken).success).toBe(false);
  });

  it('rejects an invalid enum value (technique)', () => {
    const broken = exampleClone();
    // @ts-expect-error deliberately writing an out-of-enum value
    broken.scenes[0]!.layers[0]!.technique = 'isosurface';
    expect(safeParseGeoNarrative(broken).success).toBe(false);
  });

  it('parseGeoNarrative throws on invalid input', () => {
    expect(() => parseGeoNarrative({ id: 'x' })).toThrow();
  });
});

describe('referential integrity', () => {
  it('rejects a dangling SceneMedia assetId', () => {
    const broken = exampleClone();
    broken.scenes[0]!.media = [{ assetId: 'img-does-not-exist', placement: 'figure' }];
    const result = safeParseGeoNarrative(broken);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('unknown assetId'))).toBe(true);
    }
  });

  it('rejects a dangling MediaAnchor assetId', () => {
    const broken = exampleClone();
    broken.scenes[1]!.mediaAnchors = [{ assetId: 'nope', trigger: 'marker' }];
    expect(safeParseGeoNarrative(broken).success).toBe(false);
  });

  it('rejects a layer referencing an unknown dataSourceId', () => {
    const broken = exampleClone();
    broken.scenes[0]!.layers[0]!.dataSourceId = 'ghost-source';
    expect(safeParseGeoNarrative(broken).success).toBe(false);
  });

  it('rejects a control bound to a layer not in its scene', () => {
    const broken = exampleClone();
    broken.scenes[1]!.controls = [
      {
        id: 'opacity',
        kind: 'slider',
        label: 'Opacity',
        bindsTo: { layerId: 'lyr-from-another-scene', property: 'opacity' },
        range: [0, 1],
      },
    ];
    expect(safeParseGeoNarrative(broken).success).toBe(false);
  });

  it('accepts the example once references are restored', () => {
    // Sanity guard: the clone helper must itself produce a valid object.
    expect(GeoNarrativeSchema.safeParse(exampleClone()).success).toBe(true);
  });
});
