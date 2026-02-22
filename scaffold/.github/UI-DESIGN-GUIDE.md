# UI & UX Design Guide — __PLUGIN_NAME__

> **Audience**: AI agents and developers designing Stream Deck buttons, Property Inspector panels, or any visual element.
> This guide consolidates all UX/UI research, hardware-tested patterns, and design decisions from developing Stream Deck plugins.
> Every rule was validated on physical Stream Deck hardware (72×72 OLED keys).
>
> Sources: stream-deck-cloudflare-utilities, stream-deck-github-utilities

---

## Table of Contents

1. [Golden Rules](#1-golden-rules)
2. [Key Display — `setImage` vs `setTitle`](#2-key-display--setimage-vs-settitle)
3. [The Accent Bar Pattern (Proven Layout)](#3-the-accent-bar-pattern-proven-layout)
4. [SVG Rendering Specifications](#4-svg-rendering-specifications)
5. [Color Palette](#5-color-palette)
6. [Typography](#6-typography)
7. [Vertical Positioning](#7-vertical-positioning)
8. [Dynamic Font Sizing](#8-dynamic-font-sizing)
9. [Truncation Rules](#9-truncation-rules)
10. [Marquee (Scrolling Text) System](#10-marquee-scrolling-text-system)
11. [Manifest & Icon Configuration](#11-manifest--icon-configuration)
12. [Property Inspector (PI) Guidelines](#12-property-inspector-pi-guidelines)
13. [Feedback Patterns](#13-feedback-patterns)
14. [Device Specifications](#14-device-specifications)
15. [Key Image Renderer — Shared Service](#15-key-image-renderer--shared-service)
16. [Error & Loading States](#16-error--loading-states)
17. [URL-Opening UX Pattern](#17-url-opening-ux-pattern)
18. [Anti-Patterns to Avoid](#18-anti-patterns-to-avoid)
19. [Design Decisions Log (What Failed & Why)](#19-design-decisions-log-what-failed--why)
20. [Checklist for New Actions](#20-checklist-for-new-actions)
21. [References & Documentation](#21-references--documentation)

---

## 1. Golden Rules

These are non-negotiable. They are backed by hardware testing.

| # | Rule | Why |
|---|------|-----|
| 1 | **Always use `setImage`, never `setTitle` alone** | `setTitle` produces tiny, unstyled text. Emoji rendering is inconsistent. Zero control over layout. |
| 2 | **Use the accent bar pattern** | A 6px colored bar across the top is the only reliable status indicator on 72×72 OLED. Dots, icons, and emoji are invisible. |
| 3 | **Center all text** | Left-aligned text wastes space and looks unbalanced on small keys. Always `text-anchor="middle"` at `x="72"`. |
| 4 | **Render at 144×144** | Design for the high-DPI canvas (144×144). The SDK scales down to 72×72 automatically. SVGs handle all resolutions natively. |
| 5 | **Use the shared renderer** | Never generate SVG strings in action files. Use `src/services/key-image-renderer.ts` (or `src/utils/button-renderer.ts`). |
| 6 | **Test on hardware** | OLED displays have fundamentally different gamma and viewing characteristics than monitors. Monitor previews are misleading. |
| 7 | **Max 3 lines of text** | Anything more is unreadable at 72×72. Abbreviate aggressively ("2h" not "2 hours ago"). |

---

## 2. Key Display — `setImage` vs `setTitle`

> **SDK Reference**: [`action.setImage()`](https://docs.elgato.com/streamdeck/sdk/references/modules#setimage) · [`action.setTitle()`](https://docs.elgato.com/streamdeck/sdk/references/modules#settitle)

### Why `setTitle` Fails

| Problem | Detail |
|---------|--------|
| **Tiny font** | Default title font is ~13px — unreadable on 72×72 OLED |
| **No styling** | Cannot control font size, color, weight, or alignment per line |
| **Emoji rendering** | Emoji like 🟢 render as tiny, inconsistent glyphs across platforms |
| **No background control** | Title renders _on top of_ the key image; can't color-code anything |
| **Line limit** | Only ~3 short lines fit, all unstyled and identical |

### How `setImage` Works

```typescript
const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    <rect width="144" height="144" rx="16" fill="#0d1117"/>
    <rect y="0" width="144" height="6" rx="3" fill="#4ade80"/>
    <text x="72" y="46" text-anchor="middle" fill="#9ca3af" font-size="18"
          font-family="Arial,Helvetica,sans-serif">my-resource</text>
    <text x="72" y="88" text-anchor="middle" fill="#ffffff" font-size="30"
          font-weight="bold" font-family="Arial,Helvetica,sans-serif">OK</text>
  </svg>`;

await ev.action.setImage(`data:image/svg+xml,${encodeURIComponent(svg)}`);
```

### `setImage` + `setTitle` Interaction

| Scenario | Result |
|----------|--------|
| `setImage` only | Image fills key; no text overlay |
| `setTitle` only | Title renders on top of manifest default image |
| Both | Title renders **on top of** the image (ugly overlap) |
| `setImage` + manifest `ShowTitle: false` | Clean image, no overlay even if user tries to set a title |

**Best practice**: Use `setImage` with baked-in text. Set `ShowTitle: false` in manifest.

### Key Constraints

- **Canvas size**: 72×72 px (144×144 high DPI). Always design at 144×144.
- **SVG is recommended**: Vectorized, scales well, supports text and shapes natively.
- **PNG/JPEG/WEBP** via base64 data URI also work, but SVG is preferred.
- **No animated formats**: GIF is not supported for `setImage`.
- **Max 10 updates/second** per key — don't exceed this.
- **Encoding**: `data:image/svg+xml,${encodeURIComponent(svg)}`.

---

## 3. The Accent Bar Pattern (Proven Layout)

This is the standard layout for all actions. It was tested on hardware and confirmed to be the most readable approach.

```
┌════════════════════════┐  ← colored accent bar (6px, full width, rx=3)
│                        │
│    Resource Name (18px)│  ← line 1: identifier, gray #9ca3af, centered
│                        │
│      STATUS (30px)     │  ← line 2: main info, white #ffffff, bold, centered
│                        │
│    metadata (15px)     │  ← line 3: metadata, gray #9ca3af, centered
│                        │
└────────────────────────┘
```

### Why This Pattern Won

| Compared to | Problem |
|-------------|---------|
| Status dot (7px radius circle) | Too small — barely visible on 72×72 OLED, especially at an angle |
| Left-aligned text with dot | Dot + text offset wastes space, looks unbalanced |
| Background color fill | Obscures text, overwhelming on small keys |
| Emoji status indicators | Render inconsistently, too small, can't control color |

### Why Accent Bar Works

- **Full-width visibility**: Spans entire key width — impossible to miss at any viewing angle
- **Unobstructed text area**: All text remains centered below the bar
- **Color semantics**: Color maps directly to status (green=OK, red=error, etc.)
- **Tab indicator feel**: Works like a tab/category indicator — intuitive
- **Consistent across actions**: All actions use the same pattern = unified plugin UX

---

## 4. SVG Rendering Specifications

> **SVG Reference**: [SVG 1.1 spec (W3C)](https://www.w3.org/TR/SVG11/) · [MDN SVG tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)

### SVG Encoding — THE ONLY METHOD THAT WORKS

```typescript
// ✅ CORRECT — the ONLY encoding that renders on Stream Deck hardware:
ev.action.setImage("data:image/svg+xml," + encodeURIComponent(svg));

// ❌ BROKEN — base64 does NOT render on hardware:
ev.action.setImage("data:image/svg+xml;base64," + btoa(svg));

// ❌ BROKEN — charset parameter breaks rendering:
ev.action.setImage("data:image/svg+xml;charset=utf8," + encodeURIComponent(svg));
```

Always clear the title when using SVG images: `ev.action.setTitle("")`.

### SVG Rendering Limitations on Stream Deck

| Feature | Works? | Notes |
|---|---|---|
| `<rect>`, `<circle>`, `<path>` | ✅ | Basic shapes work |
| `<text>` with system fonts | ✅ | Arial, Helvetica, sans-serif |
| `<g>` with transforms | ✅ | translate, scale, rotate |
| `<animate>` (opacity) | ✅ | Works for loading dots, pulse effects |
| `<animateTransform type="rotate">` | ✅ | Works for spinning progress indicators |
| Radial/linear gradients | ✅ | Work well, great for OLED glow effects |
| Nested `<svg>` | ❌ | Use `<g transform="translate() scale()">` instead |
| `<foreignObject>` | ❌ | Not supported |
| CSS `@keyframes` | ❌ | Use SVG `<animate>` elements instead |
| External fonts (`@font-face`) | ❌ | Use system fonts only |
| `<filter>` effects | ⚠️ | Basic blur works; complex filter chains may fail |
| `clip-path` | ⚠️ | Basic clips work, complex fail |
| `<mask>` | ❌ | Not supported |

### Design Principles for OLED

| Principle | Guideline |
|-----------|-----------|
| **High contrast** | Light text (`#ffffff` / `#e6edf3`) on dark background (`#0d1117`). OLED displays true black. |
| **Large fonts** | Primary ≥ 30px, secondary ≥ 18px, metadata ≥ 15px (at 144×144 canvas). |
| **Center everything** | `text-anchor="middle"` with `x="72"` — balanced on tiny screens. |
| **Minimal text** | Max 3 lines. Abbreviate aggressively. |
| **Rounded shapes** | `rx`/`ry` on rects feel native to Stream Deck aesthetic. |
| **No thin strokes** | At 72px physical size, 1px strokes are invisible. Minimum 2px; prefer fills. |
| **Safe font stack** | `font-family="Arial,Helvetica,sans-serif"` — cross-platform safe. |
| **Bold for status** | `font-weight="bold"` on main status line for maximum legibility. |
| **XML escaping** | All text must be XML-escaped before embedding in SVG (`&`, `<`, `>`, `"`, `'`). |

### SVG Template

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <!-- Background -->
  <rect width="144" height="144" rx="16" fill="#0d1117"/>
  <!-- Accent bar (status indicator) -->
  <rect y="0" width="144" height="6" rx="3" fill="${statusColor}"/>
  <!-- Line 1: identifier -->
  <text x="72" y="${line1Y}" text-anchor="middle" fill="#9ca3af"
        font-size="18" font-family="Arial,Helvetica,sans-serif">${name}</text>
  <!-- Line 2: main status -->
  <text x="72" y="${line2Y}" text-anchor="middle" fill="#ffffff"
        font-size="30" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${status}</text>
  <!-- Line 3: metadata -->
  <text x="72" y="${line3Y}" text-anchor="middle" fill="#9ca3af"
        font-size="15" font-family="Arial,Helvetica,sans-serif">${detail}</text>
</svg>
```

---

## 5. Color Palette

All colors should be defined in the shared renderer and exported as constants. **Import these — never hardcode hex values in action files.**

### Status Colors (`STATUS_COLORS`)

| Key | Hex | Use For |
|-----|-----|---------|
| `green` | `#4ade80` | OK, live, healthy, operational, success |
| `amber` | `#fbbf24` | Warning, minor issue, degraded, in progress |
| `red` | `#f87171` | Error, critical, down, failed |
| `blue` | `#60a5fa` | Recent activity, in progress, active, queued |
| `orange` | `#fb923c` | Gradual rollout, split traffic, partial |
| `gray` | `#9ca3af` | Unknown, N/A, placeholder, unconfigured |

> These are derived from the Tailwind CSS color system — green-400, amber-400, red-400, blue-400, orange-400, gray-400 respectively. Selected for high visibility on OLED displays.

### Background & Text

| Constant | Hex | Usage |
|----------|-----|-------|
| `BG_COLOR` | `#0d1117` | Dark background — excellent OLED contrast (use as SVG rect fill) |
| `TEXT_PRIMARY` | `#ffffff` | Main text (status line) — high contrast white |
| `TEXT_SECONDARY` | `#9ca3af` | Metadata, labels, timestamps — muted gray |

> **Note**: `#0d1117` (GitHub dark / dark navy) reads better than pure `#000000` on OLED despite both being "dark." The subtle warmth improves perceived quality.

### Plugin-Specific Accent Colors (GitHub Example)

Plugins may define additional accent colors per feature. Example from GitHub Utilities:

```
Stars:          #e3b341 (gold)
Issues:         #3fb950 (green)
Forks:          #58a6ff (blue)
Pull Requests:  #3fb950 (green — contextually distinct from Issues)
Language:       #f78166 (orange)
Visibility:     #8b949e (gray)
License:        #d29922 (amber/gold)
```

**Color assignment principle**: Each feature/stat type gets a distinct accent color used for the top bar AND the label text. Reuse is OK when the types are contextually different.

---

## 6. Typography

### Font Sizes (at 144×144 canvas)

| Line | Size | Weight | Color | Purpose |
|------|------|--------|-------|---------|
| Line 1 (identifier) | 18px | normal | `#9ca3af` | Name, identifier, label |
| Line 2 (main status) | 30px | **bold** | `#ffffff` | Primary information — must be instantly readable |
| Line 3 (metadata) | 15px | normal | `#9ca3af` | Timestamp, source, secondary detail |

**These sizes were tested on hardware.** Do not make them smaller — they become unreadable on the tiny OLED display.

### Font Stack

```
font-family="Arial,Helvetica,sans-serif"
```

Safe cross-platform. Works on Windows, macOS, and Linux. Note: `"SF Pro"` and `"Segoe UI"` are system-specific and **do not** render in Stream Deck's SVG renderer — only `Arial, Helvetica, sans-serif` work reliably.

### Text Rendering

- All text centered: `text-anchor="middle"` at `x="72"`
- Bold only on line 2 (the main status)
- Max ~10 characters visible per line at 18px before truncation/marquee is needed
- Abbreviate numbers: "1.2K" not "1,234" — "2h" not "2 hours"
- **Never use thin/light weights** — they disappear on OLED at 72px
- **Always bold primary data** — `font-weight="bold"` on the main number/value text

---

## 7. Vertical Positioning

Y-coordinates for text placement vary based on how many lines are shown. The accent bar occupies the top 6px, and the background has 16px corner radius.

| Layout | line1 Y | line2 Y | line3 Y |
|--------|---------|---------|---------|
| 3 lines (name + status + detail) | 46 | 88 | 124 |
| 2 lines (name + status) | 56 | 100 | — |
| 2 lines (status + detail) | — | 70 | 112 |
| 1 line (status only) | — | 86 | — |

These positions were optimized through hardware testing to achieve visual balance within the 144×144 canvas.

For **icon layouts** (centered SVG icon instead of text on line 2):

| Lines Present | line1 Y | icon Y | line3 Y |
|---|---|---|---|
| All three | 46 | 50 (icon top) | 120–124 |
| Line1 + icon only | 56 | 50 | — |

---

## 8. Dynamic Font Sizing

*(Source: github-utilities)*

When a button displays text instead of a number (e.g., "TypeScript", "Apache-2.0"), the text can exceed what fits at the default font size. Use **dynamic font sizing based on character count**:

```typescript
// Battle-tested breakpoints:
let fontSize = 30;                        // Default for short values (≤4 chars: "MIT", "42k")
if (displayValue.length > 9) fontSize = 18;   // Long: "TypeScript", "Apache-2.0"
else if (displayValue.length > 6) fontSize = 22; // Medium: "4.2 MB", "Public"
else if (displayValue.length > 4) fontSize = 26; // Slightly long: "12.5k"
```

When font size changes, the **max character limit for truncation must also adapt**:

```typescript
const maxLine2Chars = line2FontSize <= 22 ? 16 : 12;
// Smaller font = more chars fit = higher truncation threshold
```

This prevents both overflow AND unnecessary truncation of values that would fit.

---

## 9. Truncation Rules

- **Always truncate with `..`** (two dots, not three — saves space on tiny displays)
- Line 1 (identifier): max 14 characters on buttons
- Line 2 (primary value): 12 characters (at 30px font), 16 characters (at ≤22px font)
- Line 3 (metadata): max 18 characters
- **Never let text overflow** — it either gets cut off or wraps unpredictably in SVG
- **Never return raw API values** to display — always format (capitalize, convert units, provide fallbacks)

---

## 10. Marquee (Scrolling Text) System

When identifiers (resource names, gateway names, component names) exceed the visible character limit, a circular marquee animates the name.

### When to Use

- Line 1 (identifier text) exceeds **10 characters**
- Example long names: "Access Authentication & SSO", "my-super-long-worker-name"

### Architecture

| File | Role |
|------|------|
| `src/services/marquee-controller.ts` | Reusable, framework-agnostic state machine |
| Each action file | Owns the timer (`setInterval`), calls `tick()`, re-renders on change |

### Key Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `maxVisible` | 10 | Max chars that fit at 18px on 144×144 canvas (hardware-tested) |
| `MARQUEE_PAUSE_TICKS` | 3 | 3 ticks (1.5s) pause at the start of each scroll cycle — gives time to read the beginning |
| `MARQUEE_SEPARATOR` | `"  •  "` | 2 spaces + bullet + 2 spaces — visually clear gap between repetitions |
| Tick interval | 500ms | Set in each action, not the controller. Smooth scroll without being distracting. |

### Scroll Behavior

**Circular/wrapping scroll** — text loops continuously like a news ticker:

```
"kleine-gateway" (14 chars), maxVisible=10, separator="  •  "

tick 0-2:  "kleine-gat"    ← pause (3 ticks)
tick 3:    "leine-gate"    ← scrolling begins
tick 4:    "eine-gatew"
...
tick 7:    "e-gateway "    ← separator starts appearing
tick 9:    "gateway  •"    ← bullet visible
...
tick 18:   back to "kleine-gat" (seamless loop)
```

### Implementation Pattern

```typescript
import { MarqueeController } from "../services/marquee-controller";

// In the action class:
private marquee = new MarqueeController(10);
private marqueeInterval: ReturnType<typeof setInterval> | null = null;
private readonly MARQUEE_INTERVAL_MS = 500;

// After fetching data / receiving settings:
this.marquee.setText(name);

// After rendering:
private startMarqueeIfNeeded(): void {
  this.stopMarqueeTimer();
  if (this.marquee.needsAnimation()) {
    this.marqueeInterval = setInterval(() => this.onMarqueeTick(), this.MARQUEE_INTERVAL_MS);
  }
}

private stopMarqueeTimer(): void {
  if (this.marqueeInterval) {
    clearInterval(this.marqueeInterval);
    this.marqueeInterval = null;
  }
}

private onMarqueeTick(): void {
  if (this.marquee.tick()) {
    // Re-render the key with this.marquee.getCurrentText() as the display name
  }
}

// On disappear — always clean up:
onWillDisappear(): void {
  this.stopMarqueeTimer();
  // ... other cleanup
}
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Circular, not bounce-back | Feels like a natural ticker; no jarring direction reversal |
| `"  •  "` separator (5 chars) | Consistent across plugins; visually clear gap |
| 10-char visible window | Hardware-tested — 10 chars at 18px is the max that fits legibly |
| Marquee continues during metric cycling | Position preserved when user presses key — no visual reset |
| Marquee resets on name change | Fresh start for new text content |
| Controller is stateless about rendering | Action owns the timer and rendering — controller only manages scroll offset |

---

## 11. Manifest & Icon Configuration

> **SDK Reference**: [Manifest reference](https://docs.elgato.com/streamdeck/sdk/references/manifest) · [Icons & images](https://docs.elgato.com/streamdeck/sdk/guides/icons)

### Disable Default Title Overlay

When using `setImage` to render everything, **disable the SDK title** to prevent overlay:

```json
{
  "Name": "My Action",
  "States": [
    {
      "Image": "imgs/actions/my-action",
      "ShowTitle": false
    }
  ],
  "UserTitleEnabled": false,
  "UUID": "__PLUGIN_ID__.my-action"
}
```

**Critical placement**: `UserTitleEnabled` goes at the **Action level** (sibling of `States`), **NOT** inside `States` entries. The SDK silently ignores it inside `States`.

### Icon Specifications

| Icon Type | Size | High DPI | Format | Notes |
|-----------|------|----------|--------|-------|
| Plugin icon (marketplace) | 144×144 | 288×288 | PNG | Brand icon |
| Category icon | 28×28 | 56×56 | SVG recommended | Action list category |
| Action icon (action list) | 20×20 | 40×40 | SVG recommended | **Monochrome white on transparent** |
| Key icon (state image) | 72×72 | 144×144 | SVG recommended | Default key appearance |

### Action List Icon Rules

- **Monochromatic white** (`#FFFFFF`) on **transparent background**
- Stream Deck auto-adjusts color for light/dark contexts
- **No solid backgrounds** on action list icons
- **No colors** in list icons — color is only for key display
- SVG strongly recommended over PNG for scaling

### Image Path Rules

- **Omit file extensions** in all manifest image paths: `"imgs/plugin-icon"` not `"imgs/plugin-icon.png"`
- The SDK resolves `.png` files and will prefer `@2x.png` variants automatically
- All icons **must be PNG** for packaging — SVG icons will fail `streamdeck validate`

---

## 12. Property Inspector (PI) Guidelines

> **SDK Reference**: [Property Inspector overview](https://docs.elgato.com/streamdeck/sdk/guides/property-inspector) · [`sdpi-components` library](https://sdpi-components.dev/)

### Use the `sdpi-components` Library

Provides consistent Elgato-styled UI components. [Component reference & live demos](https://sdpi-components.dev/).

### Available Components

| Component | Tag |
|-----------|-----|
| Button | `<sdpi-button>` |
| Checkbox | `<sdpi-checkbox>` |
| Checkbox List | `<sdpi-checkbox-list>` |
| Color Picker | `<sdpi-color>` |
| Date Picker | `<sdpi-calendar type="date">` |
| File Picker | `<sdpi-file>` |
| Password | `<sdpi-password>` |
| Radio | `<sdpi-radio>` |
| Range / Slider | `<sdpi-range>` |
| Select / Dropdown | `<sdpi-select>` |
| Textarea | `<sdpi-textarea>` |
| Textfield | `<sdpi-textfield>` |

### PI Design Rules

| Rule | Detail |
|------|--------|
| **Auto-save** | Settings save on change via `setting="propertyName"` attribute. No "Save" button needed. |
| **Checkbox for booleans** | Not a dropdown or radio. |
| **Select or radio for enums** | Not a text field. |
| **Inline validation** | Show errors/highlights inline — no alert dialogs. |
| **Setup help** | Provide concise help inline (collapsible details, tooltips). |
| **No donation/sponsor links** | Use Marketplace page instead. |
| **Keep it simple** | Avoid excessive components. Split into smaller actions if needed. |
| **Hide unused sections** | If one PI serves multiple actions, hide irrelevant sections on load. |
| **No large paragraphs** | Space is limited in the PI panel. |

### Global Settings Pattern

API credentials are shared across all actions via Stream Deck's global settings — not per-action settings.

```
setup.html → $SD.setGlobalSettings({ apiToken, accountId })
                ↓
plugin.ts → onDidReceiveGlobalSettings → globalSettingsStore.update()
                ↓
actions → subscribe via onGlobalSettingsChanged() → re-initialize API clients
```

**Never store `apiToken` or credentials in per-action settings.** Always use `getGlobalSettings()`.

### Setup Popup Window Pattern

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

### WebSocket Interception Pattern

To share settings between the PI and a settings popup (or intercept data from the plugin):

```javascript
(function() {
    const NativeWS = window.WebSocket;
    window.WebSocket = new Proxy(NativeWS, {
        construct(target, args) {
            const ws = new target(...args);
            window._sdWebSocket = ws;  // Store reference for popup communication
            ws.addEventListener("message", function(evt) {
                const data = JSON.parse(evt.data);
                if (data.event === "didReceiveGlobalSettings") {
                    window._globalSettings = data.payload?.settings || {};
                }
            });
            return ws;
        }
    });
})();
```

### FilterableSelect — Searchable Dropdown Component

For dynamic dropdowns loaded from APIs (resources, repos, branches), use a **FilterableSelect** component instead of native `<select>`. This provides type-to-filter search for large lists, keyboard navigation, and viewport-aware positioning.

#### When to Use

| Dropdown Type | Use FilterableSelect? | Why |
|---------------|----------------------|-----|
| Dynamic API-loaded lists (10+ items) | **YES** | Users need search for large lists |
| Static options (≤10 fixed items) | **NO** | Native `<select>` is simpler |

**Rule of thumb**: If items come from an API call or exceed ~8 entries, use FilterableSelect.

#### Key Design Decisions

1. **Dropdown portalled to `<body>`** — avoids overflow clipping from parent containers (`position: fixed`)
2. **Viewport-aware flip** — automatically flips above trigger when insufficient space below. Critical for small PI viewport (300–500px)
3. **Search auto-hidden** — when items ≤ threshold (default 8), search input is hidden
4. **`flex-direction: column-reverse`** for flip-up — search stays adjacent to trigger
5. **CSS uses PI CSS variables** — matches dark theme (`--bg-input`, `--border`, `--text`, `--accent`)

#### API Pattern

```javascript
var myFS = new FilterableSelect({
  container: document.getElementById("myContainer"),
  setting: "myField",
  placeholder: "-- Select --",
  searchPlaceholder: "Search…",
  threshold: 8,
  onRefresh: function () { loadData(); },
  onChange: function (value, label) {
    mySettings.myField = value;
    saveSettings();
  },
});

// Feed data after API fetch:
myFS.setItems(items.map(function (item) {
  return { value: item.id, label: item.name };
}));

// Restore saved value:
myFS.value = savedSettings.myField;
```

### SDPI Checkbox HTML Structure (if using raw HTML)

Checkboxes require a specific HTML structure for SDPI styling:

```html
<div class="sdpi-item" type="checkbox">
  <div class="sdpi-item-label">My Option</div>
  <div class="sdpi-item-value">
    <input type="checkbox" id="myOption" checked>
    <label for="myOption"><span></span>Description text</label>
  </div>
</div>
```

Key: `type="checkbox"` on parent div, `<label>` with `<span></span>` inside, `for` matches `id`.

### Dropdown Emoji Prefixes

*(Source: github-utilities)*

For dropdowns with many options, use **emoji prefixes** for quick visual scanning:

```html
<option value="stars">⭐ Stars</option>
<option value="issues">🔵 Open Issues</option>
<option value="forks">🔀 Forks</option>
```

### Status Feedback Design

Status messages use **color-coded text AND colored borders** for clarity:

```css
.status-box.success { color: #3fb950; border-color: #238636; }
.status-box.error   { color: #f85149; border-color: #da3633; }
.status-box.loading { color: #d29922; border-color: #9e6a03; }
.status-box.idle    { color: #8b949e; border-color: #30363d; }
```

---

## 13. Feedback Patterns

> **SDK Reference**: [`showOk()`](https://docs.elgato.com/streamdeck/sdk/references/modules#showok) · [`showAlert()`](https://docs.elgato.com/streamdeck/sdk/references/modules#showalert)

| Scenario | Method |
|----------|--------|
| Action succeeded, no visual change needed | `ev.action.showOk()` — brief checkmark overlay |
| Action failed | `ev.action.showAlert()` + log error |
| Visual state already changed | Do **not** use `showOk()` — redundant; the visual update IS the feedback |
| Loading state | Show a subtle loading indicator via `setImage` |
| Unconfigured state | Show placeholder: `renderPlaceholderImage()` → displays "..." |

---

## 14. Device Specifications

> **Source**: [Elgato product pages](https://www.elgato.com/stream-deck) · [SDK device info](https://docs.elgato.com/streamdeck/sdk/references/manifest#profiles)

| Device | Keys | Physical Resolution | Design Canvas |
|--------|------|---------------------|---------------|
| Stream Deck Mini | 6 | 72×72 px | 144×144 |
| Stream Deck MK.2 | 15 | 72×72 px | 144×144 |
| Stream Deck XL | 32 | 96×96 px | 144×144 (scales) |
| Stream Deck + | 8 keys + 4 dials | 120×120 px keys, 200×100 px touch strip | 144×144 |
| Stream Deck Neo | 8 | 72×72 px | 144×144 |

**Design for 144×144 (high-DPI of 72×72).** SVGs scale to all devices automatically.

---

## 15. Key Image Renderer — Shared Service

**File**: `src/services/key-image-renderer.ts` (or `src/utils/button-renderer.ts`)

**Do NOT create a new renderer.** All actions use this shared service.

### API

```typescript
import { renderKeyImage, renderPlaceholderImage, STATUS_COLORS } from "../services/key-image-renderer";

// Full 3-line key
const image = renderKeyImage({
  line1: "my-resource",           // identifier (18px, gray)
  line2: "2h ago",                // main status (30px, bold, white)
  line3: "source",                // metadata (15px, gray)
  statusColor: STATUS_COLORS.green, // accent bar color
});
await ev.action.setImage(image);

// Placeholder for unconfigured actions
await ev.action.setImage(renderPlaceholderImage()); // shows "..."
```

### What It Generates

- 144×144 SVG with dark background (`#0d1117`), 16px corner radius
- 6px colored accent bar at the top (full width, 3px corner radius)
- Up to 3 lines of centered text with automatic vertical spacing
- Returns `data:image/svg+xml,...` string ready for `setImage()`
- All text is XML-escaped automatically via `escapeXml()`

### Extending

If a new action needs a different layout:
1. Add a **new function** to the renderer file
2. Keep the accent bar pattern consistent
3. Export the new function
4. Add tests in `tests/services/key-image-renderer.test.ts`
5. **Never** generate SVG strings directly in action files

### Render States Every Action MUST Handle

| State | What to show | Example function |
|---|---|---|
| **Data display** | Primary data + label + name | `renderKeyImage()` |
| **Loading** | "Loading" text, muted accent | `renderLoadingImage()` |
| **Error** | Error message + "Press to retry" | `renderErrorImage(message)` |
| **Unconfigured** | "Setup" + "Open Settings" / "..." | `renderPlaceholderImage()` |
| **Special states** | E.g., active deployment, animation | Custom render function |

---

## 16. Error & Loading States

### Display Patterns

| State | Accent Bar | Line 1 | Line 2 | Line 3 |
|-------|-----------|--------|--------|--------|
| Healthy | green | name | "OK" / value | detail |
| Warning | amber | name | "Minor" | detail |
| Error | red | name | "ERR" / "Major" | detail |
| Unconfigured | — | — | "..." | — |
| Loading (first load) | gray | name | "..." | — |
| Network error | red | name | "ERR" | — |
| Rate limited (429) | amber | name | last cached value | — |

### Cached Data During Errors

When a transient error occurs (network failure, 429, 5xx):
- **Keep displaying the last known good data** on the key
- Log the error for debugging
- Retry on the next polling interval
- **Do NOT flash "ERR"** for transient issues — it's distracting and unhelpful

### Exponential Backoff UX

When consecutive errors occur:
- Skip increasing numbers of poll cycles (2^n - 1, capped at 32×)
- The key keeps showing the last known data during backoff
- A user key press **resets the backoff** immediately for manual retry
- This prevents hammering a blocked endpoint while keeping the UI stable

---

## 17. URL-Opening UX Pattern

*(Source: github-utilities)*

When a button press should open a URL in the browser:

1. **Store the URL** — after each successful data fetch, store the resolved URL in a `Map<string, string>` keyed by action ID
2. **Open on `onKeyDown`** — use `streamDeck.system.openUrl(url)`
3. **Provide fallback URL** — if the button hasn't fetched data yet (URL not in map), construct a generic URL from settings
4. **Clean up on disappear** — delete the stored URL in `onWillDisappear`

This ensures the button always does something useful when pressed, even before the first data fetch.

---

## 18. Anti-Patterns to Avoid

- ❌ Generic/cookie-cutter designs — no "AI aesthetic" (purple gradients on white)
- ❌ Thin, decorative fonts — illegible on small displays
- ❌ Low-contrast text — especially on OLED where muted text can vanish
- ❌ Too much information — force prioritization, not information overload
- ❌ Complex SVG paths at small scale — simplify icons for 72px
- ❌ Inline styles in PI HTML where CSS classes would suffice
- ❌ Unstyled native HTML elements — always match the dark theme
- ❌ Hardcoded font sizes for variable-length content — always use dynamic sizing
- ❌ `base64` or `charset=utf8` in SVG data URIs — only `encodeURIComponent` works
- ❌ Nested `<svg>` elements — Stream Deck renderer doesn't support them
- ❌ Three-dot ellipsis (`...`) for truncation — use two dots (`..`) to save precious horizontal space
- ❌ Returning raw API values to display — always format (capitalize, convert units, provide fallbacks)
- ❌ Using `<sdpi-select datasource="...">` for large dynamic lists — use `FilterableSelect` instead
- ❌ Custom dropdowns without viewport-aware positioning — PI panel is small; always measure space and flip/constrain
- ❌ Generating SVG strings directly in action files — use the shared renderer

---

## 19. Design Decisions Log (What Failed & Why)

**Read this before making UI changes** to avoid repeating past mistakes.

### Attempt 1: `setTitle` with Emoji (REJECTED)

```
my-worke
🟢 2h ago
wrangler
```

**Problems**: Emoji rendered as tiny inconsistent glyphs. Font was SDK default (~13px) — unreadable. No control over color, weight, alignment. Only 3 unstyled lines.

**Verdict**: Never use `setTitle` for status display.

### Attempt 2: SVG with Status Dot + Left-Aligned Text (REJECTED)

```
┌──────────────────────┐
│  Worker Name (16px)  │
│ ● Status (22px)      │  ← 7px radius dot
│  wrangler (13px)     │
└──────────────────────┘
```

**Problems**: 7px dot barely visible on OLED. Left-offset text wasted space. Font sizes (16/22/13) not optimal. Looked unbalanced.

**Verdict**: Status dot too small for hardware.

### Attempt 3: Accent Bar + Centered Text (APPROVED ✓)

The current pattern. See [section 3](#3-the-accent-bar-pattern-proven-layout).

**Why it won**: Full-width bar is impossible to miss. 30px bold status text is instantly readable. Centered layout is balanced and professional.

### Discovery: `UserTitleEnabled` Placement

`UserTitleEnabled: false` must be at the **Action level** in manifest.json. Placing it inside `States` entries does nothing — the SDK silently ignores it. This is not clearly documented by Elgato.

### Discovery: Statuspage.io vs Direct Domain

*(Source: cloudflare-utilities)*

Some status pages (e.g., `www.cloudflarestatus.com`) are behind CloudFront WAF which blocks programmatic requests with 403 Forbidden. The fix: use the underlying Statuspage.io endpoint directly (e.g., `yh6f0r4529hb.statuspage.io/api/v2`). Rapid requests can also trigger IP-level CloudFront bans, necessitating exponential backoff.

---

## 20. Checklist for New Actions

When adding a new action, verify all UI requirements:

- [ ] Uses shared renderer (not raw SVG in action files)
- [ ] Accent bar color maps to correct status via `STATUS_COLORS`
- [ ] All text is centered (`text-anchor="middle"`)
- [ ] Line 2 (status) is bold and the primary information
- [ ] Manifest sets `"ShowTitle": false` in `States`
- [ ] Manifest sets `"UserTitleEnabled": false` at Action level
- [ ] Action list icon is monochrome white on transparent background (20×20 SVG)
- [ ] Marquee implemented for line 1 if identifier can exceed 10 characters
- [ ] Placeholder image shown when unconfigured (`renderPlaceholderImage()`)
- [ ] Error states display gracefully (cached data preserved, no flashing "ERR")
- [ ] Dynamic font sizing used if line 2 can contain variable-length text
- [ ] Truncation applied with `..` (two dots) for overflow
- [ ] Tested on physical Stream Deck hardware
- [ ] Key press behavior documented and intuitive

---

## 21. References & Documentation

### Stream Deck SDK

| Resource | URL |
|----------|-----|
| SDK documentation (main) | https://docs.elgato.com/streamdeck/sdk/introduction |
| Manifest reference | https://docs.elgato.com/streamdeck/sdk/references/manifest |
| Action lifecycle events | https://docs.elgato.com/streamdeck/sdk/references/modules |
| Dynamic images guide | https://docs.elgato.com/streamdeck/sdk/guides/dynamic-images |
| Icons & images guide | https://docs.elgato.com/streamdeck/sdk/guides/icons |
| Property Inspector guide | https://docs.elgato.com/streamdeck/sdk/guides/property-inspector |
| PI ↔ Plugin communication | https://docs.elgato.com/streamdeck/sdk/guides/plugin-and-property-inspector-communication |
| Global settings | https://docs.elgato.com/streamdeck/sdk/guides/global-settings |
| Stream Deck CLI | https://docs.elgato.com/streamdeck/cli/intro |
| `@elgato/streamdeck` npm | https://www.npmjs.com/package/@elgato/streamdeck |

### sdpi-components (Property Inspector UI)

| Resource | URL |
|----------|-----|
| Component reference & demos | https://sdpi-components.dev/ |
| Releases (JS download) | https://sdpi-components.dev/releases/v3/sdpi-components.js |

### SVG

| Resource | URL |
|----------|-----|
| SVG 1.1 specification (W3C) | https://www.w3.org/TR/SVG11/ |
| MDN SVG tutorial | https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial |
| MDN `<text>` element | https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text |
| MDN `text-anchor` attribute | https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor |
| Data URIs (MDN) | https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data |

### Color Reference

| Resource | URL |
|----------|-----|
| Tailwind CSS color palette | https://tailwindcss.com/docs/colors |
| GitHub Primer Design System | https://primer.style/ |
| GitHub Primer — Color Primitives | https://primer.style/foundations/color/overview |

> The `STATUS_COLORS` palette (`#4ade80`, `#fbbf24`, `#f87171`, `#60a5fa`, `#fb923c`, `#9ca3af`) is derived from the Tailwind CSS color system — green-400, amber-400, red-400, blue-400, orange-400, gray-400 respectively. Selected for high visibility on OLED displays.

### Key Learnings Not Found in Docs

These were discovered through trial-and-error on hardware and are **not documented** in any official source:

1. **SVG encoding**: Only `"data:image/svg+xml," + encodeURIComponent(svg)` works. Base64 and charset variants render blank on hardware.
2. **Nested `<svg>` elements**: Silently fail — no error, just blank. Use `<g>` with transforms instead.
3. **CSS `@keyframes` in SVG**: Not supported by Stream Deck's renderer. Must use SVG-native `<animate>` elements.
4. **`<foreignObject>`**: Not supported. Cannot embed HTML inside SVG on Stream Deck.
5. **Background color**: `#0d1117` reads better than pure `#000000` on OLED.
6. **Two-dot truncation**: `..` instead of `...` saves one character — meaningful at 12-char limits.
7. **Dynamic font sizing thresholds**: The 30/26/22/18px breakpoints at 4/6/9 characters were tuned by testing real values on hardware.
8. **PI viewport is small and fixed** — typically 300–500px tall. Custom dropdowns must measure viewport space and flip/constrain. Native `<select>` gets this for free from the OS.
9. **`position: fixed` + portalling to `<body>`** — custom overlays inside `<sdpi-item>` shadow DOM get clipped. Portal to `<body>` with `getBoundingClientRect()`.
10. **`flex-direction: column-reverse` for flip-up menus** — keeps search input adjacent to trigger when opening upward.

---

## Updating This Document

When you discover new UI patterns, SDK capabilities, or hardware quirks:
1. Add findings to the relevant section above
2. Add failures to the [Design Decisions Log](#19-design-decisions-log-what-failed--why) so they're not repeated
3. Keep entries concise — this is a reference, not a tutorial
4. Add new external references to [section 21](#21-references--documentation)
5. Reference `AGENTS.md` for project rules and `.github/TESTING-PROTOCOL.md` for test patterns
6. **Contribute new design learnings** back to the template repo: https://github.com/pedrofuentes/stream-deck-template
