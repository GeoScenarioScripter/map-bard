import type { Diagnostic } from '@mapbard/schema';
import type { CaptureReport, PageFinding, Sample, SampleFinding } from './capture.js';
import type { Phase } from './phase.js';

/** Findings the map's own movement causes; in flight they warn, at rest they fail. */
const MOVING_MAP_KINDS = new Set<SampleFinding['kind']>([
  'target-occluded',
  'target-offscreen',
  'symbol-occluded',
]);

/**
 * Every rest finding is an error. In flight, symbols and targets passing under a panel or off
 * screen warn, because the map moves under the panels; a callout label must never be covered,
 * so callout findings stay errors.
 */
export function severityOf(finding: SampleFinding, phase: Phase): Diagnostic['severity'] {
  return phase === 'flight' && MOVING_MAP_KINDS.has(finding.kind) ? 'warning' : 'error';
}

const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** What a finding is about, without its measurement: equal subjects group across samples. */
function subject(finding: SampleFinding): string {
  switch (finding.kind) {
    case 'target-offscreen':
      return `target ${finding.target} is off screen`;
    case 'target-occluded':
      return `target ${finding.target} is under ${finding.by}`;
    case 'panel-overlap':
      return `panels ${finding.panels[0]} and ${finding.panels[1]} overlap`;
    case 'callout-offscreen':
      return `callout ${finding.callout} is cut by the screen edge`;
    case 'callout-occluded':
      return `callout ${finding.callout} is under ${finding.by}`;
    case 'callout-overlap':
      return `callouts ${finding.callouts[0]} and ${finding.callouts[1]} overlap`;
    case 'callout-covers-target':
      return `callout ${finding.callout} covers target ${finding.target}`;
    case 'symbol-occluded':
      return `symbol ${finding.symbol} is under ${finding.by}`;
    case 'callout-covers-symbol':
      return `callout ${finding.callout} covers symbol ${finding.symbol}`;
    case 'idle-timeout':
      return `the map did not go idle within ${finding.timeoutMs} ms`;
    case 'seek-mismatch':
      return `seeking showed ${finding.shown ? `${finding.shown.sceneId} at p ${finding.shown.p}` : 'no scene'}`;
  }
}

/** The worst measurement of a group, worded for the message. */
function measure(findings: SampleFinding[]): string {
  const values = findings.map((finding) =>
    'covered' in finding
      ? finding.covered
      : 'outside' in finding
        ? finding.outside
        : 'area' in finding
          ? finding.area
          : 'depth' in finding
            ? finding.depth
            : undefined,
  );
  const first = findings[0]!;
  const worst = Math.max(...values.map((value) => value ?? 0));
  if ('covered' in first || 'outside' in first) return ` (up to ${percent(worst)})`;
  if ('area' in first) return ` (up to ${worst} px²)`;
  if ('depth' in first) return ` (up to ${worst} px deep)`;
  return '';
}

function remedy(finding: SampleFinding, phase: Phase): string {
  switch (finding.kind) {
    case 'target-offscreen':
    case 'target-occluded':
    case 'symbol-occluded':
      return phase === 'flight'
        ? 'Keep the flight in the free map area: raise its zoom or pitch, shorten the path, or fade the layer or callout with a track while the camera passes.'
        : 'Move the scene camera (center, zoom or bearing) so it sits in the free map area, or choose a layout that reserves less of the screen.';
    case 'panel-overlap':
      return 'Shorten the panel content or choose another layout, so the rail panels do not overlap.';
    case 'callout-offscreen':
    case 'callout-occluded':
    case 'callout-overlap':
    case 'callout-covers-target':
    case 'callout-covers-symbol':
      return phase === 'flight'
        ? 'Fade the callout with a callout track while the camera passes, or shorten its label.'
        : 'Shorten the callout label, adjust the scene camera so its target has room, or fade it with a callout track.';
    case 'idle-timeout':
      return 'Simplify the scene layers or reduce their data so the map settles, then rerun.';
    case 'seek-mismatch':
      return 'Rebuild with this CLI version and rerun; if it persists, report a MapBard bug.';
  }
}

