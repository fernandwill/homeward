export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>
  getName: () => Promise<string>
  
  // File system operations
  openFile: (filePath: string) => Promise<string>
  saveFile: (filePath: string, content: string) => Promise<void>
  
  // Workspace operations
  openWorkspace: (workspacePath: string) => Promise<void>
  getFileTree: () => Promise<FileNode[]>
  
  // LLM operations
  sendLLMRequest: (provider: string, message: string, context?: any) => Promise<AsyncGenerator<string>>
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}