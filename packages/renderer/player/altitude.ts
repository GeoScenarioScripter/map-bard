import type { Map as MapLibreMap } from 'maplibre-gl';

type MercatorConstructor = {
  fromLngLat(at: [number, number], altitude: number): { x: number; y: number; z: number };
};

/**
 * Project a Web Mercator coordinate (0–1 units, `z` in the same units) through a column-major
 * clip matrix to CSS pixels from the top left of a `width` × `height` canvas.
 */
export function projectThroughMatrix(
  matrix: ArrayLike<number>,
  at: { x: number; y: number; z: number },
  width: number,
  height: number,
): { x: number; y: number } | undefined {
  const m = matrix;
  const x = m[0]! * at.x + m[4]! * at.y + m[8]! * at.z + m[12]!;
  const y = m[1]! * at.x + m[5]! * at.y + m[9]! * at.z + m[13]!;
  const w = m[3]! * at.x + m[7]! * at.y + m[11]! * at.z + m[15]!;
  // Behind the camera: no screen position.
  if (!(w > 0)) return undefined;
  return { x: ((x / w + 1) / 2) * width, y: ((1 - y / w) / 2) * height };
}

/**
 * Projects points above the ground. MapLibre's `project` knows only the ground, so a no-op
 * custom layer keeps each frame's `defaultProjectionData.mainMatrix` (Mercator 0–1 units; the
 * 5.0 spike matched `map.project` within 0.1 px). `modelViewProjectionMatrix` uses other units.
 * The probe is added on first use, so stories without 3D layers draw exactly as before.
 */
export function createAltitudeProjector(map: MapLibreMap, mercator: MercatorConstructor) {
  const id = 'mb-altitude-probe';
  let matrix: number[] | undefined;
  function ensureProbe(): void {
    if (map.getLayer(id)) return;
    matrix = undefined;
    map.addLayer({
      id,
      type: 'custom',
      renderingMode: '3d',
      render(_gl, args) {
        const main = (args as { defaultProjectionData?: { mainMatrix?: ArrayLike<number> } })
          .defaultProjectionData?.mainMatrix;
        matrix = main ? Array.from(main) : undefined;
      },
    });
    map.triggerRepaint();
  }
  return {
    project(at: readonly [number, number], heightMeters: number): { x: number; y: number } {
      const ground = () => {
        const point = map.project([at[0], at[1]]);
        return { x: point.x, y: point.y };
      };
      // The globe's matrix expects other units; there the ground position stands in.
      if (heightMeters === 0 || map.getProjection?.()?.type === 'globe') return ground();
      ensureProbe();
      if (!matrix) return ground();
      const base = map.terrain ? (map.queryTerrainElevation([at[0], at[1]]) ?? 0) : 0;
      const canvas = map.getCanvas();
      return (
        projectThroughMatrix(
          matrix,
          mercator.fromLngLat([at[0], at[1]], base + heightMeters),
          canvas.clientWidth,
          canvas.clientHeight,
        ) ?? ground()
      );
    },
    dispose(): void {
      if (map.getLayer(id)) map.removeLayer(id);
    },
  };
}
