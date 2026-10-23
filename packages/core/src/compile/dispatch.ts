import { V2_TECHNIQUES, type V2Technique } from '@mapbard/schema';
import { AGGREGATE_READY, compileHexbin } from './aggregate.js';
import { CHANGE_READY, compileChange } from './change.js';
import { FLOWS_READY, compileArc, compileTrip } from './flows.js';
import { HEIGHT_READY, compileColumn, compileExtrusion } from './height.js';
import type { TechniqueCompiler } from './techniques.js';

/** Each V2 technique compiles in its own module, so the M and N workers never share a file. */
export const TECHNIQUE_COMPILERS: Record<V2Technique, TechniqueCompiler> = {
  column: compileColumn,
  extrusion: compileExtrusion,
  change: compileChange,
  hexbin: compileHexbin,
  arc: compileArc,
  trip: compileTrip,
};

/** V2 techniques whose module is implemented; the rest still answer CAPABILITY_UNSUPPORTED. */
export const READY_V2_TECHNIQUES: readonly V2Technique[] = [
  ...HEIGHT_READY,
  ...CHANGE_READY,
  ...AGGREGATE_READY,
  ...FLOWS_READY,
];

const THREE_D: readonly V2Technique[] = ['column', 'extrusion', 'change', 'hexbin'];
/** V2 capability IDs and track properties, with the techniques that make them usable. */
const NEEDS: Partial<Record<string, readonly V2Technique[]>> = {
  'height.column': ['column'],
  'height.extrusion': ['extrusion'],
  'change.symbol': ['change'],
  'aggregate.hexbin': ['hexbin'],
  'flow.arc': ['arc'],
  'flow.trip': ['trip'],
  'motion.grow': THREE_D,
  'motion.morph': THREE_D,
  'motion.trail': ['trip'],
  grow: THREE_D,
  morph: THREE_D,
  trail: ['trip'],
  ...Object.fromEntries(V2_TECHNIQUES.map((technique) => [technique, [technique]])),
};

/**
 * Whether a technique, capability ID or track property compiles today. V1 names always do; a
 * V2 name does once one of the techniques it needs is ready, so `capabilities` never lists stubs.
 */
export function compilerReady(name: string): boolean {
  const needs = NEEDS[name];
  return !needs || needs.some((technique) => READY_V2_TECHNIQUES.includes(technique));
}
