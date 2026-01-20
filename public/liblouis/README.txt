This directory holds liblouis browser assets and table files.

On install, `npm install` runs `scripts/copy-liblouis-assets.cjs` to copy
liblouis browser assets and required table files from npm packages into:
- public/liblouis/build-no-tables-utf16.js
- public/liblouis/easy-api.js
- public/liblouis/tables/*

If assets are missing, re-run `npm install` or `npm run postinstall`.
