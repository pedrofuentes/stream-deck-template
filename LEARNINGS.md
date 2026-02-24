# Stream Deck Plugin — Learnings & Known Issues

This document captures every hard-won lesson, pitfall, and workaround discovered while building Stream Deck plugins across multiple projects. **Read this before writing any Stream Deck plugin code.**

> Sources: stream-deck-github-utilities, stream-deck-cloudflare-utilities, stream-deck-ical

---

## 1. SVG Rendering on Stream Deck Hardware

### The Encoding Problem (CRITICAL)

Stream Deck has a built-in SVG renderer for button images. There are multiple ways to encode SVGs for `setImage()`, but **only one works reliably on physical hardware**:

| Encoding Method | Works in Software? | Works on Device? | Notes |
|---|---|---|---|
| `data:image/svg+xml;charset=utf8,` + escaped SVG | ✅ | ❌ | NEVER renders on physical hardware |
| `data:image/svg+xml;base64,` + base64 | ✅ | ❌ | Also fails on device |
| `data:image/svg+xml,` + `encodeURIComponent(svg)` | ✅ | ✅ | **THE ONLY WORKING METHOD** |

**Always use:**
```typescript
ev.action.setImage("data:image/svg+xml," + encodeURIComponent(svg));
```

**Never use:**
```typescript
// These look like they work in the Stream Deck app but FAIL on physical hardware
ev.action.setImage("data:image/svg+xml;charset=utf8," + svg);
ev.action.setImage("data:image/svg+xml;base64," + btoa(svg));
```

Source: Discovered in stream-deck-cloudflare-utilities, confirmed in stream-deck-github-utilities.

### Nested `<svg>` Elements Don't Render

Stream Deck's SVG renderer does **not** support nested `<svg>` elements. If you try to embed an icon using:

```xml
<!-- ❌ DOES NOT WORK ON DEVICE -->
<svg x="52" y="40" width="40" height="40" viewBox="0 0 36 36">
  <path d="..."/>
</svg>
```

It will render as blank. Instead, use `<g>` with transform:

```xml
<!-- ✅ WORKS ON DEVICE -->
<g transform="translate(52,40) scale(1.1111)">
  <path d="..."/>
</g>
```

The scale factor converts between viewBox and target size: `targetSize / viewBoxSize` (e.g., `40/36 = 1.1111`).

### SVG Features That Work

| Feature | Status | Notes |
|---|---|---|
| `<rect>`, `<circle>`, `<path>` | ✅ | Basic shapes work |
| `<text>` with system fonts | ✅ | Arial, Helvetica, sans-serif |
| `<g>` with transforms | ✅ | translate, scale, rotate |
| `<animate>` | ✅ | Opacity pulses, etc. |
| `<animateTransform>` | ✅ | Rotation animations |
| Nested `<svg>` | ❌ | Use `<g transform>` instead |
| `<foreignObject>` | ❌ | Not supported |
| CSS `@keyframes` | ❌ | Use SVG animation elements |
| External fonts (`@font-face`) | ❌ | Use system fonts only |
| `<filter>` effects | ⚠️ | Some work, but unreliable |
| `clip-path` | ⚠️ | Basic clips work, complex fail |

### Canvas Size

- SVG viewport: **144×144** (always use this)
- Physical OLED pixels: **72×72**
- Stream Deck renders at 2x, so design at 144 and it'll look crisp at 72

### Accent Bar Pattern for Status Indication

*(Source: cloudflare-utilities)*

A 7px colored dot is barely visible on 72×72 OLED. Use a **6px full-width colored bar** across the top of the key instead:

```
┌════════════════════════┐  ← 6px colored accent bar (full width)
│    Worker Name (18px)  │  ← line 1: identifier, #9ca3af, centered
│      STATUS (30px)     │  ← line 2: main info, #ffffff, bold, centered
│    metadata (15px)     │  ← line 3: detail, #9ca3af, centered
└────────────────────────┘
```

```xml
<rect y="0" width="144" height="6" rx="3" fill="${statusColor}"/>
<text x="72" y="46" text-anchor="middle" fill="#9ca3af" font-size="18"
      font-family="Arial,Helvetica,sans-serif">${name}</text>
<text x="72" y="88" text-anchor="middle" fill="#ffffff" font-size="30"
      font-weight="bold" font-family="Arial,Helvetica,sans-serif">${value}</text>
<text x="72" y="124" text-anchor="middle" fill="#9ca3af" font-size="15"
      font-family="Arial,Helvetica,sans-serif">${detail}</text>
```

**Vertical positioning reference (144×144 canvas):**

| Lines | line1 Y | line2 Y | line3 Y |
|---|---|---|---|
| 3 lines | 46 | 88 | 124 |
| 2 lines (name + status) | 56 | 100 | — |
| 2 lines (status + detail) | — | 70 | 112 |
| 1 line | — | 86 | — |

### Centralized Key Image Renderer

*(Source: cloudflare-utilities)*

Never construct SVG strings directly in action files. Use a single centralized renderer:

```typescript
import { renderKeyImage, renderPlaceholderImage, STATUS_COLORS } from "../services/key-image-renderer";

await ev.action.setImage(renderKeyImage({
  line1: "my-worker",
  line2: "2h ago",
  line3: "wrangler",
  statusColor: STATUS_COLORS.green,
}));
```

### OLED-Tested Color Palette

*(Source: cloudflare-utilities)*

Hardware-tested palette — random colors often look washed out on OLED:

| Role | Hex | Usage |
|---|---|---|
| OK / Live | `#4ade80` | Healthy, deployed |
| Warning | `#fbbf24` | Degraded, minor issue |
| Error | `#f87171` | Down, failed |
| Recent / Active | `#60a5fa` | Recently changed |
| Gradual / Partial | `#fb923c` | Split traffic |
| Neutral | `#9ca3af` | Unknown, N/A |
| Background | `#0d1117` | Dark navy (OLED true black) |
| Primary text | `#ffffff` | High contrast |
| Secondary text | `#9ca3af` | Metadata, labels |

Export as `STATUS_COLORS` — never hardcode hex values in actions.

### Compact Number Formatting for Tiny Keys

*(Source: cloudflare-utilities)*

Numbers like "1,234,567" don't fit at 30px bold. Use aggressive abbreviation:

```typescript
export function formatCompactNumber(value: number): string {
  if (value < 1000) return Math.round(value).toString();
  if (value < 1_000_000) {
    const k = value / 1000;
    return k >= 100 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const m = value / 1_000_000;
  return m >= 100 ? `${Math.round(m)}M` : `${m.toFixed(1).replace(/\.0$/, "")}M`;
}
// 0→"0", 42→"42", 1234→"1.2K", 100000→"100K", 1234567→"1.2M"
```

### Circular Marquee for Long Names

*(Source: cloudflare-utilities)*

Names > 10 chars get truncated on 72×72 OLED. Use a framework-agnostic marquee state machine:

