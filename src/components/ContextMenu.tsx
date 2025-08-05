import React, { useEffect, useRef } from 'react'

interface ContextMenuItem {
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  onClose: () => void
  visible: boolean
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose, visible }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-vscode-panel border border-vscode-border rounded shadow-lg py-1 min-w-48"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.separator ? (
            <div className="border-t border-vscode-border my-1" />
          ) : (
            <button
              className={`
                w-full text-left px-3 py-2 text-sm flex items-center space-x-2
                ${item.disabled 
                  ? 'text-vscode-text-muted cursor-not-allowed' 
                  : 'text-vscode-text hover:bg-vscode-border cursor-pointer'
                }
              `}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick()
                  onClose()
                }
              }}
              disabled={item.disabled}
            >
              {item.icon && <span className="w-4">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default ContextMenu