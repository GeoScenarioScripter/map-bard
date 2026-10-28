import { MIN_MARK_CONTRAST, withContrast } from '@mapbard/knowledge';
import {
  ARC_CONSTANT_WIDTH,
  ARC_HEIGHT,
  TRIP_WIDTH,
  type CompiledTrip,
  type Diagnostic,
  type JsonValue,
  type ResolvedScale,
  type V2Technique,
  type ValidatedProject,
} from '@mapbard/schema';
import type { Feature } from './data.js';
import type { TechniqueCompiler, TechniqueInput, TechniqueOutput } from './techniques.js';

// Arcs and trips (step 5.2, N), drawn by the deck.gl tier.

export const FLOWS_READY: readonly V2Technique[] = ['arc', 'trip'];

/** Feature IDs a diagnostic lists before it says how many more there are. */
const LISTED_IDS = 10;

type Position = [number, number];

/** The raw coordinates of a checked feature, or undefined when they are not a LineString. */
export function lineCoordinates(
  project: ValidatedProject,
  resourceId: string,
  index: number,
): { type: string; positions?: Position[] } {
  const data = project.dataMap[resourceId];
  if (!data || Array.isArray(data) || typeof data !== 'object' || !Array.isArray(data.features))
    return { type: 'missing' };
  const raw = data.features[index];
  const geometry = raw && !Array.isArray(raw) && typeof raw === 'object' ? raw.geometry : undefined;
  if (!geometry || Array.isArray(geometry) || typeof geometry !== 'object')
    return { type: 'missing' };
  const type = String(geometry.type);
  if (type !== 'LineString') return { type };
  // sourceFeatures already checked the coordinates against the geometry type.
  const positions = (geometry.coordinates as number[][]).map(
    (position): Position => [position[0]!, position[1]!],
  );
  return { type, positions };
}

/** Where an arc ends: its destination, which callouts on arcs point to. */
export function arcDestination(
  project: ValidatedProject,
  resourceId: string,
  feature: Feature,
): Position | undefined {
  const { positions } = lineCoordinates(project, resourceId, feature.index);
  return positions?.length === 2 ? positions[1] : undefined;
}

/** Half the drawn width of one arc, plus a halo, so a callout's leader stops at its edge. */
export function arcEndRadius(
  arc: { width: number },
  scale: ResolvedScale | undefined,
  properties: Record<string, JsonValue>,
  attribute: string | undefined,
): number {
  let width = arc.width;
  if (scale?.kind === 'numeric-width' && attribute) {
    const value = properties[attribute];
    const max = scale.domain[1];
    width =
      typeof value !== 'number' || !Number.isFinite(value)
        ? scale.noDataWidth
        : max === 0
          ? 0
          : (scale.maxWidth * value) / max;
  }
  return Math.round((width / 2 + 2) * 100) / 100;
}

function listIds(ids: readonly string[]): string {
  const shown = ids.slice(0, LISTED_IDS).join(', ');
  return ids.length > LISTED_IDS ? `${shown} and ${ids.length - LISTED_IDS} more` : shown;
}

function error(
  input: TechniqueInput,
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  artifact: Diagnostic['artifact'] = 'narrative',
): Diagnostic {
  return {
    code: 'VALUE_INVALID',
    severity: 'error',
    artifact,
    path,
    ids: input.ids,
    message,
    remedy,
  };
}

/**
 * deck.gl draws at sea level under MapLibre terrain, and its arcs break on the globe
 * (m2-visual.md, 5.0 results 2 and 7), so either basemap setting rules the flow techniques out.
 */
