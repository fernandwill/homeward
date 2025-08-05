// LLM Provider Types
export interface LLMModel {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  supportsStreaming: boolean
  supportsImages?: boolean
  costPer1kTokens?: {
    input: number
    output: number
  }
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface LLMRequest {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  systemPrompt?: string
}

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls'
}

export interface LLMStreamChunk {
  content: string
  delta: string
  finished: boolean
  model: string
}

export interface LLMProviderConfig {
  name: string
  displayName: string
  apiKey: string
  baseUrl?: string
  models: LLMModel[]
  enabled: boolean
  maxTokens?: number
  temperature?: number
  timeout?: number
  retryAttempts?: number
}

export interface LLMProviderStatus {
  available: boolean
  error?: string
  lastChecked: Date
  responseTime?: number
}

export interface LLMUsageStats {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageResponseTime: number
  errorRate: number
}

// Error types
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, 'RATE_LIMIT', provider)
    this.retryAfter = retryAfter
  }
  
  public retryAfter?: number
}

export class LLMAuthenticationError extends LLMError {
  constructor(provider: string) {
    super(`Authentication failed for ${provider}`, 'AUTH_ERROR', provider, 401)
  }
}

export class LLMNetworkError extends LLMError {
  constructor(provider: string, originalError: Error) {
    super(`Network error for ${provider}: ${originalError.message}`, 'NETWORK_ERROR', provider)
    this.originalError = originalError
  }
  
  public originalError: Error
}