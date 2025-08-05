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
    minimap: boolean
    lineNumbers: boolean
    renderWhitespace: boolean
  }
  workspace: {
    autoSave: boolean
    fileWatcher: boolean
    gitIntegration: boolean
    excludePatterns: string[]
  }
  ai: {
    autopilotEnabled: boolean
    contextWindow: number
    codeReviewEnabled: boolean
    autoSuggestions: boolean
  }
  ui: {
    sidebarWidth: number
    terminalHeight: number
    showMinimap: boolean
    showStatusBar: boolean
  }
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
}

export interface LLMModel {
  id: string
  name: string
  contextWindow: number
  supportsStreaming: boolean
  costPer1kTokens?: number
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
  lastOpened: Date
  settings: ProjectSettings
}

export interface ProjectSettings {
  defaultLLMProvider?: string
  codeStyle: {
    indentSize: number
    indentType: 'spaces' | 'tabs'
    maxLineLength: number
  }
  linting: {
    enabled: boolean
    rules: Record<string, any>
  }
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
  assignedLLM?: string
}

export interface Task {
  id: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed'
  requirements: string[]
  subtasks?: Task[]
  estimatedTime?: number
  actualTime?: number
  assignedTo?: string
  notes?: string
}

export interface Hook {
  id: string
  name: string
  description: string
  trigger: HookTrigger
  action: HookAction
  enabled: boolean
  conditions?: HookCondition[]
}

export interface HookTrigger {
  type: 'file_save' | 'file_open' | 'workspace_open' | 'manual' | 'timer'
  pattern?: string
  interval?: number
}

export interface HookAction {
  type: 'llm_request' | 'command' | 'script' | 'notification'
  payload: Record<string, any>
}

export interface HookCondition {
  type: 'file_extension' | 'file_path' | 'file_size' | 'time_of_day'
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than'
  value: string | number
}

// AI-related types
export interface CodeContext {
  currentFile?: string
  selectedText?: string
  cursorPosition?: Position
  openFiles: string[]
  projectInfo: ProjectContext
  recentChanges?: FileChange[]
}

export interface Position {
  line: number
  column: number
}

export interface ProjectContext {
  name: string
  path: string
  language: string
  framework?: string
  dependencies: PackageInfo[]
  gitStatus?: GitStatus
  configuration: Record<string, any>
}

export interface PackageInfo {
  name: string
  version: string
  type: 'dependency' | 'devDependency' | 'peerDependency'
}

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  staged: string[]
  unstaged: string[]
  untracked: string[]
}

export interface FileChange {
  path: string
  type: 'added' | 'modified' | 'deleted'
  timestamp: Date
  lines?: {
    added: number
    removed: number
  }
}

export interface CodeReview {
  suggestions: CodeSuggestion[]
  issues: CodeIssue[]
  metrics: CodeMetrics
}

export interface CodeSuggestion {
  line: number
  column: number
  type: 'improvement' | 'optimization' | 'style' | 'bug_fix'
  message: string
  suggestedCode?: string
  confidence: number
}

export interface CodeIssue {
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  message: string
  rule?: string
}

export interface CodeMetrics {
  complexity: number
  maintainability: number
  testCoverage?: number
  duplicateLines?: number
}

export interface AutopilotResult {
  changes: FileChange[]
  summary: string
  success: boolean
  rollbackData?: any
  warnings?: string[]
}