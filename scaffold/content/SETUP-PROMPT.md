# Prompt: Set Up Elgato Marketplace Content for a Stream Deck Plugin

Use this prompt when starting a new Stream Deck plugin project that needs Elgato Marketplace content. Copy everything below the line and paste it to the agent.

---

## Task

Set up the `content/` folder for managing Elgato Marketplace listing content for this Stream Deck plugin. This should be a permanent part of the repo, updated with every release.

## What to Create

### 1. `content/description.md` — Plugin Description

Write a compelling marketplace description (under 4,000 characters) based on the plugin's README and manifest. Include:
- What the plugin does (headline + summary paragraph)
- Each action with its features
- Workflow highlights (shared credentials, smart dropdowns, etc.)
- Privacy note (credentials stored locally)
- Requirements (Stream Deck version, OS, etc.)
- Getting Started steps (numbered list)
- Tone: Marketing/enthusiastic — highlight value propositions

Add metadata at the top: last updated version, character limit, current character count.

### 2. `content/release-notes.md` — Release Notes

Write release notes for all existing versions (check git tags with `git tag -l` and `git log` between tags). Format:
- Most recent version first
- Each entry: version, date, summary, bullet points of user-facing changes
- Character count noted per entry
- Only user-facing changes — skip internal refactors, test changes, docs-only changes

### 3. `content/marketplace-content.html` — Copy-Paste Ready HTML

**This is critical.** The Elgato Marketplace developer portal uses a WYSIWYG editor. Markdown doesn't paste correctly.

Create an HTML file that the user opens in a browser, selects content, and pastes directly into the WYSIWYG editor with formatting preserved. Must include:
- The full description as formatted HTML (bold, lists, headings)
- Tabbed release notes for each version (JavaScript tabs, newest first)
- Live character counters for description and each release note
- White content boxes on dark background (content boxes must have white bg so the copied text has proper formatting)
- Instructions at the top explaining how to use (Ctrl+A in the box → Ctrl+C → paste)
- Styled page wrapper (dark theme is nice but the copy areas must be white/light for clean paste)

### 4. `content/assets/` — SVG Sources + Generated PNGs

Create SVG source files for all marketplace assets. **Do NOT use copyrighted logos** — use original artwork only.

**Style**: Stream Deck dark theme
- Background: `#0d1117` to `#161b22` gradient
- Text primary: `#ffffff`, secondary: `#9ca3af`
- Use the plugin's own color palette from its key renderer / UI design guide
- Key mockups should show the accent bar pattern used by the plugin's actual keys

**Assets to create:**
- `icon.svg` (288×288) — Plugin identity. Show a visual motif representing the plugin's purpose + the plugin name.
- `thumbnail.svg` (1920×960) — Hero image. Plugin name, tagline, mockup of Stream Deck keys, feature highlights strip at bottom.
- `gallery-1-*.svg` (1920×960) — All actions overview: mockup of a Stream Deck with all action keys displayed.
- `gallery-2-*.svg` (1920×960) — Setup/configuration flow: show the setup window and property inspector mockups, 3-step flow.
- `gallery-3-*.svg` (1920×960) — Status states: show all the different states/colors the keys can display.
- At least one more gallery image showing metric cycling, key press interaction, or another distinctive feature.

### 5. Update Project Documentation

- Add `content/CONTENT-GUIDE.md` to the companion guides table in AGENTS.md
- Add `npm run content:assets` to the commands section
- Add `content/` to the architecture/directory structure section
- Add "Post-release — Update Elgato Marketplace Content" to the release checklist

## Important Rules

1. **No copyrighted logos.** Do not use third-party brand marks in the assets. Use original artwork only.
2. **SVGs are the source of truth** for images. PNGs are generated and should be regenerated after SVG edits.
3. **Markdown files are the source of truth** for text. The HTML file must be kept in sync manually.
4. **Character limits are hard limits.** The Elgato portal will reject content that exceeds them.
5. **Minimum 3 gallery images required** by Elgato.
6. **The HTML copy-paste approach exists because** the Elgato Marketplace uses a WYSIWYG editor that doesn't accept markdown. Users need formatted HTML they can copy-paste with bold, lists, and headings preserved.

## After Setup

Run `npm run content:assets` to generate the initial PNGs and verify they render correctly and are within size limits:
- Icon: ≤2 MB
- Thumbnail: ≤5 MB
- Gallery: ≤10 MB each
