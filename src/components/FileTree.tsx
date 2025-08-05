import React, { useState } from 'react'
import { FileNode } from '../types/electron'
import { useAppStore } from '../stores/appStore'

interface FileTreeProps {
  nodes: FileNode[]
  level?: number
}

interface FileTreeNodeProps {
  node: FileNode
  level: number
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, level }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { openFile, setActiveFile } = useAppStore()

  const handleClick = async () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded)
    } else {
      // Open file
      try {
        const content = await window.electronAPI.readFile(node.path)
        const language = getLanguageFromPath(node.path)
        openFile(node.path, content, language)
        setActiveFile(node.path)
      } catch (error) {
        console.error('Failed to open file:', error)
      }
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

  const getFileIcon = (node: FileNode): string => {
    if (node.type === 'directory') {
      return isExpanded ? '📂' : '📁'
    }

    const extension = node.name.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, string> = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'cs': '💎',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'swift': '🦉',
      'kt': '🎯',
      'scala': '🎭',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'less': '🎨',
      'json': '📋',
      'xml': '📄',
      'yaml': '⚙️',
      'yml': '⚙️',
      'md': '📝',
      'sql': '🗃️',
      'sh': '💻',
      'bash': '💻',
      'zsh': '💻',
      'ps1': '💻',
      'dockerfile': '🐳',
      'gitignore': '🚫',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'ico': '🖼️',
      'pdf': '📄',
      'zip': '📦',
      'tar': '📦',
      'gz': '📦',
    }
    
    return iconMap[extension || ''] || '📄'
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (date?: Date): string => {
    if (!date) return ''
    return new Date(date).toLocaleDateString()
  }

  return (
    <div>
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer hover:bg-vscode-border
          text-xs text-vscode-text select-none
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        title={`${node.path}${node.size ? ` (${formatFileSize(node.size)})` : ''}${node.modified ? ` - ${formatDate(node.modified)}` : ''}`}
      >
        {node.type === 'directory' && (
          <span className="mr-1 text-vscode-text-muted">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <span className="mr-2">{getFileIcon(node)}</span>
        <span className="truncate flex-1">{node.name}</span>
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const FileTree: React.FC<FileTreeProps> = ({ nodes, level = 0 }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-4 text-xs text-vscode-text-muted">
        No files found
      </div>
    )
  }

  return (
    <div>
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          level={level}
        />
      ))}
    </div>
  )
}

export default FileTree