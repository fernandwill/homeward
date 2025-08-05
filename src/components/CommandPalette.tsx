import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'

interface Command {
  id: string
  label: string
  description?: string
  category: string
  keybinding?: string
  action: () => void
}

interface CommandPaletteProps {
  visible: boolean
  onClose: () => void
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ visible, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { workspaceConfig, openFiles, activeFilePath } = useAppStore()

  const commands: Command[] = [
    // File operations
    {
      id: 'file.new',
      label: 'New File',
      description: 'Create a new file',
      category: 'File',
      keybinding: 'Ctrl+N',
      action: () => {
        // TODO: Implement new file
        console.log('New file')
      }
    },
    {
      id: 'file.open',
      label: 'Open File',
      description: 'Open an existing file',
      category: 'File',
      keybinding: 'Ctrl+O',
      action: () => {
        // TODO: Implement open file
        console.log('Open file')
      }
    },
    {
      id: 'file.save',
      label: 'Save File',
      description: 'Save the current file',
      category: 'File',
      keybinding: 'Ctrl+S',
      action: () => {
        // TODO: Implement save file
        console.log('Save file')
      }
    },
    {
      id: 'workspace.open',
      label: 'Open Workspace',
      description: 'Open a workspace folder',
      category: 'Workspace',
      keybinding: 'Ctrl+Shift+O',
      action: () => {
        // TODO: Implement open workspace
        console.log('Open workspace')
      }
    },
    // Editor operations
    {
      id: 'editor.find',
      label: 'Find',
      description: 'Find text in the current file',
      category: 'Editor',
      keybinding: 'Ctrl+F',
      action: () => {
        // TODO: Trigger find
        console.log('Find')
      }
    },
    {
      id: 'editor.replace',
      label: 'Replace',
      description: 'Find and replace text',
      category: 'Editor',
      keybinding: 'Ctrl+H',
      action: () => {
        // TODO: Trigger replace
        console.log('Replace')
      }
    },
    {
      id: 'editor.gotoLine',
      label: 'Go to Line',
      description: 'Jump to a specific line number',
      category: 'Editor',
      keybinding: 'Ctrl+G',
      action: () => {
        // TODO: Trigger go to line
        console.log('Go to line')
      }
    },
    {
      id: 'editor.format',
      label: 'Format Document',
      description: 'Format the entire document',
      category: 'Editor',
      keybinding: 'Ctrl+Shift+F',
      action: () => {
        // TODO: Trigger format
        console.log('Format document')
      }
    },
    {
      id: 'editor.comment',
      label: 'Toggle Comment',
      description: 'Toggle line comment',
      category: 'Editor',
      keybinding: 'Ctrl+/',
      action: () => {
        // TODO: Trigger comment
        console.log('Toggle comment')
      }
    },
    // View operations
    {
      id: 'view.toggleSidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the sidebar',
      category: 'View',
      action: () => {
        useAppStore.getState().toggleSidebar()
      }
    },
    {
      id: 'view.toggleTerminal',
      label: 'Toggle Terminal',
      description: 'Show or hide the terminal',
      category: 'View',
      action: () => {
        useAppStore.getState().toggleTerminal()
      }
    },
    // AI operations
    {
      id: 'ai.chat',
      label: 'Open AI Chat',
      description: 'Open the AI assistant chat',
      category: 'AI',
      keybinding: 'Ctrl+Shift+A',
      action: () => {
        // TODO: Open AI chat
        console.log('Open AI chat')
      }
    },
    {
      id: 'ai.generate',
      label: 'Generate Code',
      description: 'Generate code with AI',
      category: 'AI',
      keybinding: 'Ctrl+Shift+G',
      action: () => {
        // TODO: Generate code
        console.log('Generate code')
      }
    },
    {
      id: 'ai.review',
      label: 'Review Code',
      description: 'Review code with AI',
      category: 'AI',
      keybinding: 'Ctrl+Shift+R',
      action: () => {
        // TODO: Review code
        console.log('Review code')
      }
    }
  ]

  const filteredCommands = commands.filter(command =>
    command.label.toLowerCase().includes(query.toLowerCase()) ||
    command.description?.toLowerCase().includes(query.toLowerCase()) ||
    command.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
    }
  }

  const handleCommandClick = (command: Command) => {
    command.action()
    onClose()
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
            placeholder="Type a command or search..."
            className="w-full px-3 py-2 bg-vscode-editor border border-vscode-border rounded text-vscode-text placeholder-vscode-text-muted focus:outline-none focus:border-vscode-accent"
          />
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-vscode-text-muted">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`
                  flex items-center justify-between px-4 py-3 cursor-pointer border-b border-vscode-border last:border-b-0
                  ${index === selectedIndex ? 'bg-vscode-accent text-white' : 'hover:bg-vscode-border text-vscode-text'}
                `}
                onClick={() => handleCommandClick(command)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{command.label}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      index === selectedIndex ? 'bg-white bg-opacity-20' : 'bg-vscode-sidebar'
                    }`}>
                      {command.category}
                    </span>
                  </div>
                  {command.description && (
                    <div className={`text-sm mt-1 ${
                      index === selectedIndex ? 'text-white text-opacity-80' : 'text-vscode-text-muted'
                    }`}>
                      {command.description}
                    </div>
                  )}
                </div>
                {command.keybinding && (
                  <div className={`text-xs px-2 py-1 rounded font-mono ${
                    index === selectedIndex ? 'bg-white bg-opacity-20' : 'bg-vscode-sidebar'
                  }`}>
                    {command.keybinding}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-vscode-border text-xs text-vscode-text-muted flex justify-between">
          <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette