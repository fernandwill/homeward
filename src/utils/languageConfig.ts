import * as monaco from 'monaco-editor'

export class LanguageConfigManager {
  private static instance: LanguageConfigManager
  private initialized = false

  public static getInstance(): LanguageConfigManager {
    if (!LanguageConfigManager.instance) {
      LanguageConfigManager.instance = new LanguageConfigManager()
    }
    return LanguageConfigManager.instance
  }

  public initialize(): void {
    if (this.initialized) return

    this.setupCustomThemes()
    this.setupLanguageConfigurations()
    this.setupCodeCompletionProviders()
    this.setupHoverProviders()
    this.setupDiagnostics()

    this.initialized = true
  }

  private setupCustomThemes(): void {
    // Homeward Dark Theme
    monaco.editor.defineTheme('homeward-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'constant', foreground: '4FC1FF' },
        { token: 'property', foreground: '9CDCFE' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' },
        { token: 'tag', foreground: '569CD6' },
        { token: 'attribute.name', foreground: '92C5F8' },
        { token: 'attribute.value', foreground: 'CE9178' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.selectionHighlightBackground': '#add6ff26',
        'editorCursor.foreground': '#aeafad',
        'editor.findMatchBackground': '#515c6a',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editor.wordHighlightBackground': '#575757b8',
        'editor.wordHighlightStrongBackground': '#004972b8',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorRuler.foreground': '#5a5a5a',
        'editorCodeLens.foreground': '#999999',
        'editorInlayHint.foreground': '#969696',
        'editorInlayHint.background': '#1e1e1e00',
      },
    })

    // Homeward Light Theme
    monaco.editor.defineTheme('homeward-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'regexp', foreground: '811F3F' },
        { token: 'type', foreground: '267F99' },
        { token: 'class', foreground: '267F99' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
        { token: 'constant', foreground: '0070C1' },
        { token: 'property', foreground: '001080' },
        { token: 'operator', foreground: '000000' },
        { token: 'delimiter', foreground: '000000' },
        { token: 'tag', foreground: '800000' },
        { token: 'attribute.name', foreground: 'FF0000' },
        { token: 'attribute.value', foreground: '0451A5' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#237893',
        'editorLineNumber.activeForeground': '#0B216F',
        'editor.selectionBackground': '#ADD6FF',
        'editor.selectionHighlightBackground': '#ADD6FF4D',
        'editorCursor.foreground': '#000000',
        'editor.findMatchBackground': '#A8AC94',
        'editor.findMatchHighlightBackground': '#EA5C0055',
        'editor.wordHighlightBackground': '#57575740',
        'editor.wordHighlightStrongBackground': '#0E639C50',
        'editorBracketMatch.background': '#0064001A',
        'editorBracketMatch.border': '#B9B9B9',
        'editorIndentGuide.background': '#D3D3D3',
        'editorIndentGuide.activeBackground': '#939393',
        'editorRuler.foreground': '#D3D3D3',
      },
    })
  }

