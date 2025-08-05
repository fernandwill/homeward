import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { isDev } from './utils/env'
import { WindowManager } from './managers/WindowManager'
import { FileSystemManager } from './managers/FileSystemManager'
import { WorkspaceManager } from './managers/WorkspaceManager'
import { LLMManager } from './managers/LLMManager'

let mainWindow: BrowserWindow | null = null
let windowManager: WindowManager
let fileSystemManager: FileSystemManager
let workspaceManager: WorkspaceManager
let llmManager: LLMManager

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform !== 'darwin' ? {
      color: '#1e1e1e',
      symbolColor: '#cccccc',
      height: 32,
    } : undefined,
    show: false,
    icon: process.platform === 'linux' ? join(__dirname, '../assets/icon.png') : undefined,
  })

  // Initialize managers
  windowManager = new WindowManager(mainWindow)
  fileSystemManager = new FileSystemManager()
  workspaceManager = new WorkspaceManager()
  llmManager = new LLMManager()

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    
    // Focus the window on first show
    if (process.platform === 'darwin') {
      mainWindow?.focus()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle window state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:unmaximized')
  })

  mainWindow.on('focus', () => {
    mainWindow?.webContents.send('window:focused')
  })

  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('window:blurred')
  })
}

const createMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-file')
          }
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openFile'],
              filters: [
                { name: 'All Files', extensions: ['*'] },
                { name: 'Text Files', extensions: ['txt', 'md'] },
                { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c'] }
              ]
            })
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send('menu:open-file', result.filePaths[0])
            }
          }
        },
        {
          label: 'Open Workspace',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory']
            })
            
            if (!result.canceled && result.filePaths.length > 0) {
              workspaceManager.openWorkspace(result.filePaths[0])
              mainWindow?.webContents.send('workspace:opened', result.filePaths[0])
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save')
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu:save-as')
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Open AI Chat',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            mainWindow?.webContents.send('ai:open-chat')
          }
        },
        {
          label: 'Generate Code',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => {
            mainWindow?.webContents.send('ai:generate-code')
          }
        },
        {
          label: 'Review Code',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow?.webContents.send('ai:review-code')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event handlers
app.whenReady().then(() => {
  createWindow()
  createMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('app:getName', () => {
  return app.getName()
})

// Window management
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() || false
})

// File system operations
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  return await fileSystemManager.readFile(filePath)
})

ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  return await fileSystemManager.writeFile(filePath, content)
})

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  return await fileSystemManager.exists(filePath)
})

ipcMain.handle('fs:getFileInfo', async (_, filePath: string) => {
  return await fileSystemManager.getFileInfo(filePath)
})

ipcMain.handle('fs:createFile', async (_, filePath: string, content?: string) => {
  return await fileSystemManager.createFile(filePath, content)
})

ipcMain.handle('fs:createDirectory', async (_, dirPath: string) => {
  return await fileSystemManager.createDirectory(dirPath)
})

ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
  return await fileSystemManager.deleteFile(filePath)
})

ipcMain.handle('fs:copyFile', async (_, sourcePath: string, destinationPath: string) => {
  return await fileSystemManager.copyFile(sourcePath, destinationPath)
})

ipcMain.handle('fs:moveFile', async (_, sourcePath: string, destinationPath: string) => {
  return await fileSystemManager.moveFile(sourcePath, destinationPath)
})

ipcMain.handle('fs:getRecentFiles', async () => {
  return fileSystemManager.getRecentFiles()
})

// Workspace operations
ipcMain.handle('workspace:open', async (_, workspacePath: string) => {
  return await workspaceManager.openWorkspace(workspacePath)
})

ipcMain.handle('workspace:close', async () => {
  return await workspaceManager.closeWorkspace()
})

ipcMain.handle('workspace:getFileTree', async () => {
  return await workspaceManager.getFileTree()
})

ipcMain.handle('workspace:refreshFileTree', async () => {
  return await workspaceManager.refreshFileTree()
})

ipcMain.handle('workspace:getCurrentPath', () => {
  return workspaceManager.getCurrentWorkspacePath()
})

ipcMain.handle('workspace:getConfig', () => {
  return workspaceManager.getWorkspaceConfig()
})

