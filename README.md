# Homeward AI-IDE

A custom standalone VSCode-based AI-IDE application with multi-LLM support and advanced AI development features.

## Overview

Homeward provides all the capabilities of Kiro but with expanded LLM support beyond Claude models, including GPT, GLM, Kimi, and other language models. Built on Electron and Monaco Editor, it offers a complete IDE experience with integrated AI assistance, file management, and development tools.

## Features

- **Standalone VSCode-based IDE** - Complete development environment without external dependencies
- **Multi-LLM Support** - OpenAI GPT, Anthropic Claude, Google GLM, Moonshot Kimi, and local models
- **AI-Powered Development** - Chat-based code assistance, autonomous code generation, and intelligent code review
- **Spec Workflow Management** - Complete requirements, design, and task management system
- **Advanced AI Integration** - Context-aware suggestions, autopilot mode, and seamless AI-IDE integration
- **Extensible Architecture** - Support for extensions, hooks, and MCP integration

## Technology Stack

- **Framework**: Electron 28+ for cross-platform desktop application
- **Editor**: Monaco Editor (VSCode's editor component)
- **Frontend**: React 18+ with TypeScript
- **Backend**: Node.js with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS with VSCode theme compatibility
- **Build System**: Vite
- **Package Manager**: pnpm

## Project Structure

```
homeward/
├── docs/
│   ├── requirements.md    # Detailed requirements and user stories
│   ├── design.md         # Technical architecture and design
│   └── tasks.md          # Implementation plan and tasks
├── src/                  # Source code (to be created)
├── tests/               # Test files (to be created)
└── README.md           # This file
```

## Getting Started

### Development Setup

1. Clone the repository
2. Install pnpm if you haven't already: `npm install -g pnpm`
3. Run the setup script: `node scripts/setup.js`
4. Start development server: `pnpm dev`
5. Build for production: `pnpm build`

### Available Scripts

- `pnpm dev` - Start development server (Vite + Electron)
- `pnpm build` - Build the application
- `pnpm build:dist` - Build and package for distribution
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Documentation

- [Requirements](docs/requirements.md) - User stories and acceptance criteria
- [Design](docs/design.md) - Technical architecture and component design
- [Tasks](docs/tasks.md) - Implementation plan with 22 actionable tasks

## License

This project is for personal use.

## Status

**In Development** - Currently in planning and design phase
