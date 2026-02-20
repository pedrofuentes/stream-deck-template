# Agent Instructions — __PLUGIN_NAME__

> This file provides context and rules for AI coding agents working on this project.

## Project Overview

- **Plugin**: __PLUGIN_NAME__ (Stream Deck Plugin)
- **UUID**: __PLUGIN_ID__
- **SDK**: Elgato Stream Deck SDK v2 (`@elgato/streamdeck`)
- **Language**: TypeScript (ES2022), bundled with Rollup
- **Tests**: Vitest with 80% coverage thresholds

## Architecture

```
src/
  plugin.ts          — Entry point, registers actions + connects
  types.ts           — GlobalSettings and per-action settings interfaces
  actions/           — One file per Stream Deck action (SingletonAction subclass)
  utils/             — Shared utilities (SVG rendering, API helpers, etc.)
tests/
  actions/           — Tests mirror src/actions/ structure
  utils/             — Tests for utility modules
```

## Critical Rules

### SVG Rendering (WILL BREAK ON DEVICE IF WRONG)

1. **Encoding**: ALWAYS use `"data:image/svg+xml," + encodeURIComponent(svgString)`
   - `charset=utf8` DOES NOT WORK on physical Stream Deck hardware
   - `base64` encoding also fails on device
2. **No nested `<svg>` elements**: Stream Deck's renderer does not support them
   - Use `<g transform="translate(x,y) scale(s)">` instead
   - Scale ratio = targetSize / viewBoxSize (e.g., 80/72 = 1.1111)
3. **Canvas size**: 144×144 pixels for Stream Deck buttons
4. **Safe SVG only**: No `<foreignObject>`, `<filter>`, `<mask>`, CSS animations, external images

### Manifest (`manifest.json`)

- **Icons**: Must be PNG format (not SVG). Provide normal + `@2x` variants
- **`ShowTitle: false`** is the correct way to disable user title overlay
- **`UserTitleEnabled`** is INVALID — causes `streamdeck validate` to fail
- **Version format**: `"1.0.0"` not numeric `1.0`
- **SDKVersion**: Must be `2`

### Settings Type Interfaces

All settings interfaces MUST include a `JsonValue` index signature:

```typescript
import type { JsonValue } from "@elgato/utils";

type MySettings = {
  someField?: string;
  anotherField?: number;
  [key: string]: JsonValue;
};
```

### Property Inspector (PI)

- Token / global settings may not be available immediately on open
- Use a 3-layer approach:
  1. `$PI.onDidReceiveGlobalSettings` callback
  2. Explicit `$PI.getGlobalSettings()` with ~200ms delay after connection
  3. Per-action `$PI.onDidReceiveSettings` as final fallback
- `$PI.sendToPlugin()` and `$PI.onSendToPropertyInspector()` for popup → PI communication

### Action Implementation Pattern

1. Extend `SingletonAction<TSettings>`
2. Decorate with `@action({ UUID: "..." })`
3. Track polling timers per-instance via `Map<string, Timer>`
4. Always call `setTitle("")` alongside `setImage()` (prevents stale title overlays)
5. Error handling order: check configuration → check auth → fetch data → render

### Testing Standards

- Use `vi.hoisted()` + `vi.mock()` for SDK mocking (hoisting requirement)
- Create SVG assertion helpers: `assertSvgImage()`, `assertSvgContains()`, `assertErrorImage()`
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for polling tests
- Test lifecycle: `onWillAppear`, `onWillDisappear`, `onKeyDown`, `onDidReceiveSettings`
- Coverage must exceed 80% for statements, branches, functions, and lines

## Commands

| Task               | Command                               |
|--------------------|---------------------------------------|
| Build (dev)        | `npm run build`                       |
| Build (watch)      | `npm run watch`                       |
| Run tests          | `npm test`                            |
| Tests with UI      | `npm run test:ui`                     |
| Coverage           | `npm run test:coverage`               |
| Validate manifest  | `npx streamdeck validate`            |
| Package plugin     | `npx streamdeck pack __PLUGIN_ID__.sdPlugin -o release/` |
| Full SD restart    | `npm run streamdeck:restart`          |

## Git Conventions

- **Commits**: Conventional Commits format (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`)
- **File headers**: All `.ts` files must include `@author`, `@copyright`, `@license MIT`
- **Branch strategy**: Work on `main` unless told otherwise

## Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| `charset=utf8` SVG encoding | Blank button on hardware | Use `encodeURIComponent` |
| Nested `<svg>` elements | Blank on hardware | Use `<g transform>` |
| SVG icons in manifest | `streamdeck validate` fails | Convert to PNG |
| `UserTitleEnabled` in manifest | Validation failure | Use `ShowTitle: false` |
| Missing `[key: string]: JsonValue` | TypeScript compile error | Add index signature |
| Not clearing title with `setTitle("")` | Stale "Action Name" text | Always call both |
| `vi.mock()` without `vi.hoisted()` | Mock not applied | Use hoisted pattern |
| Forgetting timer cleanup | Memory leak, stale updates | Clear in `onWillDisappear` |

## Contributing Learnings Back to the Template

This plugin was created from the **stream-deck-template**: https://github.com/pedrofuentes/stream-deck-template

As an agent working on this plugin, you should **proactively offer to contribute new learnings** back to the template after completing significant work. This helps all future plugins benefit from discoveries made here.

### How to contribute

1. Clone or open the template repo from https://github.com/pedrofuentes/stream-deck-template
2. Write new findings to `contributions/__PLUGIN_SLUG__.md` using the format in `COLLABORATION.md`.
3. Commit and push (or open a PR) with a conventional commit: `docs(__PLUGIN_SLUG__): add learnings about <topic>`.

### When to offer

- After solving a non-obvious bug or hardware quirk
- After implementing a reusable pattern (polling, caching, UI component)
- After discovering a manifest or SDK constraint
- After a release
- When the session is wrapping up

### Before starting major work

Pull the latest from the template repo and read `LEARNINGS.md` for the latest consolidated knowledge from all plugins.
