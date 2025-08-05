import { safeStorage } from 'electron'
import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import * as crypto from 'crypto'

export interface SecureCredential {
  service: string
  account: string
  encrypted: boolean
}

export class CredentialManager {
  private static instance: CredentialManager
  private credentialsPath: string
  private encryptionKey: Buffer | null = null

  private constructor() {
    const userDataPath = app.getPath('userData')
    this.credentialsPath = join(userDataPath, 'credentials.json')
    this.initializeEncryption()
  }

  public static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager()
    }
    return CredentialManager.instance
  }

  private initializeEncryption(): void {
    try {
      // Use Electron's safeStorage if available (requires user authentication on some platforms)
      if (safeStorage.isEncryptionAvailable()) {
        console.log('Using Electron safeStorage for credential encryption')
        return
      }
      
      // Fallback to our own encryption
      this.generateEncryptionKey()
    } catch (error) {
      console.warn('Failed to initialize secure storage, using fallback encryption:', error)
      this.generateEncryptionKey()
    }
  }

  private generateEncryptionKey(): void {
    // Generate a key based on machine-specific information
    const machineId = this.getMachineId()
    this.encryptionKey = crypto.scryptSync(machineId, 'homeward-salt', 32)
  }

  private getMachineId(): string {
    // Create a machine-specific identifier
    const os = require('os')
    const machineInfo = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.userInfo().username
    ].join('-')
    
    return crypto.createHash('sha256').update(machineInfo).digest('hex')
  }

  public async storeCredential(service: string, account: string, password: string): Promise<void> {
    try {
      // Try to use OS keychain first
      if (await this.useOSKeychain()) {
        await this.storeInOSKeychain(service, account, password)
        return
      }

      // Fallback to encrypted file storage
      await this.storeInEncryptedFile(service, account, password)
    } catch (error) {
      throw new Error(`Failed to store credential: ${error}`)
    }
  }

  public async getCredential(service: string, account: string): Promise<string | null> {
    try {
      // Try OS keychain first
      if (await this.useOSKeychain()) {
        return await this.getFromOSKeychain(service, account)
      }

      // Fallback to encrypted file storage
      return await this.getFromEncryptedFile(service, account)
    } catch (error) {
      console.error(`Failed to retrieve credential: ${error}`)
      return null
    }
  }

  public async deleteCredential(service: string, account: string): Promise<boolean> {
    try {
      // Try OS keychain first
      if (await this.useOSKeychain()) {
        return await this.deleteFromOSKeychain(service, account)
      }

      // Fallback to encrypted file storage
      return await this.deleteFromEncryptedFile(service, account)
    } catch (error) {
      console.error(`Failed to delete credential: ${error}`)
      return false
    }
  }

  public async listCredentials(): Promise<SecureCredential[]> {
    try {
      if (await this.useOSKeychain()) {
        return await this.listFromOSKeychain()
      }

      return await this.listFromEncryptedFile()
    } catch (error) {
      console.error(`Failed to list credentials: ${error}`)
      return []
    }
  }

  private async useOSKeychain(): Promise<boolean> {
    // Check if we can use OS keychain
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  private async storeInOSKeychain(service: string, account: string, password: string): Promise<void> {
    try {
      const encrypted = safeStorage.encryptString(password)
      const credentials = await this.loadCredentialsFile()
      
      const key = `${service}:${account}`
      credentials[key] = {
        service,
        account,
        encrypted: true,
        data: encrypted.toString('base64')
      }

      await this.saveCredentialsFile(credentials)
    } catch (error) {
      throw new Error(`OS keychain storage failed: ${error}`)
    }
  }

  private async getFromOSKeychain(service: string, account: string): Promise<string | null> {
    try {
      const credentials = await this.loadCredentialsFile()
      const key = `${service}:${account}`
      const credential = credentials[key]

      if (!credential || !credential.encrypted) {
        return null
      }

      const encryptedBuffer = Buffer.from(credential.data, 'base64')
      return safeStorage.decryptString(encryptedBuffer)
    } catch (error) {
      console.error(`OS keychain retrieval failed: ${error}`)
      return null
    }
  }

  private async deleteFromOSKeychain(service: string, account: string): Promise<boolean> {
    try {
      const credentials = await this.loadCredentialsFile()
      const key = `${service}:${account}`
      
      if (credentials[key]) {
        delete credentials[key]
        await this.saveCredentialsFile(credentials)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`OS keychain deletion failed: ${error}`)
      return false
    }
  }

  private async listFromOSKeychain(): Promise<SecureCredential[]> {
    try {
      const credentials = await this.loadCredentialsFile()
      return Object.values(credentials).map(cred => ({
        service: cred.service,
        account: cred.account,
        encrypted: cred.encrypted
      }))
    } catch (error) {
      console.error(`OS keychain listing failed: ${error}`)
      return []
    }
  }

  private async storeInEncryptedFile(service: string, account: string, password: string): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available')
    }

    try {
      const credentials = await this.loadCredentialsFile()
      const key = `${service}:${account}`
      
      // Encrypt the password
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey)
      let encrypted = cipher.update(password, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      credentials[key] = {
        service,
        account,
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex')
      }

      await this.saveCredentialsFile(credentials)
    } catch (error) {
      throw new Error(`Encrypted file storage failed: ${error}`)
    }
  }

  private async getFromEncryptedFile(service: string, account: string): Promise<string | null> {
    if (!this.encryptionKey) {
      return null
    }

    try {
      const credentials = await this.loadCredentialsFile()
      const key = `${service}:${account}`
      const credential = credentials[key]

      if (!credential || !credential.encrypted) {
        return null
      }

      // Decrypt the password
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey)
      let decrypted = decipher.update(credential.data, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error(`Encrypted file retrieval failed: ${error}`)
      return null
    }
  }

  private async deleteFromEncryptedFile(service: string, account: string): Promise<boolean> {
    try {
      const credentials = await this.loadCredentialsFile()
      const key = `${service}:${account}`
      
      if (credentials[key]) {
        delete credentials[key]
        await this.saveCredentialsFile(credentials)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`Encrypted file deletion failed: ${error}`)
      return false
    }
  }

  private async listFromEncryptedFile(): Promise<SecureCredential[]> {
    try {
      const credentials = await this.loadCredentialsFile()
      return Object.values(credentials).map(cred => ({
        service: cred.service,
        account: cred.account,
        encrypted: cred.encrypted
      }))
    } catch (error) {
      console.error(`Encrypted file listing failed: ${error}`)
      return []
    }
  }

  private async loadCredentialsFile(): Promise<Record<string, any>> {
    try {
      const exists = await fs.access(this.credentialsPath).then(() => true).catch(() => false)
      if (!exists) {
        return {}
      }

      const content = await fs.readFile(this.credentialsPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.warn('Failed to load credentials file, starting fresh:', error)
      return {}
    }
  }

  private async saveCredentialsFile(credentials: Record<string, any>): Promise<void> {
    try {
      // Ensure the directory exists
      const dir = require('path').dirname(this.credentialsPath)
      await fs.mkdir(dir, { recursive: true })

      // Save with restricted permissions
      await fs.writeFile(this.credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 })
    } catch (error) {
      throw new Error(`Failed to save credentials file: ${error}`)
    }
  }

  // Utility methods for LLM providers
  public async storeLLMApiKey(providerName: string, apiKey: string): Promise<void> {
    await this.storeCredential('homeward-llm', providerName, apiKey)
  }

  public async getLLMApiKey(providerName: string): Promise<string | null> {
    return await this.getCredential('homeward-llm', providerName)
  }

  public async deleteLLMApiKey(providerName: string): Promise<boolean> {
    return await this.deleteCredential('homeward-llm', providerName)
  }

  public async listLLMApiKeys(): Promise<string[]> {
    const credentials = await this.listCredentials()
    return credentials
      .filter(cred => cred.service === 'homeward-llm')
      .map(cred => cred.account)
  }

  // Security utilities
  public async clearAllCredentials(): Promise<void> {
    try {
      await fs.unlink(this.credentialsPath)
    } catch (error) {
      // File might not exist, which is fine
    }
  }

  public getSecurityInfo(): {
    encryptionAvailable: boolean
    storageMethod: 'os-keychain' | 'encrypted-file' | 'none'
    isSecure: boolean
  } {
    const encryptionAvailable = safeStorage.isEncryptionAvailable()
    
    return {
      encryptionAvailable,
      storageMethod: encryptionAvailable ? 'os-keychain' : (this.encryptionKey ? 'encrypted-file' : 'none'),
      isSecure: encryptionAvailable || !!this.encryptionKey
    }
  }
}