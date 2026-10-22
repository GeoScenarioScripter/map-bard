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