```typescript
const marquee = new MarqueeController(10); // 10-char visible window
marquee.setText("some-long-gateway-name");

if (marquee.needsAnimation()) {
  this.marqueeInterval = setInterval(() => {
    if (marquee.tick()) reRender(marquee.getCurrentText());
  }, 500);
}
```

Design decisions:
- Circular scroll (not bounce-back) — like a news ticker
- `"  •  "` separator (5 chars) between repetitions
- `MARQUEE_PAUSE_TICKS = 3` pause at loop start
- 10-char window tested on hardware at 18px font
- Marquee position preserved across metric cycling but resets on resource change

---

## 2. Manifest.json Gotchas

### Image Path Rules
- **Omit file extensions** in all image paths: `"imgs/plugin-icon"` not `"imgs/plugin-icon.png"`
- The SDK resolves `.png` files and will prefer `@2x.png` variants automatically
- All icons **must be PNG** for packaging — SVG icons will fail `streamdeck validate`

### Required Icon Sizes
| Icon | Size | @2x Size | Purpose |
|---|---|---|---|
| Plugin Icon | 144×144 | 288×288 | Plugin list in Stream Deck app |
| Category Icon | 144×144 | 288×288 | Category header |
| Action Icon | 20×20 | 40×40 | Action list sidebar |
| Key Image | 144×144 | 288×288 | Default button appearance |

### Action Icons Must Be Monochrome White

*(Source: cloudflare-utilities)*

- Action list icons: **Monochromatic white** on **transparent background**, SVG 20×20 viewBox
- Plugin/marketplace icons: **PNG only** (not SVG), 144×144 + 288×288 @2x
- No colored fills, no solid backgrounds in action icons — Stream Deck auto-adjusts for light/dark themes

### Title & UserTitleEnabled Placement (CRITICAL)

- `"ShowTitle": false` goes **inside** `States` entries to hide the default title overlay
- `"UserTitleEnabled": false` goes at the **Action level** (sibling of `States`), NOT inside `States`
- Placing `UserTitleEnabled` inside `States` is **silently ignored** — user title will overlay your SVG

```json
{
  "Name": "My Action",
  "States": [
    { "Image": "imgs/actions/my-action", "ShowTitle": false }
  ],
  "UserTitleEnabled": false,
  "UUID": "com.example.my-plugin.my-action"
}
```

The `$schema` URL is: `https://schemas.elgato.com/streamdeck/plugins/manifest.json`

### Version Format
- Manifest uses **4-part** version: `"1.0.0.0"`
- package.json uses **3-part** semver: `"1.0.0"`
- Keep them in sync (manifest adds trailing `.0`)

### VisibleInActionsList

*(Source: ical)*

Internal/utility actions that shouldn't appear in the user's action picker:

```json
{
  "UUID": "com.example.internal-action",
  "Name": "Internal Only",
  "VisibleInActionsList": false,
  "States": [{ "Image": "imgs/internal" }]
}
```

---

## 3. Property Inspector (PI) Patterns

### Token/Credentials Handling
When using global settings (shared across all actions), there's a **race condition** on first load:

**Problem**: When a user reopens the PI, `getGlobalSettings` may not have the token yet, causing dropdowns to fail to load.

**Solution**: Implement a 3-layer fallback:
1. `didReceiveGlobalSettings` event handler (primary)
2. Explicit `getGlobalSettings` request 200ms after WebSocket connection
3. `onDidReceiveSettings` as final fallback

```javascript
// In PI HTML - request global settings explicitly after connection
$SD.on("connected", () => {
    setTimeout(() => {
        $SD.getGlobalSettings();
    }, 200);
});
```

### Datasource Dropdowns (`sdpi-components`)
- Use `datasource="eventName"` on `<sdpi-select>` for dynamic dropdowns
- The `show-refresh` attribute adds a refresh button
- `_refreshDropdowns()` is available from popup windows via `window.opener`
- Cascading: when repo changes, re-fetch workflows/branches/environments

### Popup Window Communication
Setup/settings popups communicate with the PI via:
```javascript
// From popup → PI websocket
window.opener._sdWebSocket.send(JSON.stringify({...}));
```

This is because the popup window doesn't have its own Stream Deck connection.

### Setup Window Popup Pattern

*(Source: cloudflare-utilities)*

Shared `setup.html` opened as a popup from any action's PI avoids duplicating credential fields:

```javascript
// In the action's PI — expose WebSocket for popup
window.websocket = websocket;
window.piUUID = uuid;
setupPopup = window.open("setup.html", "Settings", "width=500,height=350");

// In setup.html (popup) — use parent's WebSocket
function getWebSocket() { return window.opener && window.opener.websocket; }
ws.send(JSON.stringify({ event: "setGlobalSettings", context: getPiUUID(), payload: settings }));
```

**Pitfall**: The popup has no WebSocket of its own — it **must** use `window.opener.websocket`. If the parent PI closes, the popup loses connectivity.

### `ensureOption` Pattern for Dropdown Hydration

*(Source: cloudflare-utilities)*

When a dropdown has a saved value but the API hasn't returned options yet, inject a temporary option:

```javascript
function ensureOption(selectId, value) {
  if (!value) return;
  var sel = document.getElementById(selectId);
  if (!sel.querySelector('option[value="' + CSS.escape(value) + '"]')) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    sel.appendChild(opt);
    sel.value = value;
  }
}
```

### Auto-Save with Debounced API Calls

*(Source: cloudflare-utilities)*

Save settings immediately (so they persist) but debounce API-dependent actions:

```javascript
document.getElementById("apiToken").addEventListener("input", function () {
  saveGlobalSettings(); // persist immediately
  clearTimeout(tokenDebounceTimer);
  if (this.value.trim().length > 10) {
    tokenDebounceTimer = setTimeout(() => loadAccounts(), 800); // debounce API call
  }
});
```

### SDPI Checkbox HTML Structure

*(Source: ical)*

Checkboxes require a very specific HTML structure for SDPI styling:

```html
<!-- ✅ CORRECT -->
<div class="sdpi-item" type="checkbox">
  <div class="sdpi-item-label">Exclude All-Day</div>
  <div class="sdpi-item-value">
    <input type="checkbox" id="excludeAllDay" checked>
    <label for="excludeAllDay"><span></span>Hide all-day events</label>
  </div>
</div>
```

Key requirements:
- `type="checkbox"` on the parent `sdpi-item` div
- Wrap input in `sdpi-item-value` div
- Include `<label>` with `<span></span>` inside (for the custom checkbox rendering)
- `for` attribute must match `id`

### FilterableSelect for Searchable PI Dropdowns

*(Source: github-utilities)*

When a dropdown has many options (repos, workflows, branches), the standard `<sdpi-select datasource>` becomes unusable. Replace with a reusable `FilterableSelect` combobox:

