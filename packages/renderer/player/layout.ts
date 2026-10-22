import type { CompiledStory } from './types.js';

export type Padding = { top: number; right: number; bottom: number; left: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
type Layout = CompiledStory['layout'];

/** The map must keep at least this much unpadded width and height, in CSS pixels. */
const MIN_VIEW = 120;
/** Width of the right-hand rail; matches `.mb-rail` in runtime/style.css. */
export const RAIL_WIDTH = 280;
/** An authored zoom frames what a reader sees in this viewport's free map area. */
export const REFERENCE_VIEWPORT = { width: 1440, height: 900 } as const;

export function activeFrame(layout: Layout, width: number) {
  return width <= layout.phoneMaxWidth ? layout.phone : layout.desktop;
}

/**
 * Camera padding for the active layout frame: the reserved card edge, plus the
 * measured rail of legends, controls and media when it shows anything. The camera
 * centre and fit targets then fall in the uncovered part of the map.
 */
export function cameraPadding(
  layout: Layout,
  viewport: { width: number; height: number },
  rail?: Rect,
): Padding {
  const frame = activeFrame(layout, viewport.width);
  const gutter = frame.gutter;
  const padding: Padding = { top: gutter, right: gutter, bottom: gutter, left: gutter };
  const reserve =
    frame.reserve.unit === 'vh' ? (viewport.height * frame.reserve.size) / 100 : frame.reserve.size;
  padding[frame.reserve.edge] = Math.max(padding[frame.reserve.edge], reserve);
  if (rail && rail.right > rail.left && rail.bottom > rail.top) {
    if (frame.rail === 'right')
      padding.right = Math.max(padding.right, viewport.width - rail.left + gutter);
    else padding.top = Math.max(padding.top, rail.bottom + gutter);
  }
  // Very small or very wide panels must not leave the camera without a view.
  for (const [low, high, size] of [
    ['left', 'right', viewport.width],
    ['top', 'bottom', viewport.height],
  ] as const) {
    const excess = padding[low] + padding[high] + MIN_VIEW - size;
    if (excess > 0) {
      const total = padding[low] + padding[high];
      padding[low] = Math.max(0, padding[low] - (excess * padding[low]) / total);
      padding[high] = Math.max(0, padding[high] - (excess * padding[high]) / total);
    }
  }
  return {
    top: Math.round(padding.top),
    right: Math.round(padding.right),
    bottom: Math.round(padding.bottom),
    left: Math.round(padding.left),
  };
}

/**
 * Zoom change that keeps the authored extent visible when the free map area is
 * smaller than in the reference desktop viewport (a phone, a narrow window or a
 * tall rail). It never zooms in, so large screens see at least the authored view.
 */
export function zoomOffset(
  layout: Layout,
  viewport: { width: number; height: number },
  padding: Padding,
): number {
  const { width, height } = REFERENCE_VIEWPORT;
  const gutter = layout.desktop.gutter;
  const reference = cameraPadding(layout, REFERENCE_VIEWPORT, {
    left: width - gutter - RAIL_WIDTH,
    top: gutter,
    right: width - gutter,
    bottom: height - gutter,
  });
  const scale = Math.min(
    (viewport.width - padding.left - padding.right) / (width - reference.left - reference.right),
    (viewport.height - padding.top - padding.bottom) / (height - reference.top - reference.bottom),
    1,
  );
  return scale > 0 ? Math.round(Math.log2(scale) * 1000) / 1000 : 0;
}
