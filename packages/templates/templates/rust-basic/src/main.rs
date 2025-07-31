use anyhow::Result;
use tracing::{info, error};
use tracing_subscriber;

mod server;
mod tools;
mod resources;

use server::MCPServer;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("{{serverName}}=debug".parse().unwrap())
        )
        .init();

    info!("Starting {{serverName}} MCP server...");

    // Create and run the MCP server
    let server = MCPServer::new();
    
    match server.run().await {
        Ok(_) => {
            info!("{{serverName}} MCP server stopped gracefully");
            Ok(())
        }
        Err(e) => {
            error!("{{serverName}} MCP server error: {}", e);
            Err(e)
        }
    }
}