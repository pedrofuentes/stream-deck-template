/**
 * Shared type definitions for the __PLUGIN_NAME__ plugin.
 *
 * @author __AUTHOR_SHORT__ <__AUTHOR_EMAIL__>
 * @copyright __AUTHOR_NAME__
 * @license MIT
 */

import type { JsonValue } from "@elgato/utils";

/**
 * Global settings shared across all actions — stored once at the plugin level.
 * Add fields here for credentials, tokens, or other plugin-wide configuration.
 */
export interface GlobalSettings {
	/** Example: API token or credential */
	apiToken?: string;
	[key: string]: JsonValue;
}

/**
 * Per-action settings for __ACTION_DISPLAY__.
 * Each button instance has its own copy of these settings.
 */
export interface __ACTION_CLASS__Settings {
	/** Example: resource identifier */
	resource?: string;
	/** Refresh interval in seconds */
	refreshInterval?: number;
	[key: string]: JsonValue;
}
