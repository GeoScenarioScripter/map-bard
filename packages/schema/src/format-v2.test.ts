import { describe, expect, it } from 'vitest';
import { ProjectV2Schema, StoryV2Schema } from './format-v2.js';
import { projectJsonSchema, storyJsonSchema } from './json-schema.js';

describe('authored format 0.2', () => {
  it('exports JSON Schemas for editor completion', () => {
    const project = projectJsonSchema();
    const story = storyJsonSchema();
    expect(JSON.stringify(project)).toContain('formatVersion');
    expect(JSON.stringify(story)).toContain('sharedScales');
    expect(JSON.stringify(project)).toContain('additionalProperties');
  });

  it('rejects unknown fields and unsupported versions', () => {
    expect(ProjectV2Schema.safeParse({ formatVersion: '9.0.0' }).success).toBe(false);
    expect(
      StoryV2Schema.safeParse({
        formatVersion: '0.2.0',
        scenes: [],
        sharedScales: [],
        invented: true,
      }).success,
    ).toBe(false);
    expect(
      StoryV2Schema.safeParse({
        formatVersion: '0.2.0',
        sharedScales: [],
        scenes: [
          {
            id: 's',
            title: 'Scene',
            narration: '',
            layers: [
              {
                id: 'l',
                sourceId: 'data',
                technique: 'point',
                encode: { attribute: 'value', visualVariable: 'color', invented: true },
              },
            ],
            camera: { center: [0, 0], zoom: 2 },
            annotations: [],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
