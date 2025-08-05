import React from 'react'

const StatusBar: React.FC = () => {
  return (
    <div className="h-6 bg-vscode-accent text-white text-xs flex items-center px-4">
      <div className="flex-1">
        Ready
      </div>
      <div className="flex items-center space-x-4">
        <span>TypeScript</span>
        <span>UTF-8</span>
        <span>LF</span>
      </div>
    </div>
  )
}

export default StatusBar