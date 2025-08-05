import React, { useState, useEffect, useRef } from 'react'

interface InputDialogProps {
  title: string
  placeholder: string
  initialValue?: string
  onConfirm: (value: string) => void
  onCancel: () => void
  visible: boolean
  type?: 'file' | 'directory' | 'text'
}

const InputDialog: React.FC<InputDialogProps> = ({
  title,
  placeholder,
  initialValue = '',
  onConfirm,
  onCancel,
  visible,
  type = 'text'
}) => {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setValue(initialValue)
      setError('')
      // Focus and select text after a short delay to ensure the dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [visible, initialValue])

  const validateInput = (input: string): string => {
    if (!input.trim()) {
      return 'Name cannot be empty'
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(input)) {
      return 'Name contains invalid characters'
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    if (reservedNames.includes(input.toUpperCase())) {
      return 'Name is reserved and cannot be used'
    }

    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateInput(value)
    if (validationError) {
      setError(validationError)
      return
    }

    onConfirm(value.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-panel border border-vscode-border rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-lg font-semibold text-vscode-text mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-vscode-editor border border-vscode-border rounded text-vscode-text placeholder-vscode-text-muted focus:outline-none focus:border-vscode-accent"
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-vscode-border text-vscode-text rounded hover:bg-vscode-sidebar transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-vscode-accent text-white rounded hover:bg-vscode-accent-hover transition-colors"
            >
              {type === 'file' ? 'Create File' : type === 'directory' ? 'Create Folder' : 'OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InputDialog