# Juntos

Rails patterns, JavaScript runtimes.

Write Rails applications that run everywhere: browsers, Node.js, Bun, Deno, Cloudflare Workers, and Vercel Edge Functions. Same models, controllers, and views—different runtimes.

## Quick Start

```bash
npx github:ruby2js/juntos --demo blog
cd blog
npx juntos dev -d dexie
npx juntos test
```

That's it. Open http://localhost:5173 to see your app.

## Run Anywhere

**Juntos** (no Ruby required):
```bash
npx juntos dev -d dexie      # Browser with IndexedDB
npx juntos up -d sqlite      # Node.js with SQLite
npx juntos deploy -d neon    # Vercel Edge
npx juntos deploy -d d1      # Cloudflare Workers
```

Also deploys to mobile (Capacitor) and desktop (Electron, Tauri)—platforms Rails can't reach.
See [Deployment Guide](https://www.ruby2js.com/docs/juntos/deploying).

**Rails** (requires Ruby):
```bash
bundle install
bin/rails db:prepare
bin/rails server
```

## Add to Existing Project

Initialize Juntos in an existing project:

```bash
npx github:ruby2js/juntos init              # Current directory
npx github:ruby2js/juntos init my-app       # Specific directory
```

This creates the configuration files needed for Juntos:
- `package.json` (or merges dependencies into existing)
- `vite.config.js`
- `vitest.config.js`
- `test/setup.mjs`
- `bin/juntos`

## Live Demos

[**Try them in your browser**](https://ruby2js.github.io/ruby2js/) — no install required.

## Available Demos

| Demo | Description |
|------|-------------|
| `blog` | Articles and comments with real-time updates |
| `chat` | Real-time messaging with Turbo Streams |
| `notes` | JSON API with React frontend |
| `photo-gallery` | Device APIs and Electron support |
| `workflow` | React Flow integration |
| `ssg-blog` | Static site generation with 11ty |
| `astro-blog` | Content with client-side functionality |

```bash
npx github:ruby2js/juntos --demo chat
npx github:ruby2js/juntos --demo notes my-notes  # Custom directory
npx github:ruby2js/juntos --demo blog --no-install  # Skip npm install
```

## Try Without Ruby

Verify everything works with just Node.js using Docker:

```bash
docker run -it --rm -p 5173:5173 -p 3000:3000 node:22 bash -c '
  cd /tmp &&
  npx github:ruby2js/juntos --demo blog &&
  cd blog &&
  echo "Ready. Try: npx juntos dev -d dexie" &&
  exec bash
'
```

Then inside the container:

```bash
npx juntos test           # Run tests
npx juntos dev -d dexie   # Dev server → http://localhost:5173
npx juntos up -d sqlite   # Production → http://localhost:3000
```

No Ruby installed. Rails patterns just work.

## Documentation

**https://www.ruby2js.com/docs/juntos**

## How It Works

Juntos transpiles Ruby to JavaScript using [Ruby2JS](https://www.ruby2js.com/). Your Rails models, controllers, and views become JavaScript that runs anywhere.

- **Models** → JavaScript classes with ActiveRecord-like queries
- **Controllers** → Request handlers with before_action, params, flash
- **Views** → ERB templates become JavaScript render functions
- **Routes** → Rails-style routing with path helpers

No lock-in: `npx juntos eject` writes the transpiled JavaScript to disk. You can continue development in pure JavaScript without ever touching Ruby again.

## License

MIT
