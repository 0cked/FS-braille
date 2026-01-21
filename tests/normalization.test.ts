import { describe, expect, it } from "vitest";
import {
  DEFAULT_NORMALIZATION_OPTIONS,
  normalizeInput
} from "../lib/normalization";

describe("normalizeInput", () => {
  it("normalizes smart quotes and whitespace", () => {
    const result = normalizeInput("Room\u2019  101", {
      ...DEFAULT_NORMALIZATION_OPTIONS,
      smartQuotes: true,
      normalizeWhitespace: true,
      preserveLineBreaks: true
    });
    expect(result.normalized).toBe("Room' 101");
  });

  it("preserves line breaks when enabled", () => {
    const result = normalizeInput("Line 1\nLine   2", {
      ...DEFAULT_NORMALIZATION_OPTIONS,
      normalizeWhitespace: true,
      preserveLineBreaks: true
    });
    expect(result.normalized).toBe("Line 1\nLine 2");
  });

  it("replaces unsupported characters", () => {
    const result = normalizeInput("Room 101★", {
      ...DEFAULT_NORMALIZATION_OPTIONS,
      unsupportedHandling: "replace"
    });
    expect(result.normalized).toBe("Room 101?");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
