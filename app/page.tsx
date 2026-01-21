"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BRAILLE_PROFILES,
  DEFAULT_PROFILE_ID,
  getProfileById
} from "../config/profiles";
import {
  DEFAULT_NORMALIZATION_OPTIONS,
  NormalizationOptions,
} from "../lib/normalization";
import { translateText, TranslationResult } from "../lib/translation";
import { DEFAULT_SVG_LAYOUT, SvgLayout, renderBrailleSvg } from "../lib/svg";
import { DEFAULT_PHRASE_GROUPS } from "../lib/phraseLibrary";

const AUTO_TRANSLATE_DELAY = 350;
const UNDO_LIMIT = 10;
const LOCAL_STORAGE_KEY = "fastsigns_braille_phrases";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [profileId, setProfileId] = useState(DEFAULT_PROFILE_ID);
  const [options, setOptions] = useState<NormalizationOptions>(
    DEFAULT_NORMALIZATION_OPTIONS
  );
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [phraseQuery, setPhraseQuery] = useState("");
  const [phraseGroupId, setPhraseGroupId] = useState<string>("all");
  const [myPhrases, setMyPhrases] = useState<string[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [importJson, setImportJson] = useState("");
  const [layout, setLayout] = useState<SvgLayout>(DEFAULT_SVG_LAYOUT);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const profile = useMemo(() => getProfileById(profileId), [profileId]);

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
    setIsTranslating(true);
    try {
      const translation = await translateText(input, profile, options);
      setResult(translation);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      handleTranslate();
    }, AUTO_TRANSLATE_DELAY);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, profileId, options]);

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

  const svgMarkup = svgPreview
    ? `<?xml version="1.0" encoding="UTF-8"?>\n${svgPreview.svg}`
    : "";

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
        <div className="brand">
          <img className="brandLogo" src="/fastsigns-logo.svg" alt="FASTSIGNS" />
          <div className="brandCopy">
            <span className="badge">Braille Translator</span>
            <h1 className="title">Deterministic braille translation</h1>
            <p className="subtitle">
              Enter sign text, choose a profile, then copy outputs for design and
              production.
            </p>
          </div>
        </div>
      </header>

      <section className="grid">
        <div className="panel">
          <h2>Input</h2>
          <div className="field">
            <label htmlFor="input-text">Sign text (one line per sign line)</label>
            <textarea
              id="input-text"
              className="textarea"
              value={input}
              placeholder="RESTROOM\nROOM 101\nEXIT\nSUITE 200"
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="row space-between">
              <div className="row">
                <button className="button" onClick={handleTranslate}>
                  {isTranslating ? "Translating..." : "Translate"}
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
              <span className="muted">Auto-translate with {AUTO_TRANSLATE_DELAY}ms delay</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="profile">Translation profile</label>
            <select
              id="profile"
              className="select"
              value={profileId}
              onChange={(event) =>
                setProfileId(event.target.value as typeof profileId)
              }
            >
              {BRAILLE_PROFILES.map((profileOption) => (
                <option key={profileOption.id} value={profileOption.id}>
                  {profileOption.label}
                </option>
              ))}
            </select>
            <span className="muted">{profile.description}</span>
          </div>

          <details>
            <summary>Options</summary>
            <div className="field">
              <label>Normalization</label>
              <div className="row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={options.normalizeWhitespace}
                    onChange={(event) =>
                      setOptions((prev) => ({
                        ...prev,
                        normalizeWhitespace: event.target.checked
                      }))
                    }
                  />
                  Normalize whitespace
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={options.smartQuotes}
                    onChange={(event) =>
                      setOptions((prev) => ({
                        ...prev,
                        smartQuotes: event.target.checked
                      }))
                    }
                  />
                  Smart quotes to ASCII
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={options.preserveLineBreaks}
                    onChange={(event) =>
                      setOptions((prev) => ({
                        ...prev,
                        preserveLineBreaks: event.target.checked
                      }))
                    }
                  />
                  Preserve line breaks
                </label>
              </div>
              <div className="row">
                <label className="toggle">
                  <input
                    type="radio"
                    name="unsupported"
                    checked={options.unsupportedHandling === "replace"}
                    onChange={() =>
                      setOptions((prev) => ({
                        ...prev,
                        unsupportedHandling: "replace"
                      }))
                    }
                  />
                  Replace unsupported with ?
                </label>
                <label className="toggle">
                  <input
                    type="radio"
                    name="unsupported"
                    checked={options.unsupportedHandling === "remove"}
                    onChange={() =>
                      setOptions((prev) => ({
                        ...prev,
                        unsupportedHandling: "remove"
                      }))
                    }
                  />
                  Remove unsupported
                </label>
              </div>
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

        <div className="panel">
          <h2>Outputs</h2>

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
                <span className="badge">Profile {result?.metadata.profile_id || "—"}</span>
              </div>
              <div className="output">
                Tables: {result?.metadata.table_names.join(", ") || "—"}
                {"\n"}Normalization: {result?.metadata.normalization_applied.join(", ") || "—"}
              </div>
              {result?.warnings.length ? (
                <div className="notice">
                  {result.warnings.map((warning, index) => (
                    <div key={`${warning.type}-${index}`}>{warning.message}</div>
                  ))}
                </div>
              ) : (
                <div className="notice success">No warnings detected.</div>
              )}
            </div>
          </details>
        </div>
      </section>

      <section className="panel secondary">
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
      </section>
    </main>
  );
}
