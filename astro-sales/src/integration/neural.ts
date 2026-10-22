/**
 * Integrationsschicht für das spätere NEURAL-System.
 *
 * - Ein typisierter Event-Bus veröffentlicht Domänenereignisse der App.
 * - Ein Adapter-Interface beschreibt, wie NEURAL angebunden wird
 *   (z. B. per HTTP-Webhook, WebSocket oder lokaler Bridge).
 * - Standardmäßig ist nur der No-op-Adapter aktiv: Es verlassen KEINE Daten das Gerät.
 */
import type { LiveSignal } from '../engine/strategy/live'

export type NeuralEvent =
  | { type: 'customer.saved'; customerId: string }
  | { type: 'customer.deleted'; customerId: string }
  | { type: 'live.signal'; customerId: string | null; signal: LiveSignal }
  | { type: 'acquisition.planned'; audience: string; channel: string; goal: string }

export interface NeuralAdapter {
  id: string
  /** Wird für jedes Ereignis aufgerufen; Fehler dürfen die App nicht blockieren. */
  publish(event: NeuralEvent & { at: string }): Promise<void>
}

export interface NeuralConfig {
  enabled: boolean
  endpoint: string
}

export const DEFAULT_NEURAL: NeuralConfig = { enabled: false, endpoint: '' }

const noopAdapter: NeuralAdapter = { id: 'noop', publish: async () => {} }

/** Sendet nur IDs und Ereignistypen – keine Klartext-Personendaten. */
export function webhookAdapter(endpoint: string): NeuralAdapter {
  return {
    id: 'webhook',
    async publish(event) {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      })
    },
  }
}

type Listener = (e: NeuralEvent & { at: string }) => void

class NeuralBus {
  private adapter: NeuralAdapter = noopAdapter
  private listeners = new Set<Listener>()

  configure(cfg: NeuralConfig) {
    this.adapter = cfg.enabled && cfg.endpoint ? webhookAdapter(cfg.endpoint) : noopAdapter
  }

  on(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit(event: NeuralEvent) {
    const stamped = { ...event, at: new Date().toISOString() }
    this.listeners.forEach((l) => l(stamped))
    this.adapter.publish(stamped).catch(() => {
      /* NEURAL nicht erreichbar – App läuft lokal weiter */
    })
  }

  get adapterId() {
    return this.adapter.id
  }
}

export const neural = new NeuralBus()
