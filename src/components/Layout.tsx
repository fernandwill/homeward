import React from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import EditorContainer from './EditorContainer'
import StatusBar from './StatusBar'

const Layout: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <TitleBar />
      <div className="flex-1 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <EditorContainer />
          <StatusBar />
        </div>
      </div>
    </div>
  )
}

export default Layout