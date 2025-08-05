import React, { useState } from 'react'
import { FileNode } from '../types/electron'
import { useAppStore } from '../stores/appStore'
import ContextMenu from './ContextMenu'
import InputDialog from './InputDialog'

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showDialog, setShowDialog] = useState<{ type: 'file' | 'directory' | 'rename'; title: string; placeholder: string; initialValue?: string } | null>(null)
  const { openFile, setActiveFile, setFileTree } = useAppStore()

  const handleClick = async () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded)
      // Update workspace expanded folders
      try {
        await window.electronAPI.toggleFolderExpansion(node.path)
      } catch (error) {
        console.error('Failed to update folder expansion:', error)
      }
    } else {
      // Open file
      try {
        const content = await window.electronAPI.readFile(node.path)
        const language = getLanguageFromPath(node.path)
        openFile(node.path, content, language)
        setActiveFile(node.path)
        
        // Update workspace open files
        await window.electronAPI.addOpenFile(node.path)
        await window.electronAPI.setActiveFile(node.path)
      } catch (error) {
        console.error('Failed to open file:', error)
      }
    }
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCreateFile = () => {
    setShowDialog({
      type: 'file',
      title: 'Create New File',
      placeholder: 'Enter file name...',
    })
  }

  const handleCreateDirectory = () => {
    setShowDialog({
      type: 'directory',
      title: 'Create New Folder',
      placeholder: 'Enter folder name...',
    })
  }

  const handleRename = () => {
    setShowDialog({
      type: 'rename',
      title: 'Rename',
      placeholder: 'Enter new name...',
      initialValue: node.name,
    })
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      try {
        const workspacePath = await window.electronAPI.getCurrentWorkspacePath()
        if (workspacePath) {
          const relativePath = node.path.replace(workspacePath, '').replace(/^[/\\]/, '')
          await window.electronAPI.deleteFileInWorkspace(relativePath)
          
          // Refresh file tree
          const newTree = await window.electronAPI.getFileTree()
          setFileTree(newTree)
        }
      } catch (error) {
        console.error('Failed to delete file:', error)
        alert('Failed to delete file: ' + error)
      }
    }
  }

  const handleDialogConfirm = async (value: string) => {
    if (!showDialog) return

    try {
      const workspacePath = await window.electronAPI.getCurrentWorkspacePath()
      if (!workspacePath) return

      if (showDialog.type === 'file') {
        const parentPath = node.type === 'directory' ? node.path : node.path.replace(/[^/\\]*$/, '')
        const relativePath = parentPath.replace(workspacePath, '').replace(/^[/\\]/, '')
        const newFilePath = relativePath ? `${relativePath}/${value}` : value
        
        await window.electronAPI.createFileInWorkspace(newFilePath)
      } else if (showDialog.type === 'directory') {
        const parentPath = node.type === 'directory' ? node.path : node.path.replace(/[^/\\]*$/, '')
        const relativePath = parentPath.replace(workspacePath, '').replace(/^[/\\]/, '')
        const newDirPath = relativePath ? `${relativePath}/${value}` : value
        
        await window.electronAPI.createDirectoryInWorkspace(newDirPath)
      } else if (showDialog.type === 'rename') {
        const oldRelativePath = node.path.replace(workspacePath, '').replace(/^[/\\]/, '')
        const parentPath = oldRelativePath.replace(/[^/\\]*$/, '')
        const newRelativePath = parentPath ? `${parentPath}${value}` : value
        
        await window.electronAPI.renameFileInWorkspace(oldRelativePath, newRelativePath)
      }

      // Refresh file tree
      const newTree = await window.electronAPI.getFileTree()
      setFileTree(newTree)
      
      setShowDialog(null)
    } catch (error) {
      console.error('Failed to perform file operation:', error)
      alert('Failed to perform operation: ' + error)
    }
  }

  const getContextMenuItems = () => {
    const items = []

    if (node.type === 'directory') {
      items.push(
        { label: 'New File', icon: '📄', onClick: handleCreateFile },
        { label: 'New Folder', icon: '📁', onClick: handleCreateDirectory },
        { separator: true }
      )
    }

    items.push(
      { label: 'Rename', icon: '✏️', onClick: handleRename },
      { label: 'Delete', icon: '🗑️', onClick: handleDelete },
      { separator: true },
      { label: 'Copy Path', icon: '📋', onClick: () => navigator.clipboard.writeText(node.path) }
    )

    return items
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
        onContextMenu={handleRightClick}
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

      {/* Context Menu */}
      <ContextMenu
        items={getContextMenuItems()}
        position={contextMenu || { x: 0, y: 0 }}
        visible={!!contextMenu}
        onClose={() => setContextMenu(null)}
      />

      {/* Input Dialog */}
      {showDialog && (
        <InputDialog
          title={showDialog.title}
          placeholder={showDialog.placeholder}
          initialValue={showDialog.initialValue}
          type={showDialog.type}
          visible={!!showDialog}
          onConfirm={handleDialogConfirm}
          onCancel={() => setShowDialog(null)}
        />
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