#!/usr/bin/env python3
"""
{{serverDescription}}

Self-contained Python MCP server
"""

import asyncio
import sys
from src.server import create_server


async def main():
    """Main entry point for the {{serverName}} MCP server"""
    try:
        print(f"Starting {{serverName}} MCP server...", file=sys.stderr)
        
        server = await create_server()
        
        print(f"{{serverName}} MCP server started successfully", file=sys.stderr)
        
        # Keep the server running
        await server.run()
        
    except Exception as error:
        print(f"Failed to start {{serverName}} MCP server: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())