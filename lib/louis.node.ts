export type LouisEngine = {
  translateString: (tables: string, text: string) => Promise<string | null>;
  version: () => Promise<string>;
};

type SyncApi = {
  translateString: (tables: string, text: string) => string;
  version: () => string;
  enableOnDemandTableLoading?: (path: string | null) => void;
};

let cachedEngine: Promise<LouisEngine> | null = null;
let tableLoadingEnabled = false;

export const loadLiblouis = async (): Promise<LouisEngine> => {
  if (cachedEngine) {
    return cachedEngine;
  }

  cachedEngine = (async () => {
    const mod: any = await import("liblouis");
    const instance: SyncApi = mod?.default ?? mod;

    // Configure the table path to liblouis-build/tables
    // Passing null makes it automatically resolve to liblouis-build/tables
    // Only enable once to avoid double-mounting issues
    if (instance.enableOnDemandTableLoading && !tableLoadingEnabled) {
      try {
        instance.enableOnDemandTableLoading(null);
        tableLoadingEnabled = true;
      } catch (e) {
        console.error("[liblouis] Failed to enable table loading:", e);
      }
    }

    return {
      translateString: async (tables, text) =>
        instance.translateString(tables, text),
      version: async () => instance.version()
    };
  })();

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
