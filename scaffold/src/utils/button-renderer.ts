/**
 * SVG-based key image renderer for Stream Deck buttons.
 *
 * Generates 144×144 SVG images with:
 * - Color-coded accent bar at the top (6 px)
 * - Up to 3 lines of text with controlled sizing
 * - High contrast for OLED displays
 * - Safe XML escaping
 *
 * CRITICAL: Encoding must be data:image/svg+xml,{encodeURIComponent(svg)}
 * Do NOT use charset=utf8 or base64 — they don't render on Stream Deck hardware.
 *
 * CRITICAL: Do NOT use nested <svg> elements — Stream Deck's renderer doesn't
 * support them. Use <g transform="translate(x,y) scale(s)"> instead.
 *
 * @author __AUTHOR_SHORT__ <__AUTHOR_EMAIL__>
 * @copyright __AUTHOR_NAME__
 * @license MIT
 */

/** Color palette — customize for your plugin's theme */
export const COLORS = {
	background: "#0d1117",
	surface: "#161b22",
	textPrimary: "#e6edf3",
	textMuted: "#8b949e",
	border: "#30363d",
	// Add your accent colors here:
	accent: "#58a6ff",
	success: "#3fb950",
	error: "#f85149",
	warning: "#d29922",
} as const;

/** Options for rendering a key image */
export interface KeyImageOptions {
	/** Top line (small, muted) */
	line1?: string;
	/** Middle line (large, bold, white) */
	line2: string;
	/** Bottom line (small, muted) */
	line3?: string;
	/** Color of the accent bar at the top */
	accentColor: string;
}

/** Escape special XML characters for safe embedding in SVG */
export function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Truncate text to a max length, adding ".." if truncated */
function truncate(text: string, maxLen: number): string {
	return text.length > maxLen ? text.slice(0, maxLen - 2) + ".." : text;
}

/**
 * Render a standard key image with up to 3 lines of text and an accent bar.
 *
 * Layout (144×144):
 * - 6px accent bar at top
 * - line1 at y=50 (18px, muted)
 * - line2 at y=80 (30px, bold white)
 * - line3 at y=110 (15px, muted)
 */
export function renderKeyImage(options: KeyImageOptions): string {
	const { line1, line2, line3, accentColor } = options;

	const line1Xml = line1
		? `<text x="72" y="50" text-anchor="middle" fill="${COLORS.textMuted}" font-family="Arial,Helvetica,sans-serif" font-size="18">${escapeXml(truncate(line1, 14))}</text>`
		: "";

	const line3Xml = line3
		? `<text x="72" y="110" text-anchor="middle" fill="${COLORS.textMuted}" font-family="Arial,Helvetica,sans-serif" font-size="15">${escapeXml(truncate(line3, 18))}</text>`
		: "";

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
		<rect width="144" height="144" rx="16" fill="${COLORS.background}"/>
		<rect width="144" height="6" rx="3" fill="${accentColor}"/>
		${line1Xml}
		<text x="72" y="80" text-anchor="middle" fill="${COLORS.textPrimary}" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="bold">${escapeXml(truncate(line2, 12))}</text>
		${line3Xml}
	</svg>`;

	return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** Render a loading state with animated dots */
export function renderLoadingImage(): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
		<rect width="144" height="144" rx="16" fill="${COLORS.background}"/>
		<rect width="144" height="6" rx="3" fill="${COLORS.border}"/>
		<circle cx="52" cy="72" r="6" fill="${COLORS.textMuted}">
			<animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0s"/>
		</circle>
		<circle cx="72" cy="72" r="6" fill="${COLORS.textMuted}">
			<animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.2s"/>
		</circle>
		<circle cx="92" cy="72" r="6" fill="${COLORS.textMuted}">
			<animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.4s"/>
		</circle>
	</svg>`;
	return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** Render an error state */
export function renderErrorImage(message: string = "Error"): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
		<rect width="144" height="144" rx="16" fill="${COLORS.background}"/>
		<rect width="144" height="6" rx="3" fill="${COLORS.error}"/>
		<text x="72" y="70" text-anchor="middle" fill="${COLORS.error}" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="bold">⚠</text>
		<text x="72" y="100" text-anchor="middle" fill="${COLORS.textMuted}" font-family="Arial,Helvetica,sans-serif" font-size="14">${escapeXml(truncate(message, 16))}</text>
	</svg>`;
	return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** Render an unconfigured state prompting user to set up */
export function renderUnconfiguredImage(): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
		<rect width="144" height="144" rx="16" fill="${COLORS.background}"/>
		<rect width="144" height="6" rx="3" fill="${COLORS.border}"/>
		<text x="72" y="65" text-anchor="middle" fill="${COLORS.textMuted}" font-family="Arial,Helvetica,sans-serif" font-size="36">⚙</text>
		<text x="72" y="100" text-anchor="middle" fill="${COLORS.textMuted}" font-family="Arial,Helvetica,sans-serif" font-size="14">Setup Required</text>
	</svg>`;
	return "data:image/svg+xml," + encodeURIComponent(svg);
}
