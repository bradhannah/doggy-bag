#!/usr/bin/env bun
import { execSync } from 'child_process';

async function main() {
  console.log('Generating OpenAPI spec from TypeScript controllers...');
  
  execSync(
    'bunx tsoa spec',
    { stdio: 'inherit' }
  );
  
  console.log('✓ OpenAPI spec generated to openapi/openapi.yaml');
}

main().catch((error) => {
  console.error('Error generating OpenAPI spec:', error);
  process.exit(1);
});
