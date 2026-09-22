const MAX_NAME_LENGTH = 40;

/**
 * Trimmt und strippt Steuerzeichen/spitze Klammern aus Namenseingaben.
 * React escaped Ausgaben ohnehin automatisch; das hier ist zusaetzliche
 * Verteidigung gegen kaputte/boesartige Eingaben, kein voller HTML-Sanitizer.
 */
export function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = input.trim().replace(/[\u0000-\u001f\u007f<>]/g, "");
  if (cleaned.length === 0 || cleaned.length > MAX_NAME_LENGTH) return null;
  return cleaned;
}
