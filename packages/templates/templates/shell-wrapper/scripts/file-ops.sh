#!/usr/bin/env {{shellType}}
# Description: Perform basic file operations

usage() {
    echo "Usage: $0 <operation> <file> [destination]"
    echo "Operations:"
    echo "  count <file>     - Count lines, words, and characters"
    echo "  head <file>      - Show first 10 lines"
    echo "  tail <file>      - Show last 10 lines"
    echo "  size <file>      - Show file size"
    echo "  type <file>      - Detect file type"
    exit 1
}

[ $# -lt 2 ] && usage

operation="$1"
file="$2"

# Security check - prevent directory traversal
if [[ "$file" =~ \.\. ]]; then
    echo "Error: Path traversal not allowed"
    exit 1
fi

# Check if file exists
if [ ! -f "$file" ]; then
    echo "Error: File not found: $file"
    exit 1
fi

case "$operation" in
    count)
        wc "$file" | awk '{print "Lines: " $1 ", Words: " $2 ", Characters: " $3}'
        ;;
    head)
        echo "=== First 10 lines of $file ==="
        head -n 10 "$file"
        ;;
    tail)
        echo "=== Last 10 lines of $file ==="
        tail -n 10 "$file"
        ;;
    size)
        if command -v stat >/dev/null 2>&1; then
            # Works on most systems
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            echo "File size: $size bytes"
            
            # Human readable
            if [ "$size" -gt 1048576 ]; then
                echo "$(( size / 1048576 )) MB"
            elif [ "$size" -gt 1024 ]; then
                echo "$(( size / 1024 )) KB"
            fi
        else
            ls -lh "$file" | awk '{print "File size: " $5}'
        fi
        ;;
    type)
        file_type=$(file -b "$file" 2>/dev/null || echo "Unknown")
        echo "File type: $file_type"
        ;;
    *)
        echo "Error: Unknown operation: $operation"
        usage
        ;;
esac