```javascript
// filterable-select.js — reusable custom combobox component
class FilterableSelect {
  constructor(containerId, options = {}) {
    this.searchThreshold = options.searchThreshold ?? 8; // show search when items > threshold
    this._buildDOM(containerId);
    this._bindEvents();
  }
}
```

Key features:
- **Search input** auto-shown when selectable items exceed threshold (default: 8)
- **Keyboard navigation**: Arrow keys, Enter to select, Escape to close
- **ARIA attributes** for accessibility (`role="combobox"`, `aria-expanded`, etc.)
- **Portalled to `<body>`** — avoids `sdpi-item` shadow DOM clipping that traps dropdowns
- **Uses `sdpi-datasource` CustomEvents** for decoupled data arrival (same events as native `<sdpi-select>`)
- **Captures `actionInfo`** in WebSocket connection interceptor for settings persistence
- **Static dropdowns unchanged** — only use FilterableSelect for dynamic/API-populated dropdowns

### Custom Event for PI Settings Availability

*(Source: github-utilities)*

Custom PI components (like FilterableSelect) whose constructors run **before** `connectElgatoStreamDeckSocket` has loaded settings will find `_actionSettings` empty. The standard 3-layer token fallback doesn't help here because it fires too late for component initialization.

**Solution**: Dispatch a custom event after settings are populated:

```javascript
// In the PI connection handler — after settings arrive
function onConnected(actionInfo) {
  _actionSettings = actionInfo.payload.settings;
  document.dispatchEvent(new CustomEvent("sdpi-settings-loaded", {
    detail: { settings: _actionSettings }
  }));
}

// In FilterableSelect — listen for the custom event
document.addEventListener("sdpi-settings-loaded", (e) => {
  this._loadInitialValue(e.detail.settings);
});
```

Also handle `didReceiveSettings` WebSocket events for live settings sync when multiple PI instances or key-press cycling update the same settings.

### Viewport-Aware Dropdown Positioning

*(Source: github-utilities)*

The PI viewport is very small (~300px tall). Custom dropdowns that open downward can overflow off-screen. Measure available space and flip when necessary:

```javascript
_openDropdown() {
  const triggerRect = this._trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;

  if (spaceBelow < 120 && spaceAbove > spaceBelow) {
    // Flip upward: use column-reverse so list appears above trigger
    this._container.style.flexDirection = "column-reverse";
    this._list.style.maxHeight = `${Math.min(spaceAbove - 10, 250)}px`;
  } else {
    this._container.style.flexDirection = "column";
    this._list.style.maxHeight = `${Math.min(spaceBelow - 10, 250)}px`;
  }
}

_closeDropdown() {
  // Reset dynamic sizing for clean re-measurement on next open
  this._container.style.flexDirection = "";
  this._list.style.maxHeight = "";
}
```

**Key rule**: 120px minimum usable height threshold — don't show a tiny unusable dropdown.

### WebSocket Send Interceptor for Mixed PI Components (CRITICAL)

*(Source: github-utilities v1.3.3)*

When a PI uses both `sdpi-components` (for static dropdowns) and custom components like `FilterableSelect` (for dynamic dropdowns), `sdpi-components` sends `setSettings` with **only its own fields**, silently overwriting settings from custom components.

**Solution**: Intercept `WebSocket.send()` and merge all settings into every outgoing `setSettings`:

```javascript
(function() {
    const NativeWS = window.WebSocket;
    let _lastSendTime = 0;
    const ECHO_WINDOW_MS = 500;
    window.WebSocket = new Proxy(NativeWS, {
        construct(target, args) {
            const ws = new target(...args);
            window._sdWebSocket = ws;
            const _origSend = ws.send.bind(ws);
            ws.send = function(data) {
                try {
                    const msg = JSON.parse(data);
                    if (msg.event === "setSettings" && window._actionSettings) {
                        msg.payload = Object.assign({}, window._actionSettings, msg.payload);
                        window._actionSettings = msg.payload;
                        _lastSendTime = Date.now();
                        return _origSend(JSON.stringify(msg));
                    }
                } catch(e) {}
                return _origSend(data);
            };
            ws.addEventListener("message", function(evt) {
                try {
                    const data = JSON.parse(evt.data);
                    if (data.event === "didReceiveSettings") {
                        // Suppress echoes — stale data can overwrite pending changes
                        const isEcho = (Date.now() - _lastSendTime) < ECHO_WINDOW_MS;
                        if (!isEcho) {
                            window._actionSettings = data.payload?.settings || {};
                        }
                        window.dispatchEvent(new CustomEvent('sdpi-settings-loaded', {
                            detail: { settings: data.payload?.settings || {} }
                        }));
                    }
                } catch(e) {}
            });
            return ws;
        }
    });
})();
```

**Critical rules**:
- The Proxy **must** be set up BEFORE `sdpi-components.js` loads (it creates the WebSocket)
- `Object.assign({}, _actionSettings, msg.payload)` — cached settings as base, incoming payload wins for its fields
- Echo suppression (500ms window) is **mandatory** — without it, stale `didReceiveSettings` echoes overwrite `_actionSettings` during sdpi-components' 250ms debounce, reverting the user's dropdown change
- The `sdpi-settings-loaded` event must still fire for echoes (so FilterableSelect stays in sync), even though `_actionSettings` isn't updated

### PI-Side Default Injection (Avoid Plugin Echo Races)

*(Source: github-utilities v1.3.3)*

When the plugin detects missing defaults and calls `setSettings()` to persist them, the resulting echo races with `sdpi-components`' debounce. **Inject defaults in the PI send interceptor instead**:

```javascript
// Inside the send interceptor:
if (msg.payload.repo && !msg.payload.statType) {
    msg.payload.statType = "stars";  // inject default before sending
}
```

**Rule**: The plugin may apply defaults in-memory (safety fallback) but must **never call `setSettings()` to persist defaults**. Any plugin-initiated `setSettings` creates an echo that races with the user's next PI interaction.

---

## 4. Action Implementation Patterns

### SingletonAction Per-Button State (CRITICAL)

*(Source: ical)*

`SingletonAction` means ONE class instance handles ALL buttons of that action type. **Never store state on `this` directly** — multiple buttons overwrite each other:

```typescript
// ❌ WRONG - shared state breaks with multiple buttons
class MyAction extends SingletonAction {
  private interval?: NodeJS.Timeout; // Second button overwrites first!
}

// ✅ CORRECT - per-button state via Map
interface ButtonState {
  interval?: NodeJS.Timeout;
  actionRef?: Action;
  cacheVersion: number;
}

class MyAction extends SingletonAction {
  private buttonStates: Map<string, ButtonState> = new Map();

  onWillAppear(ev: WillAppearEvent) {
    this.buttonStates.set(ev.action.id, {
      interval: undefined,
      actionRef: ev.action,
      cacheVersion: 0,
    });
    this.startTimerForButton(ev.action.id, ev.action);
  }

  onWillDisappear(ev: WillDisappearEvent) {
    const state = this.buttonStates.get(ev.action.id);
    if (state?.interval) clearInterval(state.interval);
    this.buttonStates.delete(ev.action.id);
  }
}
```

