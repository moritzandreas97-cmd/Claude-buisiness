import { EclipticGeoMoon, MakeTime, SiderealTime, SunPosition, e_tilt } from 'astronomy-engine'

const DEG = Math.PI / 180

const norm360 = (x: number) => ((x % 360) + 360) % 360

/** Ekliptikale Länge der Sonne (wahres Äquinoktium des Datums, tropisch). */
export function sunLongitude(utc: Date): number {
  return norm360(SunPosition(utc).elon)
}

/** Geozentrische ekliptikale Länge des Mondes (Äquinoktium des Datums). */
export function moonLongitude(utc: Date): number {
  return norm360(EclipticGeoMoon(utc).lon)
}

/**
 * Aszendent = Schnittpunkt von Ekliptik und Osthorizont.
 * RAMC aus scheinbarer Greenwich-Sternzeit + geografischer Länge (Ost positiv),
 * wahre Schiefe der Ekliptik aus astronomy-engine.
 *   λ = atan2( cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε) )
 */
export function ascendantLongitude(utc: Date, latDeg: number, lonDeg: number): number {
  const time = MakeTime(utc)
  const ramc = norm360(SiderealTime(time) * 15 + lonDeg) * DEG
  const eps = e_tilt(time).tobl * DEG
  const phi = latDeg * DEG
  const y = Math.cos(ramc)
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
  return norm360(Math.atan2(y, x) / DEG)
}
