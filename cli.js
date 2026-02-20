#!/usr/bin/env node

/**
 * Juntos CLI Bootstrap
 *
 * Handles demo installation directly, delegates everything else
 * to the full CLI from juntos-dev.
 */

import { spawnSync } from 'child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { get } from 'https';

const RELEASES_URL = 'https://ruby2js.github.io/ruby2js/releases';
const JUNTOS_CLI_URL = `${RELEASES_URL}/juntos-dev-beta.tgz`;

// Available demos (match tarball names without demo- prefix and .tar.gz suffix)
const DEMOS = ['blog', 'chat', 'notes', 'photo-gallery', 'dictaphone', 'workflow', 'ssg-blog', 'astro-blog'];

function showHelp() {
  console.log(`
Juntos - Rails patterns, JavaScript runtimes

Usage: npx github:ruby2js/juntos [options] [command]

Commands:
  init [dir]             Initialize Juntos in a project (creates config files)
  --demo <name> [dest]   Install a demo application
  --list-demos           List available demos

Options:
  --no-install           Skip npm install after init or demo extraction

Available demos: ${DEMOS.join(', ')}

Examples:
  npx github:ruby2js/juntos init                  # Add Juntos to current directory
  npx github:ruby2js/juntos init my-app           # Add Juntos to my-app/
  npx github:ruby2js/juntos --demo blog           # Install blog demo
  npx github:ruby2js/juntos --demo blog my-blog   # Install to my-blog/
  npx github:ruby2js/juntos --list-demos          # List all demos

All other commands are delegated to the full Juntos CLI.
For command help, see: https://www.ruby2js.com/docs/juntos
`);
}

function listDemos() {
  console.log('Available demos:\n');
  const descriptions = {
    'blog': 'Full CRUD with articles and comments, real-time updates',
    'chat': 'Real-time messaging with Turbo Streams',
    'notes': 'JSON API with React frontend',
    'photo-gallery': 'Device APIs and Electron support',
    'dictaphone': 'Audio recording with AI transcription and Active Storage',
    'workflow': 'React Flow integration',
    'ssg-blog': 'Static site generation with 11ty',
    'astro-blog': 'Content with client-side functionality'
  };

  for (const demo of DEMOS) {
    console.log(`  ${demo.padEnd(15)} ${descriptions[demo] || ''}`);
  }
  console.log('\nInstall with: npx github:ruby2js/juntos --demo <name>');
}

function isDirectoryEmpty(dir) {
  try {
    const files = readdirSync(dir);
    // Ignore hidden files like .git
    return files.filter(f => !f.startsWith('.')).length === 0;
  } catch {
    return true;
  }
}

async function downloadAndExtract(url, destDir) {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadAndExtract(response.headers.location, destDir).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const extractor = tar.x({ cwd: destDir, strip: 1 });

      pipeline(response, extractor)
        .then(resolve)
        .catch(reject);
    }).on('error', reject);
  });
}

async function installDemo(demoName, destination, options = {}) {
  // Validate demo name
  if (!DEMOS.includes(demoName)) {
    console.error(`Unknown demo: ${demoName}`);
    console.error(`Available demos: ${DEMOS.join(', ')}`);
    process.exit(1);
  }

  // Determine destination directory
  const cwd = process.cwd();
  let destDir;

  if (destination) {
    destDir = join(cwd, destination);
  } else if (isDirectoryEmpty(cwd)) {
    destDir = cwd;
  } else {
    destDir = join(cwd, demoName);
  }

  // Create directory if needed
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  } else if (!isDirectoryEmpty(destDir)) {
    console.error(`Error: Directory '${destDir}' is not empty.`);
    process.exit(1);
  }

  const tarballUrl = `${RELEASES_URL}/demo-${demoName}.tar.gz`;

  console.log(`Downloading ${demoName} demo...`);

  try {
    await downloadAndExtract(tarballUrl, destDir);
  } catch (err) {
    console.error(`Failed to download demo: ${err.message}`);
    process.exit(1);
  }

  // Initialize Juntos config files (package.json, vite.config.js, etc.)
  console.log('Initializing Juntos...');
  await initProject(destDir, { skipInstall: true, quiet: true });

  const relativeDest = destDir === cwd ? '.' : basename(destDir);

  // Run npm install unless --no-install was specified
  if (!options.skipInstall) {
    console.log('Installing dependencies...\n');
    const result = spawnSync('npm', ['install', '--prefer-online'], {
      cwd: destDir,
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      console.error('\nnpm install failed. You can retry manually:');
      if (destDir !== cwd) console.log(`  cd ${relativeDest}`);
      console.log('  npm install');
      process.exit(1);
    }
  }

  console.log(`
Demo installed to: ${relativeDest}/

Next steps:
`);

  if (destDir !== cwd) {
    console.log(`  cd ${relativeDest}`);
  }

  if (options.skipInstall) {
    console.log(`  npm install`);
  }

  console.log(`
Run with Juntos (no Ruby required):
  npx juntos dev -d dexie        # Browser with IndexedDB
  npx juntos up -d sqlite        # Node.js with SQLite

Run with Rails (requires Ruby):
  bundle install
  bin/rails db:prepare
  bin/rails server

For more information: https://www.ruby2js.com/docs/juntos
`);
}

