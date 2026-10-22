import {
  ease,
  parseEasingText,
  type AuthoredEasing,
  type AuthoredMotion,
  type CameraKeyframe,
  type CameraMotion,
  type CameraState,
  type CameraTrack,
  type Diagnostic,
  type Easing,
  type LayerMotion,
  type LayerTrack,
  type MotionMode,
  type ResolvedLayout,
  type SceneMotion,
  type TrackDefaults,
  type Trigger,
} from '@mapbard/schema';
import type { CapabilityId } from '@mapbard/knowledge';
import {
  bounds,
  boundsCenter,
  chainPath,
  fitZoom,
  lineParts,
  pathWalker,
  positions,
  simplify,
  unwrap,
  type Position,
} from './geometry.js';

type AuthoredCamera = {
  center: readonly [number, number] | [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
};
type Path = Diagnostic['path'];
type Where = { artifact: 'narrative' | 'project'; path: Path };
type ResolvedDefaults = {
  mode: MotionMode;
  easing: AuthoredEasing;
  durationMs: number;
  delayMs: number;
};

/** Built-in defaults: the camera scrubs with scroll, data plays once, ambient effects loop. */
export const MOTION_DEFAULTS = {
  scrollLength: 1,
  trigger: 0.5,
  reducedMotion: 'step',
  camera: { mode: 'scrub', easing: 'ease-in-out', durationMs: 1600, delayMs: 0 },
  data: { mode: 'play', easing: 'ease-out', durationMs: 900, delayMs: 0 },
  ambient: { mode: 'loop', easing: 'ease-in-out', durationMs: 2400, delayMs: 0 },
} as const satisfies {
  scrollLength: number;
  trigger: number;
  reducedMotion: SceneMotion['reducedMotion'];
  camera: ResolvedDefaults;
  data: ResolvedDefaults;
  ambient: ResolvedDefaults;
};

/** Width of the player's right-hand rail (renderer `RAIL_WIDTH`); presets frame the map beside it. */
const RAIL_WIDTH = 280;
const REFERENCE_VIEWPORT = { width: 1440, height: 900 };
const FLY_ALONG_SAMPLES = 25;

export type MotionLayer = {
  authoredLayerId: string;
  runtimeId: string;
  sourceId: string;
  geometry: 'point' | 'line' | 'polygon';
  scaleId?: string;
};

export type MotionInput = {
  scene: { id: string; camera: AuthoredCamera };
  sceneIndex: number;
  authored?: AuthoredMotion;
  /** Compiled layers of this scene. */
  layers: readonly MotionLayer[];
  controls: readonly { runtimeLayerId: string; property: string }[];
  /** Registered data source IDs. */
  sourceIds: readonly string[];
  /** Raw GeoJSON geometry of one feature, or undefined when the source has no such feature. */
  feature(
    sourceId: string,
    featureId: string,
  ): { type?: unknown; coordinates?: unknown } | undefined;
  /** Every feature geometry of a source. */
  sourceGeometries(sourceId: string): { type?: unknown; coordinates?: unknown }[];
  layout: ResolvedLayout;
  capability(id: CapabilityId, path: Path, ids: Diagnostic['ids']): boolean;
  diagnostics: Diagnostic[];
};

export function resolveCamera(camera: AuthoredCamera): CameraState {
  return {
    center: [camera.center[0], camera.center[1]],
    zoom: camera.zoom,
    pitch: camera.pitch ?? 0,
    bearing: camera.bearing ?? 0,
  };
}

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
};

function roundCamera(state: CameraState): CameraState {
  return {
    center: [round(state.center[0], 6), round(state.center[1], 6)],
    zoom: round(state.zoom, 3),
    pitch: round(state.pitch, 2),
    bearing: round(state.bearing, 2),
  };
}

export function resolveEasing(easing: AuthoredEasing): Easing {
  if (typeof easing !== 'string') return easing;
  if (easing.includes('(')) return parseEasingText(easing)!;
  return easing as Easing;
}

export function resolveTrigger(trigger: Trigger): number {
  return trigger === 'top' ? 0 : trigger === 'center' ? 0.5 : trigger;
}

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function omit<T extends object>(value: T, keys: readonly string[]): T {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key))) as T;
}

const CAMERA_SHAPE_KEYS = ['preset', 'feature', 'degrees', 'from', 'reverse', 'keyframes'];
const LAYER_SHAPE_KEYS = ['from', 'to', 'keyframes'];

