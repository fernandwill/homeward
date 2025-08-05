import { BaseLLMProvider } from '../BaseLLMProvider'
import {
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderConfig,
  LLMMessage
} from '../../types/llm'

export class OpenAIProvider extends BaseLLMProvider {
  private static readonly DEFAULT_MODELS: LLMModel[] = [
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo',
      contextWindow: 128000,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: true,
      costPer1kTokens: { input: 0.01, output: 0.03 }
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      contextWindow: 8192,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false,
      costPer1kTokens: { input: 0.03, output: 0.06 }
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      contextWindow: 16385,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false,
      costPer1kTokens: { input: 0.0015, output: 0.002 }
    },
    {
      id: 'gpt-3.5-turbo-16k',
      name: 'GPT-3.5 Turbo 16K',
      contextWindow: 16385,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false,
      costPer1kTokens: { input: 0.003, output: 0.004 }
    }
  ]

  constructor(config: Partial<LLMProviderConfig>) {
    const fullConfig: LLMProviderConfig = {
      name: 'openai',
      displayName: 'OpenAI',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      models: OpenAIProvider.DEFAULT_MODELS,
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
    const response = await fetch(`${this._config.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this._config.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(this._config.timeout || 10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  public async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    
    try {
      const payload = this.buildRequestPayload(request, false)
      
      const response = await fetch(`${this._config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this._config.apiKey}`,
          'Content-Type': 'application/json'
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
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        finishReason: data.choices[0]?.finish_reason
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
      
      const response = await fetch(`${this._config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this._config.apiKey}`,
          'Content-Type': 'application/json'
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
            if (data === '[DONE]') {
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

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content || ''
              
              if (delta) {
                totalContent += delta
                yield {
                  content: totalContent,
                  delta,
                  finished: false,
                  model: parsed.model || request.model || this.getDefaultModel().id
                }
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
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.unshift({
        role: 'system',
        content: request.systemPrompt
      })
    }

    return {
      model: request.model || this.getDefaultModel().id,
      messages,
      temperature: request.temperature ?? this._config.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this._config.maxTokens,
      stream,
      user: 'homeward-ide' // For usage tracking
    }
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
      name: 'openai',
      displayName: 'OpenAI',
      apiKey,
      baseUrl: 'https://api.openai.com/v1',
      models: OpenAIProvider.DEFAULT_MODELS,
      enabled: true,
      temperature: 0.7,
      timeout: 30000,
      retryAttempts: 3
    }
  }
}