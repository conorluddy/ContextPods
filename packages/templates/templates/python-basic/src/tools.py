"""
Tool implementations for {{serverName}}
"""

from typing import Dict, List, Any
from mcp.types import Tool


def get_tools() -> List[Tool]:
    """
    Return the list of available tools.
    
    Add your custom tools here.
    """
    return [
        Tool(
            name="example_tool",
            description="An example tool that echoes the input",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Message to echo"
                    }
                },
                "required": ["message"]
            }
        ),
        # Add more tools here
    ]


async def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Any:
    """
    Handle tool execution.
    
    Args:
        name: The name of the tool to execute
        arguments: The arguments passed to the tool
        
    Returns:
        The result of the tool execution
    """
    
    if name == "example_tool":
        message = arguments.get("message", "")
        return {
            "echo": message,
            "length": len(message)
        }
    
    # Add more tool handlers here
    
    raise ValueError(f"Unknown tool: {name}")