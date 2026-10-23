import type { V2Technique } from '@mapbard/schema';
import { pendingTechnique, type TechniqueCompiler } from './techniques.js';

// Hexbins (step 5.2, M): a Web Mercator hexagon grid anchored at (0, 0), aggregated at compile
// time into a derived polygon source with provenance.

export const AGGREGATE_READY: readonly V2Technique[] = [];

export const compileHexbin: TechniqueCompiler = (input) => pendingTechnique(input);
