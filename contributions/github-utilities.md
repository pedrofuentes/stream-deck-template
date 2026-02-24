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
