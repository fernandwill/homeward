import React from 'react'

const Editor: React.FC = () => {
  return (
    <div className="flex-1 bg-vscode-editor flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to Homeward IDE</h2>
        <p className="text-vscode-text-muted mb-4">
          A custom standalone VSCode-based AI-IDE with multi-LLM support
        </p>
        <div className="space-y-2 text-sm">
          <div>• Multi-LLM Support (GPT, Claude, GLM, Kimi)</div>
          <div>• AI-Powered Development Tools</div>
          <div>• Spec Workflow Management</div>
          <div>• Autonomous Code Generation</div>
        </div>
      </div>
    </div>
  )
}

export default Editor