import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Orbit, Sparkles, GitCompareArrows, Info, Save, RotateCcw } from 'lucide-react'
import { store, useActive, useAnalysis } from '../store/store'
import { DRAFT_ID } from '../store/types'
import { ProfileWheel } from '../components/ProfileWheel'
import { BirthInput } from '../components/BirthInput'
import { AstroFields } from '../components/AstroFields'
import { Button, Disclaimer, Label, Panel, Segmented, cx } from '../components/ui'
import { DIM_BY_ID, type DimensionId } from '../engine/symbolic/dimensions'
import { SYSTEM_LABEL } from '../engine/symbolic/rules'
import { OBS_BY_ID } from '../engine/behavior/observations'
import type { InputMode } from '../engine/astro/calculate'

const MODES: { id: InputMode; label: string }[] = [
  { id: 'auto', label: 'Automatisch' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'manual', label: 'Manuell' },
]

const INSIGHT_STYLE = {
  match: { label: 'Übereinstimmung', cls: 'border-gold/30 text-gold' },
  tension: { label: 'Gegensatz', cls: 'border-rose/30 text-rose' },
  complement: { label: 'Ergänzung', cls: 'border-cyan/30 text-cyan' },
}

export function ProfilerView() {
  const c = useActive()
  const { profile, fusion, merged } = useAnalysis(c)
  const [selected, setSelected] = useState<DimensionId | null>(null)
  const [saveName, setSaveName] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr] 2xl:grid-cols-[340px_1fr_380px]">
      {/* Eingabe */}
      <div className="space-y-4 lg:row-span-2 2xl:row-span-1">
        <Panel title="Eingabemodus" icon={<Orbit size={14} />}>
          <Segmented value={c.mode} options={MODES} onChange={(mode) => store.updateActive({ mode })} />
          <p className="mt-3 text-xs text-white/45">
            {c.mode === 'auto' && 'Alle Angaben werden aus Geburtsdaten berechnet. Fehlendes bleibt leer.'}
            {c.mode === 'hybrid' && 'Berechnen und einzelne Angaben manuell ergänzen oder überschreiben.'}
            {c.mode === 'manual' && 'Alle Angaben frei wählen – keine Berechnung.'}
          </p>
          {c.mode !== 'manual' && (
            <div className="mt-4">
              <BirthInput birth={c.birth} onChange={(birth) => store.updateActive({ birth })} />
              <p className="mt-2 text-[11px] text-white/35">Geburtsdaten sind personenbezogen – nur mit Rechtsgrundlage speichern.</p>
            </div>
          )}
        </Panel>

        <Panel title="Fünf Systeme" icon={<Sparkles size={14} />}>
          <AstroFields profile={profile} manual={c.manual} mode={c.mode} onManual={(manual) => store.updateActive({ manual })} />
        </Panel>

        {c.id === DRAFT_ID ? (
          <Panel>
            <Label>Profil als Kunde speichern</Label>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (saveName.trim()) { store.saveDraftAsCustomer(saveName.trim()); setSaveName('') } }}>
              <input className="field" placeholder="Name oder Kürzel" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
              <Button type="submit" disabled={!saveName.trim()}><Save size={16} /></Button>
            </form>
            <button type="button" onClick={() => store.resetDraft()} className="mt-3 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70">
              <RotateCcw size={12} /> Entwurf zurücksetzen
            </button>
          </Panel>
        ) : null}
      </div>

      {/* Profilrad */}
      <Panel glow className="order-first flex flex-col items-center overflow-hidden lg:order-none">
        <div className="mb-1 flex w-full items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Symbolische Profilfusion</p>
            <h1 className="text-xl font-semibold text-glow-gold sm:text-2xl">{c.name || 'Neues Profil'}</h1>
          </div>
          <div className="hidden gap-3 text-[11px] text-white/50 sm:flex">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-gold" />symbolisch</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-cyan" />beobachtet</span>
          </div>
        </div>
        <div className="w-full max-w-[720px]">
          <ProfileWheel profile={profile} fusion={fusion} merged={merged} selected={selected} onSelect={setSelected} />
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-[11px] text-white/50">
          <span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-gold" />Resonanz</span>
          <span className="flex items-center gap-1"><i className="h-0.5 w-4 border-t border-dashed border-rose" />Spannung</span>
          <span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-cyan" />neutral</span>
          <span>· Achse antippen für Herleitung</span>
        </div>
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 w-full rounded-2xl border border-gold/20 bg-black/30 p-4">
              <DimensionDetail id={selected} fusion={fusion} merged={merged} />
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* Erkenntnisse */}
      <div className="space-y-4 lg:col-start-2 2xl:col-start-auto">
        <Panel title="Übereinstimmungen & Gegensätze" icon={<GitCompareArrows size={14} />}>
          {fusion.insights.length === 0 ? (
            <p className="text-sm text-white/40">Mindestens zwei Systeme angeben, um Zusammenhänge zu sehen.</p>
          ) : (
            <ul className="space-y-2.5">
              {fusion.insights.map((ins, i) => (
                <motion.li key={ins.title + i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={cx('rounded-xl border bg-white/[0.02] p-3', INSIGHT_STYLE[ins.kind].cls.split(' ')[0])}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">{ins.title}</span>
                    <span className={cx('font-mono text-[10px] uppercase', INSIGHT_STYLE[ins.kind].cls.split(' ')[1])}>{INSIGHT_STYLE[ins.kind].label}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{ins.text}</p>
                </motion.li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Hinweis" icon={<Info size={14} />}>
          <Disclaimer>
            Astrologie und Numerologie sind hier ausdrücklich <strong className="text-white/60">symbolische Interpretationsmodelle</strong>, keine
            validierten psychologischen Verfahren. Alle Werte entstehen aus offen einsehbaren, konfigurierbaren Archetypenregeln
            (Einstellungen → Regeln). Beobachtetes Verhalten und geäußerte Wünsche haben stets Vorrang.
          </Disclaimer>
        </Panel>
      </div>
    </div>
  )
}

function DimensionDetail({ id, fusion, merged }: { id: DimensionId; fusion: ReturnType<typeof useAnalysis>['fusion']; merged: ReturnType<typeof useAnalysis>['merged'] }) {
  const info = DIM_BY_ID[id]
  const score = fusion.scores[id]
  const m = merged[id]
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-gold">{info.label}</h3>
        <span className="font-mono text-lg">{m.value ?? '—'}</span>
      </div>
      <p className="mt-1 text-xs text-white/50">Hoch: {info.high} · Niedrig: {info.low}</p>
      {m.source === 'observed' && (
        <p className="mt-2 rounded-lg bg-cyan/10 px-3 py-2 text-xs text-cyan">
          Überschrieben durch Beobachtung: {m.observedBy.map((o) => OBS_BY_ID[o].label).join(', ')} (symbolisch wäre {m.symbolic ?? '—'})
        </p>
      )}
      <p className="mt-3 mb-1 text-[11px] uppercase tracking-widest text-white/40">Regelbeiträge (−3 … +3 × Gewicht)</p>
      {score.contributions.length === 0 ? (
        <p className="text-xs text-white/40">Keine Regel betrifft diese Dimension – Wert bleibt neutral (50).</p>
      ) : (
        <ul className="space-y-1">
          {score.contributions.map((ct, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-white/50">{SYSTEM_LABEL[ct.system]}</span>
              <span className="flex-1 text-white/80">{ct.symbol}</span>
              <span className={cx('font-mono', ct.raw > 0 ? 'text-gold' : 'text-violet')}>{ct.raw > 0 ? '+' : ''}{ct.raw}</span>
              <span className="w-12 text-right font-mono text-white/35">×{ct.weight.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
