// Static critic rules: pure functions over the compiled spec and the project's features.
// Each finding is a warning with a code, path, IDs and remedy; occlusion needs projected
// coordinates and stays in visual QA.
import type { Compiled, Diagnostic, ResolvedScale } from '@mapbard/schema';
import { contrastRatio } from './color.js';
import { formatUnit } from './display.js';

export type CriticFeature = { id: string; properties: Record<string, unknown> };
export type CriticInput = {
  compiled: Compiled;
  /** Features of every data resource, by resource ID, with resolved feature IDs. */
  features: Record<string, readonly CriticFeature[]>;
};

/** Graphical objects need 3:1 against what surrounds them (WCAG 2.2, 1.4.11). */
export const MIN_MARK_CONTRAST = 3;

type Scene = Compiled['scenes'][number];
type Layer = Scene['layers'][number];
type NumericColor = Extract<ResolvedScale, { kind: 'numeric-color' }>;

function warning(
  code: Diagnostic['code'],
  artifact: Diagnostic['artifact'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  ids: Diagnostic['ids'] = {},
): Diagnostic {
  return { code, severity: 'warning', artifact, path, ids, message, remedy };
}

/** Every piece of text a reader sees, with the authored path it comes from. */
function readerText(compiled: Compiled) {
  const texts: { path: Diagnostic['path']; text: string; ids: Diagnostic['ids'] }[] = [];
  compiled.scenes.forEach((scene, index) => {
    const ids = { sceneId: scene.id };
    texts.push({ path: ['scenes', index, 'title'], text: scene.title, ids });
    texts.push({ path: ['scenes', index, 'narration'], text: scene.narration, ids });
    scene.annotations.forEach((annotation, item) =>
      texts.push({
        path: ['scenes', index, 'annotations', item, 'text'],
        text: annotation.text,
        ids,
      }),
    );
    scene.controls.forEach((control, item) =>
      texts.push({ path: ['scenes', index, 'controls', item, 'label'], text: control.label, ids }),
    );
  });
  for (const scale of compiled.scales) {
    const ids = { scaleId: scale.id };
    texts.push({ path: ['scales', scale.id, 'title'], text: scale.title, ids });
    if (scale.kind === 'category-color')
      scale.categories.forEach((category, item) =>
        texts.push({ path: ['scales', scale.id, 'categories', item], text: category.label, ids }),
      );
  }
  for (const resource of compiled.resources) {
    const ids = resource.kind === 'data' ? { sourceId: resource.id } : { assetId: resource.id };
    for (const field of ['name', 'caption', 'credit'] as const) {
      const text = resource[field];
      if (text) texts.push({ path: ['resources', resource.id, field], text, ids });
    }
  }
  return texts;
}

const SNAKE_CASE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Raw identifiers: snake_case tokens, or project IDs with separators, in reader text. */
export function rawIdentifierRule(compiled: Compiled): Diagnostic[] {
  const known = new Set<string>();
  for (const scene of compiled.scenes) {
    known.add(scene.id);
    for (const layer of scene.layers) {
      known.add(layer.authoredLayerId);
      known.add(layer.sourceId);
      if (layer.attribute) known.add(layer.attribute);
    }
  }
  for (const resource of compiled.resources) known.add(resource.id);
  for (const scale of compiled.scales) known.add(scale.id);
  const ids = [...known].filter((id) => /[-_:]/.test(id)).sort((a, b) => b.length - a.length);
  const pattern = ids.length
    ? new RegExp(`(?<![\\w-])(?:${ids.map(escapeRegExp).join('|')})(?![\\w-])`)
    : undefined;
  const findings: Diagnostic[] = [];
  for (const { path, text, ids: owner } of readerText(compiled)) {
    const token = pattern?.exec(text)?.[0] ?? SNAKE_CASE.exec(text)?.[0];
    if (token)
      findings.push(
        warning(
          'TEXT_RAW_IDENTIFIER',
          path[0] === 'resources' ? 'project' : 'narrative',
          path,
          `Reader-facing text shows the internal identifier "${token}".`,
          'Write it as words, or give the resource, attribute or scale a label or name.',
          owner,
        ),
      );
  }
  return findings;
}

/** Caret exponents are for data declarations; readers should see ft³/s, not ft^3/s. */
export function caretUnitRule(compiled: Compiled): Diagnostic[] {
  const findings: Diagnostic[] = [];
  for (const { path, text, ids } of readerText(compiled)) {
    const match = /\S*\^[+-]?\d+\S*/.exec(text);
    if (match)
      findings.push(
        warning(
          'TEXT_UNIT_UNFORMATTED',
          path[0] === 'resources' ? 'project' : 'narrative',
          path,
          `Reader-facing text has an unformatted unit "${match[0]}".`,
          `Write "${formatUnit(match[0])}" instead.`,
          ids,
        ),
      );
  }
  return findings;
}

function classOf(scale: NumericColor, value: number): number {
  let index = 0;
  for (let edge = 1; edge < scale.colors.length; edge++)
    if (value >= scale.edges[edge]!) index = edge;
  return index;
}

function passes(layer: Layer, feature: CriticFeature): boolean {
  const filter = layer.filter;
  if (!filter) return true;
  const value = feature.properties[filter.attribute];
  if (typeof value !== typeof filter.value) return false;
  switch (filter.op) {
    case '==':
      return value === filter.value;
    case '!=':
      return value !== filter.value;
    case '<':
      return (value as number) < (filter.value as number);
    case '<=':
      return (value as number) <= (filter.value as number);
    case '>':
      return (value as number) > (filter.value as number);
    case '>=':
      return (value as number) >= (filter.value as number);
  }
}

function numericValues(input: CriticInput, layer: Layer): Map<string, number> {
  const values = new Map<string, number>();
  for (const feature of input.features[layer.sourceId] ?? []) {
    const value = layer.attribute ? feature.properties[layer.attribute] : undefined;
    if (typeof value === 'number' && Number.isFinite(value) && passes(layer, feature))
      values.set(feature.id, value);
  }
  return values;
}

/**
 * Story contrast hidden: features a scene's annotations name, or the same feature
 * compared across a shared scale, have different values but land in one class.
 */
export function hiddenContrastRule(input: CriticInput): Diagnostic[] {
  const { compiled } = input;
  const scales = new Map(compiled.scales.map((scale) => [scale.id, scale]));
  const findings: Diagnostic[] = [];
  compiled.scenes.forEach((scene, sceneIndex) => {
    for (const layer of scene.layers) {
      const scale = layer.scaleId ? scales.get(layer.scaleId) : undefined;
      if (scale?.kind !== 'numeric-color') continue;
      const named = new Set(
        scene.annotations.flatMap((annotation) =>
          annotation.target.kind === 'features' && annotation.target.sourceId === layer.sourceId
            ? annotation.target.featureIds
            : [],
        ),
      );
      const values = numericValues(input, layer);
      const compared = [...named].filter((id) => values.has(id));
      const distinct = new Set(compared.map((id) => values.get(id)));
      const classes = new Set(compared.map((id) => classOf(scale, values.get(id)!)));
      if (distinct.size > 1 && classes.size === 1)
        findings.push(
          warning(
            'ENCODING_CONTRAST_HIDDEN',
            'design',
            ['scenes', sceneIndex, 'annotations'],
            `The ${compared.length} annotated features have different values but share one colour class.`,
            'Use quantile, natural-breaks or manual breaks that separate them, or graduated symbols.',
            { sceneId: scene.id, layerId: layer.authoredLayerId, scaleId: scale.id },
          ),
        );
    }
  });
  for (const scale of compiled.scales) {
    if (scale.kind !== 'numeric-color' || scale.memberKeys.length < 2) continue;
    const perFeature = new Map<string, number[]>();
    for (const member of scale.memberKeys) {
      const layer = compiled.scenes
        .find((scene) => scene.id === member.sceneId)
        ?.layers.find((item) => item.authoredLayerId === member.layerId);
      if (!layer) continue;
      for (const [id, value] of numericValues(input, layer))
        perFeature.set(id, [...(perFeature.get(id) ?? []), value]);
    }
    const hidden = [...perFeature]
      .filter(([, values]) => values.length > 1 && new Set(values).size > 1)
      .filter(([, values]) => new Set(values.map((value) => classOf(scale, value))).size === 1)
      .map(([id]) => id)
      .sort();
    if (hidden.length)
      findings.push(
        warning(
          'ENCODING_CONTRAST_HIDDEN',
          'design',
          ['sharedScales', scale.id],
          `${hidden.length} feature${hidden.length === 1 ? ' changes' : 's change'} value between compared scenes but keep${hidden.length === 1 ? 's' : ''} the same colour class.`,
          'Choose class breaks that separate the compared values, or show them as graduated symbols.',
          { scaleId: scale.id, featureId: hidden[0] },
        ),
      );
  }
  return findings;
}

/** The same attribute compared across scenes should share one scale. */
export function inconsistentScaleRule(compiled: Compiled): Diagnostic[] {
  const scales = new Map(compiled.scales.map((scale) => [scale.id, scale]));
  const groups = new Map<string, { sceneId: string; layer: Layer }[]>();
  for (const scene of compiled.scenes)
    for (const layer of scene.layers) {
      const scale = layer.scaleId ? scales.get(layer.scaleId) : undefined;
      if (!scale || !layer.attribute) continue;
      const key = JSON.stringify([layer.attribute, scale.unit, scale.kind]);
      groups.set(key, [...(groups.get(key) ?? []), { sceneId: scene.id, layer }]);
    }
  const findings: Diagnostic[] = [];
  for (const members of groups.values()) {
    const sceneIds = new Set(members.map((member) => member.sceneId));
    const scaleIds = [...new Set(members.map((member) => member.layer.scaleId!))];
    if (sceneIds.size < 2 || scaleIds.length < 2) continue;
    const first = members[0]!;
    findings.push(
      warning(
        'SCALE_INCONSISTENT',
        'design',
        ['sharedScales'],
        `${first.layer.attribute} is encoded on ${scaleIds.length} different scales across ${sceneIds.size} scenes, so equal colours or sizes can mean different values.`,
        'Add a shared scale with these layers as members, so every scene uses one mapping.',
        { sceneId: first.sceneId, layerId: first.layer.authoredLayerId },
      ),
    );
  }
  return findings;
}

/** Point and line colours against the theme's land (and water, for points). */
export function paletteContrastRule(compiled: Compiled): Diagnostic[] {
  const scales = new Map(compiled.scales.map((scale) => [scale.id, scale]));
  const { colors } = compiled.theme;
  const findings: Diagnostic[] = [];
  compiled.scenes.forEach((scene, sceneIndex) => {
    for (const layer of scene.layers) {
      if (layer.geometry === 'polygon') continue;
      const scale = layer.scaleId ? scales.get(layer.scaleId) : undefined;
      const marks =
        scale?.kind === 'numeric-color'
          ? scale.colors
          : scale?.kind === 'category-color'
            ? scale.categories.map((category) => category.color)
            : [layer.constant?.color ?? colors.accent];
      const grounds: [string, string][] = [['land', colors.land]];
      if (layer.geometry === 'point') grounds.push(['water', colors.water]);
      let worst: { color: string; ground: string; ratio: number } | undefined;
      for (const color of marks)
        for (const [ground, background] of grounds) {
          const ratio = contrastRatio(color, background);
          if (ratio !== undefined && ratio < MIN_MARK_CONTRAST && (!worst || ratio < worst.ratio))
            worst = { color, ground, ratio };
        }
      if (worst)
        findings.push(
          warning(
            'PALETTE_CONTRAST_LOW',
            'design',
            ['scenes', sceneIndex, 'layers', layer.authoredLayerId],
            `${worst.color} has ${worst.ratio.toFixed(2)}:1 contrast against the ${compiled.theme.preset} ${worst.ground} colour; marks need ${MIN_MARK_CONTRAST}:1.`,
            'Use darker (or, on a dark theme, lighter) colours, or a palette that starts away from the basemap colour.',
            {
              sceneId: scene.id,
              layerId: layer.authoredLayerId,
              ...(scale ? { scaleId: scale.id } : {}),
            },
          ),
        );
    }
  });
  return findings;
}

/** The phone the estimate is for: the visual QA phone viewport, in CSS pixels. */
export const REFERENCE_PHONE = { width: 390, height: 844 } as const;
// Mirrors the phone `.scene-card` padding in the renderer's style.css.
const SHEET_PADDING = { x: 18, y: 16 };
/** Average advance per character, in ems, spaces included; measured on the bundled fonts. */
const CHAR_EM = 0.52;
/** Heading line height and its bottom margin (em), and the gap between paragraphs (em). */
const HEADING = { lineHeight: 1.2, margin: 0.4 };
const PARAGRAPH_GAP = 0.8;

/** Lines a greedy word wrap takes for `text` in a column `columns` characters wide. */
function wrappedLines(text: string, columns: number): number {
  let lines = 0;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const length = [...word].length;
    if (used && used + 1 + length <= columns) used += 1 + length;
    else {
      lines += Math.max(1, Math.ceil(length / columns));
      used = length > columns ? length % columns || columns : length;
    }
  }
  return lines;
}

