/**
 * Tests for ExampleAction.
 *
 * Demonstrates the standard testing patterns for Stream Deck actions:
 * - vi.hoisted() + vi.mock() for SDK mocking
 * - SVG assertion helpers
 * - Lifecycle method testing (onWillAppear, onWillDisappear, onKeyDown, onDidReceiveSettings)
 * - Timer management verification
 * - Error state testing
 *
 * @author __AUTHOR_SHORT__ <__AUTHOR_EMAIL__>
 * @copyright __AUTHOR_NAME__
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── SDK Mock (MUST use vi.hoisted + vi.mock at top level) ───────────────────
const mockStreamDeck = vi.hoisted(() => ({
	settings: {
		getGlobalSettings: vi.fn(),
		setGlobalSettings: vi.fn(),
	},
	connect: vi.fn(),
}));

vi.mock("@elgato/streamdeck", () => ({
	default: mockStreamDeck,
	action: () => (target: unknown) => target,
	SingletonAction: class {},
	// If you need additional named exports, add them here.
}));

// ─── Import after mocking ────────────────────────────────────────────────────
import { __ACTION_CLASS__ } from "../../src/actions/example-action";

// ─── Helper: Create a mock action event ──────────────────────────────────────
function createMockEvent(settingsOverrides: Record<string, unknown> = {}) {
	return {
		action: {
			id: "test-action-id",
			setImage: vi.fn().mockResolvedValue(undefined),
			setTitle: vi.fn().mockResolvedValue(undefined),
		},
		payload: {
			settings: {
				resource: "my-resource",
				refreshInterval: 300,
				...settingsOverrides,
			},
		},
	};
}

// ─── SVG Assertion Helpers ───────────────────────────────────────────────────
function assertSvgImage(image: string): string {
	expect(image).toMatch(/^data:image\/svg\+xml,/);
	return decodeURIComponent(image.replace("data:image/svg+xml,", ""));
}

function assertSvgContains(image: string, text: string): void {
	const svg = assertSvgImage(image);
	expect(svg).toContain(text);
}

function assertErrorImage(image: string, errorText?: string): void {
	const svg = assertSvgImage(image);
	expect(svg).toContain("#e74c3c"); // Error color
	if (errorText) expect(svg).toContain(errorText);
}

function assertLoadingImage(image: string): void {
	const svg = assertSvgImage(image);
	expect(svg).toContain("Loading"); // Or animated dots indicator
}

function assertUnconfiguredImage(image: string): void {
	const svg = assertSvgImage(image);
	expect(svg).toContain("Setup"); // Or whatever your unconfigured message is
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("__ACTION_CLASS__", () => {
	let actionInstance: __ACTION_CLASS__;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Default: valid global settings
		mockStreamDeck.settings.getGlobalSettings.mockResolvedValue({
			apiToken: "test-token",
		});

		actionInstance = new __ACTION_CLASS__();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ── onWillAppear ──────────────────────────────────────────────────────
	describe("onWillAppear", () => {
		it("shows unconfigured image when resource is not set", async () => {
			const ev = createMockEvent({ resource: undefined });

			await actionInstance.onWillAppear(ev as never);

			expect(ev.action.setImage).toHaveBeenCalledOnce();
			assertUnconfiguredImage(ev.action.setImage.mock.calls[0][0]);
		});

		it("fetches data and renders button when configured", async () => {
			const ev = createMockEvent({ resource: "my-resource" });

			await actionInstance.onWillAppear(ev as never);

			// Should have called setImage at least twice (loading → result)
			expect(ev.action.setImage).toHaveBeenCalledTimes(2);

			// First call = loading
			assertLoadingImage(ev.action.setImage.mock.calls[0][0]);

			// Second call = rendered data
			const svg = assertSvgImage(ev.action.setImage.mock.calls[1][0]);
			expect(svg).toBeDefined();
		});

		it("starts a polling timer", async () => {
			const ev = createMockEvent({
				resource: "my-resource",
				refreshInterval: 60,
			});

			await actionInstance.onWillAppear(ev as never);

			// Advance timer to trigger refresh
			await vi.advanceTimersByTimeAsync(60_000);

			// setImage should be called again (loading → result for re-fetch)
			expect(ev.action.setImage.mock.calls.length).toBeGreaterThan(2);
		});

		it("shows error when API token is missing", async () => {
			mockStreamDeck.settings.getGlobalSettings.mockResolvedValue({});
			const ev = createMockEvent({ resource: "my-resource" });

			await actionInstance.onWillAppear(ev as never);

			// Last setImage call should be an error
			const lastCall = ev.action.setImage.mock.calls.at(-1)![0];
			assertErrorImage(lastCall, "No Token");
		});
	});

	// ── onWillDisappear ───────────────────────────────────────────────────
	describe("onWillDisappear", () => {
		it("clears the polling timer", async () => {
			const ev = createMockEvent({ resource: "my-resource" });

			await actionInstance.onWillAppear(ev as never);
			await actionInstance.onWillDisappear(ev as never);

			// Advance time — should NOT trigger another refresh
			const callsBefore = ev.action.setImage.mock.calls.length;
			await vi.advanceTimersByTimeAsync(300_000);
			expect(ev.action.setImage.mock.calls.length).toBe(callsBefore);
		});
	});

	// ── onKeyDown ─────────────────────────────────────────────────────────
	describe("onKeyDown", () => {
		it("triggers an immediate refresh", async () => {
			const ev = createMockEvent({ resource: "my-resource" });

			await actionInstance.onKeyDown(ev as never);

			expect(ev.action.setImage).toHaveBeenCalled();
		});

		it("does nothing when resource is not configured", async () => {
			const ev = createMockEvent({ resource: undefined });

			await actionInstance.onKeyDown(ev as never);

			expect(ev.action.setImage).not.toHaveBeenCalled();
		});
	});

	// ── onDidReceiveSettings ──────────────────────────────────────────────
	describe("onDidReceiveSettings", () => {
		it("restarts timer with new interval", async () => {
			const ev = createMockEvent({
				resource: "my-resource",
				refreshInterval: 300,
			});

			// Start with initial settings
			await actionInstance.onWillAppear(ev as never);
			const callsAfterAppear = ev.action.setImage.mock.calls.length;

			// Change to 60-second interval
			const newEv = createMockEvent({
				resource: "my-resource",
				refreshInterval: 60,
			});
			await actionInstance.onDidReceiveSettings(newEv as never);
			const callsAfterSettingsChange = newEv.action.setImage.mock.calls.length;

			// Advance 60s — should trigger refresh at new interval
			await vi.advanceTimersByTimeAsync(60_000);
			expect(newEv.action.setImage.mock.calls.length).toBeGreaterThan(callsAfterSettingsChange);
		});

		it("shows unconfigured when resource is removed", async () => {
			const ev = createMockEvent({ resource: "my-resource" });
			await actionInstance.onWillAppear(ev as never);

			const newEv = createMockEvent({ resource: undefined });
			await actionInstance.onDidReceiveSettings(newEv as never);

			const lastCall = newEv.action.setImage.mock.calls.at(-1)![0];
			assertUnconfiguredImage(lastCall);
		});
	});

	// ── Error handling ────────────────────────────────────────────────────
	describe("error handling", () => {
		it("renders error image on API failure", async () => {
			// Mock global settings to throw
			mockStreamDeck.settings.getGlobalSettings.mockRejectedValue(
				new Error("Network error")
			);

			const ev = createMockEvent({ resource: "my-resource" });
			await actionInstance.onWillAppear(ev as never);

			const lastCall = ev.action.setImage.mock.calls.at(-1)![0];
			assertErrorImage(lastCall);
		});
	});
});
