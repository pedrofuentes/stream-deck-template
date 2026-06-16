# Contributions: stream-deck-cloudflare-utilities

> Source: [stream-deck-cloudflare-utilities](https://github.com/pedrofuentes/stream-deck-cloudflare-utilities)
> **Status**: ✅ Merged into `LEARNINGS.md` on February 22, 2026

## Stats
- **Test count**: 1,081 tests
- **Source files**: 28+ TypeScript files
- **Actions**: 10 (Cloudflare Status, Worker Deployment Status, AI Gateway Metric, Worker Analytics, Pages Deployment Status, DNS Record Monitor, Zone Analytics, R2 Storage Metric, D1 Database Metric, KV Namespace Metric)
- **Services**: 14+ (cloudflare-api-client, cloudflare-workers-api, cloudflare-ai-gateway-api, cloudflare-pages-api, cloudflare-dns-api, cloudflare-zone-analytics-api, cloudflare-r2-api, cloudflare-d1-api, cloudflare-kv-api, cloudflare-worker-analytics-api, global-settings-store, key-image-renderer, marquee-controller, polling-coordinator)
- **Release**: v1.2.0

## Key Topics Contributed
- Accent bar pattern for status indication
- Centralized key-image renderer
- OLED-tested color palette (`STATUS_COLORS`)
- Compact number formatting for tiny keys
- `UserTitleEnabled` placement at action level (not inside `States`)
- Global settings pub/sub store
- Setup window popup pattern (shared credentials)
- Adaptive polling based on state
- Generation counter for stale timer prevention
- Rate limit handling with `Retry-After` backoff
- Key-press cycling without API refetch
- Circular marquee for long names
- Real-time seconds display
- Thorough cleanup on disappear
- `ensureOption` dropdown hydration
- Auto-save with debounced API calls
- Service layer with no SDK dependencies
- Monochrome white action icons
- Reset functions for singleton stores in tests
- Parallel API testing patterns

### v1.1.0 / v1.1.1 Contributions (merged February 22, 2026)
- PollingCoordinator — extracted shared polling/backoff logic into reusable class
- `validate:consistency` script — 11-check plugin consistency validator in prepack pipeline
- Statuspage.io API workaround — CloudFront WAF blocks direct status domains
- Error backoff reset on key press — manual retry resets exponential backoff
- Plugin source/release directory separation — `plugin/` for source assets, `release/` for build output
- Post-release roadmap update — mandatory step after every release
- FilterableSelect searchable dropdown component added to all PIs
- Branch naming conventions — `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`

### v1.1.2 / v1.1.3 Contributions (merged February 22, 2026)
- Elgato Marketplace content pipeline — `content/` folder with CONTENT-GUIDE.md, description.md, release-notes.md, marketplace-content.html, SVG assets, and PNG generation
- WYSIWYG copy-paste HTML approach — solves the Elgato Marketplace WYSIWYG editor limitation
- `content:assets` npm script — SVG to PNG conversion using `@resvg/resvg-js`
- Gallery image design guidelines — Stream Deck dark theme mockup patterns
- SETUP-PROMPT.md — one-shot prompt to bootstrap marketplace content for any new plugin
- Post-release marketplace content update — mandatory step in release checklist
- Release notes and description character limit management

### v1.2.0 Contributions (February 24, 2026)
- 6 new actions: Pages Deployment Status, DNS Record Monitor, Zone Analytics, R2 Storage Metric, D1 Database Metric, KV Namespace Metric
- Unified `formatTimeAgo` with style options — DRY consolidation of 3 duplicate implementations into 1 with `{ style: "compact" | "long" }` option
- Multiple marquee controllers per action — DNS Record Monitor uses 3 independent MarqueeControllers for name, content, and detail lines
- Non-cycling action pattern — key press triggers manual refresh instead of metric cycling (DNS, Pages)
- Cloudflare GraphQL API dataset name pitfalls — documented that dataset names are NOT guessable (`kvOperationsAdaptiveGroups` not `workersKvStorageAdaptiveGroups`), fields vary between datasets
- REST API fallback strategy — prefer REST when GraphQL dataset existence is unconfirmed (e.g., D1 database size via `/d1/database/{id}`)
- Display name tracking — save both resource ID and human-readable name in settings, use `displayName ?? resourceId` everywhere
- Systematic action test rewrite pattern — comprehensive coverage strategy (lifecycle, coordinator, marquee, error backoff, global settings) that brought coverage from ~65% to 94%
- `display refresh interval` pattern for Pages — 60-second timer re-renders from cached data to update "Xm ago" text without API calls
- `resolveState` priority pattern — failed > building > success for deployment status resolution

### Dependency Security Maintenance (post-v1.2.1)
- Vite 8 breaks `@action` TC39 decorators in the Vitest pipeline — pin `vite` to `^7.3.2` via `overrides` (bumping `vitest` to fix a CVE silently pulls vite 8)
- Bulk Dependabot fix workflow — direct-dep bumps → `npm audit fix` → scoped `overrides` for transitive deps; verify with `npm audit` **and** `npm audit --omit=dev`
- Scoped nested overrides — `parent > child` nesting avoids forcing an incompatible major onto an unrelated consumer (e.g. minimatch 10 vs minimatch 5)
- Advisory ceilings move over time — trust live `npm audit`, not the Dependabot alert's original "first patched version" (`tar`/`ws` ceilings rose; a new `brace-expansion` advisory surfaced mid-fix)
- `ws` is a runtime dependency that ships in the plugin (via `@elgato/streamdeck`) — keep overrides on the same major (8.x) and smoke-test the Stream Deck connection
- Result: 18 Dependabot alerts (1 critical, 11 high, 4 moderate, 2 low) → 0; `npm audit` clean (full tree + runtime-only); all 1,081 tests still green; `package.json` + `package-lock.json` only (no source changes)

---

## Dependency Security Maintenance (New)

### [Build/Testing] — Vite 8 Breaks TC39 Decorators in the Vitest Transform

**Discovered in**: cloudflare-utilities
**Date**: 2026-06-15
**Severity**: critical

**Problem**: Bumping `vitest` to fix a critical advisory (`^4.0.18 → ^4.1.0`, resolved 4.1.9) silently pulled **vite 8** (vitest's vite range is `^6 || ^7 || ^8`). With vite 8, every action test suite failed to even parse:

```
FAIL  tests/actions/cloudflare-status.test.ts
SyntaxError: Invalid or unexpected token
 Test Files  10 failed | 16 passed (26)
```

The error has **no file/line location**, and only the `tests/actions/*` suites failed — every `tests/services/*` suite passed. The tell: action sources use the Stream Deck `@action({ UUID })` class decorator; services don't. The project has **no `experimentalDecorators`** in tsconfig (`target: ES2022`), so these are TC39 *standard* decorators, and vite 8's transform chokes on them.

**Solution**: Stay on the known-good vite major by pinning it via `overrides`. vite `7.3.2+` is also the patched version for the vite advisories, so security is preserved:

```jsonc
// package.json
"overrides": {
  "esbuild": "^0.28.1",
  "vite": "^7.3.2"   // resolves to 7.3.5 — avoids the vite 8 decorator breakage
}
```

After pinning: all 26 suites / 1,081 tests pass and `npm audit` = 0.

**Prevention**: When bumping `vitest` (or anything that pulls `vite`), pin `vite` to the last working major in `overrides`. If `tests/actions/*` suddenly fail with a **locationless** `SyntaxError: Invalid or unexpected token` while `tests/services/*` pass, suspect a vite/esbuild major bump breaking the `@action` decorator transform — not your test code. (If you must move to vite 8, configure a decorators transform / `experimentalDecorators` for the vitest esbuild step.)

---

### [Dependency Management] — Bulk Dependabot Fix Workflow (Overrides-First)

**Discovered in**: cloudflare-utilities
**Date**: 2026-06-15
**Severity**: important

**Problem**: 18 open Dependabot alerts, almost all dev/transitive, several pinned deep in the tree (via `@elgato/cli`, `@elgato/streamdeck`, `rimraf`, `vitest`). Plain `npm install` does **not** upgrade already-locked transitive deps, so bumping direct deps alone left most alerts open.

**Solution**: A three-layer pass, smallest blast radius first:
1. Bump the **direct** deps that own fixes (`vitest`, `@vitest/coverage-v8`, `rollup`, `@elgato/cli`, `@elgato/streamdeck`).
2. Run **`npm audit fix`** to pull transitive patches that existing semver ranges already allow.
3. Add **`overrides`** for the rest (parents cap below the patch, e.g. `esbuild`, `vite`).

Verify with **both** `npm audit` and `npm audit --omit=dev` (the latter proves the shipped *runtime* tree is clean). Keep the diff limited to `package.json` + `package-lock.json` — no source edits.

**Prevention**: Reach for `overrides` whenever a transitive advisory's patched version is outside its parent's range; don't wait for the upstream parent to release a bump. Always confirm runtime-only cleanliness separately from the full dev tree.

---

### [Dependency Management] — Scope Overrides to Avoid Cross-Major Breakage

**Discovered in**: cloudflare-utilities
**Date**: 2026-06-15
**Severity**: nice-to-know

**Problem**: A blanket `overrides` entry forces *every* copy of a package to one version. Two consumers needed different majors of the same dep:
- `glob@13 → minimatch@10` (uses `brace-expansion@5`)
- `filelist → minimatch@5` (uses `brace-expansion@2`, which had the vulnerable build)

A flat `"brace-expansion": "^2.0.3"` would have dragged minimatch 10's dependency down to 2.x and broken it (and a `"minimatch": "^10"` override would have broken filelist).

**Solution**: Use **nested** (`parent > child`) overrides to scope the fix to a single subtree:

```jsonc
"overrides": {
  "filelist": {
    "minimatch": {
      "brace-expansion": "^2.0.3"   // only the filelist → minimatch@5 path
    }
  }
}
```

**Prevention**: Before writing a flat override, run `npm ls <pkg> --all` to see how many majors are in play. If more than one, nest the override under the specific parent path.

---

### [Dependency Management] — Advisory Ceilings Move; Trust Live `npm audit`

**Discovered in**: cloudflare-utilities
**Date**: 2026-06-15
**Severity**: nice-to-know

**Problem**: Dependabot's per-alert "first patched version" is a point-in-time value. Between alert creation and the fix, advisory ranges widened: `tar`'s vulnerable ceiling rose to ≤ 7.5.15 (needed 7.5.16) and `ws`'s to ≤ 8.20.1 (needed 8.21.0), and a brand-new `brace-expansion` moderate surfaced mid-fix. Targeting the originally-suggested versions would have left the tree vulnerable.

**Solution**: Treat **live `npm audit`** as the source of truth for target versions; re-audit after every change and iterate until 0. Resolve each package to the latest patched build within its compatible major (`ws 8.21.0`, `tar 7.5.16`, `lodash 4.18.1`, `fast-uri 3.1.2`, `minimatch 10.2.5`/`5.1.9`, `picomatch 4.0.4`, `esbuild 0.28.1`).

**Prevention**: Don't hard-code the version from the Dependabot alert body; let `npm audit` drive, and add a final `npm audit` exit-code check to the release gate.

---

### [Runtime] — `ws` Is a Runtime Dependency That Ships in the Plugin

**Discovered in**: cloudflare-utilities
**Date**: 2026-06-15
**Severity**: nice-to-know

**Problem**: `ws` (the WebSocket lib the SDK uses to talk to Stream Deck) is the **only** runtime-scoped vulnerable dep — it's bundled into the shipped `.streamDeckPlugin`. It arrives transitively via `@elgato/streamdeck`, whose range (`^8.19.0`) didn't force the patched build into the lockfile.

**Solution**: Patch it (here 8.19.0 → 8.21.0) but **keep it on the same major (8.x)** so the SDK's WebSocket API stays compatible. Because it's runtime, validate with `npm audit --omit=dev` plus a device smoke test (`streamdeck restart …`, confirm keys connect/render) — not just the dev test suite.

**Prevention**: Flag runtime-scoped advisories specially — they warrant a hardware smoke test and arguably a patch release, unlike dev-only transitive fixes.
