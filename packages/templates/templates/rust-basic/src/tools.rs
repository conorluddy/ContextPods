use anyhow::{Result, anyhow};
use serde_json::{json, Value};
use tracing::info;

pub fn list_tools() -> Vec<Value> {
    vec![
        json!({
            "name": "hello",
            "description": "Say hello to someone",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name to greet"
                    }
                },
                "required": ["name"]
            }
        }),
        json!({
            "name": "add",
            "description": "Add two numbers",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "a": {
                        "type": "number",
                        "description": "First number"
                    },
                    "b": {
                        "type": "number",
                        "description": "Second number"
                    }
                },
                "required": ["a", "b"]
            }
        }),
    ]
}

pub async fn call_tool(params: Value) -> Result<Value> {
    let name = params["name"]
        .as_str()
        .ok_or_else(|| anyhow!("Missing tool name"))?;
    
    let arguments = params.get("arguments")
        .ok_or_else(|| anyhow!("Missing tool arguments"))?;
    
    info!("Calling tool: {} with args: {:?}", name, arguments);
    
    match name {
        "hello" => {
            let name = arguments["name"]
                .as_str()
                .ok_or_else(|| anyhow!("Missing name parameter"))?;
            
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Hello, {}! This is {{serverName}} speaking.", name)
                }]
            }))
        }
        "add" => {
            let a = arguments["a"]
                .as_f64()
                .ok_or_else(|| anyhow!("Parameter 'a' must be a number"))?;
            
            let b = arguments["b"]
                .as_f64()
                .ok_or_else(|| anyhow!("Parameter 'b' must be a number"))?;
            
            let result = a + b;
            
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("{} + {} = {}", a, b, result)
                }]
            }))
        }
        _ => Err(anyhow!("Unknown tool: {}", name)),
    }
}