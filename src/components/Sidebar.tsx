import React, { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { showError, showSuccess } from '../stores/notificationStore'
import { WorkspaceStats } from '../types/electron'
import FileTree from './FileTree'
import InputDialog from './InputDialog'

const Sidebar: React.FC = () => {
  const { workspaceConfig, fileTree, setWorkspace, setFileTree, showSidebar, sidebarWidth } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null)
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)

  useEffect(() => {
    // Load initial workspace and file tree
    loadWorkspaceData()

    // Set up workspace event listeners
    const cleanup = window.electronAPI.onMenuAction((action, data) => {
      if (action === 'workspace:opened') {
        loadWorkspaceData()
      }
    })

    return cleanup
  }, [])

  const loadWorkspaceData = async () => {
    try {
      setIsLoading(true)
      
      // Get current workspace path
      const workspacePath = await window.electronAPI.getCurrentWorkspacePath()
      
      if (workspacePath) {
        // Load workspace config, file tree, and stats
        const [config, tree, stats] = await Promise.all([
          window.electronAPI.openWorkspace(workspacePath),
          window.electronAPI.getFileTree(),
          window.electronAPI.getWorkspaceStats()
        ])
        
        setWorkspace(config)
        setFileTree(tree)
        setWorkspaceStats(stats)
      } else {
        setWorkspace(null)
        setFileTree([])
        setWorkspaceStats(null)
      }
    } catch (error) {
      console.error('Failed to load workspace data:', error)
      showError('Failed to load workspace', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenWorkspace = async () => {
    // This will be triggered by the menu, but we can also add a button here
    try {
      const result = await window.electronAPI.openWorkspace('')
      if (result) {
        await loadWorkspaceData()
      }
    } catch (error) {
      console.error('Failed to open workspace:', error)
    }
  }

  if (!showSidebar) {
    return null
  }

  return (
    <div 
      className="bg-vscode-sidebar border-r border-vscode-border flex flex-col"
      style={{ width: sidebarWidth }}
    >
      {/* Explorer Header */}
      <div className="p-3 border-b border-vscode-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-vscode-text">Explorer</h3>
          <div className="flex items-center space-x-1">
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-vscode-border"
              title="New File"
              onClick={() => setShowNewFileDialog(true)}
            >
              <span className="text-xs text-vscode-text-muted">+</span>
            </button>
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-vscode-border"
              title="Refresh"
              onClick={loadWorkspaceData}
            >
              <span className="text-xs text-vscode-text-muted">↻</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-auto vscode-scrollbar">
        {isLoading ? (
          <div className="p-4 text-xs text-vscode-text-muted">
            Loading workspace...
          </div>
        ) : workspaceConfig ? (
          <div>
            {/* Workspace Name */}
            <div className="p-2 text-xs font-semibold text-vscode-text uppercase tracking-wide">
              {workspaceConfig.name}
            </div>
            
            {/* Workspace Stats */}
            {workspaceStats && (
              <div className="px-2 pb-2 text-xs text-vscode-text-muted">
                <div className="flex justify-between">
                  <span>{workspaceStats.totalFiles} files</span>
                  <span>{workspaceStats.totalDirectories} folders</span>
                </div>
                {workspaceStats.openFiles > 0 && (
                  <div className="mt-1">
                    {workspaceStats.openFiles} open
                  </div>
                )}
              </div>
            )}
            
            {/* File Tree */}
            <FileTree nodes={fileTree} />
          </div>
        ) : (
          <div className="p-4">
            <div className="text-xs text-vscode-text-muted mb-4">
              No workspace opened
            </div>
            <button
              className="text-xs text-vscode-accent hover:text-vscode-accent-hover underline"
              onClick={handleOpenWorkspace}
            >
              Open Workspace
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Sections */}
      <div className="border-t border-vscode-border">
        {/* AI Chat Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-vscode-text">AI Assistant</h4>
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-vscode-border"
              title="Open AI Chat"
            >
              <span className="text-xs text-vscode-text-muted">💬</span>
            </button>
          </div>
          <div className="text-xs text-vscode-text-muted">
            Ready to assist
          </div>
        </div>

        {/* Specs Section */}
        <div className="p-3 border-t border-vscode-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-vscode-text">Specs</h4>
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-vscode-border"
              title="New Spec"
            >
              <span className="text-xs text-vscode-text-muted">+</span>
            </button>
          </div>
          <div className="text-xs text-vscode-text-muted">
            No specs found
          </div>
        </div>
      </div>

      {/* New File Dialog */}
      <InputDialog
        title="Create New File"
        placeholder="Enter file name..."
        type="file"
        visible={showNewFileDialog}
        onConfirm={async (fileName) => {
          try {
            await window.electronAPI.createFileInWorkspace(fileName)
            await loadWorkspaceData()
            showSuccess('File created', `Successfully created ${fileName}`)
            setShowNewFileDialog(false)
          } catch (error) {
            showError('Failed to create file', error instanceof Error ? error.message : 'Unknown error')
          }
        }}
        onCancel={() => setShowNewFileDialog(false)}
      />
    </div>
  )
}

export default Sidebar