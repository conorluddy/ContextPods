#!/bin/bash

# Clean up generated files from test directories
# This prevents accidental commits of compiled test files

echo "🧹 Cleaning generated files from test directories..."

# Find and remove generated files
FOUND_FILES=$(find . -path "*/node_modules" -prune -o \
  \( -path "*/tests/*.js" -o \
     -path "*/tests/*.d.ts" -o \
     -path "*/tests/*.js.map" -o \
     -path "*/tests/*.d.ts.map" -o \
     -path "*/test/*.js" -o \
     -path "*/test/*.d.ts" -o \
     -path "*/test/*.js.map" -o \
     -path "*/test/*.d.ts.map" \) \
  -type f -print | grep -v node_modules || true)

if [ -z "$FOUND_FILES" ]; then
  echo "✅ No generated test files found."
else
  echo "Found generated files to clean:"
  echo "$FOUND_FILES"
  echo ""
  
  # Remove the files
  echo "$FOUND_FILES" | while read -r file; do
    rm -f "$file"
    echo "  ✓ Removed: $file"
  done
  
  echo ""
  echo "✅ Cleaned all generated test files."
fi

echo ""
echo "💡 Tip: Ensure test directories have proper .gitignore files to prevent this in the future."