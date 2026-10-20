import type { Diagnostic, ResolvedScale } from '@mapbard/schema';

export type ScaleKey = { sceneId: string; layerId: string; sourceId: string };
export type ScaleInput = {
  id: string;
  memberKeys: ScaleKey[];
  unit: string | null;
  values: unknown[];
  palette: string[];
  classes: number;
  domain?: [number, number];
  path: (string | number)[];
};

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
          'Equal-interval classes require 2–9 classes and one color per requested class.',
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
  const edges: number[] = [min];
  const lowerPaletteIndices = [0];
  if (min !== max) {
    for (let i = 1; i < input.classes; i++) {
      const t = i / input.classes;
      const edge = (1 - t) * min + t * max;
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
  const suffix = input.unit === null ? '' : ` ${input.unit}`;
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
  const displayInteger = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const labels =
    min === max
      ? [`${min}${suffix}`]
      : useIntegerRanges
        ? integerRanges.map(
            ([lower, upper]) =>
              `${displayInteger.format(lower)}–${displayInteger.format(upper)}${suffix}`,
          )
        : Array.from(
            { length: effectiveClasses },
            (_, index) =>
              `[${edges[index]}, ${edges[index + 1]}${index === effectiveClasses - 1 ? ']' : ')'}${suffix}`,
          );
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
    diagnostics: [],
  };
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
        label: `${String(value)} (${typeof value})`,
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
  const radiusRange: [number, number] = min === max ? (max === 0 ? [0, 0] : [8, 8]) : [0, 16];
  const examples = min === max ? [max] : [0, max / 4, max];
  const suffix = input.unit === null ? '' : ` ${input.unit}`;
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
        radius: min === max ? radiusRange[0] : 16 * Math.sqrt(value / max),
        label: `${value}${suffix}${max === 0 ? ' (zero area)' : ''}`,
      })),
    },
    diagnostics: [],
  };
}
