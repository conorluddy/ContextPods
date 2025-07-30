"""
MCP Server implementation for {{serverName}}
"""

import asyncio
import logging
from typing import Dict, List, Any

from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.types import Tool, Resource

from .tools import get_tools, handle_tool_call
from .resources import get_resources, handle_resource_read

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class {{serverName}}Server:
    """
    {{serverDescription}}
    """
    
    def __init__(self):
        self.server = Server("{{serverName}}")
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up server request handlers"""
        
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            """List available tools"""
            return get_tools()
        
        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> Any:
            """Handle tool execution"""
            return await handle_tool_call(name, arguments)
        
        @self.server.list_resources()
        async def handle_list_resources() -> List[Resource]:
            """List available resources"""
            return get_resources()
        
        @self.server.read_resource()
        async def handle_read_resource(uri: str) -> str:
            """Read a specific resource"""
            return await handle_resource_read(uri)
    
    async def run(self):
        """Run the MCP server"""
        from mcp.server.stdio import stdio_server
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="{{serverName}}",
                    server_version="0.0.1"
                )
            )


async def main():
    """Main entry point"""
    server = {{serverName}}Server()
    await server.run()


if __name__ == "__main__":
    asyncio.run(main())