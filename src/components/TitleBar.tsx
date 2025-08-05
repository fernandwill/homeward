import React, { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'

const TitleBar: React.FC = () => {
  const { workspaceConfig, activeFilePath, openFiles, isMaximized, setWindowState } = useAppStore()
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    // Get app version
    window.electronAPI.getVersion().then(setAppVersion)

    // Set up window state listeners
    const cleanup = window.electronAPI.onWindowStateChange((state) => {
      switch (state) {
        case 'window:maximized':
          setWindowState(true, true)
          break
        case 'window:unmaximized':
          setWindowState(false, true)
          break
        case 'window:focused':
          setWindowState(isMaximized, true)
          break
        case 'window:blurred':
          setWindowState(isMaximized, false)
          break
      }
    })

    // Get initial window state
    window.electronAPI.isWindowMaximized().then(maximized => {
      setWindowState(maximized, true)
    })

    return cleanup
  }, [])

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow()
  }

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow()
  }

  const handleClose = () => {
    window.electronAPI.closeWindow()
  }

  const getTitle = (): string => {
    let title = 'Homeward IDE'
    
    if (activeFilePath) {
      const activeFile = openFiles.find(f => f.path === activeFilePath)
      if (activeFile) {
        title = `${activeFile.name}${activeFile.isDirty ? ' •' : ''} - ${title}`
      }
    }
    
    if (workspaceConfig) {
      title += ` - ${workspaceConfig.name}`
    }
    
    return title
  }

  return (
    <div className="h-8 bg-vscode-bg border-b border-vscode-border flex items-center text-sm select-none">
      {/* Left side - Menu items (macOS style) */}
      <div className="flex items-center px-4">
        <div className="text-vscode-text font-medium">
          Homeward IDE
        </div>
        {appVersion && (
          <div className="ml-2 text-xs text-vscode-text-muted">
            v{appVersion}
          </div>
        )}
      </div>

      {/* Center - Title */}
      <div className="flex-1 text-center text-vscode-text-muted text-xs">
        {getTitle()}
      </div>

      {/* Right side - Window controls (Windows/Linux style) */}
      {process.platform !== 'darwin' && (
        <div className="flex">
          <button
            className="w-12 h-8 flex items-center justify-center hover:bg-vscode-border transition-colors"
            onClick={handleMinimize}
            title="Minimize"
          >
            <span className="text-vscode-text-muted">−</span>
          </button>
          <button
            className="w-12 h-8 flex items-center justify-center hover:bg-vscode-border transition-colors"
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <span className="text-vscode-text-muted">
              {isMaximized ? '❐' : '□'}
            </span>
          </button>
          <button
            className="w-12 h-8 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
            onClick={handleClose}
            title="Close"
          >
            <span className="text-vscode-text-muted">×</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default TitleBar