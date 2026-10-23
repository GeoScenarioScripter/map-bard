import type { V2Technique } from '@mapbard/schema';
import { pendingTechnique, type TechniqueCompiler } from './techniques.js';

// Arcs and trips (step 5.2, N), drawn by the deck.gl tier.

export const FLOWS_READY: readonly V2Technique[] = [];

export const compileArc: TechniqueCompiler = (input) => pendingTechnique(input);

export const compileTrip: TechniqueCompiler = (input) => pendingTechnique(input);
