import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Package, Plus, Trash2, Star, X, MessageSquareQuote, Library, RefreshCw, Upload } from 'lucide-react'
import { store, useSettings } from '../store/store'
import type { Product } from '../store/types'
import { Button, Label, Panel, cx } from '../components/ui'
import { BENEFIT_FRAMES, GENERIC_BENEFIT } from '../engine/strategy/phrases'
import { fill } from '../engine/strategy/strategy'
import { capFirst } from '../engine/strategy/address'
import { ProductStatus } from '../components/ProductStatus'
import { BUILT_IN_CATALOGS } from '../data/catalogs'
import { jsonTextSource, staticSource, type CatalogUpdateSource } from '../engine/catalog/catalog'

export function ProductsView() {
  const s = useSettings()
  const active = s.products.find((p) => p.id === s.activeProductId) ?? s.products[0]
  const own = s.products.filter((p) => !p.catalog)
  const catalogIds = [...new Set(s.products.filter((p) => p.catalog).map((p) => p.catalog!.catalogId))]

  const card = (p: Product) => {
    const on = p.id === active?.id
    return (
      <motion.button key={p.id} layout type="button" onClick={() => store.setActiveProduct(p.id)}
        className={cx('panel w-full p-4 text-left transition-all hover:border-white/20', on && 'panel-glow')}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{p.name || 'Ohne Namen'}</p>
          {on && <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/40 px-2 py-0.5 text-[11px] text-gold"><Star size={10} /> aktiv</span>}
        </div>
        {p.catalog ? <p className="mt-1 text-xs text-white/50">{p.catalog.category}</p> : <p className="mt-1 line-clamp-2 text-xs text-white/50">{p.description || 'Keine Beschreibung'}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          {p.price && <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-cyan">{p.price}</span>}
          {!p.catalog && p.audience && <span className="rounded-full bg-violet/10 px-2 py-0.5 text-violet">{p.audience}</span>}
          {!p.catalog && <span className="text-white/35">{p.benefits.filter((b) => b.trim()).length} Vorteile</span>}
          <ProductStatus offer={p} />
        </div>
      </motion.button>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
      <div className="space-y-4">
        <Panel title={`Eigene Produkte (${own.length})`} icon={<Package size={14} />}
          action={<Button variant="ghost" className="!px-2.5 !py-1.5" onClick={() => store.addProduct()}><Plus size={14} /> Neu</Button>}>
          <div className="space-y-2.5">{own.map(card)}{!own.length && <p className="text-sm text-white/40">Noch keine eigenen Produkte.</p>}</div>
        </Panel>
        {catalogIds.map((id) => {
          const items = s.products.filter((p) => p.catalog?.catalogId === id)
          const def = BUILT_IN_CATALOGS.find((d) => d.id === id)
          return (
            <Panel key={id} title={`${def?.name ?? id} (${items.length})`} icon={<Library size={14} />}>
              {def && <p className="mb-3 text-xs text-white/45">{def.provider} · Stand {new Date(def.collectedAt).toLocaleDateString('de-DE')}</p>}
              <div className="space-y-2.5">{items.map(card)}</div>
            </Panel>
          )
        })}
        <CatalogTools />
      </div>

      {active && (active.catalog
        ? <CatalogProductView key={active.id} p={active} canDelete={s.products.length > 1} />
        : <ProductEditor key={active.id} p={active} canDelete={s.products.length > 1} />)}
    </div>
  )
}

/** Katalog neu laden oder aus einer JSON-Datei (z. B. offizieller Export) aktualisieren. */
function CatalogTools() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = async (source: CatalogUpdateSource) => {
    try {
      const def = await source.load()
      const { added, updated } = store.importCatalog(def)
      setMsg({ ok: true, text: `${def.name}: ${added} neu, ${updated} aktualisiert.` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Aktualisierung fehlgeschlagen.' })
    }
  }
  return (
    <Panel title="Kataloge aktualisieren" icon={<RefreshCw size={14} />}>
      <div className="flex flex-wrap gap-2">
        {BUILT_IN_CATALOGS.map((d) => (
          <Button key={d.id} variant="ghost" onClick={() => run(staticSource(d))}><RefreshCw size={14} /> {d.name} neu laden</Button>
        ))}
        <Button variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> Aus JSON-Datei</Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) {
            try { await run(jsonTextSource(f.name, await f.text())) } catch { setMsg({ ok: false, text: 'Datei ist kein gültiges JSON.' }) }
          }
          e.target.value = ''
        }} />
      </div>
      {msg && <p className={cx('mt-3 whitespace-pre-line text-xs', msg.ok ? 'text-cyan' : 'text-rose')}>{msg.text}</p>}
      <p className="mt-3 text-xs text-white/40">Aktualisierung ordnet Einträge über ihre SKU zu und überschreibt die Katalogdaten. Eigene Produkte bleiben unverändert. Format: docs/CATALOG.md.</p>
    </Panel>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">{title}</p>
      {children}
    </div>
  )
}

function Missing({ children }: { children: string }) {
  return <p className="text-sm text-gold/80">{children}</p>
}

function CatalogProductView({ p, canDelete }: { p: Product; canDelete: boolean }) {
  const s = useSettings()
  const cat = p.catalog!
  const f = (t: string) => capFirst(fill(t, p, s.address))
  return (
    <div className="space-y-4">
      <Panel glow>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{cat.provider} · {cat.category}</p>
            <h1 className="mt-1 text-2xl font-semibold">{p.name}</h1>
          </div>
          <ProductStatus offer={p} link />
        </div>
        {cat.status.availability === 'historical' && (
          <p className="mt-4 rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-rose">Historischer Eintrag – nicht aktiv anbieten.</p>
        )}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Section title="Preis">
            <p className="text-lg font-semibold text-cyan">{p.price || '—'}</p>
            <p className="text-xs text-white/50">Währung {cat.price.currency} · {cat.price.interval === 'month' ? 'monatlich' : cat.price.interval === 'once' ? 'einmalig' : 'Zahlungsweise nicht angegeben'} · Steuer: {cat.price.taxNote}</p>
          </Section>
          <Section title="Zielgruppe laut Anbieter">
            {cat.targetGroup ? <p className="text-sm">{cat.targetGroup}</p> : <Missing>Nicht angegeben – Details prüfen</Missing>}
          </Section>
          <Section title="Leistungsumfang">
            {cat.scope.length
              ? <ul className="list-disc space-y-1 pl-5 text-sm text-white/85">{cat.scope.map((x) => <li key={x}>{x}</li>)}</ul>
              : <Missing>Nicht belegt – auf der Angebotsseite prüfen</Missing>}
          </Section>
          <Section title="Angebotslink">
            {cat.offerUrl
              ? <a href={cat.offerUrl} target="_blank" rel="noreferrer" className="break-all text-sm text-cyan underline decoration-dotted">{cat.offerUrl}</a>
              : <Missing>Kein offizieller Link belegt</Missing>}
          </Section>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Bedarfsfragen">
          <ul className="space-y-2">{cat.needsQuestions.map((q) => <li key={q} className="rounded-xl bg-white/[0.03] p-2.5 text-sm">„{f(q)}“</li>)}</ul>
        </Panel>
        <Panel title="Sachliche Verkaufsargumente">
          {cat.arguments.length
            ? <ul className="space-y-2">{cat.arguments.map((a) => <li key={a} className="rounded-xl bg-white/[0.03] p-2.5 text-sm">{f(a)}</li>)}</ul>
            : <Missing>Keine belegten Argumente. Die App setzt hier bewusst keine Standard-Vorteile ein.</Missing>}
        </Panel>
        <Panel title="Einwände & transparente Antworten" className="xl:col-span-2">
          <ul className="grid gap-2 md:grid-cols-2">
            {cat.objections.map((o) => (
              <li key={o.objection} className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-sm font-medium text-rose/90">„{f(o.objection)}“</p>
                <p className="mt-1 text-sm text-white/80">→ {f(o.answer)}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Quellen & Prüfstatus" className="xl:col-span-2">
          <ul className="space-y-2">
            {cat.sources.map((src) => (
              <li key={src.label} className="text-sm">
                {src.url ? <a href={src.url} target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted">{src.label}</a> : <span>{src.label}</span>}
                <span className="block text-xs text-white/45">{src.method} · geprüft am {new Date(src.checkedAt).toLocaleDateString('de-DE')}</span>
              </li>
            ))}
          </ul>
          {cat.notes.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gold/80">{cat.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          <div className="mt-4 flex flex-wrap gap-2">
            {canDelete && <Button variant="danger" onClick={() => store.deleteProduct(p.id)}><Trash2 size={14} /> Aus der Liste entfernen</Button>}
          </div>
          <p className="mt-2 text-xs text-white/40">Katalogdaten sind schreibgeschützt und werden über „Kataloge aktualisieren“ gepflegt.</p>
        </Panel>
      </div>
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
