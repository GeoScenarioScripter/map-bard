import { ResolvedThemeSchema, THEME_PRESETS } from '@mapbard/schema';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color.js';
import { resolveTheme, THEME_PRESET_TOKENS } from './themes.js';

describe('theme presets', () => {
  it.each(THEME_PRESETS)('%s resolves to a complete, readable token set', (preset) => {
    const theme = ResolvedThemeSchema.parse(resolveTheme({ preset }));
    const { colors } = theme;
    // Card text must meet WCAG AA for body text over the page it floats on.
    expect(contrastRatio(colors.ink, colors.card, colors.page)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(colors.muted, colors.card, colors.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.label, colors.labelHalo)).toBeGreaterThanOrEqual(4.5);
    // Water and land must read as different surfaces.
    expect(contrastRatio(colors.water, colors.land)).toBeGreaterThan(1.1);
    expect(theme.palette).toEqual(THEME_PRESET_TOKENS[preset].ramps.sequential);
  });

  it('defaults to editorial-light and keeps the pre-theme palette', () => {
    const theme = resolveTheme();
    expect(theme.preset).toBe('editorial-light');
    expect(theme.palette.slice(0, 3)).toEqual(['#edf8fb', '#66c2a4', '#238b45']);
    expect(theme.colors.accent).toBe('#0b3d91');
    expect(theme.fonts.display).toEqual({
      family: 'Source Serif 4',
      fallback: 'serif',
      bundled: true,
    });
  });

  it('lets authored tokens override single preset tokens', () => {
    const theme = resolveTheme({
      preset: 'night',
      palette: ['#111111', '#222222', '#abcdef'],
      displayFont: 'Georgia',
      colors: { water: '#001122' },
      ramps: { diverging: ['#ff0000', '#000000', '#0000ff'] },
    });
    expect(theme.colors.water).toBe('#001122');
    expect(theme.colors.land).toBe(THEME_PRESET_TOKENS.night.colors.land);
    // A palette's last colour is the accent unless colors.accent says otherwise.
    expect(theme.colors.accent).toBe('#abcdef');
    expect(
      resolveTheme({ palette: ['#111111', '#abcdef'], colors: { accent: '#ff0000' } }).colors
        .accent,
    ).toBe('#ff0000');
    expect(theme.palette).toEqual(['#111111', '#222222', '#abcdef']);
    expect(theme.ramps.sequential).toEqual(THEME_PRESET_TOKENS.night.ramps.sequential);
    expect(theme.fonts.display).toEqual({
      family: 'Georgia',
      fallback: 'sans-serif',
      bundled: false,
    });
    expect(theme.fonts.body.family).toBe('Inter');
  });
});

describe('contrastRatio', () => {
  it('matches WCAG reference values and composites alpha', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#00000000', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
    expect(contrastRatio('red', '#000')).toBeUndefined();
  });
});