### Action Key Events Require Explicit Override (CRITICAL)

*(Source: ical)*

The Stream Deck SDK does **NOT** route key events through inherited methods. Every action class **must** explicitly override `onKeyUp()`:

```typescript
// ❌ FAILS - key events not detected in derived class
class MyAction extends BaseAction {
  // No onKeyUp override - pressing button does NOTHING!
}

// ✅ WORKS - explicit override required
class MyAction extends BaseAction {
  async onKeyUp(ev: KeyUpEvent<any>): Promise<void> {
    await super.onKeyUp(ev);
  }
}
```

### Action Registration Must Precede connect()

*(Source: ical)*

Actions registered **after** `streamDeck.connect()` are not recognized:

```typescript
// ❌ WRONG — actions won't work
streamDeck.connect();
streamDeck.actions.registerAction(new MyAction());

// ✅ CORRECT
streamDeck.actions.registerAction(new MyAction());
streamDeck.connect(); // Must come AFTER registration
```

### Polling Actions
```typescript
// Store timers keyed by action.id for multi-instance support
private timers = new Map<string, Timer>();

onWillAppear(ev) {
    this.refresh(ev); // immediate fetch
    const interval = settings.refreshInterval ?? 300;
    this.timers.set(ev.action.id, setInterval(() => this.refresh(ev), interval * 1000));
}

onWillDisappear(ev) {
    const timer = this.timers.get(ev.action.id);
    if (timer) clearInterval(timer);
    this.timers.delete(ev.action.id);
}
```

### Adaptive Polling Based on State

*(Source: cloudflare-utilities)*

Fixed polling is either too slow for active changes or wastes API calls for stable states:

```typescript
getPollingInterval(state: StatusState | null, baseSeconds: number): number {
  switch (state) {
    case "recent":
    case "gradual":  return 10_000;   // fast poll — user wants live feedback
    case "error":    return 30_000;   // error back-off
    default:         return baseSeconds * 1000; // user-configured for stable state
  }
}
```

### Generation Counter to Prevent Stale Timer Callbacks (CRITICAL)

*(Source: cloudflare-utilities)*

When settings change or the user cycles metrics, old `setTimeout` callbacks still in-flight fire and overwrite the display with stale data:

```typescript
private refreshGeneration = 0;

private async fetchAndSchedule(ev): Promise<void> {
  this.clearRefreshTimeout();
  const gen = ++this.refreshGeneration;

  await this.updateMetrics(ev, gen);

  if (this.refreshGeneration !== gen) return; // newer cycle started
  this.scheduleRefresh(ev);
}
```

Every entry point that triggers a fetch increments the generation. Timer callbacks check the generation **before and after** every `await`.

### Settings Interface Requirements
Settings types **must** have a `JsonValue` index signature:
```typescript
import type { JsonValue } from "@elgato/utils";

export interface MySettings {
    repo?: string;
    refreshInterval?: number;
    [key: string]: JsonValue; // REQUIRED — SDK enforces this
}
```

### Boolean Defaults for Backwards Compatibility

*(Source: ical)*

When adding new boolean settings, existing users have `undefined`. Handle explicitly:

```typescript
// ❌ WRONG - undefined becomes false, may change default behavior
const excludeAllDay = Boolean(settings.excludeAllDay);

// ✅ CORRECT - undefined = true (default on), explicit false = false
const excludeAllDay = settings.excludeAllDay === undefined ? true : Boolean(settings.excludeAllDay);
```

### Button State Management
Always clear the title when using SVG images:
```typescript
await ev.action.setImage(renderMyImage(...));
await ev.action.setTitle(""); // Clear default title overlay
```

### Error Handling Order
1. Check if settings are configured → show unconfigured state
2. Check for global token → show "Setup Required" error
3. Try API call → show loading state, then result or error
4. On error, show specific message: "Auth Error", "Not Found", "Rate Limited", etc.

### Rate Limit Handling with Server-Hinted Backoff

*(Source: cloudflare-utilities)*

```typescript
export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(endpoint: string, retryAfter?: number) {
    const delay = retryAfter ?? 60;
    super(`Rate limited on ${endpoint} (retry after ${delay}s)`);
    this.retryAfterSeconds = delay;
  }
}

// In API client:
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get("Retry-After") ?? "", 10);
  throw new RateLimitError("endpoint", isNaN(retryAfter) ? undefined : retryAfter);
}
```

**Key rule**: Never show "ERR" if you have cached data. Keep displaying the last good value and retry with backoff.

### Key-Press Cycling Without API Refetch

*(Source: cloudflare-utilities)*

Calling the API on every key press is slow and triggers rate limits. Render from cache on key press; use a flag to suppress the settings echo from `setSettings()`:

```typescript
private pendingKeyCycle = false;

override async onKeyDown(ev): Promise<void> {
  this.displayMetric = nextMetric;
  if (this.lastMetrics) await ev.action.setImage(this.renderMetric(...));

  this.pendingKeyCycle = true;
  await ev.action.setSettings({ ...settings, metric: nextMetric });
}

override async onDidReceiveSettings(ev): Promise<void> {
  if (this.pendingKeyCycle) {
    this.pendingKeyCycle = false;
    this.scheduleRefresh(ev); // just reschedule, don't re-render
    return;
  }
  // ... normal settings change flow
}
```

### Cached Settings + recentSetSettings Guard for Multi-Button Cycling

*(Source: github-utilities v1.3.3)*

The `pendingKeyCycle` boolean flag (above) works for single-button actions but breaks when multiple buttons exist — one button's flag can mask another's state. Also, `ev.payload.settings` in `onKeyUp` can contain stale/partial data when `sdpi-components` sent a partial `setSettings`.

**Solution**: Use a `Map<string, Settings>` cache as source of truth, and a `Set<string>` guard instead of a boolean:

```typescript
private actionSettings = new Map<string, MySettings>();
private recentSetSettings = new Set<string>();

override async onKeyUp(ev: KeyUpEvent<MySettings>): Promise<void> {
  // Prefer cached settings — event payload may be stale
  const cached = this.actionSettings.get(ev.action.id);
  const currentType = cached?.statType ?? ev.payload.settings.statType ?? "stars";
  const nextType = STAT_TYPES[(STAT_TYPES.indexOf(currentType) + 1) % STAT_TYPES.length];

  const newSettings = { ...ev.payload.settings, ...cached, statType: nextType };
  this.recentSetSettings.add(ev.action.id);   // guard
  await ev.action.setSettings(newSettings);
  this.actionSettings.set(ev.action.id, newSettings);
  await this.refreshDisplay(ev.action.id);
}

override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MySettings>): Promise<void> {
  if (this.recentSetSettings.delete(ev.action.id)) {
    this.actionSettings.set(ev.action.id, ev.payload.settings);
    return; // Skip redundant refresh — already handled in onKeyUp
  }
  // Merge incoming with cached to protect against partial updates
  const cached = this.actionSettings.get(ev.action.id);
  const settings = { ...cached, ...ev.payload.settings };
  this.actionSettings.set(ev.action.id, settings);
  await this.refreshDisplay(ev.action.id);
}
```

