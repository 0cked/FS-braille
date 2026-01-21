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

export type ComplianceFlagDocumentation = {
  title: string;
  description: string;
  links: Array<{
    label: string;
    url: string;
  }>;
};

export const COMPLIANCE_DOCUMENTATION: Record<
  ComplianceFlag["code"],
  ComplianceFlagDocumentation
> = {
  all_caps: {
    title: "All-Caps Text in Braille",
    description:
      "When text is in all capitals, each letter requires a capitalization indicator in braille. Multi-word all-caps text can be represented with a capital word indicator or individual capital letter indicators.",
    links: [
      {
        label: "UEB Guidelines - Capitalization",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "Braille Authority of North America - Capital Letters",
        url: "https://www.brailleauthority.org/"
      },
      {
        label: "liblouis Documentation - Capitalization Rules",
        url: "https://liblouis.io/documentation/"
      }
    ]
  },
  numbers_present: {
    title: "Numbers and Ordinals in Braille",
    description:
      "Numbers in braille require a number indicator before the numeric sequence. Ordinals, decimals, and formatted numbers need special attention for proper spacing and indicators.",
    links: [
      {
        label: "UEB Guidelines - Numbers",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "BANA - Numeric Mode Indicator Rules",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  abbreviation_detected: {
    title: "Abbreviations in Braille",
    description:
      "Abbreviations may require Grade 1 indicators to prevent misinterpretation. Common abbreviations like 'Dr.', 'St.', 'Rm' need verification for correct expansion and meaning in context.",
    links: [
      {
        label: "UEB Guidelines - Abbreviations",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "BANA - Common Abbreviations",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  non_ascii_quotes: {
    title: "Smart Quotes and Typography",
    description:
      "Curly quotes (smart quotes) are handled differently than straight ASCII quotes in braille. They should be normalized or verified for correct punctuation handling.",
    links: [
      {
        label: "UEB Guidelines - Punctuation",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "Typography Normalization Best Practices",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  dash_variant: {
    title: "Em Dashes and En Dashes",
    description:
      "Different dash types (hyphen, en dash, em dash) have distinct representations in braille. Verify that the correct dash type is used for the intended meaning.",
    links: [
      {
        label: "UEB Guidelines - Dashes",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "BANA - Dash Usage",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  ellipsis: {
    title: "Ellipsis Character",
    description:
      "The Unicode ellipsis character should be verified for correct handling. It may need to be represented as three periods in braille depending on context.",
    links: [
      {
        label: "UEB Guidelines - Ellipsis",
        url: "http://www.iceb.org/ueb.html"
      }
    ]
  },
  unusual_symbol: {
    title: "Trademark and Copyright Symbols",
    description:
      "Special symbols like ©, ®, and ™ require specific braille representations. Verify they should appear on the sign and how they should be transcribed.",
    links: [
      {
        label: "UEB Guidelines - Special Symbols",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "BANA - Symbol Guidelines",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  non_ascii_letter: {
    title: "Non-English Letters and Diacritics",
    description:
      "Letters with accents or from non-English alphabets may not be supported by US English braille tables. Verify language/profile handling or use appropriate international tables.",
    links: [
      {
        label: "liblouis - Language Tables",
        url: "https://liblouis.io/documentation/"
      },
      {
        label: "International Braille Standards",
        url: "http://www.iceb.org/"
      }
    ]
  },
  emoji_or_pictograph: {
    title: "Emoji and Pictographs",
    description:
      "Emoji and pictographic characters cannot be represented in tactile braille and must be removed or replaced with text descriptions.",
    links: [
      {
        label: "Accessibility Best Practices - Emoji Alt Text",
        url: "https://www.w3.org/WAI/WCAG21/Understanding/"
      }
    ]
  },
  non_bmp_character: {
    title: "Non-BMP Unicode Characters",
    description:
      "Characters outside the Basic Multilingual Plane (including some emoji, rare symbols, and historical scripts) are not supported by the translation engine and must be removed.",
    links: [
      {
        label: "Unicode Planes Overview",
        url: "https://en.wikipedia.org/wiki/Plane_(Unicode)"
      }
    ]
  },
  punctuation_dense: {
    title: "Punctuation-Heavy Text",
    description:
      "Text with heavy punctuation (parentheses, slashes, special characters) requires careful verification. Each punctuation mark affects spacing and meaning in braille.",
    links: [
      {
        label: "UEB Guidelines - Punctuation",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "BANA - Punctuation Rules",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  punctuation_high_risk: {
    title: "High Punctuation Density",
    description:
      "Extremely high punctuation density detected. This often indicates technical content, paths, or formatted data that may not translate correctly. Simplify or verify carefully.",
    links: [
      {
        label: "UEB Guidelines - Technical Material",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "liblouis - Computer Braille Code",
        url: "https://liblouis.io/documentation/"
      }
    ]
  },
  multiline_input: {
    title: "Multi-Line Signage Layout",
    description:
      "Sign braille has different line break rules than document braille. Each line should be verified for proper formatting and spacing per ADA/accessibility standards.",
    links: [
      {
        label: "ADA Standards - Signage Requirements",
        url: "https://www.ada.gov/regs2010/2010ADAstandards/2010ADAStandards.htm#c7"
      },
      {
        label: "ICC A117.1 - Accessible Design Standards",
        url: "https://www.iccsafe.org/products-and-services/i-codes/the-a117-series/"
      }
    ]
  },
  length_risk: {
    title: "Long Text for Signage",
    description:
      "Text exceeding typical sign dimensions may not fit standard formats. Verify line breaks, cell count per line, and physical layout constraints.",
    links: [
      {
        label: "ADA Standards - Signage Dimensions",
        url: "https://www.ada.gov/regs2010/2010ADAstandards/2010ADAStandards.htm#c7"
      },
      {
        label: "Braille Cell Spacing Standards",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  technical_string: {
    title: "Technical Strings (URLs, Emails, Phone Numbers)",
    description:
      "Technical content like URLs, email addresses, and phone numbers should typically use Grade 1 braille to avoid contractions that could alter the meaning.",
    links: [
      {
        label: "UEB Guidelines - Technical Material",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "Computer Braille Code",
        url: "https://www.brailleauthority.org/"
      }
    ]
  },
  grade2_short_label_risk: {
    title: "Grade 2 for Short Labels",
    description:
      "Grade 2 contractions on short labels may reduce readability or create ambiguity. Grade 1 is often safer for brief signage like room numbers and labels.",
    links: [
      {
        label: "UEB Guidelines - Contractions",
        url: "http://www.iceb.org/ueb.html"
      },
      {
        label: "BANA - Grade Selection Guidelines",
        url: "https://www.brailleauthority.org/"
      }
    ]
  }
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
