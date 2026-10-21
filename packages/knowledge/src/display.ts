// Reader-facing text rules. Authored values keep their spelling; only the display form changes.

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
};

/** Caret exponents become superscripts (`ft^3/s` → `ft³/s`, `m^-1` → `m⁻¹`); nothing else changes. */
export function formatUnit(unit: string): string {
  return unit.replace(/\^([+-]?\d+)/g, (_, exponent: string) =>
    [...exponent].map((char) => SUPERSCRIPTS[char]!).join(''),
  );
}

/** Fallback title for an identifier: `daily_mean_discharge` → "Daily mean discharge". */
export function humanizeId(id: string): string {
  const words = id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  const text = words.join(' ');
  return text ? text[0]!.toUpperCase() + text.slice(1) : id;
}

const INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const HUNDREDTHS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const SMALL = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });

/** Legend numbers: thousands separators and no float noise (8253.333 → "8,253"). */
export function formatNumber(value: number): string {
  const magnitude = Math.abs(value);
  if (Number.isInteger(value) || magnitude >= 1000) return INTEGER.format(value);
  if (magnitude >= 1) return HUNDREDTHS.format(value);
  return SMALL.format(value);
}
