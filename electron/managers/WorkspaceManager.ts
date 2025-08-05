import { promises as fs } from 'fs'
import { join, basename, relative, dirname } from 'path'
import { watch, FSWatcher } from 'chokidar'
import { app } from 'electron'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modified?: Date
}

export interface WorkspaceConfig {
  name: string
  path: string
  openFiles: string[]
  activeFile?: string
  expandedFolders: string[]
  settings: Record<string, any>
}

export class WorkspaceManager {
  private currentWorkspacePath: string | null = null
  private fileWatcher: FSWatcher | null = null
  private workspaceConfig: WorkspaceConfig | null = null
  private fileTree: FileNode[] = []

  constructor() {
    this.loadLastWorkspace()
  }

  public async openWorkspace(workspacePath: string): Promise<WorkspaceConfig> {
    try {
      // Close current workspace if any
      if (this.fileWatcher) {
        await this.fileWatcher.close()
      }

      this.currentWorkspacePath = workspacePath
      
      // Load or create workspace config
      await this.loadWorkspaceConfig()
      
      // Generate file tree
      await this.refreshFileTree()
      
      // Start watching for file changes
      this.startFileWatcher()
      
      // Save as last workspace
      await this.saveLastWorkspace()

      return this.workspaceConfig!
    } catch (error) {
      throw new Error(`Failed to open workspace: ${error}`)
    }
  }

  public async closeWorkspace(): Promise<void> {
    if (this.fileWatcher) {
      await this.fileWatcher.close()
      this.fileWatcher = null
    }

    if (this.workspaceConfig) {
      await this.saveWorkspaceConfig()
    }

    this.currentWorkspacePath = null
    this.workspaceConfig = null
    this.fileTree = []
  }

  public getCurrentWorkspacePath(): string | null {
    return this.currentWorkspacePath
  }

  public getWorkspaceConfig(): WorkspaceConfig | null {
    return this.workspaceConfig
  }

  public async getFileTree(): Promise<FileNode[]> {
    if (!this.currentWorkspacePath) {
      return []
    }

    return this.fileTree
  }

  public async refreshFileTree(): Promise<void> {
    if (!this.currentWorkspacePath) {
      this.fileTree = []
      return
    }

    try {
      this.fileTree = await this.buildFileTree(this.currentWorkspacePath)
    } catch (error) {
      console.error('Failed to refresh file tree:', error)
      this.fileTree = []
    }
  }

  public addOpenFile(filePath: string): void {
    if (!this.workspaceConfig) return

    if (!this.workspaceConfig.openFiles.includes(filePath)) {
      this.workspaceConfig.openFiles.push(filePath)
    }
  }

  public removeOpenFile(filePath: string): void {
    if (!this.workspaceConfig) return

    const index = this.workspaceConfig.openFiles.indexOf(filePath)
    if (index > -1) {
      this.workspaceConfig.openFiles.splice(index, 1)
    }

    if (this.workspaceConfig.activeFile === filePath) {
      this.workspaceConfig.activeFile = this.workspaceConfig.openFiles[0] || undefined
    }
  }

  public setActiveFile(filePath: string): void {
    if (!this.workspaceConfig) return

    this.workspaceConfig.activeFile = filePath
    this.addOpenFile(filePath)
  }

  public toggleFolderExpansion(folderPath: string): void {
    if (!this.workspaceConfig) return

    const index = this.workspaceConfig.expandedFolders.indexOf(folderPath)
    if (index > -1) {
      this.workspaceConfig.expandedFolders.splice(index, 1)
    } else {
      this.workspaceConfig.expandedFolders.push(folderPath)
    }
  }

  public async updateWorkspaceSettings(settings: Record<string, any>): Promise<void> {
    if (!this.workspaceConfig) return

    this.workspaceConfig.settings = { ...this.workspaceConfig.settings, ...settings }
    await this.saveWorkspaceConfig()
  }

