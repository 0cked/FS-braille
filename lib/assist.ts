import { BrailleProfile } from "../config/profiles";
import { NormalizationResult } from "./normalization";

export type AssistSuggestion = {
  id: string;
  title: string;
  before: string;
  after: string;
  reason: string;
};

export type AssistFlag = {
  id: string;
  severity: "low" | "medium" | "high";
  message: string;
};

export type AssistRecommendation = {
  profileId: BrailleProfile["id"];
  reason: string;
};

export type AssistResult = {
  suggestions: AssistSuggestion[];
  flags: AssistFlag[];
  recommendation: AssistRecommendation;
  explanation: string[];
  phrases: string[];
};

export const COMMON_PHRASES = [
  "EXIT",
  "RESTROOM",
  "MEN",
  "WOMEN",
  "NO SMOKING",
  "EMPLOYEES ONLY",
  "SUITE",
  "ROOM",
  "STAIRS",
  "ELEVATOR"
];

const hasMixedAlphaNumeric = (text: string) => /[A-Za-z][0-9]|[0-9][A-Za-z]/.test(text);

const isMostlyLowercase = (text: string) => {
  const letters = text.match(/[A-Za-z]/g) || [];
  if (!letters.length) {
    return false;
  }
  const lowercase = letters.filter((char) => char === char.toLowerCase()).length;
  return lowercase / letters.length > 0.6;
};

export const runAssist = (
  input: string,
  normalization: NormalizationResult,
  profileId: BrailleProfile["id"]
): AssistResult => {
  const suggestions: AssistSuggestion[] = [];
  const flags: AssistFlag[] = [];

  if (isMostlyLowercase(input)) {
    suggestions.push({
      id: "uppercase",
      title: "Use all caps for sign clarity",
      before: input,
      after: input.toUpperCase(),
      reason: "All caps improves readability on tactile signage."
    });
  }

  if (/#\d+/.test(input)) {
    suggestions.push({
      id: "remove-hash",
      title: "Remove # from room or suite numbers",
      before: input,
      after: input.replace(/#(\d+)/g, "$1"),
      reason: "Braille number sign already conveys numeric context."
    });
  }

  if (/\bSTE\b/i.test(input)) {
    suggestions.push({
      id: "suite-spellout",
      title: "Spell out SUITE for consistency",
      before: input,
      after: input.replace(/\bSTE\b/gi, "SUITE"),
      reason: "Avoid ambiguous abbreviations in tactile text."
    });
  }

  if (/\bST\b/.test(input)) {
    flags.push({
      id: "ambiguous-st",
      severity: "medium",
      message: "ST can be Street or Saint; consider spelling out for clarity."
    });
  }

  if (/\s{2,}/.test(input)) {
    flags.push({
      id: "extra-spaces",
      severity: "low",
      message: "Multiple spaces found; may collapse during normalization."
    });
  }

  if (/(^\s+|\s+$)/.test(input)) {
    flags.push({
      id: "trailing-space",
      severity: "low",
      message: "Leading or trailing whitespace detected."
    });
  }

  const lines = input.split("\n");
  lines.forEach((line, index) => {
    if (line.length > 20) {
      flags.push({
        id: `long-line-${index}`,
        severity: "medium",
        message: `Line ${index + 1} exceeds 20 characters; consider shortening.`
      });
    }
  });

  const unsupported = Array.from(input).filter((char) =>
    /[^A-Za-z0-9 .,;:!?"'\-/#&()\[\]{}+*=<>@$%\n\r\t]/.test(char)
  );
  if (unsupported.length) {
    flags.push({
      id: "unsupported",
      severity: "high",
      message: `Unsupported characters detected: ${Array.from(new Set(unsupported)).join(
        " "
      )}`
    });
  }

  if (/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/.test(input)) {
    flags.push({
      id: "phone-number",
      severity: "medium",
      message: "Phone number detected; verify spacing and number sign usage."
    });
  }

  const recommendation: AssistRecommendation = (() => {
    const hasDigits = /\d/.test(input);
    const hasAcronyms = /\b[A-Z]{2,}\b/.test(input);
    const shortLabel = input.trim().length <= 12;
    if (hasDigits || hasMixedAlphaNumeric(input) || hasAcronyms || shortLabel) {
      return {
        profileId: "en-us-g1",
        reason: "Short labels, numbers, or acronyms often translate better in Grade 1."
      };
    }
    return {
      profileId: "en-us-g2",
      reason: "Longer phrases benefit from Grade 2 contractions."
    };
  })();

  const explanation: string[] = [];
  if (/\d/.test(input)) {
    explanation.push("Numbers present; number mode is likely used.");
  }
  if (/\b[A-Z]{2,}\b/.test(input)) {
    explanation.push("Capital indicators likely used for all-caps text.");
  }
  if (profileId === "en-us-g2") {
    explanation.push("Contracted (Grade 2) braille likely applied.");
  } else {
    explanation.push("Uncontracted (Grade 1) braille applied.");
  }
  if (normalization.diff) {
    explanation.push("Normalization changes shown below are estimated.");
  }

  return {
    suggestions,
    flags,
    recommendation,
    explanation,
    phrases: COMMON_PHRASES
  };
};
