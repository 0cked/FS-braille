declare module "virtual:brand-logo" {
  const brandLogoSrc: string;
  export default brandLogoSrc;
}

declare module "virtual:liblouis-assets" {
  export const LIBLOUIS_INLINE_ASSETS: {
    scripts: Record<string, string>;
    tables: Record<string, string>;
  };
}