/** Most specific wins; a new preset or keyframes replaces the general move's shape. */
function mergeCamera(general: CameraMotion, specific: CameraMotion): CameraMotion {
  const base =
    specific.preset !== undefined || specific.keyframes !== undefined
      ? omit(general, CAMERA_SHAPE_KEYS)
      : general;
  return { ...base, ...defined(specific) };
}

function mergeLayer(general: LayerMotion, specific: LayerMotion): LayerMotion {
  const base =
    specific.keyframes !== undefined || specific.from !== undefined || specific.to !== undefined
      ? omit(general, LAYER_SHAPE_KEYS)
      : general;
  return { ...base, ...defined(specific) };
}

const PRESET_CAPABILITY: Record<string, CapabilityId | undefined> = {
  hold: undefined,
  'reveal-from-overview': 'camera.reveal-from-overview',
  'push-in': 'camera.push-in',
  orbit: 'camera.orbit',
  'fly-along': 'camera.fly-along',
};
const LAYER_CAPABILITY: Record<LayerTrack['property'], CapabilityId> = {
  opacity: 'motion.layer-opacity',
  'line-reveal': 'motion.line-reveal',
  highlight: 'motion.highlight',
};

type Frame = { at: number; state: CameraState; easing: Easing };

/** Resolve the authored cascade into compiled tracks for one scene. */
export function resolveSceneMotion(input: MotionInput): SceneMotion {
  const { scene, sceneIndex, authored, diagnostics } = input;
  const sceneMotion = authored?.scenes[scene.id];
  const story = authored?.story;
  const scenePath: Path = ['scenes', sceneIndex, 'motion'];
  const ids = { sceneId: scene.id };
  const problem = (
    code: Diagnostic['code'],
    where: Where,
    message: string,
    remedy: string,
    extra: Diagnostic['ids'] = {},
  ) =>
    diagnostics.push({
      code,
      severity: 'error',
      artifact: where.artifact,
      path: where.path,
      ids: { ...ids, ...extra },
      message,
      remedy,
    });

  const presetName = sceneMotion?.preset;
  const preset = presetName !== undefined ? authored?.presets?.[presetName] : undefined;
  if (presetName !== undefined && !preset)
    problem(
      'REFERENCE_MISSING',
      { artifact: 'narrative', path: [...scenePath, 'preset'] },
      `Motion preset ${presetName} is not defined in motionPresets.`,
      `Add "${presetName}" to motionPresets in mapbard.json or correct the preset name (known: ${
        Object.keys(authored?.presets ?? {}).join(', ') || 'none'
      }).`,
    );
  const presetPath: Path = ['motionPresets', presetName ?? ''];

  const defaults = (kind: 'camera' | 'data' | 'ambient'): ResolvedDefaults => ({
    ...MOTION_DEFAULTS[kind],
    ...defined(story?.[kind] ?? ({} as TrackDefaults)),
  });
  const scrollLength =
    sceneMotion?.scrollLength ??
    preset?.scrollLength ??
    story?.scrollLength ??
    MOTION_DEFAULTS.scrollLength;
  const trigger = resolveTrigger(
    sceneMotion?.trigger ?? preset?.trigger ?? story?.trigger ?? MOTION_DEFAULTS.trigger,
  );
  const reducedMotion =
    sceneMotion?.reducedMotion ??
    preset?.reducedMotion ??
    story?.reducedMotion ??
    MOTION_DEFAULTS.reducedMotion;

  // ---- camera ----
  const sceneCamera = resolveCamera(scene.camera);
  const scenePart = sceneMotion?.camera;
  const presetPart = preset?.camera;
  let moves: CameraMotion[] = [];
  let where: Where = { artifact: 'narrative', path: [...scenePath, 'camera'] };
  if (scenePart !== undefined && presetPart !== undefined && !Array.isArray(scenePart)) {
    moves = Array.isArray(presetPart) ? [scenePart] : [mergeCamera(presetPart, scenePart)];
  } else if (scenePart !== undefined) moves = Array.isArray(scenePart) ? scenePart : [scenePart];
  else if (presetPart !== undefined) {
    moves = Array.isArray(presetPart) ? presetPart : [presetPart];
    where = { artifact: 'project', path: [...presetPath, 'camera'] };
  }
  const cameraDefaults = defaults('camera');
  const camera = resolveCameraTrack(input, moves, where, cameraDefaults, sceneCamera, problem);

  // ---- layers ----
  const merged = new Map<string, { track: LayerMotion; where: Where }>();
  const collect = (tracks: readonly LayerMotion[] | undefined, base: Where) => {
    const seen = new Set<string>();
    tracks?.forEach((track, index) => {
      const key = `${track.layerId}\u0000${track.property}`;
      const at: Where = { artifact: base.artifact, path: [...base.path, index] };
      if (seen.has(key)) {
        problem(
          'ID_DUPLICATE',
          at,
          `Layer ${track.layerId} has two ${track.property} tracks.`,
          'Keep one track per layer property, and sequence values with keyframes.',
          { layerId: track.layerId },
        );
        return;
      }
      seen.add(key);
      const previous = merged.get(key);
      merged.set(key, { track: previous ? mergeLayer(previous.track, track) : track, where: at });
    });
  };
  collect(preset?.layers, { artifact: 'project', path: [...presetPath, 'layers'] });
  collect(sceneMotion?.layers, { artifact: 'narrative', path: [...scenePath, 'layers'] });
  const layers: LayerTrack[] = [];
  for (const { track, where: at } of merged.values()) {
    const resolved = resolveLayerTrack(input, track, at, defaults, problem);
    if (resolved) layers.push(resolved);
  }

  return { scrollLength, trigger, reducedMotion, camera, layers };
}

