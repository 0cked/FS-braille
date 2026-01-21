import { describe, expect, it } from "vitest";
import { getProfileById } from "../config/profiles";
import { DEFAULT_NORMALIZATION_OPTIONS } from "../lib/normalization";
import { translateText } from "../lib/translation.node";

describe("multiline translation behavior", () => {
  it("preserves input line breaks by translating each line independently", async () => {
    const profile = getProfileById("en-us-g2");
    const options = { ...DEFAULT_NORMALIZATION_OPTIONS, preserveLineBreaks: true };

    const first = await translateText("EXIT", profile, options);
    const second = await translateText("COPY ROOM", profile, options);
    const combined = await translateText("EXIT\nCOPY ROOM", profile, options);

    expect(combined.unicode_braille).toBe(
      `${first.unicode_braille}\n${second.unicode_braille}`
    );
    expect(combined.lines.length).toBe(2);
  });
});

