import cors from "cors";
import express from "express";
import { db } from "./db.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const row = db.prepare("SELECT 1 AS ok").get();
  res.json({ status: "ok", db: row });
});

app.listen(PORT, () => {
  console.log(`REAL ONES server listening on http://localhost:${PORT}`);
});
