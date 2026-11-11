/** Eindeutige, zeitlich sortierbare IDs (ULID-ähnlich, 26 Zeichen Crockford-Base32). */
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let lastTime = 0;
let lastRand: number[] = [];

export function newId(): string {
  let now = Date.now();
  let rand: number[];
  if (now === lastTime) {
    rand = lastRand.slice();
    for (let i = rand.length - 1; i >= 0; i--) {
      if (rand[i] < 31) { rand[i]++; break; }
      rand[i] = 0;
    }
  } else {
    rand = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b & 31);
  }
  lastTime = now; lastRand = rand;
  let t = '';
  for (let i = 0; i < 10; i++) { t = ALPHA[now % 32] + t; now = Math.floor(now / 32); }
  return t + rand.map((r) => ALPHA[r]).join('');
}

export const nowIso = () => new Date().toISOString();
