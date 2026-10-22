import { useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Orbit, Target, Radio, Radar, Users, Settings2, ChevronDown, Package } from 'lucide-react'
import { store, useActive, useActiveProduct, useSettings, useStore } from './store/store'
import { DRAFT_ID } from './store/types'
import { cx } from './components/ui'
import { ProfilerView } from './views/ProfilerView'
import { StrategyView } from './views/StrategyView'
import { LiveView } from './views/LiveView'
import { AcquisitionView } from './views/AcquisitionView'
import { CustomersView } from './views/CustomersView'
import { SettingsView } from './views/SettingsView'
import { ProductsView } from './views/ProductsView'

type Tab = 'profiler' | 'strategy' | 'live' | 'acquisition' | 'products' | 'customers' | 'settings'

const TABS: { id: Tab; label: string; short: string; icon: ComponentType<{ size?: number }>; view: ComponentType }[] = [
  { id: 'profiler', label: 'Astro Profiler', short: 'Profil', icon: Orbit, view: ProfilerView },
  { id: 'strategy', label: 'Strategie', short: 'Strategie', icon: Target, view: StrategyView },
  { id: 'live', label: 'Live-Modus', short: 'Live', icon: Radio, view: LiveView },
  { id: 'acquisition', label: 'Akquise-Box', short: 'Akquise', icon: Radar, view: AcquisitionView },
  { id: 'products', label: 'Angebote', short: 'Angebot', icon: Package, view: ProductsView },
  { id: 'customers', label: 'Kunden', short: 'Kunden', icon: Users, view: CustomersView },
  { id: 'settings', label: 'Einstellungen', short: 'Setup', icon: Settings2, view: SettingsView },
]

const TAB_KEY = 'neural-astro-sales:tab'

function initialTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY) as Tab | null
    return t && TABS.some((x) => x.id === t) ? t : 'profiler'
  } catch {
    return 'profiler'
  }
}

const SELECT_CLS = 'w-full appearance-none rounded-full border border-white/10 bg-black/40 py-1.5 pr-8 pl-3 text-sm text-white/85 outline-none hover:border-gold/40 focus:border-gold/60'

function ProductSwitch() {
  const products = useSettings().products
  const active = useActiveProduct()
  return (
    <label className="relative flex min-w-0 flex-1 items-center sm:max-w-56 sm:flex-none">
      <span className="sr-only">Aktives Produkt</span>
      <select value={active.id} onChange={(e) => store.setActiveProduct(e.target.value)} className={cx(SELECT_CLS, 'border-cyan/20')}>
        <optgroup label="Eigene Produkte">
          {products.filter((p) => !p.catalog).map((p) => <option key={p.id} value={p.id}>◆ {p.name || 'Ohne Namen'}</option>)}
        </optgroup>
        {[...new Set(products.filter((p) => p.catalog).map((p) => p.catalog!.catalogId))].map((cid) => (
          <optgroup key={cid} label={cid === 'relife-test' ? 'RELIFE-Testkatalog' : cid}>
            {products.filter((p) => p.catalog?.catalogId === cid).map((p) => (
              <option key={p.id} value={p.id}>◇ {p.name}{p.catalog!.status.availability === 'historical' ? ' (historisch)' : ''}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 text-white/40" />
    </label>
  )
}

function AddressToggle() {
  const address = useSettings().address
  return (
    <div className="flex shrink-0 rounded-full border border-white/10 bg-black/40 p-0.5" role="group" aria-label="Anrede">
      {(['sie', 'du'] as const).map((a) => (
        <button key={a} type="button" onClick={() => store.updateSettings({ address: a })} aria-pressed={address === a}
          className={cx('rounded-full px-3 py-1 text-sm transition-colors', address === a ? 'bg-gradient-to-r from-gold to-cyan font-semibold text-ink' : 'text-white/55 hover:text-white')}>
          {a === 'sie' ? 'Sie' : 'Du'}
        </button>
      ))}
    </div>
  )
}

function CustomerSwitch() {
  const customers = useStore((s) => s.customers)
  const active = useActive()
  return (
    <label className="relative flex min-w-0 flex-1 items-center sm:max-w-56 sm:flex-none">
      <span className="sr-only">Aktives Profil</span>
      <select value={active.id} onChange={(e) => store.setActive(e.target.value)} className={SELECT_CLS}>
        <option value={DRAFT_ID}>✦ Entwurf (ungespeichert)</option>
        {customers.map((c) => <option key={c.id} value={c.id}>{c.name || 'Ohne Namen'}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 text-white/40" />
    </label>
  )
}

export function App() {
  const [tab, setTabState] = useState<Tab>(initialTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const View = TABS.find((t) => t.id === tab)!.view

  return (
    <div className="min-h-full">
      <div className="cosmos" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-ink/60 p-4 backdrop-blur-xl md:flex">
        <Logo />
        <nav className="mt-8 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const on = t.id === tab
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={cx('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', on ? 'text-white' : 'text-white/50 hover:text-white/85')}>
                {on && <motion.span layoutId="nav" className="absolute inset-0 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/15 to-transparent" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className={cx('relative', on && 'text-gold')}><Icon size={18} /></span>
                <span className="relative">{t.label}</span>
                {t.id === 'acquisition' && <span className="relative ml-auto rounded bg-cyan/15 px-1.5 text-[9px] font-semibold tracking-wider text-cyan">NEU</span>}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/35">
          Lokal gespeichert · keine Cloud · symbolische Modelle, keine Psychodiagnostik
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/70 px-4 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="md:hidden"><Logo compact /></div>
            <p className="hidden text-sm text-white/45 lg:block">{TABS.find((t) => t.id === tab)!.label}</p>
            <div className="hidden items-center gap-2 sm:flex">
              <CustomerSwitch />
              <ProductSwitch />
              <AddressToggle />
            </div>
            <div className="sm:hidden"><AddressToggle /></div>
          </div>
          <div className="mt-2 flex gap-2 sm:hidden">
            <CustomerSwitch />
            <ProductSwitch />
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pt-4 pb-28 sm:px-6 md:pb-10">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              <View />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-white/10 bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {TABS.map((t) => {
          const Icon = t.icon
          const on = t.id === tab
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[9.5px]', on ? 'text-gold' : 'text-white/45')}>
              <Icon size={20} />
              {t.short}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center">
        <motion.span className="absolute inset-0 rounded-full border border-gold/60" animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} style={{ borderTopColor: 'transparent' }} />
        <motion.span className="absolute inset-1.5 rounded-full border border-cyan/60" animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} style={{ borderBottomColor: 'transparent' }} />
        <span className="h-2 w-2 rounded-full bg-violet shadow-[0_0_10px] shadow-violet" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-[0.25em] text-glow-gold text-gold">NEURAL</p>
        {!compact && <p className="text-[10px] tracking-[0.2em] text-white/45">ASTRO SALES ENGINE</p>}
      </div>
    </div>
  )
}
