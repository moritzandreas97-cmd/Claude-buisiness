const STORAGE_KEY = "realones:myTests";

export interface StoredTest {
  ownerToken: string;
  publicToken: string;
  creatorName: string;
  createdAt: string;
}

// Kein Account noetig: der Ersteller findet seinen Test ueber den lokal
// gespeicherten owner_token auf demselben Geraet wieder (Abschnitt 17).
export function saveOwnedTest(test: StoredTest): void {
  try {
    const existing = loadOwnedTests();
    const next = [test, ...existing.filter((t) => t.ownerToken !== test.ownerToken)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage kann in Private Mode o.ae. fehlschlagen - kein Blocker fuer den Flow.
  }
}

export function loadOwnedTests(): StoredTest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredTest[];
  } catch {
    return [];
  }
}

export function removeOwnedTest(ownerToken: string): void {
  try {
    const next = loadOwnedTests().filter((t) => t.ownerToken !== ownerToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // s.o.
  }
}
