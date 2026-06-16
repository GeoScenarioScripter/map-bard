/**
 * Stage 1 — Plan (build-guide §5).
 *
 * `(data profiles + media profiles, intent) → GeoNarrative` with scenes filled
 * at the **content + narration + discourse** level, and relevant media attached
 * by `assetId` only. The model never invents data or media — it references the
 * registered ids. Visual bindings (`layers`, `controls`, refined `camera`) are
 * Stage 2's job; here each scene gets an empty `layers` list and a default
 * camera framed on the data extent.
 *
 * The model's freedom is constrained to a small plan object validated against a
 * Zod schema built from the *known* asset ids, so a dangling media reference is
 * caught and repaired by the adapter like any other schema violation. A
 * post-assembly **fit check** surfaces a question (rather than inventing data)
 * when a scene claims a process/change but no source is temporal.
 */
import { z } from 'zod';
import {
  ContentDimensionsSchema,
  DiscourseDimensionsSchema,
  MediaAnchorSchema,
  SceneMediaSchema,
  parseGeoNarrative,
  SCHEMA_VERSION,
  type Camera,
  type DataSource,
  type Extent,
  type GeoNarrative,
  type MediaAsset,
  type Scene,
} from '@mapbard/schema';
import type { LlmAdapter } from '../llm/adapter.js';
import { slugify } from '../stage0/ingest-types.js';

/** Inputs to the Plan stage: Stage 0 outputs plus the user's intent. */
export interface PlanInput {
  intent: string;
  dataSources: DataSource[];
  mediaAssets: MediaAsset[];
  /** Optional title override; otherwise the model proposes one. */
  title?: string;
}

export interface PlanOptions {
  /** Soft cap given to the model (default 6). */
  maxScenes?: number;
}

export interface PlanResult {
  /** A schema-valid planned narrative (layers still empty — Stage 2 fills them). */
  narrative: GeoNarrative;
  /** Fit-check questions to surface to the user; empty when nothing is flagged. */
  questions: string[];
}

/** The constrained object the model emits — inferred per call via {@link makePlanSchema}. */
interface PlanScene {
  title: string;
  narration: string;
  content: z.infer<typeof ContentDimensionsSchema>;
  discourse: z.infer<typeof DiscourseDimensionsSchema>;
  media?: z.infer<typeof SceneMediaSchema>[];
  mediaAnchors?: z.infer<typeof MediaAnchorSchema>[];
}

interface PlanOutput {
  title: string;
  scenes: PlanScene[];
}

/**
 * Build the plan schema for this call. Media `assetId`s are refined against the
 * known set so the adapter repairs invented references; with no media, the
 * media/anchor arrays must be empty.
 */
export function makePlanSchema(assetIds: readonly string[]): z.ZodType<PlanOutput> {
  const known = new Set(assetIds);
  const list = assetIds.join(', ') || '(none registered)';

  const sceneMedia = SceneMediaSchema.superRefine((m, ctx) => {
    if (!known.has(m.assetId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown assetId "${m.assetId}". Only these media assets exist: ${list}. Do not invent media.`,
        path: ['assetId'],
      });
    }
  });

  const mediaAnchor = MediaAnchorSchema.superRefine((a, ctx) => {
    if (!known.has(a.assetId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown assetId "${a.assetId}". Only these media assets exist: ${list}. Do not invent media.`,
        path: ['assetId'],
      });
    }
  });

  const planScene = z.object({
    title: z.string().min(1),
    narration: z.string().min(1),
    content: ContentDimensionsSchema,
    discourse: DiscourseDimensionsSchema,
    media: z.array(sceneMedia).optional(),
    mediaAnchors: z.array(mediaAnchor).optional(),
  });

  return z.object({
    title: z.string().min(1),
    scenes: z.array(planScene).min(1),
  }) as z.ZodType<PlanOutput>;
}

/**
 * Run the Plan stage. The `adapter` validates the model's output against the
 * generated plan schema (with repair/retry); this function then assembles the
 * full `GeoNarrative` deterministically and runs the fit check.
 */
export async function planNarrative(
  input: PlanInput,
  adapter: LlmAdapter,
  options: PlanOptions = {},
): Promise<PlanResult> {
  const schema = makePlanSchema(input.mediaAssets.map((a) => a.id));
  const system = buildSystemPrompt();
  const prompt = buildUserPrompt(input, options.maxScenes ?? 6);

  const plan = await adapter.complete({ system, prompt, schema });

  const narrative = parseGeoNarrative(assembleNarrative(input, plan));
  const questions = fitCheck(narrative);
  return { narrative, questions };
}

// ---------------------------------------------------------------------------
// Deterministic assembly (no LLM)
// ---------------------------------------------------------------------------

