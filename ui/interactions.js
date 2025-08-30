/**
 * User interaction handlers for the Amalgam game board
 * Translates raw mouse events into structured move intents
 * Emits events/callbacks to GameManager for processing
 */
import { logger } from '../utils/logger.js';
/**
 * Interaction manager for handling user input
 */
export class InteractionManager {
    constructor(canvasElement, board) {
        this.enabled = false;
        // Callbacks
        this.moveIntentCallback = null;
        this.hoverCallback = null;
        this.selectCallback = null;
        // State
        this.selectedCoords = null;
        this.hoveredCoords = null;
        this.validMoves = [];
        this.currentPlayer = null;
        logger.debug('InteractionManager constructor: initializing with canvas element');
        this.canvasElement = canvasElement;
        this.board = board;
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        try {
            this.setupEventListeners();
        }
        catch (error) {
            logger.error('InteractionManager constructor: setupEventListeners failed:', error);
        }
        logger.debug('InteractionManager constructor: initialization complete');
    }
    /**
     * Set callback for move intents
     * @param callback - Callback function
     */
    setMoveIntentCallback(callback) {
        logger.debug('InteractionManager.setMoveIntentCallback: Setting callback');
        this.moveIntentCallback = callback;
    }
    /**
     * Set callback for hover events
     * @param callback - Callback function
     */
    setHoverCallback(callback) {
        this.hoverCallback = callback;
    }
    /**
     * Set callback for selection events
     * @param callback - Callback function
     */
    setSelectCallback(callback) {
        this.selectCallback = callback;
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        logger.debug('InteractionManager.setupEventListeners: setting up event listeners on canvas', {
            canvasId: this.canvasElement.id,
            canvasTag: this.canvasElement.tagName
        });
        this.canvasElement.addEventListener('click', this.boundHandleClick);
        this.canvasElement.addEventListener('mousemove', this.boundHandleMouseMove);
        this.canvasElement.addEventListener('mouseleave', this.boundHandleMouseLeave);
        logger.debug('Canvas interaction event listeners set up');
    }
    /**
     * Handle click events
     * @param event - Click event
     */
    handleClick(event) {
        logger.debug('InteractionManager.handleClick: received click event', {
            targetId: event.target?.id,
            canvasId: this.canvasElement.id,
            enabled: this.enabled
        });
        if (!this.enabled) {
            logger.debug('InteractionManager.handleClick: interactions disabled, ignoring click');
            return;
        }
        // Convert canvas coordinates to game coordinates
        const rect = this.canvasElement.getBoundingClientRect();
        const scaleX = this.canvasElement.width / rect.width;
        const scaleY = this.canvasElement.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        // Convert to game coordinates using grid system (25px grid, canvas center at 400,400)
        const originX = this.canvasElement.width / 2;
        const originY = this.canvasElement.height / 2;
        const gridSize = 25;
        const gameX = Math.round((mouseX - originX) / gridSize);
        const gameY = Math.round((originY - mouseY) / gridSize);
        const coords = [gameX, gameY];
        logger.debug('Canvas click converted to game coordinates:', coords, 'from pixel:', mouseX, mouseY);
        // Generate move intent
        const moveIntent = {
            coords: coords,
            type: 'click',
            meta: {
                source: 'canvas-click',
                timestamp: Date.now(),
                clientX: event.clientX,
                clientY: event.clientY
            }
        };
        // Emit move intent
        if (this.moveIntentCallback) {
            logger.debug('InteractionManager.handleClick: calling moveIntentCallback with moveIntent:', moveIntent);
            try {
                this.moveIntentCallback(moveIntent);
            }
            catch (error) {
                logger.error('InteractionManager.handleClick: moveIntentCallback failed:', error);
            }
        }
        else {
            logger.warn('InteractionManager.handleClick: no moveIntentCallback set');
        }
        // Handle selection
        this.handleSelection(coords);
    }
    /**
     * Handle mouse move events
     * @param event - Mouse move event
     */
    handleMouseMove(event) {
        if (!this.enabled)
            return;
        // Convert canvas coordinates to game coordinates
        const rect = this.canvasElement.getBoundingClientRect();
        const scaleX = this.canvasElement.width / rect.width;
        const scaleY = this.canvasElement.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        // Convert to game coordinates
        const originX = this.canvasElement.width / 2;
        const originY = this.canvasElement.height / 2;
        const gridSize = 25;
        const gameX = Math.round((mouseX - originX) / gridSize);
        const gameY = Math.round((originY - mouseY) / gridSize);
        const coords = [gameX, gameY];
        // Check if hovered coordinates changed
        if (!this.coordsEqual(coords, this.hoveredCoords)) {
            this.hoveredCoords = coords;
            if (coords) {
                // Generate hover intent (no logging to avoid spam)
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
            }
            else {
                // Clear hover
                if (this.hoverCallback) {
                    this.hoverCallback(null);
                }
            }
        }
    }
    /**
     * Handle mouse leave events
     * @param event - Mouse leave event
     */
    handleMouseLeave(event) {
        if (!this.enabled)
            return;
        this.hoveredCoords = null;
        // Clear hover
        if (this.hoverCallback) {
            this.hoverCallback(null);
        }
        logger.debug('Mouse left board area');
    }
    /**
     * Handle selection
     * @param coords - Selected coordinates
     */
    handleSelection(coords) {
        if (!this.enabled)
            return;
        // Update selected coordinates
        this.selectedCoords = coords;
        // Calculate valid moves for selected piece (basic implementation)
        // For now, just show adjacent coordinates as valid moves
        // This should be enhanced to use actual game rule validation
        this.validMoves = this.getAdjacentCoords(coords).filter(adjCoords => {
            // Basic validation: within board bounds
            const [x, y] = adjCoords;
            return x >= -12 && x <= 12 && y >= -12 && y <= 12;
        });
        logger.debug('Selection at coordinates:', coords, 'Valid moves:', this.validMoves);
        // Emit selection callback
        if (this.selectCallback) {
            this.selectCallback(coords);
        }
    }
    /**
     * Convert board coordinates to SVG coordinates
     * @param boardCoords - Board coordinates [x, y]
     * @returns SVG coordinates [x, y]
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
     * @param coords1 - First coordinates
     * @param coords2 - Second coordinates
     * @returns Whether coordinates are equal
     */
    coordsEqual(coords1, coords2) {
        if (!coords1 && !coords2)
            return true;
        if (!coords1 || !coords2)
            return false;
        return coords1[0] === coords2[0] && coords1[1] === coords2[1];
    }
    /**
     * Set selected coordinates
     * @param coords - Coordinates to select
     */
    setSelectedCoords(coords) {
        this.selectedCoords = coords;
    }
    /**
     * Enable or disable interactions
     * @param enabled - Whether interactions are enabled
     */
    setEnabled(enabled) {
        logger.debug('InteractionManager.setEnabled: setting enabled to', enabled);
        this.enabled = enabled;
        if (enabled) {
            this.canvasElement.style.pointerEvents = 'auto';
            logger.debug('InteractionManager.setEnabled: pointer events set to auto');
        }
        else {
            this.canvasElement.style.pointerEvents = 'none';
            this.clearSelection();
            logger.debug('InteractionManager.setEnabled: pointer events set to none');
        }
        logger.debug('Interactions enabled:', enabled);
    }
    /**
     * Check if interactions are enabled
     * @returns Whether interactions are enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Re-initialize event listeners (for debugging)
     */
    reinitializeEventListeners() {
        console.log('🔄 InteractionManager.reinitializeEventListeners: removing and re-adding event listeners');
        // Remove existing listeners
        this.canvasElement.removeEventListener('click', this.boundHandleClick);
        this.canvasElement.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.canvasElement.removeEventListener('mouseleave', this.boundHandleMouseLeave);
        // Re-add listeners
        this.setupEventListeners();
        console.log('🔄 Event listeners reinitialized');
    }
    /**
     * Get intersection at coordinates
     * @param coords - Board coordinates
     * @returns Intersection data or null
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
     * @param coords - Board coordinates
     * @returns Whether coordinates are valid
     */
    isValidCoords(coords) {
        if (!coords || coords.length !== 2)
            return false;
        const [x, y] = coords;
        // Check if coordinates are within the board bounds
        // We'll use a simple range check based on the board size
        const maxCoord = Math.floor(this.board.width / (2 * this.board.coordinateScale));
        return x >= -maxCoord && x <= maxCoord &&
            y >= -maxCoord && y <= maxCoord;
    }
    /**
     * Get all valid board coordinates
     * @returns Array of valid coordinates
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
     * @param centerCoords - Center coordinates
     * @param distance - Maximum distance
     * @returns Array of coordinates within distance
     */
    getCoordsWithinDistance(centerCoords, distance) {
        const coords = [];
        const [centerX, centerY] = centerCoords;
        for (let x = centerX - distance; x <= centerX + distance; x++) {
            for (let y = centerY - distance; y <= centerY + distance; y++) {
                const testCoords = [x, y];
                if (this.isValidCoords(testCoords)) {
                    const dist = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
                    if (dist <= distance) {
                        coords.push(testCoords);
                    }
                }
            }
        }
        return coords;
    }
    /**
     * Get adjacent coordinates
     * @param coords - Center coordinates
     * @returns Array of adjacent coordinates
     */
    getAdjacentCoords(coords) {
        return this.getCoordsWithinDistance(coords, 1).filter(adjCoords => !this.coordsEqual(adjCoords, coords));
    }
    /**
     * Update valid moves for the currently selected piece
     * @param validMoves - Array of valid move coordinates
     */
    updateValidMoves(validMoves) {
        this.validMoves = validMoves;
    }
    /**
     * Set the current player (for piece ownership checking)
     * @param playerId - Current player ID
     */
    setCurrentPlayer(playerId) {
        this.currentPlayer = playerId;
    }
    /**
     * Get the currently selected coordinates
     * @returns Selected coordinates or null
     */
    getSelectedCoords() {
        return this.selectedCoords;
    }
    /**
     * Get the currently hovered coordinates
     * @returns Hovered coordinates or null
     */
    getHoveredCoords() {
        return this.hoveredCoords;
    }
    /**
     * Get valid move coordinates
     * @returns Array of valid move coordinates
     */
    getValidMoves() {
        return this.validMoves;
    }
    /**
     * Clear selection and valid moves
     */
    clearSelection() {
        this.selectedCoords = null;
        this.validMoves = [];
        if (this.selectCallback) {
            this.selectCallback(null);
        }
    }
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.canvasElement.removeEventListener('click', this.boundHandleClick);
        this.canvasElement.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.canvasElement.removeEventListener('mouseleave', this.boundHandleMouseLeave);
        // Clear callbacks
        this.moveIntentCallback = null;
        this.hoverCallback = null;
        this.selectCallback = null;
        // Clear state
        this.selectedCoords = null;
        this.hoveredCoords = null;
        this.validMoves = [];
        this.currentPlayer = null;
        logger.debug('InteractionManager destroyed');
    }
}
/**
 * Create an interaction manager
 * @param canvasElement - Canvas element
 * @param board - Board object
 * @returns Interaction manager instance
 */
export function createInteractionManager(canvasElement, board) {
    return new InteractionManager(canvasElement, board);
}
