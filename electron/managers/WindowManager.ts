import { BrowserWindow } from 'electron'

export class WindowManager {
  private window: BrowserWindow
  private windowState: {
    isMaximized: boolean
    isFocused: boolean
    bounds?: Electron.Rectangle
  }

  constructor(window: BrowserWindow) {
    this.window = window
    this.windowState = {
      isMaximized: false,
      isFocused: false,
    }

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.window.on('maximize', () => {
      this.windowState.isMaximized = true
    })

    this.window.on('unmaximize', () => {
      this.windowState.isMaximized = false
    })

    this.window.on('focus', () => {
      this.windowState.isFocused = true
    })

    this.window.on('blur', () => {
      this.windowState.isFocused = false
    })

    this.window.on('resize', () => {
      if (!this.windowState.isMaximized) {
        this.windowState.bounds = this.window.getBounds()
      }
    })

    this.window.on('move', () => {
      if (!this.windowState.isMaximized) {
        this.windowState.bounds = this.window.getBounds()
      }
    })
  }

  public getWindowState() {
    return {
      ...this.windowState,
      bounds: this.window.getBounds(),
    }
  }

  public restoreWindowState(state: any) {
    if (state.bounds) {
      this.window.setBounds(state.bounds)
    }
    
    if (state.isMaximized) {
      this.window.maximize()
    }
  }

  public minimize() {
    this.window.minimize()
  }

  public maximize() {
    if (this.window.isMaximized()) {
      this.window.unmaximize()
    } else {
      this.window.maximize()
    }
  }

  public close() {
    this.window.close()
  }

  public focus() {
    this.window.focus()
  }

  public show() {
    this.window.show()
  }

  public hide() {
    this.window.hide()
  }

  public isMaximized(): boolean {
    return this.window.isMaximized()
  }

  public isFocused(): boolean {
    return this.window.isFocused()
  }

  public isVisible(): boolean {
    return this.window.isVisible()
  }
}