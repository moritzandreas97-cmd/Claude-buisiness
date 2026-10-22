/** Offset (ms) einer IANA-Zeitzone zu einem UTC-Zeitpunkt, inkl. historischer Sommerzeit. */
export function tzOffsetMs(utcMs: number, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]))
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  )
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** Wandelt eine lokale Wanduhrzeit in einer IANA-Zeitzone in einen UTC-Zeitpunkt um. */
export function localToUtc(
  year: number, month: number, day: number, hour: number, minute: number, timeZone: string,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  let utc = wall - tzOffsetMs(wall, timeZone)
  // Zweiter Durchlauf korrigiert Fälle rund um Zeitumstellungen.
  utc = wall - tzOffsetMs(utc, timeZone)
  return new Date(utc)
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function allTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : ['UTC', 'Europe/Berlin']
}
