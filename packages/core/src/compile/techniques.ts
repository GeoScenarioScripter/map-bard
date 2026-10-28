import type {
  Callout,
  Compiled,
  DataResource,
  DerivedSource,
  Diagnostic,
  LayerBinding,
  ResolvedTheme,
  ValidatedProject,
} from '@mapbard/schema';
import type { Feature } from './data.js';

type CompiledLayer = Compiled['scenes'][number]['layers'][number];

/** What a V2 technique module sees of one authored layer. */
export type TechniqueInput = {
  sceneId: string;
  layer: LayerBinding;
  resource: DataResource;
  features: Feature[];
  /** The authored layer's diagnostic path and IDs. */
  path: Diagnostic['path'];
  ids: Diagnostic['ids'];
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