async function initProject(destination, options = {}) {
  const cwd = process.cwd();
  // Handle both absolute paths and relative paths
  const destDir = destination && destination.startsWith('/') ? destination : (destination ? join(cwd, destination) : cwd);

  // Create directory if needed
  if (destination && !existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  if (!options.quiet) {
    console.log(`Initializing Juntos in ${destDir === cwd ? '.' : basename(destDir)}/\n`);
  }

  // Create or merge package.json
  const packagePath = join(destDir, 'package.json');
  if (existsSync(packagePath)) {
    if (!options.quiet) console.log('  Updating package.json...');
    const existing = JSON.parse(readFileSync(packagePath, 'utf8'));
    existing.type = existing.type || 'module';
    existing.dependencies = existing.dependencies || {};
    existing.devDependencies = existing.devDependencies || {};
    existing.scripts = existing.scripts || {};

    // Add dependencies if missing (ruby2js and vite-plugin-ruby2js are peer deps of juntos-dev)
    if (!existing.dependencies['ruby2js']) {
      existing.dependencies['ruby2js'] = `${RELEASES_URL}/ruby2js-beta.tgz`;
    }
    if (!existing.dependencies['juntos']) {
      existing.dependencies['juntos'] = `${RELEASES_URL}/juntos-beta.tgz`;
    }
    if (!existing.dependencies['juntos-dev']) {
      existing.dependencies['juntos-dev'] = `${RELEASES_URL}/juntos-dev-beta.tgz`;
    }
    if (!existing.dependencies['vite-plugin-ruby2js']) {
      existing.dependencies['vite-plugin-ruby2js'] = `${RELEASES_URL}/vite-plugin-ruby2js-beta.tgz`;
    }
    if (!existing.devDependencies['vite']) {
      existing.devDependencies['vite'] = '^7.0.0';
    }
    if (!existing.devDependencies['vitest']) {
      existing.devDependencies['vitest'] = '^2.0.0';
    }

    // Add scripts if missing
    existing.scripts.dev = existing.scripts.dev || 'vite';
    existing.scripts.build = existing.scripts.build || 'vite build';
    existing.scripts.preview = existing.scripts.preview || 'vite preview';
    existing.scripts.test = existing.scripts.test || 'vitest run';

    writeFileSync(packagePath, JSON.stringify(existing, null, 2) + '\n');
  } else {
    if (!options.quiet) console.log('  Creating package.json...');
    const appName = basename(destDir).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const pkg = {
      name: appName,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest run'
      },
      dependencies: {
        'ruby2js': `${RELEASES_URL}/ruby2js-beta.tgz`,
        'juntos': `${RELEASES_URL}/juntos-beta.tgz`,
        'juntos-dev': `${RELEASES_URL}/juntos-dev-beta.tgz`,
        'vite-plugin-ruby2js': `${RELEASES_URL}/vite-plugin-ruby2js-beta.tgz`
      },
      devDependencies: {
        vite: '^7.0.0',
        vitest: '^2.0.0'
      }
    };
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  }

  // Create vite.config.js
  const viteConfigPath = join(destDir, 'vite.config.js');
  if (!existsSync(viteConfigPath)) {
    if (!options.quiet) console.log('  Creating vite.config.js...');
    writeFileSync(viteConfigPath, `import { defineConfig } from 'vite';
import { juntos } from 'juntos-dev/vite';

export default defineConfig({
  plugins: juntos()
});
`);
  } else {
    if (!options.quiet) console.log('  Skipping vite.config.js (already exists)');
  }

  // Create vitest.config.js
  const vitestConfigPath = join(destDir, 'vitest.config.js');
  if (!existsSync(vitestConfigPath)) {
    if (!options.quiet) console.log('  Creating vitest.config.js...');
    writeFileSync(vitestConfigPath, `import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.mjs', 'test/**/*.test.js'],
    setupFiles: ['./test/setup.mjs']
  }
}));
`);
  } else {
    if (!options.quiet) console.log('  Skipping vitest.config.js (already exists)');
  }

  // Create test/setup.mjs
  const testDir = join(destDir, 'test');
  const setupPath = join(testDir, 'setup.mjs');
  if (!existsSync(setupPath)) {
    if (!options.quiet) console.log('  Creating test/setup.mjs...');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(setupPath, `// Test setup for Vitest
// Initializes the database before each test

import { beforeAll, beforeEach } from 'vitest';

beforeAll(async () => {
  // Import models (registers them with Application and modelRegistry)
  await import('juntos:models');

  // Configure migrations
  const rails = await import('juntos:rails');
  const migrations = await import('juntos:migrations');
  rails.Application.configure({ migrations: migrations.migrations });
});

beforeEach(async () => {
  // Fresh in-memory database for each test
  const activeRecord = await import('juntos:active-record');
  await activeRecord.initDatabase({ database: ':memory:' });

  const rails = await import('juntos:rails');
  await rails.Application.runMigrations(activeRecord);
});
`);
  } else {
    if (!options.quiet) console.log('  Skipping test/setup.mjs (already exists)');
  }

  // Create bin/juntos binstub
  const binDir = join(destDir, 'bin');
  const binstubPath = join(binDir, 'juntos');
  if (!existsSync(binstubPath)) {
    if (!options.quiet) console.log('  Creating bin/juntos...');
    if (!existsSync(binDir)) {
      mkdirSync(binDir, { recursive: true });
    }
    writeFileSync(binstubPath, `#!/bin/sh
# Juntos - Rails patterns, JavaScript runtimes
# This binstub delegates to the juntos CLI from juntos-dev
exec npx juntos "$@"
`);
    chmodSync(binstubPath, 0o755);
  } else {
    if (!options.quiet) console.log('  Skipping bin/juntos (already exists)');
  }

  // In quiet mode, we're done - skip npm install and messages
  if (options.quiet) {
    return;
  }

  const relativeDest = destDir === cwd ? '.' : basename(destDir);

  // Run npm install unless --no-install was specified
  if (!options.skipInstall) {
    console.log('\nInstalling dependencies...\n');
    const result = spawnSync('npm', ['install', '--prefer-online'], {
      cwd: destDir,
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      console.error('\nnpm install failed. You can retry manually:');
      if (destDir !== cwd) console.log(`  cd ${relativeDest}`);
      console.log('  npm install');
      process.exit(1);
    }
  }

  console.log(`
Juntos initialized!

Next steps:
`);

  if (destDir !== cwd) {
    console.log(`  cd ${relativeDest}`);
  }

  if (options.skipInstall) {
    console.log('  npm install');
  }

  console.log(`
Create your app structure:
  mkdir -p app/models app/controllers app/views config/routes
  # Add your Ruby files (.rb) - they'll be transpiled to JavaScript

Run with Juntos:
  npx juntos dev -d dexie        # Browser with IndexedDB
  npx juntos up -d sqlite        # Node.js with SQLite

For more information: https://www.ruby2js.com/docs/juntos
`);
}

async function delegateToFullCli(args) {
  // Delegate to the full CLI from juntos-dev
  const result = spawnSync('npx', [JUNTOS_CLI_URL, ...args], {
    stdio: 'inherit',
    env: process.env
  });

  process.exit(result.status || 0);
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
  showHelp();
  process.exit(0);
}

if (args[0] === '--list-demos') {
  listDemos();
  process.exit(0);
}

if (args[0] === 'init') {
  // Parse init arguments: init [destination] [--no-install]
  const initArgs = args.slice(1);
  const skipInstall = initArgs.includes('--no-install');
  const destination = initArgs.find(a => a !== '--no-install');

  initProject(destination, { skipInstall });
} else if (args[0] === '--demo') {
  // Parse --demo arguments: --demo <name> [destination] [--no-install]
  const demoArgs = args.slice(1);
  const skipInstall = demoArgs.includes('--no-install');
  const positionalArgs = demoArgs.filter(a => a !== '--no-install');

  const demoName = positionalArgs[0];
  const destination = positionalArgs[1];

  if (!demoName) {
    console.error('Error: Demo name required.');
    console.error('Usage: npx github:ruby2js/juntos --demo <name> [destination] [--no-install]');
    console.error(`Available demos: ${DEMOS.join(', ')}`);
    process.exit(1);
  }

  installDemo(demoName, destination, { skipInstall });
} else {
  // Delegate all other commands to the full CLI
  delegateToFullCli(args);
}
