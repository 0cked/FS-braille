# FASTSIGNS Braille Translator

Deterministic braille translation for signage teams, powered by liblouis tables. The UI is designed for FASTSIGNS franchisees: clear inputs, explicit profile selection, and production-ready outputs (Unicode braille, dot bitstrings, dot-number notation, and SVG preview).

**Core rule:** liblouis is the single source of truth for braille output. Assist features are advisory only and never modify braille patterns automatically.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

1. Push this repo to GitHub.
2. Click the button above and connect the repo in Vercel.
3. Deploy (no extra configuration required).

## Why Browser Build (and not serverless native)

Vercel serverless functions don’t reliably support native liblouis binaries without custom build steps. To keep deploys frictionless and deterministic, liblouis runs fully in the browser using the official Emscripten build (from the `liblouis` / `liblouis-build` packages). This avoids native build failures and keeps runtime self-contained.

## Local Development

```bash
npm install
npm run dev
```

## Liblouis Assets

This project uses the `liblouis` and `liblouis-build` packages. On install, `scripts/copy-liblouis-assets.cjs` copies:

- `build-no-tables-utf16.js` → `public/liblouis/build-no-tables-utf16.js`
- `easy-api.js` → `public/liblouis/easy-api.js`
- required table files → `public/liblouis/tables/*`

If those files are missing, re-run:

```bash
npm run postinstall
```

## Profiles & Tables

Profiles are defined in `config/profiles.ts` and map profile IDs to table names. Add new profiles by appending to `BRAILLE_PROFILES`.

Supported profiles (MVP):

- `en-us-g2` – US English contracted (Grade 2)
- `en-us-g1` – US English uncontracted (Grade 1)

## Normalization

Deterministic normalization is applied before translation:

- Normalize whitespace (default on)
- Smart quotes → ASCII (default on)
- Preserve line breaks (default on)
- Unsupported characters: replace with `?` or remove (toggle)

A “What changed?” panel shows the before/after diff.

## Assist (Advisory)

Assist never changes braille output automatically. It operates only on the source text and settings.

Features:

- Sign Text Coach suggestions (apply manually)
- Profile recommendation with explanation
- Risk flags (unsupported characters, long lines, extra spaces, etc.)
- Phrase library + My Phrases (stored in localStorage)
- Plain-English interpretation (estimated)

**Disclaimer:** Assist is advisory only and is not an ADA compliance determination. Always verify final tactile specs.

## Tests

Normalization tests run with Vitest. Golden translation tests are provided for the required phrases, but must be generated after liblouis assets are installed:

```bash
npm run update-golden
npm test
```

Golden outputs are stored in:

- `tests/golden.en-us-g1.json`
- `tests/golden.en-us-g2.json`

## Project Structure

```
app/                 Next.js UI (App Router)
config/              Profile configuration
lib/                 Translation, normalization, SVG renderer, assist rules
public/liblouis/      Browser build + tables (copied on install)
tests/               Normalization + golden tests
scripts/             Asset copy + golden generation
```

## Compliance Note

“Assist” features are advisory. Verify ADA/tactile specs and production requirements before fabrication.
