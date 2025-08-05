export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>
  getName: () => Promise<string>
  
  // Window management
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isWindowMaximized: () => Promise<boolean>
  
  // File system operations
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  fileExists: (filePath: string) => Promise<boolean>
  
  // Workspace operations
  openWorkspace: (workspacePath: string) => Promise<WorkspaceConfig>
  getFileTree: () => Promise<FileNode[]>
  getCurrentWorkspacePath: () => Promise<string | null>
  
  // Event listeners
  onMenuAction: (callback: (action: string, data?: any) => void) => () => void
  onWindowStateChange: (callback: (state: string) => void) => () => void
  
  // LLM operations
  sendLLMRequest: (provider: string, message: string, context?: any) => Promise<AsyncGenerator<string>>
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modified?: Date
}

export interface WorkspaceConfig {
  name: string
  path: string
  openFiles: string[]
  activeFile?: string
  expandedFolders: string[]
  settings: Record<string, any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}