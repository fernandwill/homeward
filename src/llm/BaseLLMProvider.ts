import {
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderConfig,
  LLMProviderStatus,
  LLMUsageStats,
  LLMError,
  LLMRateLimitError,
  LLMAuthenticationError,
  LLMNetworkError
} from '../types/llm'

export interface ILLMProvider {
  readonly name: string
  readonly displayName: string
  readonly models: LLMModel[]
  readonly config: LLMProviderConfig
  
  // Core functionality
  isAvailable(): Promise<boolean>
  getStatus(): Promise<LLMProviderStatus>
  sendMessage(request: LLMRequest): Promise<LLMResponse>
  sendMessageStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown>
  
  // Configuration
  updateConfig(config: Partial<LLMProviderConfig>): void
  validateConfig(): Promise<boolean>
  
  // Utility
  getUsageStats(): LLMUsageStats
  resetUsageStats(): void
  estimateCost(request: LLMRequest): number
}

export abstract class BaseLLMProvider implements ILLMProvider {
  protected _config: LLMProviderConfig
  protected _usageStats: LLMUsageStats
  protected _lastStatus: LLMProviderStatus | null = null

  constructor(config: LLMProviderConfig) {
    this._config = { ...config }
    this._usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      errorRate: 0
    }
  }

  get name(): string {
    return this._config.name
  }

  get displayName(): string {
    return this._config.displayName
  }

  get models(): LLMModel[] {
    return this._config.models
  }

  get config(): LLMProviderConfig {
    return { ...this._config }
  }

  public updateConfig(config: Partial<LLMProviderConfig>): void {
    this._config = { ...this._config, ...config }
    this._lastStatus = null // Reset status when config changes
  }

  public async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return status.available
    } catch (error) {
      return false
    }
  }

  public async getStatus(): Promise<LLMProviderStatus> {
    if (this._lastStatus && this.isStatusFresh()) {
      return this._lastStatus
    }

    const startTime = Date.now()
    
    try {
      await this.checkAvailability()
      const responseTime = Date.now() - startTime
      
      this._lastStatus = {
        available: true,
        lastChecked: new Date(),
        responseTime
      }
    } catch (error) {
      this._lastStatus = {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      }
    }

    return this._lastStatus
  }

  public getUsageStats(): LLMUsageStats {
    return { ...this._usageStats }
  }

  public resetUsageStats(): void {
    this._usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      errorRate: 0
    }
  }

  public estimateCost(request: LLMRequest): number {
    const model = this.getModelById(request.model || this.getDefaultModel().id)
    if (!model?.costPer1kTokens) return 0

    // Rough estimation - in practice, you'd use a tokenizer
    const estimatedInputTokens = this.estimateTokens(
      request.messages.map(m => m.content).join(' ')
    )
    const estimatedOutputTokens = request.maxTokens || model.maxTokens * 0.1

    const inputCost = (estimatedInputTokens / 1000) * model.costPer1kTokens.input
    const outputCost = (estimatedOutputTokens / 1000) * model.costPer1kTokens.output

    return inputCost + outputCost
  }

  // Abstract methods that must be implemented by concrete providers
  public abstract sendMessage(request: LLMRequest): Promise<LLMResponse>
  public abstract sendMessageStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown>
  public abstract validateConfig(): Promise<boolean>
  protected abstract checkAvailability(): Promise<void>

  // Helper methods
  protected getModelById(modelId: string): LLMModel | undefined {
    return this._config.models.find(m => m.id === modelId)
  }

  protected getDefaultModel(): LLMModel {
    return this._config.models[0]
  }

  protected estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  protected updateUsageStats(
    tokens: number,
    cost: number,
    responseTime: number,
    isError: boolean = false
  ): void {
    const totalRequests = this._usageStats.totalRequests + 1
    const totalErrors = Math.round(this._usageStats.errorRate * this._usageStats.totalRequests)
    
    this._usageStats = {
      totalRequests,
      totalTokens: this._usageStats.totalTokens + tokens,
      totalCost: this._usageStats.totalCost + cost,
      averageResponseTime: (
        (this._usageStats.averageResponseTime * this._usageStats.totalRequests + responseTime) /
        totalRequests
      ),
      errorRate: (totalErrors + (isError ? 1 : 0)) / totalRequests
    }
  }

  protected handleError(error: any, context: string): never {
    console.error(`${this.name} error in ${context}:`, error)

    if (error.response?.status === 401) {
      throw new LLMAuthenticationError(this.name)
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after']
      throw new LLMRateLimitError(this.name, retryAfter ? parseInt(retryAfter) : undefined)
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new LLMNetworkError(this.name, error)
    }

    throw new LLMError(
      error.message || 'Unknown error',
      error.code || 'UNKNOWN_ERROR',
      this.name,
      error.response?.status
    )
  }

  private isStatusFresh(): boolean {
    if (!this._lastStatus) return false
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return this._lastStatus.lastChecked > fiveMinutesAgo
  }
}