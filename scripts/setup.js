#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Homeward IDE development environment...\n');

// Check if pnpm is installed
try {
  execSync('pnpm --version', { stdio: 'ignore' });
  console.log('✅ pnpm is installed');
} catch (error) {
  console.log('❌ pnpm is not installed. Please install pnpm first:');
  console.log('   npm install -g pnpm');
  process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('pnpm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.log('❌ Failed to install dependencies');
  process.exit(1);
}

// Create necessary directories
const directories = [
  'src/components',
  'src/stores',
  'src/utils',
  'src/types',
  'electron/utils',
  'dist',
  'tests'
];

console.log('\n📁 Creating project directories...');
directories.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created ${dir}`);
  } else {
    console.log(`✅ ${dir} already exists`);
  }
});

console.log('\n🎉 Setup complete! You can now run:');
console.log('   pnpm dev     - Start development server');
console.log('   pnpm build   - Build for production');
console.log('   pnpm lint    - Run ESLint');
console.log('\n💡 The development server will start both Vite and Electron automatically.');