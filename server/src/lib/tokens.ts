import { customAlphabet, nanoid } from "nanoid";

// Alphabet ohne leicht verwechselbare Zeichen (0/O, 1/l/I) fuer Links,
// die Menschen ggf. abtippen oder in Chats vorlesen.
const PUBLIC_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const generatePublicId = customAlphabet(PUBLIC_ALPHABET, 9);

/** Kurzer, nicht erratbarer Token fuer den Teilnehmer-Link (/t/:token). */
export function generatePublicToken(): string {
  return generatePublicId();
}

/** Langer, kryptografisch sicherer Token fuer den privaten Owner-Link (/my/:token). */
export function generateOwnerToken(): string {
  return nanoid(32);
}
