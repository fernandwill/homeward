import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { isDev } from './utils/env'
import { WindowManager } from './managers/WindowManager'
import { FileSystemManager } from './managers/FileSystemManager'
import { WorkspaceManager } from './managers/WorkspaceManager'

let mainWindow: BrowserWindow | null = null
let windowManager: WindowManager
let fileSystemManager: FileSystemManager
let workspaceManager: WorkspaceManager

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

// Workspace operations
ipcMain.handle('workspace:open', async (_, workspacePath: string) => {
  return await workspaceManager.openWorkspace(workspacePath)
})

ipcMain.handle('workspace:getFileTree', async () => {
  return await workspaceManager.getFileTree()
})

ipcMain.handle('workspace:getCurrentPath', () => {
  return workspaceManager.getCurrentWorkspacePath()
})