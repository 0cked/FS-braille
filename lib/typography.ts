export type TypographyNormalization = {
  normalized: string;
  changes: string[];
};

const REPLACEMENTS: Array<[RegExp, string, string]> = [
  [/\u2018|\u2019/g, "'", "Smart quotes → straight apostrophe"],
  [/\u201C|\u201D/g, '"', "Smart quotes → straight quotes"],
  [/\u2013|\u2014/g, "-", "En/em dash → hyphen"],
  [/\u2026/g, "...", "Ellipsis → three dots"],
  [/\u00a0/g, " ", "Non-breaking space → space"]
];

export const normalizeTypography = (input: string): TypographyNormalization => {
  let working = input;
  const changes: string[] = [];

  REPLACEMENTS.forEach(([pattern, replacement, label]) => {
    if (pattern.test(working)) {
      working = working.replace(pattern, replacement);
      changes.push(label);
    }
  });

  return { normalized: working, changes: Array.from(new Set(changes)) };
};

