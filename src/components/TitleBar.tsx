import React from 'react'

const TitleBar: React.FC = () => {
  return (
    <div className="h-8 bg-vscode-bg border-b border-vscode-border flex items-center px-4 text-sm">
      <div className="flex-1 text-center">
        Homeward IDE
      </div>
    </div>
  )
}

export default TitleBar