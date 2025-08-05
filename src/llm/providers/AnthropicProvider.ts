import { BaseLLMProvider } from '../BaseLLMProvider'
import {
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderConfig,
  LLMMessage
} from '../../types/llm'

export class AnthropicProvider extends BaseLLMProvider {
  private static readonly DEFAULT_MODELS: LLMModel[] = [
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      contextWindow: 200000,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: true,
      costPer1kTokens: { input: 0.015, output: 0.075 }
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      contextWindow: 200000,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: true,
      costPer1kTokens: { input: 0.003, output: 0.015 }
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      contextWindow: 200000,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: true,
      costPer1kTokens: { input: 0.00025, output: 0.00125 }
    },
    {
      id: 'claude-2.1',
      name: 'Claude 2.1',
      contextWindow: 200000,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false,
      costPer1kTokens: { input: 0.008, output: 0.024 }
    }
  ]

  constructor(config: Partial<LLMProviderConfig>) {
    const fullConfig: LLMProviderConfig = {
      name: 'anthropic',
      displayName: 'Anthropic',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      models: AnthropicProvider.DEFAULT_MODELS,
      enabled: true,
      temperature: 0.7,
      timeout: 30000,
      retryAttempts: 3,
      ...config
    }

    super(fullConfig)
  }

  public async validateConfig(): Promise<boolean> {
    if (!this._config.apiKey) {
      return false
    }

    try {
      await this.checkAvailability()
      return true
    } catch (error) {
      return false
    }
  }

  protected async checkAvailability(): Promise<void> {
    // Anthropic doesn't have a simple health check endpoint, so we'll make a minimal request
    const response = await fetch(`${this._config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this._config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.getDefaultModel().id,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      signal: AbortSignal.timeout(this._config.timeout || 10000)
    })

    if (!response.ok && response.status !== 400) {
      // 400 is expected for minimal request, anything else is an error
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  public async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    
    try {
      const payload = this.buildRequestPayload(request, false)
      
      const response = await fetch(`${this._config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this._config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this._config.timeout || 30000)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime
      
      const result: LLMResponse = {
        content: data.content?.[0]?.text || '',
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        } : undefined,
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
      }

      // Update usage stats
      const cost = this.calculateCost(result.usage, request.model)
      this.updateUsageStats(
        result.usage?.totalTokens || 0,
        cost,
        responseTime,
        false
      )

      return result
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateUsageStats(0, 0, responseTime, true)
      this.handleError(error, 'sendMessage')
    }
  }

  public async* sendMessageStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const startTime = Date.now()
    let totalContent = ''
    
    try {
      const payload = this.buildRequestPayload(request, true)
      
      const response = await fetch(`${this._config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this._config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this._config.timeout || 60000)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(6)
            
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || ''
                
                if (delta) {
                  totalContent += delta
                  yield {
                    content: totalContent,
                    delta,
                    finished: false,
                    model: request.model || this.getDefaultModel().id
                  }
                }
              } else if (parsed.type === 'message_stop') {
                const responseTime = Date.now() - startTime
                const estimatedTokens = this.estimateTokens(totalContent)
                const cost = this.calculateCost(
                  { promptTokens: 0, completionTokens: estimatedTokens, totalTokens: estimatedTokens },
                  request.model
                )
                
                this.updateUsageStats(estimatedTokens, cost, responseTime, false)
                
                yield {
                  content: totalContent,
                  delta: '',
                  finished: true,
                  model: request.model || this.getDefaultModel().id
                }
                return
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateUsageStats(0, 0, responseTime, true)
      this.handleError(error, 'sendMessageStream')
    }
  }

  private buildRequestPayload(request: LLMRequest, stream: boolean): any {
    // Anthropic requires separating system messages from user/assistant messages
    const systemMessages = request.messages.filter(msg => msg.role === 'system')
    const conversationMessages = request.messages.filter(msg => msg.role !== 'system')

    const systemPrompt = [
      request.systemPrompt,
      ...systemMessages.map(msg => msg.content)
    ].filter(Boolean).join('\n\n')

    const messages = conversationMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const payload: any = {
      model: request.model || this.getDefaultModel().id,
      messages,
      max_tokens: request.maxTokens ?? this._config.maxTokens ?? 4096,
      stream
    }

    if (systemPrompt) {
      payload.system = systemPrompt
    }

    if (request.temperature !== undefined) {
      payload.temperature = request.temperature
    } else if (this._config.temperature !== undefined) {
      payload.temperature = this._config.temperature
    }

    return payload
  }

  private calculateCost(usage: any, modelId?: string): number {
    if (!usage) return 0

    const model = this.getModelById(modelId || this.getDefaultModel().id)
    if (!model?.costPer1kTokens) return 0

    const inputCost = (usage.promptTokens / 1000) * model.costPer1kTokens.input
    const outputCost = (usage.completionTokens / 1000) * model.costPer1kTokens.output

    return inputCost + outputCost
  }

  public static createDefaultConfig(apiKey: string): LLMProviderConfig {
    return {
      name: 'anthropic',
      displayName: 'Anthropic',
      apiKey,
      baseUrl: 'https://api.anthropic.com/v1',
      models: AnthropicProvider.DEFAULT_MODELS,
      enabled: true,
      temperature: 0.7,
      timeout: 30000,
      retryAttempts: 3
    }
  }
}