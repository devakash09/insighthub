import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatDelta,
  formatDuration,
  formatPercent,
  pctChange,
} from "@/lib/format";

describe("number formatting", () => {
  it("keeps small numbers whole and compacts large ones", () => {
    expect(formatCompact(1284)).toBe("1,284");
    expect(formatCompact(12_900)).toBe("12.9K");
    expect(formatCompact(4_200_000)).toBe("4.2M");
  });

  it("formats currency", () => {
    expect(formatCurrency(128430)).toBe("$128,430");
    expect(formatCurrency(79.5, { cents: true })).toBe("$79.50");
    expect(formatCurrencyCompact(128_430)).toBe("$128.4K");
  });

  it("formats percentages and deltas", () => {
    expect(formatPercent(18.44)).toBe("18.4%");
    expect(formatDelta(18.42)).toBe("+18.4%");
    expect(formatDelta(-3.21)).toContain("3.2%");
    expect(formatDelta(null)).toBe("—");
  });

  it("formats durations human-readably", () => {
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(150)).toBe("2m 30s");
    expect(formatDuration(3720)).toBe("1h 02m");
  });
});

describe("pctChange", () => {
  it("computes percentage change", () => {
    expect(pctChange(120, 100)).toBeCloseTo(20);
    expect(pctChange(80, 100)).toBeCloseTo(-20);
  });

  it("handles zero baselines", () => {
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(50, 0)).toBeNull();
  });
});
