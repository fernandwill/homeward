import React, { useRef, useEffect, useState } from 'react'
import * as monaco from 'monaco-editor'

interface MonacoEditorProps {
  value: string
  language: string
  onChange?: (value: string) => void
  onSave?: () => void
  theme?: string
  readOnly?: boolean
  filePath?: string
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  onChange,
  onSave,
  theme = 'vs-dark',
  readOnly = false,
  filePath,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!editorRef.current) return

    // Configure Monaco Editor
    monaco.editor.defineTheme('homeward-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#cccccc',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#cccccc',
        'editor.selectionBackground': '#264f78',
        'editor.selectionHighlightBackground': '#add6ff26',
        'editorCursor.foreground': '#cccccc',
        'editor.findMatchBackground': '#515c6a',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editor.wordHighlightBackground': '#575757b8',
        'editor.wordHighlightStrongBackground': '#004972b8',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
      },
    })

    // Create editor instance
    const editorInstance = monaco.editor.create(editorRef.current, {
      value,
      language,
      theme: 'homeward-dark',
      readOnly,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      renderControlCharacters: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'mouseover',
      matchBrackets: 'always',
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoSurround: 'languageDefined',
      contextmenu: true,
      mouseWheelZoom: true,
      multiCursorModifier: 'ctrlCmd',
      accessibilitySupport: 'auto',
    })

    setEditor(editorInstance)

    // Handle content changes
    const disposable = editorInstance.onDidChangeModelContent(() => {
      const currentValue = editorInstance.getValue()
      onChange?.(currentValue)
    })

    // Handle save shortcut
    const saveDisposable = editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        onSave?.()
      }
    )

    // Cleanup
    return () => {
      disposable.dispose()
      saveDisposable?.dispose()
      editorInstance.dispose()
    }
  }, [])

  // Update editor value when prop changes
  useEffect(() => {
    if (editor && editor.getValue() !== value) {
      editor.setValue(value)
    }
  }, [editor, value])

  // Update editor language when prop changes
  useEffect(() => {
    if (editor) {
      const model = editor.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, language)
      }
    }
  }, [editor, language])

  // Update editor theme when prop changes
  useEffect(() => {
    if (editor) {
      monaco.editor.setTheme(theme === 'dark' ? 'homeward-dark' : 'vs-light')
    }
  }, [editor, theme])

  return (
    <div 
      ref={editorRef} 
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    />
  )
}

export default MonacoEditor