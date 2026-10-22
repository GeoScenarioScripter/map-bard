import type { CameraState, SceneMotion } from '@mapbard/schema';

type AuthoredCamera = {
  center: readonly [number, number] | [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
};

export function resolveCamera(camera: AuthoredCamera): CameraState {
  return {
    center: [camera.center[0], camera.center[1]],
    zoom: camera.zoom,
    pitch: camera.pitch ?? 0,
    bearing: camera.bearing ?? 0,
  };
}

/**
 * Built-in motion for a scene: one viewport of scroll and a camera that holds
 * the authored view. Authored motion and presets resolve on top of this.
 */
export function resolveSceneMotion(scene: { camera: AuthoredCamera }): SceneMotion {
  const camera = resolveCamera(scene.camera);
  return {
    scrollLength: 1,
    trigger: 0.5,
    reducedMotion: 'step',
    camera: {
      mode: 'scrub',
      range: [0, 1],
      keyframes: [{ at: 0, ...camera, easing: 'linear' }],
      final: camera,
    },
    layers: [],
  };
}
