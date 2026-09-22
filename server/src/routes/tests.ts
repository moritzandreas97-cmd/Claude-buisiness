import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "../db.js";
import { sanitizeName } from "../lib/sanitize.js";
import { generateOwnerToken, generatePublicToken } from "../lib/tokens.js";

const router = Router();

const QUESTIONS_PER_TEST = 5;
const VALID_OPTIONS = new Set(["a", "b", "c", "d"]);
const MAX_TOKEN_ATTEMPTS = 5;

const createTestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

interface AnswerInput {
  questionId: number;
  correctOption: string;
}

interface CreateTestBody {
  creatorName?: unknown;
  answers?: unknown;
  // Optionaler Referrer: public_token des Tests, ueber dessen Ergebnis-Screen
  // dieser neue Test erstellt wurde. Wird in Phase 2 noch von keinem UI-Flow
  // gesetzt, die API ist aber bereits bereit (Abschnitt 8/19 der Spezifikation).
  parentPublicToken?: unknown;
}

function parseAnswers(input: unknown): AnswerInput[] | null {
  if (!Array.isArray(input) || input.length !== QUESTIONS_PER_TEST) return null;

  const seen = new Set<number>();
  const parsed: AnswerInput[] = [];
  for (const entry of input) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { questionId?: unknown }).questionId !== "number" ||
      typeof (entry as { correctOption?: unknown }).correctOption !== "string"
    ) {
      return null;
    }
    const questionId = (entry as { questionId: number }).questionId;
    const correctOption = (entry as { correctOption: string }).correctOption.toLowerCase();
    if (!VALID_OPTIONS.has(correctOption)) return null;
    if (seen.has(questionId)) return null;
    seen.add(questionId);
    parsed.push({ questionId, correctOption });
  }
  return parsed;
}

router.post("/", createTestLimiter, (req, res) => {
  const body = req.body as CreateTestBody;

  const creatorName = sanitizeName(body.creatorName);
  if (!creatorName) {
    return res.status(400).json({ error: "invalid_creator_name" });
  }

  const answers = parseAnswers(body.answers);
  if (!answers) {
    return res.status(400).json({ error: "invalid_answers" });
  }

  const questionIds = answers.map((a) => a.questionId);
  const placeholders = questionIds.map(() => "?").join(",");
  const existingIds = new Set(
    (
      db
        .prepare(`SELECT id FROM questions WHERE id IN (${placeholders})`)
        .all(...questionIds) as { id: number }[]
    ).map((row) => row.id)
  );
  if (existingIds.size !== questionIds.length) {
    return res.status(400).json({ error: "unknown_question" });
  }

  let parentTestId: number | null = null;
  if (typeof body.parentPublicToken === "string" && body.parentPublicToken.length > 0) {
    const parent = db
      .prepare("SELECT id FROM tests WHERE public_token = ?")
      .get(body.parentPublicToken) as { id: number } | undefined;
    parentTestId = parent?.id ?? null;
  }

  const insertTest = db.prepare(
    "INSERT INTO tests (public_token, owner_token, creator_name, parent_test_id) VALUES (?, ?, ?, ?)"
  );
  const insertTestQuestion = db.prepare(
    "INSERT INTO test_questions (test_id, question_id, correct_option, position) VALUES (?, ?, ?, ?)"
  );
  const insertEvent = db.prepare(
    "INSERT INTO events (test_id, event_type, referrer_test_id) VALUES (?, ?, ?)"
  );

  const createTest = db.transaction(
    (publicToken: string, ownerToken: string): number => {
      const result = insertTest.run(publicToken, ownerToken, creatorName, parentTestId);
      const testId = result.lastInsertRowid as number;
      answers.forEach((answer, index) => {
        insertTestQuestion.run(testId, answer.questionId, answer.correctOption, index + 1);
      });
      insertEvent.run(testId, "test_created", parentTestId);
      return testId;
    }
  );

  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const publicToken = generatePublicToken();
    const ownerToken = generateOwnerToken();
    try {
      createTest(publicToken, ownerToken);
      return res.status(201).json({ publicToken, ownerToken });
    } catch (err) {
      const isUniqueViolation =
        err instanceof Error && err.message.includes("UNIQUE constraint failed");
      if (!isUniqueViolation || attempt === MAX_TOKEN_ATTEMPTS - 1) {
        console.error("Failed to create test", err);
        return res.status(500).json({ error: "test_creation_failed" });
      }
      // Token-Kollision (praktisch nie): naechster Versuch mit neuen Tokens.
    }
  }

  return res.status(500).json({ error: "test_creation_failed" });
});

router.get("/owner/:ownerToken", (req, res) => {
  const test = db
    .prepare("SELECT id, public_token, creator_name, created_at FROM tests WHERE owner_token = ?")
    .get(req.params.ownerToken) as
    | { id: number; public_token: string; creator_name: string; created_at: string }
    | undefined;

  if (!test) {
    return res.status(404).json({ error: "not_found" });
  }

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM attempts WHERE test_id = ?")
    .get(test.id) as { count: number };

  db.prepare("INSERT INTO events (test_id, event_type) VALUES (?, ?)").run(
    test.id,
    "owner_page_opened"
  );

  res.json({
    publicToken: test.public_token,
    creatorName: test.creator_name,
    createdAt: test.created_at,
    participantCount: count,
  });
});

export default router;
