#!/bin/bash

# Context-Pods Meta-MCP Server Development Script
# Starts the server in development mode with hot reloading

set -e

echo "🛠️  Starting Context-Pods Meta-MCP Server in development mode..."

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

# Initial build
echo "🔨 Building packages..."
npm run build

echo ""
echo "🛠️  Development mode features:"
echo "   • TypeScript compilation in watch mode"
echo "   • Server restart on file changes"
echo "   • Debug logging enabled"
echo "   • Source maps for debugging"
echo ""
echo "🔌 The server will restart automatically when you make changes."
echo "📖 See docs/MCP_CLIENT_SETUP.md for configuration instructions."
echo ""
echo "Press Ctrl+C to stop the development server."
echo ""

# Set development environment variables
export NODE_ENV=development
export DEBUG=context-pods:*

# Function to start the server
start_server() {
    echo "🚀 Starting server..."
    node packages/server/dist/src/index.js &
    SERVER_PID=$!
    echo "📡 Server started with PID: $SERVER_PID"
}

# Function to stop the server
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        echo "🛑 Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        SERVER_PID=""
    fi
}

# Function to restart the server
restart_server() {
    echo "🔄 Restarting server..."
    stop_server
    start_server
}

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    stop_server
    
    # Kill the TypeScript compiler if it's running
    if [ ! -z "$TSC_PID" ]; then
        kill $TSC_PID 2>/dev/null || true
    fi
    
    echo "✅ Development server stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start TypeScript compiler in watch mode
echo "👀 Starting TypeScript compiler in watch mode..."
npm run --workspace=packages/server dev &
TSC_PID=$!

# Wait for initial compilation
echo "⏳ Waiting for initial compilation..."
sleep 3

# Start the server initially
start_server

# Monitor for file changes and restart server
echo "👀 Watching for changes..."

# Simple file watcher - restart server when dist files change
while true; do
    # Check if dist files have been modified recently (within last 2 seconds)
    RECENT_FILES=$(find packages/server/dist/src -name "*.js" -newermt "2 seconds ago" 2>/dev/null | wc -l)
    
    if [ "$RECENT_FILES" -gt 0 ]; then
        restart_server
    fi
    
    sleep 2
done