const sampleCode = (finding: SampleFinding): Diagnostic['code'] =>
  finding.kind === 'idle-timeout' || finding.kind === 'seek-mismatch'
    ? 'VISUAL_RUNTIME'
    : 'VISUAL_OCCLUSION';

const positions = (values: number[]): string =>
  `p ${[...new Set(values)].sort((a, b) => a - b).join(', ')}`;

/**
 * Turn capture findings into diagnostics. Findings with the same scene, viewport, phase and
 * subject group into one diagnostic that lists every position, so a symbol that passes under the
 * card for half a flight reads as one problem.
 */
export function visualDiagnostics(
  report: Pick<CaptureReport, 'captures' | 'sweep' | 'pageFindings'>,
  sceneIndex: ReadonlyMap<string, number>,
  options: { failOnWarnings?: boolean } = {},
): Diagnostic[] {
  const groups = new Map<
    string,
    { sample: Sample; findings: SampleFinding[]; positions: number[] }
  >();
  const samples = [...report.captures, ...report.sweep].sort(
    (a, b) =>
      (sceneIndex.get(a.sceneId) ?? 0) - (sceneIndex.get(b.sceneId) ?? 0) ||
      a.viewport.localeCompare(b.viewport) ||
      a.p - b.p,
  );
  for (const sample of samples)
    for (const finding of sample.findings) {
      const key = [sample.sceneId, sample.viewport, sample.phase, subject(finding)].join('\u0000');
      const group = groups.get(key) ?? { sample, findings: [], positions: [] };
      group.findings.push(finding);
      group.positions.push(sample.p);
      groups.set(key, group);
    }
  const diagnostics: Diagnostic[] = [...groups.values()].map(
    ({ sample, findings, positions: at }) => {
      const finding = findings[0]!;
      const severity = severityOf(finding, sample.phase);
      const index = sceneIndex.get(sample.sceneId);
      return {
        code: sampleCode(finding),
        severity: options.failOnWarnings ? 'error' : severity,
        artifact: sampleCode(finding) === 'VISUAL_RUNTIME' ? 'export' : 'design',
        path: index === undefined ? [] : ['scenes', index],
        ids: { sceneId: sample.sceneId },
        message: `Scene ${sample.sceneId}, ${sample.viewport}, ${sample.phase} at ${positions(at)}: ${subject(finding)}${measure(findings)}.`,
        remedy: remedy(finding, sample.phase),
      };
    },
  );
  return [...diagnostics, ...report.pageFindings.map(pageDiagnostic)];
}

function pageDiagnostic(finding: PageFinding): Diagnostic {
  const base: Omit<Diagnostic, 'message' | 'remedy'> = {
    code: 'VISUAL_RUNTIME',
    severity: 'error',
    artifact: 'export',
    path: [],
    ids: {},
  };
  switch (finding.kind) {
    case 'console-error':
      return {
        ...base,
        message: `Console error: ${finding.message}`,
        remedy: 'Open the build in a browser, fix the reported error, then rerun check --visual.',
      };
    case 'page-error':
      return {
        ...base,
        message: `Page error: ${finding.message}`,
        remedy: 'Open the build in a browser, fix the reported error, then rerun check --visual.',
      };
    case 'offline-request':
      return {
        ...base,
        message: `The offline build made ${finding.urls.length} network request(s): ${finding.urls.slice(0, 3).join(', ')}${finding.urls.length > 3 ? ', …' : ''}`,
        remedy: 'Remove online sources from the offline build; every asset it loads must be local.',
      };
  }
}

/** Counts for the command result. */
export function visualSummary(report: CaptureReport, diagnostics: Diagnostic[]) {
  const all = [...report.captures, ...report.sweep];
  const findingsIn = (phase: Phase) =>
    all
      .filter((sample) => sample.phase === phase)
      .reduce((total, sample) => total + sample.findings.length, 0);
  return {
    network: report.network,
    captures: report.captures.length,
    sweepSamples: report.sweep.length,
    findings: {
      rest: findingsIn('rest'),
      flight: findingsIn('flight'),
      page: report.pageFindings.length,
    },
    errors: diagnostics.filter((entry) => entry.severity === 'error').length,
    warnings: diagnostics.filter((entry) => entry.severity === 'warning').length,
  };
}
