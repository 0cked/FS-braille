type AsyncApi = {
  translateString: (
    tables: string,
    text: string,
    cb: (value: string | null) => void
  ) => void;
  version: (cb: (value: string) => void) => void;
  enableOnDemandTableLoading: (path: string, cb?: () => void) => void;
};

export type LouisEngine = {
  translateString: (tables: string, text: string) => Promise<string | null>;
  version: () => Promise<string>;
};

const ASSET_BASE = "liblouis";
const CAPI_PATH = `${ASSET_BASE}/build-no-tables-utf16.js`;
const EASY_API_PATH = `${ASSET_BASE}/easy-api.js`;
const TABLES_PATH = `${ASSET_BASE}/`;

let cachedEngine: Promise<LouisEngine> | null = null;

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `/${src}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const loadBrowserEngine = async (): Promise<LouisEngine> => {
  await loadScript(CAPI_PATH);
  await loadScript(EASY_API_PATH);

  const AsyncApiCtor = (window as any).LiblouisEasyApiAsync;
  if (!AsyncApiCtor) {
    throw new Error("Unable to load liblouis async API in the browser.");
  }

  const instance: AsyncApi = new AsyncApiCtor({
    capi: CAPI_PATH,
    easyapi: EASY_API_PATH
  });

  await new Promise<void>((resolve) => {
    instance.enableOnDemandTableLoading(TABLES_PATH, resolve);
  });

  return {
    translateString: (tables, text) =>
      new Promise((resolve) => instance.translateString(tables, text, resolve)),
    version: () => new Promise((resolve) => instance.version(resolve))
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
  return engine.translateString(tables.join(","), text);
};

export const getLiblouisVersion = async (): Promise<string> => {
  const engine = await loadLiblouis();
  return engine.version();
};
