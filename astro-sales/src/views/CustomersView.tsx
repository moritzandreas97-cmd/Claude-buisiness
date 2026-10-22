import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Trash2, Download, Upload, Search, CalendarClock, ShieldCheck, UserRound, MessageSquarePlus } from 'lucide-react'
import { store, uid, useActive, useAnalysis, useStore } from '../store/store'
import {
  DRAFT_ID, INFO_SOURCE_LABEL, LEGAL_BASIS_LABEL, STATUS_LABEL,
  type ContactStatus, type Customer, type HistoryEntry, type InfoSource, type LegalBasis,
} from '../store/types'
import { Button, Chip, Label, Panel, cx } from '../components/ui'
import { FactList } from '../components/FactsEditor'
import { SIGN_BY_ID } from '../engine/astro/zodiac'
import { ANIMAL_BY_ID } from '../engine/astro/chinese'
import { resolveProfile } from '../engine/astro/calculate'

const STATUS_TONE: Record<ContactStatus, string> = {
  new: 'text-white/60 border-white/20', contacted: 'text-cyan border-cyan/40', interested: 'text-gold border-gold/40',
  negotiation: 'text-violet border-violet/40', customer: 'text-cyan border-cyan/60 bg-cyan/10', paused: 'text-white/40 border-white/15', declined: 'text-rose border-rose/40',
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function CustomerCard({ c, active }: { c: Customer; active: boolean }) {
  const p = resolveProfile(c.mode, c.birth, c.manual)
  const glyphs = [p.sun.value && SIGN_BY_ID[p.sun.value].glyph, p.moon.value && SIGN_BY_ID[p.moon.value].glyph, p.asc.value && SIGN_BY_ID[p.asc.value].glyph, p.lifePath.value, p.animal.value && ANIMAL_BY_ID[p.animal.value].glyph].filter(Boolean)
  return (
    <motion.button layout type="button" onClick={() => store.setActive(c.id)}
      className={cx('panel w-full p-4 text-left transition-all hover:border-white/20', active && 'panel-glow')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold/30 via-violet/20 to-cyan/30 font-semibold">{c.name.slice(0, 2).toUpperCase() || <UserRound size={16} />}</div>
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="font-mono text-xs tracking-widest text-gold/80">{glyphs.join(' ') || '—'}</p>
          </div>
        </div>
        <span className={cx('rounded-full border px-2 py-0.5 text-[11px]', STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
      </div>
      <div className="mt-3 space-y-1 text-xs text-white/50">
        {c.nextStep && <p className="flex items-center gap-1.5 text-cyan/80"><CalendarClock size={12} />{c.nextStep}{c.nextStepDate && ` · ${new Date(c.nextStepDate).toLocaleDateString('de-DE')}`}</p>}
        <p>Letzter Kontakt: {c.lastContact ? new Date(c.lastContact).toLocaleDateString('de-DE') : '—'}</p>
        {c.legalBasis === 'unset' && <p className="text-rose/80">Rechtsgrundlage fehlt</p>}
      </div>
    </motion.button>
  )
}

export function CustomersView() {
  const customers = useStore((s) => s.customers)
  const active = useActive()
  const [q, setQ] = useState('')
  const [newName, setNewName] = useState('')
  const [filter, setFilter] = useState<ContactStatus | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const list = customers.filter((c) => (filter === 'all' || c.status === filter) && c.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <div className="space-y-4">
        <Panel title={`Kunden (${customers.length})`} icon={<UserRound size={14} />}
          action={<div className="flex gap-1">
            <button type="button" title="Alle exportieren" className="rounded-lg p-1.5 text-white/50 hover:text-cyan" onClick={() => download('kunden-export.json', customers)}><Download size={16} /></button>
            <button type="button" title="Importieren" className="rounded-lg p-1.5 text-white/50 hover:text-cyan" onClick={() => fileRef.current?.click()}><Upload size={16} /></button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const data = JSON.parse(await f.text())
                setMsg(`${store.importCustomers(Array.isArray(data) ? data : [data])} Kunden importiert.`)
              } catch { setMsg('Import fehlgeschlagen – ungültige Datei.') }
              e.target.value = ''
            }} />
          </div>}>
          <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { store.createCustomer(newName.trim()); setNewName('') } }}>
            <input className="field" placeholder="Neuer Kunde (Name/Kürzel)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button type="submit" disabled={!newName.trim()}><Plus size={16} /></Button>
          </form>
          <div className="relative mb-3">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-white/30" />
            <input className="field !pl-8" placeholder="Suchen" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Alle</Chip>
            {(Object.keys(STATUS_LABEL) as ContactStatus[]).map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</Chip>)}
          </div>
          {msg && <p className="mb-2 text-xs text-cyan">{msg}</p>}
          <div className="scrollbar-thin max-h-[60vh] space-y-2.5 overflow-y-auto pr-1">
            {list.map((c) => <CustomerCard key={c.id} c={c} active={c.id === active.id} />)}
            {!list.length && <p className="text-sm text-white/40">Keine Kunden gefunden.</p>}
          </div>
        </Panel>
      </div>

      {active.id === DRAFT_ID ? (
        <Panel><p className="text-sm text-white/50">Kunden auswählen oder anlegen, um Details zu bearbeiten. Der Profiler arbeitet aktuell im Entwurfsmodus.</p></Panel>
      ) : (
        <CustomerDetail key={active.id} c={active} />
      )}
    </div>
  )
}

