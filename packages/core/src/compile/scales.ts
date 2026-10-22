import { formatNumber, formatUnit } from '@mapbard/knowledge';
import { DEFAULT_MAX_RADIUS, type Diagnostic, type ResolvedScale } from '@mapbard/schema';

export type ScaleKey = { sceneId: string; layerId: string; sourceId: string };
export type ScaleInput = {
  id: string;
  /** Reader-facing legend title, resolved by the compiler. */
  title: string;
  memberKeys: ScaleKey[];
  unit: string | null;
  values: unknown[];
  palette: string[];
  classes: number;
  /** Numeric color classification; equal-interval when omitted. */
  method?: ClassificationMethod;
  /** Manual interior edges, strictly increasing and inside the domain. */
  breaks?: number[];
  domain?: [number, number];
  /** Graduated size: radius of the largest symbol, in CSS pixels. */
  maxRadius?: number;
  path: (string | number)[];
};

export type ClassificationMethod = 'equal-interval' | 'quantile' | 'natural-breaks' | 'manual';

/** Fisher-Jenks is quadratic in distinct values; beyond this, quantile or manual breaks remain. */
export const NATURAL_BREAKS_LIMIT = 5000;

const NO_DATA_COLOR = '#9e9e9e';
const NO_DATA_LABEL = 'No data';

function classify(values: unknown[]): {
  valid: (string | number | boolean)[];
  counts: { valid: number; missing: number; invalid: number };
  invalidIndices: number[];
} {
  const valid: (string | number | boolean)[] = [];
  const invalidIndices: number[] = [];
  let missing = 0;
  values.forEach((value, index) => {
    if (value === null || value === undefined || value === '') missing++;
    else if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      valid.push(value);
    else invalidIndices.push(index);
  });
  return {
    valid,
    invalidIndices,
    counts: { valid: valid.length, missing, invalid: invalidIndices.length },
  };
}

function valueError(
  input: ScaleInput,
  message: string,
  remedy: string,
  counts: {
    valid: number;
    missing: number;
    invalid: number;
  },
): Diagnostic {
  return {
    code: 'VALUE_INVALID',
    severity: 'error',
    artifact: 'data',
    path: input.path,
    ids: { scaleId: input.id, ...input.memberKeys[0] },
    message,
    remedy,
    counts: { missing: counts.missing, invalid: counts.invalid, total: input.values.length },
  };
}

function base(input: ScaleInput, counts: { valid: number; missing: number; invalid: number }) {
  return {
    id: input.id,
    memberKeys: input.memberKeys,
    unit: input.unit,
    title: input.title,
    unitLabel: input.unit === null ? null : formatUnit(input.unit),
    noDataLabel: NO_DATA_LABEL,
    noDataColor: NO_DATA_COLOR,
    counts,
  };
}

