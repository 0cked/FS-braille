const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const liblouisRoot = path.join(projectRoot, "node_modules", "liblouis");
const buildRoot = path.join(projectRoot, "node_modules", "liblouis-build");
const publicRoot = path.join(projectRoot, "public", "liblouis");
const tablesRoot = path.join(publicRoot, "tables");
const tablesSource = path.join(buildRoot, "tables");

const patchEasyApi = (source) => {
  let patched = source;

  // Expose a helper that lets callers preload table files into the Emscripten
  // filesystem, so we can avoid `FS.createLazyFile` (sync XHR) when needed.
  // This is especially useful in locked-down / CDN environments where sync XHR
  // may behave inconsistently.
  if (!patched.includes("preloadTableFiles")) {
    const newline = patched.includes("\r\n") ? "\r\n" : "\n";
    patched = patched.replace(
      /"disableOnDemandTableLoading"\s*\];/,
      `"disableOnDemandTableLoading",${newline}\t"preloadTableFiles"];`
    );

    const impl = [
      "",
      "// Preload a small set of table/include files into the Emscripten FS.",
      "// Intended for browser/worker usage to avoid lazy-loading via sync XHR.",
      "LiblouisEasyApi.prototype.preloadTableFiles = function(entries, opts) {",
      "\topts = opts || {};",
      "\tvar capi = this.capi;",
      "\tvar FS = capi.FS;",
      "\tvar tableDir = opts.tableDir || '/tables';",
      "",
      "\ttry { FS.mkdir(tableDir); } catch(e) { }",
      "",
      "\tvar count = 0;",
      "\tfor(var i = 0; i < entries.length; ++i) {",
      "\t\tvar entry = entries[i];",
      "\t\tvar name = entry && (entry.name || entry.path || entry[0]);",
      "\t\tvar data = entry && (entry.data || entry.buffer || entry[1]);",
      "\t\tif(!name || !data) { continue; }",
      "",
      "\t\tvar bytes = data instanceof Uint8Array ? data : new Uint8Array(data);",
      "\t\tvar tablePath = tableDir + '/' + name;",
      "\t\tvar rootPath = '/' + name;",
      "",
      "\t\ttry { FS.unlink(tablePath); } catch(e) { }",
      "\t\ttry { FS.unlink(rootPath); } catch(e) { }",
      "",
      "\t\tFS.writeFile(tablePath, bytes, { encoding: 'binary' });",
      "\t\tFS.writeFile(rootPath, bytes, { encoding: 'binary' });",
      "\t\tcount++;",
      "\t}",
      "",
      "\treturn count;",
      "};",
      ""
    ].join("\n");

    // Insert right before `node_dirExists` (present in this build).
    patched = patched.replace(
      /(\r?\n)function node_dirExists\(capi, path\) \{/,
      `${newline}${impl}${newline}function node_dirExists(capi, path) {`
    );

    // If insertion failed (unexpected upstream changes), append near the end.
    if (!patched.includes("LiblouisEasyApi.prototype.preloadTableFiles")) {
      const marker = "// create a default instance in browser environments";
      if (patched.includes(marker)) {
        patched = patched.replace(marker, `${impl}${newline}${marker}`);
      } else {
        patched = `${patched}${newline}${impl}`;
      }
    }
  }

  return patched;
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const copyDir = (source, dest) => {
  ensureDir(dest);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const parseIncludes = (content) => {
  const includes = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line) => {
    const stripped = line.split("#")[0].trim();
    if (!stripped) {
      return;
    }
    const match = stripped.match(/^include\s+(\S+)/);
    if (match) {
      includes.push(match[1]);
    }
  });
  return includes;
};

const collectTables = (name, visited) => {
  if (visited.has(name)) {
    return;
  }
  const filePath = path.join(tablesSource, name);
  if (!fs.existsSync(filePath)) {
    console.warn(`Table not found: ${name}`);
    return;
  }
  visited.add(name);
  const content = fs.readFileSync(filePath, "utf8");
  parseIncludes(content).forEach((includeName) =>
    collectTables(includeName, visited)
  );
};