**Key advantages over boolean flag**:
- `Set<string>` supports multiple concurrent buttons (keyed by action ID)
- `Set.delete()` returns boolean — clean one-shot guard pattern
- Merge `{ ...cached, ...incoming }` protects against partial `setSettings` from PI

### Real-Time Seconds Display

*(Source: cloudflare-utilities)*

A separate 1-second display interval that re-renders from cached data for live-ticking "45s ago" → "46s ago":

```typescript
private startDisplayRefresh(): void {
  if (!this.isShowingSeconds()) return;
  this.displayInterval = setInterval(async () => {
    await this.actionRef.setImage(this.renderStatus(...));
    if (!this.isShowingSeconds()) this.clearDisplayInterval(); // self-terminate at "1m"
  }, 1000);
}
```

Purely cosmetic — re-renders from cache, no API calls. Self-terminates when no longer needed.

### Short Press / Long Press Detection

*(Source: github-utilities)*

Use `onKeyDown` to record timestamp and `onKeyUp` to measure press duration. This enables dual-purpose keys without additional UI:

```typescript
const LONG_PRESS_THRESHOLD_MS = 500;
private keyDownTime: Map<string, number> = new Map();

override async onKeyDown(ev: KeyDownEvent<MySettings>): Promise<void> {
  this.keyDownTime.set(ev.action.id, Date.now());
}

override async onKeyUp(ev: KeyUpEvent<MySettings>): Promise<void> {
  const downTime = this.keyDownTime.get(ev.action.id) ?? Date.now();
  const pressDuration = Date.now() - downTime;
  this.keyDownTime.delete(ev.action.id);

  if (pressDuration >= LONG_PRESS_THRESHOLD_MS) {
    // Long press — open URL in browser
    await ev.action.openUrl(settings.url);
  } else {
    // Short press — cycle through stat types
    const nextIndex = (currentIndex + 1) % STAT_TYPES.length;
    await this.renderStat(ev, STAT_TYPES[nextIndex]);
  }
}
```

Use `openUrl()` from the SDK for browser navigation. Define `STAT_TYPES` as an ordered constant array for cycling. Store `keyDownTime` in a `Map<string, number>` keyed by `action.id` for multi-button support.

### PollingCoordinator for Shared Polling Logic

*(Source: cloudflare-utilities)*

When multiple actions all implement polling with backoff, extract the logic into a reusable coordinator instead of duplicating it in each action:

```typescript
class PollingCoordinator {
  private timers: Map<string, Timer> = new Map();
  private errorCounts: Map<string, number> = new Map();

  start(actionId: string, callback: () => Promise<void>, intervalMs: number): void {
    this.stop(actionId);
    this.timers.set(actionId, setInterval(async () => {
      try {
        await callback();
        this.errorCounts.set(actionId, 0); // reset on success
      } catch {
        const count = (this.errorCounts.get(actionId) ?? 0) + 1;
        this.errorCounts.set(actionId, count);
        // exponential backoff: 2^count * base, capped
      }
    }, intervalMs));
  }

  stop(actionId: string): void {
    const timer = this.timers.get(actionId);
    if (timer) clearInterval(timer);
    this.timers.delete(actionId);
    this.errorCounts.delete(actionId);
  }
}
```

### Error Backoff Reset on Key Press

*(Source: cloudflare-utilities)*

When using exponential backoff on consecutive API errors, a key press should reset the backoff counter for immediate manual retry:

```typescript
override async onKeyDown(ev): Promise<void> {
  this.pollingCoordinator.resetBackoff(ev.action.id);
  await this.fetchAndRender(ev); // immediate retry
}
```

Without this, after several errors, the user would have to wait minutes for the next automatic retry even though they've pressed the key to manually refresh.

### Thorough Cleanup on Disappear (CRITICAL)

*(Source: cloudflare-utilities)*

`onWillDisappear` must clear **everything** — leaked timers, listeners, and API clients cause issues on profile switch, plugin restart, or key removal:

```typescript
override onWillDisappear(): void {
  this.clearRefreshTimeout();
  this.stopMarqueeTimer();
  this.clearDisplayInterval();
  this.apiClient = null;
  this.lastMetrics = null;
  this.pendingKeyCycle = false;
  if (this.unsubscribeGlobal) { this.unsubscribeGlobal(); this.unsubscribeGlobal = null; }
}
```

---

## 5. Architecture Patterns

### Global Settings Pub/Sub for Shared Credentials

*(Source: cloudflare-utilities)*

Multiple actions sharing the same API credentials should use an in-memory store with pub/sub, synced to SD global settings:

```typescript
// global-settings-store.ts — no SD dependency, easily testable
let current: GlobalSettings = {};
const listeners: Listener[] = [];

export function getGlobalSettings(): GlobalSettings { return { ...current }; }

export function updateGlobalSettings(settings: GlobalSettings): void {
  current = { ...settings };
  for (const fn of listeners) fn(current);
}

export function onGlobalSettingsChanged(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
```

Plugin entry wiring:
```typescript
streamDeck.settings.getGlobalSettings<GlobalSettings>().then((s) => updateGlobalSettings(s ?? {}));
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => updateGlobalSettings(ev.settings ?? {}));
```

### Global Settings vs Per-Action Settings

*(Source: ical)*

| Type | PI Call | Plugin Event | Use Case |
|---|---|---|---|
| Global | `$SD.setGlobalSettings()` | `onDidReceiveGlobalSettings` | API tokens, shared config |
| Per-Action | `$SD.setSettings()` | `onDidReceiveSettings` | Button-specific options |

### Service Layer With No SDK Dependencies

*(Source: cloudflare-utilities)*

Services should be plain TypeScript classes with zero `@elgato/streamdeck` imports:

```typescript
constructor(apiToken: string, accountId: string, baseUrl?: string) {
  this.apiToken = apiToken;
  this.baseUrl = baseUrl ?? CLOUDFLARE_API_BASE; // injectable for tests
}
```

Testing requires only `vi.stubGlobal("fetch", mockFetch)` — no SD mocking needed.

### Shared Resource Manager with Reference Counting

*(Source: ical)*

When multiple buttons use the same external resource, avoid duplicate fetches with reference counting:

```typescript
class ResourceManager {
  private resources: Map<string, { data: any; refCount: number; interval?: Timer }> = new Map();
  private actionToResource: Map<string, string> = new Map();

  register(actionId: string, resourceId: string): void {
    let resource = this.resources.get(resourceId);
    if (!resource) {
      resource = { data: null, refCount: 0, interval: setInterval(...) };
      this.resources.set(resourceId, resource);
    }
    resource.refCount++;
    this.actionToResource.set(actionId, resourceId);
  }

  unregister(actionId: string): void {
    const resourceId = this.actionToResource.get(actionId);
    if (!resourceId) return;
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.refCount--;
      if (resource.refCount <= 0) {
        clearInterval(resource.interval);
        this.resources.delete(resourceId);
      }
    }
    this.actionToResource.delete(actionId);
  }
}
```