function CustomerDetail({ c }: { c: Customer }) {
  const { profile } = useAnalysis(c)
  const [confirm, setConfirm] = useState(false)
  const [entry, setEntry] = useState('')
  const [kind, setKind] = useState<HistoryEntry['kind']>('note')
  const up = (p: Partial<Customer>) => store.updateActive(p)

  return (
    <div className="space-y-4">
      <Panel glow>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="min-w-48 flex-1">
            <Label>Name / Kürzel</Label>
            <input className="field text-lg font-semibold" value={c.name} onChange={(e) => up({ name: e.target.value })} />
          </label>
          <label>
            <Label>Kontaktstatus</Label>
            <select className="field" value={c.status} onChange={(e) => up({ status: e.target.value as ContactStatus })}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label><Label>Letzter Kontakt</Label><input type="date" className="field" value={c.lastContact} onChange={(e) => up({ lastContact: e.target.value })} /></label>
          <label className="sm:col-span-2"><Label>Vereinbarter nächster Schritt</Label>
            <div className="flex gap-2">
              <input className="field" value={c.nextStep} placeholder="z. B. Angebot besprechen" onChange={(e) => up({ nextStep: e.target.value })} />
              <input type="date" className="field !w-40" value={c.nextStepDate} onChange={(e) => up({ nextStepDate: e.target.value })} />
            </div>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
          {(['sun', 'moon', 'asc'] as const).map((k) => profile[k].value && <span key={k} className="rounded-full border border-white/10 px-2 py-1">{k === 'sun' ? 'Sonne' : k === 'moon' ? 'Mond' : 'AC'} {SIGN_BY_ID[profile[k].value!].name} · {profile[k].source}</span>)}
          {profile.lifePath.value && <span className="rounded-full border border-white/10 px-2 py-1">Lebenszahl {profile.lifePath.value}</span>}
          {profile.animal.value && <span className="rounded-full border border-white/10 px-2 py-1">{ANIMAL_BY_ID[profile.animal.value].name}</span>}
          <span className="text-white/35">→ im Profiler bearbeiten</span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Interessen & Bedürfnisse">
          <div className="space-y-4">
            <FactList c={c} list="wishes" />
            <FactList c={c} list="needs" />
            <FactList c={c} list="interests" />
          </div>
        </Panel>

        <Panel title="Datenschutz & Herkunft" icon={<ShieldCheck size={14} />}>
          <div className="space-y-3">
            <label className="block"><Label>Rechtsgrundlage</Label>
              <select className={cx('field', c.legalBasis === 'unset' && 'border-rose/50')} value={c.legalBasis} onChange={(e) => up({ legalBasis: e.target.value as LegalBasis })}>
                {Object.entries(LEGAL_BASIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block"><Label>Nachweis / Notiz (z. B. Einwilligung am … erteilt)</Label>
              <input className="field" value={c.legalNote} onChange={(e) => up({ legalNote: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label><Label>Herkunft Kontaktdaten</Label>
                <select className="field" value={c.origin} onChange={(e) => up({ origin: e.target.value as InfoSource })}>
                  {Object.entries(INFO_SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label><Label>Herkunft Geburtsdaten</Label>
                <select className="field" value={c.birthSource} onChange={(e) => up({ birthSource: e.target.value as InfoSource })}>
                  {Object.entries(INFO_SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-white/40">Alle Daten liegen ausschließlich lokal in diesem Browser. Nur erfassen, was für das Gespräch nötig ist.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="ghost" onClick={() => download(`auskunft-${c.name || c.id}.json`, c)}><Download size={14} /> Datenauskunft</Button>
              {confirm ? (
                <>
                  <Button variant="danger" onClick={() => store.deleteCustomer(c.id)}><Trash2 size={14} /> Endgültig löschen</Button>
                  <Button variant="ghost" onClick={() => setConfirm(false)}>Abbrechen</Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 size={14} /> Kunde löschen</Button>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Gesprächsnotizen & Historie" icon={<MessageSquarePlus size={14} />}>
        <textarea className="field mb-4 min-h-20 text-sm" placeholder="Allgemeine Notizen" value={c.notes} onChange={(e) => up({ notes: e.target.value })} />
        <form className="mb-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => {
          e.preventDefault()
          if (!entry.trim()) return
          store.updateActive((cur) => ({ history: [{ id: uid(), date: new Date().toISOString(), kind, text: entry.trim() }, ...cur.history], lastContact: kind === 'note' ? cur.lastContact : new Date().toISOString().slice(0, 10) }))
          setEntry('')
        }}>
          <select className="field sm:!w-36" value={kind} onChange={(e) => setKind(e.target.value as HistoryEntry['kind'])}>
            <option value="note">Notiz</option><option value="call">Telefonat</option><option value="meeting">Treffen</option><option value="message">Nachricht</option>
          </select>
          <input className="field" placeholder="Eintrag hinzufügen" value={entry} onChange={(e) => setEntry(e.target.value)} />
          <Button type="submit" disabled={!entry.trim()}><Plus size={14} /></Button>
        </form>
        <ol className="relative space-y-3 border-l border-white/10 pl-4">
          {c.history.map((h) => (
            <li key={h.id} className="relative">
              <span className={cx('absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full', h.kind === 'live' ? 'bg-rose' : h.kind === 'note' ? 'bg-violet' : 'bg-cyan')} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/40">{{ note: 'Notiz', call: 'Telefonat', meeting: 'Treffen', message: 'Nachricht', live: 'Live-Gespräch' }[h.kind]} · {new Date(h.date).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <button type="button" className="text-white/25 hover:text-rose" aria-label="Eintrag löschen" onClick={() => store.updateActive((cur) => ({ history: cur.history.filter((x) => x.id !== h.id) }))}><Trash2 size={12} /></button>
              </div>
              <p className="mt-0.5 text-sm whitespace-pre-wrap text-white/80">{h.text}</p>
            </li>
          ))}
          {!c.history.length && <li className="text-sm text-white/35">Noch keine Einträge.</li>}
        </ol>
      </Panel>
    </div>
  )
}
