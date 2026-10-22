import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  DoorOpen, Gauge, Lightbulb, Gem, HelpCircle, ShieldQuestion, Footprints, Quote, Eye, Copy, Check, Wand2, Loader2,
} from 'lucide-react'
import { store, useActive, useAnalysis, useSettings } from '../store/store'
import { BasisBadge, Button, Disclaimer, Panel, copyText, cx } from '../components/ui'
import { FactList, ObservationPicker } from '../components/FactsEditor'
import type { Item } from '../engine/strategy/strategy'
import { DIM_BY_ID } from '../engine/symbolic/dimensions'
import { AI_SYSTEM_PROMPT, createProvider } from '../ai/provider'

function ItemList({ items, max = 5, copyable }: { items: Item[]; max?: number; copyable?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.slice(0, max).map((it, i) => (
        <motion.li key={it.text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="group flex items-start justify-between gap-3 rounded-xl bg-white/[0.025] p-2.5" title={it.why}>
          <span className="text-sm leading-relaxed text-white/85">{it.text}</span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <BasisBadge basis={it.basis} />
            {copyable && <CopyBtn text={it.text} />}
          </span>
        </motion.li>
      ))}
    </ul>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" aria-label="Kopieren" className="text-white/30 hover:text-cyan"
      onClick={async () => { if (await copyText(text)) { setOk(true); setTimeout(() => setOk(false), 1200) } }}>
      {ok ? <Check size={14} className="text-cyan" /> : <Copy size={14} />}
    </button>
  )
}

function Card({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return <Panel title={title} icon={icon} className={className}>{children}</Panel>
}

export function StrategyView() {
  const c = useActive()
  const { strategy } = useAnalysis(c)
  const s = strategy

  return (
    <div className="space-y-4">
      <Panel glow title="Bekannte Kundeninformationen" icon={<Eye size={14} />}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <FactList c={c} list="wishes" />
            <FactList c={c} list="needs" />
            <FactList c={c} list="interests" />
          </div>
          <div className="space-y-4">
            <ObservationPicker c={c} />
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Empfohlen von (optional)</span>
              <input className="field" value={c.referral} placeholder="Name der empfehlenden Person" onChange={(e) => store.updateActive({ referral: e.target.value })} />
            </label>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Prägende Faktoren</p>
              {s.drivers.length === 0 ? <p className="text-sm text-white/40">Noch keine ausgeprägten Dimensionen – Profil oder Beobachtungen ergänzen.</p> : (
                <div className="flex flex-wrap gap-2">
                  {s.drivers.map((d) => (
                    <span key={d.id} className={cx('rounded-full border px-3 py-1 text-sm', d.basis === 'observed' ? 'border-cyan/40 text-cyan' : 'border-violet/40 text-violet')}>
                      {DIM_BY_ID[d.id].short} {d.side === 'high' ? '▲' : '▼'} {d.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Gesprächseinstieg" icon={<DoorOpen size={14} />}><ItemList items={s.opener} /></Card>
        <Card title="Stil & Gesprächsenergie" icon={<Gauge size={14} />}>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-white/50"><span>ruhig</span><span className="text-gold">{s.style.tempo}</span><span>dynamisch</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet via-gold to-cyan" animate={{ width: `${s.style.energy}%` }} transition={{ type: 'spring', stiffness: 80 }} />
            </div>
          </div>
          <ItemList items={s.style.items} />
        </Card>
        <Card title="Themen (Hypothesen)" icon={<Lightbulb size={14} />}><ItemList items={s.topics} max={6} /></Card>
        <Card title="Nutzenargumente" icon={<Gem size={14} />}><ItemList items={s.benefits} /></Card>
        <Card title="Offene Fragen" icon={<HelpCircle size={14} />}><ItemList items={s.questions} max={6} copyable /></Card>
        <Card title="Einwände & Antworten" icon={<ShieldQuestion size={14} />}>
          <ul className="space-y-2">
            {s.objections.map((o) => (
              <li key={o.objection} className="rounded-xl bg-white/[0.025] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-rose/90">„{o.objection}“</span>
                  <BasisBadge basis={o.basis} />
                </div>
                <p className="mt-1 text-sm text-white/75">→ {o.answer}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Nächster Schritt" icon={<Footprints size={14} />}><ItemList items={s.nextStep} /></Card>
        <Card title="Beispielsätze" icon={<Quote size={14} />} className="md:col-span-2 xl:col-span-2">
          <ItemList items={s.phrases} max={6} copyable />
          <AIRefine />
        </Card>
      </div>
      <Disclaimer>
        Reihenfolge nach Priorität: Kundenaussage → Beobachtung → symbolische Hypothese → allgemein. Themen aus der Symbolik sind
        Gesprächshypothesen, keine Tatsachen – im Gespräch prüfen und verwerfen, wenn sie nicht passen.
      </Disclaimer>
    </div>
  )
}

function AIRefine() {
  const c = useActive()
  const settings = useSettings()
  const { strategy, merged } = useAnalysis(c)
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const provider = createProvider(settings.ai)
  if (!provider) {
    return <p className="mt-4 text-xs text-white/35">Optional: KI-Feinschliff in den Einstellungen aktivieren.</p>
  }

  const run = async () => {
    setBusy(true); setErr(''); setOut('')
    // Datenminimierung: kein Name, kein Geburtsdatum – nur abgeleitete Merkmale und Fakten.
    const dims = Object.values(merged).filter((d) => d.value !== null).map((d) => `${DIM_BY_ID[d.id].short}: ${d.value} (${d.source})`).join(', ')
    const prompt = `Angebot: ${settings.offer.name} – Kernnutzen: ${settings.offer.benefit}
Profil (0–100, 50 neutral): ${dims}
Geäußerte Wünsche: ${c.wishes.map((w) => w.text).join('; ') || '–'}
Bedarf: ${c.needs.map((w) => w.text).join('; ') || '–'}
Interessen: ${c.interests.map((w) => w.text).join('; ') || '–'}
Regelbasierte Vorschläge: ${strategy.phrases.map((p) => p.text).join(' | ')}

Formuliere 5 natürliche, respektvolle Beispielsätze für den Gesprächseinstieg und die Bedarfsermittlung. Eine Zeile pro Satz, ohne Nummerierung.`
    try {
      setOut(await provider.complete({ system: AI_SYSTEM_PROMPT, prompt }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-violet/30 bg-violet/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-violet">KI-Feinschliff · sendet nur anonymisierte Merkmale</span>
        <Button variant="ghost" onClick={run} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Generieren</Button>
      </div>
      {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      {out && <ul className="mt-2 space-y-1.5">{out.split('\n').filter(Boolean).map((l) => <li key={l} className="flex justify-between gap-2 text-sm text-white/85">{l}<CopyBtn text={l} /></li>)}</ul>}
    </div>
  )
}
