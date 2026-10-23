import type { V2Technique } from '@mapbard/schema';
import { pendingTechnique, type TechniqueCompiler } from './techniques.js';

// Columns and extrusions (step 5.2, M): MapLibre `fill-extrusion` on the numeric-height scale.

export const HEIGHT_READY: readonly V2Technique[] = [];

export const compileColumn: TechniqueCompiler = (input) => pendingTechnique(input);

export const compileExtrusion: TechniqueCompiler = (input) => pendingTechnique(input);