if (!fs.existsSync(liblouisRoot) || !fs.existsSync(buildRoot)) {
  console.warn("liblouis packages not installed yet; skipping asset copy.");
  process.exit(0);
}

ensureDir(publicRoot);
ensureDir(tablesRoot);

const easyApiPath = path.join(liblouisRoot, "easy-api.js");
const buildPath = path.join(buildRoot, "build-no-tables-utf16.js");

if (fs.existsSync(easyApiPath)) {
  const raw = fs.readFileSync(easyApiPath, "utf8");
  const patched = patchEasyApi(raw);
  fs.writeFileSync(path.join(publicRoot, "easy-api.js"), patched);
  console.log(`Copied Easy API: ${easyApiPath}`);
} else {
  console.warn("easy-api.js not found in liblouis package.");
}

if (fs.existsSync(buildPath)) {
  fs.copyFileSync(buildPath, path.join(publicRoot, "build-no-tables-utf16.js"));
  console.log(`Copied build: ${buildPath}`);
} else {
  console.warn("build-no-tables-utf16.js not found in liblouis-build package.");
}

const requiredTables = ["en-us-g1.ctb", "en-us-g2.ctb"];
const visited = new Set();
requiredTables.forEach((table) => collectTables(table, visited));

// liblouis-build's `chardefs.cti` includes `latinLetterDef8Dots.uti`, which
// defines capitals using dot 7 (e.g. `uplow Aa 17,1`). In the browser build we
// use for 6-dot signage output, that can result in "Character 'a' is not
// defined" cascades when compiling `en-us-g1/en-us-g2`.
//
// We patch the copied `chardefs.cti` to include the 6-dot Latin definitions
// instead, and ensure that file is available for include resolution.
visited.add("latinLetterDef6Dots.uti");
visited.add("braille-patterns.cti");

visited.forEach((table) => {
  const src = path.join(tablesSource, table);
  const dest = path.join(tablesRoot, table);
  ensureDir(path.dirname(dest));
  const rootDest = path.join(publicRoot, table);

  if (table === "chardefs.cti") {
    const content = fs.readFileSync(src, "utf8");
    let patched = content.replace(
      "include latinLetterDef8Dots.uti",
      "include latinLetterDef6Dots.uti"
    );

    // The Emscripten "no tables" build needs a mapping from dot patterns to
    // Unicode braille cells. `braille-patterns.cti` provides those `sign`
    // definitions. If it's not loaded before `chardefs.cti` defines letters and
    // punctuation, liblouis will emit cascades like:
    //   "Character 'a' is not defined" / "Dot pattern \\12/ is not defined"
    //
    // We inject the include early (before any `space`/`punctuation` lines).
    if (
      !/(^|\r?\n)include\s+braille-patterns\.cti(\s|$)/.test(patched)
    ) {
      const markerRe = /(\r?\n)# Computer braille single-cell characters(\r?\n)/;
      if (markerRe.test(patched)) {
        patched = patched.replace(
          markerRe,
          `$1include braille-patterns.cti$2# Computer braille single-cell characters$2`
        );
      } else {
        patched = `include braille-patterns.cti\n\n${patched}`;
      }
    }

    fs.writeFileSync(dest, patched);
    fs.writeFileSync(rootDest, patched);
    return;
  }

  if (table === "en-us-g1.ctb") {
    // `braille-patterns.cti` is injected into `chardefs.cti` above so it is
    // loaded before any dot patterns are referenced. Remove the later include
    // to avoid duplicate definitions.
    const content = fs.readFileSync(src, "utf8");
    const patched = content
      .split(/\r?\n/)
      .filter(
        (line) => !/^\s*include\s+braille-patterns\.cti(\s|$)/.test(line)
      )
      .join("\n");
    fs.writeFileSync(dest, patched);
    fs.writeFileSync(rootDest, patched);
    return;
  }

  fs.copyFileSync(src, dest);
  fs.copyFileSync(src, rootDest);
});

console.log(`Copied ${visited.size} table files to ${tablesRoot}`);