ipcMain.handle('workspace:addOpenFile', async (_, filePath: string) => {
  workspaceManager.addOpenFile(filePath)
  return await workspaceManager.saveWorkspaceConfig()
})

ipcMain.handle('workspace:removeOpenFile', async (_, filePath: string) => {
  workspaceManager.removeOpenFile(filePath)
  return await workspaceManager.saveWorkspaceConfig()
})

ipcMain.handle('workspace:setActiveFile', async (_, filePath: string) => {
  workspaceManager.setActiveFile(filePath)
  return await workspaceManager.saveWorkspaceConfig()
})

ipcMain.handle('workspace:toggleFolderExpansion', async (_, folderPath: string) => {
  workspaceManager.toggleFolderExpansion(folderPath)
  return await workspaceManager.saveWorkspaceConfig()
})

ipcMain.handle('workspace:updateSettings', async (_, settings: Record<string, any>) => {
  return await workspaceManager.updateWorkspaceSettings(settings)
})

ipcMain.handle('workspace:createFile', async (_, relativePath: string, content?: string) => {
  return await workspaceManager.createFileInWorkspace(relativePath, content)
})

ipcMain.handle('workspace:createDirectory', async (_, relativePath: string) => {
  return await workspaceManager.createDirectoryInWorkspace(relativePath)
})

ipcMain.handle('workspace:deleteFile', async (_, relativePath: string) => {
  return await workspaceManager.deleteFileInWorkspace(relativePath)
})

ipcMain.handle('workspace:renameFile', async (_, oldRelativePath: string, newRelativePath: string) => {
  return await workspaceManager.renameFileInWorkspace(oldRelativePath, newRelativePath)
})

ipcMain.handle('workspace:getStats', () => {
  return workspaceManager.getWorkspaceStats()
})

// LLM operations
ipcMain.handle('llm:getProviders', () => {
  return llmManager.getProviders()
})

ipcMain.handle('llm:getProvider', async (_, name: string) => {
  return llmManager.getProvider(name)
})

ipcMain.handle('llm:updateProvider', async (_, name: string, config: any) => {
  return await llmManager.updateProvider(name, config)
})

ipcMain.handle('llm:addProvider', async (_, config: any) => {
  return await llmManager.addProvider(config)
})

ipcMain.handle('llm:removeProvider', async (_, name: string) => {
  return await llmManager.removeProvider(name)
})

ipcMain.handle('llm:getActiveProvider', () => {
  return llmManager.getActiveProvider()
})

ipcMain.handle('llm:setActiveProvider', async (_, name: string) => {
  return await llmManager.setActiveProvider(name)
})

ipcMain.handle('llm:getEnabledProviders', () => {
  return llmManager.getEnabledProviders()
})

ipcMain.handle('llm:checkProviderStatus', async (_, name: string) => {
  return await llmManager.checkProviderStatus(name)
})

ipcMain.handle('llm:validateApiKey', async (_, providerName: string, apiKey: string) => {
  return await llmManager.validateApiKey(providerName, apiKey)
})

ipcMain.handle('llm:getProviderModels', (_, providerName: string) => {
  return llmManager.getProviderModels(providerName)
})

ipcMain.handle('llm:refreshOllamaModels', async () => {
  return await llmManager.refreshOllamaModels()
})

// Secure credential management
ipcMain.handle('llm:storeApiKey', async (_, providerName: string, apiKey: string) => {
  return await llmManager.storeApiKey(providerName, apiKey)
})

ipcMain.handle('llm:getApiKey', async (_, providerName: string) => {
  return await llmManager.getApiKey(providerName)
})

ipcMain.handle('llm:deleteApiKey', async (_, providerName: string) => {
  return await llmManager.deleteApiKey(providerName)
})

ipcMain.handle('llm:listStoredApiKeys', async () => {
  return await llmManager.listStoredApiKeys()
})

ipcMain.handle('llm:clearAllCredentials', async () => {
  return await llmManager.clearAllCredentials()
})

ipcMain.handle('llm:getSecurityInfo', () => {
  return llmManager.getSecurityInfo()
})

ipcMain.handle('llm:validateAndStoreApiKey', async (_, providerName: string, apiKey: string) => {
  return await llmManager.validateAndStoreApiKey(providerName, apiKey)
})