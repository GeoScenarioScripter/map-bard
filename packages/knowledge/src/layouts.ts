import {
  PHONE_MAX_WIDTH,
  type LayoutFrame,
  type LayoutTemplate,
  type ResolvedLayout,
} from '@mapbard/schema';

// Every template turns into a bottom sheet on phones, with the rail across the top.
const PHONE_SHEET: LayoutFrame = {
  card: 'bottom-sheet',
  cardWidth: PHONE_MAX_WIDTH,
  gutter: 12,
  reserve: { edge: 'bottom', size: 42, unit: 'vh' },
  rail: 'top',
};

/** The screen rectangle each template keeps for its card, at desktop and phone widths. */
export const LAYOUT_FRAMES: Record<LayoutTemplate, { desktop: LayoutFrame; phone: LayoutFrame }> = {
  sidecar: {
    desktop: {
      card: 'left-column',
      cardWidth: 440,
      gutter: 24,
      reserve: { edge: 'left', size: 440, unit: 'px' },
      rail: 'right',
    },
    phone: PHONE_SHEET,
  },
  'overlay-cards': {
    desktop: {
      card: 'left-float',
      cardWidth: 400,
      gutter: 32,
      // The card plus a gutter on each side.
      reserve: { edge: 'left', size: 464, unit: 'px' },
      rail: 'right',
    },
    phone: PHONE_SHEET,
  },
  'full-bleed': {
    desktop: {
      card: 'bottom-caption',
      cardWidth: 560,
      gutter: 24,
      reserve: { edge: 'bottom', size: 32, unit: 'vh' },
      rail: 'right',
    },
    phone: { ...PHONE_SHEET, reserve: { edge: 'bottom', size: 38, unit: 'vh' } },
  },
};

export function resolveLayout(template: LayoutTemplate = 'sidecar'): ResolvedLayout {
  const frames = LAYOUT_FRAMES[template];
  return {
    template,
    phoneMaxWidth: PHONE_MAX_WIDTH,
    desktop: structuredClone(frames.desktop),
    phone: structuredClone(frames.phone),
  };
}
