/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VSCode theme colors
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-editor': '#1e1e1e',
        'vscode-panel': '#181818',
        'vscode-border': '#3c3c3c',
        'vscode-text': '#cccccc',
        'vscode-text-muted': '#969696',
        'vscode-accent': '#007acc',
        'vscode-accent-hover': '#1177bb',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}