### Startup Race Condition: Wait for Cache

*(Source: ical)*

On `onWillAppear`, the cache may not be ready yet. Implement a polling wait with timeout:

```typescript
private waitForCacheAndStart(actionId: string): void {
  const state = this.buttonStates.get(actionId);
  if (!state) return;

  const checkCache = () => {
    const status = this.getCacheStatus(actionId);
    if (status !== 'LOADING' && status !== 'INIT') {
      clearInterval(state.waitingForCacheInterval);
      state.waitingForCacheInterval = undefined;
      this.startTimerForButton(actionId);
      return;
    }
    this.updateButton(actionId); // still loading — update display
  };

  state.waitingForCacheInterval = setInterval(checkCache, 500);
  checkCache(); // Immediate first check
}
```

### Plugin Source / Release Directory Separation

*(Source: cloudflare-utilities)*

Separate hand-authored source assets from build output for cleaner project structure:

```
plugin/               # hand-authored assets (committed to git)
├── manifest.json
├── imgs/
├── ui/               # PI HTML files
└── .sdignore

release/              # build output (gitignored)
└── com.example.my-plugin.sdPlugin/
    ├── manifest.json # copied from plugin/
    ├── imgs/         # copied from plugin/
    ├── ui/           # copied from plugin/
    └── bin/          # compiled JS from Rollup
```

Rollup builds to `release/<plugin-id>.sdPlugin/` and a post-build step copies `plugin/` assets alongside the compiled JS. This prevents build artifacts from mixing with source files and keeps the git history clean.

### Third-Party Status API Workarounds

*(Source: cloudflare-utilities)*

When querying third-party status pages, the direct domain (e.g., `cloudflarestatus.com`) may be behind CloudFront WAF that blocks automated requests with 403. Use the statuspage.io API endpoint instead:

```typescript
// ❌ Returns 403 from CloudFront WAF
const BAD_URL = "https://www.cloudflarestatus.com/api/v2/summary.json";

// ✅ Same data, no WAF blocking
const GOOD_URL = "https://yh6f0r4529hb.statuspage.io/api/v2/summary.json";
```

This applies to any service using Atlassian Statuspage — look for the `<page-id>.statuspage.io` endpoint.

---

## 6. Testing Patterns

### Mocking the Stream Deck SDK
```typescript
const mocks = vi.hoisted(() => ({
    setImage: vi.fn(),
    setTitle: vi.fn(),
    getGlobalSettings: vi.fn().mockResolvedValue({ githubToken: "ghp_test" }),
    // ... other mocks
}));

vi.mock("@elgato/streamdeck", () => ({
    default: {
        settings: { getGlobalSettings: mocks.getGlobalSettings },
        actions: { registerAction: vi.fn() },
    },
}));
```

### SVG Assertion Helpers
```typescript
function decodeSvg(encoded: string): string {
    return decodeURIComponent(encoded.replace("data:image/svg+xml,", ""));
}
function lastImage(): string {
    const calls = mocks.setImage.mock.calls;
    return decodeSvg(calls[calls.length - 1][0]);
}
```

### What to Test
- **Happy path**: correct data renders correctly
- **Error states**: 401, 403, 404, network failure
- **Edge cases**: empty strings, undefined settings, boundary values (min/max intervals)
- **Timer management**: cleanup on disappear, reset on settings change
- **Unconfigured state**: missing repo, missing token
- **HTTP status codes**: test 400, 401, 403, 404, 429, 500, 502, 503 + network failure + JSON parse failure
- **Mixed parallel results**: `Promise.all` with some calls succeeding and others failing

### Reset Functions for Singleton Stores

*(Source: cloudflare-utilities)*

Global settings store is a module-level singleton — state leaks between tests. Export a reset function:

```typescript
// In global-settings-store.ts
export function resetGlobalSettingsStore(): void {
  current = {};
  listeners.length = 0;
}

// In tests
beforeEach(() => {
  resetGlobalSettingsStore();
});
```

### Organizing Test Fixtures by Provider

*(Source: ical)*

When working with external data formats, organize fixtures by data source:

```
__fixtures__/
├── google-calendar/
│   ├── simple-event.ics
│   └── recurring-weekly.ics
├── outlook/
│   └── windows-timezones.ics
└── apple/
    └── apple-webcal.ics
```

---

## 7. Build & Release Pipeline

### Package.json Scripts (Complete Set)
```json
{
    "build": "rollup -c",
    "watch": "rollup -c -w --watch.onEnd=\"streamdeck restart __PLUGIN_ID__\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "validate": "streamdeck validate __PLUGIN_ID__.sdPlugin",
    "pack": "npm run build && npm run test && streamdeck pack __PLUGIN_ID__.sdPlugin --output release/",
    "prepack": "npm run validate",
    "streamdeck:link": "streamdeck link __PLUGIN_ID__.sdPlugin",
    "streamdeck:unlink": "streamdeck unlink __PLUGIN_ID__.sdPlugin",
    "streamdeck:restart": "streamdeck restart __PLUGIN_ID__",
    "streamdeck:stop": "streamdeck stop __PLUGIN_ID__",
    "streamdeck:validate": "streamdeck validate __PLUGIN_ID__.sdPlugin",
    "streamdeck:pack": "npm run build && streamdeck pack __PLUGIN_ID__.sdPlugin --output release/",
    "streamdeck:dev": "streamdeck dev",
    "streamdeck:dev:disable": "streamdeck dev --disable"
}
```

### Release Checklist
1. **Documentation & PI Verification** (see below) — verify PI HTML matches source code
2. `npm run validate:consistency` — plugin consistency checks pass (if available)
3. `npm test` — all tests pass
4. `npm run build` — builds successfully
5. `npm run validate` — manifest validates (0 errors)
6. `streamdeck pack __PLUGIN_ID__.sdPlugin --output release/` — creates `.streamDeckPlugin`
7. **User tests on physical device** — wait for explicit confirmation
8. `gh release create v1.0.0 release/*.streamDeckPlugin --title "v1.0.0 - Title" --notes "..."` — GitHub release
9. **Update ROADMAP.md** — mark the new version as shipped (mandatory post-release step)
10. **Update Elgato Marketplace Content** — see "Elgato Marketplace Content Pipeline" section below

### Documentation & PI Verification Pre-Release Gate

*(Source: github-utilities)*

Before every release, verify that PI HTML files match the actual source code. This catches dropdown options that were added in code but not in the PI, or help text that became stale:

