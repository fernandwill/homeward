import { create } from 'zustand'
import { Notification } from '../components/NotificationSystem'

interface NotificationState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification,
    }

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  clearNotifications: () => {
    set({ notifications: [] })
  },
}))

// Helper functions for common notification types
export const showSuccess = (title: string, message?: string) => {
  useNotificationStore.getState().addNotification({
    type: 'success',
    title,
    message,
  })
}

export const showError = (title: string, message?: string) => {
  useNotificationStore.getState().addNotification({
    type: 'error',
    title,
    message,
    duration: 8000, // Errors stay longer
  })
}

export const showWarning = (title: string, message?: string) => {
  useNotificationStore.getState().addNotification({
    type: 'warning',
    title,
    message,
  })
}

export const showInfo = (title: string, message?: string) => {
  useNotificationStore.getState().addNotification({
    type: 'info',
    title,
    message,
  })
}