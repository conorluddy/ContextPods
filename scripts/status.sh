#!/bin/bash

# Context-Pods Meta-MCP Server Status Check
# Checks the status of all server components

echo "📊 Context-Pods Meta-MCP Server Status Check"
echo "=============================================="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Check Node.js
echo ""
echo "🟢 Node.js Environment:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js version: $NODE_VERSION"
    
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo "   ✅ Version requirement met (18+)"
    else
        echo "   ❌ Version requirement NOT met (need 18+)"
    fi
else
    echo "   ❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✅ npm version: $NPM_VERSION"
else
    echo "   ❌ npm not found"
fi

# Check dependencies
echo ""
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules directory exists"
    
    # Check specific dependencies
    if [ -d "node_modules/@modelcontextprotocol" ]; then
        echo "   ✅ @modelcontextprotocol/sdk installed"
    else
        echo "   ❌ @modelcontextprotocol/sdk missing"
    fi
    
    if [ -d "packages/core/node_modules" ] || [ -d "node_modules/@context-pods/core" ]; then
        echo "   ✅ @context-pods/core available"
    else
        echo "   ❌ @context-pods/core missing"
    fi
else
    echo "   ❌ node_modules directory missing - run 'npm install'"
fi

# Check build status
echo ""
echo "🔨 Build Status:"
if [ -f "packages/server/dist/index.js" ]; then
    echo "   ✅ Server package built"
    
    # Check if build is recent
    BUILD_TIME=$(stat -f "%m" packages/server/dist/index.js 2>/dev/null || stat -c "%Y" packages/server/dist/index.js 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - BUILD_TIME))
    
    if [ "$TIME_DIFF" -lt 3600 ]; then
        echo "   ✅ Build is recent (less than 1 hour old)"
    else
        echo "   ⚠️  Build is older than 1 hour - consider rebuilding"
    fi
else
    echo "   ❌ Server package not built - run 'npm run build'"
fi

if [ -f "packages/core/dist/index.js" ]; then
    echo "   ✅ Core package built"
else
    echo "   ❌ Core package not built - run 'npm run build'"
fi

# Check TypeScript configuration
echo ""
echo "📝 TypeScript Configuration:"
if [ -f "tsconfig.json" ]; then
    echo "   ✅ Root tsconfig.json exists"
else
    echo "   ❌ Root tsconfig.json missing"
fi

if [ -f "packages/server/tsconfig.json" ]; then
    echo "   ✅ Server tsconfig.json exists"
else
    echo "   ❌ Server tsconfig.json missing"
fi

# Check templates
echo ""
echo "📄 Templates:"
TEMPLATE_COUNT=$(find templates -name "template.json" 2>/dev/null | wc -l)
echo "   ✅ Found $TEMPLATE_COUNT template(s)"

if [ "$TEMPLATE_COUNT" -gt 0 ]; then
    find templates -name "template.json" | while read template; do
        TEMPLATE_DIR=$(dirname "$template")
        TEMPLATE_NAME=$(basename "$TEMPLATE_DIR")
        echo "     • $TEMPLATE_NAME"
    done
fi

# Check CLI integration
echo ""
echo "⚡ CLI Integration:"
if [ -f "packages/cli/dist/index.js" ]; then
    echo "   ✅ CLI package built"
else
    echo "   ⚠️  CLI package not built (optional)"
fi

# Check server binary
echo ""
echo "🎯 Server Binary:"
if [ -f "packages/server/bin/server.js" ]; then
    echo "   ✅ Server binary exists"
    
    if [ -x "packages/server/bin/server.js" ]; then
        echo "   ✅ Server binary is executable"
    else
        echo "   ❌ Server binary is not executable"
    fi
else
    echo "   ❌ Server binary missing"
fi

# Summary
echo ""
echo "📋 Summary:"
echo "============"

# Count checks
CHECKS_PASSED=0
CHECKS_TOTAL=0

# This is a simplified check - in a real implementation you'd track each check
if command -v node &> /dev/null && [ -d "node_modules" ] && [ -f "packages/server/dist/index.js" ]; then
    echo "🟢 Status: READY"
    echo "   The Meta-MCP Server is ready to run!"
    echo ""
    echo "Next steps:"
    echo "  • Run './scripts/start-server.sh' to start the server"
    echo "  • Run './scripts/test-connection.js' to test connectivity"
    echo "  • See docs/MCP_CLIENT_SETUP.md for client configuration"
else
    echo "🔴 Status: NOT READY"
    echo "   Some components need attention before the server can run."
    echo ""
    echo "Recommended actions:"
    if ! command -v node &> /dev/null; then
        echo "  • Install Node.js 18 or higher"
    fi
    if [ ! -d "node_modules" ]; then
        echo "  • Run 'npm install' to install dependencies"
    fi
    if [ ! -f "packages/server/dist/index.js" ]; then
        echo "  • Run 'npm run build' to build the packages"
    fi
fi

echo ""