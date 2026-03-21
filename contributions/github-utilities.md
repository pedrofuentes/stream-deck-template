# Contributions: stream-deck-github-utilities

> Source: [stream-deck-github-utilities](https://github.com/pedrofuentes/stream-deck-github-utilities)
> **Status**: ✅ Merged into `LEARNINGS.md` on February 22, 2026

## Stats
- **Test count**: 357 tests, 10 test files
- **Source files**: 19 TypeScript files
- **Actions**: 2 (Repo Stats, Workflow Status)
- **Latest Release**: v1.3.3

## Key Topics Contributed
- SVG encoding (`encodeURIComponent` — the only working method)
- Nested `<svg>` → `<g transform>` fix
- Manifest validation gotchas (`UserTitleEnabled`, PNG icons)
- Property Inspector token loading race condition (3-layer fallback)
- Testing patterns (`vi.hoisted()`, SVG assertion helpers, fake timers)
- Build & release pipeline (Rollup, `streamdeck pack`, GitHub Releases)
- Action patterns (polling, timer cleanup, error handling order)

### v1.2.0 Contributions (merged February 22, 2026)
- Short press / long press detection — `onKeyDown`/`onKeyUp` timing with 500ms threshold
- FilterableSelect searchable dropdown — reusable combobox with keyboard nav, ARIA, viewport flip
- `sdpi-settings-loaded` custom event — for custom PI components during initialization
- Viewport-aware dropdown positioning — flip logic, `column-reverse`, 120px minimum
- Marquee scrolling — `MarqueeController` per-line with circular scroll
- Documentation & PI Verification pre-release gate — 8-item mandatory checklist
- Branch naming conventions — `feature/`, `fix/`, `docs/`, `test/`, `release/` prefixes
- `.streamDeckPlugin` artifact should NOT be committed to repo

### v1.3.3 Contributions (merged February 23, 2026)
- WebSocket send interceptor — merge custom component settings into sdpi-components' `setSettings` to prevent partial overwrites
- `didReceiveSettings` echo suppression — timestamp-based guard prevents stale echoes from clobbering user's pending dropdown changes
- PI-side default injection — inject defaults in send interceptor (not plugin) to avoid extra `setSettings` echo that races with sdpi-components' 250ms debounce
- Cached settings for multi-button isolation — prefer `Map<string, Settings>` cache over `ev.payload.settings` which can be stale
- `recentSetSettings` guard — `Set<string>` to suppress redundant `onDidReceiveSettings` processing after programmatic `setSettings`
- `UserTitleEnabled: false` placement — must be at Action level, not inside States (silently ignored otherwise)

---

## v1.2.0 Contributions (New)

### [UI Pattern] — Marquee Scrolling for Overflow Text

**Discovered in**: github-utilities
**Date**: 2025-07-25
**Severity**: important

**Problem**: Text values (repo names, branch names, license names) often exceed the 72px OLED button width, causing overflow or truncation that hides important information.

**Solution**: Created a reusable `MarqueeController` class that implements circular scrolling:
- State machine with pause/scroll phases
- Pauses for N ticks at the start position before scrolling
- Appends a separator (`"  •  "`) between end and start for seamless loop
- Each `tick()` advances by one character; `getCurrentText()` returns the visible window
- Action sets a `setInterval` (500ms) that ticks the controller and re-renders the SVG
- Only activates when text actually exceeds `maxVisible` characters

```typescript
const controller = new MarqueeController(14); // max visible chars
controller.setText("very-long-repository-name");
// On each tick: "very-long-repos" → "ery-long-reposi" → ...
// Pauses at start for 3 ticks before scrolling
```

**Key decisions**:
- Separate MarqueeController per text line (line1 may scroll while line2 doesn't)
- Cache render data so marquee re-renders don't require API calls
- Stop marquee timer on `onWillDisappear`, restart on `onWillAppear`
- Use `renderWithMarquee()` wrapper that reads current text from controllers

**Prevention**: Any action with variable-length text should integrate marquee. Define `MAX_VISIBLE` constants per line based on font size and button width.

---

### [UI Component] — FilterableSelect for Dynamic Dropdowns

**Discovered in**: github-utilities
**Date**: 2025-07-24
**Severity**: critical

**Problem**: The SDK's `<sdpi-select datasource="...">` doesn't support search/filter. Users with 50+ repos can't find what they need in a long dropdown.

**Solution**: Custom `FilterableSelect` Web Component (vanilla JS, no framework):
- Combobox pattern with text input + dropdown list
- Filters on keystroke (case-insensitive substring match)
- Full keyboard navigation (Arrow keys, Enter, Escape)
- ARIA attributes for accessibility
- Dark theme matching GitHub/Stream Deck aesthetic
- Viewport-aware flip positioning — dropdown opens upward when near bottom of screen

```html
<filterable-select setting="repo" placeholder="Search repositories..."></filterable-select>
<script src="filterable-select.js"></script>
```

**Critical pitfall**: The dropdown must detect available viewport space and flip direction. Use `getBoundingClientRect()` to measure space below vs above, and CSS `flex-direction: column-reverse` for upward rendering.

**Prevention**: Always use FilterableSelect for any datasource dropdown with >8 items. Use standard `<sdpi-select>` only for static lists with ≤10 fixed options.

---

### [SDK Pattern] — Short Press / Long Press Detection

**Discovered in**: github-utilities
**Date**: 2025-07-24
**Severity**: important

**Problem**: Need different behaviors for tap vs hold on Stream Deck buttons (e.g., cycle stat types vs open URL).

**Solution**: Use `onKeyDown` to record timestamp, `onKeyUp` to measure duration:

```typescript
const LONG_PRESS_THRESHOLD_MS = 500;
private keyDownTime = new Map<string, number>();

async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    this.keyDownTime.set(ev.action.id, Date.now());
}

async onKeyUp(ev: KeyUpEvent<Settings>): Promise<void> {
    const downTime = this.keyDownTime.get(ev.action.id) ?? Date.now();
    this.keyDownTime.delete(ev.action.id);
    const duration = Date.now() - downTime;

    if (duration >= LONG_PRESS_THRESHOLD_MS) {
        await ev.action.openUrl(url); // Long press → open URL
    } else {
        // Short press → cycle stat types
    }
}
```

**Key details**:
- 500ms threshold works well for distinguishing tap from intentional hold
- Clean up `keyDownTime` map in `onKeyUp` to prevent memory leaks
- Test boundary values: 499ms (short) and 500ms (long)
- `openUrl()` is a built-in SDK method that opens the system browser

---

### [SDK Pitfall] — Property Inspector Settings Load Race Condition

**Discovered in**: github-utilities
**Date**: 2025-07-25
**Severity**: critical

**Problem**: Custom UI components (like FilterableSelect) that read `window._actionSettings` in their constructor get empty settings because `connectElgatoStreamDeckSocket` callback fires AFTER DOM construction completes.

**Solution**: Dispatch a custom event after settings are populated, and have the component listen for it:

```javascript
// In the PI HTML <script>:
connectElgatoStreamDeckSocket(port, uuid, event, info, settings) {
    window._actionSettings = settings;
    // Fire event AFTER settings are populated
    document.dispatchEvent(new CustomEvent("sdpi-settings-loaded"));
}

// In FilterableSelect constructor:
document.addEventListener("sdpi-settings-loaded", () => {
    this._loadInitialValue(); // Re-read settings now that they're available
});
```

**Also handle live updates**: Listen for `didReceiveSettings` WebSocket messages and dispatch the same event so components stay in sync when settings change from elsewhere.

**Prevention**: Never rely on `window._actionSettings` being available during DOM construction. Always use an event-driven approach for initial value loading.

---

## v1.3.3 Contributions (New)

### [PI Pattern] — WebSocket Send Interceptor for Settings Merge (CRITICAL)

**Discovered in**: github-utilities
**Date**: 2026-02-23
**Severity**: critical

**Problem**: When a PI uses both `sdpi-components` (for static dropdowns like stat type, refresh interval) and a custom component like `FilterableSelect` (for dynamic dropdowns like repo), `sdpi-components` sends `setSettings` with **only the fields it manages**. This overwrites settings from custom components — e.g., selecting a stat type wipes the `repo` field.

The root cause: `sdpi-components` maintains its own internal `_settings` object and sends it wholesale via `setSettings`. It has no knowledge of settings managed by external components.

**Solution**: Intercept `WebSocket.send()` in the PI and merge `window._actionSettings` (which tracks ALL settings) into every outgoing `setSettings` payload:

```javascript
(function() {
    const NativeWS = window.WebSocket;
    window.WebSocket = new Proxy(NativeWS, {
        construct(target, args) {
            const ws = new target(...args);
            window._sdWebSocket = ws;
            const _origSend = ws.send.bind(ws);
            ws.send = function(data) {
                try {
                    const msg = JSON.parse(data);
                    if (msg.event === "setSettings" && window._actionSettings) {
                        // Merge: _actionSettings provides the base (all fields),
                        // msg.payload provides the update (sdpi-components' fields).
                        msg.payload = Object.assign({}, window._actionSettings, msg.payload);
                        window._actionSettings = msg.payload;
                        return _origSend(JSON.stringify(msg));
                    }
                } catch(e) {}
                return _origSend(data);
            };
            // ... message listener for didReceiveSettings, etc.
            return ws;
        }
    });
})();
```

**Key details**:
- The Proxy must be set up BEFORE `sdpi-components.js` loads (it creates the WebSocket)
- `Object.assign({}, _actionSettings, msg.payload)` ensures sdpi-components' new value wins for its fields, while preserving all other fields
- Also keep `_actionSettings` in sync from incoming `didReceiveSettings` messages

**Prevention**: Any PI that mixes `sdpi-components` with custom settings-managing components MUST use this send interceptor pattern. Without it, one component will silently overwrite the other's settings.

---

### [PI Pattern] — didReceiveSettings Echo Suppression (CRITICAL)

**Discovered in**: github-utilities
**Date**: 2026-02-23
**Severity**: critical

**Problem**: When the PI sends `setSettings`, the Stream Deck app echoes `didReceiveSettings` back to the PI with the **pre-change** values. This echo arrives during `sdpi-components`' 250ms debounce window, causing it to overwrite its internal `_settings` with stale data. The debounced save then sends the stale values, reverting the user's change.

Symptom: User changes dropdown → nothing happens. User changes dropdown again → now it works (because the second change has no competing echo).

**Solution**: Track when settings are sent and suppress echo updates to `_actionSettings` within a 500ms window:

```javascript
let _lastSendTime = 0;
const ECHO_WINDOW_MS = 500;

// In the send interceptor:
ws.send = function(data) {
    try {
        const msg = JSON.parse(data);
        if (msg.event === "setSettings" && window._actionSettings) {
            msg.payload = Object.assign({}, window._actionSettings, msg.payload);
            window._actionSettings = msg.payload;
            _lastSendTime = Date.now();  // Mark send time
            return _origSend(JSON.stringify(msg));
        }
    } catch(e) {}
    return _origSend(data);
};

// In the message listener:
if (data.event === "didReceiveSettings") {
    const isEcho = (Date.now() - _lastSendTime) < ECHO_WINDOW_MS;
    if (!isEcho) {
        window._actionSettings = data.payload?.settings || {};
    }
    // Still dispatch the event for component sync (FilterableSelect, etc.)
    window.dispatchEvent(new CustomEvent('sdpi-settings-loaded', {
        detail: { settings: data.payload?.settings || {} }
    }));
}
```

**Why 500ms?** sdpi-components' internal debounce is 250ms. The echo from the SD app can take another 50-200ms to arrive. 500ms provides a safe margin.

**Prevention**: Every PI that uses the WebSocket send interceptor pattern MUST also implement echo suppression. The two patterns are inseparable — without echo suppression, the send interceptor's `_actionSettings` gets clobbered by stale echoes.

---

### [PI Pattern] — PI-Side Default Injection (Avoid Plugin setSettings Echoes)

**Discovered in**: github-utilities
**Date**: 2026-02-23
**Severity**: critical

**Problem**: When the plugin detects missing defaults (e.g., `statType` not set after repo selection) and calls `setSettings` to persist them, the SD app echoes `didReceiveSettings` to the PI. This echo arrives during `sdpi-components`' debounce window, reverting the user's pending dropdown change. Even with echo suppression on the PI side, `sdpi-components`' own internal `_settings` object gets overwritten by the `didReceiveSettings` event handler that is built into the library and cannot be intercepted.

**Solution**: Inject defaults in the PI's WebSocket send interceptor instead of in the plugin:

```javascript
ws.send = function(data) {
    try {
        const msg = JSON.parse(data);
        if (msg.event === "setSettings" && window._actionSettings) {
            msg.payload = Object.assign({}, window._actionSettings, msg.payload);
            // Inject defaults when repo is set but stat/refresh are missing.
            // Done HERE (not in the plugin) to avoid an extra setSettings echo
            // that races with sdpi-components' 250ms debounced save.
            if (msg.payload.repo && !msg.payload.statType) {
                msg.payload.statType = "stars";
            }
            if (msg.payload.repo && !msg.payload.refreshInterval) {
                msg.payload.refreshInterval = 300;
            }
            window._actionSettings = msg.payload;
            _lastSendTime = Date.now();
            return _origSend(JSON.stringify(msg));
        }
    } catch(e) {}
    return _origSend(data);
};
```

**Rule**: The plugin should still apply defaults in-memory (safety fallback) but must **never call `setSettings()` to persist defaults**. Only the PI should persist defaults, piggybacking on existing saves.

**Prevention**: If the plugin needs to inject default values, always do it in the PI send interceptor. Any `setSettings` call from the plugin creates an echo that can race with the user's next PI interaction.

---

### [Action Pattern] — Cached Settings + recentSetSettings Guard for Multi-Button

**Discovered in**: github-utilities
**Date**: 2026-02-23
**Severity**: important

**Problem**: Two related issues with `SingletonAction` and settings:
1. `ev.payload.settings` in `onKeyUp` can be stale when sdpi-components sent a partial `setSettings` (e.g., only `statType` without `repo`)
2. `setSettings()` from `onKeyUp` (key-press cycling) triggers `onDidReceiveSettings`, causing a redundant loading → refresh cycle that flickers the button

**Solution**: Maintain a per-action settings cache and a recent-update guard:

```typescript
private actionSettings = new Map<string, MySettings>();
private recentSetSettings = new Set<string>();

override async onKeyUp(ev: KeyUpEvent<MySettings>): Promise<void> {
    // Prefer cached settings — event payload may have stale/partial data
    const cached = this.actionSettings.get(ev.action.id);
    const repo = cached?.repo ?? ev.payload.settings.repo;
    const currentType = cached?.statType ?? ev.payload.settings.statType ?? "stars";

    // Cycle to next type
    const nextType = STAT_TYPES[(STAT_TYPES.indexOf(currentType) + 1) % STAT_TYPES.length];
    const newSettings = { ...ev.payload.settings, ...cached, statType: nextType };

    // Mark as recently updated to suppress echo in onDidReceiveSettings
    this.recentSetSettings.add(ev.action.id);
    await ev.action.setSettings(newSettings);
    this.actionSettings.set(ev.action.id, newSettings);
    await this.refreshStats(ev.action.id);
}

override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MySettings>): Promise<void> {
    // Skip echo from our own setSettings call
    if (this.recentSetSettings.delete(ev.action.id)) {
        this.actionSettings.set(ev.action.id, ev.payload.settings);
        return;
    }
    // Normal settings change from PI — merge and refresh
    const cached = this.actionSettings.get(ev.action.id);
    const settings = { ...cached, ...ev.payload.settings };
    this.actionSettings.set(ev.action.id, settings);
    await this.refreshStats(ev.action.id);
}
```

**Key details**:
- `actionSettings` Map is the single source of truth for current settings per button
- `recentSetSettings` Set uses `delete()` which returns `true` if the item was present — clean one-shot guard
- Settings merge `{ ...cached, ...incoming }` protects against partial updates from sdpi-components
- Clean up both Maps in `onWillDisappear`

**Prevention**: Any action that calls `setSettings()` programmatically (cycling, auto-defaults) must guard `onDidReceiveSettings` against the resulting echo. Use a `Set<string>` for the guard, not a boolean flag, to support multiple concurrent buttons.

---

## v2.0.0 Contributions (New)

### Stats Update
- **Test count**: 735 tests, 24 test files
- **Source files**: 35+ TypeScript files
- **Actions**: 12 (7 original + 5 new)
- **Latest Release**: v2.0.0

### [Encoder] — Touch Strip Rendering via Single Pixmap Layout

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: critical

**Problem**: The built-in touch strip layout types (bar, gbar, text) are too limited for custom visualizations (sparklines, heatmaps, arc gauges, branch diagrams). Each layout item type has fixed rendering — no curves, no gradients, no complex shapes.

**Solution**: Use a single `pixmap` layout item covering the full 200×100 canvas. Generate complete SVG strings and pass them via `setFeedback({ canvas: svgDataUri })`:

```json
{
  "$schema": "https://schemas.elgato.com/streamdeck/plugins/layout.json",
  "id": "github-full-canvas",
  "items": [{ "key": "canvas", "type": "pixmap", "rect": [0, 0, 200, 100] }]
}
```

**Critical encoding**: The SVG must be wrapped as a data URI: `"data:image/svg+xml," + encodeURIComponent(svg)`. Raw SVG strings do NOT work with `setFeedback`. This matches the encoding used for `setImage` on keys.

**Key details**:
- Call `setFeedbackLayout("layouts/your-layout.json")` in `onWillAppear` BEFORE any `setFeedback` calls — the layout must be assigned first or feedback is silently ignored
- The 200×100 canvas is per-encoder (each dial owns one quarter of the 800×100 strip)
- SVG rendering gives complete freedom: Bézier sparklines, arc gauges, heatmap grids, metro-map diagrams

---

### [Encoder] — Multi-Quarter Contiguous Rendering

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: important

**Problem**: Actions like contribution heatmaps and branch network diagrams benefit from spanning 2-4 adjacent touch strip quarters. Each quarter is independently rendered by a separate action instance. The quarters must tile seamlessly.

**Solution**: Use `ev.payload.coordinates.column` (0-3) to auto-detect dial position. Find sibling instances (same action class + same repo) among `this.actions`, sort by column, and compute relative position:

```typescript
private getBaseOffset(actionId: string): number {
    const settings = this.actionSettings.get(actionId);
    const myColumn = this.dialColumn.get(actionId) ?? 0;
    const siblingColumns: number[] = [];
    for (const a of this.actions) {
        const s = this.actionSettings.get(a.id);
        if (s?.repo === settings?.repo && a.isDial()) {
            siblingColumns.push(this.dialColumn.get(a.id) ?? 0);
        }
    }
    siblingColumns.sort((a, b) => a - b);
    const idx = siblingColumns.indexOf(myColumn);
    return (idx >= 0 ? idx : 0) * 200; // 200px per quarter
}
```

**Critical pitfall**: Do NOT use raw `column` as the offset. If branch-network is on dials 0-2 and heatmap on dial 3, the heatmap would get offset 600px (thinking it's quarter 4). The relative-position approach fixes this: heatmap sees no siblings → offset 0 (standalone).

**Synced scrolling**: Use `static` Maps on the class keyed by repo to share scroll state across siblings. When one dial rotates, render ALL siblings:

```typescript
private static sharedScrollH = new Map<string, number>();
```

**Data sharing**: Before making API calls, check if a sibling already cached the data for the same repo — reuse it instead of duplicate calls.

---

### [Encoder] — Dial Event Handlers Pattern

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: important

**Problem**: Need to add encoder support to existing keypad actions without breaking keypad behavior.

**Solution**: Add `Controllers: ["Keypad", "Encoder"]` to manifest. Use `isDial()` guards:

```typescript
override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    if (ev.action.isKey()) {
        // Existing keypad rendering...
    }
    if (ev.action.isDial()) {
        this.dialColumn.set(ev.action.id, ev.payload.coordinates?.column ?? 0);
        await ev.action.setFeedbackLayout("layouts/my-layout.json");
        await ev.action.setFeedback({ canvas: renderStripLoading() });
    }
    // Shared logic (polling, data fetch) runs for both
}
```

**Dial events available**:
- `onDialRotate(ev)` — `ev.payload.ticks` (signed), `ev.payload.pressed` (bool)
- `onDialDown(ev)` / `onDialUp(ev)` — press/release
- `onTouchTap(ev)` — `ev.payload.hold` (bool), `ev.payload.tapPos` ([x,y])

**Press+rotate pattern**: Use `ev.payload.pressed` in `onDialRotate` for two-axis control (e.g., horizontal scroll normally, vertical scroll while pressed).

---

### [Encoder] — setFeedbackLayout Must Be Called First

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: critical

**Problem**: Dial actions show "Setup Required" on the touch strip even after configuration. The touch strip never updates despite `setFeedback` being called correctly.

**Root cause**: `setFeedback()` is silently ignored if no layout has been assigned to the encoder. The layout must be set before any feedback.

**Solution**: Call `setFeedbackLayout()` in `onWillAppear` before any `setFeedback` call:

```typescript
if (ev.action.isDial()) {
    await ev.action.setFeedbackLayout("layouts/github-full-canvas.json"); // ← MUST be first
    await ev.action.setFeedback({ canvas: renderStripUnconfigured() });
}
```

---

### [Performance] — Cache Action Contexts in a Map

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: medium

**Problem**: `[...this.actions].find((a) => a.id === actionId)` spreads the entire collection and does a linear search. This runs on every polling cycle, every render, and every dial rotation.

**Solution**: Cache action references in a Map populated in `onWillAppear`, cleaned in `onWillDisappear`:

```typescript
private actionContexts = new Map<string, Action<Settings>>();

override onWillAppear(ev) { this.actionContexts.set(ev.action.id, ev.action); }
override onWillDisappear(ev) { this.actionContexts.delete(ev.action.id); }

// O(1) lookup instead of O(n) spread+find:
const ctx = this.actionContexts.get(actionId);
```

---

### [Performance] — Throttle setFeedback During Dial Rotation

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: medium

**Problem**: Each dial rotation tick triggers SVG generation + `setFeedback` for all sibling quarters. With 4 quarters, that's 4 SVGs rendered per tick, potentially 20 renders/second during fast scrolling.

**Solution**: Debounce rendering to ~60fps:

```typescript
private renderTimeout: ReturnType<typeof setTimeout> | null = null;

override async onDialRotate(ev): Promise<void> {
    // Update scroll state immediately
    BranchNetworkAction.sharedScrollH.set(repo, newOffset);
    // Throttle the actual render
    if (this.renderTimeout) clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => {
        this.renderAllSiblings(repo).catch(() => {});
    }, 16); // ~60fps
}
```

---

### [Performance] — Array.join() for SVG String Building

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: low

**Problem**: SVG renderers building heatmaps (364 cells) use string `+=` concatenation in loops, which is O(n²) in worst case.

**Solution**: Use `Array.push()` + `.join("")`:

```typescript
const parts: string[] = [];
weeklyData.forEach((week) => {
    week.forEach((v, d) => {
        parts.push(`<rect x="${x}" y="${y}" .../>`);
    });
});
const content = parts.join("");
```

---

### [Rendering] — SVG Gradients Don't Render on SD+ Touch Strip

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: important

**Problem**: `<linearGradient>` and `<radialGradient>` elements in SVG don't render correctly on the Stream Deck+ touch strip hardware. The gradient appears solid or invisible.

**Solution**: Replace all gradients with flat colors at reduced opacity:

```xml
<!-- BAD: gradient doesn't render -->
<defs>
  <radialGradient id="glow" ...>...</radialGradient>
</defs>
<rect fill="url(#glow)"/>

<!-- GOOD: flat color with opacity -->
<rect fill="#3fb950" fill-opacity="0.06"/>
```

---

### [Action] — Double-Click Detection for Force Refresh

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: low

**Problem**: Users want to force-refresh data without waiting for the poll interval. Existing controls (short press, long press) are taken.

**Solution**: Track last key-up time. If two presses within 400ms, treat as double-click:

```typescript
private lastKeyUpTime = new Map<string, number>();

override async onKeyUp(ev): Promise<void> {
    const now = Date.now();
    const lastUp = this.lastKeyUpTime.get(ev.action.id) ?? 0;
    this.lastKeyUpTime.set(ev.action.id, now);
    if (now - lastUp < 400) {
        this.lastKeyUpTime.delete(ev.action.id);
        await this.refresh(ev.action.id); // Force refresh
        return;
    }
    // Normal press handling...
}
```

---

### [API] — GitHub GraphQL for Profile Contribution Calendar

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: important

**Problem**: GitHub REST API only provides per-repo commit data. The profile contribution calendar (all repos, all contribution types) is only available via GraphQL.

**Solution**: Use the GraphQL `contributionsCollection` query:

```typescript
const query = `query { viewer { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`;

const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
});
```

**Key details**:
- Uses the same PAT as REST — no additional permissions for public data
- Returns the exact same data shown on the GitHub profile page
- `viewer` query fetches for the token owner; `user(login: "...")` for others
- Day order is Sun-Sat; reorder to Mon-Sun for standard display
- GraphQL has its own rate limit (5,000 points/hour), separate from REST

---

### [Rendering] — Fixed Summary Panel with Scrolling Content

**Discovered in**: github-utilities
**Date**: 2026-03-19
**Severity**: important

**Problem**: Heatmap has a summary panel (commit count, labels) on the left and a scrollable grid on the right. When the grid scrolls, the summary must stay fixed. But both render into the same SVG.

**Solution**: Render cells first, then render the summary panel ON TOP with a black background mask:

```typescript
// 1. Render cells (may overlap summary area when scrolled)
cells.forEach((cell) => {
    if (showSummary && cell.x < summaryWidth) return; // clip
    parts.push(`<rect x="${cell.x}" .../>`);
});

// 2. Render summary AFTER cells (higher z-order in SVG)
if (showSummary) {
    parts.push(`<rect x="0" width="${summaryWidth}" height="100" fill="#000"/>`); // mask
    parts.push(`<text x="6" y="20">${totalCommits}</text>`); // overlay
}
```

**Critical pitfall**: Don't use `offset < 200` to determine if summary should show — when scroll offset exceeds 200px, the summary vanishes. Use an explicit `showSummary` boolean parameter based on the action's relative position (first sibling = show summary).

---

## v2.2.4 Contributions (New)

### Stats Update
- **Test count**: 1,562 tests, 44 test files
- **Source files**: 48 TypeScript files
- **Actions**: 14
- **Latest Release**: v2.2.4

### Key Topics Contributed
- Double-click debounce pattern for `openUrl` vs force-refresh
- Network resilience: `fetchWithTimeout()` with AbortSignal
- TypeScript exhaustive switch checking for union-typed fragment dispatchers
- `DebouncedUrlOpener` shared utility class (reducing cross-action boilerplate)
- setTimeout leak prevention pattern (tracked timers + cleanup on disappear)
- Polling interval input sanitization (NaN, Infinity, max bound)
- STAT_LABELS compile-time exhaustiveness via `as const satisfies`
- Silent catch block observability (debug logging on fallback paths)

### v2.2.4 P3 Contributions (March 21, 2026)
- BaseGitHubAction abstract class — reducing 14-action boilerplate via inheritance
- Fragment strategy pattern — registry-based coordinator dispatch replacing switch statements
- Zod runtime validation — replacing unsafe `as` casts in API response handling
- Settings interface composition — `extends` hierarchy eliminating field duplication
- Snapshot testing for SVG renderers — golden master regression detection
- RenderDebouncer utility — shared dial-rotation render throttling
- Deployment pitfall: `streamdeck link` + `streamdeck restart` must both run after builds

---

### [Architecture] — Abstract Base Class for Action Boilerplate

**Discovered in**: github-utilities
**Date**: 2026-03-21
**Severity**: critical

**Problem**: All 14 action classes duplicate ~150-170 lines of identical boilerplate: instance Map declarations (`polling`, `actionSettings`, `actionContexts`, `urlOpener`), `onWillDisappear` cleanup, `onSendToPlugin` PI handler, and error classification. Adding a new action requires copying 200+ lines of scaffolding.

**Solution**: Create `BaseGitHubAction<TSettings>` abstract class that all actions extend:

```typescript
export abstract class BaseGitHubAction<TSettings extends RepoActionSettings>
	extends SingletonAction<TSettings> {

	protected polling = new PollingCoordinator();
	protected urlOpener = new DebouncedUrlOpener();
	protected actionSettings = new Map<string, TSettings>();
	protected actionContexts = new Map<string, Action<TSettings>>();

	override async onWillDisappear(ev) {
		this.polling.stop(ev.action.id);
		this.coordinator.unsubscribe(ev.action.id);
		this.urlOpener.cleanup(ev.action.id);
		this.actionSettings.delete(ev.action.id);
		this.actionContexts.delete(ev.action.id);
	}

	override async onSendToPlugin(ev) {
		const data = ev.payload as PIDataRequest;
		await handlePIDataRequest(data, () => ev.action.getSettings());
	}

	protected async renderError(actionId: string, error: unknown): Promise<string> {
		const errorLabel = classifyErrorLabel(error);
		const ctx = this.actionContexts.get(actionId);
		if (ctx) await ctx.setImage(renderErrorImage(errorLabel));
		return errorLabel;
	}
}
```

**Key design decisions**:
- Subclasses call `super.onWillDisappear(ev)` then clean up action-specific state (marquee data, trend cache, etc.)
- Error classification is centralized via `classifyErrorLabel()` — no more `message.includes()` in each action
- The SDK's `@action` decorator pattern works with class inheritance — no DI framework needed

**Prevention**: Every new action should extend `BaseGitHubAction` — never extend `SingletonAction` directly.

---

### [Architecture] — Strategy Pattern for Fragment Dispatch

**Discovered in**: github-utilities
**Date**: 2026-03-21
**Severity**: important

**Problem**: The GraphQL coordinator had 3 switch statements dispatching on a `DataFragmentName` union (12 values). Adding a new fragment required editing 3 places. Missing a case caused silent failures.

**Solution**: Replace switches with a `FragmentStrategy` interface + strategy registry:

```typescript
interface FragmentStrategy {
	readonly name: DataFragmentName;
	readonly supportsGraphQL: boolean;
	extractFromGraphQL?(cache, repo, node, params): void;
	fetchViaREST(cache, repo, token, params): Promise<void>;
	assignToResult(result, cache, repo, params): void;
}

const fragmentRegistry = new Map<DataFragmentName, FragmentStrategy>();
// Register all 12 strategies...

// Usage in coordinator (replaces 3 switches):
const strategy = fragmentRegistry.get(fragment);
strategy.extractFromGraphQL(cache, repo, node, params);
```

**Benefits**: Adding a new fragment = create one class + register it. No coordinator changes. Each strategy is independently testable.

---

### [Validation] — Zod Schemas for API Response Safety

**Discovered in**: github-utilities
**Date**: 2026-03-21
**Severity**: critical

**Problem**: 88 `as` type assertions in API modules cast `response.json()` results without validation. If GitHub changes their API response shapes, the plugin silently misinterprets data or crashes.

**Solution**: Add Zod as a production dependency and create schemas for all API response types:

```typescript
import { z } from "zod";

export const RepoStatsSchema = z.object({
	stargazers_count: z.number(),
	forks_count: z.number(),
	open_issues_count: z.number(),
	full_name: z.string(),
	language: z.string().nullable(),
	// ... all accessed fields
}).passthrough(); // allow extra fields from GitHub

// Replace unsafe casts:
// BEFORE: const data = (await response.json()) as Record<string, unknown>;
// AFTER:  const data = RepoStatsSchema.parse(await response.json());
```

**Key details**:
- Use `.passthrough()` so extra API fields don't cause failures
- Use `.nullable()` and `.optional()` liberally — GitHub returns null for many fields
- Zod is ~60KB but this runs in Node.js (not browser), so bundle size is acceptable
- `.parse()` throws with descriptive error on invalid data — caught by existing error handling
- Add `zod` to `dependencies` (not `devDependencies`) — it's a runtime dependency

---

### [Testing] — Snapshot Tests for SVG Renderers

**Discovered in**: github-utilities
**Date**: 2026-03-21
**Severity**: important

**Problem**: 28 SVG render functions produce complex output (colors, layout, font sizes, text escaping). Any accidental change to rendering goes undetected by unit tests that only check `expect(svg).toContain("Stars")`.

**Solution**: Use Vitest's built-in `toMatchSnapshot()` to capture exact SVG output:

```typescript
describe("Button renderer snapshots", () => {
	it("renderStatImage — stars", () => {
		expect(renderStatImage("42K", "stars", "facebook/react")).toMatchSnapshot();
	});

	it("renderErrorImage — rate limited", () => {
		expect(renderErrorImage("Rate Limited")).toMatchSnapshot();
	});

	// Edge cases
	it("renderStatImage — XSS characters escaped", () => {
		expect(renderStatImage("<script>", "language", "evil/repo&co")).toMatchSnapshot();
	});
});
```

**Key details**:
- Snapshots auto-generate in `__snapshots__/` directories
- Run `npx vitest run tests/renderers/ --update` to regenerate after intentional changes
- Review snapshot diffs carefully — they show exact SVG differences
- Include edge cases: XSS characters, empty strings, very long values, all stat types/status values

---

### [TypeScript] — Settings Interface Composition via extends

**Discovered in**: github-utilities
**Date**: 2026-03-21
**Severity**: medium

**Problem**: 13 settings interfaces independently declare `repo?: string; refreshInterval?: number; [key: string]: JsonValue`. Five minimal-settings actions have identical interfaces. No `extends` is used.

**Solution**: Create a hierarchy:

```typescript
interface RepoActionSettings {
	repo?: string;
	refreshInterval?: number;
	[key: string]: JsonValue;
}

interface StateFilteredSettings extends RepoActionSettings {
	stateFilter?: "open" | "closed" | "all";
}

// Minimal actions become type aliases:
type BranchNetworkSettings = RepoActionSettings;
type FleetMonitorSettings = RepoActionSettings;

// Specific actions extend the right base:
interface IssueCounterSettings extends StateFilteredSettings {}
interface RepoStatsSettings extends RepoActionSettings { statType?: StatType; }
```

**Prevention**: Always check existing base interfaces before creating a new settings type. If your action only needs `repo` + `refreshInterval`, use `RepoActionSettings` directly.

---

### [Deployment Pitfall] — streamdeck link + restart Required Together

**Discovered in**: github-utilities
**Date**: 2026-03-21
**Severity**: critical

**Problem**: After `npm run build && streamdeck restart`, the Property Inspector panels show completely blank/white. The plugin runs fine (buttons render, API calls work), but clicking the gear icon shows nothing.

**Root cause**: The symlink from the Stream Deck plugins directory to `release/` can become stale after major code changes (especially structural changes like new directories, renamed files). Just restarting the plugin doesn't refresh the symlink.

**Solution**: Always run both commands together:

```bash
npm run build
streamdeck link release/com.pedrofuentes.github-utilities.sdPlugin
streamdeck restart com.pedrofuentes.github-utilities
```

**Prevention**: Add this to your mental checklist and AGENTS.md Common Pitfalls. Never skip `streamdeck link` after builds.

---

### [Action Pattern] — Debounced URL Open for Double-Click Detection

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: critical

**Problem**: Stream Deck buttons commonly use single-click to open a URL and double-click to force-refresh. The naïve approach (check timestamp of previous click) is **fundamentally broken**: the first click's `openUrl()` executes immediately because the code can't predict whether a second click is coming. By the time the second click arrives and triggers force-refresh, the browser tab has already opened.

**Broken pattern** (reactive detection):
```typescript
// onKeyDown
const lastUp = this.lastKeyUpTime.get(ev.action.id) ?? 0;
this.lastKeyUpTime.set(ev.action.id, Date.now());
if (Date.now() - lastUp < 400) {
    // Double-click → refresh
    return;
}
// First click reaches here immediately → opens URL
await streamDeck.system.openUrl(url);
```

**Solution**: Debounce the URL open. On first click, **schedule** the URL to open after 400ms. If a second click arrives within that window, cancel the timer and force-refresh instead:

```typescript
export class DebouncedUrlOpener {
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    /** Returns true if this is a double-click (second press within 400ms). */
    handlePress(actionId: string): boolean {
        const pending = this.timers.get(actionId);
        if (pending) {
            clearTimeout(pending);
            this.timers.delete(actionId);
            return true; // double-click
        }
        return false; // first click
    }

    /** Schedule URL open after the double-click detection window. */
    scheduleOpen(actionId: string, url: string): void {
        this.timers.set(actionId, setTimeout(() => {
            this.timers.delete(actionId);
            streamDeck.system.openUrl(url);
        }, 400));
    }

    /** Cancel pending timer. Call in onWillDisappear. */
    cleanup(actionId: string): void {
        const timer = this.timers.get(actionId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(actionId);
        }
    }
}
```

**Usage in action**:
```typescript
private urlOpener = new DebouncedUrlOpener();

async onKeyDown(ev) {
    if (this.urlOpener.handlePress(ev.action.id)) {
        this.polling.resetBackoff(ev.action.id);
        await this.refreshData(ev.action.id, true);
        return;
    }
    // Compute URL, then schedule (not immediate)
    this.urlOpener.scheduleOpen(ev.action.id, url);
}

async onWillDisappear(ev) {
    this.urlOpener.cleanup(ev.action.id);
}
```

**Key insight**: Extract the debounce class into a shared utility — every action with single-click/double-click behavior needs this exact pattern. Without extraction, you get 12+ copies of the same timer management code.

**Prevention**: Never call `openUrl()` synchronously in `onKeyDown` if double-click is a supported gesture. Always debounce.

---

### [Network] — fetchWithTimeout() Wrapper for All API Calls

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: critical

**Problem**: Raw `fetch()` calls have two dangerous failure modes: (1) no timeout — a stalled connection hangs indefinitely, blocking the action refresh; (2) no try-catch — network failures (`TypeError: fetch failed`) propagate as untyped errors with zero context about which API call failed.

**Solution**: Wrap all fetch calls with a timeout + error context helper:

```typescript
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    context?: string,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            throw new GitHubApiError(
                `Request timed out after 30s${context ? ` (${context})` : ""}`, 0);
        }
        throw new GitHubApiError(
            `Network error: ${err instanceof Error ? err.message : "unknown"}${context ? ` (${context})` : ""}`, 0);
    } finally {
        clearTimeout(timeoutId);
    }
}
```

**Key details**:
- Use `AbortController` + `AbortSignal` for timeout (Node 18+)
- `finally` block clears the timeout to prevent leaks on success
- `status: 0` convention distinguishes network errors from HTTP errors
- Context string (e.g., `"fetchRepoStats"`) makes error logs actionable
- Apply to EVERY fetch call in the codebase — no exceptions

**Prevention**: Never use bare `fetch()` in a Stream Deck plugin. Network hiccups are common (sleep/wake, Wi-Fi drops) and a single hung request blocks the entire action's polling cycle.

---

### [TypeScript] — Exhaustive Switch Checking with `never` Default

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: high

**Problem**: When a `switch` statement dispatches on a union type (e.g., `DataFragmentName` with 12 values), adding a new value to the union compiles fine — but the switch silently skips it. No runtime error, no compile error. The new fragment just doesn't work.

**Solution**: Add a `default` case that assigns to `never`:

```typescript
type DataFragmentName = "repoMetadata" | "prCount" | "issueCount" | ...;

switch (fragment) {
    case "repoMetadata": /* ... */ break;
    case "prCount": /* ... */ break;
    // ... all cases ...
    default: {
        const _exhaustiveCheck: never = fragment;
        throw new Error(`Unhandled fragment type: ${_exhaustiveCheck}`);
    }
}
```

If a new value is added to the union but not to the switch, TypeScript reports: `Type '"newFragment"' is not assignable to type 'never'`.

**When to use `default: break` instead**: If the switch intentionally handles only a subset (e.g., GraphQL extraction that skips REST-only fragments), use `default: break;` — NOT the `never` check.

**Prevention**: Every switch on a union type should have either `default: never` (exhaustive) or `default: break` with a comment explaining why some cases are intentionally skipped.

---

### [Resource Management] — Track All setTimeout IDs for Cleanup

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: high

**Problem**: Inline `setTimeout` calls (e.g., retry after API returns 202, post-dispatch refresh) create timers that fire even after the action disappears. If the callback references `this`, it operates on stale state. In long sessions, untracked timers accumulate.

**Solution**: Store every `setTimeout` ID in a Map and clear in `onWillDisappear`:

```typescript
private retryTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// When creating a timeout:
const id = setTimeout(() => {
    this.retryTimeouts.delete(actionId);
    this.doRetry(actionId);
}, 5000);
this.retryTimeouts.set(actionId, id);

// In onWillDisappear:
const timeout = this.retryTimeouts.get(ev.action.id);
if (timeout) {
    clearTimeout(timeout);
    this.retryTimeouts.delete(ev.action.id);
}
```

**Rule**: If you write `setTimeout()` inside an action class, you MUST store its ID and clear it on disappear. No exceptions — even for "short" timers (3-5 seconds).

---

### [Type Safety] — STAT_LABELS Compile-Time Exhaustiveness

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: medium

**Problem**: Two separate `STAT_LABELS` maps (one for key images, one for touch strip) must stay in sync with the `StatType` union. Adding a new stat type and forgetting to update either map causes a runtime fallback to the raw type string — no compile error.

**Solution**: Use `as const satisfies Record<StatType, string>`:

```typescript
export const STAT_LABELS = {
    stars: "Stars",
    issues: "Issues",
    forks: "Forks",
    // ...
} as const satisfies Record<StatType, string>;
```

If a new `StatType` value is added, TypeScript errors: `Property '"newStat"' is missing`.

**Prevention**: Any `Record` keyed by a union type should use `satisfies` to enforce completeness at compile time.

---

### [Observability] — Log Silent Catch Blocks in Fallback Chains

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: medium

**Problem**: GraphQL→REST fallback chains silently swallow errors (`catch {}`). When the fallback also fails, there's zero visibility into WHY GraphQL failed and WHY REST also failed. Production debugging is impossible.

**Solution**: Change bare `catch {}` to `catch (err)` and add debug logging:

```typescript
try {
    await this.fetchGraphQLBatch(repo, fragments, token);
} catch (err) {
    streamDeck.logger.debug(
        `GraphQL batch failed for ${repo}: ${err instanceof Error ? err.message : "unknown"}`
    );
    // Fall through to REST fallback
}
```

**Rule**: Never write `catch {}` or `catch { /* comment */ }`. At minimum, log the error at debug level with the operation context (repo, fragment name, etc.). Debug logs don't appear in production unless explicitly enabled, so there's no noise cost.

---

### [Input Validation] — Polling Interval Sanitization

**Discovered in**: github-utilities
**Date**: 2026-03-20
**Severity**: medium

**Problem**: User-configurable refresh intervals accept any number. `NaN`, `Infinity`, negative values, or extremely large numbers (e.g., 999999 seconds ≈ 11 days) break polling behavior.

**Solution**: Sanitize before use with min/max clamping + NaN/Infinity guard:

```typescript
const DEFAULT_MAX_INTERVAL_SEC = 3600; // 1 hour

start(actionId: string, callback: () => Promise<void>,
      intervalSec: number, minIntervalSec = 15,
      maxIntervalSec = DEFAULT_MAX_INTERVAL_SEC): void {
    const sanitized = Number.isFinite(intervalSec) && intervalSec > 0
        ? intervalSec
        : minIntervalSec;
    const clamped = Math.min(Math.max(sanitized, minIntervalSec), maxIntervalSec) * 1000;
    // Use clamped as the base interval
}
```

**Prevention**: Any numeric setting from the Property Inspector should be sanitized before use. `Number.isFinite()` catches both `NaN` and `±Infinity` in one check.
