#!/usr/bin/env {{shellType}}
#
# {{serverName}} - {{serverDescription}}
# MCP Shell Script Wrapper Server
#

set -euo pipefail

# Configuration
readonly SERVER_NAME="{{serverName}}"
readonly SERVER_VERSION="0.1.0"
readonly SCRIPTS_DIR="$(dirname "$0")/scripts"

# Logging functions
log_debug() {
    [ "${MCP_DEBUG:-}" = "1" ] && echo >&2 "[DEBUG] $*"
}

log_error() {
    echo >&2 "[ERROR] $*"
}

# JSON helpers
json_escape() {
    local text="$1"
    text="${text//\\/\\\\}"
    text="${text//\"/\\\"}"
    text="${text//$'\n'/\\n}"
    text="${text//$'\r'/\\r}"
    text="${text//$'\t'/\\t}"
    echo "$text"
}

# Send JSON response
send_response() {
    local id="$1"
    local result="$2"
    
    cat <<EOF
{"jsonrpc":"2.0","id":$id,"result":$result}
EOF
}

# Send error response
send_error() {
    local id="$1"
    local code="$2"
    local message="$3"
    
    cat <<EOF
{"jsonrpc":"2.0","id":$id,"error":{"code":$code,"message":"$(json_escape "$message")"}}
EOF
}

# Handle initialize request
handle_initialize() {
    local id="$1"
    
    local result=$(cat <<EOF
{
    "protocolVersion": "1.0",
    "capabilities": {
        "tools": {},
        "resources": {}
    },
    "serverInfo": {
        "name": "$SERVER_NAME",
        "version": "$SERVER_VERSION"
    }
}
EOF
)
    
    send_response "$id" "$result"
}

# List available tools (scripts)
handle_list_tools() {
    local id="$1"
    local tools="["
    local first=true
    
    # Built-in tools
    if [ "$first" = true ]; then first=false; else tools+=","; fi
    tools+=$(cat <<EOF
{
    "name": "run_command",
    "description": "Execute a shell command",
    "inputSchema": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The command to execute"
            },
            "args": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Command arguments"
            }
        },
        "required": ["command"]
    }
}
EOF
)
    
{{#includeExampleScripts}}
    # Script-based tools
    if [ -d "$SCRIPTS_DIR" ]; then
        for script in "$SCRIPTS_DIR"/*.sh; do
            [ -f "$script" ] || continue
            [ -x "$script" ] || continue
            
            local script_name=$(basename "$script" .sh)
            local script_desc="Run the $script_name script"
            
            # Try to extract description from script
            if grep -q "^# Description:" "$script"; then
                script_desc=$(grep "^# Description:" "$script" | head -1 | cut -d: -f2- | sed 's/^ *//')
            fi
            
            if [ "$first" = true ]; then first=false; else tools+=","; fi
            tools+=$(cat <<EOF
{
    "name": "$script_name",
    "description": "$(json_escape "$script_desc")",
    "inputSchema": {
        "type": "object",
        "properties": {
            "args": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Script arguments"
            }
        }
    }
}
EOF
)
        done
    fi
{{/includeExampleScripts}}
    
    tools+="]"
    
    send_response "$id" "{\"tools\":$tools}"
}

# Execute a tool
handle_call_tool() {
    local id="$1"
    local params="$2"
    
    # Extract tool name and arguments
    local tool_name=$(echo "$params" | jq -r '.name // empty')
    
    if [ -z "$tool_name" ]; then
        send_error "$id" -32602 "Missing tool name"
        return
    fi
    
    log_debug "Calling tool: $tool_name"
    
    case "$tool_name" in
        "run_command")
            local command=$(echo "$params" | jq -r '.arguments.command // empty')
            local args=$(echo "$params" | jq -r '.arguments.args[]? // empty')
            
            if [ -z "$command" ]; then
                send_error "$id" -32602 "Missing command parameter"
                return
            fi
            
            # Security check - basic command validation
            if [[ "$command" =~ [;&|] ]]; then
                send_error "$id" -32603 "Command contains unsafe characters"
                return
            fi
            
            # Execute command
            local output
            if output=$($command $args 2>&1); then
                local escaped_output=$(json_escape "$output")
                send_response "$id" "{\"content\":[{\"type\":\"text\",\"text\":\"$escaped_output\"}]}"
            else
                send_error "$id" -32603 "Command failed: $output"
            fi
            ;;
            
