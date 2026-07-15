/**
 * Centralized constants for the Vibe Browser extension
 */

/**
 * Z-Index hierarchy for overlays
 * Higher values appear on top
 */
export const Z_INDEX = {
    TOOLBAR: 2147483647,      // Highest - always on top
    DEVTOOLS: 2147483646,     // DevTools overlay
    PICKER_OVERLAY: 2147483645, // Element picker overlay
    SNIPPER_OVERLAY: 2147483644 // Screenshot snipper overlay
} as const;

/**
 * Toolbar height in pixels
 */
export const TOOLBAR_HEIGHT = 75;

/**
 * DevTools configuration
 */
export const DEVTOOLS_CONFIG = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    LOADING_TIMEOUT_MS: 5000
} as const;
