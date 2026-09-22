import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { buildShareMessage, ownerTexts } from "../config/texts";
import { fetchOwnerTest, trackEvent } from "../lib/api";
import type { OwnerTestResponse } from "../lib/api";
import { shareOrCopy } from "../lib/share";

type LoadState = "loading" | "ready" | "not_found";

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

  if (state === "loading") {
    return (
      <main className="screen screen-center">
        <p className="body-text">Laedt...</p>
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
    </main>
  );
}
