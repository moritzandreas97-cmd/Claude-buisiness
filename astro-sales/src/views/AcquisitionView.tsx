import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  UserRound, Users, Share2, Sparkles, History, BadgeCheck, Coffee, PartyPopper, AtSign, MessageCircle, Phone, Mail,
  Handshake, Lightbulb, Search, Presentation, CalendarCheck, Target, ShieldAlert, ShieldCheck, Info, Copy, Check, ChevronRight, Hand, Radar,
} from 'lucide-react'
import { AUDIENCES, CHANNELS, GOALS, buildAcquisition, type Audience, type Channel, type Goal } from '../engine/acquisition/acquisition'
import { useActive, useAnalysis, useSettings, store, uid } from '../store/store'
import { DRAFT_ID } from '../store/types'
import { Button, Panel, copyText, cx } from '../components/ui'
import { neural } from '../integration/neural'

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  UserRound, Users, Share2, Sparkles, History, BadgeCheck, Coffee, PartyPopper, AtSign, MessageCircle, Phone, Mail,
  Handshake, Lightbulb, Search, Presentation, CalendarCheck, Target,
}

function Selector<T extends string>({ title, items, value, onChange, accent }: {
  title: string
  items: { id: T; label: string; icon: string }[]
  value: T
  onChange: (v: T) => void
  accent: 'gold' | 'cyan' | 'violet'
}) {
  const on = { gold: 'border-gold/70 bg-gold/15 text-gold shadow-gold/40', cyan: 'border-cyan/70 bg-cyan/15 text-cyan shadow-cyan/40', violet: 'border-violet/70 bg-violet/15 text-violet shadow-violet/40' }[accent]
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {items.map((it) => {
          const Icon = ICONS[it.icon]
          const active = value === it.id
          return (
            <button key={it.id} type="button" onClick={() => onChange(it.id)}
              className={cx('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all active:scale-95',
                active ? `${on} shadow-[0_0_20px_-6px]` : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25')}>
              <Icon size={16} className="shrink-0" />
              <span className="leading-tight">{it.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AcquisitionView() {
  const c = useActive()
  const settings = useSettings()
  const { strategy } = useAnalysis(c)
  const [audience, setAudience] = useState<Audience>('stranger')
  const [channel, setChannel] = useState<Channel>('event')
  const [goal, setGoal] = useState<Goal>('contact')
  const [useProfile, setUseProfile] = useState(true)
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  const plan = useMemo(
    () => buildAcquisition(audience, channel, goal, settings.offer, useProfile ? strategy.drivers : []),
    [audience, channel, goal, settings.offer, useProfile, strategy.drivers],
  )

  useEffect(() => {
    setStep(0); setChoice({})
    neural.emit({ type: 'acquisition.planned', audience, channel, goal })
  }, [audience, channel, goal])

  const blocked = plan.compliance.some((x) => x.level === 'block')
  const chosen = (key: string) => plan.steps.find((s) => s.key === key)!.alternatives.find((a) => a.id === choice[key]) ?? plan.steps.find((s) => s.key === key)!.alternatives[0]

  const script = plan.steps.map((s, i) => {
    const a = chosen(s.key)
    return `${i + 1}. ${s.title}\n   ${a.title}: ${a.text}${a.example ? `\n   Beispiel: ${a.example}` : ''}`
  }).join('\n\n')

  return (
    <div className="space-y-4">
      <Panel glow className="overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet/15 blur-3xl" />
        <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan/40 bg-cyan/10 text-cyan shadow-[0_0_24px_-4px] shadow-cyan/60"><Radar size={22} /></div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan/70">Neukunden gewinnen</p>
              <h1 className="text-xl font-bold tracking-wide sm:text-2xl"><span className="text-glow-cyan text-cyan">NEURAL</span> ACQUISITION BOX</h1>
            </div>
          </div>
          {c.name || c.id !== DRAFT_ID ? (
            <label className="flex items-center gap-2 text-sm text-white/60">
              <input type="checkbox" checked={useProfile} onChange={(e) => setUseProfile(e.target.checked)} className="accent-[#2ee6d6]" />
              Profil „{c.name || 'Entwurf'}“ einbeziehen
            </label>
          ) : null}
        </div>
        <div className="relative grid gap-5 lg:grid-cols-3">
          <Selector title="Wen möchte ich ansprechen?" items={AUDIENCES} value={audience} onChange={setAudience} accent="gold" />
          <Selector title="Wo findet die Ansprache statt?" items={CHANNELS} value={channel} onChange={setChannel} accent="cyan" />
          <Selector title="Was ist mein Ziel?" items={GOALS} value={goal} onChange={setGoal} accent="violet" />
        </div>
      </Panel>

      <div className="space-y-2">
        {plan.compliance.map((x) => {
          const Icon = x.level === 'block' ? ShieldAlert : x.level === 'warn' ? Info : ShieldCheck
          return (
            <div key={x.text} className={cx('flex gap-2 rounded-xl border px-3 py-2 text-sm',
              x.level === 'block' ? 'border-rose/40 bg-rose/10 text-rose' : x.level === 'warn' ? 'border-gold/30 bg-gold/5 text-gold' : 'border-white/10 bg-white/[0.02] text-white/55')}>
              <Icon size={16} className="mt-0.5 shrink-0" />{x.text}
            </div>
          )
        })}
      </div>

      <div className={cx('grid gap-4 lg:grid-cols-[1fr_340px]', blocked && 'opacity-60')}>
        <Panel title="Schritt-für-Schritt-Gesprächsführung">
          <ol className="relative space-y-3">
            <div className="absolute top-2 bottom-2 left-[15px] w-px bg-gradient-to-b from-gold via-violet to-cyan opacity-40" />
            {plan.steps.map((s, i) => {
              const open = i === step
              const done = i < step
              const sel = chosen(s.key)
              return (
                <li key={s.key} className="relative pl-11">
                  <button type="button" onClick={() => setStep(i)}
                    className={cx('absolute top-0 left-0 grid h-8 w-8 place-items-center rounded-full border font-mono text-sm transition-all',
                      open ? 'border-gold bg-gold text-ink shadow-[0_0_18px] shadow-gold/60' : done ? 'border-cyan/60 bg-cyan/15 text-cyan' : 'border-white/15 bg-ink text-white/50')}>
                    {done ? <Check size={14} /> : i + 1}
                  </button>
                  <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setStep(i)}>
                    <span className={cx('pt-1 font-medium', open ? 'text-white' : 'text-white/60')}>{s.title}</span>
                    {!open && <span className="ml-2 truncate text-xs text-white/35">{sel.title}</span>}
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        {s.tip && <p className="mt-2 text-xs text-violet/80">{s.tip}</p>}
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {s.alternatives.map((a) => {
                            const active = sel.id === a.id
                            return (
                              <button key={a.id} type="button" onClick={() => setChoice((cur) => ({ ...cur, [s.key]: a.id }))}
                                className={cx('rounded-xl border p-3 text-left transition-all', active ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25')}>
                                <span className={cx('text-sm font-semibold', active ? 'text-gold' : 'text-white/85')}>{a.title}</span>
                                <p className="mt-1 text-sm text-white/65">{a.text}</p>
                                {a.example && <p className="mt-2 text-sm text-cyan/90 italic">{a.example}</p>}
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {i < plan.steps.length - 1 && <Button onClick={() => setStep(i + 1)}>Weiter <ChevronRight size={14} /></Button>}
                          {s.key !== 'resistance' && s.key !== 'next' && (
                            <Button variant="ghost" onClick={() => setStep(plan.steps.findIndex((x) => x.key === 'resistance'))}><Hand size={14} /> Person ist zurückhaltend</Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ol>
        </Panel>

        <Panel title="Mein Leitfaden">
          <pre className="scrollbar-thin max-h-[420px] overflow-y-auto font-display text-xs leading-relaxed whitespace-pre-wrap text-white/70">{script}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={async () => { if (await copyText(script)) { setCopied(true); setTimeout(() => setCopied(false), 1500) } }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} Kopieren
            </Button>
            <Button variant="ghost" onClick={() => store.updateActive((cur) => ({
              history: [{ id: uid(), date: new Date().toISOString(), kind: 'note', text: `Akquise-Leitfaden (${AUDIENCES.find((a) => a.id === audience)!.label} · ${CHANNELS.find((x) => x.id === channel)!.label} · ${GOALS.find((g) => g.id === goal)!.label})\n${script}` }, ...cur.history],
            }))}>In Notizen</Button>
          </div>
          <p className="mt-3 text-[11px] text-white/35">Einzelansprache von Hand. Keine automatische Versendung, keine Serienansprache.</p>
        </Panel>
      </div>
    </div>
  )
}
