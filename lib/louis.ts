type AsyncApi = {
  translateString: (tables: string, text: string, cb: (value: string) => void) => void;
  version: (cb: (value: string) => void) => void;
  enableOnDemandTableLoading: (path: string, cb?: () => void) => void;
};

type SyncApi = {
  translateString: (tables: string, text: string) => string;
  version: () => string;
};

export type LouisEngine = {
  translateString: (tables: string, text: string) => Promise<string>;
  version: () => Promise<string>;
};

const ASSET_BASE = "liblouis";
const CAPI_PATH = `${ASSET_BASE}/build-no-tables-utf16.js`;
const EASY_API_PATH = `${ASSET_BASE}/easy-api.js`;
const TABLES_PATH = `${ASSET_BASE}/tables/`;

let cachedEngine: Promise<LouisEngine> | null = null;

const isBrowser = typeof window !== "undefined";

const loadBrowserEngine = async (): Promise<LouisEngine> => {
  const mod: any = await import("liblouis/easy-api");
  const AsyncApiCtor =
    mod?.EasyApiAsync ?? mod?.LiblouisEasyApiAsync ?? mod?.default?.EasyApiAsync;

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

const loadNodeEngine = async (): Promise<LouisEngine> => {
  const mod: any = await import("liblouis");
  const instance: SyncApi = mod?.default ?? mod;

  return {
    translateString: async (tables, text) =>
      instance.translateString(tables, text),
    version: async () => instance.version()
  };
};

export const loadLiblouis = async (): Promise<LouisEngine> => {
  if (cachedEngine) {
    return cachedEngine;
  }

  cachedEngine = isBrowser ? loadBrowserEngine() : loadNodeEngine();
  return cachedEngine;
};

export const translateWithLiblouis = async (
  tables: string[],
  text: string
): Promise<string> => {
  const engine = await loadLiblouis();
  return engine.translateString(tables.join(","), text);
};

export const getLiblouisVersion = async (): Promise<string> => {
  const engine = await loadLiblouis();
  return engine.version();
};
