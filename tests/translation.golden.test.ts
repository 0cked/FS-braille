import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProfileById } from "../config/profiles";
import { DEFAULT_NORMALIZATION_OPTIONS } from "../lib/normalization";
import { translateText } from "../lib/translation";

const loadGolden = (profileId: "en-us-g1" | "en-us-g2") => {
  const raw = readFileSync(
    new URL(`./golden.${profileId}.json`, import.meta.url),
    "utf8"
  );
  const parsed = JSON.parse(raw);
  if (parsed.liblouis_version === "__GENERATE__") {
    throw new Error(
      "Golden files not generated. Run `npm run update-golden` after installing liblouis assets."
    );
  }
  return parsed;
};

const runProfileTests = (profileId: "en-us-g1" | "en-us-g2") => {
  const golden = loadGolden(profileId);
  const profile = getProfileById(profileId);

  golden.cases.forEach((testCase: any) => {
    it(`${profileId} translates ${testCase.input}`, async () => {
      const result = await translateText(
        testCase.input,
        profile,
        DEFAULT_NORMALIZATION_OPTIONS
      );
      expect(result.unicode_braille).toBe(testCase.unicode_braille);
      expect(result.cells.map((cell) => cell.bitstring)).toEqual(
        testCase.cells
      );
      expect(result.plain_dots).toBe(testCase.dots);
    });
  });
};

describe("golden translation tests", () => {
  runProfileTests("en-us-g1");
  runProfileTests("en-us-g2");
});