  public async saveWorkspaceConfig(): Promise<void> {
    if (!this.currentWorkspacePath || !this.workspaceConfig) return

    try {
      const configDir = join(this.currentWorkspacePath, '.homeward')
      const configPath = join(configDir, 'workspace.json')
      
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(this.workspaceConfig, null, 2))
    } catch (error) {
      console.error('Failed to save workspace config:', error)
    }
  }

  public async createFileInWorkspace(relativePath: string, content: string = ''): Promise<void> {
    if (!this.currentWorkspacePath) {
      throw new Error('No workspace is currently open')
    }

    const fullPath = join(this.currentWorkspacePath, relativePath)
    const dir = dirname(fullPath)
    
    try {
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(fullPath, content, 'utf-8')
      
      // Refresh file tree to show the new file
      await this.refreshFileTree()
    } catch (error) {
      throw new Error(`Failed to create file: ${error}`)
    }
  }

  public async createDirectoryInWorkspace(relativePath: string): Promise<void> {
    if (!this.currentWorkspacePath) {
      throw new Error('No workspace is currently open')
    }

    const fullPath = join(this.currentWorkspacePath, relativePath)
    
    try {
      await fs.mkdir(fullPath, { recursive: true })
      
      // Refresh file tree to show the new directory
      await this.refreshFileTree()
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`)
    }
  }

  public async deleteFileInWorkspace(relativePath: string): Promise<void> {
    if (!this.currentWorkspacePath) {
      throw new Error('No workspace is currently open')
    }

    const fullPath = join(this.currentWorkspacePath, relativePath)
    
    try {
      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true })
      } else {
        await fs.unlink(fullPath)
      }
      
      // Remove from open files if it was open
      this.removeOpenFile(fullPath)
      
      // Refresh file tree to reflect the deletion
      await this.refreshFileTree()
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`)
    }
  }

  public async renameFileInWorkspace(oldRelativePath: string, newRelativePath: string): Promise<void> {
    if (!this.currentWorkspacePath) {
      throw new Error('No workspace is currently open')
    }

    const oldFullPath = join(this.currentWorkspacePath, oldRelativePath)
    const newFullPath = join(this.currentWorkspacePath, newRelativePath)
    
    try {
      // Ensure the destination directory exists
      const newDir = dirname(newFullPath)
      await fs.mkdir(newDir, { recursive: true })
      
      await fs.rename(oldFullPath, newFullPath)
      
      // Update open files list if the file was open
      if (this.workspaceConfig?.openFiles.includes(oldFullPath)) {
        this.removeOpenFile(oldFullPath)
        this.addOpenFile(newFullPath)
        
        // Update active file if it was the renamed file
        if (this.workspaceConfig.activeFile === oldFullPath) {
          this.workspaceConfig.activeFile = newFullPath
        }
      }
      
      // Refresh file tree to reflect the rename
      await this.refreshFileTree()
    } catch (error) {
      throw new Error(`Failed to rename file: ${error}`)
    }
  }

  public getWorkspaceStats(): {
    totalFiles: number
    totalDirectories: number
    openFiles: number
    lastModified?: Date
  } {
    const stats = {
      totalFiles: 0,
      totalDirectories: 0,
      openFiles: this.workspaceConfig?.openFiles.length || 0,
      lastModified: undefined as Date | undefined
    }

    const countNodes = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          stats.totalFiles++
          if (node.modified && (!stats.lastModified || node.modified > stats.lastModified)) {
            stats.lastModified = node.modified
          }
        } else {
          stats.totalDirectories++
          if (node.children) {
            countNodes(node.children)
          }
        }
      }
    }

    countNodes(this.fileTree)
    return stats
  }

  private async buildFileTree(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<FileNode[]> {
    if (currentDepth >= maxDepth) {
      return []
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes: FileNode[] = []

      // Sort: directories first, then files, both alphabetically
      const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      for (const entry of sortedEntries) {
        // Skip hidden files and common ignore patterns
        if (this.shouldIgnoreFile(entry.name)) {
          continue
        }

        const fullPath = join(dirPath, entry.name)
        const stats = await fs.stat(fullPath)

        const node: FileNode = {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          modified: stats.mtime,
        }

        if (entry.isDirectory()) {
          node.children = await this.buildFileTree(fullPath, maxDepth, currentDepth + 1)
        }

        nodes.push(node)
      }

      return nodes
    } catch (error) {
      console.error(`Failed to build file tree for ${dirPath}:`, error)
      return []
    }
  }

  private shouldIgnoreFile(fileName: string): boolean {
    const ignorePatterns = [
      /^\./,                    // Hidden files
      /^node_modules$/,         // Node modules
      /^\.git$/,               // Git directory
      /^dist$/,                // Build output
      /^build$/,               // Build output
      /^coverage$/,            // Test coverage
      /^\.vscode$/,            // VSCode settings
      /^\.idea$/,              // IntelliJ settings
      /\.log$/,                // Log files
      /\.tmp$/,                // Temporary files
      /~$/,                    // Backup files
    ]

    return ignorePatterns.some(pattern => pattern.test(fileName))
  }

  private startFileWatcher(): void {
    if (!this.currentWorkspacePath) return

    this.fileWatcher = watch(this.currentWorkspacePath, {
      ignored: /(^|[\/\\])\../, // Ignore hidden files
      persistent: true,
      ignoreInitial: true,
    })

    this.fileWatcher
      .on('add', (path) => {
        console.log('File added:', path)
        this.refreshFileTree()
      })
      .on('change', (path) => {
        console.log('File changed:', path)
      })
      .on('unlink', (path) => {
        console.log('File removed:', path)
        this.refreshFileTree()
      })
      .on('addDir', (path) => {
        console.log('Directory added:', path)
        this.refreshFileTree()
      })
      .on('unlinkDir', (path) => {
        console.log('Directory removed:', path)
        this.refreshFileTree()
      })
  }

  private async loadWorkspaceConfig(): Promise<void> {
    if (!this.currentWorkspacePath) return

    const configPath = join(this.currentWorkspacePath, '.homeward', 'workspace.json')
    
    try {
      const content = await fs.readFile(configPath, 'utf-8')
      this.workspaceConfig = JSON.parse(content)
    } catch {
      // Create default config
      this.workspaceConfig = {
        name: basename(this.currentWorkspacePath),
        path: this.currentWorkspacePath,
        openFiles: [],
        expandedFolders: [],
        settings: {},
      }
    }
  }

  private async saveWorkspaceConfig(): Promise<void> {
    if (!this.currentWorkspacePath || !this.workspaceConfig) return

    try {
      const configDir = join(this.currentWorkspacePath, '.homeward')
      const configPath = join(configDir, 'workspace.json')
      
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(this.workspaceConfig, null, 2))
    } catch (error) {
      console.error('Failed to save workspace config:', error)
    }
  }

  private async loadLastWorkspace(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData')
      const lastWorkspacePath = join(userDataPath, 'last-workspace.json')
      
      const content = await fs.readFile(lastWorkspacePath, 'utf-8')
      const data = JSON.parse(content)
      
      if (data.path && await this.exists(data.path)) {
        await this.openWorkspace(data.path)
      }
    } catch {
      // No last workspace or failed to load
    }
  }

  private async saveLastWorkspace(): Promise<void> {
    if (!this.currentWorkspacePath) return

    try {
      const userDataPath = app.getPath('userData')
      const lastWorkspacePath = join(userDataPath, 'last-workspace.json')
      
      await fs.writeFile(lastWorkspacePath, JSON.stringify({
        path: this.currentWorkspacePath,
        timestamp: new Date().toISOString(),
      }, null, 2))
    } catch (error) {
      console.error('Failed to save last workspace:', error)
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}