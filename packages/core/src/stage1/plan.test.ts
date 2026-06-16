import { describe, expect, it } from 'vitest';
import { parseGeoNarrative, type DataSource, type MediaAsset } from '@mapbard/schema';
import type { CompleteRequest, LlmAdapter } from '../llm/adapter.js';
import { cameraFromExtent, makePlanSchema, planNarrative, unionExtents } from './plan.js';

/** A stub adapter that runs the *real* plan schema over a canned object — so
 *  schema-level rules (e.g. assetId resolution) are exercised without network. */
function stubAdapter(raw: unknown): LlmAdapter {
  return {
    complete<T>(req: CompleteRequest<T>): Promise<T> {
      return Promise.resolve(req.schema.parse(raw));
    },
  };
}

const landmarks: DataSource = {
  id: 'landmarks',
  name: 'Landmarks',
  kind: 'geojson',
  path: 'data/landmarks.geojson',
  profile: {
    geometryType: 'point',
    featureCount: 3,
    attributes: [{ name: 'name', dataType: 'string', measurement: 'nominal' }],
    extent: [-122.5, 37.7, -122.3, 37.8],
  },
};

const temporalLandmarks: DataSource = {
  ...landmarks,
  profile: { ...landmarks.profile, temporalExtent: ['2019-01-01', '2024-01-01'] },
};

const skyline: MediaAsset = {
  id: 'skyline',
  name: 'Skyline',
  kind: 'image',
  source: 'local',
  path: 'media/skyline.png',
  caption: 'San Francisco skyline',
};

const validPlan = {
  title: 'SF Waterfront',
  scenes: [
    {
      title: 'The bay',
      narration: 'San Francisco meets the water.',
      content: { semantics: 'overview', location: 'San Francisco Bay' },
      discourse: { narrativeRole: 'establish', emphasis: 'medium', readerAgency: 'none' },
      media: [{ assetId: 'skyline', placement: 'figure' }],
    },
    {
      title: 'The Ferry Building',
      narration: 'A closer look at the landmarks.',
      content: { geometry: 'the three points' },
      discourse: { narrativeRole: 'develop', emphasis: 'high', readerAgency: 'guided' },
      mediaAnchors: [{ assetId: 'skyline', trigger: 'marker' }],
    },
  ],
};

