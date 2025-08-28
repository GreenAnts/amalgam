/**
 * Generic utility helpers for the game
 * Provides deep copy, RNG, array helpers, and other common utilities
 */

/**
 * Deep copy an object or array
 * @param {any} obj - The object to copy
 * @returns {any} - A deep copy of the object
 */
export function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepCopy(item));
    }
    
    if (typeof obj === 'object') {
        const copy = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy(obj[key]);
            }
        }
        return copy;
    }
    
    return obj;
}

/**
 * Seeded random number generator
 */
export class RNG {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Generate next random number
     * @returns {number} - Random number between 0 and 1
     */
    next() {
        this.state = (this.state * 9301 + 49297) % 233280;
        return this.state / 233280;
    }

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random integer
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Choose random element from array
     * @param {Array} array - Array to choose from
     * @returns {any} - Random element
     */
    choice(array) {
        if (array.length === 0) return null;
        return array[this.nextInt(0, array.length - 1)];
    }

    /**
     * Shuffle array in place
     * @param {Array} array - Array to shuffle
     * @returns {Array} - Shuffled array
     */
    shuffle(array) {
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
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Check if two arrays have the same elements (order doesn't matter)
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} - Whether arrays have same elements
 */
export function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((val, index) => val === sorted2[index]);
}

/**
 * Get unique values from array
 * @param {Array} array - Input array
 * @returns {Array} - Array with unique values
 */
export function unique(array) {
    return [...new Set(array)];
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First x coordinate
 * @param {number} y1 - First y coordinate
 * @param {number} x2 - Second x coordinate
 * @param {number} y2 - Second y coordinate
 * @returns {number} - Distance between points
 */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if a point is within a circle
 * @param {number} px - Point x coordinate
 * @param {number} py - Point y coordinate
 * @param {number} cx - Circle center x coordinate
 * @param {number} cy - Circle center y coordinate
 * @param {number} radius - Circle radius
 * @returns {boolean} - Whether point is inside circle
 */
export function pointInCircle(px, py, cx, cy, radius) {
    return distance(px, py, cx, cy) <= radius;
}


