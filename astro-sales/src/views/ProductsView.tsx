import { motion } from 'motion/react'
import { Package, Plus, Trash2, Star, X, MessageSquareQuote } from 'lucide-react'
import { store, useSettings } from '../store/store'
import type { Product } from '../store/types'
import { Button, Label, Panel, cx } from '../components/ui'
import { BENEFIT_FRAMES, GENERIC_BENEFIT } from '../engine/strategy/phrases'
import { fill } from '../engine/strategy/strategy'
import { capFirst } from '../engine/strategy/address'

export function ProductsView() {
  const s = useSettings()
  const active = s.products.find((p) => p.id === s.activeProductId) ?? s.products[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <Panel title={`Produkte & Angebote (${s.products.length})`} icon={<Package size={14} />}
        action={<Button variant="ghost" className="!px-2.5 !py-1.5" onClick={() => store.addProduct()}><Plus size={14} /> Neu</Button>}>
        <div className="space-y-2.5">
          {s.products.map((p) => {
            const on = p.id === active?.id
            return (
              <motion.button key={p.id} layout type="button" onClick={() => store.setActiveProduct(p.id)}
                className={cx('panel w-full p-4 text-left transition-all hover:border-white/20', on && 'panel-glow')}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{p.name || 'Ohne Namen'}</p>
                  {on && <span className="flex items-center gap-1 rounded-full border border-gold/40 px-2 py-0.5 text-[11px] text-gold"><Star size={10} /> aktiv</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-white/50">{p.description || 'Keine Beschreibung'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {p.price && <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-cyan">{p.price}</span>}
                  {p.audience && <span className="rounded-full bg-violet/10 px-2 py-0.5 text-violet">{p.audience}</span>}
                  <span className="text-white/35">{p.benefits.filter((b) => b.trim()).length} Vorteile</span>
                </div>
              </motion.button>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-white/40">Das aktive Produkt fließt in Strategie, Live-Modus und Akquise-Box ein. Wechseln jederzeit auch oben in der Kopfzeile.</p>
      </Panel>

      {active && <ProductEditor key={active.id} p={active} canDelete={s.products.length > 1} />}
    </div>
  )
}

function ProductEditor({ p, canDelete }: { p: Product; canDelete: boolean }) {
  const s = useSettings()
  const up = (patch: Partial<Product>) => store.updateProduct(p.id, patch)
  const benefits = p.benefits.length ? p.benefits : ['']
  const preview = p.benefits.filter((b) => b.trim()).slice(0, 3)
  const frames = [BENEFIT_FRAMES['structure:high'], BENEFIT_FRAMES['emotion:high'], BENEFIT_FRAMES['security:high']]

  return (
    <div className="space-y-4">
      <Panel glow>
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <label className="block"><Label>Name</Label>
            <input className="field text-lg font-semibold" value={p.name} onChange={(e) => up({ name: e.target.value })} />
          </label>
          <label className="block"><Label>Preis</Label>
            <input className="field" placeholder="z. B. 49 € / Monat" value={p.price} onChange={(e) => up({ price: e.target.value })} />
          </label>
        </div>
        <label className="mt-4 block"><Label>Beschreibung</Label>
          <textarea className="field min-h-20 text-sm" placeholder="Was ist es, in ein bis zwei Sätzen?" value={p.description} onChange={(e) => up({ description: e.target.value })} />
        </label>
        <label className="mt-4 block"><Label>Zielgruppe</Label>
          <input className="field" placeholder="z. B. Familien mit kleinen Kindern" value={p.audience} onChange={(e) => up({ audience: e.target.value })} />
        </label>
        <div className="mt-4">
          <Label>Vorteile – kurze Aussagen aus Kundensicht</Label>
          <div className="space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-xs text-gold/70">{i + 1}</span>
                <input className="field text-sm" placeholder="z. B. spart jede Woche zwei Stunden" value={b}
                  onChange={(e) => up({ benefits: benefits.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button type="button" aria-label="Vorteil entfernen" className="px-1 text-white/30 hover:text-rose"
                  onClick={() => up({ benefits: benefits.filter((_, j) => j !== i) })}><X size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 flex items-center gap-1 text-sm text-cyan hover:text-cyan/80" onClick={() => up({ benefits: [...benefits, ''] })}>
            <Plus size={14} /> Vorteil hinzufügen
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {canDelete && <Button variant="danger" onClick={() => store.deleteProduct(p.id)}><Trash2 size={14} /> Produkt löschen</Button>}
        </div>
      </Panel>

      <Panel title="So klingen die Vorteile im Gespräch" icon={<MessageSquareQuote size={14} />}>
        {preview.length === 0 ? <p className="text-sm text-white/40">Vorteile eintragen, um Beispielsätze zu sehen.</p> : (
          <ul className="space-y-2">
            {preview.map((b, i) => (
              <li key={i} className="rounded-xl bg-white/[0.03] p-3 text-sm text-white/85">
                „{capFirst(fill((frames[i] ?? GENERIC_BENEFIT).replace('{b}', b), p, s.address))}“
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-white/40">Vorschau in der {s.address === 'sie' ? 'Sie' : 'Du'}-Form. In der Strategie wird der Rahmen passend zum Kundenprofil gewählt.</p>
      </Panel>
    </div>
  )
}
