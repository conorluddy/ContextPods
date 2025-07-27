#!/bin/bash

# Context-Pods Meta-MCP Server Startup Script
# Builds and starts the Meta-MCP server

set -e

echo "🚀 Starting Context-Pods Meta-MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📂 Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building packages..."
npm run build

# Check if server package was built
if [ ! -f "packages/server/dist/src/index.js" ]; then
    echo "❌ Server build failed. dist/src/index.js not found."
    exit 1
fi

# Start the server
echo "✅ Build complete. Starting Meta-MCP Server..."
echo ""
echo "🔌 The server is now running and ready for MCP client connections."
echo "📖 See docs/MCP_CLIENT_SETUP.md for configuration instructions."
echo ""

# Start the server (this will run indefinitely)
node packages/server/dist/src/index.js