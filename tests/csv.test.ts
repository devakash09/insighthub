import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF", () => {
    const csv = toCsv(["a", "b"], [["1", "2"]]);
    expect(csv).toBe("a,b\r\n1,2\r\n");
  });

  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv(["name"], [['Acme, Inc "HQ"'], ["line1\nline2"]]);
    expect(csv).toContain('"Acme, Inc ""HQ"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it("serializes dates as ISO and nulls as empty", () => {
    const csv = toCsv(["seen", "email"], [[new Date("2026-01-01T00:00:00Z"), null]]);
    expect(csv).toContain("2026-01-01T00:00:00.000Z,");
  });
});
