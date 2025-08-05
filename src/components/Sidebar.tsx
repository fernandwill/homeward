import React from 'react'

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-vscode-sidebar border-r border-vscode-border flex flex-col">
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-2">Explorer</h3>
        <div className="text-xs text-vscode-text-muted">
          No workspace opened
        </div>
      </div>
    </div>
  )
}

export default Sidebar