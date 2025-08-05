import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { FileNode } from '../types/electron'

interface QuickOpenProps {
  visible: boolean
  onClose: () => void
}

interface FileItem {
  name: string
  path: string
  relativePath: string
  type: 'file' | 'directory'
  language: string
}

const QuickOpen: React.FC<QuickOpenProps> = ({ visible, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [files, setFiles] = useState<FileItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const { workspaceConfig, openFile, setActiveFile } = useAppStore()

  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelectedIndex(0)
      loadFiles()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const loadFiles = async () => {
    try {
      const fileTree = await window.electronAPI.getFileTree()
      const workspacePath = await window.electronAPI.getCurrentWorkspacePath()
      
      if (!workspacePath) return

      const fileItems: FileItem[] = []
      
      const extractFiles = (nodes: FileNode[], basePath: string = '') => {
        for (const node of nodes) {
          if (node.type === 'file') {
            const relativePath = node.path.replace(workspacePath, '').replace(/^[/\\]/, '')
            fileItems.push({
              name: node.name,
              path: node.path,
              relativePath,
              type: node.type,
              language: getLanguageFromPath(node.path)
            })
          } else if (node.children) {
            extractFiles(node.children, basePath)
          }
        }
      }

      extractFiles(fileTree)
      setFiles(fileItems)
    } catch (error) {
      console.error('Failed to load files:', error)
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

  const filteredFiles = files.filter(file => {
    const searchTerm = query.toLowerCase()
    return (
      file.name.toLowerCase().includes(searchTerm) ||
      file.relativePath.toLowerCase().includes(searchTerm)
    )
  }).sort((a, b) => {
    // Prioritize exact matches in filename
    const aNameMatch = a.name.toLowerCase().indexOf(query.toLowerCase())
    const bNameMatch = b.name.toLowerCase().indexOf(query.toLowerCase())
    
    if (aNameMatch !== -1 && bNameMatch === -1) return -1
    if (bNameMatch !== -1 && aNameMatch === -1) return 1
    if (aNameMatch !== -1 && bNameMatch !== -1) {
      if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch
    }
    
    // Then sort by path length (shorter paths first)
    return a.relativePath.length - b.relativePath.length
  }).slice(0, 50) // Limit to 50 results for performance

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredFiles[selectedIndex]) {
          handleFileSelect(filteredFiles[selectedIndex])
        }
        break
    }
  }

  const handleFileSelect = async (file: FileItem) => {
    try {
      const content = await window.electronAPI.readFile(file.path)
      openFile(file.path, content, file.language)
      setActiveFile(file.path)
      
      // Update workspace open files
      await window.electronAPI.addOpenFile(file.path)
      await window.electronAPI.setActiveFile(file.path)
      
      onClose()
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text
    
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return text
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-400 bg-opacity-30 text-yellow-200">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    )
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-vscode-panel border border-vscode-border rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="p-4 border-b border-vscode-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="w-full px-3 py-2 bg-vscode-editor border border-vscode-border rounded text-vscode-text placeholder-vscode-text-muted focus:outline-none focus:border-vscode-accent"
          />
        </div>

        {/* Files List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-vscode-text-muted">
              {query ? 'No files found' : 'Start typing to search files...'}
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={file.path}
                className={`
                  flex items-center px-4 py-3 cursor-pointer border-b border-vscode-border last:border-b-0
                  ${index === selectedIndex ? 'bg-vscode-accent text-white' : 'hover:bg-vscode-border text-vscode-text'}
                `}
                onClick={() => handleFileSelect(file)}
              >
                <span className="mr-3 text-lg">
                  {getFileIcon(file.language)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {highlightMatch(file.name, query)}
                  </div>
                  <div className={`text-sm truncate ${
                    index === selectedIndex ? 'text-white text-opacity-80' : 'text-vscode-text-muted'
                  }`}>
                    {highlightMatch(file.relativePath, query)}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded font-mono ${
                  index === selectedIndex ? 'bg-white bg-opacity-20' : 'bg-vscode-sidebar'
                }`}>
                  {file.language}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-vscode-border text-xs text-vscode-text-muted flex justify-between">
          <span>Use ↑↓ to navigate, Enter to open, Esc to close</span>
          <span>{filteredFiles.length} files</span>
        </div>
      </div>
    </div>
  )
}

export default QuickOpen