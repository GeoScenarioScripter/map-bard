// Colour arithmetic for theme checks and critic rules. Hex only, matching the theme contract.

export type Rgba = { r: number; g: number; b: number; a: number };

/** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`; anything else is undefined. */
export function parseHexColor(value: string): Rgba | undefined {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim());
  if (!match) return undefined;
  let hex = match[1]!;
  if (hex.length <= 4) hex = [...hex].map((char) => char + char).join('');
  const channel = (index: number) => parseInt(hex.slice(index, index + 2), 16);
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: hex.length === 8 ? channel(6) / 255 : 1,
  };
}

/** Composite a translucent colour over an opaque one. */
function over(top: Rgba, bottom: Rgba): Rgba {
  const mix = (a: number, b: number) => a * top.a + b * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

/** WCAG 2.x relative luminance of an opaque colour. */
export function relativeLuminance(color: Rgba): number {
  const linear = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/**
 * WCAG contrast ratio (1–21). Translucent foregrounds are composited over the
 * background first; a translucent background is composited over `base` (white).
 */
export function contrastRatio(
  foreground: string,
  background: string,
  base = '#ffffff',
): number | undefined {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  const ground = parseHexColor(base);
  if (!fg || !bg || !ground) return undefined;
  const solidBackground = over(bg, ground);
  const solidForeground = over(fg, solidBackground);
  const [high, low] = [relativeLuminance(solidForeground), relativeLuminance(solidBackground)].sort(
    (a, b) => b - a,
  );
  return (high! + 0.05) / (low! + 0.05);
}

const toHex = (color: Rgba) =>
  `#${[color.r, color.g, color.b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

function toHsl({ r, g, b }: Rgba): [number, number, number] {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const lightness = (high + low) / 2;
  if (high === low) return [0, 0, lightness];
  const delta = high - low;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    high === red
      ? ((green - blue) / delta + 6) % 6
      : high === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  return [hue * 60, saturation, lightness];
}

function fromHsl([hue, saturation, lightness]: [number, number, number]): Rgba {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: 1 };
}

/**
 * The colour with its hue and saturation kept and its lightness moved away from every
 * background (darker on light grounds, lighter on dark ones) until it reaches `ratio`
 * against each. A colour that already passes is returned unchanged. Opaque `#rrggbb` out.
 */
export function withContrast(color: string, backgrounds: readonly string[], ratio: number): string {
  const parsed = parseHexColor(color);
  const grounds = backgrounds.map(parseHexColor).filter((item): item is Rgba => !!item);
  if (!parsed || !grounds.length) return color;
  const passes = (hex: string) =>
    backgrounds.every((background) => (contrastRatio(hex, background) ?? 0) >= ratio);
  if (passes(color)) return color;
  const darker =
    grounds.reduce((sum, ground) => sum + relativeLuminance(ground), 0) / grounds.length > 0.18;
  const [hue, saturation, start] = toHsl(parsed);
  // Hundredth steps, so the result is the nearest passing lightness and stays deterministic.
  for (let step = 1; step <= 100; step++) {
    const lightness = darker ? start - step / 100 : start + step / 100;
    if (lightness < 0 || lightness > 1) break;
    const hex = toHex(fromHsl([hue, saturation, lightness]));
    if (passes(hex)) return hex;
  }
  return darker ? '#000000' : '#ffffff';
}
