import { z } from 'zod';

/** Story layout templates; `split` and `chapter` follow in V4. */
export const LAYOUT_TEMPLATES = ['sidecar', 'overlay-cards', 'full-bleed'] as const;

/** Viewports at or below this width use the phone frame. */
export const PHONE_MAX_WIDTH = 640;

const LayoutFrameSchema = z
  .object({
    /**
     * `left-column`: a solid text column; `left-float`: floating cards on the left;
     * `bottom-caption`: short captions along the bottom; `bottom-sheet`: the phone sheet.
     */
    card: z.enum(['left-column', 'left-float', 'bottom-caption', 'bottom-sheet']),
    /** Card (or column) width in CSS pixels; bottom placements use it as a maximum. */
    cardWidth: z.number().positive(),
    /** Space between cards, panels and the screen edge, in CSS pixels. */
    gutter: z.number().nonnegative(),
    /** Screen edge reserved for the card; the player applies it as camera padding. */
    reserve: z
      .object({
        edge: z.enum(['left', 'bottom']),
        size: z.number().positive(),
        unit: z.enum(['px', 'vh']),
      })
      .strict(),
    /** Edge where legends, controls and media stack; their measured size also pads the camera. */
    rail: z.enum(['right', 'top']),
  })
  .strict();

export const ResolvedLayoutSchema = z
  .object({
    template: z.enum(LAYOUT_TEMPLATES),
    phoneMaxWidth: z.literal(PHONE_MAX_WIDTH),
    desktop: LayoutFrameSchema,
    phone: LayoutFrameSchema,
  })
  .strict();

export type LayoutTemplate = (typeof LAYOUT_TEMPLATES)[number];
export type LayoutFrame = z.infer<typeof LayoutFrameSchema>;
export type ResolvedLayout = z.infer<typeof ResolvedLayoutSchema>;
