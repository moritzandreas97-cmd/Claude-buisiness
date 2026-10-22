/**
 * Optionaler KI-Anschluss. Standardmäßig deaktiviert – die App funktioniert
 * vollständig regelbasiert. Weitere Anbieter (z. B. das eigene NEURAL-System)
 * implementieren einfach `AIProvider`.
 */
export interface AIRequest {
  system: string
  prompt: string
}

export interface AIProvider {
  id: string
  label: string
  complete(req: AIRequest): Promise<string>
}

export type AIProviderId = 'none' | 'anthropic' | 'neural'

export interface AIConfig {
  provider: AIProviderId
  /** Wird nur lokal im Browser gespeichert. */
  apiKey: string
  model: string
}

export const DEFAULT_AI: AIConfig = { provider: 'none', apiKey: '', model: 'claude-opus-5-5' }

class AnthropicProvider implements AIProvider {
  id = 'anthropic'
  label = 'Claude (Anthropic API)'
  constructor(private cfg: AIConfig) {}

  async complete(req: AIRequest): Promise<string> {
    // Lazy import: das SDK wird nur geladen, wenn der KI-Anschluss genutzt wird.
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: this.cfg.apiKey, dangerouslyAllowBrowser: true })
    try {
      const res = await client.beta.messages.create({
        model: this.cfg.model || DEFAULT_AI.model,
        max_tokens: 4000,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: req.system,
        messages: [{ role: 'user', content: req.prompt }],
      })
      if (res.stop_reason === 'refusal') throw new Error('Die Anfrage wurde vom Modell abgelehnt.')
      return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new Error('API-Schlüssel ungültig.')
      if (err instanceof Anthropic.RateLimitError) throw new Error('Rate-Limit erreicht – bitte später erneut versuchen.')
      if (err instanceof Anthropic.APIError) throw new Error(`API-Fehler ${err.status}: ${err.message}`)
      throw err
    }
  }
}

export function createProvider(cfg: AIConfig): AIProvider | null {
  if (cfg.provider === 'anthropic' && cfg.apiKey) return new AnthropicProvider(cfg)
  return null
}

export const AI_SYSTEM_PROMPT = `Du bist ein erfahrener, ethischer Vertriebscoach.
Du formulierst respektvolle, natürliche deutsche Gesprächssätze (Sie-Form).
Astrologische Angaben sind symbolische Hypothesen, keine Fakten – beobachtetes Verhalten
und geäußerte Wünsche haben immer Vorrang. Keine Manipulation, kein künstlicher Druck,
keine Ausnutzung persönlicher Schwächen. Ein Nein wird respektiert.`