**8-item checklist:**
1. PI dropdown options match TypeScript type definitions (enum values, constant arrays)
2. PI help text accurately describes current behavior
3. PI labels match code constants and terminology
4. README documents all features and options
5. `setup.html` has correct guidance (e.g., token scopes, permissions)
6. Manifest tooltips are accurate for all actions
7. JSDoc comments match implementation
8. PI default values match code defaults

### Plugin Consistency Validator Script

*(Source: cloudflare-utilities)*

A custom `validate:consistency` script with 11 checks that runs in the `prepack` pipeline:

```json
{
  "validate:consistency": "tsx scripts/validate-consistency.ts",
  "prepack": "npm run validate && npm run validate:consistency"
}
```

The 11 checks:
1. Manifest parses without errors
2. Every source file in `src/actions/` has a corresponding manifest entry
3. Every action in manifest has a `registerAction()` call in `plugin.ts`
4. `ShowTitle: false` is set in States where SVG rendering is used
5. `UserTitleEnabled: false` is at the action level (not inside States)
6. Every action in manifest has a corresponding PI HTML file
7. Required icon files exist for each action
8. State images exist for multi-state actions
9. Every action has a corresponding test file
10. README mentions every action
11. `package.json` and manifest versions are in sync

### .streamDeckPlugin Build Artifact

*(Source: github-utilities)*

The `.streamDeckPlugin` file is a build artifact — do **not** commit it to the repository. Add to `.gitignore`:

```gitignore
*.streamDeckPlugin
release/
```

### Post-Release: Update Roadmap (Mandatory)

*(Source: cloudflare-utilities)*

After every release, update `ROADMAP.md` to mark the version as shipped. This is a mandatory step that must not be skipped — it keeps the roadmap accurate and helps track feature delivery over time.

### Icon Conversion
Icons in the manifest must be **PNG, not SVG**. If you design SVGs, convert them before packaging:
```javascript
// Using sharp (install as devDependency, then remove)
const sharp = require('sharp');
sharp(fs.readFileSync('icon.svg')).resize(144, 144).png().toFile('icon.png');
sharp(fs.readFileSync('icon.svg')).resize(288, 288).png().toFile('icon@2x.png');
```

### Build-Time Debug Mode with Rollup

*(Source: ical)*

Runtime environment variables don't work in bundled Stream Deck plugins. Use compile-time replacement:

```javascript
// rollup.config.js
import replace from '@rollup/plugin-replace';

export default {
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.STREAMDECK_DEBUG': JSON.stringify(process.env.STREAMDECK_DEBUG || '0')
      }
    })
  ]
};
```

```powershell
# Build with debug ON
$env:STREAMDECK_DEBUG = "1"; npm run build

# Build for production (debug OFF)
$env:STREAMDECK_DEBUG = "0"; npm run build
```

---

## 8. Elgato Marketplace Content Pipeline

*(Source: cloudflare-utilities)*

Every Stream Deck plugin published to the Elgato Marketplace needs a structured content pipeline. The Elgato Marketplace developer portal uses a **WYSIWYG editor** — markdown doesn't paste correctly. This section describes the content system that solves this.

### Content Directory Structure

```
content/
├── CONTENT-GUIDE.md          # Agent instructions for marketplace content
├── SETUP-PROMPT.md           # One-shot prompt to bootstrap the content/ folder for a new plugin
├── description.md            # Plugin description (4,000 char limit) — source of truth
├── release-notes.md          # Release notes per version (1,500 char limit each) — source of truth
├── marketplace-content.html  # Copy-paste ready HTML — open in browser, copy, paste into WYSIWYG
└── assets/
    ├── icon.svg              # Source SVG for marketplace icon
    ├── icon.png              # Generated PNG (288×288, ≤2 MB)
    ├── thumbnail.svg         # Source SVG for marketplace thumbnail
    ├── thumbnail.png         # Generated PNG (1920×960, ≤5 MB)
    ├── gallery-1-*.svg       # Source SVG for gallery image 1
    ├── gallery-1-*.png       # Generated PNG (1920×960, ≤10 MB)
    ├── gallery-2-*.svg       # Gallery image 2 (minimum 3 required)
    ├── gallery-3-*.svg       # Gallery image 3
    └── ...
```

### Elgato Marketplace Asset Requirements

| Asset | Format | Size Limit | Dimensions | Count |
|---|---|---|---|---|
| Icon | PNG or JPG | 2 MB | 288×288 (1:1) | 1 |
| Thumbnail | PNG or JPG | 5 MB | 1920×960 (2:1) | 1 |
| Gallery | PNG/JPG ≤10 MB or MP4 ≤50 MB | see format | 1920×960 (PNG) or 1920×1080 (MP4) | Min 3 |
| Description | Plain text | 4,000 chars | — | 1 |
| Release Notes | Plain text | 1,500 chars | — | 1 per version |

### Source of Truth

- **Markdown files** (`description.md`, `release-notes.md`) are the source of truth for text content
- **SVG files** are the source of truth for images — PNGs are generated from SVGs
- **`marketplace-content.html`** must be kept in sync manually with the markdown files

### The WYSIWYG Copy-Paste Problem

The Elgato Marketplace developer portal provides only a WYSIWYG rich-text editor (no markdown support). Pasting markdown results in unformatted text. The solution:

1. Maintain source-of-truth text in markdown (easy to diff, review, and edit)
2. Generate an HTML file (`marketplace-content.html`) with styled, copy-paste-ready content
3. User opens the HTML in a browser, clicks inside the white content box, `Ctrl+A` → `Ctrl+C` → paste into WYSIWYG
4. Formatting (bold, lists, headings) transfers automatically

The HTML file contains:
- The full description as formatted HTML
- Tabbed release notes per version (JavaScript tabs, newest first)
- Live character counters for description and each release note
- White content boxes on dark background (content boxes must be white so copied text has proper formatting)
- Instructions at the top explaining usage

### SVG to PNG Conversion Script

Use `@resvg/resvg-js` (dev dependency) for high-quality SVG → PNG conversion:

```typescript
// scripts/convert-content-assets.ts
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename, extname } from "path";

const ASSETS_DIR = join(import.meta.dirname, "..", "content", "assets");
const files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".svg"));

for (const file of files) {
  const svg = readFileSync(join(ASSETS_DIR, file), "utf-8");
  const resvg = new Resvg(svg, { fitTo: { mode: "original" }, font: { loadSystemFonts: true } });
  const pngData = resvg.render();
  writeFileSync(join(ASSETS_DIR, basename(file, extname(file)) + ".png"), pngData.asPng());
}
```

npm script: `"content:assets": "npx tsx scripts/convert-content-assets.ts"`

### Release Notes Rules

- **Max 1,500 characters** per release
- Plain text (no markdown rendering on Elgato Marketplace)
- Lead with the most impactful change
- Use bullet points (`•` character) for lists  
- Include version number and date as header
- Keep it user-facing — skip internal refactors unless they affect behavior
- Include: new features, bug fixes, UX improvements, breaking changes
- Exclude: internal refactors, test improvements, docs-only changes, dependency updates

