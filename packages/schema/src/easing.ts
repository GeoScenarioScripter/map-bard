/**
 * Motion math shared by the compiler and the browser player. This module must
 * stay free of runtime imports (no Zod) because the IIFE player bundles it
 * through the `@mapbard/schema/easing` entry.
 */
import type { CameraKeyframe, CameraState, Easing, LayerTrack } from './motion.js';

const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t * t;
  return (x: number) => {
    // Newton steps, then bisection when the slope is too flat to trust.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = curve(x1, x2, t) - x;
      if (Math.abs(error) < 1e-7) return curve(y1, y2, t);
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t = clamp01(t - error / d);
    }
    let low = 0;
    let high = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      const value = curve(x1, x2, t);
      if (Math.abs(value - x) < 1e-7) break;
      if (value < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return curve(y1, y2, t);
  };
}

/**
 * A unit-mass spring released from 0 towards 1, stretched over its own settle
 * time so that progress 1 is always the resting value (it may overshoot before).
 */
function spring(stiffness: number, damping: number) {
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * omega);
  const position = (time: number): number => {
    if (zeta < 1) {
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      return (
        1 -
        Math.exp(-zeta * omega * time) *
          (Math.cos(wd * time) + ((zeta * omega) / wd) * Math.sin(wd * time))
      );
    }
    if (zeta === 1) return 1 - Math.exp(-omega * time) * (1 + omega * time);
    const root = Math.sqrt(zeta * zeta - 1);
    const r1 = -omega * (zeta - root);
    const r2 = -omega * (zeta + root);
    return 1 - (r2 * Math.exp(r1 * time) - r1 * Math.exp(r2 * time)) / (r2 - r1);
  };
  // Settle when the envelope falls under 0.1% of the travel.
  const decay = zeta < 1 ? zeta * omega : omega * (zeta - Math.sqrt(Math.max(0, zeta * zeta - 1)));
  const settle = Math.min(60, Math.log(1000) / Math.max(decay, 1e-3));
  return (t: number) => (t >= 1 ? 1 : position(t * settle));
}

const NAMED: Record<string, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': cubicBezier(0.42, 0, 1, 1),
  'ease-out': cubicBezier(0, 0, 0.58, 1),
  'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
  'expo-out': (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

/** Eased progress for `t` in [0, 1]; 0 maps to 0 and 1 maps to 1 for every easing. */
export function ease(easing: Easing, t: number): number {
  const x = clamp01(t);
  if (x === 0 || x === 1) return x;
  if (typeof easing === 'string') return NAMED[easing]!(x);
  if (easing.kind === 'cubic-bezier') return cubicBezier(...easing.points)(x);
  return spring(easing.stiffness, easing.damping)(x);
}

/** Local track progress for scene progress `p` and a `[start, end]` range. */
export function localProgress(range: readonly [number, number], p: number): number {
  const [start, end] = range;
  if (end <= start) return p >= start ? 1 : 0;
  return clamp01((p - start) / (end - start));
}

/** Linear camera blend; bearings blend as authored numbers, so the compiler unwraps turns. */
export function mixCamera(a: CameraState, b: CameraState, w: number): CameraState {
  return {
    center: [
      a.center[0] + (b.center[0] - a.center[0]) * w,
      a.center[1] + (b.center[1] - a.center[1]) * w,
    ],
    zoom: a.zoom + (b.zoom - a.zoom) * w,
    pitch: a.pitch + (b.pitch - a.pitch) * w,
    bearing: a.bearing + (b.bearing - a.bearing) * w,
  };
}

function segment<K extends { at: number; easing: Easing }>(frames: readonly K[], t: number) {
  if (t <= frames[0]!.at) return { from: frames[0]!, to: frames[0]!, w: 0 };
  for (let i = 1; i < frames.length; i++) {
    const to = frames[i]!;
    if (t <= to.at) {
      const from = frames[i - 1]!;
      const span = to.at - from.at;
      return { from, to, w: span > 0 ? ease(to.easing, (t - from.at) / span) : 1 };
    }
  }
  const last = frames[frames.length - 1]!;
  return { from: last, to: last, w: 0 };
}

const stateOf = (frame: CameraKeyframe): CameraState => ({
  center: frame.center,
  zoom: frame.zoom,
  pitch: frame.pitch,
  bearing: frame.bearing,
});

/** Camera at local progress `t`; the last keyframe is the track's final state. */
export function sampleCameraKeyframes(frames: readonly CameraKeyframe[], t: number): CameraState {
  const { from, to, w } = segment(frames, t);
  return mixCamera(stateOf(from), stateOf(to), w);
}

export function sampleLayerKeyframes(frames: LayerTrack['keyframes'], t: number): number {
  const { from, to, w } = segment(frames, t);
  return from.value + (to.value - from.value) * w;
}
