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
  getFileInfo: (filePath: string) => Promise<FileInfo>
  createFile: (filePath: string, content?: string) => Promise<void>
  createDirectory: (dirPath: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  copyFile: (sourcePath: string, destinationPath: string) => Promise<void>
  moveFile: (sourcePath: string, destinationPath: string) => Promise<void>
  getRecentFiles: () => Promise<string[]>
  
  // Workspace operations
  openWorkspace: (workspacePath: string) => Promise<WorkspaceConfig>
  closeWorkspace: () => Promise<void>
  getFileTree: () => Promise<FileNode[]>
  refreshFileTree: () => Promise<void>
  getCurrentWorkspacePath: () => Promise<string | null>
  getWorkspaceConfig: () => Promise<WorkspaceConfig | null>
  addOpenFile: (filePath: string) => Promise<void>
  removeOpenFile: (filePath: string) => Promise<void>
  setActiveFile: (filePath: string) => Promise<void>
  toggleFolderExpansion: (folderPath: string) => Promise<void>
  updateWorkspaceSettings: (settings: Record<string, any>) => Promise<void>
  createFileInWorkspace: (relativePath: string, content?: string) => Promise<void>
  createDirectoryInWorkspace: (relativePath: string) => Promise<void>
  deleteFileInWorkspace: (relativePath: string) => Promise<void>
  renameFileInWorkspace: (oldRelativePath: string, newRelativePath: string) => Promise<void>
  getWorkspaceStats: () => Promise<WorkspaceStats>
  
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

export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: Date
  extension?: string
}

export interface WorkspaceStats {
  totalFiles: number
  totalDirectories: number
  openFiles: number
  lastModified?: Date
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}