import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { showError, showSuccess } from '../stores/notificationStore'
import MonacoEditor from './MonacoEditor'
import EditorTabs from './EditorTabs'
import CommandPalette from './CommandPalette'
import QuickOpen from './QuickOpen'
import GoToLineDialog from './GoToLineDialog'
import * as monaco from 'monaco-editor'

const EditorContainer: React.FC = () => {
  const { openFiles, activeFilePath, updateFileContent, markFileDirty } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickOpen, setShowQuickOpen] = useState(false)
  const [showGoToLine, setShowGoToLine] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [maxLine, setMaxLine] = useState(1)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

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

  const handleCursorPositionChange = (line: number, column: number) => {
    setCursorPosition({ line, column })
  }

  const handleEditorReady = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }

  const handleGoToLine = (line: number, column?: number) => {
    if (editorRef.current) {
      editorRef.current.setPosition({
        lineNumber: line,
        column: column || 1
      })
      editorRef.current.focus()
    }
  }

  // Set up global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+Shift+P
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      
      // Quick Open: Ctrl+P
      if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setShowQuickOpen(true)
      }
      
      // Go to Line: Ctrl+G
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault()
        setShowGoToLine(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
        case 'ai:open-chat':
          // TODO: Open AI chat
          console.log('Open AI chat')
          break
        case 'ai:generate-code':
          // TODO: Generate code
          console.log('Generate code')
          break
        case 'ai:review-code':
          // TODO: Review code
          console.log('Review code')
          break
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

  // Update max line count when content changes
  useEffect(() => {
    if (activeFile) {
      const lines = activeFile.content.split('\n').length
      setMaxLine(lines)
    }
  }, [activeFile?.content])

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
            <div>Quick actions:</div>
            <div className="text-vscode-text-muted space-y-1">
              <div><kbd className="px-2 py-1 bg-vscode-sidebar rounded text-xs">Ctrl+O</kbd> Open File</div>
              <div><kbd className="px-2 py-1 bg-vscode-sidebar rounded text-xs">Ctrl+P</kbd> Quick Open</div>
              <div><kbd className="px-2 py-1 bg-vscode-sidebar rounded text-xs">Ctrl+Shift+P</kbd> Command Palette</div>
              <div><kbd className="px-2 py-1 bg-vscode-sidebar rounded text-xs">Ctrl+Shift+O</kbd> Open Workspace</div>
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
            onCursorPositionChange={handleCursorPositionChange}
            onEditorReady={handleEditorReady}
            filePath={activeFile.path}
          />
        )}
      </div>

      {/* Status Bar Info */}
      <div className="h-6 bg-vscode-panel border-t border-vscode-border flex items-center justify-between px-4 text-xs text-vscode-text-muted">
        <div className="flex items-center space-x-4">
          {activeFile && (
            <>
              <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
              <span>{activeFile.language}</span>
              <span>{activeFile.isDirty ? 'Modified' : 'Saved'}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>UTF-8</span>
          <span>LF</span>
          <span>Spaces: 2</span>
        </div>
      </div>

      {/* Dialogs */}
      <CommandPalette
        visible={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
      
      <QuickOpen
        visible={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
      />
      
      <GoToLineDialog
        visible={showGoToLine}
        onClose={() => setShowGoToLine(false)}
        onGoToLine={handleGoToLine}
        maxLine={maxLine}
      />
    </div>
  )
}

export default EditorContainer