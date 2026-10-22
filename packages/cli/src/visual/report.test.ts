import { describe, expect, it } from 'vitest';
import type { Sample } from './capture.js';
import { severityOf, visualDiagnostics } from './report.js';

const sample = (overrides: Partial<Sample>): Sample => ({
  sceneId: 'context-2024',
  p: 0,
  viewport: 'phone',
  phase: 'rest',
  symbolsChecked: 3,
  findings: [],
  ...overrides,
});
const scenes = new Map([
  ['context-2024', 0],
  ['limits', 2],
]);

describe('visual findings as diagnostics', () => {
  it('fails every rest finding and warns only for moving-map findings in flight', () => {
    const symbol = {
      kind: 'symbol-occluded',
      symbol: 'g#1',
      by: 'scene-card',
      covered: 0.4,
    } as const;
    const callout = {
      kind: 'callout-occluded',
      callout: 'hancock',
      by: 'legend',
      area: 20,
    } as const;
    const target = { kind: 'target-offscreen', target: 'hancock#0', outside: 0.3 } as const;
    expect(severityOf(symbol, 'rest')).toBe('error');
    expect(severityOf(symbol, 'flight')).toBe('warning');
    expect(severityOf(target, 'flight')).toBe('warning');
    expect(severityOf(callout, 'flight')).toBe('error');
  });

  it('groups a finding across sweep samples and names scene, viewport, phase and positions', () => {
    const covered = (value: number) =>
      ({ kind: 'symbol-occluded', symbol: 'gauges#2', by: 'scene-card', covered: value }) as const;
    const diagnostics = visualDiagnostics(
      {
        captures: [sample({ p: 0.5, phase: 'flight', findings: [covered(0.3)] })],
        sweep: [
          sample({ p: 0.45, phase: 'flight', findings: [covered(0.6)] }),
          sample({ p: 0.55, phase: 'flight', findings: [covered(0.25)] }),
          sample({
            sceneId: 'limits',
            p: 0.3,
            viewport: 'desktop',
            phase: 'flight',
            findings: [{ kind: 'callout-overlap', callouts: ['a', 'b'], area: 12.5 }],
          }),
        ],
        pageFindings: [{ kind: 'offline-request', urls: ['https://tiles.example/a.pbf'] }],
      },
      scenes,
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'VISUAL_OCCLUSION',
        severity: 'warning',
        artifact: 'design',
        path: ['scenes', 0],
        ids: { sceneId: 'context-2024' },
        message:
          'Scene context-2024, phone, flight at p 0.45, 0.5, 0.55: symbol gauges#2 is under scene-card (up to 60%).',
      }),
      expect.objectContaining({
        code: 'VISUAL_OCCLUSION',
        severity: 'error',
        path: ['scenes', 2],
        message:
          'Scene limits, desktop, flight at p 0.3: callouts a and b overlap (up to 12.5 px²).',
      }),
      expect.objectContaining({ code: 'VISUAL_RUNTIME', severity: 'error', path: [] }),
    ]);
    for (const diagnostic of diagnostics) expect(diagnostic.remedy.length).toBeGreaterThan(10);
  });

  it('keeps rest and flight apart and makes warnings gate with failOnWarnings', () => {
    const finding = { kind: 'target-occluded', target: 't#0', by: 'legend', covered: 0.5 } as const;
    const report = {
      captures: [
        sample({ p: 0, findings: [finding] }),
        sample({ p: 0.5, phase: 'flight', findings: [finding] }),
      ],
      sweep: [],
      pageFindings: [],
    };
    expect(visualDiagnostics(report, scenes).map((entry) => entry.severity)).toEqual([
      'error',
      'warning',
    ]);
    expect(
      visualDiagnostics(report, scenes, { failOnWarnings: true }).map((entry) => entry.severity),
    ).toEqual(['error', 'error']);
  });

  it('reports idle timeouts and seek mismatches as runtime problems', () => {
    const diagnostics = visualDiagnostics(
      {
        captures: [
          sample({
            findings: [
              { kind: 'idle-timeout', timeoutMs: 15000 },
              {
                kind: 'seek-mismatch',
                expected: { sceneId: 'context-2024', p: 0 },
                shown: null,
              },
            ],
          }),
        ],
        sweep: [],
        pageFindings: [{ kind: 'page-error', message: 'phone: boom' }],
      },
      scenes,
    );
    expect(diagnostics.map((entry) => [entry.code, entry.artifact])).toEqual([
      ['VISUAL_RUNTIME', 'export'],
      ['VISUAL_RUNTIME', 'export'],
      ['VISUAL_RUNTIME', 'export'],
    ]);
    expect(diagnostics[1]!.message).toContain('seeking showed no scene');
  });
});
