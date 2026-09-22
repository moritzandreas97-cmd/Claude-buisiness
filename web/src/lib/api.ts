export interface ApiQuestion {
  id: number;
  text: string;
  options: { a: string; b: string; c: string; d: string };
}

export interface CreateTestAnswer {
  questionId: number;
  correctOption: "a" | "b" | "c" | "d";
}

export interface CreateTestResponse {
  publicToken: string;
  ownerToken: string;
}

export interface OwnerTestResponse {
  publicToken: string;
  creatorName: string;
  createdAt: string;
  participantCount: number;
}

export interface TestSummaryResponse {
  creatorName: string;
}

export interface PlayAnswer {
  questionId: number;
  selectedOption: "a" | "b" | "c" | "d";
}

export interface RankedParticipant {
  name: string;
  score: number;
  percent: number;
}

export interface AttemptResult {
  score: number;
  percent: number;
  rank: number;
  totalParticipants: number;
  top: RankedParticipant[];
  creatorName: string;
}

export type ClientEventType =
  | "share_clicked"
  | "copy_link_clicked"
  | "result_viewed"
  | "result_shared"
  | "viral_cta_clicked";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "unknown_error" }));
    throw new ApiError(res.status, body.error ?? "unknown_error");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchRandomQuestions(): Promise<{ questions: ApiQuestion[] }> {
  return request("/api/questions/random");
}

export function createTest(
  creatorName: string,
  answers: CreateTestAnswer[],
  parentPublicToken?: string
): Promise<CreateTestResponse> {
  return request("/api/tests", {
    method: "POST",
    body: JSON.stringify({ creatorName, answers, parentPublicToken }),
  });
}

export function fetchOwnerTest(ownerToken: string): Promise<OwnerTestResponse> {
  return request(`/api/tests/owner/${encodeURIComponent(ownerToken)}`);
}

export function deleteOwnedTest(ownerToken: string): Promise<void> {
  return request(`/api/tests/owner/${encodeURIComponent(ownerToken)}`, { method: "DELETE" });
}

export function fetchTestSummary(publicToken: string): Promise<TestSummaryResponse> {
  return request(`/api/tests/${encodeURIComponent(publicToken)}`);
}

export function fetchPlayQuestions(publicToken: string): Promise<{ questions: ApiQuestion[] }> {
  return request(`/api/tests/${encodeURIComponent(publicToken)}/questions`);
}

export function submitAttempt(
  publicToken: string,
  participantName: string,
  answers: PlayAnswer[]
): Promise<AttemptResult> {
  return request(`/api/tests/${encodeURIComponent(publicToken)}/attempts`, {
    method: "POST",
    body: JSON.stringify({ participantName, answers }),
  });
}

export function trackEvent(type: ClientEventType, publicToken: string): void {
  // Fire-and-forget: Analytics duerfen den Nutzerfluss nie blockieren oder abbrechen.
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, publicToken }),
  }).catch(() => {
    // bewusst ignoriert
  });
}