describe('planNarrative', () => {
  it('assembles a schema-valid planned GeoNarrative', async () => {
    const { narrative } = await planNarrative(
      { intent: 'show the waterfront', dataSources: [landmarks], mediaAssets: [skyline] },
      stubAdapter(validPlan),
    );

    expect(() => parseGeoNarrative(narrative)).not.toThrow();
    expect(narrative.title).toBe('SF Waterfront');
    expect(narrative.intent).toBe('show the waterfront');
    expect(narrative.schemaVersion).toBe('0.1.0');
    expect(narrative.dataSources).toEqual([landmarks]);
    expect(narrative.mediaAssets).toEqual([skyline]);
    expect(narrative.scenes.map((s) => s.id)).toEqual(['scene-1', 'scene-2']);
  });

  it('leaves layers empty (Design fills them) and frames the camera on the data', async () => {
    const { narrative } = await planNarrative(
      { intent: 'x', dataSources: [landmarks], mediaAssets: [skyline] },
      stubAdapter(validPlan),
    );
    for (const scene of narrative.scenes) {
      expect(scene.layers).toEqual([]);
      expect(scene.camera.center[0]).toBeCloseTo(-122.4);
      expect(scene.camera.center[1]).toBeCloseTo(37.75);
    }
  });

  it('attaches panel media and map-anchored media by assetId', async () => {
    const { narrative } = await planNarrative(
      { intent: 'x', dataSources: [landmarks], mediaAssets: [skyline] },
      stubAdapter(validPlan),
    );
    expect(narrative.scenes[0]?.media?.[0]?.assetId).toBe('skyline');
    expect(narrative.scenes[1]?.mediaAnchors?.[0]?.assetId).toBe('skyline');
  });

  it('honours a title override', async () => {
    const mediaFreePlan = {
      title: 'Model-proposed title',
      scenes: [
        {
          title: 'Solo scene',
          narration: 'Just the data.',
          content: { semantics: 'overview' },
          discourse: { narrativeRole: 'establish', emphasis: 'low', readerAgency: 'none' },
        },
      ],
    };
    const { narrative } = await planNarrative(
      { intent: 'x', dataSources: [landmarks], mediaAssets: [], title: 'Custom Title' },
      stubAdapter(mediaFreePlan),
    );
    expect(narrative.title).toBe('Custom Title');
  });

  it('rejects a plan that references an unregistered assetId (no media supplied)', async () => {
    await expect(
      planNarrative(
        { intent: 'x', dataSources: [landmarks], mediaAssets: [] },
        stubAdapter(validPlan), // validPlan cites "skyline", which is not registered here
      ),
    ).rejects.toThrow();
  });

  it('fit check: flags content.process when no source is temporal', async () => {
    const processPlan = {
      title: 'Change story',
      scenes: [
        {
          title: 'Erosion',
          narration: 'The bank receded.',
          content: { process: 'the north bank eroded over five years' },
          discourse: { narrativeRole: 'reveal', emphasis: 'high', readerAgency: 'none' },
        },
      ],
    };
    const { questions } = await planNarrative(
      { intent: 'show change', dataSources: [landmarks], mediaAssets: [] },
      stubAdapter(processPlan),
    );
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatch(/temporal extent/i);
  });

  it('fit check: stays silent when a source carries a temporal extent', async () => {
    const processPlan = {
      title: 'Change story',
      scenes: [
        {
          title: 'Erosion',
          narration: 'The bank receded.',
          content: { process: 'the north bank eroded over five years' },
          discourse: { narrativeRole: 'reveal', emphasis: 'high', readerAgency: 'none' },
        },
      ],
    };
    const { questions } = await planNarrative(
      { intent: 'show change', dataSources: [temporalLandmarks], mediaAssets: [] },
      stubAdapter(processPlan),
    );
    expect(questions).toEqual([]);
  });
});

describe('makePlanSchema', () => {
  it('accepts media that resolves to a registered asset', () => {
    expect(() => makePlanSchema(['skyline']).parse(validPlan)).not.toThrow();
  });

  it('rejects an unknown assetId with a helpful message', () => {
    const result = makePlanSchema(['other']).safeParse(validPlan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /unknown assetId/.test(i.message))).toBe(true);
    }
  });
});

describe('cameraFromExtent / unionExtents', () => {
  it('returns a sane default when no extent is known', () => {
    expect(cameraFromExtent(undefined)).toEqual({ center: [0, 0], zoom: 1 });
  });

  it('centers on the extent midpoint with a fitted zoom', () => {
    const cam = cameraFromExtent([-122.5, 37.7, -122.3, 37.8]);
    expect(cam.center[0]).toBeCloseTo(-122.4);
    expect(cam.center[1]).toBeCloseTo(37.75);
    expect(cam.zoom).toBeCloseTo(10.8, 1);
  });

  it('unions multiple source extents', () => {
    const a: DataSource = { ...landmarks, profile: { ...landmarks.profile, extent: [0, 0, 1, 1] } };
    const b: DataSource = { ...landmarks, profile: { ...landmarks.profile, extent: [2, -1, 3, 4] } };
    expect(unionExtents([a, b])).toEqual([0, -1, 3, 4]);
  });

  it('returns undefined when no source has an extent', () => {
    const noExtent: DataSource = {
      ...landmarks,
      profile: { geometryType: 'none', featureCount: 0, attributes: [] },
    };
    expect(unionExtents([noExtent])).toBeUndefined();
  });
});
