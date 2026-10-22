import { motion } from 'motion/react'
import { SIGNS, SIGN_BY_ID } from '../engine/astro/zodiac'
import { ANIMAL_BY_ID } from '../engine/astro/chinese'
import type { AstroProfile } from '../engine/astro/calculate'
import { DIMENSIONS, type DimensionId } from '../engine/symbolic/dimensions'
import type { FusionResult } from '../engine/symbolic/fusion'
import type { MergedProfile } from '../engine/behavior/observations'
import { SYSTEM_LABEL, type SystemId } from '../engine/symbolic/rules'

const R_OUT = 288
const R_ZODIAC_IN = 254
const R_CORE = 96
const R_DIM = 206
const R_LABEL = 230
const R_NODE = 60

/** Wert 0…100 → Radius zwischen Kernzone und Außenkante. */
const valueRadius = (v: number) => R_CORE + ((R_DIM - R_CORE) * v) / 100

const GOLD = '#e8c26b'
const CYAN = '#2ee6d6'
const VIOLET = '#9b7bff'

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [r * Math.cos(a), r * Math.sin(a)] as const
}

function arc(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(r2, a1)
  const [x2, y2] = polar(r2, a2)
  const [x3, y3] = polar(r1, a2)
  const [x4, y4] = polar(r1, a1)
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`
}

const SYSTEM_ORDER: SystemId[] = ['sun', 'moon', 'asc', 'lifePath', 'chinese']
const SYSTEM_COLOR: Record<SystemId, string> = { sun: GOLD, moon: VIOLET, asc: CYAN, lifePath: GOLD, chinese: VIOLET }
const LINK_COLOR = { harmony: GOLD, tension: '#ff6b8b', neutral: CYAN }

interface Props {
  profile: AstroProfile
  fusion: FusionResult
  merged: MergedProfile
  selected: DimensionId | null
  onSelect: (d: DimensionId | null) => void
}

export function ProfileWheel({ profile, fusion, merged, selected, onSelect }: Props) {
  const n = DIMENSIONS.length
  const step = 360 / n
  const hasData = DIMENSIONS.some((d) => merged[d.id].value !== null)

  const points = DIMENSIONS.map((d, i) => {
    const v = merged[d.id].value ?? 50
    return polar(valueRadius(v), i * step)
  })
  const radarD = `M${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z`

  const highlighted: { sign: string; color: string; label: string }[] = []
  if (profile.sun.value) highlighted.push({ sign: profile.sun.value, color: GOLD, label: '☉' })
  if (profile.moon.value) highlighted.push({ sign: profile.moon.value, color: VIOLET, label: '☽' })
  if (profile.asc.value) highlighted.push({ sign: profile.asc.value, color: CYAN, label: 'AC' })

  const nodePos = Object.fromEntries(SYSTEM_ORDER.map((s, i) => [s, polar(R_NODE, i * 72)])) as Record<SystemId, readonly [number, number]>
  const nodeGlyph: Record<SystemId, string> = {
    sun: profile.sun.value ? SIGN_BY_ID[profile.sun.value].glyph : '☉',
    moon: profile.moon.value ? SIGN_BY_ID[profile.moon.value].glyph : '☽',
    asc: profile.asc.value ? SIGN_BY_ID[profile.asc.value].glyph : 'AC',
    lifePath: profile.lifePath.value ? String(profile.lifePath.value) : '#',
    chinese: profile.animal.value ? ANIMAL_BY_ID[profile.animal.value].glyph : '龍',
  }

  return (
    <svg viewBox="-300 -300 600 600" className="h-auto w-full select-none" role="img" aria-label="Symbolisches Kundenprofilrad">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1440" />
          <stop offset="100%" stopColor="#05060f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
          <stop offset="55%" stopColor={VIOLET} stopOpacity="0.22" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0.35" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle r={R_OUT + 8} fill="url(#core)" />

      {/* Äußerer Tierkreis – rotiert langsam */}
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 300, repeat: Infinity, ease: 'linear' }}>
        {SIGNS.map((s, i) => {
          const a1 = i * 30
          const hl = highlighted.filter((h) => h.sign === s.id)
          const [gx, gy] = polar((R_OUT + R_ZODIAC_IN) / 2, a1 + 15)
          return (
            <g key={s.id}>
              <path
                d={arc(R_ZODIAC_IN, R_OUT, a1 + 0.6, a1 + 29.4)}
                fill={hl.length ? hl[0].color : '#ffffff'}
                fillOpacity={hl.length ? 0.2 : 0.025}
                stroke={hl.length ? hl[0].color : '#ffffff'}
                strokeOpacity={hl.length ? 0.9 : 0.08}
                strokeWidth={hl.length ? 1.4 : 1}
              />
              <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize="17" fill={hl.length ? hl[0].color : '#ffffff'} fillOpacity={hl.length ? 1 : 0.45} filter={hl.length ? 'url(#glow)' : undefined}>
                {s.glyph}
              </text>
              {hl.map((h, k) => {
                const [mx, my] = polar(R_ZODIAC_IN - 9, a1 + 8 + k * 7)
                return <text key={h.label} x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize="9" fill={h.color} fontFamily="JetBrains Mono">{h.label}</text>
              })}
            </g>
          )
        })}
      </motion.g>

      {/* Raster */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} r={valueRadius(f * 100)} fill="none" stroke="#fff" strokeOpacity={f === 0.5 ? 0.18 : 0.06} strokeDasharray={f === 0.5 ? '3 5' : undefined} />
      ))}

      {/* Achsen & Labels */}
      {DIMENSIONS.map((d, i) => {
        const [x, y] = polar(R_DIM, i * step)
        const [lx, ly] = polar(R_LABEL, i * step)
        const isSel = selected === d.id
        const m = merged[d.id]
        const color = m.source === 'observed' ? CYAN : m.source === 'symbolic' ? GOLD : '#ffffff'
        return (
          <g key={d.id} className="cursor-pointer" onClick={() => onSelect(isSel ? null : d.id)}>
            <line x1={polar(R_CORE, i * step)[0]} y1={polar(R_CORE, i * step)[1]} x2={x} y2={y} stroke={isSel ? GOLD : '#fff'} strokeOpacity={isSel ? 0.7 : 0.08} />
            <circle cx={lx} cy={ly} r={22} fill="transparent" />
            <text x={lx} y={ly - 5} textAnchor="middle" dominantBaseline="central" fontSize="10.5" fontWeight={600} letterSpacing="0.5" fill={isSel ? GOLD : '#ffffff'} fillOpacity={isSel ? 1 : 0.7}>
              {d.short.toUpperCase()}
            </text>
            <text x={lx} y={ly + 8} textAnchor="middle" dominantBaseline="central" fontSize="10" fontFamily="JetBrains Mono" fill={color} fillOpacity={m.value === null ? 0.3 : 0.95}>
              {m.value === null ? '—' : m.value}{m.source === 'observed' ? ' ◉' : ''}
            </text>
          </g>
        )
      })}

      {/* Radar-Fläche */}
      {hasData && (
        <>
          <motion.path
            initial={false}
            animate={{ d: radarD }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
            fill="url(#radarFill)"
            stroke={GOLD}
            strokeOpacity={0.85}
            strokeWidth={1.6}
            strokeLinejoin="round"
            filter="url(#glow)"
          />
          {DIMENSIONS.map((d, i) => {
            const [x, y] = points[i]
            const m = merged[d.id]
            return (
              <motion.circle
                key={d.id}
                initial={false}
                animate={{ cx: x, cy: y }}
                transition={{ type: 'spring', stiffness: 90, damping: 16 }}
                r={selected === d.id ? 5.5 : 3.5}
                fill={m.source === 'observed' ? CYAN : m.value === null ? '#555' : GOLD}
                stroke="#05060f"
                strokeWidth={1.5}
              />
            )
          })}
        </>
      )}

      {/* Verbindungen zwischen den Analysesystemen */}
      <circle r={R_CORE - 4} fill="#05060f" fillOpacity={0.6} stroke="#fff" strokeOpacity={0.06} />
      {fusion.links.map((l) => {
        const [x1, y1] = nodePos[l.a]
        const [x2, y2] = nodePos[l.b]
        return (
          <motion.line
            key={`${l.a}-${l.b}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={LINK_COLOR[l.relation]}
            strokeWidth={l.relation === 'neutral' ? 0.8 : 1.4 + Math.abs(l.similarity) * 1.5}
            strokeOpacity={0.75}
            strokeDasharray={l.relation === 'tension' ? '4 4' : '2 6'}
            animate={{ strokeDashoffset: [0, l.relation === 'tension' ? 16 : -24] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
        )
      })}

      {SYSTEM_ORDER.map((s) => {
        const [x, y] = nodePos[s]
        const known = fusion.knownSystems.includes(s)
        return (
          <g key={s}>
            <title>{`${SYSTEM_LABEL[s]}: ${fusion.systemSymbols[s] ?? 'unbekannt'}`}</title>
            {known && (
              <motion.circle cx={x} cy={y} r={20} fill="none" stroke={SYSTEM_COLOR[s]} strokeOpacity={0.5}
                animate={{ r: [18, 24, 18], strokeOpacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: SYSTEM_ORDER.indexOf(s) * 0.4 }} />
            )}
            <circle cx={x} cy={y} r={17} fill="#0a0c1d" stroke={known ? SYSTEM_COLOR[s] : '#ffffff'} strokeOpacity={known ? 0.95 : 0.15} strokeWidth={1.4} strokeDasharray={known ? undefined : '3 3'} />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={s === 'lifePath' ? 13 : 15} fontWeight={600} fill={known ? SYSTEM_COLOR[s] : '#ffffff'} fillOpacity={known ? 1 : 0.25}>
              {nodeGlyph[s]}
            </text>
          </g>
        )
      })}

      <text x={0} y={-4} textAnchor="middle" fontSize="20" fontWeight={700} fill="#fff" fontFamily="JetBrains Mono">
        {fusion.knownSystems.length}/5
      </text>
      <text x={0} y={12} textAnchor="middle" fontSize="7.5" letterSpacing="2" fill="#fff" fillOpacity={0.45}>SYSTEME</text>
      {!hasData && (
        <text x={0} y={-R_CORE - 40} textAnchor="middle" fontSize="11" fill="#fff" fillOpacity={0.5}>Noch keine Angaben – Daten eingeben oder manuell wählen</text>
      )}
    </svg>
  )
}
