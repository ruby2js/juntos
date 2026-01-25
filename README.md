# Juntos

Rails patterns, JavaScript runtimes.

Write Rails applications that run everywhere: browsers, Node.js, Bun, Deno, Cloudflare Workers, and Vercel Edge Functions. Same models, controllers, and views—different runtimes.

## Quick Start

```bash
npx github:ruby2js/juntos --demo blog
cd blog
npx juntos dev -d dexie
```

That's it. Open http://localhost:5173 to see your app.

## Run Anywhere

**Browser** (no Ruby required):
```bash
npx juntos dev -d dexie      # IndexedDB, hot reload
npx juntos up -d sqlite      # Node.js with SQLite
```

**Rails** (requires Ruby):
```bash
bundle install
bin/rails db:prepare
bin/rails server
```

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

## Documentation

**https://www.ruby2js.com/docs/juntos**

## How It Works

Juntos transpiles Ruby to JavaScript using [Ruby2JS](https://www.ruby2js.com/). Your Rails models, controllers, and views become JavaScript that runs anywhere.

- **Models** → JavaScript classes with ActiveRecord-like queries
- **Controllers** → Request handlers with before_action, params, flash
- **Views** → ERB templates become JavaScript render functions
- **Routes** → Rails-style routing with path helpers

## License

MIT
