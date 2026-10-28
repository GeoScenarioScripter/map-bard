import type {
  Callout,
  Compiled,
  DataResource,
  DerivedSource,
  Diagnostic,
  LayerBinding,
  LayerTrack,
  ResolvedScale,
  ResolvedTheme,
  ValidatedProject,
} from '@mapbard/schema';
import type { CapabilityId } from '@mapbard/knowledge';
import type { Comparison, Feature } from './data.js';

type CompiledLayer = Compiled['scenes'][number]['layers'][number];

/** What a technique module may look up beyond its own layer: other sources, scenes and scales. */
export type TechniqueContext = {
  project: ValidatedProject;
  theme: ResolvedTheme;
  /** The layer's checked comparison filter, if any. */
  filter?: Comparison;
  /** Checked features of any GeoJSON data resource (empty for an unknown one). */
  featuresOf(sourceId: string): Feature[];
  /** The shared scale a layer belongs to, if any. */
  sharedScaleOf(sceneId: string, layerId: string): string | undefined;
  /** Whether the catalog has a capability; a missing one is diagnosed at `path`. */
  capability(id: CapabilityId, path: Diagnostic['path']): boolean;
};

/** What a V2 technique module sees of one authored layer. */
export type TechniqueInput = {
  sceneId: string;
  layer: LayerBinding;
  resource: DataResource;
  features: Feature[];
  /** The authored layer's diagnostic path and IDs. */
  path: Diagnostic['path'];
  ids: Diagnostic['ids'];
  /** Supplied by the compiler; tests of modules that need no lookups may leave it out. */
  context?: TechniqueContext;
  /** The whole project, for raw geometry, other sources and the authored basemap. */
  project: ValidatedProject;
  /** The resolved theme, for colours a technique derives. */
  theme: ResolvedTheme;
};

/** A module's additions for one layer; errors keep the layer out of the build. */
export type TechniqueOutput = {
  diagnostics: Diagnostic[];
  /** Technique fields of the compiled layer, merged over the common ones. */
  layer?: Partial<CompiledLayer>;
  derived?: DerivedSource[];
  callouts?: Callout[];
  /** Scales the module resolves itself, such as a hexbin's colour classes over its cells. */
  scales?: ResolvedScale[];
  /**
   * Values the layer draws besides its own attribute (a change symbol's before-values); they
   * join the layer's local scale. A shared scale spans only its member layers.
   */
  scaleValues?: unknown[];
  /** Checks that need every resolved scale; they run before callouts are placed. */
  afterScales?: (scales: readonly ResolvedScale[]) => Diagnostic[];
  /** Tracks the layer gets unless the author animates the same property. */
  defaultTracks?: Omit<LayerTrack, 'runtimeLayerId'>[];
};

export type TechniqueCompiler = (input: TechniqueInput) => TechniqueOutput;

/** The diagnostic a stub module returns until its step (M or N) fills it in. */
export function pendingTechnique(input: TechniqueInput): TechniqueOutput {
  return {
    diagnostics: [
      {
        code: 'CAPABILITY_UNSUPPORTED',
        severity: 'error',
        artifact: 'narrative',
        path: [...input.path, 'technique'],
        ids: input.ids,
        message: `Technique ${input.layer.technique} is not compiled yet.`,
        remedy: 'Use a technique that mapbard capabilities lists.',
      },
    ],
  };
}