function assembleNarrative(input: PlanInput, plan: PlanOutput): GeoNarrative {
  const camera = cameraFromExtent(unionExtents(input.dataSources));
  const title = input.title ?? plan.title;

  const scenes: Scene[] = plan.scenes.map((s, i) => {
    const scene: Scene = {
      id: `scene-${i + 1}`,
      title: s.title,
      narration: s.narration,
      content: s.content,
      discourse: s.discourse,
      layers: [], // Stage 2 (Design) fills these.
      camera,
    };
    if (s.media && s.media.length > 0) scene.media = s.media;
    if (s.mediaAnchors && s.mediaAnchors.length > 0) scene.mediaAnchors = s.mediaAnchors;
    return scene;
  });

  return {
    id: slugify(title),
    title,
    intent: input.intent,
    dataSources: input.dataSources,
    mediaAssets: input.mediaAssets,
    scenes,
    basemap: { style: 'mapbard-neutral' },
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Fit check (build-guide §5): if a scene asserts a process/change but no data
 * source carries a temporal extent, surface a question instead of letting the
 * story imply change the data can't support.
 */
function fitCheck(narrative: GeoNarrative): string[] {
  const hasTemporal = narrative.dataSources.some((d) => d.profile.temporalExtent !== undefined);
  if (hasTemporal) return [];

  const questions: string[] = [];
  narrative.scenes.forEach((scene, i) => {
    if (scene.content.process) {
      questions.push(
        `Scene ${i + 1} ("${scene.title}") describes change over time ("${scene.content.process}"), ` +
          `but no data source has a temporal extent. Supply time-stamped data or revise the scene ` +
          `rather than implying change the data can't show.`,
      );
    }
  });
  return questions;
}

/** Union of every source's bounding box, if any are known. */
export function unionExtents(sources: DataSource[]): Extent | undefined {
  const extents = sources.map((s) => s.profile.extent).filter((e): e is Extent => Array.isArray(e));
  if (extents.length === 0) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [a, b, c, d] of extents) {
    minX = Math.min(minX, a);
    minY = Math.min(minY, b);
    maxX = Math.max(maxX, c);
    maxY = Math.max(maxY, d);
  }
  return [minX, minY, maxX, maxY];
}

/**
 * A sensible default camera framing an extent. A coarse Web-Mercator-ish zoom
 * heuristic — Stage 2 refines per-scene framing; this just keeps the data in
 * view if the plan is rendered as-is.
 */
export function cameraFromExtent(extent: Extent | undefined): Camera {
  if (!extent) return { center: [0, 0], zoom: 1 };
  const [minX, minY, maxX, maxY] = extent;
  const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const span = Math.max(maxX - minX, maxY - minY);
  let zoom = span > 0 ? Math.log2(360 / span) : 12;
  zoom = Math.max(1, Math.min(16, Math.round(zoom * 10) / 10));
  return { center, zoom };
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return [
    'You are MapBard, a planner that turns geographic data, supporting media, and a user intent',
    'into a linear scrollytelling map story (a sequence of scenes over one sticky map).',
    '',
    'Your job is ONLY to plan: decide the ordered scenes, write narration prose, fill each',
    "scene's content dimensions, set its discourse, and attach relevant media. You do NOT",
    'choose map layers, colors, cameras, or controls — a later deterministic stage does that.',
    '',
    'Output a single JSON object (no prose, no code fences) with this exact shape:',
    '{',
    '  "title": string,',
    '  "scenes": [',
    '    {',
    '      "title": string,',
    '      "narration": string,            // the prose shown for this scene',
    '      "content": {                    // all fields optional; use only what fits',
    '        "semantics"?: string,         // the point / what it means',
    '        "location"?: string,          // place + time framing in words',
    '        "geometry"?: string,          // which features/shapes are in focus',
    '        "attribute"?: string,         // which measured property matters',
    '        "relationship"?: string,      // comparisons/links between elements',
    '        "process"?: string            // change over time — ONLY if temporal data exists',
    '      },',
    '      "discourse": {',
    '        "narrativeRole": "establish" | "develop" | "compare" | "reveal" | "drill" | "resolve",',
    '        "emphasis": "low" | "medium" | "high",',
    '        "readerAgency": "none" | "guided" | "open"',
    '      },',
    '      "media"?: [ { "assetId": string, "placement"?: "inline" | "figure" | "background", "caption"?: string } ],',
    '      "mediaAnchors"?: [ { "assetId": string, "at"?: [lon, lat], "trigger"?: "marker" | "auto", "label"?: string } ]',
    '    }',
    '  ]',
    '}',
    '',
    'Hard rules:',
    '- Reference ONLY the media assetIds listed in the input. Never invent media.',
    '- Put place-bound media (a photo of a spot) in mediaAnchors; put illustrative media in media.',
    '- Only use content.process when a data source has a temporalExtent. Do not imply change',
    "  the data can't show.",
    '- A scene uses only the content dimensions it needs — do not force all of them.',
    '- Ground every scene in the supplied data: name real attributes and places from the profiles.',
  ].join('\n');
}

function buildUserPrompt(input: PlanInput, maxScenes: number): string {
  const dataSources = input.dataSources.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    geometryType: s.profile.geometryType,
    featureCount: s.profile.featureCount,
    extent: s.profile.extent,
    temporalExtent: s.profile.temporalExtent,
    attributes: s.profile.attributes.map((a) => ({
      name: a.name,
      dataType: a.dataType,
      measurement: a.measurement,
      sample: a.sample,
    })),
  }));

  const mediaAssets = input.mediaAssets.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    caption: a.caption,
    credit: a.credit,
    location: a.location,
  }));

  return [
    `INTENT: ${input.intent}`,
    '',
    `Plan a coherent linear story of 2 to ${maxScenes} scenes that serves this intent.`,
    '',
    'DATA SOURCES:',
    JSON.stringify(dataSources, null, 2),
    '',
    'MEDIA ASSETS (reference only these ids; empty means no media available):',
    JSON.stringify(mediaAssets, null, 2),
  ].join('\n');
}
