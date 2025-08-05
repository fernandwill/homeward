import React, { useState, useEffect } from 'react'
import { SecurityInfo } from '../types/electron'
import { showError, showSuccess, showWarning } from '../stores/notificationStore'

interface SecurityInfoProps {
  visible: boolean
  onClose: () => void
}

const SecurityInfoComponent: React.FC<SecurityInfoProps> = ({ visible, onClose }) => {
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null)
  const [storedKeys, setStoredKeys] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadSecurityInfo()
    }
  }, [visible])

  const loadSecurityInfo = async () => {
    try {
      setIsLoading(true)
      const [info, keys] = await Promise.all([
        window.electronAPI.getSecurityInfo(),
        window.electronAPI.listStoredApiKeys()
      ])
      
      setSecurityInfo(info)
      setStoredKeys(keys)
    } catch (error) {
      showError('Failed to load security info', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAllCredentials = async () => {
    const confirmed = confirm(
      'Are you sure you want to clear all stored API keys? This action cannot be undone and you will need to re-enter all your API keys.'
    )
    
    if (!confirmed) return

    try {
      setIsLoading(true)
      await window.electronAPI.clearAllCredentials()
      setStoredKeys([])
      showSuccess('Credentials cleared', 'All stored API keys have been removed')
    } catch (error) {
      showError('Failed to clear credentials', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteApiKey = async (providerName: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete the API key for ${providerName}? You will need to re-enter it to use this provider.`
    )
    
    if (!confirmed) return

    try {
      const success = await window.electronAPI.deleteApiKey(providerName)
      if (success) {
        setStoredKeys(prev => prev.filter(key => key !== providerName))
        showSuccess('API key deleted', `${providerName} API key removed from secure storage`)
      } else {
        showError('Failed to delete API key', 'The API key could not be removed')
      }
    } catch (error) {
      showError('Failed to delete API key', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const getStorageMethodDescription = (method: string): { title: string; description: string; icon: string } => {
    switch (method) {
      case 'os-keychain':
        return {
          title: 'OS Keychain (Most Secure)',
          description: 'API keys are stored in your operating system\'s secure keychain (Windows Credential Manager, macOS Keychain, or Linux Secret Service). This provides the highest level of security as keys are encrypted by the OS and require user authentication to access.',
          icon: '🔐'
        }
      case 'encrypted-file':
        return {
          title: 'Encrypted File Storage (Secure)',
          description: 'API keys are encrypted using machine-specific encryption keys and stored in an encrypted file. While not as secure as OS keychain, this still provides good protection against unauthorized access.',
          icon: '🔒'
        }
      case 'none':
        return {
          title: 'No Encryption (Not Secure)',
          description: 'API keys cannot be encrypted on this system. This is not recommended for production use. Consider upgrading your system or using environment variables instead.',
          icon: '⚠️'
        }
      default:
        return {
          title: 'Unknown Storage Method',
          description: 'The storage method could not be determined.',
          icon: '❓'
        }
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-panel border border-vscode-border rounded-lg w-full max-w-3xl max-h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-vscode-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-vscode-text">Security & Credential Management</h2>
            <button
              onClick={onClose}
              className="text-vscode-text-muted hover:text-vscode-text text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="text-center text-vscode-text-muted">Loading security information...</div>
          ) : securityInfo ? (
            <>
              {/* Security Status */}
              <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                <h3 className="text-lg font-semibold text-vscode-text mb-3">Security Status</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-vscode-text">Encryption Available:</span>
                    <span className={`font-medium ${securityInfo.encryptionAvailable ? 'text-green-400' : 'text-red-400'}`}>
                      {securityInfo.encryptionAvailable ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-vscode-text">Overall Security:</span>
                    <span className={`font-medium ${securityInfo.isSecure ? 'text-green-400' : 'text-red-400'}`}>
                      {securityInfo.isSecure ? '🔒 Secure' : '⚠️ Not Secure'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Method */}
              <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                <h3 className="text-lg font-semibold text-vscode-text mb-3">Storage Method</h3>
                
                {(() => {
                  const methodInfo = getStorageMethodDescription(securityInfo.storageMethod)
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{methodInfo.icon}</span>
                        <div>
                          <div className="font-medium text-vscode-text">{methodInfo.title}</div>
                          <div className="text-sm text-vscode-text-muted mt-1">
                            {methodInfo.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Stored API Keys */}
              <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-vscode-text">Stored API Keys</h3>
                  <span className="text-sm text-vscode-text-muted">
                    {storedKeys.length} key{storedKeys.length !== 1 ? 's' : ''} stored
                  </span>
                </div>
                
                {storedKeys.length === 0 ? (
                  <div className="text-center text-vscode-text-muted py-4">
                    No API keys are currently stored
                  </div>
                ) : (
                  <div className="space-y-2">
                    {storedKeys.map(providerName => (
                      <div key={providerName} className="flex items-center justify-between p-3 bg-vscode-editor rounded border border-vscode-border">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">🔑</span>
                          <div>
                            <div className="font-medium text-vscode-text capitalize">{providerName}</div>
                            <div className="text-xs text-vscode-text-muted">
                              API key stored securely
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteApiKey(providerName)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Recommendations */}
              <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                <h3 className="text-lg font-semibold text-vscode-text mb-3">Security Recommendations</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <div>
                      <div className="font-medium text-vscode-text">API keys are never stored in plain text</div>
                      <div className="text-vscode-text-muted">All API keys are encrypted before storage</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <div>
                      <div className="font-medium text-vscode-text">Configuration files contain no sensitive data</div>
                      <div className="text-vscode-text-muted">Only non-sensitive settings are stored in config files</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-400 mt-0.5">ℹ</span>
                    <div>
                      <div className="font-medium text-vscode-text">Regular security audits recommended</div>
                      <div className="text-vscode-text-muted">Periodically review and rotate your API keys</div>
                    </div>
                  </div>
                  
                  {!securityInfo.isSecure && (
                    <div className="flex items-start space-x-3">
                      <span className="text-red-400 mt-0.5">⚠</span>
                      <div>
                        <div className="font-medium text-vscode-text">Consider using environment variables</div>
                        <div className="text-vscode-text-muted">For maximum security, store API keys as environment variables</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-vscode-border">
                <button
                  onClick={loadSecurityInfo}
                  className="px-4 py-2 bg-vscode-border text-vscode-text rounded hover:bg-vscode-sidebar transition-colors"
                >
                  Refresh Info
                </button>
                
                {storedKeys.length > 0 && (
                  <button
                    onClick={handleClearAllCredentials}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Clearing...' : 'Clear All Credentials'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-vscode-text-muted">Failed to load security information</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SecurityInfoComponent