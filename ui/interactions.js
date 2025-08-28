/**
 * User interaction handlers for the Amalgam game board
 * Translates raw mouse events into structured move intents
 * Emits events/callbacks to GameManager for processing
 */

import { logger } from '../utils/logger.js';
import { pointInCircle } from '../utils/helpers.js';

/**
 * @typedef {Object} MoveIntent
 * @property {Array<number>} coords - Vector2 coordinates [x, y]
 * @property {string} type - Intent type ('click', 'hover', 'select')
 * @property {Object} [meta] - Additional metadata
 */

/**
 * Interaction manager for handling user input
 */
export class InteractionManager {
    constructor(svgElement, board) {
        this.svgElement = svgElement;
        this.board = board;
        this.enabled = false;
        
        // Callbacks
        this.moveIntentCallback = null;
        this.hoverCallback = null;
        this.selectCallback = null;
        
        // State
        this.selectedCoords = null;
        this.hoveredCoords = null;
        
        // Event listeners
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        
        this.setupEventListeners();
    }

    /**
     * Set callback for move intents
     * @param {Function} callback - Callback function
     */
    setMoveIntentCallback(callback) {
        this.moveIntentCallback = callback;
    }

    /**
     * Set callback for hover events
     * @param {Function} callback - Callback function
     */
    setHoverCallback(callback) {
        this.hoverCallback = callback;
    }

    /**
     * Set callback for selection events
     * @param {Function} callback - Callback function
     */
    setSelectCallback(callback) {
        this.selectCallback = callback;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.svgElement.addEventListener('click', this.boundHandleClick);
        this.svgElement.addEventListener('mousemove', this.boundHandleMouseMove);
        this.svgElement.addEventListener('mouseleave', this.boundHandleMouseLeave);
        
        logger.debug('Interaction event listeners set up');
    }

