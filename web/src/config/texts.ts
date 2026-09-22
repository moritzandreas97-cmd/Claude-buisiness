// Zentral konfigurierbare Copy fuer REAL ONES (Abschnitt 5 & 10 der Spezifikation).
// Alles, was ein Nutzer liest, lebt hier statt verstreut in Komponenten.

export const brand = {
  name: "REAL ONES",
};

export const homeTexts = {
  emoji: "👀",
  headline: "Wer sind deine echten Freunde?",
  subheadline:
    "Finde heraus, wer wirklich zu dir gehört. Beantworte ein paar Fragen und schick den Test an deine Freunde.",
  cta: "MEINE REAL ONES FINDEN",
  footnote: "Dauert weniger als 1 Minute. Keine Anmeldung.",
};

export const nameStepTexts = {
  headline: "Wie sollen deine Freunde dich nennen?",
  placeholder: "Dein Name / Spitzname",
  cta: "Weiter",
};

export const successTexts = {
  headline: "Dein Test ist fertig 🔥",
  subheadline: "Jetzt finden wir heraus, wer dich wirklich kennt.",
  shareCta: "FREUNDE HERAUSFORDERN",
  copyCta: "Link kopieren",
  copiedLabel: "Link kopiert ✓",
  hint: "Je mehr Freunde mitmachen, desto interessanter wird dein Ranking.",
  ownerLinkCta: "Zu deinem Test",
};

export const ownerTexts = {
  headline: "Dein REAL ONES Test",
  participantsZero: "0 Freunde haben bisher mitgemacht.",
  participantsOne: "1 Freund hat bisher mitgemacht.",
  participantsMany: (count: number) => `${count} Freunde haben bisher mitgemacht.`,
  shareCta: "FREUNDE HERAUSFORDERN",
};

// Nachricht OHNE Link: der Link wird separat als `url` an die Web Share API
// uebergeben bzw. beim Kopieren einmalig angehaengt, um Duplizierung zu vermeiden.
// Emotionale Positionierung (verbindlich): der Test ist kein generisches
// "Wie gut kennst du mich"-Quiz, sondern die Frage "Gehoerst du wirklich zu
// meinen engsten Menschen?". Zentral hier, damit spaeter ohne Umbau A/B-
// testbar.
export function buildShareMessage(): string {
  return "Ich hab dich zu REAL ONES herausgefordert 🔥\n\nGehörst du wirklich zu meinen engsten Menschen?\n\nDann zeig, wie gut du mich wirklich kennst 👀";
}

export const shareDialogTitle = brand.name;

export const notFoundTexts = {
  headline: "Nichts zu sehen hier",
  body: "Diese Seite gibt es nicht (mehr).",
  cta: "Zur Startseite",
};

// ==================================================================
// EMPFAENGER-/SPIEL-FLOW (Phase 3): /t/:publicToken
//
// Emotionaler Kern von REAL ONES (verbindlich festgelegt): nicht "Wie gut
// kennst du mich?", sondern "Wer gehoert wirklich zu meinen engsten
// Menschen?". Gilt fuer Empfaenger-Screen, Ergebnis-CTA und alle
// spaeteren viralen Screens.
//
// Semantische Grenze, die dabei IMMER gilt: der Test misst nur, wie gut
// jemand den Ersteller kennt (Uebereinstimmung mit dessen Antworten).
// Ergebnis-Copy darf Naehe/Freundschaft thematisieren, aber NIE als
// objektiven Beweis fuer Freundschaftsqualitaet framen und NIE Personen
// gegeneinander bewerten (z.B. "besserer Freund als X" - nicht erlaubt).
// ==================================================================

// Screen fuer den Empfaenger eines geteilten Links, bevor er die 5 Fragen
// startet. `creatorName` kommt aus der Test-Antwort (dynamisch).
export const recipientTexts = {
  challengeLine: (creatorName: string) => `${creatorName} hat dich zu REAL ONES herausgefordert. 🔥`,
  headline: "Gehörst du wirklich zu meinen engsten Menschen?",
  subheadline: "Dann zeig, wie gut du mich wirklich kennst.",
  cta: "FIND'S RAUS",
  footnote: "5 Fragen · dauert weniger als 1 Minute",
};

export const playerNameTexts = {
  headline: "Wie heißt du?",
  placeholder: "Dein Name",
  cta: "LOS GEHT'S",
};

// Score (0-5) -> Ergebnis-Copy. Haelt sich an die semantische Grenze oben:
// misst Wissen ueber die Person, nie objektive Freundschaftsqualitaet.
const RESULT_BY_SCORE: { percentLabel: string; message: (creatorName: string) => string }[] = [
  { percentLabel: "0 %", message: () => "Okay... das war interessant. 😂" },
  { percentLabel: "20 % REAL ONE", message: () => "Ihr solltet wohl mal wieder reden 😄" },
  { percentLabel: "40 % REAL ONE", message: () => "Da sind noch ein paar Geheimnisse offen 👀" },
  { percentLabel: "60 % REAL ONE", message: () => "Nicht schlecht – aber da geht noch was." },
  {
    percentLabel: "80 % REAL ONE 🔥",
    message: (creatorName) => `Okay, du kennst ${creatorName} ziemlich gut.`,
  },
  {
    percentLabel: "100 % REAL ONE 🔥",
    message: (creatorName) => `Du kennst ${creatorName} verdammt gut.`,
  },
];

export const resultTexts = {
  byScore(score: number, creatorName: string): { percentLabel: string; message: string } {
    const entry = RESULT_BY_SCORE[score] ?? RESULT_BY_SCORE[0];
    return { percentLabel: entry.percentLabel, message: entry.message(creatorName) };
  },
  rankLabel: (rank: number, total: number) => `Platz ${rank} von ${total}`,
  shareCta: "ERGEBNIS TEILEN",
};

// Nachricht OHNE Link (gleiches Prinzip wie buildShareMessage): der Link
// zurueck zu Test A wird separat angehaengt.
export function buildResultShareMessage(percentLabel: string, creatorName: string): string {
  return `${percentLabel}\n\nIch dachte, ich kenne ${creatorName} besser 👀\n\nSchaffst du mehr?`;
}

// CTA direkt nach dem eigenen Ergebnis, der den Empfaenger zum Ersteller
// seines eigenen Tests macht (parent_test_id = Test des Herausforderers).
export const postResultViralTexts = {
  headline: "Jetzt bist du dran.",
  subheadline: "Wer gehört wirklich zu deinen engsten Menschen?",
  cta: "MEINE REAL ONES FINDEN",
};
