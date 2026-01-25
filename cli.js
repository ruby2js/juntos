#!/usr/bin/env node

/**
 * Juntos CLI Bootstrap
 *
 * Handles demo installation directly, delegates everything else
 * to the full CLI from ruby2js-rails.
 */

import { spawnSync } from 'child_process';
import { existsSync, readdirSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { get } from 'https';

const RELEASES_URL = 'https://ruby2js.github.io/ruby2js/releases';
const JUNTOS_CLI_URL = `${RELEASES_URL}/ruby2js-rails-beta.tgz`;

// Available demos (match tarball names without demo- prefix and .tar.gz suffix)
const DEMOS = ['blog', 'chat', 'notes', 'photo-gallery', 'workflow', 'ssg-blog', 'astro-blog'];

function showHelp() {
  console.log(`
Juntos - Rails patterns, JavaScript runtimes

Usage: npx github:ruby2js/juntos [options] [command]

Demo Installation:
  --demo <name> [dest]   Install a demo application
  --list-demos           List available demos
  --no-install           Skip npm install after extracting demo

Available demos: ${DEMOS.join(', ')}

Examples:
  npx github:ruby2js/juntos --demo blog           # Install blog demo
  npx github:ruby2js/juntos --demo blog my-blog   # Install to my-blog/
  npx github:ruby2js/juntos --demo blog --no-install  # Skip npm install
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

  const relativeDest = destDir === cwd ? '.' : basename(destDir);

  // Run npm install unless --no-install was specified
  if (!options.skipInstall) {
    console.log('Installing dependencies...\n');
    const result = spawnSync('npm', ['install'], {
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

async function delegateToFullCli(args) {
  // Delegate to the full CLI from ruby2js-rails
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

if (args[0] === '--demo') {
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
