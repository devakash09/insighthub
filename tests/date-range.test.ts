import { describe, expect, it } from "vitest";
import { resolveDateRange, rangeToParams } from "@/lib/date-range";

const NOW = new Date("2026-08-12T15:30:00");

describe("resolveDateRange", () => {
  it("defaults to last 30 days", () => {
    const r = resolveDateRange({}, NOW);
    expect(r.key).toBe("30d");
    expect(r.days).toBe(30);
    expect(r.to).toEqual(NOW);
  });

  it("falls back to 30d on unknown keys", () => {
    expect(resolveDateRange({ range: "bogus" }, NOW).key).toBe("30d");
  });

  it("today starts at local midnight", () => {
    const r = resolveDateRange({ range: "today" }, NOW);
    expect(r.from.getHours()).toBe(0);
    expect(r.from.getDate()).toBe(12);
    expect(r.granularity).toBe("hour");
  });

  it("yesterday is a closed one-day window", () => {
    const r = resolveDateRange({ range: "yesterday" }, NOW);
    expect(r.from.getDate()).toBe(11);
    expect(r.to.getDate()).toBe(12);
    expect(r.to.getHours()).toBe(0);
  });

  it("comparison window immediately precedes and has equal length", () => {
    const r = resolveDateRange({ range: "7d" }, NOW);
    expect(r.prevTo).toEqual(r.from);
    expect(r.to.getTime() - r.from.getTime()).toBe(r.prevTo.getTime() - r.prevFrom.getTime());
  });

  it("last month covers the full previous calendar month", () => {
    const r = resolveDateRange({ range: "last-month" }, NOW);
    expect(r.from).toEqual(new Date(2026, 6, 1));
    expect(r.to).toEqual(new Date(2026, 7, 1));
  });

  it("custom range is inclusive of the end date", () => {
    const r = resolveDateRange({ range: "custom", from: "2026-07-01", to: "2026-07-15" }, NOW);
    expect(r.from).toEqual(new Date("2026-07-01T00:00:00"));
    expect(r.to).toEqual(new Date("2026-07-16T00:00:00"));
    expect(r.days).toBe(15);
  });

  it("invalid custom ranges fall back to 30 days", () => {
    const r = resolveDateRange({ range: "custom", from: "2026-07-20", to: "2026-07-01" }, NOW);
    expect(r.days).toBe(30);
  });

  it("granularity scales with window size", () => {
    expect(resolveDateRange({ range: "7d" }, NOW).granularity).toBe("day");
    expect(resolveDateRange({ range: "90d" }, NOW).granularity).toBe("day");
    expect(resolveDateRange({ range: "this-year" }, NOW).granularity).toBe("week");
  });
});

describe("rangeToParams", () => {
  it("round-trips preset keys", () => {
    const r = resolveDateRange({ range: "90d" }, NOW);
    expect(rangeToParams(r)).toEqual({ range: "90d" });
  });

  it("serializes custom ranges with dates", () => {
    const r = resolveDateRange({ range: "custom", from: "2026-07-01", to: "2026-07-15" }, NOW);
    const params = rangeToParams(r);
    expect(params.range).toBe("custom");
    expect(params.from).toBe("2026-07-01");
  });
});
