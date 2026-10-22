import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { store, uid } from '../store/store'
import { INFO_SOURCE_LABEL, type Customer, type InfoSource, type TaggedInfo } from '../store/types'
import { OBSERVATIONS } from '../engine/behavior/observations'
import { Chip, Label } from './ui'

type ListKey = 'interests' | 'needs' | 'wishes'

const LIST_META: Record<ListKey, { label: string; placeholder: string }> = {
  wishes: { label: 'Geäußerte Wünsche', placeholder: 'z. B. planbare Kosten' },
  needs: { label: 'Bedürfnisse / Bedarf', placeholder: 'z. B. weniger Verwaltungsaufwand' },
  interests: { label: 'Interessen', placeholder: 'z. B. Segeln, Technik' },
}

export function FactList({ c, list }: { c: Customer; list: ListKey }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState<InfoSource>('conversation')
  const items = c[list]
  const add = () => {
    if (!text.trim()) return
    const item: TaggedInfo = { id: uid(), text: text.trim(), source, addedAt: new Date().toISOString() }
    store.updateActive((cur) => ({ [list]: [...cur[list], item] }))
    setText('')
  }
  return (
    <div>
      <Label>{LIST_META[list].label}</Label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i.id} className="group inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 py-1 pr-1.5 pl-3 text-sm text-gold" title={`Herkunft: ${INFO_SOURCE_LABEL[i.source]}`}>
            {i.text}
            <span className="font-mono text-[9px] text-gold/50">{INFO_SOURCE_LABEL[i.source].split(' ')[0]}</span>
            <button type="button" aria-label="Entfernen" className="rounded-full p-0.5 text-gold/60 hover:bg-gold/20 hover:text-gold"
              onClick={() => store.updateActive((cur) => ({ [list]: cur[list].filter((x) => x.id !== i.id) }))}><X size={12} /></button>
          </span>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
        <input className="field !py-1.5 text-sm" placeholder={LIST_META[list].placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        <select className="field !w-auto flex-1 !py-1.5 text-xs" value={source} onChange={(e) => setSource(e.target.value as InfoSource)} aria-label="Herkunft">
          {Object.entries(INFO_SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="rounded-xl border border-white/10 px-2.5 text-cyan hover:bg-cyan/10" aria-label="Hinzufügen"><Plus size={16} /></button>
      </form>
    </div>
  )
}

export function ObservationPicker({ c }: { c: Customer }) {
  return (
    <div>
      <Label>Beobachtetes Verhalten (hat Vorrang)</Label>
      <div className="flex flex-wrap gap-1.5">
        {OBSERVATIONS.map((o) => {
          const active = c.observations.includes(o.id)
          return (
            <Chip key={o.id} active={active} onClick={() => store.updateActive((cur) => ({
              observations: active ? cur.observations.filter((x) => x !== o.id) : [...cur.observations, o.id],
            }))}>
              {o.label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}