type Problem = (
  code: Diagnostic['code'],
  where: Where,
  message: string,
  remedy: string,
  extra?: Diagnostic['ids'],
) => void;

function referenceArea(layout: ResolvedLayout) {
  const frame = layout.desktop;
  const { width, height } = REFERENCE_VIEWPORT;
  const gutter = frame.gutter;
  const padding = { left: gutter, right: gutter, top: gutter, bottom: gutter };
  const reserve =
    frame.reserve.unit === 'vh' ? (height * frame.reserve.size) / 100 : frame.reserve.size;
  if (frame.reserve.edge === 'left') padding.left = Math.max(padding.left, reserve);
  else padding.bottom = Math.max(padding.bottom, reserve);
  if (frame.rail === 'right') padding.right = Math.max(padding.right, RAIL_WIDTH + 2 * gutter);
  return {
    width: Math.max(120, width - padding.left - padding.right),
    height: Math.max(120, height - padding.top - padding.bottom),
  };
}

function resolveFeatures(
  input: MotionInput,
  refs: string | readonly string[] | undefined,
  where: Where,
  problem: Problem,
) {
  const list = refs === undefined ? [] : typeof refs === 'string' ? [refs] : refs;
  const out: { ref: string; geometry: { type?: unknown; coordinates?: unknown } }[] = [];
  list.forEach((ref, index) => {
    const at: Where = {
      artifact: where.artifact,
      path:
        typeof refs === 'string' ? [...where.path, 'feature'] : [...where.path, 'feature', index],
    };
    const sourceId = [...input.sourceIds]
      .filter((id) => ref.startsWith(`${id}/`))
      .sort((a, b) => b.length - a.length)[0];
    if (!sourceId) {
      problem(
        'REFERENCE_MISSING',
        at,
        `Feature reference ${ref} names no registered data source.`,
        'Write <sourceId>/<featureId> with a source registered in mapbard.json.',
        { sourceId: ref.split('/')[0]! },
      );
      return;
    }
    const featureId = ref.slice(sourceId.length + 1);
    const geometry = input.feature(sourceId, featureId);
    if (!geometry) {
      problem(
        'REFERENCE_MISSING',
        at,
        `Source ${sourceId} has no feature ${featureId}.`,
        'Use a feature ID from the source (see mapbard inspect).',
        { sourceId, featureId },
      );
      return;
    }
    out.push({ ref, geometry });
  });
  return out;
}

