export type GradeId = "grade1" | "grade2";

export type GradeDecision = {
  grade: GradeId;
  ruleId:
    | "empty"
    | "short_length"
    | "technical_content"
    | "label_like"
    | "long_text"
    | "default";
  reason: string;
};

const countWords = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const countDigits = (text: string) => (text.match(/\d/g) ?? []).length;

const hasSentencePunctuation = (text: string) => /[.!?;:]/.test(text);

const isMultiSentence = (text: string) => (text.match(/[.!?]/g) ?? []).length >= 2;

const looksTechnical = (text: string) => {
  const lower = text.toLowerCase();
  if (/(https?:\/\/|www\.)/.test(lower)) return true;
  if (/(mailto:|tel:)/.test(lower)) return true;
  if (/\b\S+@\S+\.\S+\b/.test(text)) return true;

  // Phone-ish: 10+ digits total, or common formatted patterns.
  if (countDigits(text) >= 10) return true;
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) return true;

  // Path / identifier hints.
  if (/[\\/_:]/.test(text)) return true;
  // Long alphanumeric runs that include digits (codes / IDs).
  if (/\b(?=[A-Za-z0-9]{4,}\b)(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]+\b/.test(text)) return true;
  if (/\b\w+[-_]\w+\b/.test(text)) return true;
  if (/\b(?:RM|ROOM|STE|SUITE)\s*\d+[A-Z]?\b/i.test(text)) return true;

  return false;
};

export const decideGrade = (text: string): GradeDecision => {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      grade: "grade1",
      ruleId: "empty",
      reason: "Empty/whitespace input defaults to Grade 1."
    };
  }

  if (trimmed.length <= 25) {
    return {
      grade: "grade1",
      ruleId: "short_length",
      reason: "Short labels are usually safer as Grade 1."
    };
  }

  if (looksTechnical(trimmed)) {
    return {
      grade: "grade1",
      ruleId: "technical_content",
      reason: "Identifiers, codes, and technical strings are usually safer as Grade 1."
    };
  }

  if (!hasSentencePunctuation(trimmed) && countWords(trimmed) <= 4) {
    return {
      grade: "grade1",
      ruleId: "label_like",
      reason: "Short label-like text without sentence punctuation is usually safer as Grade 1."
    };
  }

  if (isMultiSentence(trimmed) || countWords(trimmed) >= 6 || trimmed.length >= 40) {
    return {
      grade: "grade2",
      ruleId: "long_text",
      reason: "Longer, sentence-like text is often more readable in Grade 2 (still requires verification)."
    };
  }

  return {
    grade: "grade1",
    ruleId: "default",
    reason: "Defaulting to Grade 1 for conservative handling."
  };
};

export type ComplianceLevel = "PASS" | "WARN" | "BLOCK";

export type ComplianceFlag = {
  code:
    | "non_ascii_quotes"
    | "dash_variant"
    | "ellipsis"
    | "unusual_symbol"
    | "non_ascii_letter"
    | "emoji_or_pictograph"
    | "non_bmp_character"
    | "all_caps"
    | "numbers_present"
    | "abbreviation_detected"
    | "punctuation_dense"
    | "punctuation_high_risk"
    | "multiline_input"
    | "length_risk"
    | "technical_string"
    | "grade2_short_label_risk";
  level: Exclude<ComplianceLevel, "PASS">;
  message: string;
};

export type ComplianceReport = {
  level: ComplianceLevel;
  flags: ComplianceFlag[];
};

type ComplianceInput = {
  text: string;
  profileId: "en-us-g1" | "en-us-g2";
  smartSelectEnabled: boolean;
  smartSelectDecision?: GradeDecision;
};

const hasEmojiOrPictograph = (text: string) => {
  try {
    return /[\p{Extended_Pictographic}]/u.test(text);
  } catch {
    // Fallback: very rough range-based check.
    return /[\u{1F300}-\u{1FAFF}]/u.test(text);
  }
};

