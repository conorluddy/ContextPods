#!/usr/bin/env python3
"""
Simple Python script for testing script wrapping
"""

import sys
from typing import Optional

def greet_user(name: str, greeting: Optional[str] = None) -> str:
    """Greet a user with a custom or default greeting."""
    if greeting is None:
        greeting = "Hello"
    return f"{greeting}, {name}!"

def main() -> None:
    """Main function to handle command line arguments."""
    args = sys.argv[1:]
    name = args[0] if args else "World"
    greeting = args[1] if len(args) > 1 else None
    
    result = greet_user(name, greeting)
    print(result)

if __name__ == "__main__":
    main()