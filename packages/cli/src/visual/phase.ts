import { localProgress } from '@mapbard/schema/easing';
import type { CameraKeyframe, CameraTrack } from '@mapbard/schema';

/** `rest` while the camera holds still, `flight` while a scrub camera track moves it. */
export type Phase = 'rest' | 'flight';

/** Scene progress positions captured with screenshots (docs/m2-visual.md, item H). */
export const PROGRESS = [0, 0.5, 1] as const;
/** Spacing of the flight sweep across a moving camera track's range (item J1). */
export const SWEEP_STEP = 0.05;

const round = (value: number): number => Math.round(value * 1000) / 1000;
const sameCamera = (a: CameraKeyframe, b: CameraKeyframe): boolean =>
  a.zoom === b.zoom &&
  a.pitch === b.pitch &&
  a.bearing === b.bearing &&
  a.center[0] === b.center[0] &&
  a.center[1] === b.center[1];

/**
 * True when the camera moves at progress `p`: inside a scrub track's range (ends excluded, where
 * the camera arrives or has yet to leave), on a keyframe segment whose ends differ. Play and loop
 * cameras run on time, and captures settle them, so scroll position never shows them mid-move.
 */
export function cameraMoves(track: CameraTrack, p: number): boolean {
  const [start, end] = track.range;
  if (track.mode !== 'scrub' || !(p > start && p < end)) return false;
  const t = localProgress(track.range, p);
  return track.keyframes.some((frame, index) => {
    const next = track.keyframes[index + 1];
    return (
      next !== undefined &&
      next.at > frame.at &&
      frame.at <= t &&
      t <= next.at &&
      !sameCamera(frame, next)
    );
  });
}

export function phaseAt(track: CameraTrack, p: number): Phase {
  return cameraMoves(track, p) ? 'flight' : 'rest';
}

/** Whether a camera track ever moves under scroll, so the sweep has something to sample. */
export function sweeps(track: CameraTrack): boolean {
  return (
    track.mode === 'scrub' &&
    track.range[1] > track.range[0] &&
    track.keyframes.some((frame, index) => {
      const next = track.keyframes[index + 1];
      return next !== undefined && next.at > frame.at && !sameCamera(frame, next);
    })
  );
}

/**
 * Positions to sample in one scene, ascending: the captures at p = 0, 0.5 and 1, and for a
 * moving camera track every SWEEP_STEP across its range, ends included.
 */
export function samplePositions(track: CameraTrack): { p: number; capture: boolean }[] {
  const positions = new Map<number, boolean>(PROGRESS.map((p) => [p, true]));
  if (sweeps(track)) {
    const [start, end] = track.range;
    const steps = Math.floor(round((end - start) / SWEEP_STEP));
    for (let index = 0; index <= steps; index++) {
      const p = round(start + index * SWEEP_STEP);
      if (!positions.has(p)) positions.set(p, false);
    }
    if (!positions.has(end)) positions.set(end, false);
  }
  return [...positions].sort(([a], [b]) => a - b).map(([p, capture]) => ({ p, capture }));
}
