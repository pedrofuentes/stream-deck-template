# Contributions: stream-deck-github-utilities

> Source: [stream-deck-github-utilities](https://github.com/pedrofuentes/stream-deck-github-utilities)
> **Status**: ✅ Merged into `LEARNINGS.md` on February 20, 2026

## Stats
- **Test count**: 345 tests, 10 test files
- **Source files**: 19 TypeScript files
- **Actions**: 2 (Repo Stats, Workflow Status)
- **Release**: v1.2.0

## Key Topics Contributed
- SVG encoding (`encodeURIComponent` — the only working method)
- Nested `<svg>` → `<g transform>` fix
- Manifest validation gotchas (`UserTitleEnabled`, PNG icons)
- Property Inspector token loading race condition (3-layer fallback)
- Testing patterns (`vi.hoisted()`, SVG assertion helpers, fake timers)
- Build & release pipeline (Rollup, `streamdeck pack`, GitHub Releases)
- Action patterns (polling, timer cleanup, error handling order)

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
