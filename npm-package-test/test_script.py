#!/usr/bin/env python3
"""
A simple test script to demonstrate script wrapping
"""

import sys
import json

def add_numbers(a, b):
    """Add two numbers together"""
    return a + b

def multiply_numbers(a, b):
    """Multiply two numbers"""
    return a * b

def main():
    print("Test Python script for MCP wrapping")
    print(f"2 + 3 = {add_numbers(2, 3)}")
    print(f"4 * 5 = {multiply_numbers(4, 5)}")
    
    if len(sys.argv) > 1:
        print(f"Arguments received: {sys.argv[1:]}")

if __name__ == "__main__":
    main()