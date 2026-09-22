/**
 * Minimale interne Funnel-Statistik. Bewusst ein CLI-Skript statt einer
 * Web-Route: kein neuer Auth-Mechanismus/Angriffsflaeche noetig, direkter
 * Lesezugriff auf dieselbe SQLite-DB wie der Server (Abschnitt 7 der
 * Phase-3.5-Vorgaben). Aufruf: `npm run stats` im server/-Package.
 */
import { db } from "../db.js";

function countEvents(eventType: string): number {
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM events WHERE event_type = ?")
    .get(eventType) as { c: number };
  return row.c;
}

function safeRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "–";
  return `${((numerator / denominator) * 100).toFixed(1)} %`;
}

function longestChainDepth(): number {
  const rows = db.prepare("SELECT id, parent_test_id FROM tests").all() as {
    id: number;
    parent_test_id: number | null;
  }[];
  const parentById = new Map(rows.map((r) => [r.id, r.parent_test_id]));
  const depthCache = new Map<number, number>();

  function depth(id: number, seen: Set<number>): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (seen.has(id)) return 1; // defensive: sollte bei parent_test_id nie zyklisch sein
    seen.add(id);
    const parent = parentById.get(id) ?? null;
    const d = parent === null ? 1 : 1 + depth(parent, seen);
    depthCache.set(id, d);
    return d;
  }

  let max = 0;
  for (const row of rows) {
    max = Math.max(max, depth(row.id, new Set()));
  }
  return max;
}

const testsCreated = (db.prepare("SELECT COUNT(*) AS c FROM tests").get() as { c: number }).c;
const childTestsCreated = (
  db.prepare("SELECT COUNT(*) AS c FROM tests WHERE parent_test_id IS NOT NULL").get() as {
    c: number;
  }
).c;
const organicTests = testsCreated - childTestsCreated;
const attemptsCompleted = (db.prepare("SELECT COUNT(*) AS c FROM attempts").get() as { c: number })
  .c;

const testOpened = countEvents("test_opened");
const testsStarted = countEvents("test_started");
const resultsViewed = countEvents("result_viewed");
const viralCtaClicked = countEvents("viral_cta_clicked");
const resultsShared = countEvents("result_shared");
const creatorShareClicked = countEvents("share_clicked");
const creatorLinkCopied = countEvents("copy_link_clicked");

console.log("\nREAL ONES – Funnel-Uebersicht\n");

console.table({
  "Tests erstellt": testsCreated,
  "  davon organisch (kein Parent)": organicTests,
  "  davon aus Viral-Loop (Parent gesetzt)": childTestsCreated,
  "Test-Link geoeffnet (test_opened)": testOpened,
  "Tests gestartet (test_started)": testsStarted,
  "Attempts abgeschlossen (attempt_completed)": attemptsCompleted,
  "Ergebnisse angesehen (result_viewed)": resultsViewed,
  "Viral-CTA geklickt (viral_cta_clicked)": viralCtaClicked,
  "Child-Tests erstellt (child_test_created)": childTestsCreated,
  "Ergebnisse geteilt (result_shared)": resultsShared,
  "Creator-Test geteilt (share_clicked)": creatorShareClicked,
  "Creator-Link kopiert (copy_link_clicked)": creatorLinkCopied,
  "Laengste virale Kette (Tests tief)": longestChainDepth(),
});

console.log("\nConversion-Raten\n");

console.table({
  "Start Rate (test_started / test_opened)": safeRate(testsStarted, testOpened),
  "Completion Rate (attempt_completed / test_started)": safeRate(attemptsCompleted, testsStarted),
  "Viral CTA Rate (viral_cta_clicked / result_viewed)": safeRate(viralCtaClicked, resultsViewed),
  "Creator Conversion (child_test_created / attempt_completed)": safeRate(
    childTestsCreated,
    attemptsCompleted
  ),
  "Result Share Rate (result_shared / result_viewed)": safeRate(resultsShared, resultsViewed),
});

console.log("");
