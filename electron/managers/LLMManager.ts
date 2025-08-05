import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

// Import the LLM system from the renderer process types
interface LLMProviderConfig {
  name: string
  displayName: string
  apiKey: string
  baseUrl?: string
  models: any[]
  enabled: boolean
  temperature?: number
  timeout?: number
  retryAttempts?: number
}

interface LLMRequest {
  messages: Array<{ role: string; content: string }>
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  systemPrompt?: string
}

interface LLMResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

export class LLMManager {
  private configPath: string
  private providers: Map<string, LLMProviderConfig> = new Map()
  private activeProvider: string | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = join(userDataPath, 'llm-config.json')
    this.loadConfig()
  }

  // Configuration Management
  public async loadConfig(): Promise<void> {
    try {
      const configExists = await fs.access(this.configPath).then(() => true).catch(() => false)
      
      if (configExists) {
        const content = await fs.readFile(this.configPath, 'utf-8')
        const config = JSON.parse(content)
        
        this.activeProvider = config.activeProvider || null
        
        if (config.providers && Array.isArray(config.providers)) {
          this.providers.clear()
          for (const provider of config.providers) {
            this.providers.set(provider.name, provider)
          }
        }
      } else {
        // Create default configuration
        await this.createDefaultConfig()
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error)
      await this.createDefaultConfig()
    }
  }

  public async saveConfig(): Promise<void> {
    try {
      const config = {
        activeProvider: this.activeProvider,
        providers: Array.from(this.providers.values()),
        lastUpdated: new Date().toISOString()
      }

      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error('Failed to save LLM config:', error)
    }
  }

  private async createDefaultConfig(): Promise<void> {
    // Create default providers (without API keys)
    const defaultProviders: LLMProviderConfig[] = [
      {
        name: 'openai',
        displayName: 'OpenAI',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        models: [
          {
            id: 'gpt-4-turbo-preview',
            name: 'GPT-4 Turbo',
            contextWindow: 128000,
            maxTokens: 4096,
            supportsStreaming: true
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            contextWindow: 16385,
            maxTokens: 4096,
            supportsStreaming: true
          }
        ],
        enabled: false,
        temperature: 0.7,
        timeout: 30000,
        retryAttempts: 3
      },
      {
        name: 'anthropic',
        displayName: 'Anthropic',
        apiKey: '',
        baseUrl: 'https://api.anthropic.com/v1',
        models: [
          {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            contextWindow: 200000,
            maxTokens: 4096,
            supportsStreaming: true
          },
          {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            contextWindow: 200000,
            maxTokens: 4096,
            supportsStreaming: true
          }
        ],
        enabled: false,
        temperature: 0.7,
        timeout: 30000,
        retryAttempts: 3
      },
      {
        name: 'ollama',
        displayName: 'Ollama (Local)',
        apiKey: '',
        baseUrl: 'http://localhost:11434',
        models: [
          {
            id: 'llama2',
            name: 'Llama 2',
            contextWindow: 4096,
            maxTokens: 2048,
            supportsStreaming: true
          },
          {
            id: 'codellama',
            name: 'Code Llama',
            contextWindow: 16384,
            maxTokens: 4096,
            supportsStreaming: true
          }
        ],
        enabled: false,
        temperature: 0.7,
        timeout: 60000,
        retryAttempts: 2
      }
    ]

    for (const provider of defaultProviders) {
      this.providers.set(provider.name, provider)
    }

    await this.saveConfig()
  }

  // Provider Management
  public getProviders(): LLMProviderConfig[] {
    return Array.from(this.providers.values())
  }

  public getProvider(name: string): LLMProviderConfig | undefined {
    return this.providers.get(name)
  }

  public async updateProvider(name: string, config: Partial<LLMProviderConfig>): Promise<boolean> {
    const existing = this.providers.get(name)
    if (!existing) return false

    const updated = { ...existing, ...config }
    this.providers.set(name, updated)
    await this.saveConfig()
    return true
  }

  public async addProvider(config: LLMProviderConfig): Promise<void> {
    this.providers.set(config.name, config)
    await this.saveConfig()
  }

  public async removeProvider(name: string): Promise<boolean> {
    const removed = this.providers.delete(name)
    if (removed) {
      if (this.activeProvider === name) {
        this.activeProvider = null
      }
      await this.saveConfig()
    }
    return removed
  }

  public getActiveProvider(): string | null {
    return this.activeProvider
  }

  public async setActiveProvider(name: string): Promise<boolean> {
    if (this.providers.has(name)) {
      this.activeProvider = name
      await this.saveConfig()
      return true
    }
    return false
  }

  public getEnabledProviders(): LLMProviderConfig[] {
    return Array.from(this.providers.values()).filter(p => p.enabled)
  }

  // Provider Status Checking
  public async checkProviderStatus(name: string): Promise<{ available: boolean; error?: string }> {
    const provider = this.providers.get(name)
    if (!provider) {
      return { available: false, error: 'Provider not found' }
    }

    if (!provider.enabled) {
      return { available: false, error: 'Provider disabled' }
    }

    try {
      // Basic connectivity check based on provider type
      switch (provider.name) {
        case 'openai':
          return await this.checkOpenAIStatus(provider)
        case 'anthropic':
          return await this.checkAnthropicStatus(provider)
        case 'ollama':
          return await this.checkOllamaStatus(provider)
        default:
          return { available: false, error: 'Unknown provider type' }
      }
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async checkOpenAIStatus(provider: LLMProviderConfig): Promise<{ available: boolean; error?: string }> {
    if (!provider.apiKey) {
      return { available: false, error: 'API key not configured' }
    }

    try {
      const response = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(provider.timeout || 10000)
      })

      if (response.ok) {
        return { available: true }
      } else {
        return { available: false, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      return { available: false, error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  private async checkAnthropicStatus(provider: LLMProviderConfig): Promise<{ available: boolean; error?: string }> {
    if (!provider.apiKey) {
      return { available: false, error: 'API key not configured' }
    }

    try {
      // Anthropic doesn't have a simple health check, so we'll make a minimal request
      const response = await fetch(`${provider.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': provider.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: provider.models[0]?.id || 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        }),
        signal: AbortSignal.timeout(provider.timeout || 10000)
      })

      // 400 is expected for minimal request, anything else might be an error
      if (response.ok || response.status === 400) {
        return { available: true }
      } else {
        return { available: false, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      return { available: false, error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  private async checkOllamaStatus(provider: LLMProviderConfig): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${provider.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(provider.timeout || 10000)
      })

      if (response.ok) {
        return { available: true }
      } else {
        return { available: false, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      return { available: false, error: error instanceof Error ? error.message : 'Ollama not running' }
    }
  }

  // Utility Methods
  public async validateApiKey(providerName: string, apiKey: string): Promise<boolean> {
    const provider = this.providers.get(providerName)
    if (!provider) return false

    const tempProvider = { ...provider, apiKey }
    
    try {
      switch (providerName) {
        case 'openai':
          const result = await this.checkOpenAIStatus(tempProvider)
          return result.available
        case 'anthropic':
          const anthropicResult = await this.checkAnthropicStatus(tempProvider)
          return anthropicResult.available
        case 'ollama':
          // Ollama doesn't use API keys
          return true
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  public getProviderModels(providerName: string): any[] {
    const provider = this.providers.get(providerName)
    return provider?.models || []
  }

  public async refreshOllamaModels(): Promise<void> {
    const provider = this.providers.get('ollama')
    if (!provider) return

    try {
      const response = await fetch(`${provider.baseUrl}/api/tags`)
      if (response.ok) {
        const data = await response.json()
        if (data.models && Array.isArray(data.models)) {
          const models = data.models.map((model: any) => ({
            id: model.name,
            name: model.name,
            contextWindow: 4096, // Default
            maxTokens: 2048,
            supportsStreaming: true
          }))
          
          provider.models = models
          await this.saveConfig()
        }
      }
    } catch (error) {
      console.error('Failed to refresh Ollama models:', error)
    }
  }
}