/**
 * Logger utility for consistent logging across the application
 * Provides debug, info, warn, and error levels with easy disable capability
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private enabled: boolean = true;
    private level: LogLevel = 'info';
    private readonly levels: Record<LogLevel, number> = { 
        debug: 0, 
        info: 1, 
        warn: 2, 
        error: 3 
    };

    /**
     * Set the minimum log level
     * @param level - The minimum level to log
     */
    setLevel(level: LogLevel): void {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        }
    }

    /**
     * Enable or disable logging
     * @param enabled - Whether logging should be enabled
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if a level should be logged
     * @param level - The level to check
     * @returns Whether the level should be logged
     */
    private shouldLog(level: LogLevel): boolean {
        return this.enabled && this.levels[level] >= this.levels[this.level];
    }

    /**
     * Log a debug message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log an info message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    /**
     * Log a warning message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    /**
     * Log an error message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}

// Export a singleton instance
export const logger = new Logger();