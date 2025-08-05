import React, { useEffect } from 'react'
import Layout from './components/Layout'
import NotificationSystem from './components/NotificationSystem'
import { useNotificationStore } from './stores/notificationStore'
import { workspaceStateManager } from './utils/workspaceState'

function App() {
  const { notifications, removeNotification } = useNotificationStore()

  useEffect(() => {
    // Initialize workspace state management
    const initializeWorkspace = async () => {
      try {
        // Restore workspace state if available
        await workspaceStateManager.restoreWorkspaceState()
      } catch (error) {
        console.error('Failed to initialize workspace:', error)
      }
    }

    initializeWorkspace()

    // Cleanup on unmount
    return () => {
      workspaceStateManager.destroy()
    }
  }, [])

  return (
    <div className="h-full bg-vscode-bg text-vscode-text">
      <Layout />
      <NotificationSystem 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  )
}

export default App