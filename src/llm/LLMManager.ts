import { ILLMProvider } from './BaseLLMProvider'
import { OpenAIProvider } from './providers/OpenAIProvider'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { OllamaProvider } from './providers/OllamaProvider'
import {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderConfig,
  LLMProviderStatus,
  LLMUsageStats,
  LLMError,
  LLMRateLimitError
} from '../types/llm'

export interface LLMManagerConfig {
  defaultProvider?: string
  fallbackProviders?: string[]
  retryAttempts?: number
  retryDelay?: number
  enableFallback?: boolean
}

export class LLMManager {
  private providers: Map<string, ILLMProvider> = new Map()
  private config: LLMManagerConfig
  private activeProvider: string | null = null

  constructor(config: LLMManagerConfig = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      enableFallback: true,
      ...config
    }
  }

  // Provider Management
  public registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.name, provider)
    
    // Set as active if it's the first provider or the default
    if (!this.activeProvider || provider.name === this.config.defaultProvider) {
      this.activeProvider = provider.name
    }
  }

  public unregisterProvider(providerName: string): void {
    this.providers.delete(providerName)
    
    // Switch to another provider if the active one was removed
    if (this.activeProvider === providerName) {
      const remainingProviders = Array.from(this.providers.keys())
      this.activeProvider = remainingProviders.length > 0 ? remainingProviders[0] : null
    }
  }

  public getProvider(providerName: string): ILLMProvider | undefined {
    return this.providers.get(providerName)
  }

  public getActiveProvider(): ILLMProvider | null {
    return this.activeProvider ? this.providers.get(this.activeProvider) || null : null
  }

  public setActiveProvider(providerName: string): boolean {
    if (this.providers.has(providerName)) {
      this.activeProvider = providerName
      return true
    }
    return false
  }

  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  public async getProviderStatuses(): Promise<Record<string, LLMProviderStatus>> {
    const statuses: Record<string, LLMProviderStatus> = {}
    
    const statusPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const status = await provider.getStatus()
        statuses[name] = status
      } catch (error) {
        statuses[name] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date()
        }
      }
    })

    await Promise.all(statusPromises)
    return statuses
  }

  // Core LLM Operations
  public async sendMessage(request: LLMRequest, providerName?: string): Promise<LLMResponse> {
    const provider = this.getProviderForRequest(providerName)
    if (!provider) {
      throw new LLMError('No available provider', 'NO_PROVIDER', 'manager')
    }

    return this.executeWithRetryAndFallback(
      () => provider.sendMessage(request),
      request,
      provider.name
    )
  }

  public async sendMessageStream(
    request: LLMRequest, 
    providerName?: string
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const provider = this.getProviderForRequest(providerName)
    if (!provider) {
      throw new LLMError('No available provider', 'NO_PROVIDER', 'manager')
    }

    // Streaming doesn't support fallback as easily, so we'll just use the primary provider
    yield* provider.sendMessageStream(request)
  }

  // Configuration Management
  public updateProviderConfig(providerName: string, config: Partial<LLMProviderConfig>): boolean {
    const provider = this.providers.get(providerName)
    if (provider) {
      provider.updateConfig(config)
      return true
    }
    return false
  }

  public async validateProviderConfig(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName)
    return provider ? await provider.validateConfig() : false
  }

  // Statistics and Monitoring
  public getUsageStats(providerName?: string): Record<string, LLMUsageStats> {
    const stats: Record<string, LLMUsageStats> = {}
    
    if (providerName) {
      const provider = this.providers.get(providerName)
      if (provider) {
        stats[providerName] = provider.getUsageStats()
      }
    } else {
      for (const [name, provider] of this.providers) {
        stats[name] = provider.getUsageStats()
      }
    }
    
    return stats
  }

  public resetUsageStats(providerName?: string): void {
    if (providerName) {
      const provider = this.providers.get(providerName)
      provider?.resetUsageStats()
    } else {
      for (const provider of this.providers.values()) {
        provider.resetUsageStats()
      }
    }
  }

  public estimateCost(request: LLMRequest, providerName?: string): number {
    const provider = this.getProviderForRequest(providerName)
    return provider ? provider.estimateCost(request) : 0
  }

  // Utility Methods
  public async createProvidersFromConfigs(configs: LLMProviderConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        const provider = this.createProviderFromConfig(config)
        if (provider) {
          this.registerProvider(provider)
        }
      } catch (error) {
        console.error(`Failed to create provider ${config.name}:`, error)
      }
    }
  }

  private createProviderFromConfig(config: LLMProviderConfig): ILLMProvider | null {
    switch (config.name) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'anthropic':
        return new AnthropicProvider(config)
      case 'ollama':
        return new OllamaProvider(config)
      default:
        console.warn(`Unknown provider type: ${config.name}`)
        return null
    }
  }

  private getProviderForRequest(providerName?: string): ILLMProvider | null {
    if (providerName) {
      return this.providers.get(providerName) || null
    }
    return this.getActiveProvider()
  }

  private async executeWithRetryAndFallback<T>(
    operation: () => Promise<T>,
    request: LLMRequest,
    primaryProviderName: string
  ): Promise<T> {
    let lastError: Error | null = null
    
    // Try primary provider with retries
    for (let attempt = 1; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on authentication errors
        if (error instanceof LLMRateLimitError) {
          if (error.retryAfter) {
            await this.delay(error.retryAfter * 1000)
            continue
          }
        }
        
        // Don't retry on authentication errors
        if (error instanceof LLMError && error.code === 'AUTH_ERROR') {
          break
        }
        
        // Wait before retry
        if (attempt < (this.config.retryAttempts || 3)) {
          await this.delay((this.config.retryDelay || 1000) * attempt)
        }
      }
    }

    // Try fallback providers if enabled
    if (this.config.enableFallback && this.config.fallbackProviders) {
      for (const fallbackName of this.config.fallbackProviders) {
        if (fallbackName === primaryProviderName) continue
        
        const fallbackProvider = this.providers.get(fallbackName)
        if (!fallbackProvider) continue
        
        try {
          const isAvailable = await fallbackProvider.isAvailable()
          if (isAvailable) {
            return await fallbackProvider.sendMessage(request)
          }
        } catch (error) {
          // Continue to next fallback
          console.warn(`Fallback provider ${fallbackName} failed:`, error)
        }
      }
    }

    // All attempts failed
    throw lastError || new LLMError('All providers failed', 'ALL_FAILED', 'manager')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Factory methods for common setups
  public static async createWithDefaults(): Promise<LLMManager> {
    const manager = new LLMManager({
      enableFallback: true,
      retryAttempts: 3,
      retryDelay: 1000
    })

    // Register default providers (without API keys - they need to be configured)
    manager.registerProvider(new OpenAIProvider({ apiKey: '' }))
    manager.registerProvider(new AnthropicProvider({ apiKey: '' }))
    manager.registerProvider(new OllamaProvider({}))

    return manager
  }

  public static async createWithConfigs(configs: LLMProviderConfig[]): Promise<LLMManager> {
    const manager = new LLMManager({
      enableFallback: true,
      retryAttempts: 3,
      retryDelay: 1000,
      defaultProvider: configs.find(c => c.enabled)?.name
    })

    await manager.createProvidersFromConfigs(configs)
    return manager
  }
}