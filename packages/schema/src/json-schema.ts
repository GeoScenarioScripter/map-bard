import { zodToJsonSchema } from 'zod-to-json-schema';
import { ProjectV2Schema, StoryV2Schema } from './format-v2.js';

/** Editor-facing JSON Schema for the two authored format 0.2 files. */
export function projectJsonSchema(): object {
  return zodToJsonSchema(ProjectV2Schema, { name: 'mapbard.json', target: 'jsonSchema7' });
}

export function storyJsonSchema(): object {
  return zodToJsonSchema(StoryV2Schema, { name: 'story.json', target: 'jsonSchema7' });
}
