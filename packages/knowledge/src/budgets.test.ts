import { describe, expect, it } from 'vitest';
import { budgetDiagnostics, SIZE_BUDGETS, sizeKind, sizeReport } from './budgets.js';

const KB = 1024;

describe('size budgets', () => {
  it('classifies publication files', () => {
    expect(sizeKind('vendor/maplibre-gl.js')).toBe('core');
    expect(sizeKind('vendor/maplibre-gl-worker.js')).toBe('core');
    expect(sizeKind('player.js')).toBe('core');
    expect(sizeKind('compiled-app.js')).toBe('core');
    expect(sizeKind('tier-deck.js')).toBe('tier');
    expect(sizeKind('vendor\\tier-three.js')).toBe('tier');
    expect(sizeKind('compiled-data.js')).toBe('data');
    expect(sizeKind('media/abc.jpg')).toBe('media');
    expect(sizeKind('fonts/inter.woff2')).toBe('font');
    expect(sizeKind('style.css')).toBe('style');
    expect(sizeKind('index.html')).toBe('other');
  });

  it('sums by kind and compares core and all tiers with the budgets', () => {
    const report = sizeReport([
      { path: 'vendor/maplibre-gl.js', bytes: 974 * KB, gzipBytes: 252 * KB },
      { path: 'vendor/maplibre-gl-worker.js', bytes: 470 * KB, gzipBytes: 132 * KB },
      { path: 'player.js', bytes: 78 * KB, gzipBytes: 20 * KB },
      { path: 'compiled-app.js', bytes: 9 * KB, gzipBytes: 3 * KB },
      { path: 'compiled-data.js', bytes: 530 * KB, gzipBytes: 90 * KB },
      { path: 'media/a.jpg', bytes: 777 * KB, gzipBytes: 770 * KB },
    ]);
    expect(report.totals.core).toEqual({ bytes: 1531 * KB, gzipBytes: 407 * KB });
    expect(report.totals.data.gzipBytes).toBe(90 * KB);
    expect(report.totals.media.bytes).toBe(777 * KB);
    expect(report.budgets.core).toEqual({ gzipBytes: 407 * KB, limit: 450 * KB, ok: true });
    expect(report.budgets.allTiers).toEqual({ gzipBytes: 407 * KB, limit: 1200 * KB, ok: true });
    expect(report.files[0]!.path).toBe('compiled-app.js');
    expect(budgetDiagnostics(report)).toEqual([]);
  });

  it('warns for each budget a story goes over, never errors', () => {
    const report = sizeReport([
      { path: 'vendor/maplibre-gl.js', bytes: 1, gzipBytes: SIZE_BUDGETS.coreGzip + KB },
      { path: 'tier-deck.js', bytes: 1, gzipBytes: SIZE_BUDGETS.allTiersGzip },
    ]);
    expect(report.budgets.core.ok).toBe(false);
    expect(report.budgets.allTiers.gzipBytes).toBe(
      SIZE_BUDGETS.coreGzip + KB + SIZE_BUDGETS.allTiersGzip,
    );
    const diagnostics = budgetDiagnostics(report);
    expect(diagnostics.map((entry) => [entry.code, entry.severity])).toEqual([
      ['BUDGET_EXCEEDED', 'warning'],
      ['BUDGET_EXCEEDED', 'warning'],
    ]);
    expect(diagnostics[0]!.message).toBe(
      'Core JavaScript is 451.0 KB gzip, over the 450.0 KB budget by 1.0 KB.',
    );
  });

  it('counts the budget limit itself as within budget', () => {
    const report = sizeReport([{ path: 'player.js', bytes: 1, gzipBytes: SIZE_BUDGETS.coreGzip }]);
    expect(report.budgets.core.ok).toBe(true);
  });
});
