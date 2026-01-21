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
import { complianceCheck, decideGrade } from "../lib/compliance";
import { fnv1a32 } from "../lib/hash";
import { normalizeTypography } from "../lib/typography";
import { resetLiblouis } from "../lib/louis";

const UNDO_LIMIT = 10;
const LOCAL_STORAGE_KEY = "fastsigns_braille_phrases";
const ACK_STORAGE_KEY = "fastsigns_braille_ack_v1";
const INPUT_PLACEHOLDER = `RESTROOM
ROOM 101
EXIT
SUITE 200`;

export default function HomePage() {
  const [input, setInput] = useState("");
  const [manualProfileId, setManualProfileId] = useState(DEFAULT_PROFILE_ID);
  const [smartSelectEnabled, setSmartSelectEnabled] = useState(true);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [phraseQuery, setPhraseQuery] = useState("");
  const [phraseGroupId, setPhraseGroupId] = useState<string>("all");
  const [myPhrases, setMyPhrases] = useState<string[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [importJson, setImportJson] = useState("");
  const [layout, setLayout] = useState<SvgLayout>(DEFAULT_SVG_LAYOUT);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [normalizeModalOpen, setNormalizeModalOpen] = useState(false);
  const [warnAcknowledged, setWarnAcknowledged] = useState(false);
  const [blockAcknowledged, setBlockAcknowledged] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [translateError, setTranslateError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setMyPhrases(JSON.parse(stored));
      }
    } catch {
      setMyPhrases([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(myPhrases));
  }, [myPhrases]);

  const smartSelectDecision = useMemo(() => decideGrade(input), [input]);
  const effectiveProfileId = smartSelectEnabled
    ? smartSelectDecision.grade === "grade2"
      ? "en-us-g2"
      : "en-us-g1"
    : manualProfileId;
  const profile = useMemo(
    () => getProfileById(effectiveProfileId),
    [effectiveProfileId]
  );

  const compliance = useMemo(
    () =>
      complianceCheck({
        text: input,
        profileId: effectiveProfileId,
        smartSelectEnabled,
        smartSelectDecision
      }),
    [effectiveProfileId, input, smartSelectDecision, smartSelectEnabled]
  );

  const inputHash = useMemo(() => fnv1a32(input), [input]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
      if (!raw) {
        setWarnAcknowledged(false);
        setBlockAcknowledged(false);
        setBlockReason("");
        return;
      }
      const parsed = JSON.parse(raw) as {
        inputHash?: string;
        warnAcknowledged?: boolean;
        blockAcknowledged?: boolean;
        blockReason?: string;
      };
      if (parsed.inputHash !== inputHash) {
        setWarnAcknowledged(false);
        setBlockAcknowledged(false);
        setBlockReason("");
        return;
      }
      setWarnAcknowledged(Boolean(parsed.warnAcknowledged));
      setBlockAcknowledged(Boolean(parsed.blockAcknowledged));
      setBlockReason(String(parsed.blockReason ?? ""));
    } catch {
      setWarnAcknowledged(false);
      setBlockAcknowledged(false);
      setBlockReason("");
    }
  }, [inputHash]);

  useEffect(() => {
    setTranslateError(null);
  }, [input]);

  useEffect(() => {
    const payload = JSON.stringify({
      inputHash,
      warnAcknowledged,
      blockAcknowledged,
      blockReason
    });
    window.localStorage.setItem(ACK_STORAGE_KEY, payload);
  }, [blockAcknowledged, blockReason, inputHash, warnAcknowledged]);

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

  const canExport = useMemo(() => {
    if (compliance.level === "PASS") return true;
    if (compliance.level === "WARN") return warnAcknowledged;
    return blockAcknowledged && blockReason.trim().length > 0;
  }, [blockAcknowledged, blockReason, compliance.level, warnAcknowledged]);

  const typographyPreview = useMemo(() => normalizeTypography(input), [input]);

  const visiblePhraseGroups = useMemo(() => {
    const query = phraseQuery.trim().toLowerCase();
    const groups =
      phraseGroupId === "all"
        ? DEFAULT_PHRASE_GROUPS
        : DEFAULT_PHRASE_GROUPS.filter((group) => group.id === phraseGroupId);

    const matches = (phrase: string) =>
      !query || phrase.toLowerCase().includes(query);

    return groups
      .map((group) => ({
        ...group,
        phrases: group.phrases.filter(matches)
      }))
      .filter((group) => group.phrases.length);
  }, [phraseGroupId, phraseQuery]);

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
        "Preview generation is blocked due to high-risk Compliance Check flags. Resolve the BLOCK items before generating braille."
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
      profile_used: effectiveProfileId,
      smart_select: smartSelectEnabled
        ? {
            enabled: true,
            grade: smartSelectDecision.grade,
            rule_id: smartSelectDecision.ruleId,
            reason: smartSelectDecision.reason
          }
        : { enabled: false },
      compliance: {
        level: compliance.level,
        flags: compliance.flags.map((flag) => ({
          code: flag.code,
          level: flag.level
        })),
        acknowledgement: {
          warn_acknowledged: warnAcknowledged,
          block_acknowledged: blockAcknowledged,
          block_reason: blockReason || null
        }
      }
    }),
    [
      blockAcknowledged,
      blockReason,
      compliance.flags,
      compliance.level,
      effectiveProfileId,
      inputHash,
      lastGeneratedAt,
      smartSelectDecision.grade,
      smartSelectDecision.reason,
      smartSelectDecision.ruleId,
      smartSelectEnabled,
      warnAcknowledged
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
    lines.push(
      `Smart Select Grade (Conservative): ${smartSelectEnabled ? "ON" : "OFF"}`
    );
    if (smartSelectEnabled) {
      lines.push(`Smart Select rule: ${smartSelectDecision.ruleId}`);
      lines.push(`Smart Select reason: ${smartSelectDecision.reason}`);
    }
    lines.push(`Compliance Check: ${compliance.level}`);
    if (compliance.flags.length) {
      compliance.flags.forEach((flag) => {
        lines.push(`${flag.level} ${flag.code}: ${flag.message}`);
      });
    } else {
      lines.push("No common risk flags detected (still requires verification).");
    }
    lines.push(
      `Acknowledgement: WARN=${warnAcknowledged ? "yes" : "no"}, BLOCK=${blockAcknowledged ? "yes" : "no"}`
    );
    if (blockReason.trim()) {
      lines.push(`BLOCK reason: ${blockReason.trim()}`);
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
    blockAcknowledged,
    blockReason,
    compliance.flags,
    compliance.level,
    input,
    inputHash,
    lastGeneratedAt,
    profile.grade,
    result,
    smartSelectDecision.reason,
    smartSelectDecision.ruleId,
    smartSelectEnabled,
    warnAcknowledged
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

  const handleAddPhrase = () => {
    const trimmed = newPhrase.trim();
    if (!trimmed) {
      return;
    }
    setMyPhrases((prev) => Array.from(new Set([...prev, trimmed])));
    setNewPhrase("");
  };

  const handleImportPhrases = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (Array.isArray(parsed)) {
        setMyPhrases(parsed.map((phrase) => String(phrase)));
        setImportJson("");
      }
    } catch (error) {
      console.error(error);
    }
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
                    {isTranslating ? "Generating..." : "Generate preview"}
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
                <span className="muted">Preview updates only when you click Generate preview.</span>
              </div>
              {translateError ? (
                <div className="notice" role="alert">
                  {translateError}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="profile">Grade selection</label>
              <div className="row space-between">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={smartSelectEnabled}
                    onChange={(event) => setSmartSelectEnabled(event.target.checked)}
                  />
                  Smart Select Grade (Conservative)
                </label>
                <span className="badge">
                  Used: {profile.grade === "g1" ? "Grade 1" : "Grade 2"}
                </span>
              </div>
              <span className="muted">
                Chooses Grade 1 for short/technical labels; Grade 2 for sentence-like
                text. Always verify.
              </span>
              <select
                id="profile"
                className="select"
                value={smartSelectEnabled ? "auto" : manualProfileId}
                disabled={smartSelectEnabled}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === "auto") {
                    setSmartSelectEnabled(true);
                    return;
                  }
                  setSmartSelectEnabled(false);
                  setManualProfileId(next as typeof manualProfileId);
                }}
              >
                <option value="auto">Auto (Smart Select)</option>
                {BRAILLE_PROFILES.map((profileOption) => (
                  <option key={profileOption.id} value={profileOption.id}>
                    {profileOption.label}
                  </option>
                ))}
              </select>
              <span className="muted">{profile.description}</span>
              {smartSelectEnabled ? (
                <details>
                  <summary>Why this grade?</summary>
                  <div className="output">
                    {smartSelectDecision.reason}
                    {"\n"}Rule: {smartSelectDecision.ruleId}
                  </div>
                </details>
              ) : null}
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
            <h2>Phrase Library</h2>
            <p className="muted">Click a phrase to insert it as a new line.</p>

            <div className="row">
              <input
                className="input"
                value={phraseQuery}
                onChange={(event) => setPhraseQuery(event.target.value)}
                placeholder="Search phrases"
              />
              <select
                className="select"
                value={phraseGroupId}
                onChange={(event) => setPhraseGroupId(event.target.value)}
              >
                <option value="all">All categories</option>
                {DEFAULT_PHRASE_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {visiblePhraseGroups.length ? (
              visiblePhraseGroups.map((group) => (
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
              ))
            ) : (
              <div className="muted">No matching phrases.</div>
            )}

            <div className="field">
              <label>My Phrases</label>
              <div className="row">
                <input
                  className="input"
                  value={newPhrase}
                  onChange={(event) => setNewPhrase(event.target.value)}
                  placeholder="Add custom phrase"
                />
                <button className="button secondary" onClick={handleAddPhrase}>
                  Add
                </button>
              </div>
              {myPhrases.length ? (
                <div className="chips">
                  {myPhrases.map((phrase) => (
                    <button
                      key={phrase}
                      className="chip secondary"
                      onClick={() => handlePhraseInsert(phrase)}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="muted">No custom phrases yet.</div>
              )}
            </div>

            <details>
              <summary>Import / Export</summary>
              <div className="field">
                <label>Paste JSON array of phrases</label>
                <textarea
                  className="textarea"
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  placeholder='["ROOM","SUITE 200","EXIT"]'
                />
                <div className="row">
                  <button
                    className="button secondary"
                    onClick={handleImportPhrases}
                  >
                    Import JSON
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      copyToClipboard("phrases", JSON.stringify(myPhrases, null, 2))
                    }
                  >
                    {copiedId === "phrases" ? "Copied" : "Copy JSON"}
                  </button>
                </div>
              </div>
            </details>
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
	                  disabled={!result || !canExport}
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
	                  <div className="muted">Smart Select</div>
	                  <div>
	                    {smartSelectEnabled
	                      ? `ON (${smartSelectDecision.ruleId})`
	                      : "OFF"}
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
	                <div className="field">
	                  <div className="output">
	                    {compliance.flags
	                      .map((flag) => `${flag.level} ${flag.code}: ${flag.message}`)
	                      .join("\n")}
	                  </div>
	                </div>
	              ) : (
	                <div className="notice success">
	                  No common risk flags detected (still requires verification).
	                </div>
	              )}

	              {compliance.level === "WARN" ? (
	                <div className="field">
	                  <label className="toggle">
	                    <input
	                      type="checkbox"
	                      checked={warnAcknowledged}
	                      onChange={(event) => setWarnAcknowledged(event.target.checked)}
	                    />
	                    I will verify braille translation and physical layout requirements
	                    before production.
	                  </label>
	                  {!warnAcknowledged ? (
	                    <div className="notice">
	                      Exports are locked until you acknowledge.
	                    </div>
	                  ) : null}
	                </div>
	              ) : null}

	              {compliance.level === "BLOCK" ? (
	                <div className="field">
	                  <label className="toggle">
	                    <input
	                      type="checkbox"
	                      checked={blockAcknowledged}
	                      onChange={(event) => setBlockAcknowledged(event.target.checked)}
	                    />
	                    I understand this is high-risk and I will verify before production.
	                  </label>
	                  <label>
	                    Reason (required to unlock exports)
	                    <input
	                      className="input"
	                      value={blockReason}
	                      onChange={(event) => setBlockReason(event.target.value)}
	                      placeholder="Why is export necessary despite BLOCK flags?"
	                    />
	                  </label>
	                  {!canExport ? (
	                    <div className="notice">
	                      Exports are locked until you acknowledge and provide a reason.
	                    </div>
	                  ) : null}
	                </div>
	              ) : null}
	            </div>
	
	          <div className="field">
	            <div className="row space-between">
	              <label>Unicode braille</label>
	              <button
	                className="button secondary"
	                onClick={() =>
	                  copyToClipboard("unicode", result?.unicode_braille || "")
	                }
	                disabled={!result?.unicode_braille || !canExport}
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
	                disabled={!bitPatternString || !canExport}
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
	                disabled={!result?.plain_dots || !canExport}
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
	                  disabled={!svgPreview || !canExport}
	                >
	                  {copiedId === "svg" ? "Copied" : "Copy SVG"}
	                </button>
	                <button
	                  className="button secondary"
	                  onClick={downloadSvg}
	                  disabled={!svgPreview || !canExport}
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
                <span className="badge">Exports {canExport ? "unlocked" : "locked"}</span>
              </div>
              <div className="output">
                Tables: {result?.metadata.table_names.join(", ") || "—"}
                {"\n"}Input hash: {inputHash}
                {"\n"}Smart Select: {smartSelectEnabled ? "ON" : "OFF"}
                {smartSelectEnabled ? `\nRule: ${smartSelectDecision.ruleId}` : ""}
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
                  be more readable in Grade 2. Smart Select is a conservative helper
                  and must be verified.
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
