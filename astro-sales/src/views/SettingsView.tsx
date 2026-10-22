import { useState } from 'react'
import { Briefcase, SlidersHorizontal, Cpu, Network, Trash2, RotateCcw, FileJson } from 'lucide-react'
import { store, useSettings } from '../store/store'
import { Button, Label, Panel, Segmented } from '../components/ui'
import { DEFAULT_RULES, SYSTEM_LABEL, validateRules, type SystemId } from '../engine/symbolic/rules'
import type { AIProviderId } from '../ai/provider'
import { neural } from '../integration/neural'

export function SettingsView() {
  const s = useSettings()
  const [json, setJson] = useState(() => JSON.stringify(s.rules, null, 2))
  const [jsonMsg, setJsonMsg] = useState('')
  const [wipe, setWipe] = useState(false)

  const setWeight = (sys: SystemId, v: number) =>
    store.updateSettings({ rules: { ...s.rules, systemWeights: { ...s.rules.systemWeights, [sys]: v } } })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Mein Angebot" icon={<Briefcase size={14} />}>
        <div className="space-y-3">
          <label className="block"><Label>Produkt / Dienstleistung</Label>
            <input className="field" value={s.offer.name} onChange={(e) => store.updateSettings({ offer: { ...s.offer, name: e.target.value } })} />
          </label>
          <label className="block"><Label>Kernnutzen in einem Satz</Label>
            <input className="field" value={s.offer.benefit} onChange={(e) => store.updateSettings({ offer: { ...s.offer, benefit: e.target.value } })} />
          </label>
          <p className="text-xs text-white/40">Wird in Nutzenargumente, Beispielsätze und Akquise-Leitfäden eingesetzt.</p>
        </div>
      </Panel>

      <Panel title="Berechnung" icon={<SlidersHorizontal size={14} />}>
        <div className="space-y-4">
          <div>
            <Label>Chinesischer Jahreswechsel</Label>
            <Segmented value={s.calc.yearBoundary} options={[{ id: 'lunarNewYear', label: 'Mondneujahr' }, { id: 'lichun', label: 'Lichun (Solarterm)' }]}
              onChange={(yearBoundary) => store.updateSettings({ calc: { ...s.calc, yearBoundary } })} />
          </div>
          <label className="block">
            <Label>Zeittoleranz Aszendent: ±{s.calc.timeToleranceMin} min</Label>
            <input type="range" min={0} max={60} step={5} value={s.calc.timeToleranceMin} className="w-full accent-[#2ee6d6]"
              onChange={(e) => store.updateSettings({ calc: { ...s.calc, timeToleranceMin: Number(e.target.value) } })} />
          </label>
          <p className="text-xs text-white/40">Ephemeriden: astronomy-engine (Sonne/Mond tropisch, Äquinoktium des Datums). Aszendent aus scheinbarer Sternzeit und wahrer Ekliptikschiefe. Zeitzonen inkl. historischer Sommerzeit über IANA-Daten.</p>
        </div>
      </Panel>

      <Panel title="Archetypenregeln" icon={<FileJson size={14} />} className="lg:col-span-2">
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <p className="text-xs text-white/50">Gewicht je System in der Fusion</p>
            {(Object.keys(SYSTEM_LABEL) as SystemId[]).map((sys) => (
              <label key={sys} className="block">
                <div className="flex justify-between text-sm"><span>{SYSTEM_LABEL[sys]}</span><span className="font-mono text-gold">{s.rules.systemWeights[sys].toFixed(1)}</span></div>
                <input type="range" min={0} max={2} step={0.1} value={s.rules.systemWeights[sys]} className="w-full accent-[#e8c26b]" onChange={(e) => setWeight(sys, Number(e.target.value))} />
              </label>
            ))}
            <Button variant="ghost" onClick={() => { store.updateSettings({ rules: structuredClone(DEFAULT_RULES) }); setJson(JSON.stringify(DEFAULT_RULES, null, 2)); setJsonMsg('Standardregeln wiederhergestellt.') }}>
              <RotateCcw size={14} /> Standard
            </Button>
          </div>
          <div>
            <p className="mb-2 text-xs text-white/50">Vollständiger Regelsatz (JSON). Jedes Symbol trägt −3 … +3 je Dimension bei.</p>
            <textarea className="field scrollbar-thin h-80 font-mono text-xs" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} />
            <div className="mt-2 flex items-center gap-3">
              <Button onClick={() => {
                try {
                  const parsed = JSON.parse(json)
                  if (!validateRules(parsed)) throw new Error()
                  store.updateSettings({ rules: parsed })
                  setJsonMsg('Regeln übernommen.')
                } catch { setJsonMsg('Ungültiges JSON oder unvollständiger Regelsatz.') }
              }}>Übernehmen</Button>
              <Button variant="ghost" onClick={() => setJson(JSON.stringify(s.rules, null, 2))}>Aktuelle laden</Button>
              {jsonMsg && <span className="text-xs text-cyan">{jsonMsg}</span>}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Optionaler KI-Anschluss" icon={<Cpu size={14} />}>
        <div className="space-y-3">
          <Segmented<AIProviderId> value={s.ai.provider} options={[{ id: 'none', label: 'Aus' }, { id: 'anthropic', label: 'Claude' }]}
            onChange={(provider) => store.updateSettings({ ai: { ...s.ai, provider } })} />
          {s.ai.provider === 'anthropic' && (
            <>
              <label className="block"><Label>API-Schlüssel (nur lokal gespeichert)</Label>
                <input type="password" className="field font-mono" value={s.ai.apiKey} autoComplete="off" onChange={(e) => store.updateSettings({ ai: { ...s.ai, apiKey: e.target.value } })} />
              </label>
              <label className="block"><Label>Modell</Label>
                <input className="field font-mono" value={s.ai.model} onChange={(e) => store.updateSettings({ ai: { ...s.ai, model: e.target.value } })} />
              </label>
            </>
          )}
          <p className="text-xs text-white/40">Standardmäßig aus. Wenn aktiv, werden nur anonymisierte Profilmerkmale und Stichworte übertragen – kein Name, kein Geburtsdatum. Der Schlüssel liegt im Browser-Speicher; nur auf eigenen Geräten verwenden.</p>
        </div>
      </Panel>

      <Panel title="NEURAL-Integration" icon={<Network size={14} />}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.neural.enabled} className="accent-[#9b7bff]" onChange={(e) => store.updateSettings({ neural: { ...s.neural, enabled: e.target.checked } })} />
            Ereignisse an NEURAL senden
          </label>
          <label className="block"><Label>Endpoint (Webhook)</Label>
            <input className="field font-mono" placeholder="http://localhost:8787/events" value={s.neural.endpoint} onChange={(e) => store.updateSettings({ neural: { ...s.neural, endpoint: e.target.value } })} />
          </label>
          <p className="text-xs text-white/40">Aktiver Adapter: <span className="font-mono text-violet">{neural.adapterId}</span>. Übertragen werden nur Ereignistypen und IDs (keine Klartext-Personendaten). Erweiterbar über <code className="text-white/60">src/integration/neural.ts</code>.</p>
        </div>
      </Panel>

      <Panel title="Alle lokalen Daten löschen" icon={<Trash2 size={14} />} className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-white/50">Entfernt alle Kunden, Entwürfe und Einstellungen unwiderruflich aus diesem Browser.</p>
          {wipe ? (
            <>
              <Button variant="danger" onClick={() => { store.wipeAll(); setWipe(false); setJson(JSON.stringify(DEFAULT_RULES, null, 2)) }}>Ja, alles löschen</Button>
              <Button variant="ghost" onClick={() => setWipe(false)}>Abbrechen</Button>
            </>
          ) : <Button variant="danger" onClick={() => setWipe(true)}>Alles löschen</Button>}
        </div>
      </Panel>
    </div>
  )
}
