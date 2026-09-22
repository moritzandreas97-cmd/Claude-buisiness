// Zentral konfigurierbare Copy fuer REAL ONES (Abschnitt 5 & 10 der Spezifikation).
// Alles, was ein Nutzer liest, lebt hier statt verstreut in Komponenten.

export const brand = {
  name: "REAL ONES",
};

export const homeTexts = {
  emoji: "👀",
  headline: "Wer kennt dich wirklich?",
  subheadline:
    "Beantworte ein paar Fragen. Schick den Test an deine Freunde. Finde heraus, wer dich wirklich kennt.",
  cta: "Test erstellen",
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
  shareCta: "Test mit Freunden teilen",
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
  shareCta: "Test teilen",
};

// Nachricht OHNE Link: der Link wird separat als `url` an die Web Share API
// uebergeben bzw. beim Kopieren einmalig angehaengt, um Duplizierung zu vermeiden.
export function buildShareMessage(): string {
  return "Wie gut kennst du mich wirklich? 👀\nMach meinen Test und zeig, ob du zu den Real Ones gehörst:";
}

export const shareDialogTitle = brand.name;

export const notFoundTexts = {
  headline: "Nichts zu sehen hier",
  body: "Diese Seite gibt es nicht (mehr).",
  cta: "Zur Startseite",
};
