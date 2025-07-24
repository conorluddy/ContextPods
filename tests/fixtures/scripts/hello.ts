#!/usr/bin/env node

/**
 * Simple TypeScript script for testing script wrapping
 */

interface GreetingOptions {
  name: string;
  greeting?: string;
}

function greetUser(options: GreetingOptions): string {
  const { name, greeting = 'Hello' } = options;
  return `${greeting}, ${name}!`;
}

function main(): void {
  const args = process.argv.slice(2);
  const name = args[0] || 'World';
  const greeting = args[1];
  
  const result = greetUser({ name, greeting });
  console.log(result);
}

if (require.main === module) {
  main();
}

export { greetUser, GreetingOptions };