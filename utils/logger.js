/**
 * Logger utility for consistent logging across the application
 * Provides debug, info, warn, and error levels with easy disable capability
 */

class Logger {
    constructor() {
        this.enabled = true;
        this.level = 'info'; // debug, info, warn, error
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    }

    /**
     * Set the minimum log level
     * @param {string} level - The minimum level to log
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        }
    }

    /**
     * Enable or disable logging
     * @param {boolean} enabled - Whether logging should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Check if a level should be logged
     * @param {string} level - The level to check
     * @returns {boolean} - Whether the level should be logged
     */
    shouldLog(level) {
        return this.enabled && this.levels[level] >= this.levels[this.level];
    }

    /**
     * Log a debug message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log an info message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}

// Export a singleton instance
export const logger = new Logger();
