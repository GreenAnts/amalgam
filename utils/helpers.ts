/**
 * Generic utility helpers for the game
 * Provides deep copy, RNG, array helpers, and other common utilities
 */

/**
 * Deep copy an object or array
 * @param obj - The object to copy
 * @returns A deep copy of the object
 */
export function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T;
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepCopy(item)) as T;
    }
    
    if (typeof obj === 'object') {
        const copy: Record<string, any> = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy((obj as any)[key]);
            }
        }
        return copy as T;
    }
    
    return obj;
}

/**
 * Seeded random number generator
 */
export class RNG {
    private state: number;
    public readonly seed: number;

    constructor(seed: number = Date.now()) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Generate next random number
     * @returns Random number between 0 and 1
     */
    next(): number {
        this.state = (this.state * 9301 + 49297) % 233280;
        return this.state / 233280;
    }

    /**
     * Generate random integer between min and max (inclusive)
     * @param min - Minimum value
     * @param max - Maximum value
     * @returns Random integer
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Choose random element from array
     * @param array - Array to choose from
     * @returns Random element or null if array is empty
     */
    choice<T>(array: T[]): T | null {
        if (array.length === 0) return null;
        return array[this.nextInt(0, array.length - 1)];
    }

    /**
     * Shuffle array in place
     * @param array - Array to shuffle
     * @returns Shuffled array
     */
    shuffle<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Check if two arrays have the same elements (order doesn't matter)
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Whether arrays have same elements
 */
export function arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((val, index) => val === sorted2[index]);
}

/**
 * Get unique values from array
 * @param array - Input array
 * @returns Array with unique values
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

/**
 * Debounce a function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | undefined;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait) as number;
    };
}

/**
 * Throttle a function
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return function(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Calculate distance between two points
 * @param x1 - First x coordinate
 * @param y1 - First y coordinate
 * @param x2 - Second x coordinate
 * @param y2 - Second y coordinate
 * @returns Distance between points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if a point is within a circle
 * @param px - Point x coordinate
 * @param py - Point y coordinate
 * @param cx - Circle center x coordinate
 * @param cy - Circle center y coordinate
 * @param radius - Circle radius
 * @returns Whether point is inside circle
 */
export function pointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean {
    return distance(px, py, cx, cy) <= radius;
}