import { LIBLOUIS_INLINE_ASSETS } from "virtual:liblouis-assets";

type SyncApi = {
  translateString: (tables: string, text: string) => string | null;
  version: () => string;
  setDataPath?: (path: string) => void;
  preloadTableFiles?: (
    entries: { name: string; data: ArrayBuffer }[],
    opts?: { tableDir?: string }
  ) => number;
};

export type LouisEngine = {
  translateString: (tables: string, text: string) => Promise<string | null>;
  version: () => Promise<string>;
};

const CAPI_PATH = "liblouis/build-no-tables-utf16.js";
const EASY_API_PATH = "liblouis/easy-api.js";

const REQUIRED_TABLE_FILES = [
  "en-us-g2.ctb",
  "en-us-g1.ctb",
  "chardefs.cti",
  "braille-patterns.cti",
  "litdigits6Dots.uti",
  "loweredDigits6Dots.uti",
  "latinLetterDef6Dots.uti"
];

let cachedEngine: Promise<LouisEngine> | null = null;
const cachedScriptUrls = new Map<string, string>();

const decodeBase64Bytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const decodeBase64Text = (value: string) => {
  const bytes = decodeBase64Bytes(value);
  return new TextDecoder().decode(bytes);
};

const getScriptUrl = (path: string) => {
  const cached = cachedScriptUrls.get(path);
  if (cached) {
    return cached;
  }
  const source = LIBLOUIS_INLINE_ASSETS.scripts[path];
  if (!source) {
    throw new Error(`Missing inline liblouis script: ${path}`);
  }
  const url = URL.createObjectURL(
    new Blob([decodeBase64Text(source)], { type: "text/javascript" })
  );
  cachedScriptUrls.set(path, url);
  return url;
};

const getTableEntries = () =>
  REQUIRED_TABLE_FILES.map((name) => {
    const base64 = LIBLOUIS_INLINE_ASSETS.tables[name];
    if (!base64) {
      throw new Error(`Missing inline liblouis table: ${name}`);
    }
    const bytes = decodeBase64Bytes(base64);
    return {
      name,
      data: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      )
    };
  });

export const resetLiblouis = () => {
  cachedEngine = null;
};

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const loadBrowserEngine = async (): Promise<LouisEngine> => {
  const capiScriptUrl = getScriptUrl(CAPI_PATH);
  const easyApiScriptUrl = getScriptUrl(EASY_API_PATH);

  await loadScript(capiScriptUrl);
  await loadScript(easyApiScriptUrl);

  const ApiCtor = (window as any).LiblouisEasyApi;
  if (!ApiCtor) {
    throw new Error("Unable to load liblouis API in the standalone build.");
  }

  const instance: SyncApi = new ApiCtor();

  if (typeof instance.preloadTableFiles !== "function") {
    throw new Error("liblouis preloadTableFiles() is unavailable in this build.");
  }

  const entries = getTableEntries();
  instance.preloadTableFiles(entries, { tableDir: "/tables" });

  if (typeof instance.setDataPath === "function") {
    instance.setDataPath("/tables");
  }

  return {
    translateString: (tables, text) =>
      Promise.resolve(instance.translateString(tables, text)),
    version: () => Promise.resolve(instance.version())
  };
};

export const loadLiblouis = async (): Promise<LouisEngine> => {
  if (cachedEngine) {
    return cachedEngine;
  }
  cachedEngine = loadBrowserEngine();
  return cachedEngine;
};

export const translateWithLiblouis = async (
  tables: string[],
  text: string
): Promise<string | null> => {
  const engine = await loadLiblouis();
  const run = async () => engine.translateString(tables.join(","), text);
  try {
    const timeoutMs = 2500;
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );
    const result = await Promise.race([run(), timeout]);
    if (result === null) {
      resetLiblouis();
    }
    return result;
  } catch {
    resetLiblouis();
    return null;
  }
};

export const getLiblouisVersion = async (): Promise<string> => {
  const engine = await loadLiblouis();
  return engine.version();
};
