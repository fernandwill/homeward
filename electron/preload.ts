import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  
  // File system operations (to be implemented)
  openFile: (filePath: string) => ipcRenderer.invoke('fs:openFile', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  
  // Workspace operations (to be implemented)
  openWorkspace: (workspacePath: string) => ipcRenderer.invoke('workspace:open', workspacePath),
  getFileTree: () => ipcRenderer.invoke('workspace:getFileTree'),
  
  // LLM operations (to be implemented)
  sendLLMRequest: (provider: string, message: string, context?: any) => 
    ipcRenderer.invoke('llm:sendRequest', provider, message, context),
})