import React, { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { showError, showSuccess } from '../stores/notificationStore'
import MonacoEditor from './MonacoEditor'
import EditorTabs from './EditorTabs'

const Editor: React.FC = () => {
  const { openFiles, activeFilePath, updateFileContent, markFileDirty } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)

  const activeFile = openFiles.find(f => f.path === activeFilePath)

  const handleContentChange = (content: string) => {
    if (activeFilePath) {
      updateFileContent(activeFilePath, content)
    }
  }

  const handleSave = async () => {
    if (!activeFile || !activeFilePath) return

    setIsLoading(true)
    try {
      await window.electronAPI.writeFile(activeFilePath, activeFile.content)
      markFileDirty(activeFilePath, false)
      showSuccess('File saved', `Successfully saved ${activeFile.name}`)
      
      // Update workspace open files
      await window.electronAPI.addOpenFile(activeFilePath)
    } catch (error) {
      console.error('Failed to save file:', error)
      showError('Failed to save file', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Set up menu action listeners
  useEffect(() => {
    const cleanup = window.electronAPI.onMenuAction((action, data) => {
      switch (action) {
        case 'menu:save':
          handleSave()
          break
        case 'menu:open-file':
          if (data) {
            openFileFromPath(data)
          }
          break
        // TODO: Handle other menu actions
      }
    })

    return cleanup
  }, [activeFile, activeFilePath])

  const openFileFromPath = async (filePath: string) => {
    try {
      setIsLoading(true)
      const content = await window.electronAPI.readFile(filePath)
      const language = getLanguageFromPath(filePath)
      
      const { openFile, setActiveFile } = useAppStore.getState()
      openFile(filePath, content, language)
      setActiveFile(filePath)
      
      // Update workspace open files
      await window.electronAPI.addOpenFile(filePath)
      await window.electronAPI.setActiveFile(filePath)
      
      showSuccess('File opened', `Successfully opened ${filePath.split(/[/\\]/).pop()}`)
    } catch (error) {
      console.error('Failed to open file:', error)
      showError('Failed to open file', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const getLanguageFromPath = (filePath: string): string => {
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

  if (openFiles.length === 0) {
    return (
      <div className="flex-1 bg-vscode-editor flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Homeward IDE</h2>
          <p className="text-vscode-text-muted mb-4">
            A custom standalone VSCode-based AI-IDE with multi-LLM support
          </p>
          <div className="space-y-2 text-sm text-vscode-text-muted">
            <div>• Multi-LLM Support (GPT, Claude, GLM, Kimi)</div>
            <div>• AI-Powered Development Tools</div>
            <div>• Spec Workflow Management</div>
            <div>• Autonomous Code Generation</div>
          </div>
          <div className="mt-8 space-y-2 text-sm">
            <div>Open a file to get started:</div>
            <div className="text-vscode-text-muted">
              <kbd className="px-2 py-1 bg-vscode-sidebar rounded text-xs">Ctrl+O</kbd> Open File
            </div>
            <div className="text-vscode-text-muted">
              <kbd className="px-2 py-1 bg-vscode-sidebar rounded text-xs">Ctrl+Shift+O</kbd> Open Workspace
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-vscode-editor">
      <EditorTabs />
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-vscode-editor bg-opacity-50 flex items-center justify-center z-10">
            <div className="text-vscode-text">Loading...</div>
          </div>
        )}
        {activeFile && (
          <MonacoEditor
            value={activeFile.content}
            language={activeFile.language}
            onChange={handleContentChange}
            onSave={handleSave}
            filePath={activeFile.path}
          />
        )}
      </div>
    </div>
  )
}

export default Editor