export const complianceCheck = (input: ComplianceInput): ComplianceReport => {
  const text = input.text ?? "";
  const flags: ComplianceFlag[] = [];
  const trimmed = text.trim();

  if (hasEmojiOrPictograph(text)) {
    flags.push({
      code: "emoji_or_pictograph",
      level: "BLOCK",
      message:
        "Emoji/pictographs detected. Remove them before generating or exporting braille."
    });
  }

  // Some non-BMP characters (surrogate pairs) can be problematic in signage workflows
  // and may not be supported by the current translation engine build.
  try {
    const hasNonBmp = Array.from(text).some(
      (char) => (char.codePointAt(0) ?? 0) > 0xffff
    );
    if (hasNonBmp) {
      flags.push({
        code: "non_bmp_character",
        level: "BLOCK",
        message:
          "Non-standard characters detected (e.g., emoji/flags). Remove them before generating or exporting braille."
      });
    }
  } catch {
    // Best-effort only.
  }

  if (/[\u2018\u2019\u201c\u201d]/.test(text)) {
    flags.push({
      code: "non_ascii_quotes",
      level: "WARN",
      message:
        "Smart quotes detected. Verify punctuation handling (or normalize typography intentionally)."
    });
  }

  if (/[\u2013\u2014]/.test(text)) {
    flags.push({
      code: "dash_variant",
      level: "WARN",
      message:
        "En/em dashes detected. Verify punctuation handling (or normalize typography intentionally)."
    });
  }

  if (/\u2026/.test(text)) {
    flags.push({
      code: "ellipsis",
      level: "WARN",
      message:
        "Ellipsis character detected. Verify punctuation handling (or normalize typography intentionally)."
    });
  }

  if (/[©®™]/.test(text)) {
    flags.push({
      code: "unusual_symbol",
      level: "WARN",
      message:
        "Trademark/copyright symbols detected. Verify whether these should appear on the sign and how they should be handled."
    });
  }

  // Non-English letters / diacritics (profile mismatch risk)
  try {
    const chars = Array.from(text);
    const nonAsciiLetters = chars.filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code <= 0x7f) return false;
      return /\p{L}/u.test(char);
    });
    if (nonAsciiLetters.length) {
      flags.push({
        code: "non_ascii_letter",
        level: "WARN",
        message:
          "Non-English letters/diacritics detected. Verify language/profile handling (US English tables may be insufficient)."
      });
    }
  } catch {
    if (/[^\x00-\x7f]/.test(text)) {
      flags.push({
        code: "non_ascii_letter",
        level: "WARN",
        message:
          "Non-ASCII characters detected. Verify language/profile handling."
      });
    }
  }

  if (trimmed && /[A-Za-z]/.test(trimmed)) {
    const lettersOnly = trimmed.replace(/[^A-Za-z]+/g, "");
    const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
    if (isAllCaps && countWords(trimmed) >= 2) {
      flags.push({
        code: "all_caps",
        level: "WARN",
        message:
          "All-caps multi-word text detected. Capitalization rules matter in braille; verify carefully."
      });
    }
  }

  if (/\d/.test(text)) {
    flags.push({
      code: "numbers_present",
      level: "WARN",
      message:
        "Numbers/ordinals detected. Verify number indicators, spacing, and formatting."
    });
  }

  if (/\b(rm|room|ste|suite|dept|dr\.?|st\.?)\b/i.test(text)) {
    flags.push({
      code: "abbreviation_detected",
      level: "WARN",
      message:
        "Abbreviations detected (e.g., Rm/Ste/Dept/St/Dr). Confirm intended expansion and meaning."
    });
  }

  const punctMatches = text.match(/[\/\\\-()"'&:]/g) ?? [];
  if (punctMatches.length >= 10 || /[\/\\]{3,}/.test(text) || /-{3,}/.test(text)) {
    flags.push({
      code: "punctuation_high_risk",
      level: "BLOCK",
      message:
        "High punctuation density detected. Simplify the text or verify punctuation handling before exporting."
    });
  } else if (punctMatches.length >= 4 || /[()]/.test(text)) {
    flags.push({
      code: "punctuation_dense",
      level: "WARN",
      message:
        "Punctuation-heavy text detected. Verify punctuation handling and intended meaning."
    });
  }

  if (text.includes("\n")) {
    flags.push({
      code: "multiline_input",
      level: "WARN",
      message:
        "Multi-line input detected. Sign line breaks and layout rules differ from document braille; verify layout."
    });
  }

  if (trimmed.length > 80) {
    flags.push({
      code: "length_risk",
      level: "WARN",
      message:
        "Long text detected. It may not fit typical sign formats; verify line breaks, placement, and layout."
    });
  }

  if (/(https?:\/\/|www\.|mailto:|tel:|\b\S+@\S+\.\S+\b)/i.test(text)) {
    flags.push({
      code: "technical_string",
      level: "WARN",
      message:
        "Technical string detected (URL/email/phone/tel/mailto). Verify formatting and whether Grade 1 is appropriate."
    });
  }

  if (
    input.smartSelectEnabled &&
    input.smartSelectDecision?.grade === "grade2" &&
    trimmed.length <= 25
  ) {
    flags.push({
      code: "grade2_short_label_risk",
      level: "WARN",
      message:
        "Smart Select chose Grade 2 for a short label. Verify grade choice; Grade 1 is often safer for short labels."
    });
  }

  // Profile mismatch reminder (conservative, informational)
  if (input.profileId !== "en-us-g1" && input.profileId !== "en-us-g2") {
    // Not expected today; keep deterministic structure.
  }

  const level: ComplianceLevel = flags.some((flag) => flag.level === "BLOCK")
    ? "BLOCK"
    : flags.length
      ? "WARN"
      : "PASS";

  return { level, flags };
};