export function numericColorScale(input: ScaleInput): {
  scale?: ResolvedScale;
  diagnostics: Diagnostic[];
} {
  const { valid, counts } = classify(input.values);
  if (input.classes < 2 || input.classes > 9 || input.palette.length < input.classes)
    return {
      diagnostics: [
        valueError(
          input,
          'Numeric color classes require 2–9 classes and one color per requested class.',
          'Choose 2–9 classes and supply an aligned palette.',
          counts,
        ),
      ],
    };
  const numbers = valid.filter((value): value is number => typeof value === 'number');
  const invalid = counts.invalid + valid.length - numbers.length;
  const resolvedCounts = { ...counts, valid: numbers.length, invalid };
  if (invalid)
    return {
      diagnostics: [
        valueError(
          input,
          'Numeric scale contains nonnumeric values.',
          'Correct the source values or use categorical color.',
          resolvedCounts,
        ),
      ],
    };
  if (!numbers.length)
    return {
      diagnostics: [
        valueError(
          input,
          'Numeric scale has no finite values.',
          'Supply measured values or use a constant depiction.',
          resolvedCounts,
        ),
      ],
    };
  const observedMin = numbers.reduce((min, value) => Math.min(min, value), Infinity);
  const observedMax = numbers.reduce((max, value) => Math.max(max, value), -Infinity);
  const [min, max] = input.domain ?? [observedMin, observedMax];
  if (min > max || observedMin < min || observedMax > max)
    return {
      diagnostics: [
        valueError(
          input,
          'Explicit domain does not contain every valid value.',
          'Expand the authored domain to include all valid values.',
          resolvedCounts,
        ),
      ],
    };
  const method = input.method ?? 'equal-interval';
  const breaksError = manualBreaksError(input, method, min, max);
  if (breaksError)
    return { diagnostics: [valueError(input, breaksError[0], breaksError[1], resolvedCounts)] };
  const distinct = new Set(numbers).size;
  if (method === 'natural-breaks' && distinct > NATURAL_BREAKS_LIMIT)
    return {
      diagnostics: [
        valueError(
          input,
          `Natural breaks supports up to ${NATURAL_BREAKS_LIMIT} distinct values; this scale has ${distinct}.`,
          'Use quantile or manual breaks for this many distinct values.',
          resolvedCounts,
        ),
      ],
    };
  const candidates = candidateEdges(method, numbers, min, max, input);
  const edges: number[] = [min];
  const lowerPaletteIndices = [0];
  if (min !== max) {
    for (let i = 1; i < input.classes; i++) {
      const edge = candidates[i - 1]!;
      if (!Number.isFinite(edge))
        return {
          diagnostics: [
            valueError(
              input,
              'Class edge is not finite.',
              'Use finite domain bounds with a smaller range.',
              resolvedCounts,
            ),
          ],
        };
      if (edge > edges[edges.length - 1]! && edge < max) {
        edges.push(edge);
        lowerPaletteIndices.push(i);
      }
    }
    edges.push(max);
  }
  const effectiveClasses = min === max ? 1 : edges.length - 1;
  const colors = lowerPaletteIndices.map((index) => input.palette[index]!);
  const integerRanges = edges
    .slice(0, -1)
    .map((edge, index): [number, number] => [
      Math.ceil(edge),
      index === effectiveClasses - 1
        ? Math.floor(edges[index + 1]!)
        : Math.ceil(edges[index + 1]!) - 1,
    ]);
  const useIntegerRanges =
    numbers.every(Number.isSafeInteger) &&
    edges.some((edge) => !Number.isInteger(edge)) &&
    integerRanges.every(
      ([lower, upper]) =>
        Number.isSafeInteger(lower) && Number.isSafeInteger(upper) && lower <= upper,
    );
  // Units appear once, in the legend title; exact edges stay machine-readable in `edges`.
  const ranges: [number, number][] = useIntegerRanges
    ? integerRanges
    : Array.from({ length: effectiveClasses }, (_, index) => [edges[index]!, edges[index + 1]!]);
  const rounded = ranges.map(([lower, upper]) => [formatNumber(lower), formatNumber(upper)]);
  // Rounding must never make a class look empty or two classes look alike; then show exact edges.
  const ambiguous =
    rounded.some(
      ([lower, upper], index) => lower === upper && ranges[index]![0] !== ranges[index]![1],
    ) || new Set(rounded.map((pair) => pair.join())).size !== rounded.length;
  const labels =
    min === max
      ? [formatNumber(min)]
      : (ambiguous ? ranges.map(([lower, upper]) => [String(lower), String(upper)]) : rounded).map(
          ([lower, upper], index) =>
            ranges[index]![0] === ranges[index]![1] ? lower! : `${lower}–${upper}`,
        );
  const diagnostics: Diagnostic[] = [];
  if ((method === 'quantile' || method === 'natural-breaks') && effectiveClasses < input.classes)
    diagnostics.push({
      ...valueError(
        input,
        `Only ${effectiveClasses} of ${input.classes} ${method} classes are distinct for these values.`,
        'Request fewer classes or set manual breaks.',
        resolvedCounts,
      ),
      severity: 'warning',
    });
  return {
    scale: {
      ...base(input, resolvedCounts),
      kind: 'numeric-color',
      domain: [min, max],
      edges,
      colors,
      labels,
      effectiveClasses,
    },
    diagnostics,
  };
}

