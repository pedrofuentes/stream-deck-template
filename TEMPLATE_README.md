# Stream Deck Plugin Template

This template captures proven patterns, hard-won learnings, and best practices from building multiple Stream Deck plugins with AI agents:

- **stream-deck-github-utilities** — GitHub repo stats & workflow status
- **stream-deck-cloudflare-utilities** — Cloudflare service monitoring
- **stream-deck-ical** — Calendar event display

## How to Use This Template

### Quick Start

1. Copy this entire folder to a new project directory
2. Open it in VS Code with an AI agent (Copilot, Cursor, etc.)
3. Tell the agent: *"Use TEMPLATE_INSTRUCTIONS.md to scaffold a new Stream Deck plugin called [your plugin name] with UUID [your.uuid]"*
4. The agent will use the instructions and scaffold files to set everything up

### Placeholder Tokens

All template files use these placeholders that the agent should replace:

| Placeholder | Example | Description |
|---|---|---|
| `__PLUGIN_NAME__` | `GitHub Utilities` | Human-readable plugin name |
| `__PLUGIN_SLUG__` | `github-utilities` | Kebab-case for filenames, npm name |
| `__PLUGIN_ID__` | `com.pedrofuentes.github-utilities` | Full plugin UUID |
| `__PLUGIN_DESCRIPTION__` | `Display GitHub info...` | Short description |
| `__AUTHOR_NAME__` | `Pedro Pablo Fuentes Schuster` | Full author name |
| `__AUTHOR_EMAIL__` | `git@pedrofuent.es` | Author email for headers |
| `__AUTHOR_SHORT__` | `Pedro Fuentes` | Short name for manifest |
| `__REPO_URL__` | `https://github.com/user/repo` | GitHub repository URL |
| `__ACTION_NAME__` | `repo-stats` | Kebab-case action name |
| `__ACTION_CLASS__` | `RepoStatsAction` | PascalCase action class |
| `__ACTION_DISPLAY__` | `Repo Stats` | Human-readable action name |

### File Structure

```
stream-deck-template/
├── TEMPLATE_README.md          ← You are here
├── TEMPLATE_INSTRUCTIONS.md    ← Main instructions for agents
├── LEARNINGS.md                ← Hard-won lessons and pitfalls
├── COLLABORATION.md            ← How to collaborate across workspaces
├── scaffold/                   ← Template files with placeholders
│   ├── package.json
│   ├── tsconfig.json
│   ├── rollup.config.mjs
│   ├── vitest.config.ts
│   ├── .gitignore
│   ├── .copilot-instructions.md
│   ├── .sdignore
│   ├── manifest.json
│   ├── plugin.ts
│   ├── types.ts
│   ├── utils/
│   │   ├── index.ts
│   │   └── button-renderer.ts
│   ├── actions/
│   │   └── example-action.ts
│   └── tests/
│       └── example-action.test.ts
└── .github/
    └── AGENTS.md               ← Agent instructions template
```

## Cross-Plugin Collaboration

This template includes a collaboration protocol (see COLLABORATION.md) that allows agents working on different Stream Deck plugins to share learnings. Each plugin workspace can export its discoveries to a shared location, and this template incorporates them all.
