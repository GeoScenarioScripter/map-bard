import type { V2Technique } from '@mapbard/schema';
import { pendingTechnique, type TechniqueCompiler } from './techniques.js';

// Change symbols and morph values (step 5.2, M). Signed and percent change are computed here at
// compile time, from two declared observations matched by feature ID, until M3 moves the
// operation into lockfile results with the same definition.

export const CHANGE_READY: readonly V2Technique[] = [];

export const compileChange: TechniqueCompiler = (input) => pendingTechnique(input);
