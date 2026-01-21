"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BRAILLE_PROFILES,
  DEFAULT_PROFILE_ID,
  getProfileById
} from "../config/profiles";
import { translateText, TranslationResult } from "../lib/translation";
import { DEFAULT_SVG_LAYOUT, SvgLayout, renderBrailleSvg } from "../lib/svg";
import { DEFAULT_PHRASE_GROUPS } from "../lib/phraseLibrary";
import { complianceCheck, COMPLIANCE_DOCUMENTATION } from "../lib/compliance";
import { fnv1a32 } from "../lib/hash";
import { normalizeTypography } from "../lib/typography";
import { resetLiblouis } from "../lib/louis";

const UNDO_LIMIT = 10;
const INPUT_PLACEHOLDER = `RESTROOM
ROOM 101
EXIT
SUITE 200`;

export default function HomePage() {
  const [input, setInput] = useState("");
  const [profileId, setProfileId] = useState(DEFAULT_PROFILE_ID);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [layout, setLayout] = useState<SvgLayout>(DEFAULT_SVG_LAYOUT);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [normalizeModalOpen, setNormalizeModalOpen] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const profile = useMemo(
    () => getProfileById(profileId),
    [profileId]
  );

  const compliance = useMemo(
    () =>
      complianceCheck({
        text: input,
        profileId: profileId
      }),
    [profileId, input]
  );

  const inputHash = useMemo(() => fnv1a32(input), [input]);

  useEffect(() => {
    setTranslateError(null);
  }, [input]);

  useEffect(() => {
    if (!complianceModalOpen && !normalizeModalOpen) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComplianceModalOpen(false);
        setNormalizeModalOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [complianceModalOpen, normalizeModalOpen]);

  const typographyPreview = useMemo(() => normalizeTypography(input), [input]);

  const phraseGroups = DEFAULT_PHRASE_GROUPS;

  const applyWithUndo = (nextText: string) => {
    setUndoStack((prev) => [input, ...prev].slice(0, UNDO_LIMIT));
    setInput(nextText);
  };

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (!prev.length) {
        return prev;
      }
      const [latest, ...rest] = prev;
      setInput(latest);
      return rest;
    });
  };

  const handleTranslate = async () => {
    if (!input.trim()) {
      setResult(null);
      return;
    }
    if (compliance.level === "BLOCK") {
      setTranslateError(
        "Output generation is blocked due to high-risk Compliance Check flags. Resolve the BLOCK items before generating braille."
      );
      setResult(null);
      return;
    }
    setIsTranslating(true);
    try {
      const translation = await translateText(input, profile);
      setResult(translation);
      setLastGeneratedAt(new Date().toISOString());
    } catch (error) {
      // liblouis can abort on unsupported inputs (e.g., pictographs/emoji). Reset
      // the engine so the user can recover after correcting text.
      resetLiblouis();
      setResult(null);
      setTranslateError(
        "Translation engine error. Remove unusual characters (especially emoji/pictographs) and try again."
      );
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  const bitPatternString = useMemo(() => {
    if (!result) {
      return "";
    }
    return result.lines
      .map((line) => line.map((cell) => cell.bitstring).join(" "))
      .join("\n");
  }, [result]);

  const svgPreview = useMemo(() => {
    if (!result) {
      return null;
    }
    return renderBrailleSvg(result.lines, layout);
  }, [layout, result]);

  const exportMetadata = useMemo(
    () => ({
      generated_at: lastGeneratedAt,
      input_hash: inputHash,
      profile_used: profileId,
      compliance: {
        level: compliance.level,
        flags: compliance.flags.map((flag) => ({
          code: flag.code,
          level: flag.level
        }))
      }
    }),
    [
      compliance.flags,
      compliance.level,
      profileId,
      inputHash,
      lastGeneratedAt
    ]
  );

  const svgMarkup = useMemo(() => {
    if (!svgPreview) {
      return "";
    }
    const json = JSON.stringify(exportMetadata).replace("]]>", "]]\\>");
    const withMetadata = svgPreview.svg.replace(
      "</svg>",
      `<metadata><![CDATA[${json}]]></metadata>\n</svg>`
    );
    return `<?xml version="1.0" encoding="UTF-8"?>\n${withMetadata}`;
  }, [exportMetadata, svgPreview]);

  const proofreadPacket = useMemo(() => {
    if (!result) {
      return "";
    }
    const lines: string[] = [];
    lines.push(
      "IMPORTANT: This tool is a translation aid. ADA/best-practice compliance depends on correct translation AND physical layout/fabrication requirements. Always verify before production."
    );
    lines.push(`Generated at: ${lastGeneratedAt ?? "—"}`);
    lines.push(`Input hash: ${inputHash}`);
    lines.push(
      `Profile used: ${profile.grade === "g1" ? "Grade 1 (Uncontracted)" : "Grade 2 (Contracted)"}`
    );
    lines.push(`Compliance Check: ${compliance.level}`);
    if (compliance.flags.length) {
      compliance.flags.forEach((flag) => {
        lines.push(`${flag.level} ${flag.code}: ${flag.message}`);
      });
    } else {
      lines.push("No common risk flags detected (still requires verification).");
    }
    if (result.warnings.length) {
      lines.push("Engine warnings:");
      result.warnings.forEach((warning) => lines.push(`- ${warning.message}`));
    }
    lines.push("");
    lines.push("INPUT (exact):");
    lines.push(input);
    lines.push("");
    lines.push("UNICODE BRAILLE:");
    lines.push(result.unicode_braille || "—");
    lines.push("");
    lines.push("DOT-NUMBER NOTATION:");
    lines.push(result.plain_dots || "—");
    return lines.join("\n");
  }, [
    compliance.flags,
    compliance.level,
    input,
    inputHash,
    lastGeneratedAt,
    profile.grade,
    result
  ]);

  const copyToClipboard = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  const downloadSvg = () => {
    if (!svgPreview) {
      return;
    }
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "braille-preview.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePhraseInsert = (phrase: string) => {
    const trimmed = phrase.trim();
    if (!trimmed) {
      return;
    }
    const base = input.trimEnd();
    const next = base ? `${base}\n${trimmed}` : trimmed;
    applyWithUndo(next);
  };

  return (
    <main className="page">
      <header className="header">
        <img className="brandLogo" src="/fastsigns-logo.svg" alt="FASTSIGNS" />
        <h1 className="title">Deterministic braille translation</h1>
        <p className="subtitle">
          Translation aid for signage teams. Always verify braille and physical
          layout requirements before production.
        </p>
      </header>

      <section className="layout">
        <div className="layoutCol">
          <div className="panel">
            <h2>Input</h2>
            <div className="field">
              <label htmlFor="input-text">Sign text (one line per sign line)</label>
              <textarea
                id="input-text"
                className="textarea"
                value={input}
                placeholder={INPUT_PLACEHOLDER}
                onChange={(event) => setInput(event.target.value)}
              />
              <div className="row space-between">
                <div className="row">
                  <button className="button" onClick={handleTranslate}>
                    {isTranslating ? "Generating..." : "Generate output"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => applyWithUndo("")}
                    disabled={!input.length}
                  >
                    Clear
                  </button>
                  <button
                    className="button secondary"
                    onClick={handleUndo}
                    disabled={!undoStack.length}
                  >
                    Undo
                  </button>
                </div>
              </div>
              {translateError ? (
                <div className="notice" role="alert">
                  {translateError}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="profile">Braille grade</label>
              <select
                id="profile"
                className="select"
                value={profileId}
                onChange={(event) => setProfileId(event.target.value as typeof profileId)}
              >
                {BRAILLE_PROFILES.map((profileOption) => (
                  <option key={profileOption.id} value={profileOption.id}>
                    {profileOption.label}
                  </option>
                ))}
              </select>

              <div className="gradeExplanation">
                <div className="gradeExplanationItem">
                  <strong>Grade 1 (Uncontracted)</strong>
                  <p className="muted">
                    Best for: Room numbers, short labels, technical content (URLs, emails, codes), abbreviations.
                    Each letter and symbol is transcribed individually without contractions.
                  </p>
                </div>
                <div className="gradeExplanationItem">
                  <strong>Grade 2 (Contracted)</strong>
                  <p className="muted">
                    Best for: Full sentences, longer descriptive text, paragraphs.
                    Uses contractions and abbreviations to save space and increase reading speed.
                  </p>
                </div>
              </div>
            </div>

            <details>
              <summary>Tools</summary>
              <div className="field">
                <button
                  className="button secondary"
                  onClick={() => setNormalizeModalOpen(true)}
                  disabled={!input.length}
                >
                  Normalize typography…
                </button>
                <span className="muted">
                  No automatic corrections are applied. This previews and (only if
                  you confirm) converts smart quotes, en/em dashes, and ellipses to
                  ASCII.
                </span>
              </div>
            </details>
          </div>

          <div className="panel">
            <h2>Common Signage Phrases</h2>
            <p className="muted">Click a phrase to insert it as a new line.</p>

            {phraseGroups.map((group) => (
              <div key={group.id} className="field">
                <label>{group.label}</label>
                <div className="chips">
                  {group.phrases.map((phrase) => (
                    <button
                      key={phrase}
                      className="chip"
                      onClick={() => handlePhraseInsert(phrase)}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

	        <div className="layoutCol">
	          <div className="panel">
	            <h2>Outputs</h2>

	            <div className="banner bannerWarning" role="note">
	              <strong>Important:</strong> This tool is a translation aid.
	              ADA/best-practice compliance depends on correct braille translation{" "}
	              <em>and</em> physical layout/fabrication requirements. Always verify
	              translation and formatting before production.{" "}
	              <button
	                type="button"
	                className="linkButton"
	                onClick={() => setComplianceModalOpen(true)}
	              >
	                Learn what must be verified
	              </button>
	            </div>

	            <div className="summary">
	              <div className="row space-between">
	                <strong>Translation Summary</strong>
	                <button
	                  className="button secondary"
	                  onClick={() => copyToClipboard("proofread", proofreadPacket)}
	                  disabled={!result}
	                >
	                  {copiedId === "proofread" ? "Copied" : "Copy for proofread"}
	                </button>
	              </div>
	              <div className="summaryGrid">
	                <div className="summaryItem">
	                  <div className="muted">Profile used</div>
	                  <div>
	                    {profile.grade === "g1"
	                      ? "Grade 1 (Uncontracted)"
	                      : "Grade 2 (Contracted)"}
	                  </div>
	                </div>
	                <div className="summaryItem">
	                  <div className="muted">Generated at</div>
	                  <div>{lastGeneratedAt ?? "—"}</div>
	                </div>
	                <div className="summaryItem">
	                  <div className="muted">Compliance Check</div>
	                  <div className={`status status-${compliance.level.toLowerCase()}`}>
	                    {compliance.level}
	                  </div>
	                </div>
	              </div>
	            </div>

	            <div className={`compliancePanel compliance-${compliance.level.toLowerCase()}`}>
	              <div className="row space-between">
	                <strong>Compliance Check</strong>
	                <span className="muted">Does not certify compliance.</span>
	              </div>

	              {compliance.flags.length ? (
	                <div className="complianceFlagsList">
	                  {compliance.flags.map((flag) => {
	                    const docs = COMPLIANCE_DOCUMENTATION[flag.code];
	                    return (
	                      <div key={flag.code} className="complianceFlag">
	                        <div className="complianceFlagHeader">
	                          <span className={`complianceFlagLevel level-${flag.level.toLowerCase()}`}>
	                            {flag.level}
	                          </span>
	                          <span className="complianceFlagCode">{flag.code}</span>
	                        </div>
	                        <div className="complianceFlagMessage">{flag.message}</div>
	                        {docs && (
	                          <details className="complianceFlagDocs">
	                            <summary>Learn more about {docs.title}</summary>
	                            <div className="complianceFlagDocsContent">
	                              <p className="complianceFlagDocsDescription">
	                                {docs.description}
	                              </p>
	                              {docs.links.length > 0 && (
	                                <div className="complianceFlagDocsLinks">
	                                  <strong>Helpful resources:</strong>
	                                  <ul>
	                                    {docs.links.map((link, idx) => (
	                                      <li key={idx}>
	                                        <a
	                                          href={link.url}
	                                          target="_blank"
	                                          rel="noopener noreferrer"
	                                          className="complianceFlagDocsLink"
	                                        >
	                                          {link.label}
	                                        </a>
	                                      </li>
	                                    ))}
	                                  </ul>
	                                </div>
	                              )}
	                            </div>
	                          </details>
	                        )}
	                      </div>
	                    );
	                  })}
	                </div>
	              ) : (
	                <div className="notice success">
	                  No common risk flags detected (still requires verification).
	                </div>
	              )}

	            </div>
	
	          <div className="field">
	            <div className="row space-between">
	              <label>Unicode braille</label>
	              <button
	                className="button secondary"
	                onClick={() =>
	                  copyToClipboard("unicode", result?.unicode_braille || "")
	                }
	                disabled={!result?.unicode_braille}
	              >
	                {copiedId === "unicode" ? "Copied" : "Copy"}
	              </button>
	            </div>
	            <div className="output">{result?.unicode_braille || "—"}</div>
	          </div>

          <div className="field">
            <div className="row space-between">
              <label>Dot patterns per cell (bitstrings)</label>
	              <button
	                className="button secondary"
	                onClick={() => copyToClipboard("bits", bitPatternString)}
	                disabled={!bitPatternString}
	              >
	                {copiedId === "bits" ? "Copied" : "Copy"}
	              </button>
            </div>
            <div className="output">{bitPatternString || "—"}</div>
          </div>

          <div className="field">
            <div className="row space-between">
              <label>Dot-number notation</label>
	              <button
	                className="button secondary"
	                onClick={() =>
	                  copyToClipboard("dots", result?.plain_dots || "")
	                }
	                disabled={!result?.plain_dots}
	              >
	                {copiedId === "dots" ? "Copied" : "Copy"}
	              </button>
            </div>
            <div className="output">{result?.plain_dots || "—"}</div>
          </div>

          <div className="field">
            <div className="row space-between">
              <label>SVG preview</label>
              <div className="row">
	                <button
	                  className="button secondary"
	                  onClick={() =>
	                    svgPreview && copyToClipboard("svg", svgMarkup)
	                  }
	                  disabled={!svgPreview}
	                >
	                  {copiedId === "svg" ? "Copied" : "Copy SVG"}
	                </button>
	                <button
	                  className="button secondary"
	                  onClick={downloadSvg}
	                  disabled={!svgPreview}
	                >
	                  Download SVG
	                </button>
              </div>
            </div>
            <div className="output">
              {svgPreview ? (
                <div
                  dangerouslySetInnerHTML={{ __html: svgPreview.svg }}
                />
              ) : (
                "—"
              )}
            </div>
            <span className="notice">
              Verify final ADA/tactile specs before production.
            </span>
          </div>

          <details>
            <summary>Metadata & warnings</summary>
            <div className="field">
              <div className="row">
                <span className="badge">liblouis {result?.metadata.liblouis_version || "—"}</span>
                <span className="badge">Profile used {result?.metadata.profile_id || "—"}</span>
              </div>
              <div className="output">
                Tables: {result?.metadata.table_names.join(", ") || "—"}
                {"\n"}Input hash: {inputHash}
                {"\n"}Compliance Check: {compliance.level}
              </div>
              {result?.warnings.length ? (
                <div className="notice">
                  {result.warnings.map((warning) => (
                    <div key={warning.code}>{warning.message}</div>
                  ))}
                </div>
              ) : (
                <div className="notice success">No warnings detected.</div>
              )}
            </div>
          </details>
          </div>

          <div className="panel secondary">
            <details>
              <summary>Advanced SVG layout</summary>
              <div className="grid">
              <div className="field">
            <label>Cell width (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.cell_width_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  cell_width_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Cell height (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.cell_height_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  cell_height_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Dot diameter (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.dot_diameter_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  dot_diameter_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Interdot X (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.interdot_x_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  interdot_x_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Interdot Y (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.interdot_y_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  interdot_y_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Intercell X (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.intercell_x_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  intercell_x_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Interline Y (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.interline_y_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  interline_y_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Margin left (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.margin_left_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  margin_left_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              <div className="field">
            <label>Margin top (mm)</label>
            <input
              className="input"
              type="number"
              value={layout.margin_top_mm}
              onChange={(event) =>
                setLayout((prev) => ({
                  ...prev,
                  margin_top_mm: Number(event.target.value)
                }))
              }
            />
          </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {complianceModalOpen ? (
        <div
          className="modalBackdrop"
          role="presentation"
          onClick={() => setComplianceModalOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Learn what must be verified"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row space-between">
              <strong>Learn what must be verified</strong>
              <button
                type="button"
                className="button secondary"
                onClick={() => setComplianceModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="modalBody">
              <div className="field">
                <strong>1) Translation accuracy</strong>
                <div className="muted">
                  Verify contractions, capitalization, numbers, punctuation,
                  abbreviations, proper nouns, and intended meaning. This tool does
                  not certify correctness.
                </div>
              </div>

              <div className="field">
                <strong>2) Grade selection (Grade 1 vs Grade 2)</strong>
                <div className="muted">
                  Grade choice depends on context. Short labels, codes, and
                  technical strings often require Grade 1. Sentence-like text may
                  be more readable in Grade 2. Always verify your grade selection
                  is appropriate for the sign content.
                </div>
              </div>

              <div className="field">
                <strong>3) Layout & fabrication factors</strong>
                <div className="muted">
                  Even if the braille text is correct, physical specs can break
                  compliance: dot height/shape, dot spacing, cell spacing, line
                  spacing, placement relative to tactile text, margins, substrate
                  constraints, and printer/embosser calibration.
                </div>
              </div>

              <div className="field">
                <strong>4) Job-context factors</strong>
                <div className="muted">
                  Building code requirements, local AHJ variations, customer-provided
                  text, multilingual needs, proofreading workflow, and sign type all
                  matter. Always follow your internal review process.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {normalizeModalOpen ? (
        <div
          className="modalBackdrop"
          role="presentation"
          onClick={() => setNormalizeModalOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Normalize typography"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row space-between">
              <strong>Normalize typography (explicit)</strong>
              <button
                type="button"
                className="button secondary"
                onClick={() => setNormalizeModalOpen(false)}
              >
                Close
              </button>
            </div>

            {typographyPreview.changes.length ? (
              <div className="modalBody">
                <div className="notice">
                  This will change your input text. Review the preview and confirm
                  before applying.
                </div>
                <div className="field">
                  <strong>Changes</strong>
                  <div className="output">{typographyPreview.changes.join("\n")}</div>
                </div>
                <div className="field">
                  <strong>Before (exact)</strong>
                  <div className="output">{input || "—"}</div>
                </div>
                <div className="field">
                  <strong>After (proposed)</strong>
                  <div className="output">{typographyPreview.normalized || "—"}</div>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      applyWithUndo(typographyPreview.normalized);
                      setNormalizeModalOpen(false);
                    }}
                  >
                    Apply changes
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setNormalizeModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="modalBody">
                <div className="notice success">
                  No smart quotes/dashes/ellipsis detected in the current input.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
