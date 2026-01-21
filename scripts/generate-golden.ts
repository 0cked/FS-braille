import { writeFile } from "node:fs/promises";
import { BRAILLE_PROFILES } from "../config/profiles";
import { translateText } from "../lib/translation.node";

const CASES = [
  "EXIT",
  "RESTROOM",
  "ROOM 101",
  "SUITE 200",
  "2ND FLOOR",
  "NO SMOKING",
  "Conference Room A"
];

const run = async () => {
  for (const profile of BRAILLE_PROFILES) {
    const cases = [];
    let liblouisVersion = "unknown";
    for (const input of CASES) {
      const result = await translateText(
        input,
        profile
      );
      liblouisVersion = result.metadata.liblouis_version;
      cases.push({
        input,
        unicode_braille: result.unicode_braille,
        cells: result.cells.map((cell) => cell.bitstring),
        dots: result.plain_dots
      });
    }

    const payload = {
      profile_id: profile.id,
      liblouis_version: liblouisVersion,
      cases
    };

    await writeFile(
      new URL(`../tests/golden.${profile.id}.json`, import.meta.url),
      JSON.stringify(payload, null, 2) + "\n"
    );
    console.log(`Wrote golden file for ${profile.id}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