function manualBreaksError(
  input: ScaleInput,
  method: ClassificationMethod,
  min: number,
  max: number,
): [message: string, remedy: string] | undefined {
  const breaks = input.breaks;
  if (method !== 'manual')
    return breaks
      ? ['Breaks are only used by manual classification.', 'Remove breaks or use method manual.']
      : undefined;
  if (!breaks || breaks.length !== input.classes - 1)
    return [
      `Manual classification with ${input.classes} classes needs ${input.classes - 1} breaks.`,
      'List one interior break between each pair of adjacent classes.',
    ];
  if (breaks.some((edge, index) => index > 0 && edge <= breaks[index - 1]!))
    return ['Manual breaks must be strictly increasing.', 'Sort the breaks and remove duplicates.'];
  if (breaks[0]! <= min || breaks.at(-1)! >= max)
    return [
      'Manual breaks must lie strictly inside the scale domain.',
      'Move the breaks inside the data range or widen the authored domain.',
    ];
  return undefined;
}

/** Lower edges for classes 1…k-1 (k = requested classes); duplicates collapse in the caller. */
function candidateEdges(
  method: ClassificationMethod,
  numbers: number[],
  min: number,
  max: number,
  input: ScaleInput,
): number[] {
  const k = input.classes;
  if (method === 'manual') return input.breaks!;
  if (method === 'equal-interval')
    return Array.from({ length: k - 1 }, (_, index) => {
      const t = (index + 1) / k;
      return (1 - t) * min + t * max;
    });
  const sorted = [...numbers].sort((a, b) => a - b);
  // Data-driven edges sit midway between the classes they separate, so an outlier at the
  // maximum can keep a class of its own and every edge stays strictly inside the domain.
  const between = (index: number) => (sorted[index - 1]! + sorted[index]!) / 2;
  if (method === 'quantile')
    return Array.from({ length: k - 1 }, (_, index) => {
      let start = Math.floor(((index + 1) * sorted.length) / k);
      while (start < sorted.length && start > 0 && sorted[start] === sorted[start - 1]) start++;
      return start > 0 && start < sorted.length ? between(start) : max;
    });
  const starts = naturalBreakStarts(sorted, k);
  return Array.from({ length: k - 1 }, (_, index) =>
    index < starts.length ? between(starts[index]!) : max,
  );
}

/**
 * Fisher-Jenks optimal classes over sorted values, computed on distinct values with weights.
 * Returns the sorted-array index where each class after the first begins. Ties keep the earliest
 * split, so the result is deterministic.
 */
function naturalBreakStarts(sorted: number[], classes: number): number[] {
  const values: number[] = [];
  const firstIndex: number[] = [];
  const weights: number[] = [];
  sorted.forEach((value, index) => {
    if (values.length && values[values.length - 1] === value) weights[weights.length - 1]!++;
    else {
      values.push(value);
      firstIndex.push(index);
      weights.push(1);
    }
  });
  const m = values.length;
  const k = Math.min(classes, m);
  const w = [0];
  const s1 = [0];
  const s2 = [0];
  for (let i = 0; i < m; i++) {
    w.push(w[i]! + weights[i]!);
    s1.push(s1[i]! + weights[i]! * values[i]!);
    s2.push(s2[i]! + weights[i]! * values[i]! * values[i]!);
  }
  const cost = (a: number, b: number) => {
    const total = s1[b + 1]! - s1[a]!;
    return s2[b + 1]! - s2[a]! - (total * total) / (w[b + 1]! - w[a]!);
  };
  let previous = Array.from({ length: m }, (_, b) => cost(0, b));
  const from: number[][] = [];
  for (let j = 1; j < k; j++) {
    const next = new Array<number>(m).fill(Infinity);
    const start = new Array<number>(m).fill(j);
    for (let b = j; b < m; b++)
      for (let a = j; a <= b; a++) {
        const total = previous[a - 1]! + cost(a, b);
        if (total < next[b]!) {
          next[b] = total;
          start[b] = a;
        }
      }
    from.push(start);
    previous = next;
  }
  const starts: number[] = [];
  let end = m - 1;
  for (let j = k - 1; j >= 1; j--) {
    const a = from[j - 1]![end]!;
    starts.unshift(firstIndex[a]!);
    end = a - 1;
  }
  return starts;
}

