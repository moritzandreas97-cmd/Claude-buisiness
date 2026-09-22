import { db } from "./db.js";
import { SEED_QUESTIONS } from "./data/questions.js";

export function seedQuestions(): void {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM questions").get() as { c: number };
  if (c > 0) return;

  const insert = db.prepare(
    "INSERT INTO questions (text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?)"
  );
  const insertAll = db.transaction((questions: typeof SEED_QUESTIONS) => {
    for (const q of questions) {
      insert.run(q.text, q.options[0], q.options[1], q.options[2], q.options[3]);
    }
  });
  insertAll(SEED_QUESTIONS);
}
