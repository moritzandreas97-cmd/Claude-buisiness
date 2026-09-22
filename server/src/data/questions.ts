export interface SeedQuestion {
  text: string;
  options: [string, string, string, string];
}

// Seed-Fragenpool fuer REAL ONES. Bewusst klein gehalten (Abschnitt 3/7 der
// Produktspezifikation): kein CMS, keine nutzergenerierten Fragen im MVP.
export const SEED_QUESTIONS: SeedQuestion[] = [
  {
    text: "Was wäre mein perfekter Abend?",
    options: ["Party", "Gaming", "Mit Freunden raus", "Zuhause entspannen"],
  },
  {
    text: "Was ist mir wichtiger?",
    options: ["Erfolg", "Freiheit", "Liebe", "Sicherheit"],
  },
  {
    text: "Was brauche ich meistens, wenn es mir schlecht geht?",
    options: ["Ruhe", "Jemanden zum Reden", "Ablenkung", "Bewegung"],
  },
  {
    text: "Was würde ich eher wählen?",
    options: ["Meer", "Berge", "Großstadt", "Land"],
  },
  {
    text: "Was beschreibt mich besser?",
    options: ["Planer", "Spontan", "Mischung aus beidem", "Komplettes Chaos"],
  },
  {
    text: "Meine Henkersmahlzeit wäre...",
    options: ["Pizza", "Sushi", "Burger", "Pasta"],
  },
  {
    text: "Auf welche Musik höre ich am meisten?",
    options: ["Hip-Hop", "Pop", "Electro", "Rock"],
  },
  {
    text: "Mein Traumziel ist eher...",
    options: ["Strand & Sonne", "Städtetrip", "Abenteuer in der Natur", "Roadtrip"],
  },
  {
    text: "Wie bin ich in neuen Situationen?",
    options: ["Offen & neugierig", "Eher zurückhaltend", "Beobachtend", "Kommt drauf an"],
  },
  {
    text: "Wie sieht mein Morgen typischerweise aus?",
    options: ["Sofort wach", "Mehrfach Snooze", "Kaffee zuerst", "Reines Chaos"],
  },
  {
    text: "Was mache ich am liebsten am Wochenende?",
    options: ["Rausgehen", "Serie schauen", "Sport", "Freunde treffen"],
  },
  {
    text: "Worauf achte ich beim Dating zuerst?",
    options: ["Humor", "Aussehen", "Werte", "Ausstrahlung"],
  },
  {
    text: "Was mache ich, wenn ich mich blamiert habe?",
    options: ["Drüber lachen", "Am liebsten wegrennen", "Einfach ignorieren", "Direkt ansprechen"],
  },
  {
    text: "Was ist eher meine größte Schwäche?",
    options: ["Ungeduld", "Zu ehrlich", "Chaotisch", "Zu nett"],
  },
  {
    text: "Wie reagiere ich unter Stress?",
    options: ["Bleibe ruhig", "Werde hektisch", "Ziehe mich zurück", "Werde albern"],
  },
  {
    text: "Was wäre mein Spitzname in einem Film?",
    options: ["Der Chaot", "Der Ruhige", "Der Anführer", "Der Spaßvogel"],
  },
  {
    text: "Was mache ich als Erstes am Handy?",
    options: ["WhatsApp", "Instagram", "TikTok", "Nachrichten checken"],
  },
  {
    text: "Wie plane ich Urlaub am liebsten?",
    options: ["Minutiös durchgeplant", "Grob geplant", "Komplett spontan", "Andere planen für mich"],
  },
  {
    text: "Was ist meine Superkraft im Freundeskreis?",
    options: ["Zuhören", "Motivieren", "Planen", "Für Chaos sorgen"],
  },
  {
    text: "Frühaufsteher oder Nachteule?",
    options: ["Absoluter Frühaufsteher", "Eher früh", "Eher spät", "Absolute Nachteule"],
  },
];
