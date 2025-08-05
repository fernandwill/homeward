import React, { useState, useEffect } from 'react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface NotificationSystemProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onRemove }) => {
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration !== 0) {
        const timer = setTimeout(() => {
          onRemove(notification.id)
        }, notification.duration || 5000)

        return () => clearTimeout(timer)
      }
    })
  }, [notifications, onRemove])

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return 'ℹ️'
    }
  }

  const getColors = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-900 bg-opacity-20'
      case 'error': return 'border-red-500 bg-red-900 bg-opacity-20'
      case 'warning': return 'border-yellow-500 bg-yellow-900 bg-opacity-20'
      case 'info': return 'border-blue-500 bg-blue-900 bg-opacity-20'
      default: return 'border-vscode-border bg-vscode-panel'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            max-w-sm p-4 rounded-lg border shadow-lg
            ${getColors(notification.type)}
            animate-in slide-in-from-right duration-300
          `}
        >
          <div className="flex items-start space-x-3">
            <span className="text-lg flex-shrink-0">
              {getIcon(notification.type)}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-vscode-text">
                {notification.title}
              </h4>
              {notification.message && (
                <p className="text-xs text-vscode-text-muted mt-1">
                  {notification.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="text-vscode-text-muted hover:text-vscode-text text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NotificationSystem