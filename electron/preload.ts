import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  
  // Window management
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  // File system operations
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  fileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('fs:getFileInfo', filePath),
  createFile: (filePath: string, content?: string) => ipcRenderer.invoke('fs:createFile', filePath, content),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  copyFile: (sourcePath: string, destinationPath: string) => ipcRenderer.invoke('fs:copyFile', sourcePath, destinationPath),
  moveFile: (sourcePath: string, destinationPath: string) => ipcRenderer.invoke('fs:moveFile', sourcePath, destinationPath),
  getRecentFiles: () => ipcRenderer.invoke('fs:getRecentFiles'),
  
  // Workspace operations
  openWorkspace: (workspacePath: string) => ipcRenderer.invoke('workspace:open', workspacePath),
  closeWorkspace: () => ipcRenderer.invoke('workspace:close'),
  getFileTree: () => ipcRenderer.invoke('workspace:getFileTree'),
  refreshFileTree: () => ipcRenderer.invoke('workspace:refreshFileTree'),
  getCurrentWorkspacePath: () => ipcRenderer.invoke('workspace:getCurrentPath'),
  getWorkspaceConfig: () => ipcRenderer.invoke('workspace:getConfig'),
  addOpenFile: (filePath: string) => ipcRenderer.invoke('workspace:addOpenFile', filePath),
  removeOpenFile: (filePath: string) => ipcRenderer.invoke('workspace:removeOpenFile', filePath),
  setActiveFile: (filePath: string) => ipcRenderer.invoke('workspace:setActiveFile', filePath),
  toggleFolderExpansion: (folderPath: string) => ipcRenderer.invoke('workspace:toggleFolderExpansion', folderPath),
  updateWorkspaceSettings: (settings: Record<string, any>) => ipcRenderer.invoke('workspace:updateSettings', settings),
  createFileInWorkspace: (relativePath: string, content?: string) => ipcRenderer.invoke('workspace:createFile', relativePath, content),
  createDirectoryInWorkspace: (relativePath: string) => ipcRenderer.invoke('workspace:createDirectory', relativePath),
  deleteFileInWorkspace: (relativePath: string) => ipcRenderer.invoke('workspace:deleteFile', relativePath),
  renameFileInWorkspace: (oldRelativePath: string, newRelativePath: string) => ipcRenderer.invoke('workspace:renameFile', oldRelativePath, newRelativePath),
  getWorkspaceStats: () => ipcRenderer.invoke('workspace:getStats'),
  
  // Event listeners
  onMenuAction: (callback: (action: string, data?: any) => void) => {
    const handler = (_: any, action: string, data?: any) => callback(action, data)
    
    ipcRenderer.on('menu:new-file', handler)
    ipcRenderer.on('menu:open-file', handler)
    ipcRenderer.on('menu:save', handler)
    ipcRenderer.on('menu:save-as', handler)
    ipcRenderer.on('ai:open-chat', handler)
    ipcRenderer.on('ai:generate-code', handler)
    ipcRenderer.on('ai:review-code', handler)
    ipcRenderer.on('workspace:opened', handler)
    
    return () => {
      ipcRenderer.removeListener('menu:new-file', handler)
      ipcRenderer.removeListener('menu:open-file', handler)
      ipcRenderer.removeListener('menu:save', handler)
      ipcRenderer.removeListener('menu:save-as', handler)
      ipcRenderer.removeListener('ai:open-chat', handler)
      ipcRenderer.removeListener('ai:generate-code', handler)
      ipcRenderer.removeListener('ai:review-code', handler)
      ipcRenderer.removeListener('workspace:opened', handler)
    }
  },
  
  onWindowStateChange: (callback: (state: string) => void) => {
    const handler = (_: any, state: string) => callback(state)
    
    ipcRenderer.on('window:maximized', handler)
    ipcRenderer.on('window:unmaximized', handler)
    ipcRenderer.on('window:focused', handler)
    ipcRenderer.on('window:blurred', handler)
    
    return () => {
      ipcRenderer.removeListener('window:maximized', handler)
      ipcRenderer.removeListener('window:unmaximized', handler)
      ipcRenderer.removeListener('window:focused', handler)
      ipcRenderer.removeListener('window:blurred', handler)
    }
  },
  
  // LLM operations (to be implemented in future tasks)
  sendLLMRequest: (provider: string, message: string, context?: any) => 
    ipcRenderer.invoke('llm:sendRequest', provider, message, context),
})