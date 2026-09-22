import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProgressDots from "../components/ProgressDots";
import {
  buildResultShareMessage,
  playerNameTexts,
  postResultViralTexts,
  recipientTexts,
  resultTexts,
} from "../config/texts";
import { ApiError, fetchPlayQuestions, fetchTestSummary, submitAttempt, trackEvent } from "../lib/api";
import type { ApiQuestion, AttemptResult, PlayAnswer } from "../lib/api";
import { shareOrCopy } from "../lib/share";

type Phase =
  | "loading"
  | "not_found"
  | "landing"
  | "name"
  | "playing"
  | "submitting"
  | "result"
  | "error";

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

export default function PlayFlow() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [creatorName, setCreatorName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const answersRef = useRef<PlayAnswer[]>([]);
  const submittingRef = useRef(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (!publicToken) return;
    fetchTestSummary(publicToken)
      .then((data) => {
        setCreatorName(data.creatorName);
        setPhase("landing");
      })
      .catch((err) => {
        setPhase(err instanceof ApiError && err.status === 404 ? "not_found" : "error");
      });
  }, [publicToken]);

  useEffect(() => {
    if (phase === "result" && publicToken) {
      trackEvent("result_viewed", publicToken);
    }
  }, [phase, publicToken]);

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (!publicToken) return;
    const trimmed = playerName.trim();
    if (trimmed.length === 0 || trimmed.length > 40) return;
    setPlayerName(trimmed);
    try {
      const data = await fetchPlayQuestions(publicToken);
      answersRef.current = [];
      setQuestions(data.questions);
      setQuestionIndex(0);
      setPhase("playing");
    } catch {
      setPhase("error");
    }
  }

  async function handleAnswer(optionKey: (typeof OPTION_KEYS)[number]) {
    if (!questions || !publicToken) return;
    const question = questions[questionIndex];
    answersRef.current = [
      ...answersRef.current,
      { questionId: question.id, selectedOption: optionKey },
    ];

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    try {
      const res = await submitAttempt(publicToken, playerName, answersRef.current);
      setResult(res);
      setPhase("result");
    } catch {
      setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  if (phase === "loading") {
    return (
      <main className="screen screen-center">
        <p className="body-text">Lädt...</p>
      </main>
    );
  }

  if (phase === "not_found") {
    return (
      <main className="screen screen-center">
        <p className="body-text">Diesen Test gibt es nicht (mehr).</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="screen screen-center">
        <p className="body-text">Da ist etwas schiefgelaufen. Lade die Seite neu.</p>
      </main>
    );
  }

  if (phase === "landing") {
    return (
      <main className="screen screen-center">
        <p className="eyebrow">{recipientTexts.challengeLine(creatorName)}</p>
        <h1>{recipientTexts.headline}</h1>
        <p className="body-text">{recipientTexts.subheadline}</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setPhase("name")}>
          {recipientTexts.cta}
        </button>
        <p className="footnote">{recipientTexts.footnote}</p>
      </main>
    );
  }

  if (phase === "name") {
    return (
      <main className="screen screen-center">
        <form onSubmit={handleNameSubmit} className="name-form">
          <h1>{playerNameTexts.headline}</h1>
          <input
            className="text-input"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={playerNameTexts.placeholder}
            maxLength={40}
            autoFocus
            required
          />
          <button type="submit" className="btn btn-primary btn-lg">
            {playerNameTexts.cta}
          </button>
        </form>
      </main>
    );
  }

  if (phase === "playing" || phase === "submitting") {
    if (!questions) return null;
    const question = questions[questionIndex];
    return (
      <main className="screen screen-top">
        <ProgressDots total={questions.length} current={questionIndex} />
        <h2 className="question-text">{question.text}</h2>
        <div className="answer-grid">
          {OPTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="answer-card"
              disabled={phase === "submitting"}
              onClick={() => handleAnswer(key)}
            >
              {question.options[key]}
            </button>
          ))}
        </div>
        {phase === "submitting" && <p className="footnote">Ergebnis wird berechnet...</p>}
      </main>
    );
  }

  if (phase === "result" && result && publicToken) {
    const { percentLabel, message } = resultTexts.byScore(result.score, result.creatorName);
    const testUrl = `${window.location.origin}/t/${publicToken}`;

    async function handleShareResult() {
      const shareMessage = buildResultShareMessage(percentLabel, result!.creatorName);
      const outcome = await shareOrCopy(shareMessage, testUrl);
      trackEvent("result_shared", publicToken!);
      if (outcome === "copied") setCopyState("copied");
    }

    function handleViralCta() {
      trackEvent("viral_cta_clicked", publicToken!);
      navigate(`/create?ref=${encodeURIComponent(publicToken!)}`);
    }

    return (
      <main className="screen screen-center">
        <p className="eyebrow">{percentLabel}</p>
        <h1>{message}</h1>
        <p className="body-text">{resultTexts.rankLabel(result.rank, result.totalParticipants)}</p>

        {result.top.length > 0 && (
          <ol className="top-list">
            {result.top.map((entry, i) => (
              <li key={`${entry.name}-${i}`}>
                <span>{["🥇", "🥈", "🥉"][i]}</span>
                <span className="top-name">{entry.name}</span>
                <span className="top-score">{entry.percent} %</span>
              </li>
            ))}
          </ol>
        )}

        <div className="viral-cta-block">
          <h2>{postResultViralTexts.headline}</h2>
          <p className="body-text">{postResultViralTexts.subheadline}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleViralCta}>
            {postResultViralTexts.cta}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void handleShareResult()}>
            {copyState === "copied" ? "Link kopiert ✓" : resultTexts.shareCta}
          </button>
        </div>
      </main>
    );
  }

  return null;
}