/**
 * Narration that would scroll inside the phone sheet: the card's height is estimated from
 * the layout's phone frame and the theme's type scale on the reference phone, with an
 * average character width, so it flags likely overflow rather than measuring it.
 */
export function textOverflowRule(compiled: Compiled): Diagnostic[] {
  const { phone } = compiled.layout;
  const { type } = compiled.theme;
  const reserve =
    phone.reserve.unit === 'vh'
      ? (phone.reserve.size * REFERENCE_PHONE.height) / 100
      : phone.reserve.size;
  const height = reserve - 2 * phone.gutter - 2 * SHEET_PADDING.y;
  const width =
    Math.min(phone.cardWidth, REFERENCE_PHONE.width - 2 * phone.gutter) - 2 * SHEET_PADDING.x;
  const body = type.basePx;
  const heading = type.basePx * type.ratio;
  const bodyLine = body * type.lineHeight;
  const findings: Diagnostic[] = [];
  compiled.scenes.forEach((scene, index) => {
    const titleLines = wrappedLines(scene.title, Math.floor(width / (heading * CHAR_EM)));
    const paragraphs = scene.narration.split(/\n\s*\n/).filter((text) => text.trim());
    const columns = Math.floor(width / (body * CHAR_EM));
    const lines = paragraphs.reduce((sum, text) => sum + wrappedLines(text, columns), 0);
    const needed =
      titleLines * heading * HEADING.lineHeight +
      heading * HEADING.margin +
      lines * bodyLine +
      Math.max(0, paragraphs.length - 1) * body * PARAGRAPH_GAP;
    if (needed <= height) return;
    const fits = Math.floor(
      (height - titleLines * heading * HEADING.lineHeight - heading * HEADING.margin) / bodyLine,
    );
    findings.push(
      warning(
        'TEXT_OVERFLOW_LIKELY',
        'narrative',
        ['scenes', index, 'narration'],
        `Narration needs about ${lines} lines on a ${REFERENCE_PHONE.width} px wide phone, but the ${compiled.layout.template} sheet shows about ${Math.max(0, fits)} before it scrolls.`,
        'Tighten the narration or split the scene in two, keeping every value, date and qualification.',
        { sceneId: scene.id },
      ),
    );
  });
  return findings;
}

/** Run every static critic rule, in a fixed order. */
export function critique(input: CriticInput): Diagnostic[] {
  return [
    ...rawIdentifierRule(input.compiled),
    ...caretUnitRule(input.compiled),
    ...hiddenContrastRule(input),
    ...inconsistentScaleRule(input.compiled),
    ...paletteContrastRule(input.compiled),
    ...textOverflowRule(input.compiled),
  ];
}