### Description Rules

- **Max 4,000 characters**
- Use emoji headings for visual structure (they render on the marketplace)
- Sections: Features (per action), workflow highlights, privacy, requirements, getting started
- Tone: Marketing/enthusiastic — highlight value propositions, use action words
- Update whenever new actions or features are added

### Post-Release Marketplace Content Update (MANDATORY)

After every release, as part of the release checklist:

1. Write release notes in `content/release-notes.md`
2. Review `content/description.md` — update if features changed
3. Update `content/marketplace-content.html` with matching HTML content
4. Update gallery SVGs in `content/assets/` if key display changed
5. Run `npm run content:assets` to regenerate PNGs from SVGs
6. Verify PNG file sizes are within limits
7. Commit content changes with the version bump
8. After GitHub Release: open `marketplace-content.html` in browser, copy content, paste into Elgato Marketplace WYSIWYG
9. After GitHub Release: upload new asset PNGs to Elgato Marketplace (if changed)

### Gallery Image Design Guidelines

Gallery SVG mockups follow the Stream Deck dark theme:

| Element | Value |
|---|---|
| Background | `#0d1117` to `#161b22` gradient |
| Text primary | `#ffffff` |
| Text secondary | `#9ca3af` |
| Key background | `#0d1117` with `#2d2d44` border |
| Key corner radius | 16–20px |
| Accent bar | 6–8px, full width, 3px corner radius |
| Font (UI text) | `Segoe UI` |
| Font (key display) | `Arial` |

**Do NOT use copyrighted logos** in marketplace assets. Use original artwork only.

---

## 9. File Header Convention

Every `.ts` file must have this header:
```typescript
/**
 * Brief description of the file's purpose
 *
 * @author __AUTHOR_SHORT__ <__AUTHOR_EMAIL__>
 * @copyright __AUTHOR_NAME__
 * @license MIT
 */
```

---

## 10. Git & Repository Standards

### Conventional Commits
```
feat(actions): add new action for X
fix(utils): handle null token in validation
test(utils): add edge cases for formatCount
docs(readme): update installation instructions
chore: prepare v1.0.0 release
```

### Branch Naming Conventions (GitHub Flow)

*(Source: cloudflare-utilities, github-utilities)*

All repos use GitHub Flow: `main` is protected (never commit directly), all work happens on feature branches that merge via PR.

**Branch prefixes:**

| Prefix | Use Case |
|---|---|
| `feat/` | New features or actions |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring |
| `test/` | Adding or updating tests |
| `chore/` | Maintenance, dependency updates |
| `release/` | Release preparation |

Examples: `feat/worker-analytics-action`, `fix/rate-limit-handling`, `chore/bump-v1.2.0`

### README Badges
```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/user/repo/releases)
[![Tests](https://img.shields.io/badge/tests-N%20passed-brightgreen.svg)](https://github.com/user/repo)
```

---

## 11. Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---|---|---|
| Using `charset=utf8` SVG encoding | Buttons blank on device | Use `encodeURIComponent` |
| Nested `<svg>` in button images | Icon area blank on device | Use `<g transform>` |
| `UserTitleEnabled` inside `States` | Silently ignored, user title overlays SVG | Place at **Action level** as sibling of `States` |
| SVG icons in manifest | `streamdeck validate` fails | Convert to PNG with @2x |
| Missing `[key: string]: JsonValue` on settings | TypeScript compile error | Always add index signature |
| Editing files in `bin/` directory | Changes overwritten on build | Edit `src/` only |
| Image paths with extensions in manifest | SDK can't find icons | Omit `.png`/`.svg` extensions |
| Not cleaning title with `setTitle("")` | Default title overlays SVG | Always clear title |
| Thin font weights in SVG text | Illegible on 72px OLED | Use bold/normal weight only |
| Testing SVGs only in Stream Deck app | Works in app, blank on device | Always test on physical hardware |
| Storing state on `this` in SingletonAction | Multiple buttons overwrite each other | Use `Map<string, ButtonState>` keyed by `action.id` |
| Registering actions after `connect()` | Actions not recognized, buttons blank | Register all actions **before** `streamDeck.connect()` |
| Missing `onKeyUp` override in subclass | Key presses silently ignored | Every action must explicitly override key events |
| `Boolean(undefined)` for new settings | Changes default behavior for existing users | Handle `undefined` explicitly with desired default |
| `setTimeout` * 1000 twice for durations | 8 seconds becomes 2.2 hours | Document units in JSDoc, multiply once |
| `setSettings()` triggers `onDidReceiveSettings` | Double-render on key press cycling | Use a `pendingKeyCycle` flag to suppress echo |
| Using runtime `process.env` in plugin | Variables undefined in bundled plugin | Use Rollup `@rollup/plugin-replace` at build time |
| Colored action list icons | Look wrong in light/dark themes | Use monochrome white on transparent background |
| Committing `.streamDeckPlugin` to repo | Bloats repo, stale artifacts | Add `*.streamDeckPlugin` and `release/` to `.gitignore` |
| Using direct status API domains behind WAF | 403 from CloudFront WAF | Use `<page-id>.statuspage.io` API endpoint instead |
| Custom dropdowns without viewport awareness | Dropdown overflows PI viewport | Measure space, flip with `column-reverse`, enforce 120px minimum |
| Skipping PI verification before release | PI dropdowns/help text out of sync with code | Run 8-item Documentation & PI Verification checklist |
| Custom PI components relying on constructor settings | Settings empty during DOM construction | Use `sdpi-settings-loaded` custom event for deferred initialization |
| Committing directly to `main` | Breaks protected branch, skips review | Use feature branches with `feat/`/`fix/` prefixes |
| Skipping marketplace content update on release | Stale listing, missing release notes on Elgato Marketplace | Run the Post-Release Marketplace Content Update checklist |
| Pasting markdown into Elgato WYSIWYG editor | Unformatted text, lost formatting | Use `marketplace-content.html` copy-paste approach |
| Mixing sdpi-components with custom PI components | sdpi-components overwrites custom component settings via `setSettings` | Use WebSocket send interceptor to merge `_actionSettings` into every outgoing `setSettings` |
| Not suppressing `didReceiveSettings` echoes in PI | Stale echo reverts user's dropdown change during debounce window | Track `_lastSendTime`, skip `_actionSettings` update for echoes within 500ms |
| Plugin calling `setSettings()` to persist defaults | Echo races with PI debounce, reverts user's next change | Inject defaults in PI send interceptor, not in plugin |
| Using `pendingKeyCycle` boolean for multi-button | One button's flag masks another's echo | Use `Set<string>` keyed by `action.id` with `delete()` one-shot guard |
| Trusting `ev.payload.settings` in `onKeyUp` | Settings may be stale/partial from sdpi-components' partial `setSettings` | Use per-action `Map<string, Settings>` cache as source of truth |
