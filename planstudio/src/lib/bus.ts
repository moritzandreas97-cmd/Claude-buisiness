/** Einfacher Ereigniskanal zwischen Werkzeugleiste und Editoren. */
export type BusEvent = 'zoom-in' | 'zoom-out' | 'zoom-fit' | 'zoom-room';
const target = new EventTarget();
export const bus = {
  emit(e: BusEvent, detail?: unknown) { target.dispatchEvent(new CustomEvent(e, { detail })); },
  on(e: BusEvent, fn: (detail: unknown) => void) {
    const h = (ev: Event) => fn((ev as CustomEvent).detail);
    target.addEventListener(e, h);
    return () => target.removeEventListener(e, h);
  },
};
