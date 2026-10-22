import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Radio, Undo2, Save, CheckCircle2, XCircle, MessageSquareQuote, Footprints } from 'lucide-react'
import { store, uid, useActive, useAnalysis, useSettings } from '../store/store'
import { DRAFT_ID } from '../store/types'
import { Button, Panel, cx } from '../components/ui'
import { ObservationPicker } from '../components/FactsEditor'
import { PHASE_LABEL, SIGNALS, SIGNAL_BY_ID, liveState, recommend, type LiveSignal, type Phase } from '../engine/strategy/live'
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
  const { strategy } = useAnalysis(c)
  const [signals, setSignals] = useState<{ s: LiveSignal; at: number }[]>([])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const last = signals.at(-1)
  const rec = last ? recommend(last.s, strategy.drivers, settings.offer) : null
  const state = liveState(signals.map((x) => x.s))

  const push = (s: LiveSignal) => {
    setSignals((cur) => [...cur, { s, at: Date.now() }])
    setSaved(false)
    neural.emit({ type: 'live.signal', customerId: c.id === DRAFT_ID ? null : c.id, signal: s })
  }

  const save = () => {
    const text = [
      `Live-Gespräch · Phase: ${PHASE_LABEL[state.phase]} · Temperatur ${state.temperature}`,
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
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Panel glow>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-rose" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Live Sales Assistant</p>
                <h1 className="text-lg font-semibold">{c.name || 'Ohne Kundenprofil'}</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={!signals.length} onClick={() => setSignals((s) => s.slice(0, -1))}><Undo2 size={14} /> Zurück</Button>
              <Button variant="ghost" disabled={!signals.length} onClick={() => { setSignals([]); setNote(''); setSaved(false) }}>Neu</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SIGNALS.map((sig) => (
              <motion.button
                key={sig.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => push(sig.id)}
                className={cx(
                  'flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-white/[0.03] p-3 text-center transition-all hover:shadow-[0_0_28px_-6px] sm:min-h-28',
                  TONE[sig.tone],
                  last?.s === sig.id && 'ring-2 ring-gold/60',
                )}
              >
                <span className="text-3xl" aria-hidden>{sig.emoji}</span>
                <span className="text-sm font-medium leading-tight">{sig.label}</span>
              </motion.button>
            ))}
          </div>
        </Panel>

        <AnimatePresence mode="wait">
          {rec ? (
            <motion.div key={signals.length} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <Panel className={cx(rec.signal.tone === 'stop' && 'border-rose/40')}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
                  <span className="text-xl">{rec.signal.emoji}</span> Empfehlung jetzt
                </div>
                <h2 className={cx('mt-1 text-xl font-semibold sm:text-2xl', rec.signal.tone === 'stop' ? 'text-rose' : 'text-gold text-glow-gold')}>{rec.headline}</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <ul className="space-y-1.5">
                      {rec.do.map((d) => <li key={d} className="flex gap-2 text-sm"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-cyan" />{d}</li>)}
                      {rec.tailored.map((d) => <li key={d} className="flex gap-2 text-sm text-violet"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{d} <span className="text-[10px] uppercase text-violet/60">Profil</span></li>)}
                      <li className="flex gap-2 text-sm text-white/60"><XCircle size={16} className="mt-0.5 shrink-0 text-rose" />{rec.avoid}</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    {rec.phrases.map((p) => (
                      <p key={p} className="flex gap-2 rounded-xl bg-white/[0.04] p-3 text-base leading-snug"><MessageSquareQuote size={16} className="mt-1 shrink-0 text-gold" />{p}</p>
                    ))}
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/5 px-3 py-2 text-sm text-cyan"><Footprints size={16} />{rec.next}</p>
              </Panel>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel>
                <p className="text-sm text-white/50">Tippe auf ein Signal, sobald es im Gespräch auftritt – die Empfehlung erscheint sofort.</p>
                {strategy.opener[0] && <p className="mt-3 text-base"><span className="text-gold">Einstieg:</span> {strategy.opener[0].text}</p>}
              </Panel>
            </motion.div>
          )}
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
        <Panel title="Beobachtung live ergänzen">
          <ObservationPicker c={c} />
        </Panel>
      </div>
    </div>
  )
}
