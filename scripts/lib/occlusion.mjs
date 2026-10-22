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
  const screen = { x: 0, y: 0, width: viewport.width, height: viewport.height };
  for (const target of targets) {
    const targetArea = area(target.rect);
    // Clipped by the screen edge counts like being covered by a panel.
    const outside = targetArea ? 1 - overlapArea(target.rect, screen) / targetArea : 0;
    if (outside >= TARGET_COVER_RATIO) {
      findings.push({ kind: 'target-offscreen', target: target.id, outside: round(outside) });
      continue;
    }
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

/** How far a circle reaches into a rect: its radius minus the centre's distance to the rect. */
export function circleDepth(circle, rect) {
  const x = Math.min(Math.max(circle.x, rect.x), rect.x + rect.width);
  const y = Math.min(Math.max(circle.y, rect.y), rect.y + rect.height);
  return circle.r - Math.hypot(x - circle.x, y - circle.y);
}

/** Callout labels must be whole, uncovered and clear of each other and of every halo. */
export const CALLOUT_TOLERANCE = 0.5;

/**
 * Callouts are { id, rect, halos: [{ x, y, r }] } with the label's client rect and the halo
 * circles around the symbols it points at. Occluders are everything drawn over or beside the
 * map that a label must not touch (panels, the story column, map controls). A label must sit
 * fully on screen, touch no occluder, no other label and no halo, its own included.
 */
export function calloutFindings({ viewport, callouts, occluders }) {
  const findings = [];
  const screen = { x: 0, y: 0, width: viewport.width, height: viewport.height };
  const halos = callouts.flatMap((callout) =>
    callout.halos.map((halo, index) => ({ ...halo, id: `${callout.id}#${index}` })),
  );
  for (const [index, callout] of callouts.entries()) {
    const outside = area(callout.rect) - overlapArea(callout.rect, screen);
    if (outside >= 1)
      findings.push({ kind: 'callout-offscreen', callout: callout.id, area: round(outside) });
    for (const occluder of occluders) {
      const covered = overlapArea(callout.rect, occluder.rect);
      if (covered >= 1)
        findings.push({
          kind: 'callout-occluded',
          callout: callout.id,
          by: occluder.id,
          area: round(covered),
        });
    }
    for (const other of callouts.slice(index + 1)) {
      const overlap = overlapArea(callout.rect, other.rect);
      if (overlap >= 1)
        findings.push({
          kind: 'callout-overlap',
          callouts: [callout.id, other.id],
          area: round(overlap),
        });
    }
    for (const halo of halos) {
      const depth = circleDepth(halo, callout.rect);
      if (depth > CALLOUT_TOLERANCE)
        findings.push({
          kind: 'callout-covers-target',
          callout: callout.id,
          target: halo.id,
          depth: round(depth),
        });
    }
  }
  return findings;
}