    /**
     * Handle click events
     * @param {MouseEvent} event - Click event
     */
    handleClick(event) {
        if (!this.enabled) return;
        
        const coords = this.getCoordsFromEvent(event);
        if (coords) {
            logger.debug('Click at coordinates:', coords);
            
            // Generate move intent
            const moveIntent = {
                coords: coords,
                type: 'click',
                meta: {
                    event: event,
                    timestamp: Date.now()
                }
            };
            
            // Emit move intent
            if (this.moveIntentCallback) {
                this.moveIntentCallback(moveIntent);
            }
            
            // Handle selection
            this.handleSelection(coords);
        }
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse move event
     */
    handleMouseMove(event) {
        if (!this.enabled) return;
        
        const coords = this.getCoordsFromEvent(event);
        
        // Check if hovered coordinates changed
        if (!this.coordsEqual(coords, this.hoveredCoords)) {
            this.hoveredCoords = coords;
            
            if (coords) {
                logger.debug('Hover at coordinates:', coords);
                
                // Generate hover intent
                const hoverIntent = {
                    coords: coords,
                    type: 'hover',
                    meta: {
                        event: event,
                        timestamp: Date.now()
                    }
                };
                
                // Emit hover callback
                if (this.hoverCallback) {
                    this.hoverCallback(coords);
                }
            } else {
                // Clear hover
                if (this.hoverCallback) {
                    this.hoverCallback(null);
                }
            }
        }
    }

    /**
     * Handle mouse leave events
     * @param {MouseEvent} event - Mouse leave event
     */
    handleMouseLeave(event) {
        if (!this.enabled) return;
        
        this.hoveredCoords = null;
        
        // Clear hover
        if (this.hoverCallback) {
            this.hoverCallback(null);
        }
        
        logger.debug('Mouse left board area');
    }

    /**
     * Handle selection
     * @param {Array<number>} coords - Selected coordinates
     */
    handleSelection(coords) {
        if (!this.enabled) return;
        
        // Update selected coordinates
        this.selectedCoords = coords;
        
        logger.debug('Selection at coordinates:', coords);
        
        // Emit selection callback
        if (this.selectCallback) {
            this.selectCallback(coords);
        }
    }

    /**
     * Get coordinates from mouse event
     * @param {MouseEvent} event - Mouse event
     * @returns {Array<number>|null} - Vector2 coordinates or null
     */
    getCoordsFromEvent(event) {
        const rect = this.svgElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert SVG coordinates to board coordinates
        return this.svgToBoardCoords(x, y);
    }

    /**
     * Convert SVG coordinates to board coordinates
     * @param {number} svgX - SVG X coordinate
     * @param {number} svgY - SVG Y coordinate
     * @returns {Array<number>|null} - Board coordinates or null
     */
    svgToBoardCoords(svgX, svgY) {
        const { coordinateScale, centerOffset } = this.board;
        
        // Convert to board coordinate system
        const boardX = Math.round((svgX - centerOffset[0]) / coordinateScale);
        const boardY = Math.round((centerOffset[1] - svgY) / coordinateScale);
        
        // Check if coordinates are within valid range
        const maxCoord = Math.floor(this.board.width / (2 * this.board.coordinateScale));
        
        if (boardX >= -maxCoord && boardX <= maxCoord && 
            boardY >= -maxCoord && boardY <= maxCoord) {
            return [boardX, boardY];
        }
        
        return null;
    }

    /**
     * Convert board coordinates to SVG coordinates
     * @param {Array<number>} boardCoords - Board coordinates [x, y]
     * @returns {Array<number>} - SVG coordinates [x, y]
     */
    boardToSvgCoords(boardCoords) {
        const { coordinateScale, centerOffset } = this.board;
        const [boardX, boardY] = boardCoords;
        
        const svgX = centerOffset[0] + (boardX * coordinateScale);
        const svgY = centerOffset[1] - (boardY * coordinateScale);
        
        return [svgX, svgY];
    }

    /**
     * Check if two coordinate arrays are equal
     * @param {Array<number>|null} coords1 - First coordinates
     * @param {Array<number>|null} coords2 - Second coordinates
     * @returns {boolean} - Whether coordinates are equal
     */
    coordsEqual(coords1, coords2) {
        if (!coords1 && !coords2) return true;
        if (!coords1 || !coords2) return false;
        return coords1[0] === coords2[0] && coords1[1] === coords2[1];
    }

    /**
     * Set selected coordinates
     * @param {Array<number>} coords - Coordinates to select
     */
    setSelectedCoords(coords) {
        this.selectedCoords = coords;
    }

    /**
     * Get selected coordinates
     * @returns {Array<number>|null} - Selected coordinates
     */
    getSelectedCoords() {
        return this.selectedCoords;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedCoords = null;
        this.hoveredCoords = null;
    }

    /**
     * Enable or disable interactions
     * @param {boolean} enabled - Whether interactions are enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (enabled) {
            this.svgElement.style.pointerEvents = 'auto';
        } else {
            this.svgElement.style.pointerEvents = 'none';
            this.clearSelection();
        }
        
        logger.debug('Interactions enabled:', enabled);
    }

    /**
     * Check if interactions are enabled
     * @returns {boolean} - Whether interactions are enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get intersection at coordinates
     * @param {Array<number>} coords - Board coordinates
     * @returns {Object|null} - Intersection data or null
     */
    getIntersectionAtCoords(coords) {
        const [x, y] = coords;
        
        // Find intersection with matching coordinates
        for (const intersection of this.board.intersections) {
            if (intersection.coords && intersection.coords[0] === x && intersection.coords[1] === y) {
                return intersection;
            }
        }
        
        return null;
    }

    /**
     * Check if coordinates are valid board positions
     * @param {Array<number>} coords - Board coordinates
     * @returns {boolean} - Whether coordinates are valid
     */
    isValidCoords(coords) {
        if (!coords || coords.length !== 2) return false;
        
        const [x, y] = coords;
        // Check if coordinates are within the board bounds
        // We'll use a simple range check based on the board size
        const maxCoord = Math.floor(this.board.width / (2 * this.board.coordinateScale));
        return x >= -maxCoord && x <= maxCoord && 
               y >= -maxCoord && y <= maxCoord;
    }

    /**
     * Get all valid board coordinates
     * @returns {Array<Array<number>>} - Array of valid coordinates
     */
    getAllValidCoords() {
        const coords = [];
        const maxCoord = Math.floor(this.board.width / (2 * this.board.coordinateScale));
        
        for (let x = -maxCoord; x <= maxCoord; x++) {
            for (let y = -maxCoord; y <= maxCoord; y++) {
                coords.push([x, y]);
            }
        }
        
        return coords;
    }

    /**
     * Get coordinates within a certain distance
     * @param {Array<number>} centerCoords - Center coordinates
     * @param {number} distance - Maximum distance
     * @returns {Array<Array<number>>} - Array of coordinates within distance
     */
    getCoordsWithinDistance(centerCoords, distance) {
        const coords = [];
        const [centerX, centerY] = centerCoords;
        
        for (let x = centerX - distance; x <= centerX + distance; x++) {
            for (let y = centerY - distance; y <= centerY + distance; y++) {
                const coords = [x, y];
                if (this.isValidCoords(coords)) {
                    const dist = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
                    if (dist <= distance) {
                        coords.push(coords);
                    }
                }
            }
        }
        
        return coords;
    }

    /**
     * Get adjacent coordinates
     * @param {Array<number>} coords - Center coordinates
     * @returns {Array<Array<number>>} - Array of adjacent coordinates
     */
    getAdjacentCoords(coords) {
        return this.getCoordsWithinDistance(coords, 1).filter(adjCoords => 
            !this.coordsEqual(adjCoords, coords)
        );
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.svgElement.removeEventListener('click', this.boundHandleClick);
        this.svgElement.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.svgElement.removeEventListener('mouseleave', this.boundHandleMouseLeave);
        
        // Clear callbacks
        this.moveIntentCallback = null;
        this.hoverCallback = null;
        this.selectCallback = null;
        
        // Clear state
        this.selectedCoords = null;
        this.hoveredCoords = null;
        
        logger.debug('InteractionManager destroyed');
    }
}

/**
 * Create an interaction manager
 * @param {SVGElement} svgElement - SVG element
 * @param {Object} board - Board object
 * @returns {InteractionManager} - Interaction manager instance
 */
export function createInteractionManager(svgElement, board) {
    return new InteractionManager(svgElement, board);
}
