"""
Resource implementations for {{serverName}}
"""

from typing import List
from mcp.types import Resource


def get_resources() -> List[Resource]:
    """
    Return the list of available resources.
    
    Add your custom resources here.
    """
    return [
        Resource(
            uri="{{serverName}}://example",
            name="Example Resource",
            description="An example resource that demonstrates the resource system",
            mimeType="text/plain"
        ),
        # Add more resources here
    ]


async def handle_resource_read(uri: str) -> str:
    """
    Handle resource reading.
    
    Args:
        uri: The URI of the resource to read
        
    Returns:
        The content of the resource
    """
    
    if uri == "{{serverName}}://example":
        return "This is an example resource content for {{serverName}}"
    
    # Add more resource handlers here
    
    raise ValueError(f"Unknown resource: {uri}")