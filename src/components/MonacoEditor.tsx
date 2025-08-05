import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as monaco from 'monaco-editor'
import { initializeLanguageConfig } from '../utils/languageConfig'

interface MonacoEditorProps {
  value: string
  language: string
  onChange?: (value: string) => void
  onSave?: () => void
  theme?: string
  readOnly?: boolean
  filePath?: string
  onCursorPositionChange?: (line: number, column: number) => void
  onEditorReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void
}

interface EditorAction {
  id: string
  label: string
  keybinding?: number
  run: (editor: monaco.editor.IStandaloneCodeEditor) => void
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  onChange,
  onSave,
  theme = 'vs-dark',
  readOnly = false,
  filePath,
  onCursorPositionChange,
  onEditorReady,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)

  // Custom editor actions
  const getCustomActions = useCallback((): EditorAction[] => [
    {
      id: 'homeward.action.quickOpen',
      label: 'Quick Open File',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP,
      run: (editor) => {
        // TODO: Implement quick open functionality
        console.log('Quick Open triggered')
      }
    },
    {
      id: 'homeward.action.commandPalette',
      label: 'Command Palette',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
      run: (editor) => {
        // TODO: Implement command palette
        console.log('Command Palette triggered')
      }
    },
    {
      id: 'homeward.action.goToLine',
      label: 'Go to Line',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
      run: (editor) => {
        editor.getAction('editor.action.gotoLine')?.run()
      }
    },
    {
      id: 'homeward.action.find',
      label: 'Find',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      run: (editor) => {
        editor.getAction('actions.find')?.run()
      }
    },
    {
      id: 'homeward.action.replace',
      label: 'Replace',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
      run: (editor) => {
        editor.getAction('editor.action.startFindReplaceAction')?.run()
      }
    },
    {
      id: 'homeward.action.formatDocument',
      label: 'Format Document',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      run: (editor) => {
        editor.getAction('editor.action.formatDocument')?.run()
      }
    },
    {
      id: 'homeward.action.toggleComment',
      label: 'Toggle Comment',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
      run: (editor) => {
        editor.getAction('editor.action.commentLine')?.run()
      }
    },
    {
      id: 'homeward.action.duplicateLine',
      label: 'Duplicate Line',
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
      run: (editor) => {
        editor.getAction('editor.action.copyLinesDownAction')?.run()
      }
    }
  ], [])

  useEffect(() => {
    if (!editorRef.current) return

    // Initialize language configurations
    initializeLanguageConfig()

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

    // Notify parent component that editor is ready
    onEditorReady?.(editorInstance)

    // Handle content changes
    const disposable = editorInstance.onDidChangeModelContent(() => {
      const currentValue = editorInstance.getValue()
      onChange?.(currentValue)
    })

    // Handle cursor position changes
    const cursorDisposable = editorInstance.onDidChangeCursorPosition((e) => {
      onCursorPositionChange?.(e.position.lineNumber, e.position.column)
    })

    // Handle save shortcut
    const saveDisposable = editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        onSave?.()
      }
    )

    // Register custom actions
    const actionDisposables = getCustomActions().map(action => {
      return editorInstance.addAction({
        id: action.id,
        label: action.label,
        keybindings: action.keybinding ? [action.keybinding] : undefined,
        run: () => action.run(editorInstance)
      })
    })

    // Enhanced editor features
    const setupEnhancedFeatures = () => {
      // Enable bracket matching
      editorInstance.updateOptions({
        matchBrackets: 'always',
        renderLineHighlight: 'all',
        renderIndentGuides: true,
        highlightActiveIndentGuide: true,
        occurrencesHighlight: true,
        selectionHighlight: true,
        codeLens: true,
        colorDecorators: true,
        lightbulb: { enabled: true },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        acceptSuggestionOnCommitCharacter: true,
        snippetSuggestions: 'top',
        wordBasedSuggestions: true,
        parameterHints: { enabled: true },
        hover: { enabled: true },
        links: true,
        find: {
          seedSearchStringFromSelection: 'always',
          autoFindInSelection: 'never'
        }
      })
    }

    setupEnhancedFeatures()

    // Cleanup
    return () => {
      disposable.dispose()
      cursorDisposable.dispose()
      saveDisposable?.dispose()
      actionDisposables.forEach(d => d?.dispose())
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