function resolveCameraTrack(
  input: MotionInput,
  moves: readonly CameraMotion[],
  where: Where,
  defaults: ResolvedDefaults,
  sceneCamera: CameraState,
  problem: Problem,
): CameraTrack {
  const held = (state: CameraState): CameraTrack => {
    const final = roundCamera(state);
    return {
      mode: defaults.mode === 'play' || defaults.mode === 'loop' ? 'scrub' : defaults.mode,
      range: [0, 1],
      keyframes: [{ at: 0, ...final, easing: 'linear' }],
      final,
    };
  };
  if (!moves.length) return held(sceneCamera);
  const sequence = moves.length > 1;
  const at = (index: number): Where =>
    sequence ? { artifact: where.artifact, path: [...where.path, index] } : where;
  const modes = moves.map((move) => move.mode ?? defaults.mode);
  const mode = modes[0]!;
  if (modes.some((entry) => entry !== mode))
    problem(
      'VALUE_INVALID',
      where,
      'Camera moves in one scene must share one mode.',
      'Give every move in the sequence the same mode.',
    );
  if (sequence && (mode === 'play' || mode === 'loop'))
    problem(
      'CAPABILITY_UNSUPPORTED',
      where,
      `A sequence of camera moves cannot ${mode}; it is placed by scroll ranges.`,
      'Use scrub or step for a sequence, or a single move with keyframes for a timed flight.',
    );
  const ranges = moves.map(
    (move, index) =>
      move.range ?? ([index / moves.length, (index + 1) / moves.length] as [number, number]),
  );
  ranges.forEach((range, index) => {
    if (index > 0 && range[0] < ranges[index - 1]![1])
      problem(
        'VALUE_INVALID',
        { artifact: where.artifact, path: [...at(index).path, 'range'] },
        'Camera move ranges overlap or are out of order.',
        'Give each move a range that starts at or after the previous one ends.',
      );
  });
  const area = referenceArea(input.layout);
  let base = sceneCamera;
  const frames: Frame[] = [];
  moves.forEach((move, index) => {
    const easing = resolveEasing(move.easing ?? defaults.easing);
    const local = buildMove(input, move, at(index), base, sceneCamera, easing, mode, area, problem);
    const [start, end] = ranges[index]!;
    for (const [frameIndex, frame] of local.entries())
      frames.push({
        at: start + frame.at * (end - start),
        state: frame.state,
        easing: frames.length === 0 ? 'linear' : frameIndex === 0 ? easing : frame.easing,
      });
    base = local.at(-1)?.state ?? base;
  });
  if (!frames.length) return held(sceneCamera);
  const range: [number, number] = [ranges[0]![0], ranges.at(-1)![1]];
  const span = range[1] - range[0];
  const keyframes: CameraKeyframe[] = frames.map((frame) => ({
    at: round(span > 0 ? (frame.at - range[0]) / span : 0, 4),
    ...roundCamera(frame.state),
    easing: frame.easing,
  }));
  const last = keyframes.at(-1)!;
  const first = moves[0]!;
  return {
    mode,
    range,
    ...(mode === 'play' || mode === 'loop'
      ? {
          durationMs: first.durationMs ?? defaults.durationMs,
          ...((first.delayMs ?? defaults.delayMs) > 0
            ? { delayMs: first.delayMs ?? defaults.delayMs }
            : {}),
        }
      : {}),
    keyframes,
    final: { center: last.center, zoom: last.zoom, pitch: last.pitch, bearing: last.bearing },
  };
}

function overrides(state: CameraState, move: CameraMotion): CameraState {
  return {
    center: state.center,
    zoom: move.zoom ?? state.zoom,
    pitch: move.pitch ?? state.pitch,
    bearing: move.bearing ?? state.bearing,
  };
}

