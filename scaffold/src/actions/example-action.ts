/**
 * Example Action — displays data on a Stream Deck button.
 *
 * Replace this with your actual action implementation.
 * This file demonstrates the standard patterns:
 * - Polling with per-instance timers
 * - SVG button rendering via setImage
 * - Error handling and state management
 *
 * @author __AUTHOR_SHORT__ <__AUTHOR_EMAIL__>
 * @copyright __AUTHOR_NAME__
 * @license MIT
 */

import {
	action,
	KeyDownEvent,
	SingletonAction,
	WillAppearEvent,
	WillDisappearEvent,
	DidReceiveSettingsEvent,
} from "@elgato/streamdeck";
import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings, __ACTION_CLASS__Settings } from "../types";
import {
	renderKeyImage,
	renderLoadingImage,
	renderErrorImage,
	renderUnconfiguredImage,
} from "../utils";

const DEFAULT_REFRESH_INTERVAL = 300; // 5 minutes in seconds

@action({ UUID: "__PLUGIN_ID__.__ACTION_NAME__" })
export class __ACTION_CLASS__ extends SingletonAction<__ACTION_CLASS__Settings> {
	private timers = new Map<string, Timer>();

	/**
	 * Called when the action appears on the Stream Deck.
	 * Sets up initial display and starts the polling timer.
	 */
	override async onWillAppear(ev: WillAppearEvent<__ACTION_CLASS__Settings>): Promise<void> {
		const settings = ev.payload.settings;

		if (!settings.resource) {
			await ev.action.setImage(renderUnconfiguredImage());
			await ev.action.setTitle("");
			return;
		}

		await this.refresh(ev);

		const interval = settings.refreshInterval ?? DEFAULT_REFRESH_INTERVAL;
		this.timers.set(
			ev.action.id,
			setInterval(() => this.refresh(ev), interval * 1000)
		);
	}

	/**
	 * Called when the action disappears from the Stream Deck.
	 * Cleans up the polling timer.
	 */
	override async onWillDisappear(ev: WillDisappearEvent<__ACTION_CLASS__Settings>): Promise<void> {
		const timer = this.timers.get(ev.action.id);
		if (timer) clearInterval(timer);
		this.timers.delete(ev.action.id);
	}

	/**
	 * Called when the user presses the button.
	 * Triggers an immediate refresh.
	 */
	override async onKeyDown(ev: KeyDownEvent<__ACTION_CLASS__Settings>): Promise<void> {
		if (!ev.payload.settings.resource) return;
		await this.refresh(ev);
	}

	/**
	 * Called when settings change in the Property Inspector.
	 * Restarts the timer with new interval and refreshes.
	 */
	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<__ACTION_CLASS__Settings>): Promise<void> {
		// Clear existing timer
		const existingTimer = this.timers.get(ev.action.id);
		if (existingTimer) clearInterval(existingTimer);

		const settings = ev.payload.settings;

		if (!settings.resource) {
			await ev.action.setImage(renderUnconfiguredImage());
			await ev.action.setTitle("");
			this.timers.delete(ev.action.id);
			return;
		}

		await this.refresh(ev);

		const interval = settings.refreshInterval ?? DEFAULT_REFRESH_INTERVAL;
		this.timers.set(
			ev.action.id,
			setInterval(() => this.refresh(ev), interval * 1000)
		);
	}

	/**
	 * Fetches data and updates the button display.
	 */
	private async refresh(ev: { action: { setImage(image: string): Promise<void>; setTitle(title: string): Promise<void> }; payload: { settings: __ACTION_CLASS__Settings } }): Promise<void> {
		const settings = ev.payload.settings;

		// Show loading state
		await ev.action.setImage(renderLoadingImage());
		await ev.action.setTitle("");

		try {
			// Get global settings (e.g., API token)
			const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

			if (!globalSettings.apiToken) {
				await ev.action.setImage(renderErrorImage("No Token"));
				await ev.action.setTitle("");
				return;
			}

			// TODO: Replace with your actual API call
			// const data = await fetchData(globalSettings.apiToken, settings.resource);

			// Render the button with data
			await ev.action.setImage(renderKeyImage({
				line1: "Label",
				line2: "Value",
				line3: settings.resource,
				accentColor: "#58a6ff",
			}));
			await ev.action.setTitle("");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error";
			await ev.action.setImage(renderErrorImage(message));
			await ev.action.setTitle("");
		}
	}
}
