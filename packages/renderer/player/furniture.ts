// Map furniture that follows the live camera. The scale bar is MapLibre's own ScaleControl;
// the north arrow is drawn here because it shows only while the map is rotated.
import type { MapAdapter } from './types.js';

/** Bearings closer to north than this, in degrees, count as unrotated (float noise). */
export const NORTH_TOLERANCE = 0.1;

/** Visibility and needle rotation for a map bearing in degrees (clockwise from north). */
export function northArrowState(bearing: number): { visible: boolean; rotation: number } {
  // Normalise to [-180, 180) so the needle turns the short way.
  const normalized = ((((bearing + 180) % 360) + 360) % 360) - 180;
  const visible = Math.abs(normalized) >= NORTH_TOLERANCE;
  return { visible, rotation: visible ? -normalized : 0 };
}

const NEEDLE =
  '<svg viewBox="0 0 24 32" width="24" height="32" aria-hidden="true">' +
  '<text class="mb-north-letter" x="12" y="8" text-anchor="middle">N</text>' +
  '<path class="mb-north-head" d="M12 11 L17 28 L12 24 Z"/>' +
  '<path class="mb-north-tail" d="M12 11 L7 28 L12 24 Z"/>' +
  '</svg>';

/**
 * Fill `host` with a north arrow and keep it pointing north on every frame. It is hidden
 * while the map faces north. Returns a function that stops updating it.
 */
export function createNorthArrow(
  host: HTMLElement,
  map: Pick<MapAdapter, 'onFrame' | 'bearing'>,
): () => void {
  host.innerHTML = NEEDLE;
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', 'North arrow');
  const needle = host.firstElementChild as SVGElement | null;
  let last: number | undefined;
  const update = () => {
    const { visible, rotation } = northArrowState(map.bearing());
    host.hidden = !visible;
    if (visible && rotation !== last && needle) {
      needle.style.transform = `rotate(${rotation.toFixed(1)}deg)`;
      last = rotation;
    }
  };
  const stop = map.onFrame(update);
  update();
  return () => {
    stop();
    host.hidden = true;
  };
}
