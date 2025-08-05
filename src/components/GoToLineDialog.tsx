import React, { useState, useEffect, useRef } from 'react'

interface GoToLineDialogProps {
  visible: boolean
  onClose: () => void
  onGoToLine: (line: number, column?: number) => void
  maxLine?: number
}

const GoToLineDialog: React.FC<GoToLineDialogProps> = ({
  visible,
  onClose,
  onGoToLine,
  maxLine
}) => {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setInput('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  const parseInput = (value: string): { line: number; column?: number } | null => {
    const trimmed = value.trim()
    
    if (!trimmed) {
      setError('Please enter a line number')
      return null
    }

    // Support formats: "42", "42:10", "42,10"
    const colonMatch = trimmed.match(/^(\d+):(\d+)$/)
    const commaMatch = trimmed.match(/^(\d+),(\d+)$/)
    const lineOnlyMatch = trimmed.match(/^(\d+)$/)

    let line: number
    let column: number | undefined

    if (colonMatch) {
      line = parseInt(colonMatch[1], 10)
      column = parseInt(colonMatch[2], 10)
    } else if (commaMatch) {
      line = parseInt(commaMatch[1], 10)
      column = parseInt(commaMatch[2], 10)
    } else if (lineOnlyMatch) {
      line = parseInt(lineOnlyMatch[1], 10)
    } else {
      setError('Invalid format. Use: line or line:column or line,column')
      return null
    }

    if (line < 1) {
      setError('Line number must be greater than 0')
      return null
    }

    if (maxLine && line > maxLine) {
      setError(`Line number cannot exceed ${maxLine}`)
      return null
    }

    if (column !== undefined && column < 1) {
      setError('Column number must be greater than 0')
      return null
    }

    setError('')
    return { line, column }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = parseInput(input)
    if (result) {
      onGoToLine(result.line, result.column)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setError('') // Clear error when user types
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-panel border border-vscode-border rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-lg font-semibold text-vscode-text mb-4">Go to Line</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={maxLine ? `Enter line number (1-${maxLine})` : 'Enter line number'}
              className="w-full px-3 py-2 bg-vscode-editor border border-vscode-border rounded text-vscode-text placeholder-vscode-text-muted focus:outline-none focus:border-vscode-accent"
            />
            <div className="mt-2 text-xs text-vscode-text-muted">
              Formats: <code className="bg-vscode-sidebar px-1 rounded">42</code>, <code className="bg-vscode-sidebar px-1 rounded">42:10</code>, or <code className="bg-vscode-sidebar px-1 rounded">42,10</code>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-vscode-border text-vscode-text rounded hover:bg-vscode-sidebar transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-vscode-accent text-white rounded hover:bg-vscode-accent-hover transition-colors"
            >
              Go to Line
            </button>
          </div>
        </form>

        {maxLine && (
          <div className="mt-4 pt-4 border-t border-vscode-border text-xs text-vscode-text-muted">
            Current file has {maxLine} lines
          </div>
        )}
      </div>
    </div>
  )
}

export default GoToLineDialog