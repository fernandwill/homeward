import React, { useState, useEffect } from 'react'
import { LLMProviderConfig, LLMModel } from '../types/electron'
import { showError, showSuccess } from '../stores/notificationStore'
import SecurityInfoComponent from './SecurityInfo'

interface LLMSettingsProps {
  visible: boolean
  onClose: () => void
}

const LLMSettings: React.FC<LLMSettingsProps> = ({ visible, onClose }) => {
  const [providers, setProviders] = useState<LLMProviderConfig[]>([])
  const [activeProvider, setActiveProvider] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [providerStatuses, setProviderStatuses] = useState<Record<string, { available: boolean; error?: string }>>({})
  const [showSecurityInfo, setShowSecurityInfo] = useState(false)

  useEffect(() => {
    if (visible) {
      loadProviders()
    }
  }, [visible])

  const loadProviders = async () => {
    try {
      setIsLoading(true)
      const [providersData, activeProviderData] = await Promise.all([
        window.electronAPI.getProviders(),
        window.electronAPI.getActiveProvider()
      ])
      
      setProviders(providersData)
      setActiveProvider(activeProviderData)
      setSelectedProvider(activeProviderData || providersData[0]?.name || null)
      
      // Check provider statuses
      await checkAllProviderStatuses(providersData)
    } catch (error) {
      showError('Failed to load providers', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const checkAllProviderStatuses = async (providerList: LLMProviderConfig[]) => {
    const statuses: Record<string, { available: boolean; error?: string }> = {}
    
    for (const provider of providerList) {
      try {
        const status = await window.electronAPI.checkProviderStatus(provider.name)
        statuses[provider.name] = status
      } catch (error) {
        statuses[provider.name] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    setProviderStatuses(statuses)
  }

  const handleProviderToggle = async (providerName: string, enabled: boolean) => {
    try {
      const provider = providers.find(p => p.name === providerName)
      if (!provider) return

      await window.electronAPI.updateProvider(providerName, { enabled })
      
      setProviders(prev => prev.map(p => 
        p.name === providerName ? { ...p, enabled } : p
      ))
      
      showSuccess('Provider updated', `${provider.displayName} ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      showError('Failed to update provider', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleSetActiveProvider = async (providerName: string) => {
    try {
      const success = await window.electronAPI.setActiveProvider(providerName)
      if (success) {
        setActiveProvider(providerName)
        showSuccess('Active provider changed', `Now using ${providers.find(p => p.name === providerName)?.displayName}`)
      } else {
        showError('Failed to set active provider', 'Provider not found or not enabled')
      }
    } catch (error) {
      showError('Failed to set active provider', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleApiKeyUpdate = async (providerName: string, apiKey: string) => {
    try {
      setIsLoading(true)
      
      // Use the secure validation and storage method
      const result = await window.electronAPI.validateAndStoreApiKey(providerName, apiKey)
      
      if (!result.valid) {
        showError('Invalid API key', result.error || 'The provided API key is not valid')
        return
      }

      if (result.error) {
        showError('API key validation warning', result.error)
      }
      
      setProviders(prev => prev.map(p => 
        p.name === providerName ? { ...p, apiKey } : p
      ))
      
      // Recheck status
      const status = await window.electronAPI.checkProviderStatus(providerName)
      setProviderStatuses(prev => ({ ...prev, [providerName]: status }))
      
      showSuccess('API key saved securely', `${providers.find(p => p.name === providerName)?.displayName} API key stored in secure storage`)
    } catch (error) {
      showError('Failed to update API key', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (providerName: string) => {
    const status = providerStatuses[providerName]
    if (!status) return '⏳'
    return status.available ? '✅' : '❌'
  }

  const getStatusText = (providerName: string) => {
    const status = providerStatuses[providerName]
    if (!status) return 'Checking...'
    return status.available ? 'Available' : (status.error || 'Unavailable')
  }

  const selectedProviderData = providers.find(p => p.name === selectedProvider)

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-panel border border-vscode-border rounded-lg w-full max-w-4xl max-h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-vscode-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-vscode-text">LLM Provider Settings</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSecurityInfo(true)}
                className="px-3 py-1 text-sm bg-vscode-border text-vscode-text rounded hover:bg-vscode-sidebar transition-colors"
                title="View security information"
              >
                🔒 Security Info
              </button>
              <button
                onClick={onClose}
                className="text-vscode-text-muted hover:text-vscode-text text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Provider List */}
          <div className="w-1/3 border-r border-vscode-border p-4">
            <h3 className="text-sm font-semibold text-vscode-text mb-4">Providers</h3>
            <div className="space-y-2">
              {providers.map(provider => (
                <div
                  key={provider.name}
                  className={`
                    p-3 rounded cursor-pointer border transition-colors
                    ${selectedProvider === provider.name 
                      ? 'bg-vscode-accent text-white border-vscode-accent' 
                      : 'bg-vscode-sidebar border-vscode-border hover:bg-vscode-border'
                    }
                  `}
                  onClick={() => setSelectedProvider(provider.name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{provider.displayName}</div>
                      <div className={`text-xs ${selectedProvider === provider.name ? 'text-white text-opacity-80' : 'text-vscode-text-muted'}`}>
                        {getStatusIcon(provider.name)} {getStatusText(provider.name)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {activeProvider === provider.name && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Active</span>
                      )}
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={(e) => handleProviderToggle(provider.name, e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border ${provider.enabled ? 'bg-vscode-accent border-vscode-accent' : 'border-vscode-border'}`}>
                          {provider.enabled && <span className="text-white text-xs">✓</span>}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedProviderData ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-vscode-text mb-2">
                    {selectedProviderData.displayName}
                  </h3>
                  <p className="text-sm text-vscode-text-muted">
                    Configure your {selectedProviderData.displayName} settings
                  </p>
                </div>

                {/* API Key */}
                {selectedProviderData.name !== 'ollama' && (
                  <div>
                    <label className="block text-sm font-medium text-vscode-text mb-2">
                      API Key
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        value={selectedProviderData.apiKey}
                        onChange={(e) => {
                          const newKey = e.target.value
                          setProviders(prev => prev.map(p => 
                            p.name === selectedProviderData.name ? { ...p, apiKey: newKey } : p
                          ))
                        }}
                        placeholder="Enter your API key"
                        className="flex-1 px-3 py-2 bg-vscode-editor border border-vscode-border rounded text-vscode-text placeholder-vscode-text-muted focus:outline-none focus:border-vscode-accent"
                      />
                      <button
                        onClick={() => handleApiKeyUpdate(selectedProviderData.name, selectedProviderData.apiKey)}
                        disabled={isLoading || !selectedProviderData.apiKey}
                        className="px-4 py-2 bg-vscode-accent text-white rounded hover:bg-vscode-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Validating...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-medium text-vscode-text mb-2">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={selectedProviderData.baseUrl || ''}
                    onChange={(e) => {
                      const newUrl = e.target.value
                      setProviders(prev => prev.map(p => 
                        p.name === selectedProviderData.name ? { ...p, baseUrl: newUrl } : p
                      ))
                    }}
                    className="w-full px-3 py-2 bg-vscode-editor border border-vscode-border rounded text-vscode-text focus:outline-none focus:border-vscode-accent"
                  />
                </div>

                {/* Models */}
                <div>
                  <label className="block text-sm font-medium text-vscode-text mb-2">
                    Available Models
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedProviderData.models.map((model: LLMModel) => (
                      <div key={model.id} className="p-3 bg-vscode-sidebar rounded border border-vscode-border">
                        <div className="font-medium text-vscode-text">{model.name}</div>
                        <div className="text-xs text-vscode-text-muted mt-1">
                          Context: {model.contextWindow.toLocaleString()} tokens • 
                          Max: {model.maxTokens.toLocaleString()} tokens
                          {model.supportsStreaming && ' • Streaming'}
                          {model.supportsImages && ' • Images'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedProviderData.name === 'ollama' && (
                    <button
                      onClick={async () => {
                        try {
                          await window.electronAPI.refreshOllamaModels()
                          await loadProviders()
                          showSuccess('Models refreshed', 'Ollama models updated')
                        } catch (error) {
                          showError('Failed to refresh models', error instanceof Error ? error.message : 'Unknown error')
                        }
                      }}
                      className="mt-2 px-3 py-1 text-xs bg-vscode-border text-vscode-text rounded hover:bg-vscode-sidebar"
                    >
                      Refresh Models
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t border-vscode-border">
                  {selectedProviderData.enabled && activeProvider !== selectedProviderData.name && (
                    <button
                      onClick={() => handleSetActiveProvider(selectedProviderData.name)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Set as Active
                    </button>
                  )}
                  <button
                    onClick={() => checkAllProviderStatuses([selectedProviderData])}
                    className="px-4 py-2 bg-vscode-border text-vscode-text rounded hover:bg-vscode-sidebar"
                  >
                    Test Connection
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-vscode-text-muted">
                Select a provider to configure
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Info Modal */}
      <SecurityInfoComponent
        visible={showSecurityInfo}
        onClose={() => setShowSecurityInfo(false)}
      />
    </div>
  )
}

export default LLMSettings