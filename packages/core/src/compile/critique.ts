import type { Compiled, Diagnostic, ValidatedProject } from '@mapbard/schema';
import { critique, type CriticFeature } from '@mapbard/knowledge';
import { sourceFeatures } from './data.js';

/** Run the static critic over a compiled project; findings are warnings and never block a build. */
export function critiqueProject(project: ValidatedProject, compiled: Compiled): Diagnostic[] {
  const features: Record<string, CriticFeature[]> = {};
  for (const resource of project.project.resources.data) {
    if (resource.kind !== 'geojson') continue;
    // Data problems were already reported by the compiler.
    features[resource.id] = sourceFeatures(project, resource, []);
  }
  return critique({ compiled, features });
}
