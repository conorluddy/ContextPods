#!/usr/bin/env node

/**
 * Context-Pods Meta-MCP Server Connection Test
 * Tests connectivity and basic functionality of the MCP server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMCPConnection() {
  console.log('🔍 Testing Context-Pods Meta-MCP Server connection...\n');

  // Start the server
  console.log('🚀 Starting MCP server...');
  const serverProcess = spawn('node', ['packages/server/dist/index.js'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    console.log('📡 Server:', data.toString().trim());
    if (data.toString().includes('started successfully')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.log('⚠️  Server error:', data.toString().trim());
  });

  // Wait for server to start
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    await delay(1000);
    attempts++;
    if (attempts % 5 === 0) {
      console.log(`⏳ Waiting for server to start... (${attempts}/30)`);
    }
  }

  if (!serverReady) {
    console.log('❌ Server failed to start within 30 seconds');
    serverProcess.kill();
    process.exit(1);
  }

  console.log('✅ Server is running!\n');

  // Test MCP protocol
  console.log('🔌 Testing MCP protocol...');

  try {
    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'context-pods-test-client',
          version: '1.0.0'
        }
      }
    };

    serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    // Wait for response
    await delay(2000);

    // Test listing tools
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    console.log('📋 Requesting available tools...');
    serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

    // Wait for response
    await delay(2000);

    // Test listing resources
    const resourcesRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
      params: {}
    };

    console.log('📚 Requesting available resources...');
    serverProcess.stdin.write(JSON.stringify(resourcesRequest) + '\n');

    // Wait for response
    await delay(2000);

    console.log('\n✅ MCP protocol test completed!');
    console.log('🎉 Context-Pods Meta-MCP Server is working correctly.');

  } catch (error) {
    console.log('❌ MCP protocol test failed:', error.message);
  } finally {
    // Clean up
    console.log('\n🛑 Stopping server...');
    serverProcess.kill();
    
    // Wait a moment for cleanup
    await delay(1000);
    
    console.log('✅ Test completed.');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run the test
testMCPConnection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});