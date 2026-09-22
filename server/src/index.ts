import cors from "cors";
import express from "express";
import helmet from "helmet";
import { db } from "./db.js";
import eventsRouter from "./routes/events.js";
import questionsRouter from "./routes/questions.js";
import testsRouter from "./routes/tests.js";
import { seedQuestions } from "./seed.js";

seedQuestions();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  const row = db.prepare("SELECT 1 AS ok").get();
  res.json({ status: "ok", db: row });
});

app.use("/api/questions", questionsRouter);
app.use("/api/tests", testsRouter);
app.use("/api/events", eventsRouter);

app.listen(PORT, () => {
  console.log(`REAL ONES server listening on http://localhost:${PORT}`);
});
