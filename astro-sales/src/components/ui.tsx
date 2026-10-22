import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Source } from '../engine/astro/calculate'
import { BASIS_LABEL, type Basis } from '../engine/strategy/strategy'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Panel({ children, className, glow, title, icon, action }: {
  children: ReactNode
  className?: string
  glow?: boolean
  title?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={cx('panel p-4 sm:p-5', glow && 'panel-glow', className)}
    >
      {title && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            {icon && <span className="text-cyan">{icon}</span>}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  )
}

export function Chip({ active, onClick, children, tone = 'cyan', className, title }: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  tone?: 'cyan' | 'gold' | 'violet' | 'rose'
  className?: string
  title?: string
}) {
  const tones = {
    cyan: 'border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_16px_-4px] shadow-cyan/60',
    gold: 'border-gold/60 bg-gold/15 text-gold shadow-[0_0_16px_-4px] shadow-gold/60',
    violet: 'border-violet/60 bg-violet/15 text-violet shadow-[0_0_16px_-4px] shadow-violet/60',
    rose: 'border-rose/60 bg-rose/15 text-rose shadow-[0_0_16px_-4px] shadow-rose/60',
  }
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        'rounded-full border px-3 py-1.5 text-sm transition-all duration-200 active:scale-95',
        active ? tones[tone] : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="relative inline-flex rounded-full border border-white/10 bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cx('relative z-10 rounded-full px-3 py-1.5 text-sm transition-colors sm:px-4', value === o.id ? 'text-ink' : 'text-white/60 hover:text-white')}
        >
          {value === o.id && (
            <motion.span layoutId={`seg-${options.map((x) => x.id).join()}`} className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-gold to-cyan" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}

const SOURCE_STYLE: Record<Source, string> = {
  auto: 'text-cyan border-cyan/40',
  manual: 'text-gold border-gold/40',
  unknown: 'text-white/40 border-white/15',
}
const SOURCE_LABEL: Record<Source, string> = { auto: 'berechnet', manual: 'manuell', unknown: 'unbekannt' }

export function SourceBadge({ source }: { source: Source }) {
  return <span className={cx('rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', SOURCE_STYLE[source])}>{SOURCE_LABEL[source]}</span>
}

const BASIS_STYLE: Record<Basis, string> = {
  stated: 'text-gold border-gold/50 bg-gold/10',
  reaction: 'text-white border-cyan/80 bg-cyan/25',
  observed: 'text-cyan border-cyan/50 bg-cyan/10',
  symbolic: 'text-violet border-violet/50 bg-violet/10',
  general: 'text-white/50 border-white/15',
}

export function BasisBadge({ basis }: { basis: Basis }) {
  return <span className={cx('shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', BASIS_STYLE[basis])}>{BASIS_LABEL[basis]}</span>
}

export function Button({ children, onClick, variant = 'primary', className, disabled, type = 'button' }: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const v = {
    primary: 'bg-gradient-to-r from-gold via-gold to-cyan text-ink font-semibold shadow-[0_0_24px_-6px] shadow-gold/70 hover:brightness-110',
    ghost: 'border border-white/15 bg-white/[0.03] text-white/80 hover:border-white/30 hover:text-white',
    danger: 'border border-rose/40 bg-rose/10 text-rose hover:bg-rose/20',
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition-all active:scale-[0.97] disabled:opacity-40', v[variant], className)}>
      {children}
    </button>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">{children}</span>
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-white/40">{children}</p>
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