  private setupLanguageConfigurations(): void {
    // Enhanced JavaScript/TypeScript configuration
    monaco.languages.setLanguageConfiguration('javascript', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
        { open: '`', close: '`', notIn: ['string', 'comment'] },
        { open: '/**', close: ' */', notIn: ['string'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' }
      ],
      folding: {
        markers: {
          start: new RegExp('^\\s*//\\s*#?region\\b'),
          end: new RegExp('^\\s*//\\s*#?endregion\\b')
        }
      }
    })

    // Copy configuration to TypeScript
    monaco.languages.setLanguageConfiguration('typescript', 
      monaco.languages.getLanguageConfiguration('javascript')!
    )

    // Python configuration
    monaco.languages.setLanguageConfiguration('python', {
      comments: {
        lineComment: '#',
        blockComment: ['"""', '"""']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
        { open: '"""', close: '"""' },
        { open: "'''", close: "'''" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      indentationRules: {
        increaseIndentPattern: new RegExp('^\\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async def).*:\\s*$'),
        decreaseIndentPattern: new RegExp('^\\s*(?:elif|else|except|finally)\\b.*:')
      }
    })
  }

  private setupCodeCompletionProviders(): void {
    // JavaScript/TypeScript completion provider
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const suggestions: monaco.languages.CompletionItem[] = [
          {
            label: 'console.log',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'console.log(${1:message});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Log a message to the console'
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a function'
          },
          {
            label: 'arrow function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '(${1:params}) => {\n\t${2:// body}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an arrow function'
          },
          {
            label: 'async function',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'async function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an async function'
          },
          {
            label: 'try-catch',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'try {\n\t${1:// code}\n} catch (${2:error}) {\n\t${3:// handle error}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Try-catch block'
          },
          {
            label: 'for loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// body}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'For loop'
          },
          {
            label: 'forEach',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'forEach((${1:item}) => {\n\t${2:// body}\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Array forEach method'
          }
        ]

        return { suggestions }
      }
    })

    // Copy to TypeScript
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const jsProvider = monaco.languages.getCompletionItemProviders('javascript')[0]
        const jsCompletions = jsProvider.provideCompletionItems!(model, position, { triggerKind: 1, triggerCharacter: '' }, { isCancellationRequested: false })
        
        const tsSpecificSuggestions: monaco.languages.CompletionItem[] = [
          {
            label: 'interface',
            kind: monaco.languages.CompletionItemKind.Interface,
            insertText: 'interface ${1:Name} {\n\t${2:property}: ${3:type};\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an interface'
          },
          {
            label: 'type',
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: 'type ${1:Name} = ${2:type};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a type alias'
          },
          {
            label: 'enum',
            kind: monaco.languages.CompletionItemKind.Enum,
            insertText: 'enum ${1:Name} {\n\t${2:VALUE} = ${3:0}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an enum'
          }
        ]

        return {
          suggestions: [...(jsCompletions as any).suggestions, ...tsSpecificSuggestions]
        }
      }
    })

    // Python completion provider
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const suggestions: monaco.languages.CompletionItem[] = [
          {
            label: 'print',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'print(${1:message})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Print a message'
          },
          {
            label: 'def',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a function'
          },
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a class'
          },
          {
            label: 'if __name__ == "__main__"',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'if __name__ == "__main__":\n    ${1:main()}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Main guard'
          },
          {
            label: 'try-except',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'try:\n    ${1:# code}\nexcept ${2:Exception} as ${3:e}:\n    ${4:# handle exception}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Try-except block'
          },
          {
            label: 'for loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:# body}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'For loop'
          },
          {
            label: 'list comprehension',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '[${1:expression} for ${2:item} in ${3:iterable}]',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'List comprehension'
          }
        ]

        return { suggestions }
      }
    })
  }

  private setupHoverProviders(): void {
    // JavaScript/TypeScript hover provider
    monaco.languages.registerHoverProvider('javascript', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position)
        if (!word) return null

        const hoverInfo: Record<string, string> = {
          'console': 'The console object provides access to the browser\'s debugging console.',
          'function': 'Functions are one of the fundamental building blocks in JavaScript.',
          'const': 'Creates a constant. Constants are block-scoped, much like variables defined using the let keyword.',
          'let': 'Declares a block-scoped local variable, optionally initializing it to a value.',
          'var': 'Declares a variable, optionally initializing it to a value.',
          'async': 'The async function declaration defines an asynchronous function.',
          'await': 'The await operator is used to wait for a Promise.',
          'Promise': 'The Promise object represents the eventual completion (or failure) of an asynchronous operation.',
        }

        const info = hoverInfo[word.word]
        if (info) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${word.word}**` },
              { value: info }
            ]
          }
        }

        return null
      }
    })

    // Copy to TypeScript
    monaco.languages.registerHoverProvider('typescript', 
      monaco.languages.getHoverProviders('javascript')[0]
    )
  }

  private setupDiagnostics(): void {
    // Basic syntax validation for JavaScript
    monaco.languages.registerDocumentFormattingEditProvider('javascript', {
      provideDocumentFormattingEdits: (model, options, token) => {
        // Basic formatting - in a real implementation, you'd use a proper formatter like Prettier
        const text = model.getValue()
        const lines = text.split('\n')
        const formattedLines = lines.map(line => {
          // Basic indentation fix
          const trimmed = line.trim()
          if (trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[')) {
            return line
          }
          return line
        })

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }]
      }
    })
  }

  public getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'gitignore': 'ignore',
    }

    return languageMap[extension.toLowerCase()] || 'plaintext'
  }
}

// Initialize the language configuration when the module is loaded
export const initializeLanguageConfig = () => {
  LanguageConfigManager.getInstance().initialize()
}