import { describe, expect, it } from "vitest";
import { complianceCheck, decideGrade } from "../lib/compliance";

describe("decideGrade (conservative, deterministic)", () => {
  it('RESTROOM → grade1', () => {
    expect(decideGrade("RESTROOM").grade).toBe("grade1");
  });

  it('Conference Room → grade1', () => {
    expect(decideGrade("Conference Room").grade).toBe("grade1");
  });

  it('Employees Only → grade1', () => {
    expect(decideGrade("Employees Only").grade).toBe("grade1");
  });

  it("Sentence-like text → grade2", () => {
    expect(decideGrade("This area is restricted to authorized personnel.").grade).toBe(
      "grade2"
    );
  });

  it('Room 204 → grade1', () => {
    expect(decideGrade("Room 204").grade).toBe("grade1");
  });

  it('Suite 12B → grade1', () => {
    expect(decideGrade("Suite 12B").grade).toBe("grade1");
  });

  it('Call 860-555-1212 → grade1', () => {
    expect(decideGrade("Call 860-555-1212").grade).toBe("grade1");
  });

  it("Long sentence → grade2", () => {
    expect(decideGrade("Use the elevator to reach the second floor.").grade).toBe(
      "grade2"
    );
  });

  it('Model MX-3000 → grade1', () => {
    expect(decideGrade("Model MX-3000").grade).toBe("grade1");
  });

  it("Long sentence (wash hands) → grade2", () => {
    expect(
      decideGrade("Please wash your hands before returning to work.").grade
    ).toBe("grade2");
  });
});

describe("complianceCheck (risk flags; never claims compliance)", () => {
  const run = (text: string) =>
    complianceCheck({
      text,
      profileId: "en-us-g2",
      smartSelectEnabled: false
    });

  it("smart quotes → WARN", () => {
    const report = run("“Restroom”");
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("non_ascii_quotes");
  });

  it("em dash → WARN", () => {
    const report = run("RESTROOM — WOMEN");
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("dash_variant");
  });

  it("non-English letter → WARN", () => {
    const report = run("Café");
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("non_ascii_letter");
  });

  it("punctuation density → WARN", () => {
    const report = run("Room 204 (East)");
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("punctuation_dense");
  });

  it("emoji/unexpected symbol → BLOCK", () => {
    const report = run("😀 Restroom");
    expect(report.level).toBe("BLOCK");
    expect(report.flags.map((f) => f.code)).toContain("emoji_or_pictograph");
  });

  it("tel: technical string → WARN", () => {
    const report = run("tel:8605551212");
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("technical_string");
  });

  it("multiline input → WARN", () => {
    const report = run("EXIT\nCOPY ROOM");
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("multiline_input");
  });

  it("very long string → WARN", () => {
    const report = run(
      "This is a very long sign label that will likely exceed typical formats and needs review."
    );
    expect(report.level).toBe("WARN");
    expect(report.flags.map((f) => f.code)).toContain("length_risk");
  });
});

