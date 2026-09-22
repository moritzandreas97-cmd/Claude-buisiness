import type { Express, Request } from "express";
import express from "express";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { escapeHtml } from "./lib/escapeHtml.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/dist/staticServer.js -> ../../web/dist (Projekt-Root/web/dist)
const WEB_DIST_DIR = join(__dirname, "..", "..", "web", "dist");
const INDEX_HTML_PATH = join(WEB_DIST_DIR, "index.html");

const DEFAULT_TITLE_TAG = "<title>REAL ONES</title>";
const DEFAULT_DESCRIPTION = "Wer kennt dich wirklich? Finde heraus, wer wirklich zu dir gehört.";

function getPublicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

export function webBuildExists(): boolean {
  return existsSync(INDEX_HTML_PATH);
}

/**
 * Statisches Ausliefern des Vite-Builds + SPA-Fallback, NUR fuer Production
 * (siehe index.ts: wird nur gemountet, wenn web/dist existiert). Im Dev-Setup
 * bleibt alles unveraendert: Vite-Dev-Server auf :5173 proxied /api zu
 * Express auf :3000.
 *
 * Fuer /t/:publicToken wird die index.html serverseitig mit dynamischen
 * Open-Graph-/Twitter-Meta-Tags ausgeliefert - WhatsApp/Discord/Twitter-
 * Crawler fuehren kein JavaScript aus, clientseitig gesetzte Tags waeren
 * fuer sie unsichtbar. Das ist bewusst simple String-Injection in die
 * gebaute index.html statt eines SSR-Frameworks (kein Framework-Wechsel
 * fuer dieses eine Bedueurfnis).
 */
export function mountStaticApp(app: Express): void {
  const indexTemplate = readFileSync(INDEX_HTML_PATH, "utf-8");

  app.get("/t/:publicToken", (req, res) => {
    const test = db
      .prepare("SELECT creator_name FROM tests WHERE public_token = ?")
      .get(req.params.publicToken) as { creator_name: string } | undefined;

    if (!test) {
      res.status(404).type("html").send(indexTemplate);
      return;
    }

    const title = escapeHtml(`${test.creator_name} fordert dich heraus 🔥`);
    const description = escapeHtml(
      `Gehörst du wirklich zu den Menschen, die ${test.creator_name} am besten kennen?`
    );
    const canonicalUrl = escapeHtml(`${getPublicBaseUrl(req)}/t/${req.params.publicToken}`);

    // og:site_name bleibt bewusst "REAL ONES" (Markenname, nicht Seitentitel) -
    // deshalb gezielt nur og:title/twitter:title ersetzen, kein blindes
    // replaceAll auf content="REAL ONES".
    const html = indexTemplate
      .replace(DEFAULT_TITLE_TAG, `<title>${title}</title>`)
      .replaceAll(`content="${DEFAULT_DESCRIPTION}"`, `content="${description}"`)
      .replace('property="og:title" content="REAL ONES"', `property="og:title" content="${title}"`)
      .replace('name="twitter:title" content="REAL ONES"', `name="twitter:title" content="${title}"`)
      .replace("</head>", `<meta property="og:url" content="${canonicalUrl}" />\n  </head>`);

    res.type("html").send(html);
  });

  app.use(express.static(WEB_DIST_DIR, { index: false }));

  // SPA-Fallback: jede andere (nicht-API-)GET-Route liefert index.html aus,
  // damit React Router uebernehmen kann - u.a. noetig, damit ein Reload auf
  // /my/:ownerToken oder /create nicht 404 wirft.
  app.get("*", (_req, res) => {
    res.type("html").send(indexTemplate);
  });
}
