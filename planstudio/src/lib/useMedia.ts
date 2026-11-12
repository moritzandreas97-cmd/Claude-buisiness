import { useEffect, useState } from 'react';

/** Smartphone-Layout unterhalb von 768 CSS-px Breite (Hochformat auf Handys). */
export const MOBILE_QUERY = '(max-width: 767px)';
export function isMobileNow() { return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches; }

export function useIsMobile() {
  const [m, setM] = useState(isMobileNow);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}
