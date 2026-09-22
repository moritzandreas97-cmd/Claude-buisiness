import { Router } from "express";
import { db } from "../db.js";

const router = Router();

const QUESTIONS_PER_TEST = 5;

interface QuestionRow {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

// Zufaellige Auswahl von 5 Fragen fuer einen neuen Test. Kein nutzerdefinierter
// count-Parameter: die Testlaenge ist ein Produktparameter, keine API-Option.
router.get("/random", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, text, option_a, option_b, option_c, option_d FROM questions ORDER BY RANDOM() LIMIT ?"
    )
    .all(QUESTIONS_PER_TEST) as QuestionRow[];

  res.json({
    questions: rows.map((row) => ({
      id: row.id,
      text: row.text,
      options: { a: row.option_a, b: row.option_b, c: row.option_c, d: row.option_d },
    })),
  });
});

export default router;
