export type LouisEngine = {
  translateString: (tables: string, text: string) => Promise<string | null>;
  version: () => Promise<string>;
};

type SyncApi = {
  translateString: (tables: string, text: string) => string;
  version: () => string;
};

let cachedEngine: Promise<LouisEngine> | null = null;

export const loadLiblouis = async (): Promise<LouisEngine> => {
  if (cachedEngine) {
    return cachedEngine;
  }

  cachedEngine = (async () => {
    const mod: any = await import("liblouis");
    const instance: SyncApi = mod?.default ?? mod;
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
