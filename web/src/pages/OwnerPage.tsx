import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildShareMessage, ownerTexts } from "../config/texts";
import { deleteOwnedTest, fetchOwnerTest, trackEvent } from "../lib/api";
import type { OwnerTestResponse } from "../lib/api";
import { shareOrCopy } from "../lib/share";
import { removeOwnedTest } from "../lib/storage";

type LoadState = "loading" | "ready" | "confirming_delete" | "deleting" | "deleted" | "not_found";

export default function OwnerPage() {
  const { ownerToken } = useParams<{ ownerToken: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [test, setTest] = useState<OwnerTestResponse | null>(null);

  useEffect(() => {
    if (!ownerToken) return;
    fetchOwnerTest(ownerToken)
      .then((data) => {
        setTest(data);
        setState("ready");
      })
      .catch(() => setState("not_found"));
  }, [ownerToken]);

  async function handleDelete() {
    if (!ownerToken) return;
    setState("deleting");
    try {
      await deleteOwnedTest(ownerToken);
      removeOwnedTest(ownerToken);
      setState("deleted");
    } catch {
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <main className="screen screen-center">
        <p className="body-text">Lädt...</p>
      </main>
    );
  }

  if (state === "deleted") {
    return (
      <main className="screen screen-center">
        <p className="body-text">Test wurde gelöscht.</p>
        <Link to="/" className="btn btn-secondary">
          Zur Startseite
        </Link>
      </main>
    );
  }

  if (state === "not_found" || !test) {
    return (
      <main className="screen screen-center">
        <p className="body-text">Diesen Test gibt es nicht (mehr).</p>
      </main>
    );
  }

  const publicUrl = `${window.location.origin}/t/${test.publicToken}`;

  async function handleShare() {
    await shareOrCopy(buildShareMessage(), publicUrl);
    trackEvent("share_clicked", test!.publicToken);
  }

  const participantsLabel =
    test.participantCount === 0
      ? ownerTexts.participantsZero
      : test.participantCount === 1
        ? ownerTexts.participantsOne
        : ownerTexts.participantsMany(test.participantCount);

  return (
    <main className="screen screen-center">
      <h1>{ownerTexts.headline}</h1>
      <p className="body-text">{participantsLabel}</p>
      <button type="button" className="btn btn-primary btn-lg" onClick={handleShare}>
        {ownerTexts.shareCta}
      </button>

      <div className="danger-zone">
        {state === "confirming_delete" ? (
          <>
            <p className="footnote danger-text">
              Test und alle dazugehörigen Antworten wirklich löschen?
            </p>
            <div className="danger-actions">
              <button type="button" className="link-button" onClick={() => setState("ready")}>
                Abbrechen
              </button>
              <button type="button" className="link-button danger-text" onClick={() => void handleDelete()}>
                Ja, löschen
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="link-button"
            disabled={state === "deleting"}
            onClick={() => setState("confirming_delete")}
          >
            {state === "deleting" ? "Wird gelöscht..." : "Test löschen"}
          </button>
        )}
      </div>
    </main>
  );
}
