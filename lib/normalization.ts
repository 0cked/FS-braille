export type NormalizationOptions = {
  normalizeWhitespace: boolean;
  smartQuotes: boolean;
  preserveLineBreaks: boolean;
  unsupportedHandling: "replace" | "remove";
};

export const DEFAULT_NORMALIZATION_OPTIONS: NormalizationOptions = {
  normalizeWhitespace: false,
  smartQuotes: false,
  preserveLineBreaks: true,
  unsupportedHandling: "replace"
};

export type Warning = {
  type: "unsupported_character" | "replacement" | "normalization";
  message: string;
  indexRange?: [number, number];
};

export type NormalizationResult = {
  original: string;
  normalized: string;
  applied: string[];
  warnings: Warning[];
  diff?: {
    before: string;
    after: string;
  };
};

const SMART_REPLACEMENTS: Array<[RegExp, string, string]> = [
  [/\u2018|\u2019/g, "'", "Curly single quote"],
  [/\u201C|\u201D/g, '"', "Curly double quote"],
  [/\u2013|\u2014/g, "-", "Dash"],
  [/\u2026/g, "...", "Ellipsis"],
  [/\u00a0/g, " ", "Non-breaking space"]
];

const SUPPORTED_CHAR_REGEX = /[A-Za-z0-9 .,;:!?"'\-/#&()\[\]{}+*=<>@$%\n\r\t]/;

const normalizeLineWhitespace = (line: string) => {
  const collapsed = line.replace(/[\t\f\v]+/g, " ").replace(/ {2,}/g, " ");
  return collapsed.trimEnd();
};

export const normalizeInput = (
  input: string,
  options: NormalizationOptions
): NormalizationResult => {
  let working = input.replace(/\r\n/g, "\n");
  const warnings: Warning[] = [];
  const applied: string[] = [];

  if (options.smartQuotes) {
    SMART_REPLACEMENTS.forEach(([pattern, replacement, label]) => {
      if (pattern.test(working)) {
        working = working.replace(pattern, replacement);
        warnings.push({
          type: "replacement",
          message: `${label} normalized to ASCII.`
        });
        applied.push("smart_quotes");
      }
    });
  }

  if (options.normalizeWhitespace) {
    const lines = working.split("\n");
    const normalizedLines = lines.map((line) => normalizeLineWhitespace(line));
    working = options.preserveLineBreaks
      ? normalizedLines.join("\n")
      : normalizedLines.join(" ");
    applied.push("normalize_whitespace");
  }

  let normalized = "";
  for (let i = 0; i < working.length; i += 1) {
    const char = working[i];
    if (SUPPORTED_CHAR_REGEX.test(char)) {
      normalized += char;
      continue;
    }

    if (options.unsupportedHandling === "remove") {
      warnings.push({
        type: "unsupported_character",
        message: `Removed unsupported character: ${JSON.stringify(char)}.`,
        indexRange: [i, i + 1]
      });
      applied.push("unsupported_removed");
      continue;
    }

    warnings.push({
      type: "unsupported_character",
      message: `Replaced unsupported character: ${JSON.stringify(char)}.`,
      indexRange: [i, i + 1]
    });
    applied.push("unsupported_replaced");
    normalized += "?";
  }

  const result: NormalizationResult = {
    original: input,
    normalized,
    applied: Array.from(new Set(applied)),
    warnings
  };

  if (result.original !== result.normalized) {
    result.diff = {
      before: result.original,
      after: result.normalized
    };
  }

  return result;
};
