# Contributions: stream-deck-cloudflare-utilities

> Source: [stream-deck-cloudflare-utilities](https://github.com/pedrofuentes/stream-deck-cloudflare-utilities)
> **Status**: ✅ Merged into `LEARNINGS.md` on February 22, 2026

## Stats
- **Test count**: 582 tests
- **Source files**: 14+ TypeScript files
- **Actions**: 4 (Cloudflare Status, Worker Deployment Status, AI Gateway Metric, Worker Analytics)
- **Services**: 6+ (cloudflare-api-client, cloudflare-workers-api, cloudflare-ai-gateway-api, global-settings-store, key-image-renderer, marquee-controller)
- **Release**: v1.1.1

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
