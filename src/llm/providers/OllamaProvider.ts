import { BaseLLMProvider } from '../BaseLLMProvider'
import {
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderConfig,
  LLMMessage
} from '../../types/llm'

export class OllamaProvider extends BaseLLMProvider {
  private static readonly DEFAULT_MODELS: LLMModel[] = [
    {
      id: 'llama2',
      name: 'Llama 2',
      contextWindow: 4096,
      maxTokens: 2048,
      supportsStreaming: true,
      supportsImages: false
    },
    {
      id: 'codellama',
      name: 'Code Llama',
      contextWindow: 16384,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false
    },
    {
      id: 'mistral',
      name: 'Mistral',
      contextWindow: 8192,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false
    },
    {
      id: 'neural-chat',
      name: 'Neural Chat',
      contextWindow: 8192,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false
    },
    {
      id: 'starling-lm',
      name: 'Starling LM',
      contextWindow: 8192,
      maxTokens: 4096,
      supportsStreaming: true,
      supportsImages: false
    }
  ]

  constructor(config: Partial<LLMProviderConfig>) {
    const fullConfig: LLMProviderConfig = {
      name: 'ollama',
      displayName: 'Ollama (Local)',
      apiKey: '', // Not needed for local models
      baseUrl: 'http://localhost:11434',
      models: OllamaProvider.DEFAULT_MODELS,
      enabled: true,
      temperature: 0.7,
      timeout: 60000, // Local models can be slower
      retryAttempts: 2,
      ...config
    }

    super(fullConfig)
  }

  public async validateConfig(): Promise<boolean> {
    try {
      await this.checkAvailability()
      return true
    } catch (error) {
      return false
    }
  }

  protected async checkAvailability(): Promise<void> {
    const response = await fetch(`${this._config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(this._config.timeout || 10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Update available models based on what's actually installed
    const data = await response.json()
    if (data.models && Array.isArray(data.models)) {
      this.updateAvailableModels(data.models)
    }
  }

  public async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    
    try {
      const payload = this.buildRequestPayload(request, false)
      
      const response = await fetch(`${this._config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this._config.timeout || 60000)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime
      
      const result: LLMResponse = {
        content: data.message?.content || '',
        model: data.model || request.model || this.getDefaultModel().id,
        usage: data.prompt_eval_count || data.eval_count ? {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        } : undefined,
        finishReason: data.done ? 'stop' : undefined
      }

      // Update usage stats (no cost for local models)
      this.updateUsageStats(
        result.usage?.totalTokens || 0,
        0, // No cost for local models
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
      
      const response = await fetch(`${this._config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this._config.timeout || 120000)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
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
            if (!trimmed) continue

            try {
              const parsed = JSON.parse(trimmed)
              const delta = parsed.message?.content || ''
              
              if (delta) {
                totalContent += delta
                yield {
                  content: totalContent,
                  delta,
                  finished: false,
                  model: parsed.model || request.model || this.getDefaultModel().id
                }
              }

              if (parsed.done) {
                const responseTime = Date.now() - startTime
                const totalTokens = (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0)
                
                this.updateUsageStats(totalTokens, 0, responseTime, false)
                
                yield {
                  content: totalContent,
                  delta: '',
                  finished: true,
                  model: parsed.model || request.model || this.getDefaultModel().id
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

    const payload: any = {
      model: request.model || this.getDefaultModel().id,
      messages,
      stream,
      options: {}
    }

    if (request.temperature !== undefined) {
      payload.options.temperature = request.temperature
    } else if (this._config.temperature !== undefined) {
      payload.options.temperature = this._config.temperature
    }

    if (request.maxTokens) {
      payload.options.num_predict = request.maxTokens
    }

    return payload
  }

  private updateAvailableModels(installedModels: any[]): void {
    const availableModels: LLMModel[] = installedModels.map(model => {
      const existingModel = this._config.models.find(m => m.id === model.name)
      
      return existingModel || {
        id: model.name,
        name: model.name,
        contextWindow: 4096, // Default, could be parsed from model details
        maxTokens: 2048,
        supportsStreaming: true,
        supportsImages: false
      }
    })

    // Update the config with available models
    this._config.models = availableModels
  }

  public async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this._config.baseUrl}/api/tags`)
      if (!response.ok) return []
      
      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch (error) {
      return []
    }
  }

  public async pullModel(modelName: string): Promise<void> {
    const response = await fetch(`${this._config.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: modelName })
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`)
    }

    // This is a streaming response, but for simplicity we'll just wait for completion
    const reader = response.body?.getReader()
    if (reader) {
      try {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } finally {
        reader.releaseLock()
      }
    }
  }

  public static createDefaultConfig(baseUrl?: string): LLMProviderConfig {
    return {
      name: 'ollama',
      displayName: 'Ollama (Local)',
      apiKey: '',
      baseUrl: baseUrl || 'http://localhost:11434',
      models: OllamaProvider.DEFAULT_MODELS,
      enabled: true,
      temperature: 0.7,
      timeout: 60000,
      retryAttempts: 2
    }
  }
}