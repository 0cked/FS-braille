const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const packageRoot = path.join(projectRoot, "node_modules", "liblouis-wasm");
const publicRoot = path.join(projectRoot, "public", "liblouis");
const tablesRoot = path.join(publicRoot, "tables");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const findFirst = (dir, predicate) => {
  if (!fs.existsSync(dir)) {
    return null;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFirst(fullPath, predicate);
      if (found) {
        return found;
      }
    } else if (predicate(fullPath)) {
      return fullPath;
    }
  }
  return null;
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

if (!fs.existsSync(packageRoot)) {
  console.warn("liblouis-wasm not installed yet; skipping asset copy.");
  process.exit(0);
}

ensureDir(publicRoot);
ensureDir(tablesRoot);

const wasmPath = findFirst(packageRoot, (filePath) => filePath.endsWith(".wasm"));
if (wasmPath) {
  fs.copyFileSync(wasmPath, path.join(publicRoot, "liblouis.wasm"));
  console.log(`Copied WASM: ${wasmPath}`);
} else {
  console.warn("No liblouis.wasm found in liblouis-wasm package.");
}

const tablesPath = findFirst(packageRoot, (filePath) =>
  filePath.endsWith(`${path.sep}tables`)
);
if (tablesPath) {
  copyDir(tablesPath, tablesRoot);
  console.log(`Copied tables from: ${tablesPath}`);
} else {
  console.warn("No tables directory found in liblouis-wasm package.");
}
