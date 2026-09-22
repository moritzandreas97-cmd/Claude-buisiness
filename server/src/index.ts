import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { db } from "./db.js";
import eventsRouter from "./routes/events.js";
import questionsRouter from "./routes/questions.js";
import testsRouter from "./routes/tests.js";
import { seedQuestions } from "./seed.js";
import { mountStaticApp, webBuildExists } from "./staticServer.js";

seedQuestions();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Hinter einem Reverse Proxy/Load Balancer (typisches Deployment) liefert
// req.protocol/req.ip sonst falsche Werte (u.a. relevant fuer die
// og:url-Generierung und Rate-Limiting nach echter Client-IP).
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  })
);
app.use(express.json({ limit: "10kb" }));

// Grobmaschiger Schutz fuer alle /api-Routen zusaetzlich zu den engeren
// Limits auf den einzelnen schreibenden Endpunkten (tests.ts, events.ts).
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => {
  const row = db.prepare("SELECT 1 AS ok").get();
  res.json({ status: "ok", db: row });
});

app.use("/api/questions", questionsRouter);
app.use("/api/tests", testsRouter);
app.use("/api/events", eventsRouter);

if (webBuildExists()) {
  mountStaticApp(app);
} else {
  console.log("web/dist nicht gefunden - Static/SPA-Serving deaktiviert (Dev-Modus erwartet).");
}

// Letzte Instanz: nie den Stacktrace oder Fehlerdetails an den Client
// durchreichen, nur serverseitig loggen. Kaputtes/zu grosses Request-Body
// (body-parser wirft hier) ist ein Client-Fehler, kein Serverfehler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isClientBodyError =
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err.type === "entity.parse.failed" || err.type === "entity.too.large");

  if (isClientBodyError) {
    res.status(400).json({ error: "invalid_request_body" });
    return;
  }

  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "internal_error" });
  }
});

app.listen(PORT, () => {
  console.log(`REAL ONES server listening on http://localhost:${PORT}`);
});
