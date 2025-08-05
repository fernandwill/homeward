import { create } from 'zustand'
import { FileNode, WorkspaceConfig } from '../types/electron'

interface OpenFile {
  path: string
  name: string
  content: string
  language: string
  isDirty: boolean
  isLoading: boolean
}

interface AppState {
  // Window state
  isMaximized: boolean
  isFocused: boolean
  
  // Workspace state
  workspaceConfig: WorkspaceConfig | null
  fileTree: FileNode[]
  
  // Editor state
  openFiles: OpenFile[]
  activeFilePath: string | null
  
  // UI state
  sidebarWidth: number
  showSidebar: boolean
  showTerminal: boolean
  terminalHeight: number
  
  // Actions
  setWindowState: (isMaximized: boolean, isFocused: boolean) => void
  setWorkspace: (config: WorkspaceConfig | null) => void
  setFileTree: (tree: FileNode[]) => void
  openFile: (filePath: string, content: string, language: string) => void
  closeFile: (filePath: string) => void
  setActiveFile: (filePath: string) => void
  updateFileContent: (filePath: string, content: string) => void
  markFileDirty: (filePath: string, isDirty: boolean) => void
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  toggleTerminal: () => void
  setTerminalHeight: (height: number) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isMaximized: false,
  isFocused: true,
  workspaceConfig: null,
  fileTree: [],
  openFiles: [],
  activeFilePath: null,
  sidebarWidth: 250,
  showSidebar: true,
  showTerminal: false,
  terminalHeight: 200,

  // Actions
  setWindowState: (isMaximized, isFocused) => {
    set({ isMaximized, isFocused })
  },

  setWorkspace: (workspaceConfig) => {
    set({ workspaceConfig })
  },

  setFileTree: (fileTree) => {
    set({ fileTree })
  },

  openFile: (filePath, content, language) => {
    const { openFiles } = get()
    
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === filePath)
    if (existingFile) {
      set({ activeFilePath: filePath })
      return
    }

    // Extract filename from path
    const name = filePath.split(/[/\\]/).pop() || 'Untitled'

    const newFile: OpenFile = {
      path: filePath,
      name,
      content,
      language,
      isDirty: false,
      isLoading: false,
    }

    set({
      openFiles: [...openFiles, newFile],
      activeFilePath: filePath,
    })
  },

  closeFile: (filePath) => {
    const { openFiles, activeFilePath } = get()
    const updatedFiles = openFiles.filter(f => f.path !== filePath)
    
    let newActiveFile = activeFilePath
    if (activeFilePath === filePath) {
      // If closing the active file, switch to the last remaining file
      newActiveFile = updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1].path : null
    }

    set({
      openFiles: updatedFiles,
      activeFilePath: newActiveFile,
    })
  },

  setActiveFile: (filePath) => {
    set({ activeFilePath: filePath })
  },

  updateFileContent: (filePath, content) => {
    const { openFiles } = get()
    const updatedFiles = openFiles.map(file => 
      file.path === filePath 
        ? { ...file, content, isDirty: true }
        : file
    )
    set({ openFiles: updatedFiles })
  },

  markFileDirty: (filePath, isDirty) => {
    const { openFiles } = get()
    const updatedFiles = openFiles.map(file => 
      file.path === filePath 
        ? { ...file, isDirty }
        : file
    )
    set({ openFiles: updatedFiles })
  },

  setSidebarWidth: (sidebarWidth) => {
    set({ sidebarWidth })
  },

  toggleSidebar: () => {
    set(state => ({ showSidebar: !state.showSidebar }))
  },

  toggleTerminal: () => {
    set(state => ({ showTerminal: !state.showTerminal }))
  },

  setTerminalHeight: (terminalHeight) => {
    set({ terminalHeight })
  },
}))