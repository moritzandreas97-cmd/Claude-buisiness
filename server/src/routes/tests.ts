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
      if (parentTestId !== null) {
        // Auf dem Eltern-Test geloggt, damit sich die Creator-Conversion
        // (Abschnitt 12) direkt pro Test auswerten laesst.
        insertEvent.run(parentTestId, "child_test_created", testId);
      }
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

const deleteTestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Loeschen erfordert den LANGEN owner_token - der kurze public_token (den
// jeder Freund hat) darf dafuer niemals reichen (Abschnitt 8, Phase 3.6).
// test_questions/attempts haengen per ON DELETE CASCADE am Test (db.ts),
// Kind-Tests behalten per ON DELETE SET NULL ihre eigene Existenz und
// verlieren nur die parent_test_id-Referenz. Events des Tests werden hier
// explizit entfernt, da ihre FK bewusst SET NULL statt CASCADE ist (damit
// z.B. das "child_test_created"-Event auf einem NICHT geloeschten Parent
// nicht durch das Loeschen eines fremden Tests verschwindet).
router.delete("/owner/:ownerToken", deleteTestLimiter, (req, res) => {
  const test = db
    .prepare("SELECT id FROM tests WHERE owner_token = ?")
    .get(req.params.ownerToken) as { id: number } | undefined;

  if (!test) {
    return res.status(404).json({ error: "not_found" });
  }

  const deleteTest = db.transaction((testId: number) => {
    db.prepare("DELETE FROM events WHERE test_id = ?").run(testId);
    db.prepare("DELETE FROM tests WHERE id = ?").run(testId);
  });
  deleteTest(test.id);

  res.status(204).end();
});

// --- Empfaenger-/Spiel-Flow (Phase 3) --------------------------------------

interface PlayAnswerInput {
  questionId: number;
  selectedOption: string;
}

function parsePlayAnswers(input: unknown, expectedCount: number): PlayAnswerInput[] | null {
  if (!Array.isArray(input) || input.length !== expectedCount) return null;

  const seen = new Set<number>();
  const parsed: PlayAnswerInput[] = [];
  for (const entry of input) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { questionId?: unknown }).questionId !== "number" ||
      typeof (entry as { selectedOption?: unknown }).selectedOption !== "string"
    ) {
      return null;
    }
    const questionId = (entry as { questionId: number }).questionId;
    const selectedOption = (entry as { selectedOption: string }).selectedOption.toLowerCase();
    if (!VALID_OPTIONS.has(selectedOption)) return null;
    if (seen.has(questionId)) return null;
    seen.add(questionId);
    parsed.push({ questionId, selectedOption });
  }
  return parsed;
}

function findTestByPublicToken(publicToken: string) {
  return db
    .prepare("SELECT id, creator_name FROM tests WHERE public_token = ?")
    .get(publicToken) as { id: number; creator_name: string } | undefined;
}

// Landingpage-Daten fuer den Empfaenger eines geteilten Links. Enthaelt
// bewusst keine Fragen/Antworten - die werden erst nach "FIND'S RAUS"
// geladen (Abschnitt 1).
router.get("/:publicToken", (req, res) => {
  const test = findTestByPublicToken(req.params.publicToken);
  if (!test) {
    return res.status(404).json({ error: "not_found" });
  }

  db.prepare("INSERT INTO events (test_id, event_type) VALUES (?, ?)").run(test.id, "test_opened");

  res.json({ creatorName: test.creator_name });
});

// Die 5 Fragen dieses konkreten Tests, in der vom Ersteller festgelegten
// Reihenfolge, OHNE correct_option - die richtige Antwort darf den Client
// vor der Auswertung nie erreichen (Abschnitt 4).
router.get("/:publicToken/questions", (req, res) => {
  const test = findTestByPublicToken(req.params.publicToken);
  if (!test) {
    return res.status(404).json({ error: "not_found" });
  }

  const rows = db
    .prepare(
      `SELECT q.id, q.text, q.option_a, q.option_b, q.option_c, q.option_d
       FROM test_questions tq
       JOIN questions q ON q.id = tq.question_id
       WHERE tq.test_id = ?
       ORDER BY tq.position ASC`
    )
    .all(test.id) as {
    id: number;
    text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  }[];

  db.prepare("INSERT INTO events (test_id, event_type) VALUES (?, ?)").run(test.id, "test_started");

  res.json({
    questions: rows.map((row) => ({
      id: row.id,
      text: row.text,
      options: { a: row.option_a, b: row.option_b, c: row.option_c, d: row.option_d },
    })),
  });
});

const submitAttemptLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Serverseitige Auswertung: der Client sendet nur seine Antworten, der Score
// wird ausschliesslich hier berechnet (Abschnitt 4). Antworten werden gegen
// die tatsaechliche Fragenmenge DIESES Tests validiert - unbekannte/fremde
// question_ids fuehren zu 400, keine stille Uebernahme.
router.post("/:publicToken/attempts", submitAttemptLimiter, (req, res) => {
  const test = findTestByPublicToken(req.params.publicToken);
  if (!test) {
    return res.status(404).json({ error: "not_found" });
  }

  const body = req.body as { participantName?: unknown; answers?: unknown };

  const participantName = sanitizeName(body.participantName);
  if (!participantName) {
    return res.status(400).json({ error: "invalid_participant_name" });
  }

  const correctRows = db
    .prepare("SELECT question_id, correct_option FROM test_questions WHERE test_id = ?")
    .all(test.id) as { question_id: number; correct_option: string }[];
  const correctByQuestion = new Map(correctRows.map((r) => [r.question_id, r.correct_option]));

  const answers = parsePlayAnswers(body.answers, correctByQuestion.size);
  if (!answers) {
    return res.status(400).json({ error: "invalid_answers" });
  }
  for (const answer of answers) {
    if (!correctByQuestion.has(answer.questionId)) {
      return res.status(400).json({ error: "unknown_question" });
    }
  }

  let score = 0;
  for (const answer of answers) {
    if (correctByQuestion.get(answer.questionId) === answer.selectedOption) score++;
  }

  const insertAttempt = db.prepare(
    "INSERT INTO attempts (test_id, participant_name, score) VALUES (?, ?, ?)"
  );
  const insertEvent = db.prepare("INSERT INTO events (test_id, event_type) VALUES (?, ?)");

  const attemptId = db.transaction((): number => {
    const result = insertAttempt.run(test.id, participantName, score);
    insertEvent.run(test.id, "attempt_completed");
    return result.lastInsertRowid as number;
  })();

  // Ranking: Score absteigend, bei Gleichstand fruehere Teilnahme zuerst
  // (Abschnitt 6). `id ASC` macht die Reihenfolge bei identischem
  // created_at (gleiche Sekunde) deterministisch.
  const ranked = db
    .prepare(
      "SELECT id, participant_name, score FROM attempts WHERE test_id = ? ORDER BY score DESC, created_at ASC, id ASC"
    )
    .all(test.id) as { id: number; participant_name: string; score: number }[];

  const rank = ranked.findIndex((a) => a.id === attemptId) + 1;

  res.status(201).json({
    score,
    percent: score * 20,
    rank,
    totalParticipants: ranked.length,
    top: ranked.slice(0, 3).map((a) => ({
      name: a.participant_name,
      score: a.score,
      percent: a.score * 20,
    })),
    creatorName: test.creator_name,
  });
});

export default router;
