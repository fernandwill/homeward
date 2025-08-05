import { useAppStore } from '../stores/appStore'
import { showError, showInfo } from '../stores/notificationStore'

export class WorkspaceStateManager {
  private autoSaveInterval: NodeJS.Timeout | null = null
  private readonly AUTO_SAVE_DELAY = 30000 // 30 seconds

  constructor() {
    this.setupAutoSave()
    this.setupBeforeUnload()
  }

  private setupAutoSave() {
    // Auto-save dirty files every 30 seconds
    this.autoSaveInterval = setInterval(async () => {
      await this.autoSaveDirtyFiles()
    }, this.AUTO_SAVE_DELAY)
  }

  private setupBeforeUnload() {
    // Save workspace state before the app closes
    window.addEventListener('beforeunload', async (e) => {
      const { openFiles } = useAppStore.getState()
      const dirtyFiles = openFiles.filter(f => f.isDirty)
      
      if (dirtyFiles.length > 0) {
        e.preventDefault()
        e.returnValue = `You have ${dirtyFiles.length} unsaved file(s). Are you sure you want to close?`
        
        // Try to save workspace state
        await this.saveWorkspaceState()
      }
    })
  }

  public async autoSaveDirtyFiles(): Promise<void> {
    const { openFiles, markFileDirty } = useAppStore.getState()
    const dirtyFiles = openFiles.filter(f => f.isDirty)
    
    if (dirtyFiles.length === 0) return

    try {
      const savePromises = dirtyFiles.map(async (file) => {
        try {
          await window.electronAPI.writeFile(file.path, file.content)
          markFileDirty(file.path, false)
          return { success: true, file: file.name }
        } catch (error) {
          console.error(`Failed to auto-save ${file.name}:`, error)
          return { success: false, file: file.name, error }
        }
      })

      const results = await Promise.all(savePromises)
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (successful.length > 0) {
        showInfo('Auto-save', `Saved ${successful.length} file(s) automatically`)
      }

      if (failed.length > 0) {
        showError('Auto-save failed', `Failed to save ${failed.length} file(s)`)
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    }
  }

  public async saveWorkspaceState(): Promise<void> {
    try {
      const { openFiles, activeFilePath, workspaceConfig } = useAppStore.getState()
      
      if (!workspaceConfig) return

      // Update workspace config with current state
      const openFilePaths = openFiles.map(f => f.path)
      
      await window.electronAPI.updateWorkspaceSettings({
        openFiles: openFilePaths,
        activeFile: activeFilePath,
        lastSaved: new Date().toISOString(),
      })

      // Save individual file states
      for (const file of openFiles) {
        if (file.isDirty) {
          await window.electronAPI.addOpenFile(file.path)
        }
      }

      if (activeFilePath) {
        await window.electronAPI.setActiveFile(activeFilePath)
      }
    } catch (error) {
      console.error('Failed to save workspace state:', error)
    }
  }

  public async restoreWorkspaceState(): Promise<void> {
    try {
      const workspaceConfig = await window.electronAPI.getWorkspaceConfig()
      
      if (!workspaceConfig || !workspaceConfig.openFiles.length) return

      const { openFile, setActiveFile } = useAppStore.getState()

      // Restore open files
      for (const filePath of workspaceConfig.openFiles) {
        try {
          const exists = await window.electronAPI.fileExists(filePath)
          if (exists) {
            const content = await window.electronAPI.readFile(filePath)
            const language = this.getLanguageFromPath(filePath)
            const fileName = filePath.split(/[/\\]/).pop() || 'Untitled'
            
            openFile(filePath, content, language)
          }
        } catch (error) {
          console.warn(`Failed to restore file ${filePath}:`, error)
        }
      }

      // Restore active file
      if (workspaceConfig.activeFile) {
        const exists = await window.electronAPI.fileExists(workspaceConfig.activeFile)
        if (exists) {
          setActiveFile(workspaceConfig.activeFile)
        }
      }

      showInfo('Workspace restored', `Restored ${workspaceConfig.openFiles.length} file(s)`)
    } catch (error) {
      console.error('Failed to restore workspace state:', error)
    }
  }

  private getLanguageFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase()
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'gitignore': 'ignore',
    }

    return languageMap[extension || ''] || 'plaintext'
  }

  public destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }
}

// Singleton instance
export const workspaceStateManager = new WorkspaceStateManager()