/** Frames of one move with `at` local to the move's range. */
function buildMove(
  input: MotionInput,
  move: CameraMotion,
  where: Where,
  base: CameraState,
  sceneCamera: CameraState,
  easing: Easing,
  mode: MotionMode,
  area: { width: number; height: number },
  problem: Problem,
): Frame[] {
  const preset = move.preset ?? (move.keyframes ? undefined : 'hold');
  const capability = preset ? PRESET_CAPABILITY[preset] : 'camera.keyframes';
  if (
    capability &&
    !input.capability(capability, [...where.path, preset ? 'preset' : 'keyframes'], {
      sceneId: input.scene.id,
    })
  )
    return [];
  const needsFeature = preset === 'push-in' || preset === 'fly-along';
  if (needsFeature && move.feature === undefined) {
    problem(
      'VALUE_INVALID',
      { artifact: where.artifact, path: [...where.path, 'feature'] },
      `The ${preset} camera preset needs a feature.`,
      'Add "feature": "<sourceId>/<featureId>".',
    );
    return [];
  }
  const features = resolveFeatures(input, move.feature, where, problem);
  if (move.feature !== undefined && !features.length) return [];

  if (!preset) {
    let previous = base;
    return move.keyframes!.map((frame) => {
      previous = {
        center: frame.center ? [frame.center[0], frame.center[1]] : previous.center,
        zoom: frame.zoom ?? previous.zoom,
        pitch: frame.pitch ?? previous.pitch,
        bearing: frame.bearing ?? previous.bearing,
      };
      return {
        at: frame.at,
        state: previous,
        easing: frame.easing ? resolveEasing(frame.easing) : easing,
      };
    });
  }
  if (preset === 'hold') return [{ at: 0, state: overrides(base, move), easing }];

  if (preset === 'reveal-from-overview') {
    const target = overrides(sceneCamera, move);
    let start: CameraState | undefined = move.from ? resolveCamera(move.from) : undefined;
    if (!start) {
      const points = input.layers.flatMap((layer) =>
        input.sourceGeometries(layer.sourceId).flatMap((geometry) => positions(geometry)),
      );
      const box = bounds(points);
      if (!box) {
        problem(
          'VALUE_INVALID',
          { artifact: where.artifact, path: [...where.path, 'preset'] },
          'reveal-from-overview needs layer geometry or an explicit "from" camera.',
          'Add layers with features to the scene, or give the overview camera as "from".',
        );
        return [];
      }
      const zoom = fitZoom(box, area.width, area.height) ?? target.zoom - 2;
      // An overview is never closer than the scene's own view.
      start = {
        center: boundsCenter(box),
        zoom: Math.min(zoom, target.zoom - 0.5),
        pitch: 0,
        bearing: 0,
      };
    }
    return [
      { at: 0, state: start, easing: 'linear' },
      { at: 1, state: target, easing },
    ];
  }

  if (preset === 'push-in' || preset === 'orbit') {
    const box = features.length
      ? bounds(features.flatMap((entry) => positions(entry.geometry)))
      : undefined;
    const center: Position = box ? boundsCenter(box) : base.center;
    if (preset === 'push-in') {
      const fit = box ? fitZoom(box, area.width, area.height) : undefined;
      const zoom = move.zoom ?? Math.min(fit ?? base.zoom + 2, base.zoom + 4);
      return [
        { at: 0, state: base, easing: 'linear' },
        {
          at: 1,
          state: {
            center,
            zoom,
            pitch: move.pitch ?? base.pitch,
            bearing: move.bearing ?? base.bearing,
          },
          easing,
        },
      ];
    }
    const degrees = move.degrees ?? (mode === 'loop' ? 360 : 90);
    const orbitEasing: Easing = mode === 'loop' && move.easing === undefined ? 'linear' : easing;
    const start: CameraState = {
      center,
      zoom: move.zoom ?? base.zoom,
      pitch: move.pitch ?? (base.pitch || 45),
      bearing: move.bearing ?? base.bearing,
    };
    const steps = Math.max(2, Math.ceil(Math.abs(degrees) / 15));
    return Array.from({ length: steps + 1 }, (_, index) => {
      const t = index / steps;
      return {
        at: t,
        state: { ...start, bearing: start.bearing + degrees * ease(orbitEasing, t) },
        easing: 'linear' as Easing,
      };
    });
  }

  // fly-along
  const lines = features.map((entry) => lineParts(entry.geometry));
  const nonLine = features.findIndex((_, index) => lines[index]!.length === 0);
  if (nonLine >= 0) {
    const ref = features[nonLine]!.ref;
    problem(
      'VALUE_INVALID',
      {
        artifact: where.artifact,
        path:
          typeof move.feature === 'string'
            ? [...where.path, 'feature']
            : [...where.path, 'feature', nonLine],
      },
      `fly-along needs a line feature; ${ref} is not a LineString or MultiLineString.`,
      'Choose a line feature, or use push-in or orbit for a point or area.',
      { featureId: ref.slice(ref.indexOf('/') + 1) },
    );
    return [];
  }
  let path = chainPath(lines);
  if (move.reverse) path = path.reverse();
  const walker0 = pathWalker(path);
  if (path.length < 2 || walker0.total <= 0) {
    problem(
      'VALUE_INVALID',
      { artifact: where.artifact, path: [...where.path, 'feature'] },
      'fly-along needs a line with length.',
      'Choose a line feature with at least two distinct positions.',
    );
    return [];
  }
  const walker = pathWalker(simplify(path, walker0.total / 150));
  const zoom = move.zoom ?? base.zoom + 1;
  const pitch = move.pitch ?? 50;
  const window = walker.total * 0.06;
  let bearing = base.bearing;
  return Array.from({ length: FLY_ALONG_SAMPLES }, (_, index) => {
    const t = index / (FLY_ALONG_SAMPLES - 1);
    const distance = walker.total * ease(easing, t);
    const heading =
      move.bearing ?? unwrap(walker.azimuth(distance - window, distance + window), bearing);
    bearing = heading;
    return {
      at: t,
      state: { center: walker.at(distance), zoom, pitch, bearing: heading },
      easing: 'linear' as Easing,
    };
  });
}

