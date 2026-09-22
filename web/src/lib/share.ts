import { shareDialogTitle } from "../config/texts";

/**
 * `message` darf den Link NICHT enthalten - er wird hier je nach Pfad genau
 * einmal angehaengt (Web Share API bekommt ihn als eigenes `url`-Feld,
 * das Clipboard-Fallback haengt ihn textuell an).
 */
export async function shareOrCopy(
  message: string,
  url: string
): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ title: shareDialogTitle, text: message, url });
      return "shared";
    } catch {
      // Nutzer hat den Share-Dialog abgebrochen - kein Fehlerzustand.
      return "failed";
    }
  }
  return copyToClipboard(`${message}\n${url}`);
}

export async function copyToClipboard(text: string): Promise<"copied" | "failed"> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
