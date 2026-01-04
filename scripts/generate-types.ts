#!/usr/bin/env bun
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('Generating Svelte types from OpenAPI spec...');
  
  // Ensure types directory exists
  mkdirSync('src/types', { recursive: true });
  
  // Generate types from OpenAPI spec (tsoa generates swagger.json)
  execSync(
    'npx openapi-typescript api/openapi/swagger.json -o src/types/api.ts',
    { stdio: 'inherit' }
  );
  
  console.log('✓ Svelte types generated to src/types/api.ts');
}

main().catch((error) => {
  console.error('Error generating Svelte types:', error);
  process.exit(1);
});
