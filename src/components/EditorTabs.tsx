import React from 'react'
import { useAppStore } from '../stores/appStore'

const EditorTabs: React.FC = () => {
  const { openFiles, activeFilePath, setActiveFile, closeFile } = useAppStore()

  const handleTabClick = (filePath: string) => {
    setActiveFile(filePath)
  }

  const handleTabClose = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation()
    closeFile(filePath)
  }

  const getFileIcon = (language: string): string => {
    const iconMap: Record<string, string> = {
      'javascript': '📄',
      'typescript': '📘',
      'python': '🐍',
      'java': '☕',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'markdown': '📝',
      'xml': '📄',
      'yaml': '⚙️',
      'sql': '🗃️',
      'shell': '💻',
      'dockerfile': '🐳',
    }
    
    return iconMap[language] || '📄'
  }

  if (openFiles.length === 0) {
    return null
  }

  return (
    <div className="flex bg-vscode-panel border-b border-vscode-border overflow-x-auto">
      {openFiles.map((file) => (
        <div
          key={file.path}
          className={`
            flex items-center px-3 py-2 border-r border-vscode-border cursor-pointer
            hover:bg-vscode-sidebar transition-colors min-w-0 max-w-48
            ${activeFilePath === file.path 
              ? 'bg-vscode-editor text-vscode-text border-b-2 border-vscode-accent' 
              : 'bg-vscode-panel text-vscode-text-muted'
            }
          `}
          onClick={() => handleTabClick(file.path)}
          title={file.path}
        >
          <span className="mr-2 text-sm flex-shrink-0">
            {getFileIcon(file.language)}
          </span>
          <span className="truncate text-sm flex-1 min-w-0">
            {file.name}
          </span>
          {file.isDirty && (
            <span className="ml-1 w-2 h-2 bg-vscode-accent rounded-full flex-shrink-0" />
          )}
          <button
            className="ml-2 w-4 h-4 flex items-center justify-center rounded hover:bg-vscode-border flex-shrink-0"
            onClick={(e) => handleTabClose(e, file.path)}
            title="Close"
          >
            <span className="text-xs text-vscode-text-muted hover:text-vscode-text">×</span>
          </button>
        </div>
      ))}
    </div>
  )
}

export default EditorTabs