function typeRank(value: string | number | boolean): number {
  return typeof value === 'boolean' ? 0 : typeof value === 'number' ? 1 : 2;
}

export function categoryColorScale(input: ScaleInput): {
  scale: ResolvedScale;
  diagnostics: Diagnostic[];
} {
  const { valid, counts } = classify(input.values);
  const ordered = [
    ...new Map(valid.map((value) => [`${typeof value}:${String(value)}`, value])).values(),
  ].sort((a, b) => {
    const rank = typeRank(a) - typeRank(b);
    if (rank) return rank;
    if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const x = String(a),
      y = String(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  const typedLabels = new Set(ordered.map(String)).size !== ordered.length;
  const diagnostics: Diagnostic[] = [];
  if (counts.invalid)
    diagnostics.push(
      valueError(
        input,
        'Categorical scale contains unsupported values.',
        'Use finite primitive categories or remove invalid values.',
        counts,
      ),
    );
  if (ordered.length > input.palette.length)
    diagnostics.push(
      valueError(
        input,
        'Category count exceeds the available palette.',
        'Supply enough distinct palette colors for every category.',
        counts,
      ),
    );
  if (!ordered.length)
    diagnostics.push({
      ...valueError(
        input,
        'Every categorical value is missing.',
        'Supply categories if a colored comparison is needed.',
        counts,
      ),
      severity: 'warning',
    });
  return {
    scale: {
      ...base(input, counts),
      kind: 'category-color',
      categories: ordered.map((value, index) => ({
        value,
        // Types are shown only when two typed values (1 and "1") would otherwise read the same.
        label: typedLabels ? `${String(value)} (${typeof value})` : String(value),
        color: input.palette[index] ?? input.palette[0]!,
      })),
    },
    diagnostics,
  };
}

export function numericSizeScale(input: ScaleInput): {
  scale?: ResolvedScale;
  diagnostics: Diagnostic[];
} {
  const { valid, counts } = classify(input.values);
  const numbers = valid.filter((value): value is number => typeof value === 'number');
  const typeInvalid = counts.invalid + valid.length - numbers.length;
  const negative = numbers.filter((value) => value < 0).length;
  const invalid = typeInvalid + negative;
  const usable = numbers.filter((value) => value >= 0);
  const resolvedCounts = { ...counts, valid: usable.length, invalid };
  if (typeInvalid)
    return {
      diagnostics: [
        valueError(
          input,
          'Graduated area needs finite number values.',
          'Correct the source data or use a constant point symbol.',
          resolvedCounts,
        ),
      ],
    };
  if (negative)
    return {
      diagnostics: [
        {
          ...valueError(
            input,
            'Negative quantities cannot map to symbol area.',
            'Use a nonnegative ratio quantity or a color encoding.',
            resolvedCounts,
          ),
          code: 'MEASUREMENT_INCOMPATIBLE',
        },
      ],
    };
  if (!usable.length)
    return {
      diagnostics: [
        valueError(
          input,
          'Graduated area has no finite values.',
          'Supply measured values or use a constant symbol.',
          resolvedCounts,
        ),
      ],
    };
  const min = usable.reduce((value, entry) => Math.min(value, entry), Infinity),
    max = usable.reduce((value, entry) => Math.max(value, entry), -Infinity);
  const domain: [number, number] = min === max ? [min, max] : [0, max];
  const largest = input.maxRadius ?? DEFAULT_MAX_RADIUS;
  // One distinct value draws at half the largest radius: there is nothing to compare it with.
  const radiusRange: [number, number] =
    min === max ? (max === 0 ? [0, 0] : [largest / 2, largest / 2]) : [0, largest];
  const examples = min === max ? [max] : [0, max / 4, max];
  return {
    scale: {
      ...base(input, resolvedCounts),
      kind: 'numeric-size',
      domain,
      mapping: 'sqrt-area',
      radiusRange,
      noDataRadius: 3,
      legend: examples.map((value) => ({
        value,
        radius: min === max ? radiusRange[0] : largest * Math.sqrt(value / max),
        label: `${formatNumber(value)}${max === 0 ? ' (zero area)' : ''}`,
      })),
    },
    diagnostics: [],
  };
}
