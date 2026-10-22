// Size budgets for a published story (docs/visual-engine.md, quality bar; m2-visual.md, J2).
// Pure arithmetic over file sizes: the caller measures the files and their gzip sizes.
import type { Diagnostic } from '@mapbard/schema';

/**
 * Gzip budgets in bytes. Core is the JavaScript every story loads (MapLibre main thread and
 * worker, the player, the compiled app); all tiers adds the optional deck.gl and three.js tiers.
 * MapLibre 6.1 alone is about 384 KB gzip, so the owner set the core budget to 450 KB.
 */
export const SIZE_BUDGETS = { coreGzip: 450 * 1024, allTiersGzip: 1200 * 1024 } as const;

/** core and tier count against a budget; the rest is reported only. */
export type SizeKind = 'core' | 'tier' | 'data' | 'media' | 'style' | 'font' | 'other';

export type SizedFile = { path: string; bytes: number; gzipBytes: number };

/** What a publication file is, from its path inside the build. */
export function sizeKind(path: string): SizeKind {
  const file = path.replaceAll('\\', '/');
  if (
    file === 'player.js' ||
    file === 'compiled-app.js' ||
    file === 'vendor/maplibre-gl.js' ||
    file === 'vendor/maplibre-gl-worker.js'
  )
    return 'core';
  if (/^(vendor\/)?tier-[^/]+\.js$/.test(file)) return 'tier';
  if (file === 'compiled-data.js' || file.startsWith('data/')) return 'data';
  if (file.startsWith('media/')) return 'media';
  if (file.startsWith('fonts/')) return 'font';
  if (file.endsWith('.css')) return 'style';
  return 'other';
}

export type SizeReport = {
  files: (SizedFile & { kind: SizeKind })[];
  totals: Record<SizeKind, { bytes: number; gzipBytes: number }>;
  budgets: {
    core: { gzipBytes: number; limit: number; ok: boolean };
    allTiers: { gzipBytes: number; limit: number; ok: boolean };
  };
};

/** Sum the measured files by kind and compare core and all-tier JavaScript with the budgets. */
export function sizeReport(
  files: readonly SizedFile[],
  budgets: { coreGzip: number; allTiersGzip: number } = SIZE_BUDGETS,
): SizeReport {
  const kinds: SizeKind[] = ['core', 'tier', 'data', 'media', 'style', 'font', 'other'];
  const totals = Object.fromEntries(
    kinds.map((kind) => [kind, { bytes: 0, gzipBytes: 0 }]),
  ) as SizeReport['totals'];
  const sized = [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => ({ ...file, kind: sizeKind(file.path) }));
  for (const file of sized) {
    totals[file.kind].bytes += file.bytes;
    totals[file.kind].gzipBytes += file.gzipBytes;
  }
  const core = totals.core.gzipBytes;
  const allTiers = core + totals.tier.gzipBytes;
  return {
    files: sized,
    totals,
    budgets: {
      core: { gzipBytes: core, limit: budgets.coreGzip, ok: core <= budgets.coreGzip },
      allTiers: {
        gzipBytes: allTiers,
        limit: budgets.allTiersGzip,
        ok: allTiers <= budgets.allTiersGzip,
      },
    },
  };
}

const kilobytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

/** BUDGET_EXCEEDED warnings for each budget a report goes over. */
export function budgetDiagnostics(report: SizeReport): Diagnostic[] {
  const over = (
    name: string,
    budget: SizeReport['budgets']['core'],
    remedy: string,
  ): Diagnostic[] =>
    budget.ok
      ? []
      : [
          {
            code: 'BUDGET_EXCEEDED',
            severity: 'warning',
            artifact: 'export',
            path: [],
            ids: {},
            message: `${name} JavaScript is ${kilobytes(budget.gzipBytes)} gzip, over the ${kilobytes(budget.limit)} budget by ${kilobytes(budget.gzipBytes - budget.limit)}.`,
            remedy,
          },
        ];
  return [
    ...over(
      'Core',
      report.budgets.core,
      'Rebuild with this CLI version; if the core still goes over, report a MapBard bug.',
    ),
    ...over(
      'All-tier',
      report.budgets.allTiers,
      'Use fewer techniques that need the deck.gl or three.js tiers, so the story loads fewer of them.',
    ),
  ];
}
