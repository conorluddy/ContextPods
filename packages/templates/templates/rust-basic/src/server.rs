use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};
use tracing::{debug, info, warn};

use crate::tools;
use crate::resources;

#[derive(Debug)]
pub struct MCPServer {
    name: String,
    version: String,
}

#[derive(Serialize, Deserialize)]
struct Request {
    jsonrpc: String,
    method: String,
    id: Option<serde_json::Value>,
    params: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
struct Response {
    jsonrpc: String,
    id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<ErrorResponse>,
}

#[derive(Serialize, Deserialize)]
struct ErrorResponse {
    code: i32,
    message: String,
}

impl MCPServer {
    pub fn new() -> Self {
        Self {
            name: "{{serverName}}".to_string(),
            version: "0.1.0".to_string(),
        }
    }

    pub async fn run(&self) -> Result<()> {
        info!("MCP server {} v{} ready", self.name, self.version);
        
        let stdin = io::stdin();
        let mut stdout = io::stdout();
        
        for line in stdin.lock().lines() {
            let line = line?;
            debug!("Received: {}", line);
            
            match serde_json::from_str::<Request>(&line) {
                Ok(request) => {
                    let response = self.handle_request(request).await;
                    let response_str = serde_json::to_string(&response)?;
                    
                    writeln!(stdout, "{}", response_str)?;
                    stdout.flush()?;
                    
                    debug!("Sent: {}", response_str);
                }
                Err(e) => {
                    warn!("Failed to parse request: {}", e);
                    let error_response = Response {
                        jsonrpc: "2.0".to_string(),
                        id: None,
                        result: None,
                        error: Some(ErrorResponse {
                            code: -32700,
                            message: "Parse error".to_string(),
                        }),
                    };
                    
                    let response_str = serde_json::to_string(&error_response)?;
                    writeln!(stdout, "{}", response_str)?;
                    stdout.flush()?;
                }
            }
        }
        
        Ok(())
    }

    async fn handle_request(&self, request: Request) -> Response {
        match request.method.as_str() {
            "initialize" => self.handle_initialize(request.id),
            "tools/list" => self.handle_list_tools(request.id),
            "tools/call" => self.handle_call_tool(request.id, request.params).await,
            "resources/list" => self.handle_list_resources(request.id),
            "resources/read" => self.handle_read_resource(request.id, request.params).await,
            _ => Response {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(ErrorResponse {
                    code: -32601,
                    message: format!("Method not found: {}", request.method),
                }),
            },
        }
    }

    fn handle_initialize(&self, id: Option<serde_json::Value>) -> Response {
        Response {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(serde_json::json!({
                "protocolVersion": "1.0",
                "capabilities": {
                    "tools": {},
                    "resources": {}
                },
                "serverInfo": {
                    "name": self.name,
                    "version": self.version
                }
            })),
            error: None,
        }
    }

    fn handle_list_tools(&self, id: Option<serde_json::Value>) -> Response {
        Response {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(serde_json::json!({
                "tools": tools::list_tools()
            })),
            error: None,
        }
    }

    async fn handle_call_tool(
        &self,
        id: Option<serde_json::Value>,
        params: Option<serde_json::Value>,
    ) -> Response {
        match params {
            Some(params) => match tools::call_tool(params).await {
                Ok(result) => Response {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: Some(result),
                    error: None,
                },
                Err(e) => Response {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: None,
                    error: Some(ErrorResponse {
                        code: -32603,
                        message: e.to_string(),
                    }),
                },
            },
            None => Response {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(ErrorResponse {
                    code: -32602,
                    message: "Invalid params".to_string(),
                }),
            },
        }
    }

    fn handle_list_resources(&self, id: Option<serde_json::Value>) -> Response {
        Response {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(serde_json::json!({
                "resources": resources::list_resources()
            })),
            error: None,
        }
    }

    async fn handle_read_resource(
        &self,
        id: Option<serde_json::Value>,
        params: Option<serde_json::Value>,
    ) -> Response {
        match params {
            Some(params) => match resources::read_resource(params).await {
                Ok(result) => Response {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: Some(result),
                    error: None,
                },
                Err(e) => Response {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: None,
                    error: Some(ErrorResponse {
                        code: -32603,
                        message: e.to_string(),
                    }),
                },
            },
            None => Response {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(ErrorResponse {
                    code: -32602,
                    message: "Invalid params".to_string(),
                }),
            },
        }
    }
}