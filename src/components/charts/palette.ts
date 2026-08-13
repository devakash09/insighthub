/**
 * Chart color assignment. The 8 categorical slots are a CVD-validated ordered
 * palette (defined in globals.css for light and dark) — always assign in slot
 * order, never cycle or generate hues. More than 8 classes must fold into
 * "Other" before reaching this file.
 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

export const CHART_GRID = "var(--chart-grid)";
export const CHART_AXIS = "var(--chart-axis)";
export const CHART_DIM = "var(--chart-emphasis-dim)";

export function seriesColor(index: number): string {
  return CHART_COLORS[Math.min(index, CHART_COLORS.length - 1)];
}

/** Fold rows beyond `max` into a single "Other" bucket (categorical safety). */
export function foldOther<T extends { value: number }>(
  rows: T[],
  max: number,
  makeOther: (sum: number) => T,
): T[] {
  if (rows.length <= max) return rows;
  const kept = rows.slice(0, max - 1);
  const sum = rows.slice(max - 1).reduce((s, r) => s + r.value, 0);
  return [...kept, makeOther(sum)];
}