function basemapDiagnostics(input: TechniqueInput): Diagnostic[] {
  const basemap = input.project.authoredBasemap;
  const technique = input.layer.technique;
  const diagnostics: Diagnostic[] = [];
  if (basemap?.terrain)
    diagnostics.push({
      code: 'CAPABILITY_UNSUPPORTED',
      severity: 'error',
      artifact: 'project',
      path: ['basemap', 'terrain'],
      ids: input.ids,
      message: `The deck.gl tier draws ${technique} layers at sea level, under the terrain.`,
      remedy: `Remove basemap.terrain from this story, or draw layer ${input.layer.id} with a MapLibre technique such as line.`,
    });
  if (basemap?.projection === 'globe')
    diagnostics.push({
      code: 'CAPABILITY_UNSUPPORTED',
      severity: 'error',
      artifact: 'project',
      path: ['basemap', 'projection'],
      ids: input.ids,
      message: `The deck.gl tier cannot draw ${technique} layers on the globe.`,
      remedy: `Set basemap.projection to mercator, or draw layer ${input.layer.id} with a MapLibre technique such as line.`,
    });
  return diagnostics;
}

/** An author's constant colour wins; otherwise a flow takes the theme's accent, kept legible on land and water. */
function themedConstant(input: TechniqueInput) {
  const designed = input.project.design.scenes
    .find((scene) => scene.sceneId === input.sceneId)
    ?.layers.find((entry) => entry.layerId === input.layer.id)?.constant;
  if (designed?.color || input.layer.encode?.visualVariable === 'color') return undefined;
  const { accent, land, water } = input.theme.colors;
  return { ...designed, color: withContrast(accent, [land, water], MIN_MARK_CONTRAST) };
}

