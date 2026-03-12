# FASTSIGNS Braille Translator

Deterministic braille translation for signage teams, powered by liblouis tables. The UI is designed for FASTSIGNS franchisees: clear inputs, explicit profile selection, and production-ready outputs (Unicode braille, dot bitstrings, dot-number notation, and SVG preview).

**Core rule:** liblouis is the single source of truth for braille output. Assist features are advisory only and never modify braille patterns automatically.

## Static Export / Bucket Hosting

This app can be deployed as a plain static site. There is no server-side
translation path; liblouis runs entirely in the browser and loads its assets
from `public/`.

Build the export:

```bash
npm install
npm run build
```

Upload the contents of `out/` to your bucket or CDN origin.

Common examples:

- Amazon S3 static website hosting
- Cloudflare R2 + custom domain
- Google Cloud Storage static website hosting
- Any CDN/origin that can serve `index.html`, JS, CSS, SVG, and the
  `liblouis` table files

For local preview after building:

```bash
npm start
```

### Single-file HTML export

To generate one self-contained HTML file:

```bash
npm run build:standalone
```

The output file is:

- `dist/fs-braille-standalone.html`

That file embeds the UI, CSS, fonts, FASTSIGNS logo, liblouis browser build,
and required table files into a single HTML document.

### Optional subpath hosting

By default, the export assumes the site is served from the domain root, such as
`https://example.com/`.

If you need to host it under a subpath such as
`https://example.com/tools/braille/`, build with `NEXT_PUBLIC_BASE_PATH`:

```bash
NEXT_PUBLIC_BASE_PATH=/tools/braille npm run build
```

Then publish the exported files at that same URL prefix, or configure your CDN
or origin to mount the `out/` directory there.

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
- required table files → `public/liblouis/tables/*` and `public/liblouis/*.ctb`

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
