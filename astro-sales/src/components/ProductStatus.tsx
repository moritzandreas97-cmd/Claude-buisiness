import { ExternalLink } from 'lucide-react'
import type { OfferContext } from '../engine/strategy/strategy'
import { AVAILABILITY_LABEL, DETAIL_LABEL } from '../engine/catalog/types'
import { cx } from './ui'

/** Kennzeichnung eines Katalogangebots: Testdaten, Prüfstatus, Verfügbarkeit. */
export function ProductStatus({ offer, link, className }: { offer: OfferContext; link?: boolean; className?: string }) {
  const cat = offer.catalog
  if (!cat) return null
  const avail = cat.status.availability
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-1.5', className)}>
      {cat.isTestData && <Badge tone="quiet">Testdaten</Badge>}
      <Badge tone={cat.status.details === 'check' ? 'warn' : 'ok'}>{DETAIL_LABEL[cat.status.details]}</Badge>
      <Badge tone={avail === 'verified' ? 'ok' : avail === 'historical' ? 'stop' : 'warn'}>{AVAILABILITY_LABEL[avail]}</Badge>
      {link && cat.offerUrl && (
        <a href={cat.offerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan underline decoration-dotted hover:text-cyan/80">
          Angebotsseite <ExternalLink size={11} />
        </a>
      )}
    </span>
  )
}

function Badge({ tone, children }: { tone: 'quiet' | 'warn' | 'ok' | 'stop'; children: string }) {
  const cls = {
    quiet: 'border-white/20 text-white/60',
    warn: 'border-gold/50 bg-gold/10 text-gold',
    ok: 'border-cyan/50 bg-cyan/10 text-cyan',
    stop: 'border-rose/50 bg-rose/10 text-rose',
  }[tone]
  return <span className={cx('rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap', cls)}>{children}</span>
}
