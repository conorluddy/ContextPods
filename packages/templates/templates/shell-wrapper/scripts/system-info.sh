#!/usr/bin/env {{shellType}}
# Description: Get system information

echo "=== System Information ==="
echo "Hostname: $(hostname)"
echo "OS: $(uname -s)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "CPU Cores: $(getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "Unknown")"
echo "Current User: $(whoami)"
echo "Current Directory: $(pwd)"
echo "Date: $(date)"

if [ $# -gt 0 ] && [ "$1" = "--detailed" ]; then
    echo ""
    echo "=== Detailed Information ==="
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    
    # Memory info (works on both Linux and macOS)
    if command -v free >/dev/null 2>&1; then
        echo "Memory: $(free -h | grep Mem | awk '{print "Total: " $2 ", Used: " $3 ", Free: " $4}')"
    elif command -v vm_stat >/dev/null 2>&1; then
        echo "Memory: $(vm_stat | grep 'Pages free' | awk '{print $3 " pages free"}')"
    fi
    
    # Disk usage
    echo "Disk Usage:"
    df -h / | tail -1 | awk '{print "  Root: " $5 " used (" $3 " / " $2 ")"}'
fi