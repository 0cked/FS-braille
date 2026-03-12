const fs = require("fs");
const path = require("path");
const https = require("https");
const { build } = require("esbuild");

const projectRoot = path.join(__dirname, "..");
const outRoot = path.join(projectRoot, "out");
const distRoot = path.join(projectRoot, "dist");
const standalonePath = path.join(distRoot, "fs-braille-standalone.html");

const INLINE_TABLE_FILES = [
  "en-us-g2.ctb",
  "en-us-g1.ctb",
  "chardefs.cti",
  "braille-patterns.cti",
  "litdigits6Dots.uti",
  "loweredDigits6Dots.uti",
  "latinLetterDef6Dots.uti"
];

const SKYLINE_URL =
  "https://storage.googleapis.com/resourcesite-publicassets-prod/townskyline.svg";

const mimeTypeForPath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".css":
      return "text/css";
    case ".js":
      return "text/javascript";
    case ".svg":
      return "image/svg+xml";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
};

const fetchBuffer = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          resolve(fetchBuffer(response.headers.location));
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url} (${response.statusCode})`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });

const toDataUri = (buffer, filePath) =>
  `data:${mimeTypeForPath(filePath)};base64,${buffer.toString("base64")}`;

const inlineCssAssets = async (cssText, cssFilePath) => {
  const matches = Array.from(cssText.matchAll(/url\(([^)]+)\)/g));
  let inlinedCss = cssText;

  for (const match of matches) {
    const original = match[0];
    const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, "");

    if (!rawUrl || rawUrl.startsWith("data:")) {
      continue;
    }

    let buffer;
    let assetPath;

    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      assetPath = rawUrl;
      buffer = await fetchBuffer(rawUrl);
    } else if (rawUrl.startsWith("/")) {
      assetPath = path.join(outRoot, rawUrl.replace(/^\/+/, ""));
      buffer = fs.readFileSync(assetPath);
    } else {
      assetPath = path.resolve(path.dirname(cssFilePath), rawUrl);
      buffer = fs.readFileSync(assetPath);
    }

    const inlinedUrl = toDataUri(buffer, assetPath);
    inlinedCss = inlinedCss.replace(original, `url("${inlinedUrl}")`);
  }

  return inlinedCss.replace(SKYLINE_URL, toDataUri(await fetchBuffer(SKYLINE_URL), "townskyline.svg"));
};

const getIndexHtml = () => {
  const indexPath = path.join(outRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("Missing out/index.html. Run the normal build first.");
  }
  return fs.readFileSync(indexPath, "utf8");
};

const buildInlineCss = async (indexHtml) => {
  const stylesheetMatches = Array.from(
    indexHtml.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)
  );

  if (!stylesheetMatches.length) {
    throw new Error("Unable to find exported stylesheet references.");
  }

  const cssParts = [];
  for (const [, href] of stylesheetMatches) {
    const cssFilePath = path.join(outRoot, href.replace(/^\/+/, ""));
    const cssText = fs.readFileSync(cssFilePath, "utf8");
    cssParts.push(await inlineCssAssets(cssText, cssFilePath));
  }

  return cssParts.join("\n");
};

const buildLiblouisAssetModule = () => {
  const scripts = {
    "liblouis/build-no-tables-utf16.js": fs
      .readFileSync(path.join(projectRoot, "public", "liblouis", "build-no-tables-utf16.js"))
      .toString("base64"),
    "liblouis/easy-api.js": fs
      .readFileSync(path.join(projectRoot, "public", "liblouis", "easy-api.js"))
      .toString("base64")
  };

  const tables = Object.fromEntries(
    INLINE_TABLE_FILES.map((name) => [
      name,
      fs
        .readFileSync(path.join(projectRoot, "public", "liblouis", name))
        .toString("base64")
    ])
  );

  return { scripts, tables };
};

const getHtmlClassName = (indexHtml) => {
  const match = indexHtml.match(/<html[^>]*class="([^"]*)"/);
  return match?.[1] ?? "";
};

const getLang = (indexHtml) => {
  const match = indexHtml.match(/<html[^>]*lang="([^"]*)"/);
  return match?.[1] ?? "en";
};

const buildStandaloneBundle = async (brandLogoSrc, liblouisAssets) => {
  const result = await build({
    absWorkingDir: projectRoot,
    bundle: true,
    entryPoints: [path.join(projectRoot, "standalone", "entry.tsx")],
    format: "iife",
    jsx: "automatic",
    loader: {
      ".ts": "ts",
      ".tsx": "tsx"
    },
    minify: true,
    platform: "browser",
    target: ["es2020"],
    define: {
      "process.env.NODE_ENV": '"production"'
    },
    write: false,
    plugins: [
      {
        name: "standalone-virtual-modules",
        setup(buildApi) {
          buildApi.onResolve({ filter: /^virtual:brand-logo$/ }, () => ({
            path: "virtual:brand-logo",
            namespace: "standalone"
          }));

          buildApi.onResolve({ filter: /^virtual:liblouis-assets$/ }, () => ({
            path: "virtual:liblouis-assets",
            namespace: "standalone"
          }));

          buildApi.onResolve(
            {
              filter: /^\.\.\/lib\/translation$/
            },
            () => ({
              path: path.join(projectRoot, "standalone", "translation.ts")
            })
          );

          buildApi.onResolve(
            {
              filter: /^\.\.\/lib\/louis$/
            },
            () => ({
              path: path.join(projectRoot, "standalone", "louis.ts")
            })
          );

          buildApi.onLoad(
            { filter: /^virtual:brand-logo$/, namespace: "standalone" },
            () => ({
              contents: `export default ${JSON.stringify(brandLogoSrc)};`,
              loader: "ts"
            })
          );

          buildApi.onLoad(
            { filter: /^virtual:liblouis-assets$/, namespace: "standalone" },
            () => ({
              contents: `export const LIBLOUIS_INLINE_ASSETS = ${JSON.stringify(
                liblouisAssets
              )};`,
              loader: "ts"
            })
          );
        }
      }
    ]
  });

  return result.outputFiles[0].text;
};

const main = async () => {
  const indexHtml = getIndexHtml();
  const css = await buildInlineCss(indexHtml);
  const brandLogoSrc = toDataUri(
    fs.readFileSync(path.join(projectRoot, "public", "fastsigns-logo.svg")),
    "fastsigns-logo.svg"
  );
  const liblouisAssets = buildLiblouisAssetModule();
  const script = await buildStandaloneBundle(brandLogoSrc, liblouisAssets);
  const htmlClassName = getHtmlClassName(indexHtml);
  const lang = getLang(indexHtml);

  fs.mkdirSync(distRoot, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="${lang}" class="${htmlClassName}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FASTSIGNS Braille Translator</title>
    <meta
      name="description"
      content="Deterministic braille translation powered by liblouis."
    />
    <link rel="icon" href="${brandLogoSrc}" />
    <style>${css.replace(/<\/style/gi, "<\\/style")}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${script.replace(/<\/script/gi, "<\\/script")}</script>
  </body>
</html>
`;

  fs.writeFileSync(standalonePath, html);
  console.log(`Wrote standalone HTML: ${standalonePath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
