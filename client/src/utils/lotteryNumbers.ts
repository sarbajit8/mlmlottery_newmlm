export function randomDigits(length: number): string {
  const max = 10 ** length;
  return String(Math.floor(Math.random() * max)).padStart(length, '0');
}

/** Generates `count` unique random `length`-digit strings, skipping anything already in `exclude`. */
export function generateUniqueNumbers(count: number, length: number, exclude: Set<string> = new Set()): string[] {
  const maxPossible = 10 ** length;
  const safeCount = Math.min(count, Math.max(0, maxPossible - exclude.size));
  const result = new Set<string>();
  let attempts = 0;
  while (result.size < safeCount && attempts < safeCount * 50 + 1000) {
    const candidate = randomDigits(length);
    if (!exclude.has(candidate) && !result.has(candidate)) result.add(candidate);
    attempts++;
  }
  return [...result];
}

/** Parses a free-text textarea value (comma/newline/space separated) into a clean list of numbers. */
export function parseNumberList(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatNumberList(numbers: string[], showCount = 3): string {
  if (numbers.length === 0) return '—';
  const shown = numbers.slice(0, showCount).join(', ');
  const remaining = numbers.length - showCount;
  return remaining > 0 ? `${shown}, +${remaining}` : shown;
}
