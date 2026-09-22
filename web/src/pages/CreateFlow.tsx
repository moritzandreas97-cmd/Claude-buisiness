import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProgressDots from "../components/ProgressDots";
import { buildShareMessage, nameStepTexts, successTexts } from "../config/texts";
import { createTest, fetchRandomQuestions, trackEvent } from "../lib/api";
import type { ApiQuestion, CreateTestAnswer } from "../lib/api";
import { copyToClipboard, shareOrCopy } from "../lib/share";
import { saveOwnedTest } from "../lib/storage";

type Phase = "name" | "questions" | "submitting" | "success" | "error";

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

export default function CreateFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentPublicToken = searchParams.get("ref") ?? undefined;

  const [phase, setPhase] = useState<Phase>("name");
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<ApiQuestion[] | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const answersRef = useRef<CreateTestAnswer[]>([]);
  const [result, setResult] = useState<{ publicToken: string; ownerToken: string } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fragen im Hintergrund laden, waehrend der Nutzer noch seinen Namen eintippt.
  useEffect(() => {
    fetchRandomQuestions()
      .then((data) => setQuestions(data.questions))
      .catch(() => setQuestions(null));
  }, []);

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 40) return;
    setName(trimmed);
    setPhase("questions");
  }

  async function submitTest() {
    setPhase("submitting");
    try {
      const res = await createTest(name, answersRef.current, parentPublicToken);
      saveOwnedTest({
        ownerToken: res.ownerToken,
        publicToken: res.publicToken,
        creatorName: name,
        createdAt: new Date().toISOString(),
      });
      setResult(res);
      setPhase("success");
    } catch {
      setErrorMessage("Da ist etwas schiefgelaufen. Versuch es nochmal.");
      setPhase("error");
    }
  }

  function handleAnswer(optionKey: (typeof OPTION_KEYS)[number]) {
    if (!questions) return;
    const question = questions[questionIndex];
    answersRef.current = [...answersRef.current, { questionId: question.id, correctOption: optionKey }];

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }

    void submitTest();
  }

  if (phase === "name") {
    return (
      <main className="screen screen-center">
        <form onSubmit={handleNameSubmit} className="name-form">
          <h1>{nameStepTexts.headline}</h1>
          <input
            className="text-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={nameStepTexts.placeholder}
            maxLength={40}
            autoFocus
            required
          />
          <button type="submit" className="btn btn-primary btn-lg">
            {nameStepTexts.cta}
          </button>
        </form>
      </main>
    );
  }

  if (phase === "questions" || phase === "submitting") {
    if (!questions) {
      return (
        <main className="screen screen-center">
          <p className="body-text">Fragen werden geladen...</p>
        </main>
      );
    }
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
        {phase === "submitting" && <p className="footnote">Test wird erstellt...</p>}
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="screen screen-center">
        <p className="body-text">{errorMessage}</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => void submitTest()}>
          Nochmal versuchen
        </button>
      </main>
    );
  }

  if (phase === "success" && result) {
    const publicUrl = `${window.location.origin}/t/${result.publicToken}`;
    const shareMessage = buildShareMessage();

    async function handleShare() {
      const outcome = await shareOrCopy(shareMessage, publicUrl);
      trackEvent("share_clicked", result!.publicToken);
      if (outcome === "copied") setCopyState("copied");
    }

    async function handleCopy() {
      const outcome = await copyToClipboard(`${shareMessage}\n${publicUrl}`);
      trackEvent("copy_link_clicked", result!.publicToken);
      if (outcome === "copied") setCopyState("copied");
    }

    return (
      <main className="screen screen-center">
        <h1>{successTexts.headline}</h1>
        <p className="body-text">{successTexts.subheadline}</p>

        <button type="button" className="btn btn-primary btn-lg" onClick={handleShare}>
          {successTexts.shareCta}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCopy}>
          {copyState === "copied" ? successTexts.copiedLabel : successTexts.copyCta}
        </button>

        <p className="footnote">{successTexts.hint}</p>

        <button
          type="button"
          className="link-button"
          onClick={() => navigate(`/my/${result.ownerToken}`)}
        >
          {successTexts.ownerLinkCta}
        </button>
      </main>
    );
  }

  return null;
}
