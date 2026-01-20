This directory holds liblouis WASM and table assets.

On install, `npm install` runs `scripts/copy-liblouis-assets.cjs` to copy
`liblouis.wasm` and table files from the `liblouis-wasm` package into:
- public/liblouis/liblouis.wasm
- public/liblouis/tables/*.ctb

If assets are missing, re-run `npm install` or `npm run postinstall`.
