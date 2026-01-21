import { BrailleProfile } from "../config/profiles";
import { getLiblouisVersion, translateWithLiblouis } from "./louis.node";
import { TranslationWarning } from "./translation";

export type BrailleCell = {
  bitstring: string;
  dots: string;
  unicode: string;
};

export type TranslationResult = {
  unicode_braille: string;
  cells: BrailleCell[];
  plain_dots: string;
  warnings: TranslationWarning[];
  metadata: {
    liblouis_version: string;
    profile_id: BrailleProfile["id"];
    table_names: string[];
  };
  lines: BrailleCell[][];
};

const BRAILLE_BASE = 0x2800;

const cellFromCodepoint = (codepoint: number): BrailleCell => {
  const bitmask = codepoint - BRAILLE_BASE;
  const bits = [
    bitmask & 0b00000001,
    bitmask & 0b00000010,
    bitmask & 0b00000100,
    bitmask & 0b00001000,
    bitmask & 0b00010000,
    bitmask & 0b00100000
  ];
  const bitstring = bits.map((bit) => (bit ? "1" : "0")).join("");
  const dots = bits
    .map((bit, index) => (bit ? `${index + 1}` : ""))
    .filter(Boolean)
    .join("-");
  return {
    bitstring,
    dots,
    unicode: String.fromCodePoint(codepoint)
  };
};

const isBrailleChar = (codepoint: number) =>
  codepoint >= BRAILLE_BASE && codepoint <= 0x28ff;

export const translateText = async (
  text: string,
  profile: BrailleProfile
): Promise<TranslationResult> => {
  const warnings: TranslationWarning[] = [];
  const segments = text.split(/\r?\n/);

  const translatedSegments: string[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment.trim()) {
      translatedSegments.push("");
      continue;
    }
    const raw = await translateWithLiblouis(profile.tables, segment);
    if (!raw) {
      warnings.push({
        code: "translation_failed",
        message: `Translation failed on line ${index + 1}. Tables may be missing or not loaded yet.`
      });
      translatedSegments.push("");
      continue;
    }
    translatedSegments.push(raw.replace(/\n+/g, " "));
  }

  const unicode_braille = translatedSegments.join("\n");
  const lines: BrailleCell[][] = [];
  const cells: BrailleCell[] = [];

  unicode_braille.split("\n").forEach((line, lineIndex) => {
    const lineCells: BrailleCell[] = [];
    Array.from(line).forEach((char) => {
      const codepoint = char.codePointAt(0);
      if (codepoint === undefined) {
        return;
      }
      if (!isBrailleChar(codepoint)) {
        warnings.push({
          code: "non_braille_output",
          message: `Non-braille character in output at line ${lineIndex + 1}.`
        });
        return;
      }
      const cell = cellFromCodepoint(codepoint);
      lineCells.push(cell);
      cells.push(cell);
      if (codepoint - BRAILLE_BASE > 0b00111111) {
        warnings.push({
          code: "eight_dot_detected",
          message: "Detected 8-dot braille; preview is truncated to 6-dot view."
        });
      }
    });
    lines.push(lineCells);
  });

  const plainDotsLines = lines.map((line) =>
    line.map((cell) => cell.dots || "0").join(" ")
  );

  return {
    unicode_braille,
    cells,
    plain_dots: plainDotsLines.join("\n"),
    warnings,
    metadata: {
      liblouis_version: await getLiblouisVersion(),
      profile_id: profile.id,
      table_names: profile.tables
    },
    lines
  };
};
