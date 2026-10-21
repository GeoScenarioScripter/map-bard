// Pure screen-geometry checks for visual QA. Rects are DOM client rects: { x, y, width, height }.

/** Ignore grazing contact: a target counts as occluded once this share of it is covered. */
export const TARGET_COVER_RATIO = 0.2;

export function overlapArea(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

const area = (rect) => Math.max(0, rect.width) * Math.max(0, rect.height);
const round = (value) => Math.round(value * 100) / 100;

/**
 * Targets are things the reader must see (annotation and media markers); panels are overlay UI
 * (scene card, legend, controls, media). Findings are deterministic: input order, then panel order.
 */
export function occlusionFindings({ viewport, targets, panels }) {
  const findings = [];
  for (const target of targets) {
    const centerX = target.rect.x + target.rect.width / 2;
    const centerY = target.rect.y + target.rect.height / 2;
    if (centerX < 0 || centerY < 0 || centerX > viewport.width || centerY > viewport.height) {
      findings.push({ kind: 'target-offscreen', target: target.id });
      continue;
    }
    const targetArea = area(target.rect);
    for (const panel of panels) {
      const covered = targetArea ? overlapArea(target.rect, panel.rect) / targetArea : 0;
      if (covered >= TARGET_COVER_RATIO)
        findings.push({
          kind: 'target-occluded',
          target: target.id,
          by: panel.id,
          covered: round(covered),
        });
    }
  }
  for (const [index, panel] of panels.entries()) {
    for (const other of panels.slice(index + 1)) {
      const overlap = overlapArea(panel.rect, other.rect);
      if (overlap >= 1)
        findings.push({
          kind: 'panel-overlap',
          panels: [panel.id, other.id],
          area: round(overlap),
        });
    }
  }
  return findings;
}
