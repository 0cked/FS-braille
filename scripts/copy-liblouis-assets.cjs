const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const liblouisRoot = path.join(projectRoot, "node_modules", "liblouis");
const buildRoot = path.join(projectRoot, "node_modules", "liblouis-build");
const publicRoot = path.join(projectRoot, "public", "liblouis");
const tablesRoot = path.join(publicRoot, "tables");
const tablesSource = path.join(buildRoot, "tables");

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
  fs.copyFileSync(easyApiPath, path.join(publicRoot, "easy-api.js"));
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
