export type LouisEngine = {
  translate?: (tables: string | string[], text: string) => string;
  lou_translate?: (tables: string, text: string) => string;
  translateString?: (tables: string, text: string) => string;
  getVersion?: () => string;
  version?: string | (() => string);
  setTables?: (tables: string[]) => void;
};

const WASM_PATH = "/liblouis/liblouis.wasm";
const TABLE_ROOT = "/liblouis/tables";

let cachedEngine: Promise<LouisEngine> | null = null;

const isBrowser = typeof window !== "undefined";

const resolveTableData = async (name: string) => {
  if (isBrowser) {
    const response = await fetch(`${TABLE_ROOT}/${name}`);
    if (!response.ok) {
      throw new Error(`Unable to load liblouis table: ${name}`);
    }
    return response.text();
  }

  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const tablePath = path.join(
    process.cwd(),
    "public",
    "liblouis",
    "tables",
    name
  );
  return readFile(tablePath, "utf8");
};

const locateFile = (file: string) => {
  if (file.endsWith(".wasm")) {
    return WASM_PATH;
  }
  return file;
};

export const loadLiblouis = async (): Promise<LouisEngine> => {
  if (cachedEngine) {
    return cachedEngine;
  }

  cachedEngine = (async () => {
    const mod: any = await import("liblouis-wasm");
    const lib = mod?.default ?? mod;

    if (typeof lib.createLiblouis === "function") {
      return lib.createLiblouis({ locateFile, tableResolver: resolveTableData });
    }

    if (typeof lib.load === "function") {
      return lib.load({ locateFile, tableResolver: resolveTableData });
    }

    if (typeof lib.init === "function") {
      return lib.init({ locateFile, tableResolver: resolveTableData });
    }

    return lib as LouisEngine;
  })();

  return cachedEngine;
};

export const translateWithLiblouis = async (
  tables: string[],
  text: string
): Promise<string> => {
  const engine = await loadLiblouis();
  if (engine.setTables) {
    engine.setTables(tables);
  }

  if (engine.translate) {
    try {
      return engine.translate(tables, text);
    } catch {
      return engine.translate(tables.join(","), text);
    }
  }

  if (engine.lou_translate) {
    return engine.lou_translate(tables.join(","), text);
  }

  if (engine.translateString) {
    return engine.translateString(tables.join(","), text);
  }

  throw new Error("Unsupported liblouis wasm API: no translate function found.");
};

export const getLiblouisVersion = async (): Promise<string> => {
  const engine = await loadLiblouis();
  if (typeof engine.getVersion === "function") {
    return engine.getVersion();
  }
  if (typeof engine.version === "function") {
    return engine.version();
  }
  if (typeof engine.version === "string") {
    return engine.version;
  }
  return "unknown";
};
