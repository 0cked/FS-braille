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

visited.forEach((table) => {
  const src = path.join(tablesSource, table);
  const dest = path.join(tablesRoot, table);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
});

console.log(`Copied ${visited.size} table files to ${tablesRoot}`);
