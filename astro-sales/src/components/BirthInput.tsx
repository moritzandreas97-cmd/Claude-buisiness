import { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import type { BirthData } from '../engine/astro/calculate'
import { searchPlaces } from '../engine/astro/places'
import { allTimeZones } from '../engine/astro/timezone'
import { Label } from './ui'

export function BirthInput({ birth, onChange }: { birth: BirthData; onChange: (b: BirthData) => void }) {
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState(false)
  const results = searchPlaces(query)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <Label>Geburtsdatum</Label>
          <input type="date" className="field" value={birth.date ?? ''} max="2100-12-31" min="1900-01-01"
            onChange={(e) => onChange({ ...birth, date: e.target.value || undefined })} />
        </label>
        <label>
          <Label>Geburtszeit (optional)</Label>
          <input type="time" className="field" value={birth.time ?? ''}
            onChange={(e) => onChange({ ...birth, time: e.target.value || undefined })} />
        </label>
      </div>

      <div>
        <Label>Geburtsort (optional)</Label>
        {birth.place ? (
          <div className="flex items-center justify-between rounded-xl border border-cyan/30 bg-cyan/5 px-3 py-2 text-sm">
            <span className="flex items-center gap-2"><MapPin size={14} className="text-cyan" />{birth.place.name}
              <span className="font-mono text-[11px] text-white/40">{birth.place.lat.toFixed(2)}°, {birth.place.lon.toFixed(2)}° · {birth.place.tz}</span>
            </span>
            <button type="button" className="text-white/50 hover:text-rose" onClick={() => onChange({ ...birth, place: undefined })} aria-label="Ort entfernen"><X size={16} /></button>
          </div>
        ) : custom ? (
          <CustomPlace onDone={(p) => { onChange({ ...birth, place: p }); setCustom(false) }} onCancel={() => setCustom(false)} />
        ) : (
          <div className="relative">
            <input className="field" placeholder="Stadt suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur">
                {results.map((p) => (
                  <button key={p.name + p.country} type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() => { onChange({ ...birth, place: { name: p.name, lat: p.lat, lon: p.lon, tz: p.tz } }); setQuery('') }}>
                    <span>{p.name}</span><span className="font-mono text-[11px] text-white/40">{p.country}</span>
                  </button>
                ))}
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-cyan hover:bg-white/5" onClick={() => setCustom(true)}>
                  + Ort mit Koordinaten erfassen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomPlace({ onDone, onCancel }: { onDone: (p: NonNullable<BirthData['place']>) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [tz, setTz] = useState('Europe/Berlin')
  const valid = name && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon)) && Math.abs(parseFloat(lat)) <= 90 && Math.abs(parseFloat(lon)) <= 180
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <input className="field" placeholder="Ortsname" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" placeholder="Breite (z. B. 48.14)" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
        <input className="field" placeholder="Länge Ost (z. B. 11.58)" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} />
      </div>
      <select className="field" value={tz} onChange={(e) => setTz(e.target.value)}>
        {allTimeZones().map((z) => <option key={z}>{z}</option>)}
      </select>
      <div className="flex gap-2">
        <button type="button" disabled={!valid} className="rounded-lg bg-cyan/20 px-3 py-1.5 text-sm text-cyan disabled:opacity-40"
          onClick={() => onDone({ name, lat: parseFloat(lat), lon: parseFloat(lon), tz })}>Übernehmen</button>
        <button type="button" className="px-3 py-1.5 text-sm text-white/50" onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  )
}
