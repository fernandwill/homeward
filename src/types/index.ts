// Core application types
export interface HomewardConfig {
  llm: {
    providers: LLMProviderConfig[]
    defaultProvider: string
    maxTokens: number
    temperature: number
  }
  editor: {
    theme: string
    fontSize: number
    tabSize: number
    wordWrap: boolean
  }
  workspace: {
    autoSave: boolean
    fileWatcher: boolean
    gitIntegration: boolean
  }
  ai: {
    autopilotEnabled: boolean
    contextWindow: number
    codeReviewEnabled: boolean
  }
}

export interface LLMProviderConfig {
  name: string
  apiKey: string
  baseUrl?: string
  models: string[]
  enabled: boolean
}

export interface Project {
  id: string
  name: string
  path: string
  language: string
  framework?: string
  specs: Spec[]
  steeringFiles: string[]
  hooks: Hook[]
}

export interface Spec {
  id: string
  name: string
  status: 'requirements' | 'design' | 'tasks' | 'completed'
  requirements?: string
  design?: string
  tasks: Task[]
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed'
  requirements: string[]
  subtasks?: Task[]
}

export interface Hook {
  id: string
  name: string
  trigger: string
  action: string
  enabled: boolean
}