function resolveLayerTrack(
  input: MotionInput,
  track: LayerMotion,
  where: Where,
  defaults: (kind: 'camera' | 'data' | 'ambient') => ResolvedDefaults,
  problem: Problem,
): LayerTrack | undefined {
  const layer = input.layers.find((entry) => entry.authoredLayerId === track.layerId);
  const ids = { layerId: track.layerId };
  if (!layer) {
    problem(
      'REFERENCE_MISSING',
      { artifact: where.artifact, path: [...where.path, 'layerId'] },
      `Layer ${track.layerId} is not a layer of scene ${input.scene.id}.`,
      'Animate a layer that the scene declares.',
      ids,
    );
    return undefined;
  }
  if (
    !input.capability(LAYER_CAPABILITY[track.property], [...where.path, 'property'], {
      sceneId: input.scene.id,
      layerId: track.layerId,
    })
  )
    return undefined;
  if (track.property === 'line-reveal' && layer.geometry !== 'line') {
    problem(
      'VALUE_INVALID',
      { artifact: where.artifact, path: [...where.path, 'property'] },
      `line-reveal draws lines; layer ${track.layerId} has ${layer.geometry} geometry.`,
      'Use opacity or highlight for points and areas.',
      ids,
    );
    return undefined;
  }
  if (track.property === 'line-reveal' && layer.scaleId) {
    problem(
      'CAPABILITY_UNSUPPORTED',
      { artifact: where.artifact, path: [...where.path, 'property'] },
      `line-reveal needs a constant-colour line; layer ${track.layerId} is colour-encoded.`,
      'Reveal a constant-colour line layer, or fade the encoded layer with opacity.',
      ids,
    );
    return undefined;
  }
  if (
    track.property === 'opacity' &&
    input.controls.some(
      (control) => control.runtimeLayerId === layer.runtimeId && control.property === 'opacity',
    )
  ) {
    problem(
      'VALUE_INVALID',
      { artifact: where.artifact, path: [...where.path, 'property'] },
      `Layer ${track.layerId} has a reader opacity control, so an opacity track would fight it.`,
      'Remove the opacity track or the opacity control.',
      ids,
    );
    return undefined;
  }
  const type = track.type ?? 'data';
  const kind = defaults(type);
  const mode = track.mode ?? kind.mode;
  const easing = resolveEasing(track.easing ?? kind.easing);
  let keyframes: LayerTrack['keyframes'];
  if (track.keyframes)
    keyframes = track.keyframes.map((frame, index) => ({
      at: frame.at,
      value: frame.value,
      easing: index === 0 ? 'linear' : frame.easing ? resolveEasing(frame.easing) : easing,
    }));
  else if (type === 'ambient') {
    const low = track.from ?? (track.property === 'opacity' ? 0.6 : 0);
    const high = track.to ?? 1;
    keyframes = [
      { at: 0, value: low, easing: 'linear' },
      { at: 0.5, value: high, easing },
      { at: 1, value: low, easing },
    ];
  } else
    keyframes = [
      { at: 0, value: track.from ?? 0, easing: 'linear' },
      { at: 1, value: track.to ?? 1, easing },
    ];
  const delayMs = track.delayMs ?? kind.delayMs;
  return {
    mode,
    range: track.range ?? [0, 1],
    ...(mode === 'play' || mode === 'loop'
      ? { durationMs: track.durationMs ?? kind.durationMs, ...(delayMs > 0 ? { delayMs } : {}) }
      : {}),
    runtimeLayerId: layer.runtimeId,
    property: track.property,
    keyframes,
    final: keyframes.at(-1)!.value,
  };
}
