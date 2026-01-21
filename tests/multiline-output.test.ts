import { describe, expect, it } from "vitest";
import { getProfileById } from "../config/profiles";
import { translateText } from "../lib/translation.node";

describe("multiline translation behavior", () => {
  it("preserves input line breaks by translating each line independently", async () => {
    const profile = getProfileById("en-us-g2");
    const first = await translateText("EXIT", profile);
    const second = await translateText("COPY ROOM", profile);
    const combined = await translateText("EXIT\nCOPY ROOM", profile);

    expect(combined.unicode_braille).toBe(
      `${first.unicode_braille}\n${second.unicode_braille}`
    );
    expect(combined.lines.length).toBe(2);
  });
});
