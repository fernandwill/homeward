import React, { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'

const StatusBar: React.FC = () => {
  const { workspaceConfig, activeFilePath, openFiles } = useAppStore()
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [encoding, setEncoding] = useState('UTF-8')
  const [lineEnding, setLineEnding] = useState('LF')

  const activeFile = openFiles.find(f => f.path === activeFilePath)

  const getLanguageDisplay = (language: string): string => {
    const languageMap: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'csharp': 'C#',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'markdown': 'Markdown',
      'sql': 'SQL',
      'shell': 'Shell',
      'powershell': 'PowerShell',
      'dockerfile': 'Dockerfile',
      'plaintext': 'Plain Text',
    }
    
    return languageMap[language] || language
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getStatusMessage = (): string => {
    if (!workspaceConfig) {
      return 'No workspace'
    }
    
    if (activeFile) {
      return activeFile.isDirty ? 'Modified' : 'Ready'
    }
    
    return 'Ready'
  }

  return (
    <div className="h-6 bg-vscode-accent text-white text-xs flex items-center px-2">
      {/* Left side - Status */}
      <div className="flex items-center space-x-4">
        <span>{getStatusMessage()}</span>
        
        {workspaceConfig && (
          <span className="opacity-75">
            📁 {workspaceConfig.name}
          </span>
        )}
        
        {openFiles.length > 0 && (
          <span className="opacity-75">
            {openFiles.length} file{openFiles.length !== 1 ? 's' : ''} open
          </span>
        )}
      </div>

      {/* Right side - File info */}
      <div className="flex-1" />
      <div className="flex items-center space-x-4">
        {activeFile && (
          <>
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            <span>{getLanguageDisplay(activeFile.language)}</span>
            <span>{encoding}</span>
            <span>{lineEnding}</span>
            {/* Show file size if available */}
            {/* <span>{formatFileSize(activeFile.size)}</span> */}
          </>
        )}
        
        {/* AI Status */}
        <span className="opacity-75">
          🤖 AI Ready
        </span>
      </div>
    </div>
  )
}

export default StatusBar