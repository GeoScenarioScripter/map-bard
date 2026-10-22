import { z } from 'zod';
import { IdSchema } from './project.js';

export const DiagnosticSchema = z
  .object({
    code: z.enum([
      'VERSION_UNSUPPORTED',
      'FIELD_UNKNOWN',
      'EXTENSION_REQUIRED',
      'ID_DUPLICATE',
      'REFERENCE_MISSING',
      'REFERENCE_AMBIGUOUS',
      'RESOURCE_MISSING',
      'RESOURCE_HASH_MISMATCH',
      'ASSET_PATH_INVALID',
      'ASSET_COLLISION',
      'CAPABILITY_UNSUPPORTED',
      'MEASUREMENT_REQUIRED',
      'MEASUREMENT_INCOMPATIBLE',
      'VALUE_INVALID',
      'INPUT_STALE',
      // Critic rules (warnings): honest, readable cartography.
      'TEXT_RAW_IDENTIFIER',
      'TEXT_UNIT_UNFORMATTED',
      'ENCODING_CONTRAST_HIDDEN',
      'SCALE_INCONSISTENT',
      'PALETTE_CONTRAST_LOW',
      'TEXT_OVERFLOW_LIKELY',
      // Visual checks (`mapbard check --visual`) and size budgets.
      'VISUAL_OCCLUSION',
      'VISUAL_RUNTIME',
      'VISUAL_BROWSER_MISSING',
      'VISUAL_GOLDEN_MISMATCH',
      'BUDGET_EXCEEDED',
    ]),
    severity: z.enum(['error', 'warning']),
    artifact: z.enum(['project', 'narrative', 'design', 'data', 'media', 'compiled', 'export']),
    path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
    ids: z
      .object({
        sceneId: IdSchema.optional(),
        layerId: IdSchema.optional(),
        sourceId: IdSchema.optional(),
        featureId: IdSchema.optional(),
        assetId: IdSchema.optional(),
        scaleId: IdSchema.optional(),
        annotationId: IdSchema.optional(),
      })
      .strict(),
    message: z.string().min(1),
    remedy: z.string().min(1),
    counts: z
      .object({
        missing: z.number().int().nonnegative().optional(),
        invalid: z.number().int().nonnegative().optional(),
        total: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type Result<T> =
  | { ok: true; value: T; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };
