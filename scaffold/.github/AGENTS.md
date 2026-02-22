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
- **Action list icons**: Must be **monochrome white** on **transparent background**, SVG 20×20 viewBox. No colored fills or solid backgrounds — Stream Deck adjusts for light/dark themes
- **`ShowTitle: false`** goes **inside** `States` entries to hide the default title overlay
- **`UserTitleEnabled: false`** goes at the **Action level** (sibling of `States`), NOT inside `States`. Placing it inside `States` is **silently ignored** — user title will overlay your SVG
- **Version format**: Manifest uses **4-part** version `"1.0.0.0"`, package.json uses **3-part** semver `"1.0.0"`. Keep them in sync (manifest adds trailing `.0`)
- **Omit file extensions** in all image paths: `"imgs/plugin-icon"` not `"imgs/plugin-icon.png"`
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
3. **Register ALL actions BEFORE `streamDeck.connect()`** — actions registered after `connect()` are silently ignored
4. Track polling timers per-instance via `Map<string, Timer>`
5. Always call `setTitle("")` alongside `setImage()` (prevents stale title overlays)
6. Error handling order: check configuration → check auth → fetch data → render

### SingletonAction Per-Button State (CRITICAL)

`SingletonAction` means ONE class instance handles ALL buttons of that action type. **Never store per-button state on `this`** — multiple buttons overwrite each other. Use a `Map<string, ButtonState>` keyed by `action.id`:

```typescript
interface ButtonState {
  interval?: NodeJS.Timeout;
  actionRef?: Action;
}

class MyAction extends SingletonAction {
  private buttonStates: Map<string, ButtonState> = new Map();

  onWillAppear(ev: WillAppearEvent) {
    this.buttonStates.set(ev.action.id, { actionRef: ev.action });
  }

  onWillDisappear(ev: WillDisappearEvent) {
    const state = this.buttonStates.get(ev.action.id);
    if (state?.interval) clearInterval(state.interval);
    this.buttonStates.delete(ev.action.id);
  }
}
```

### Action Key Events Require Explicit Override (CRITICAL)

The Stream Deck SDK does **NOT** route key events through inherited methods. Every action class **must** explicitly override `onKeyUp()`:

```typescript
// ❌ FAILS - key events not detected in derived class without override
class MyAction extends BaseAction {}

// ✅ WORKS - explicit override required
class MyAction extends BaseAction {
  async onKeyUp(ev: KeyUpEvent<any>): Promise<void> {
    await super.onKeyUp(ev);
  }
}
```

### Generation Counter for Stale Timer Callbacks (CRITICAL)

When settings change or user cycles metrics, old `setTimeout` callbacks in-flight can overwrite the display with stale data. Use a generation counter:

```typescript
private refreshGeneration = 0;

private async fetchAndSchedule(ev): Promise<void> {
  const gen = ++this.refreshGeneration;
  await this.updateMetrics(ev, gen);
  if (this.refreshGeneration !== gen) return; // newer cycle started
  this.scheduleRefresh(ev);
}
```

Every entry point that triggers a fetch increments the generation. Timer callbacks check the generation **before and after** every `await`.

### Thorough Cleanup on Disappear (CRITICAL)

`onWillDisappear` must clear **everything** — leaked timers, listeners, and API clients cause issues on profile switch, plugin restart, or key removal:

```typescript
onWillDisappear(): void {
  this.clearRefreshTimeout();
  this.clearDisplayInterval();
  this.apiClient = null;
  this.lastMetrics = null;
  if (this.unsubscribeGlobal) { this.unsubscribeGlobal(); this.unsubscribeGlobal = null; }
}
```

### Boolean Defaults for Backwards Compatibility

When adding new boolean settings, existing users have `undefined`. Handle explicitly:

```typescript
// ❌ WRONG — undefined becomes false, may change default behavior
const excludeAllDay = Boolean(settings.excludeAllDay);

// ✅ CORRECT — undefined = true (default on), explicit false = false
const excludeAllDay = settings.excludeAllDay === undefined ? true : Boolean(settings.excludeAllDay);
```

### Testing Standards

- Use `vi.hoisted()` + `vi.mock()` for SDK mocking (hoisting requirement)
- Create SVG assertion helpers: `assertSvgImage()`, `assertSvgContains()`, `assertErrorImage()`
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for polling tests
- Test lifecycle: `onWillAppear`, `onWillDisappear`, `onKeyDown`, `onDidReceiveSettings`
- Coverage must exceed 80% for statements, branches, functions, and lines

## Companion Guides

This project includes additional guides alongside this AGENTS.md:

| Guide | File | Purpose |
|-------|------|---------|
| **Testing Protocol** | `.github/TESTING-PROTOCOL.md` | Test structure, mocking strategies, coverage requirements, pre-release protocol, common pitfalls |
| **UI/UX Design Guide** | `.github/UI-DESIGN-GUIDE.md` | Accent bar pattern, SVG rendering specs, color palette, typography, marquee, PI components |

**Read these guides** before writing tests or making UI changes. They contain hardware-tested patterns and failure logs that prevent repeating past mistakes.

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
| `UserTitleEnabled` inside `States` | Silently ignored, user title overlays SVG | Place at **Action level** as sibling of `States` |
| Image paths with extensions in manifest | SDK can't find icons | Omit `.png`/`.svg` extensions |
| Missing `[key: string]: JsonValue` | TypeScript compile error | Add index signature |
| Not clearing title with `setTitle("")` | Stale "Action Name" text | Always call both |
| Storing state on `this` in SingletonAction | Multiple buttons overwrite each other | Use `Map<string, ButtonState>` keyed by `action.id` |
| Missing `onKeyUp` override in subclass | Key presses silently ignored | Every action must explicitly override key events |
| Registering actions after `connect()` | Actions not recognized, buttons blank | Register all actions **before** `streamDeck.connect()` |
| `Boolean(undefined)` for new settings | Changes default behavior for existing users | Handle `undefined` explicitly with desired default |
| `setTimeout` * 1000 twice for durations | 8 seconds becomes 2.2 hours | Document units in JSDoc, multiply once |
| `setSettings()` triggers `onDidReceiveSettings` | Double-render on key press cycling | Use a `pendingKeyCycle` flag to suppress echo |
| Colored action list icons | Look wrong in light/dark themes | Use monochrome white on transparent background |
| `vi.mock()` without `vi.hoisted()` | Mock not applied | Use hoisted pattern |
| Forgetting timer cleanup | Memory leak, stale updates | Clear **everything** in `onWillDisappear` |

## Contributing Learnings Back to the Template

This plugin was created from the **stream-deck-template**: https://github.com/pedrofuentes/stream-deck-template

As an agent working on this plugin, you should **proactively offer to contribute new learnings** back to the template after completing significant work. This helps all future plugins benefit from discoveries made here.

### How to contribute

1. Clone or open the template repo from https://github.com/pedrofuentes/stream-deck-template
2. Write new findings to `contributions/__PLUGIN_SLUG__.md` using this format:

```markdown
## [Category] — [Short Title]

**Discovered in**: __PLUGIN_SLUG__
**Date**: <date>
**Severity**: critical | important | nice-to-know

**Problem**: What went wrong or what was unclear
**Solution**: What fixed it
**Code example** (if applicable):
\```typescript
// working code
\```

**Prevention**: How to avoid this in the future
```

3. Commit and push (or open a PR) with a conventional commit: `docs(__PLUGIN_SLUG__): add learnings about <topic>`.

### When to offer

- After solving a non-obvious bug or hardware quirk
- After implementing a reusable pattern (polling, caching, UI component)
- After discovering a manifest or SDK constraint
- After a release
- When the session is wrapping up

### Before starting major work

Pull the latest from the template repo and read `LEARNINGS.md` for the latest consolidated knowledge from all plugins. It contains detailed patterns for:

- SVG rendering compatibility and color palettes tested on OLED hardware
- Property Inspector patterns (popup windows, dropdown hydration, debounced saves, checkbox structure)
- Architecture patterns (global settings pub/sub, service layer isolation, shared resource managers with reference counting)
- Adaptive polling, rate limit handling, key-press cycling without API refetch
- Marquee animations, compact number formatting, accent bar layout
- Testing patterns (singleton store resets, fixture organization, SVG assertion helpers)
- Build-time debug mode with Rollup
