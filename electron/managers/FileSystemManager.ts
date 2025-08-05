import { promises as fs } from 'fs'
import { join, dirname, extname, basename } from 'path'
import { app } from 'electron'

export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: Date
  extension?: string
}

export class FileSystemManager {
  private recentFiles: string[] = []
  private maxRecentFiles = 10

  constructor() {
    this.loadRecentFiles()
  }

  public async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      this.addToRecentFiles(filePath)
      return content
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`)
    }
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      
      await fs.writeFile(filePath, content, 'utf-8')
      this.addToRecentFiles(filePath)
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`)
    }
  }

  public async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  public async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.stat(filePath)
      const name = basename(filePath)
      
      return {
        name,
        path: filePath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.isFile() ? stats.size : undefined,
        modified: stats.mtime,
        extension: stats.isFile() ? extname(filePath) : undefined,
      }
    } catch (error) {
      throw new Error(`Failed to get file info: ${error}`)
    }
  }

  public async createFile(filePath: string, content: string = ''): Promise<void> {
    try {
      const dir = dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to create file: ${error}`)
    }
  }

  public async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`)
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true })
      } else {
        await fs.unlink(filePath)
      }
      this.removeFromRecentFiles(filePath)
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`)
    }
  }

  public async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const dir = dirname(destinationPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.copyFile(sourcePath, destinationPath)
    } catch (error) {
      throw new Error(`Failed to copy file: ${error}`)
    }
  }

  public async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const dir = dirname(destinationPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.rename(sourcePath, destinationPath)
      this.removeFromRecentFiles(sourcePath)
      this.addToRecentFiles(destinationPath)
    } catch (error) {
      throw new Error(`Failed to move file: ${error}`)
    }
  }

  public getRecentFiles(): string[] {
    return [...this.recentFiles]
  }

  private addToRecentFiles(filePath: string): void {
    // Remove if already exists
    const index = this.recentFiles.indexOf(filePath)
    if (index > -1) {
      this.recentFiles.splice(index, 1)
    }

    // Add to beginning
    this.recentFiles.unshift(filePath)

    // Limit size
    if (this.recentFiles.length > this.maxRecentFiles) {
      this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles)
    }

    this.saveRecentFiles()
  }

  private removeFromRecentFiles(filePath: string): void {
    const index = this.recentFiles.indexOf(filePath)
    if (index > -1) {
      this.recentFiles.splice(index, 1)
      this.saveRecentFiles()
    }
  }

  private async loadRecentFiles(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData')
      const recentFilesPath = join(userDataPath, 'recent-files.json')
      
      if (await this.exists(recentFilesPath)) {
        const content = await fs.readFile(recentFilesPath, 'utf-8')
        this.recentFiles = JSON.parse(content)
      }
    } catch (error) {
      console.warn('Failed to load recent files:', error)
      this.recentFiles = []
    }
  }

  private async saveRecentFiles(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData')
      const recentFilesPath = join(userDataPath, 'recent-files.json')
      
      await fs.writeFile(recentFilesPath, JSON.stringify(this.recentFiles, null, 2))
    } catch (error) {
      console.warn('Failed to save recent files:', error)
    }
  }
}