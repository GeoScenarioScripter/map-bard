import { z } from 'zod';

export const PROJECT_VERSION = '0.1.0' as const;
export const DESIGN_VERSION = '0.1.0' as const;
export const COMPILED_VERSION = '0.1.0' as const;

export const IdSchema = z.string().min(1);
export const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
export const RelativePathSchema = z.string().min(1);

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const ExtensionsSchema = z.record(
  z.string().regex(/^[^.]+(?:\.[^.]+)+$/),
  z.object({ required: z.boolean(), payload: JsonValueSchema }).strict(),
);

export const AttributionSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().url().optional(),
    creator: z.string().optional(),
    license: z.string().optional(),
    accessedAt: z.string().datetime().optional(),
    qualification: z.string().optional(),
  })
  .strict();

export const AttributeDeclarationSchema = z
  .object({
    name: IdSchema,
    observedType: z.enum(['number', 'string', 'boolean', 'date']),
    inferredLevel: z.enum(['nominal', 'ordinal', 'interval', 'ratio']),
    role: z.enum(['identifier', 'category', 'quantity']),
    level: z.enum(['nominal', 'ordinal', 'interval', 'ratio']),
    unit: z.string().min(1).nullable(),
    /** Reader-facing name, for example "Daily mean discharge"; `name` stays the column. */
    label: z.string().min(1).optional(),
    denominator: z
      .object({ sourceId: IdSchema, attribute: IdSchema, unit: z.string().min(1) })
      .strict()
      .optional(),
    override: z
      .object({ rationale: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict();

export const DataResourceSchema = z
  .object({
    id: IdSchema,
    kind: z.enum(['geojson', 'csv']),
    path: RelativePathSchema,
    sha256: DigestSchema,
    crs: z.literal('EPSG:4326'),
    featureId: z.discriminatedUnion('method', [
      z.object({ method: z.literal('geojson-id'), scope: z.literal('source') }).strict(),
      z
        .object({ method: z.literal('property'), property: IdSchema, scope: z.literal('source') })
        .strict(),
    ]),
    attributes: z.array(AttributeDeclarationSchema),
    attribution: AttributionSchema,
    observationLabel: z.string().optional(),
  })
  .strict();

export const MediaResourceSchema = z
  .object({
    id: IdSchema,
    kind: z.enum(['image', 'video']),
    location: z.discriminatedUnion('type', [
      z
        .object({ type: z.literal('local'), path: RelativePathSchema, sha256: DigestSchema })
        .strict(),
      z.object({ type: z.literal('url'), url: z.string().url() }).strict(),
    ]),
    posterId: IdSchema.optional(),
    attribution: AttributionSchema,
  })
  .strict();

export const ProjectSchema = z
  .object({
    projectVersion: z.literal(PROJECT_VERSION),
    id: IdSchema,
    revision: z.number().int().nonnegative(),
    artifacts: z.object({ narrative: RelativePathSchema, design: RelativePathSchema }).strict(),
    resources: z
      .object({ data: z.array(DataResourceSchema), media: z.array(MediaResourceSchema) })
      .strict(),
    extensions: ExtensionsSchema.optional(),
  })
  .strict();

export const InputSnapshotSchema = z
  .object({
    projectId: IdSchema,
    revision: z.number().int().nonnegative(),
    narrativeSha256: DigestSchema,
    designSha256: DigestSchema,
    manifestSha256: DigestSchema,
    resources: z.array(z.object({ id: IdSchema, sha256: DigestSchema }).strict()),
  })
  .strict();

export type Project = z.infer<typeof ProjectSchema>;
export type DataResource = z.infer<typeof DataResourceSchema>;
export type MediaResource = z.infer<typeof MediaResourceSchema>;
export type InputSnapshot = z.infer<typeof InputSnapshotSchema>;
