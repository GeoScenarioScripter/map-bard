import { z } from 'zod';
import { IdSchema } from './project.js';
import { HexColorSchema } from './theme.js';

/**
 * Compiled fields of the flow techniques (step 5.2, N), which the deck.gl tier draws: arcs from
 * origin to destination and trips animated along their timed vertices.
 */

/** Arc rise as a share of the arc's length; lower than deck.gl's 1 so continental arcs stay in frame. */
export const ARC_HEIGHT = 0.25;

/** Width of an arc without a width encoding, in CSS pixels. */
export const ARC_CONSTANT_WIDTH = 2;

/** Width of a trip's path, in CSS pixels. */
export const TRIP_WIDTH = 3;

export const CompiledArcSchema = z
  .object({
    /** Colours at the origin and the destination, so direction reads; a colour scale replaces both. */
    origin: HexColorSchema,
    destination: HexColorSchema,
    greatCircle: z.boolean(),
    /** Rise as a share of the arc's length. */
    height: z.number().finite().nonnegative().max(2),
    /** Width without a width scale, in CSS pixels. */
    width: z.number().finite().positive(),
  })
  .strict();

/** One clock label: shown while the trip's time is at or past `at`. */
export const TripClockSchema = z
  .object({
    /** Seconds after the trip's start. */
    at: z.number().finite().nonnegative(),
    label: z.string().min(1),
  })
  .strict();

export const CompiledTripSchema = z
  .object({
    /** The feature property holding one ISO 8601 UTC time per vertex. */
    timeProperty: IdSchema,
    /** The earliest and latest vertex times, as ISO 8601 UTC strings. */
    start: z.string().datetime(),
    end: z.string().datetime(),
    /** Seconds from start to end. */
    durationSeconds: z.number().finite().nonnegative(),
    /** How long a vertex stays drawn behind the clock, in seconds. */
    trailSeconds: z.number().finite().positive(),
    /** Path width in CSS pixels. */
    width: z.number().finite().positive(),
    /** en-US UTC text for the whole domain, shown while the full tracks are drawn. */
    rangeLabel: z.string().min(1),
    /** en-US UTC clock labels at regular steps, in ascending order. */
    clock: z.array(TripClockSchema).min(1),
  })
  .strict();

export type CompiledArc = z.infer<typeof CompiledArcSchema>;
export type CompiledTrip = z.infer<typeof CompiledTripSchema>;
export type TripClock = z.infer<typeof TripClockSchema>;