export const compileArc: TechniqueCompiler = (input) => {
  const diagnostics = basemapDiagnostics(input);
  const notArcs = input.features
    .filter((feature) => {
      const { positions } = lineCoordinates(input.project, input.resource.id, feature.index);
      return positions?.length !== 2;
    })
    .map((feature) => feature.id);
  if (notArcs.length)
    diagnostics.push(
      error(
        input,
        ['resources', 'data', input.resource.id, 'features'],
        `Arcs need LineStrings of exactly two positions, origin then destination; ${notArcs.length} feature(s) are not: ${listIds(notArcs)}.`,
        'Give each flow one origin and one destination position, or draw these lines with the line technique.',
        'data',
      ),
    );
  if (diagnostics.length) return { diagnostics };
  const { colors, ramps } = input.theme;
  const grounds = [colors.land, colors.water];
  // Direction reads from a low ramp colour at the origin to the accent at the destination.
  const origin = withContrast(ramps.sequential[1] ?? colors.muted, grounds, MIN_MARK_CONTRAST);
  const destination = withContrast(colors.accent, grounds, MIN_MARK_CONTRAST);
  const constant = themedConstant(input);
  return {
    diagnostics,
    layer: {
      ...(constant ? { constant: { ...constant, color: destination } } : {}),
      arc: {
        origin,
        destination,
        greatCircle: input.layer.arc?.greatCircle ?? false,
        height: ARC_HEIGHT,
        width: ARC_CONSTANT_WIDTH,
      },
    },
  };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR = 3600;
const DAY = 24 * HOUR;
/** Clock steps, smallest first; the first that keeps the clock within MAX_CLOCK_LABELS wins. */
const CLOCK_STEPS = [HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 7 * DAY, 30 * DAY];
const MAX_CLOCK_LABELS = 400;

/** ISO 8601 with an explicit UTC designator (Z or +00:00), parsed to epoch seconds. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]00:?00)$/;
function utcSeconds(value: JsonValue | undefined): number | undefined {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms / 1000 : undefined;
}

const pad = (value: number) => String(value).padStart(2, '0');
/** en-US date in UTC, for example "Sep 26, 2024". */
export function utcDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
/** en-US date and 24-hour time in UTC, for example "Sep 26, 2024, 18:00 UTC". */
export function utcClock(seconds: number, withTime: boolean): string {
  const date = new Date(seconds * 1000);
  return withTime
    ? `${utcDate(seconds)}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
    : `${utcDate(seconds)} (UTC)`;
}

/** Clock labels at a regular UTC step from the first step at or before `start`. */
export function tripClock(start: number, end: number): CompiledTrip['clock'] {
  const span = Math.max(0, end - start);
  const step =
    CLOCK_STEPS.find((candidate) => span / candidate < MAX_CLOCK_LABELS) ?? CLOCK_STEPS.at(-1)!;
  const withTime = step < DAY;
  const clock: CompiledTrip['clock'] = [];
  for (let tick = Math.floor(start / step) * step; tick <= end; tick += step)
    clock.push({ at: Math.max(0, tick - start), label: utcClock(Math.max(tick, start), withTime) });
  return clock;
}

export const compileTrip: TechniqueCompiler = (input): TechniqueOutput => {
  const diagnostics = basemapDiagnostics(input);
  const options = input.layer.trip;
  if (!options) {
    diagnostics.push(
      error(
        input,
        [...input.path, 'trip'],
        'A trip layer needs trip.timeProperty and trip.trailHours.',
        'Add "trip": { "timeProperty": "times", "trailHours": 24 } naming the per-vertex time property.',
      ),
    );
    return { diagnostics };
  }
  const notLines: string[] = [];
  const badTimes: string[] = [];
  let start = Infinity;
  let end = -Infinity;
  for (const feature of input.features) {
    const { positions } = lineCoordinates(input.project, input.resource.id, feature.index);
    if (!positions) {
      notLines.push(feature.id);
      continue;
    }
    const raw = feature.properties[options.timeProperty];
    const times = Array.isArray(raw) ? raw.map(utcSeconds) : [];
    const ok =
      times.length === positions.length &&
      times.every(
        (time, index): time is number =>
          time !== undefined && (index === 0 || time >= times[index - 1]!),
      );
    if (!ok) {
      badTimes.push(feature.id);
      continue;
    }
    start = Math.min(start, times[0] as number);
    end = Math.max(end, times.at(-1) as number);
  }
  if (notLines.length)
    diagnostics.push(
      error(
        input,
        ['resources', 'data', input.resource.id, 'features'],
        `Trips need LineStrings; ${notLines.length} feature(s) are not: ${listIds(notLines)}.`,
        'Split multi-part tracks into one LineString per track.',
        'data',
      ),
    );
  if (badTimes.length)
    diagnostics.push(
      error(
        input,
        ['resources', 'data', input.resource.id, 'features', 'properties', options.timeProperty],
        `${options.timeProperty} must hold one ISO 8601 UTC time per vertex, in ascending order; ${badTimes.length} feature(s) do not: ${listIds(badTimes)}.`,
        'Give each vertex a time such as "2024-09-26T18:00:00Z", earliest first.',
        'data',
      ),
    );
  if (!diagnostics.length && start === Infinity)
    diagnostics.push(
      error(
        input,
        ['resources', 'data', input.resource.id, 'features'],
        'A trip layer needs at least one timed track.',
        'Add LineString features with per-vertex times.',
        'data',
      ),
    );
  if (diagnostics.length) return { diagnostics };
  const constant = themedConstant(input);
  const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
  const sameYear =
    new Date(start * 1000).getUTCFullYear() === new Date(end * 1000).getUTCFullYear();
  const rangeLabel = sameYear
    ? `${utcDate(start).replace(/, \d{4}$/, '')} to ${utcDate(end)} (UTC)`
    : `${utcDate(start)} to ${utcDate(end)} (UTC)`;
  return {
    diagnostics,
    layer: {
      ...(constant ? { constant } : {}),
      trip: {
        timeProperty: options.timeProperty,
        start: iso(start),
        end: iso(end),
        durationSeconds: end - start,
        trailSeconds: options.trailHours * HOUR,
        width: TRIP_WIDTH,
        rangeLabel,
        clock: tripClock(start, end),
      },
    },
  };
};
