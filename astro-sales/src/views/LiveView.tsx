import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Radio, Undo2, Save, MessageSquareQuote, Footprints, Lightbulb, RefreshCw } from 'lucide-react'
import { store, uid, useActive, useAnalysis, useLiveSignals, useSettings } from '../store/store'
import { DRAFT_ID } from '../store/types'
import { BasisBadge, Button, Panel, cx } from '../components/ui'
import { ObservationPicker } from '../components/FactsEditor'
import { PHASE_LABEL, SIGNALS, SIGNAL_BY_ID, coach, liveState, type LiveSignal, type Phase } from '../engine/strategy/live'
import { neural } from '../integration/neural'

const PHASES: Phase[] = ['opening', 'discovery', 'presentation', 'objection', 'closing']

const TONE = {
  positive: 'border-cyan/30 hover:border-cyan/70 hover:bg-cyan/10 hover:shadow-cyan/30',
  neutral: 'border-gold/30 hover:border-gold/70 hover:bg-gold/10 hover:shadow-gold/30',
  caution: 'border-violet/30 hover:border-violet/70 hover:bg-violet/10 hover:shadow-violet/30',
  stop: 'border-rose/30 hover:border-rose/70 hover:bg-rose/10 hover:shadow-rose/30',
}

export function LiveView() {
  const c = useActive()
  const settings = useSettings()
  const { strategy, product } = useAnalysis(c)
  const signals = useLiveSignals(c.id)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [alt, setAlt] = useState(0)

  const last = signals.at(-1)
  const state = liveState(signals.map((x) => x.s))
  const coaching = last ? coach(last.s, strategy.drivers, product, settings.address) : null

  // Ohne Signal: Empfehlung aus der Strategie für die aktuelle Phase.
  const card = coaching
    ? { say: coaching.say, why: coaching.why, hint: coaching.hint, next: coaching.next, tone: coaching.signal.tone, key: `${signals.length}` }
    : {
        say: strategy.focus.say.map((i) => i.text),
        why: { text: strategy.focus.say[0]?.why ?? 'Passend zur aktuellen Gesprächsphase.', basis: strategy.focus.say[0]?.basis ?? 'general' },
        hint: undefined,
        next: strategy.focus.next.text,
        tone: 'neutral' as const,
        key: `focus-${strategy.focus.phase}`,
      }
  const sayText = card.say.length ? card.say[alt % card.say.length] : ''

  const push = (s: LiveSignal) => {
    store.pushSignal(s)
    setSaved(false)
    setAlt(0)
    neural.emit({ type: 'live.signal', customerId: c.id === DRAFT_ID ? null : c.id, signal: s })
  }

  const save = () => {
    const text = [
      `Live-Gespräch · ${product.name} · Phase: ${PHASE_LABEL[state.phase]} · Temperatur ${state.temperature}`,
      signals.map((x) => SIGNAL_BY_ID[x.s].label).join(' → '),
      note,
    ].filter(Boolean).join('\n')
    const today = new Date().toISOString().slice(0, 10)
    store.updateActive((cur) => ({
      history: [{ id: uid(), date: new Date().toISOString(), kind: 'live', text, signals: signals.map((x) => x.s) }, ...cur.history],
      lastContact: today,
      status: signals.some((x) => x.s === 'no') ? 'declined' : signals.some((x) => x.s === 'ready') ? 'negotiation' : cur.status === 'new' ? 'contacted' : cur.status,
    }))
    setSaved(true)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Panel glow className="!p-3 sm:!p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-rose" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Live · {PHASE_LABEL[state.phase === 'ended' ? 'ended' : strategy.focus.phase]}</p>
                <h1 className="truncate text-base font-semibold sm:text-lg">{c.name || 'Ohne Kundenprofil'} <span className="text-white/35">×</span> <span className="text-cyan">{product.name}</span></h1>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" className="!px-2.5" disabled={!signals.length} onClick={() => { store.undoSignal(); setAlt(0) }}><Undo2 size={14} /><span className="hidden sm:inline">Zurück</span></Button>
              <Button variant="ghost" className="!px-2.5" disabled={!signals.length} onClick={() => { store.resetLive(); setNote(''); setSaved(false); setAlt(0) }}>Neu</Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {SIGNALS.map((sig) => (
              <motion.button
                key={sig.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => push(sig.id)}
                className={cx(
                  'flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border bg-white/[0.03] p-1.5 text-center transition-all hover:shadow-[0_0_28px_-6px] sm:min-h-28 sm:p-3',
                  TONE[sig.tone],
                  last?.s === sig.id && 'ring-2 ring-gold/60',
                )}
              >
                <span className="text-2xl sm:text-3xl" aria-hidden>{sig.emoji}</span>
                <span className="text-[11px] font-medium leading-tight sm:text-sm">{sig.label}</span>
              </motion.button>
            ))}
          </div>
        </Panel>

        <AnimatePresence mode="wait">
          <motion.div key={card.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
            className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
            <section className={cx('panel panel-glow col-span-2 p-3.5 sm:p-5 lg:col-span-1', card.tone === 'stop' && 'border-rose/40')}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold"><MessageSquareQuote size={14} /> Was sagen?</h2>
                {card.say.length > 1 && (
                  <button type="button" onClick={() => setAlt((a) => a + 1)} className="flex items-center gap-1 text-xs text-white/45 hover:text-gold">
                    <RefreshCw size={12} /> Alternative ({(alt % card.say.length) + 1}/{card.say.length})
                  </button>
                )}
              </div>
              <p className={cx('text-base leading-snug font-medium sm:text-xl', card.tone === 'stop' ? 'text-rose' : 'text-white')}>„{sayText}“</p>
            </section>
            <section className="panel p-3 sm:p-5">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet sm:text-[11px]"><Lightbulb size={14} /> Warum?</h2>
              <p className="text-[13px] leading-snug text-white/85 sm:text-sm sm:leading-relaxed">{card.why.text}</p>
              <div className="mt-2"><BasisBadge basis={card.why.basis} /></div>
              {card.hint && (
                <p className="mt-2 hidden border-t border-white/5 pt-2 text-xs text-white/55 sm:block">
                  <span className={card.hint.basis === 'observed' ? 'text-cyan' : 'text-violet'}>{card.hint.basis === 'observed' ? 'Beobachtung: ' : 'Profil-Hypothese: '}</span>{card.hint.text}
                </p>
              )}
            </section>
            <section className="panel p-3 sm:p-5">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan sm:text-[11px]"><Footprints size={14} /> Was als Nächstes?</h2>
              <p className="text-[13px] leading-snug text-white/85 sm:text-sm sm:leading-relaxed">{card.next}</p>
            </section>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        <Panel title="Gesprächsverlauf" icon={<Radio size={14} />}>
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-white/50"><span>Temperatur</span><span className="font-mono text-gold">{state.temperature}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet via-gold to-cyan" animate={{ width: `${state.temperature}%` }} transition={{ type: 'spring', stiffness: 90 }} />
            </div>
          </div>
          <p className="mb-1.5 text-xs text-white/50">Phase: <span className="text-gold">{PHASE_LABEL[state.phase]}</span></p>
          <ol className="mb-4 flex items-center gap-1" aria-label="Gesprächsphasen">
            {PHASES.map((p) => {
              const idx = PHASES.indexOf(p)
              const cur = state.phase === 'ended' ? -1 : PHASES.indexOf(state.phase)
              return (
                <li key={p} className="flex-1" title={PHASE_LABEL[p]}>
                  <div className={cx('h-1.5 rounded-full', idx <= cur ? 'bg-gold' : 'bg-white/10', idx === cur && 'shadow-[0_0_10px] shadow-gold')} />
                  
                </li>
              )
            })}
          </ol>
          {state.phase === 'ended' && <p className="mb-3 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">Gespräch beendet – das Nein wird respektiert.</p>}
          <ul className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto">
            {signals.map((x, i) => (
              <li key={x.at + '-' + i} className="flex items-center justify-between text-sm">
                <span>{SIGNAL_BY_ID[x.s].emoji} {SIGNAL_BY_ID[x.s].label}</span>
                <span className="font-mono text-[11px] text-white/35">{new Date(x.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
            {!signals.length && <li className="text-sm text-white/35">Noch keine Signale.</li>}
          </ul>
          <textarea className="field mt-3 min-h-20 text-sm" placeholder="Kurze Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="mt-3 w-full" disabled={!signals.length || saved} onClick={save}><Save size={16} />{saved ? 'In Historie gespeichert' : c.id === DRAFT_ID ? 'Im Entwurf speichern' : 'In Kundenhistorie speichern'}</Button>
        </Panel>
        <Panel>
          <details>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Beobachtung live ergänzen</summary>
            <div className="mt-3"><ObservationPicker c={c} /></div>
          </details>
        </Panel>
      </div>
    </div>
  )
}
