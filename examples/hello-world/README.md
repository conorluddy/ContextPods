# Hello World Example Pod

This is an example of a pod generated from the basic template.

## Generation

This pod would be generated using a command like:

```bash
context-pods create hello-world --template basic \
  --var serverName=hello-world \
  --var serverDescription="A simple hello world MCP server"
```

## Structure

```
hello-world/
├── package.json      # Generated from template
├── tsconfig.json     # Copied from template
├── README.md         # Generated from template
└── src/
    └── index.ts      # Generated from template
```

## Template Variables

The following variables were used to generate this pod:
- `serverName`: hello-world
- `serverDescription`: A simple hello world MCP server

## Usage

After generation, you would:

1. Install dependencies: `npm install`
2. Build the server: `npm run build`
3. Configure your MCP client to use this server

This demonstrates how Context-Pods makes it easy to create new MCP servers from templates!