{{#includeExampleScripts}}
        *)
            # Check if it's a script
            local script_path="$SCRIPTS_DIR/$tool_name.sh"
            if [ -f "$script_path" ] && [ -x "$script_path" ]; then
                local args=$(echo "$params" | jq -r '.arguments.args[]? // empty')
                
                local output
                if output=$("$script_path" $args 2>&1); then
                    local escaped_output=$(json_escape "$output")
                    send_response "$id" "{\"content\":[{\"type\":\"text\",\"text\":\"$escaped_output\"}]}"
                else
                    send_error "$id" -32603 "Script failed: $output"
                fi
            else
                send_error "$id" -32601 "Unknown tool: $tool_name"
            fi
            ;;
{{/includeExampleScripts}}
{{^includeExampleScripts}}
        *)
            send_error "$id" -32601 "Unknown tool: $tool_name"
            ;;
{{/includeExampleScripts}}
    esac
}

# List resources
handle_list_resources() {
    local id="$1"
    
    local resources=$(cat <<EOF
[
    {
        "uri": "env://variables",
        "name": "Environment Variables",
        "description": "Current environment variables",
        "mimeType": "text/plain"
    },
    {
        "uri": "info://server",
        "name": "Server Information",
        "description": "Information about this MCP server",
        "mimeType": "text/plain"
    }
]
EOF
)
    
    send_response "$id" "{\"resources\":$resources}"
}

# Read a resource
handle_read_resource() {
    local id="$1"
    local params="$2"
    
    local uri=$(echo "$params" | jq -r '.uri // empty')
    
    if [ -z "$uri" ]; then
        send_error "$id" -32602 "Missing resource URI"
        return
    fi
    
    case "$uri" in
        "env://variables")
            local env_vars=$(env | sort | json_escape)
            send_response "$id" "{\"contents\":[{\"uri\":\"$uri\",\"mimeType\":\"text/plain\",\"text\":\"$env_vars\"}]}"
            ;;
            
        "info://server")
            local info="$SERVER_NAME v$SERVER_VERSION
Shell Type: ${MCP_SHELL_TYPE:-{{shellType}}}
Scripts Directory: $SCRIPTS_DIR
Generated by Context-Pods"
            local escaped_info=$(json_escape "$info")
            send_response "$id" "{\"contents\":[{\"uri\":\"$uri\",\"mimeType\":\"text/plain\",\"text\":\"$escaped_info\"}]}"
            ;;
            
        *)
            send_error "$id" -32603 "Unknown resource: $uri"
            ;;
    esac
}

# Main request handler
handle_request() {
    local request="$1"
    
    # Parse request
    local method=$(echo "$request" | jq -r '.method // empty')
    local id=$(echo "$request" | jq '.id // null')
    local params=$(echo "$request" | jq '.params // {}')
    
    log_debug "Method: $method"
    
    case "$method" in
        "initialize")
            handle_initialize "$id"
            ;;
        "tools/list")
            handle_list_tools "$id"
            ;;
        "tools/call")
            handle_call_tool "$id" "$params"
            ;;
        "resources/list")
            handle_list_resources "$id"
            ;;
        "resources/read")
            handle_read_resource "$id" "$params"
            ;;
        *)
            send_error "$id" -32601 "Method not found: $method"
            ;;
    esac
}

# Main loop
main() {
    log_debug "Starting $SERVER_NAME MCP server..."
    
    # Check for jq
    if ! command -v jq >/dev/null 2>&1; then
        log_error "jq is required but not installed. Please install jq."
        exit 1
    fi
    
    # Read JSON-RPC requests from stdin
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        
        log_debug "Received: $line"
        
        # Validate JSON
        if echo "$line" | jq empty 2>/dev/null; then
            handle_request "$line"
        else
            send_error null -32700 "Parse error"
        fi
    done
}

# Run the server
main "$@"