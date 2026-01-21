type AsyncApi = {
  translateString: (
    tables: string,
    text: string,
    cb: (value: string | null) => void
  ) => void;
  version: (cb: (value: string) => void) => void;
  enableOnDemandTableLoading: (path: string, cb?: () => void) => void;
  setDataPath?: (path: string, cb?: (value: unknown) => void) => void;
  preloadTableFiles?: (
    entries: { name: string; data: ArrayBuffer }[],
    cb?: (value: unknown) => void
  ) => void;
};

export type LouisEngine = {
  translateString: (tables: string, text: string) => Promise<string | null>;
  version: () => Promise<string>;
};

const ASSET_BASE = "liblouis";
const CAPI_PATH = `${ASSET_BASE}/build-no-tables-utf16.js`;
const EASY_API_PATH = `${ASSET_BASE}/easy-api.js`;
const TABLES_PATH = `${ASSET_BASE}/`;

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

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const normalizedSrc = src.startsWith("/") ? src : `/${src}`;
    const existing = document.querySelector(`script[src="${normalizedSrc}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = normalizedSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const loadBrowserEngine = async (): Promise<LouisEngine> => {
  await loadScript(CAPI_PATH);
  await loadScript(EASY_API_PATH);

  const callAsync = <T>(
    fn: (cb: (value: T) => void) => void
  ): Promise<T> =>
    new Promise<T>((resolve) => {
      fn(resolve);
    });

  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debugLiblouis");
  if (debug) {
    const required = REQUIRED_TABLE_FILES;

    await Promise.all(
      required.map(async (file) => {
        const url = new URL(`${ASSET_BASE}/${file}`, window.location.origin);
        try {
          const res = await fetch(url, { cache: "no-store" });
          // eslint-disable-next-line no-console
          console.log(
            `[liblouis] ${res.status} ${url.pathname} (${res.headers.get("content-type") ?? "unknown"})`
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[liblouis] fetch failed ${url.pathname}`, err);
        }
      })
    );
  }

  const AsyncApiCtor = (window as any).LiblouisEasyApiAsync;
  if (!AsyncApiCtor) {
    throw new Error("Unable to load liblouis async API in the browser.");
  }

  const instance: AsyncApi = new AsyncApiCtor({
    capi: CAPI_PATH,
    easyapi: EASY_API_PATH
  });

  const preloadIfSupported = async () => {
    if (typeof instance.preloadTableFiles !== "function") {
      return false;
    }

    const entries = await Promise.all(
      REQUIRED_TABLE_FILES.map(async (name) => {
        const res = await fetch(`/${ASSET_BASE}/${name}`);
        if (!res.ok) {
          throw new Error(
            `[liblouis] Failed to fetch required table file ${name} (${res.status})`
          );
        }
        return { name, data: await res.arrayBuffer() };
      })
    );

    await callAsync((cb) => instance.preloadTableFiles?.(entries, cb));

    if (typeof instance.setDataPath === "function") {
      await callAsync((cb) => instance.setDataPath?.("/tables", cb));
    }

    return true;
  };

  const enableTables = async () => {
    try {
      if (await preloadIfSupported()) {
        return;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[liblouis] preload failed; falling back to on-demand", err);
    }
    await new Promise<void>((resolve) => {
      instance.enableOnDemandTableLoading(TABLES_PATH, resolve);
    });
  };

  await enableTables();

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
