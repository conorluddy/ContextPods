# Resource and Subscription Examples

This example demonstrates how to create and manage MCP resources with subscription support.

## Features Demonstrated

- **Dynamic Resources** - Resources that change over time
- **Resource Subscriptions** - Real-time updates to clients
- **Resource Metadata** - Rich resource information
- **Error Handling** - Robust error management for resource operations

## Example Resources

### 1. System Monitor Resource
Real-time system metrics (CPU, memory, disk usage).

### 2. File Watcher Resource
Monitor file changes in a directory.

### 3. Data Stream Resource
Streaming data source with configurable updates.

## Running the Example

```bash
# From the template root directory
npm run example:resources

# Run with subscription demo
node examples/resources/subscription-demo.js
```

## Key Concepts

- Resources represent dynamic data that clients can read
- Subscriptions allow clients to receive automatic updates
- Resources must have a unique URI identifier
- Use resource metadata for rich descriptions
- Handle subscription lifecycle properly

## Subscription Lifecycle

1. Client subscribes to a resource URI
2. Server tracks the subscription
3. When resource changes, server notifies all subscribers
4. Client can unsubscribe when no longer needed