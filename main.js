/**
 * Main entry point for the Amalgam game
 * Loads data, creates game components, and initializes the application
 */
import { logger } from './utils/logger.js';
import { GameManager } from './game/gameManager.js';
/**
 * Extended GameManager with piece selection support for main application
 */
class PatchedGameManager extends GameManager {
    constructor() {
        super(...arguments);
        this.getSelectedPieceIdForPlacement = null;
    }
    /**
     * Set callback to get selected piece ID for placement
     * @param callback - Function that returns the currently selected piece ID
     */
    setSelectedPieceIdCallback(callback) {
        this.getSelectedPieceIdForPlacement = callback;
    }
    /**
     * Override to use selected piece ID during setup
     */
    convertMoveIntentToMove(moveIntent) {
        if (!moveIntent || !moveIntent.coords || !this.state || !this.currentPlayer) {
            return null;
        }
        const coords = moveIntent.coords;
        // Only log in debug mode to reduce console spam
        logger.debug('PatchedGameManager convertMoveIntentToMove:', {
            coords: coords,
            gamePhase: this.state.gamePhase,
            currentPlayerId: this.currentPlayer.id,
            stateCurrentPlayer: this.state.currentPlayer
        });
        if (this.state.gamePhase === 'setup') {
            const unplacedPieces = this.getUnplacedPieces();
            let pieceId = null;
            if (this.getSelectedPieceIdForPlacement) {
                pieceId = this.getSelectedPieceIdForPlacement();
            }
            if (!pieceId || !unplacedPieces.includes(pieceId)) {
                pieceId = unplacedPieces[0] || null;
            }
            // Only log in debug mode to reduce console spam
            logger.debug('Setup move details:', {
                unplacedPieces: unplacedPieces.slice(0, 3),
                selectedPieceId: pieceId,
                playerId: this.currentPlayer.id
            });
            if (pieceId) {
                return {
                    type: 'place',
                    pieceId,
                    toCoords: coords,
                    playerId: this.state.currentPlayer
                };
            }
        }
        else if (this.state.gamePhase === 'gameplay') {
            // Handle gameplay phase moves with piece selection
            if (moveIntent.selectedPieceId) {
                const selectedPiece = this.state.pieces[moveIntent.selectedPieceId];
                if (selectedPiece && selectedPiece.player === this.state.currentPlayer) {
                    return {
                        type: 'standard',
                        fromCoords: selectedPiece.coords,
                        toCoords: coords,
                        playerId: this.state.currentPlayer
                    };
                }
            }
            // Handle portal swap moves
            if (moveIntent.meta?.portalSwap && moveIntent.meta?.move) {
                return moveIntent.meta.move;
            }
        }
        // Fallback to original implementation
        return super.convertMoveIntentToMove(moveIntent);
    }
    /**
     * Get unplaced pieces for current player (exposed as public)
     */
    getUnplacedPieces() {
        return super.getUnplacedPieces();
    }
}
/**
 * Main game application class
 */
export class AmalgamGame {
    constructor() {
        this.gameManager = null;
        this.boardData = null;
        this.pieceDefs = null;
        this.gameCanvas = null;
        this.statusElement = null;
        this.scoreElement = null;
        this.newGameButton = null;
        this.undoButton = null;
        this.selectedPieceId = null;
        this.pieceSelectionPanel = null;
        this.actionPanel = null;
        this.portalSwapMode = { enabled: false, sourcePiece: null };
        // Permanent action buttons
        this.selectedPieceInfo = null;
        this.portalSwapButton = null;
        this.fireballButton = null;
        this.tidalWaveButton = null;
        this.sapButton = null;
        this.launchButton = null;
    }
    /**
     * Initialize the game application
     */
    async initialize() {
        logger.info('Initializing Amalgam game');
        try {
            // Load game data
            await this.loadGameData();
            // Initialize UI elements
            await this.initializeUI();
            // Create game manager
            this.createGameManager();
            // Start default game (skip if we're in a test environment)
            if (!window.location.pathname.includes('/tests/')) {
                this.startDefaultGame();
            }
            logger.info('Amalgam game initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game: ' + error.message);
        }
    }
    /**
     * Load all game data files
     */
    async loadGameData() {
        logger.debug('Loading game data files');
        try {
            // Load board data
            const boardResponse = await fetch('/data/board-data.json');
            if (!boardResponse.ok) {
                throw new Error(`Failed to load board data: ${boardResponse.statusText}`);
            }
            this.boardData = await boardResponse.json();
            // Load valid board positions and merge into boardData
            const positionsResponse = await fetch('/game-rules/board_positions.json');
            if (positionsResponse.ok) {
                const positionsData = await positionsResponse.json();
                if (positionsData && positionsData.board_positions) {
                    this.boardData.board_positions = positionsData.board_positions;
                }
            }
            else {
                logger.warn('Could not load board_positions.json, falling back to range-based intersections.');
            }
            // Load piece definitions
            const pieceResponse = await fetch('/data/piece-definitions.json');
            if (!pieceResponse.ok) {
                throw new Error(`Failed to load piece definitions: ${pieceResponse.statusText}`);
            }
            this.pieceDefs = await pieceResponse.json();
            // Attach board data so rules can reference starting areas via pieceDefs.board_data
            if (this.pieceDefs && !this.pieceDefs.board_data && this.boardData) {
                this.pieceDefs.board_data = this.boardData;
                logger.info('Attached board data to pieceDefs:', {
                    hasStartingAreas: !!this.pieceDefs.board_data.starting_areas,
                    circlesStartingAreaSize: this.pieceDefs.board_data.starting_areas?.circles_starting_area?.positions?.length,
                    squaresStartingAreaSize: this.pieceDefs.board_data.starting_areas?.squares_starting_area?.positions?.length
                });
            }
            logger.debug('Game data loaded successfully');
        }
        catch (error) {
            logger.error('Failed to load game data:', error);
            throw error;
        }
    }
    /**
     * Initialize UI elements
     */
    async initializeUI() {
        logger.debug('Initializing UI elements');
        // Get board container
        const boardContainer = document.getElementById('board-container');
        if (!boardContainer) {
            throw new Error('Board container element not found');
        }
        if (!this.boardData) {
            throw new Error('Board data not loaded');
        }
        // Initialize canvas-based graphics
        const { createGameCanvas } = await import('./ui/graphics.js');
        this.gameCanvas = createGameCanvas(boardContainer, this.boardData);
        // Get UI elements
        this.statusElement = document.getElementById('status');
        this.scoreElement = document.getElementById('score');
        this.newGameButton = document.getElementById('new-game');
        this.undoButton = document.getElementById('undo');
        this.pieceSelectionPanel = document.getElementById('piece-selection-panel');
        this.actionPanel = document.getElementById('action-panel');
        // Get permanent action buttons
        this.selectedPieceInfo = document.getElementById('selected-piece-info');
        this.portalSwapButton = document.getElementById('portal-swap-btn');
        this.fireballButton = document.getElementById('fireball-btn');
        this.tidalWaveButton = document.getElementById('tidal-wave-btn');
        this.sapButton = document.getElementById('sap-btn');
        this.launchButton = document.getElementById('launch-btn');
        if (!this.statusElement || !this.scoreElement || !this.newGameButton || !this.undoButton || !this.pieceSelectionPanel || !this.actionPanel ||
            !this.selectedPieceInfo || !this.portalSwapButton || !this.fireballButton || !this.tidalWaveButton || !this.sapButton || !this.launchButton) {
            throw new Error('Required UI elements not found');
        }
        // Set up event listeners
        this.setupEventListeners();
        logger.debug('Canvas-based UI elements initialized');
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // New game button
        this.newGameButton?.addEventListener('click', () => {
            this.showGameOptions();
        });
        // Undo button
        this.undoButton?.addEventListener('click', () => {
            if (this.gameManager) {
                this.gameManager.undoMove();
            }
        });
        // Permanent action buttons
        this.portalSwapButton?.addEventListener('click', () => {
            if (!this.portalSwapButton?.disabled && this.selectedPieceId) {
                const state = this.gameManager?.getState();
                if (state && state.pieces[this.selectedPieceId]) {
                    this.handlePortalSwap(state.pieces[this.selectedPieceId]);
                }
            }
        });
        this.fireballButton?.addEventListener('click', () => {
            if (!this.fireballButton?.disabled && this.selectedPieceId) {
                const state = this.gameManager?.getState();
                if (state && state.pieces[this.selectedPieceId]) {
                    this.handleFireball(state.pieces[this.selectedPieceId]);
                }
            }
        });
        this.tidalWaveButton?.addEventListener('click', () => {
            if (!this.tidalWaveButton?.disabled && this.selectedPieceId) {
                const state = this.gameManager?.getState();
                if (state && state.pieces[this.selectedPieceId]) {
                    this.handleTidalWave(state.pieces[this.selectedPieceId]);
                }
            }
        });
        this.sapButton?.addEventListener('click', () => {
            if (!this.sapButton?.disabled && this.selectedPieceId) {
                const state = this.gameManager?.getState();
                if (state && state.pieces[this.selectedPieceId]) {
                    this.handleSap(state.pieces[this.selectedPieceId]);
                }
            }
        });
        this.launchButton?.addEventListener('click', () => {
            if (!this.launchButton?.disabled && this.selectedPieceId) {
                const state = this.gameManager?.getState();
                if (state && state.pieces[this.selectedPieceId]) {
                    this.handleLaunch(state.pieces[this.selectedPieceId]);
                }
            }
        });
        // Canvas click events handled by InteractionManager
        logger.info('Canvas click events will be handled by InteractionManager');
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }
    /**
     * Handle canvas click events (now handled by InteractionManager)
     */
    handleCanvasClick(event) {
        // This method is now redundant as InteractionManager handles clicks
        // Keep for backward compatibility but don't process
        logger.debug('Canvas click event received but handled by InteractionManager');
    }
    /**
     * Handle intersection click (now handled by GameManager via InteractionManager)
     */
    handleIntersectionClick(coords) {
        // This method is now redundant as GameManager handles intersection clicks
        // Keep for backward compatibility but don't process
        logger.debug('Intersection click handled by GameManager');
    }
    /**
     * Handle setup phase clicks
     */
    handleSetupClick(coords) {
        if (!this.gameManager)
            return;
        // Create move intent and send to game manager
        const moveIntent = {
            coords: coords,
            type: 'click'
        };
        // Call the game manager's handleMoveIntent method
        this.gameManager.handleMoveIntent(moveIntent);
        logger.debug('Setup click at:', coords);
    }
    /**
     * Handle gameplay phase clicks
     */
    handleGameplayClick(coords) {
        if (!this.gameManager)
            return;
        const state = this.gameManager.getState();
        if (!state)
            return;
        // Get intersection at clicked coordinates
        const intersection = this.gameCanvas?.boardDict[`${coords[0]},${coords[1]}`];
        if (!intersection)
            return;
        // Check if there's a piece at this location
        const pieceAtLocation = Object.values(state.pieces).find(piece => piece.coords[0] === coords[0] && piece.coords[1] === coords[1]);
        // Handle portal swap target selection
        if (this.portalSwapMode.enabled && this.portalSwapMode.sourcePiece) {
            const sourcePiece = state.pieces[this.portalSwapMode.sourcePiece];
            if (pieceAtLocation &&
                pieceAtLocation.type === 'Portal' &&
                pieceAtLocation.player === state.currentPlayer &&
                pieceAtLocation.id !== this.portalSwapMode.sourcePiece) {
                // Execute portal swap move
                const portalSwapMove = {
                    type: 'portal_swap',
                    fromCoords: sourcePiece.coords,
                    toCoords: pieceAtLocation.coords,
                    pieceId: sourcePiece.id,
                    playerId: state.currentPlayer
                };
                const moveIntent = {
                    coords: coords,
                    type: 'click',
                    meta: { portalSwap: true, move: portalSwapMove }
                };
                this.gameManager.handleMoveIntent(moveIntent);
                // Reset portal swap mode
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap executed!');
                console.log('🔄 Portal swap executed:', sourcePiece.id, '↔️', pieceAtLocation.id);
                return;
            }
            else {
                // Invalid target or clicked elsewhere - cancel portal swap
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap cancelled');
                if (!pieceAtLocation || pieceAtLocation.type !== 'Portal') {
                    console.log('❌ Portal swap cancelled: Invalid target');
                    return;
                }
            }
        }
        // If clicking on a piece that belongs to current player, select it
        if (pieceAtLocation && pieceAtLocation.player === state.currentPlayer) {
            this.selectedPieceId = pieceAtLocation.id;
            logger.debug('Selected piece:', pieceAtLocation.id, 'at:', coords);
            console.log('🔍 DEBUG: Piece selected:', pieceAtLocation.type, 'at', coords);
            // Show action buttons for the selected piece
            console.log('🔍 DEBUG: Calling showActionButtons...');
            this.showActionButtons(pieceAtLocation);
            console.log('🔍 DEBUG: showActionButtons completed');
            // Update board display to show movement indicators
            this.updateBoardDisplay(state);
            // Update visual feedback immediately for responsiveness
            const validMoves = this.getValidMovesForPiece(pieceAtLocation);
            this.updateVisualFeedback(coords, validMoves);
        }
        // If we have a selected piece and clicking on empty or enemy piece, try to move
        else if (this.selectedPieceId) {
            const selectedPiece = state.pieces[this.selectedPieceId];
            if (selectedPiece) {
                const move = {
                    type: 'standard',
                    fromCoords: selectedPiece.coords,
                    toCoords: coords,
                    playerId: state.currentPlayer
                };
                // Create move intent and send to game manager
                const moveIntent = {
                    coords: coords,
                    type: 'click',
                    selectedPieceId: this.selectedPieceId
                };
                // Process move immediately for better responsiveness
                this.gameManager?.handleMoveIntent(moveIntent);
                // Clear selection after move attempt
                this.selectedPieceId = null;
                this.updateVisualFeedback(null, []);
                this.hideActionButtons();
            }
        }
        logger.debug('Gameplay click at:', coords);
    }
    /**
     * Update permanent action buttons for a selected piece
     */
    showActionButtons(piece) {
        if (!this.selectedPieceInfo)
            return;
        // Update piece info display
        const isOnGolden = this.isOnGoldenLine(piece.coords);
        this.selectedPieceInfo.innerHTML = `
            <div class="piece-selected">
                <strong>${piece.type}</strong> at [${piece.coords[0]}, ${piece.coords[1]}]<br>
                <small>${piece.player === 'circles' ? 'Circles' : 'Squares'} player</small>
                ${isOnGolden ? '<br><small style="color: #28a745;">⭐ On Golden Line</small>' : ''}
            </div>
        `;
        // Update Portal Swap button
        const canPortalSwap = piece.type !== 'Portal' && isOnGolden;
        this.updateButtonState(this.portalSwapButton, canPortalSwap);
        // Update ability buttons based on piece type
        const canFireball = piece.type === 'Ruby' || piece.type === 'Amalgam';
        this.updateButtonState(this.fireballButton, canFireball);
        const canTidalWave = piece.type === 'Pearl' || piece.type === 'Amalgam';
        this.updateButtonState(this.tidalWaveButton, canTidalWave);
        const canSap = piece.type === 'Amber' || piece.type === 'Amalgam';
        this.updateButtonState(this.sapButton, canSap);
        const canLaunch = piece.type === 'Jade' || piece.type === 'Amalgam';
        this.updateButtonState(this.launchButton, canLaunch);
        console.log(`Debug: Updated action buttons for ${piece.type} - Portal Swap: ${canPortalSwap}, Golden: ${isOnGolden}`);
    }
    /**
     * Update button state (enabled/disabled)
     */
    updateButtonState(button, enabled) {
        if (enabled) {
            button.disabled = false;
            button.classList.remove('disabled');
        }
        else {
            button.disabled = true;
            button.classList.add('disabled');
        }
    }
    /**
     * Position the action panel next to the selected piece
     */
    positionActionPanel(coords) {
        if (!this.actionPanel || !this.gameCanvas)
            return;
        // Convert game coordinates to canvas coordinates
        const canvas = this.gameCanvas.canvas;
        const rect = canvas.getBoundingClientRect();
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const gridSize = this.boardData?.board?.coordinate_scale || 45;
        const canvasX = originX + (coords[0] * gridSize);
        const canvasY = originY - (coords[1] * gridSize);
        // Convert to screen coordinates
        const screenX = rect.left + (canvasX * rect.width / canvas.width);
        const screenY = rect.top + (canvasY * rect.height / canvas.height);
        // Position the action panel to the right of the piece
        const panelWidth = 200;
        const panelHeight = 300;
        // Check if panel would go off screen to the right
        let left = screenX + 30; // 30px offset from piece
        if (left + panelWidth > window.innerWidth) {
            left = screenX - panelWidth - 30; // Position to the left instead
        }
        // Check if panel would go off screen vertically
        let top = screenY - panelHeight / 2;
        if (top < 0) {
            top = 10;
        }
        else if (top + panelHeight > window.innerHeight) {
            top = window.innerHeight - panelHeight - 10;
        }
        this.actionPanel.style.left = `${left}px`;
        this.actionPanel.style.top = `${top}px`;
    }
    /**
     * Hide action buttons (reset to default state)
     */
    hideActionButtons() {
        // Reset piece info display
        if (this.selectedPieceInfo) {
            this.selectedPieceInfo.innerHTML = '<span class="no-selection">Select a piece to see available actions</span>';
        }
        // Disable all action buttons
        this.updateButtonState(this.portalSwapButton, false);
        this.updateButtonState(this.fireballButton, false);
        this.updateButtonState(this.tidalWaveButton, false);
        this.updateButtonState(this.sapButton, false);
        this.updateButtonState(this.launchButton, false);
    }
    /**
     * Check if coordinates are on golden line
     */
    isOnGoldenLine(coords) {
        console.log('🔍 DEBUG: isOnGoldenLine called with coords:', coords);
        if (!this.boardData?.golden_coordinates) {
            console.log('🔍 DEBUG: No golden_coordinates in boardData');
            return false;
        }
        const coordString = `${coords[0]},${coords[1]}`;
        const isGolden = this.boardData.golden_coordinates.includes(coordString);
        console.log(`🔍 DEBUG: Checking [${coords[0]}, ${coords[1]}] (${coordString}) - isGolden: ${isGolden}`);
        console.log(`🔍 DEBUG: Golden coordinates array length: ${this.boardData.golden_coordinates.length}`);
        console.log(`🔍 DEBUG: First 5 golden coordinates:`, this.boardData.golden_coordinates.slice(0, 5));
        return isGolden;
    }
    /**
     * Handle Portal Swap action
     */
    handlePortalSwap(piece) {
        // Enable portal swap mode
        this.portalSwapMode.enabled = true;
        this.portalSwapMode.sourcePiece = piece.id;
        // Update visual feedback
        this.showMessage(`Portal Swap mode: Click on a Portal piece to swap with ${piece.type}`);
        // Hide action buttons
        this.hideActionButtons();
        console.log('🔄 Portal swap mode enabled for piece:', piece.id);
    }
    /**
     * Handle Fireball ability
     */
    handleFireball(piece) {
        alert(`Fireball ability selected for ${piece.type}. Click to select direction.`);
        // TODO: Implement ability targeting
    }
    /**
     * Handle Tidal Wave ability
     */
    handleTidalWave(piece) {
        alert(`Tidal Wave ability selected for ${piece.type}. Click to select direction.`);
        // TODO: Implement ability targeting
    }
    /**
     * Handle Sap ability
     */
    handleSap(piece) {
        alert(`Sap ability selected for ${piece.type}. Click to select target.`);
        // TODO: Implement ability targeting
    }
    /**
     * Handle Launch ability
     */
    handleLaunch(piece) {
        alert(`Launch ability selected for ${piece.type}. Click to select target.`);
        // TODO: Implement ability targeting
    }
    /**
     * Get valid moves for a piece
     */
    getValidMovesForPiece(piece) {
        if (!this.gameManager || !this.pieceDefs)
            return [];
        const state = this.gameManager.getState();
        if (!state)
            return [];
        // Get adjacent coordinates as potential moves
        const adjacentCoords = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                const newCoords = [piece.coords[0] + dx, piece.coords[1] + dy];
                // Check if coordinates are valid and within board bounds
                if (newCoords[0] >= -12 && newCoords[0] <= 12 &&
                    newCoords[1] >= -12 && newCoords[1] <= 12) {
                    // Check if the position is empty
                    const pieceAtPos = Object.values(state.pieces).find(p => p.coords[0] === newCoords[0] && p.coords[1] === newCoords[1]);
                    if (!pieceAtPos) {
                        adjacentCoords.push(newCoords);
                    }
                }
            }
        }
        return adjacentCoords;
    }
    /**
     * Update visual feedback (now handled by GameManager)
     */
    async updateVisualFeedback(selectedCoords, validMoves) {
        // This method is now redundant as GameManager handles visual feedback
        // Keep for backward compatibility but don't process
        logger.debug('Visual feedback handled by GameManager');
    }
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        switch (event.key) {
            case 'n':
            case 'N':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.showGameOptions();
                }
                break;
            case 'z':
            case 'Z':
                if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
                    event.preventDefault();
                    if (this.gameManager) {
                        this.gameManager.undoMove();
                    }
                }
                break;
            case 'Escape':
                this.selectedPieceId = null;
                // Cancel portal swap mode
                if (this.portalSwapMode.enabled) {
                    this.portalSwapMode.enabled = false;
                    this.portalSwapMode.sourcePiece = null;
                    this.showMessage('Portal swap cancelled');
                    this.hideActionButtons();
                }
                if (this.gameManager) {
                    const state = this.gameManager.getState();
                    if (state) {
                        this.renderPieceSelectionPanel(state);
                    }
                }
                break;
        }
        // Piece selection hotkeys (only during setup phase)
        if (this.gameManager && this.gameManager.getState() && this.pieceDefs) {
            const state = this.gameManager.getState();
            if (state.gamePhase === 'setup') {
                const player = state.currentPlayer;
                const pieceDefs = this.pieceDefs.piece_definitions[player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
                const placedPieces = Object.keys(state.pieces);
                const unplaced = Object.entries(pieceDefs)
                    .filter(([id, def]) => !placedPieces.includes(id) && def.placement === 'setup_phase');
                // Hotkeys: R, P, A, J, M, O, V, 1-8
                const key = event.key.toUpperCase();
                let found = null;
                for (let i = 0; i < unplaced.length; i++) {
                    const [id, def] = unplaced[i];
                    if (this.getPieceHotkey(def.type, i) === key || (key === String(i + 1))) {
                        found = id;
                        break;
                    }
                }
                if (found) {
                    event.preventDefault();
                    this.selectedPieceId = found;
                    this.renderPieceSelectionPanel(state);
                }
            }
        }
    }
    /**
     * Create the game manager
     */
    createGameManager() {
        logger.debug('Creating game manager');
        if (!this.gameCanvas || !this.boardData || !this.pieceDefs) {
            throw new Error('Required components not initialized');
        }
        this.gameManager = new PatchedGameManager(this.gameCanvas, this.boardData, this.pieceDefs, {
            onStateChange: (state, move) => this.handleStateChange(state, move),
            onGameEnd: (state) => this.handleGameEnd(state),
            onError: (error) => this.handleError(error)
        });
        // Provide callback for selected piece
        this.gameManager.setSelectedPieceIdCallback(() => this.selectedPieceId);
        // Hook into InteractionManager for piece selection UI
        this.setupPieceSelectionHandling();
    }
    /**
     * Set up piece selection handling for UI updates
     */
    setupPieceSelectionHandling() {
        if (!this.gameManager)
            return;
        // Get the InteractionManager from GameManager
        const interactionManager = this.gameManager.getInteractionManager();
        if (!interactionManager) {
            logger.warn('No InteractionManager available for piece selection');
            return;
        }
        // Store the original GameManager callback 
        const originalCallback = (moveIntent) => {
            if (this.gameManager) {
                this.gameManager.handleMoveIntent(moveIntent);
            }
        };
        // Set up chained callback: UI first, then game logic
        interactionManager.setMoveIntentCallback((moveIntent) => {
            // First, handle the piece selection for UI
            this.handlePieceSelectionUI(moveIntent);
            // Then call the GameManager logic
            originalCallback(moveIntent);
        });
        logger.debug('Piece selection UI handling set up');
    }
    /**
     * Handle piece selection for UI updates (separate from game logic)
     */
    handlePieceSelectionUI(moveIntent) {
        if (moveIntent.type !== 'click')
            return;
        const coords = moveIntent.coords;
        const state = this.gameManager?.getState();
        if (!state || state.gamePhase !== 'gameplay')
            return;
        // Find piece at clicked coordinates
        const pieceAtLocation = Object.values(state.pieces).find(piece => piece.coords[0] === coords[0] && piece.coords[1] === coords[1]);
        // Handle portal swap target selection (existing logic)
        if (this.portalSwapMode.enabled && this.portalSwapMode.sourcePiece) {
            const sourcePiece = state.pieces[this.portalSwapMode.sourcePiece];
            if (pieceAtLocation &&
                pieceAtLocation.type === 'Portal' &&
                pieceAtLocation.player === state.currentPlayer &&
                pieceAtLocation.id !== this.portalSwapMode.sourcePiece) {
                // Execute portal swap move (existing logic)
                const portalSwapMove = {
                    type: 'portal_swap',
                    fromCoords: sourcePiece.coords,
                    toCoords: pieceAtLocation.coords,
                    pieceId: sourcePiece.id,
                    playerId: state.currentPlayer
                };
                this.gameManager?.handleMoveIntent({
                    coords: coords,
                    type: 'click',
                    meta: { portalSwap: true, move: portalSwapMove }
                });
                // Reset portal swap mode
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap executed!');
                console.log('🔄 Portal swap executed:', sourcePiece.id, '↔️', pieceAtLocation.id);
                return;
            }
            else {
                // Cancel portal swap mode
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap cancelled');
                if (!pieceAtLocation || pieceAtLocation.type !== 'Portal') {
                    console.log('❌ Portal swap cancelled: Invalid target');
                }
            }
        }
        // Handle piece selection for action buttons
        if (pieceAtLocation && pieceAtLocation.player === state.currentPlayer) {
            this.selectedPieceId = pieceAtLocation.id;
            logger.debug('UI: Selected piece:', pieceAtLocation.id, 'at:', coords);
            console.log('🔍 DEBUG: Piece selected for UI:', pieceAtLocation.type, 'at', coords);
            // Show action buttons
            console.log('🔍 DEBUG: Calling showActionButtons for UI...');
            this.showActionButtons(pieceAtLocation);
            console.log('🔍 DEBUG: showActionButtons for UI completed');
        }
        else {
            // Deselect piece
            this.selectedPieceId = null;
            this.hideActionButtons();
        }
    }
    /**
     * Start a default game
     */
    startDefaultGame() {
        logger.debug('Starting default game');
        if (!this.gameManager) {
            logger.error('Game manager not initialized');
            return;
        }
        // Start with Human vs Human for testing
        this.gameManager.startNewGame({
            player1: { type: 'human', name: 'Circles' },
            player2: { type: 'human', name: 'Squares' }
        });
        // Initial board render
        if (this.gameCanvas) {
            this.gameCanvas.drawBoard();
        }
    }
    /**
     * Show game options dialog
     */
    showGameOptions() {
        const options = [
            { id: 'human-vs-human', label: '2 Player Hotseat (Human vs Human)', p1: 'human', p2: 'human' },
            { id: 'human-vs-ai', label: 'Play against AI', p1: 'human', p2: 'heuristic' },
            { id: 'ai-vs-ai', label: 'Watch AI match (AI vs AI)', p1: 'heuristic', p2: 'heuristic' }
        ];
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Select Game Mode</h3>
                <div class="game-options">
                    ${options.map(option => `
                        <button class="game-option" data-option="${option.id}">
                            ${option.label}
                        </button>
                    `).join('')}
                </div>
                <button class="modal-close">Cancel</button>
            </div>
        `;
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                max-width: 400px;
                width: 90%;
            }
            .modal-content h3 {
                margin-bottom: 1rem;
                text-align: center;
                color: #2c3e50;
            }
            .game-options {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            .game-option {
                padding: 0.75rem;
                border: 2px solid #e9ecef;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
            }
            .game-option:hover {
                border-color: #007bff;
                background: #f8f9fa;
            }
            .modal-close {
                width: 100%;
                padding: 0.75rem;
                border: none;
                border-radius: 4px;
                background: #6c757d;
                color: white;
                cursor: pointer;
            }
            .modal-close:hover {
                background: #5a6268;
            }
            .ai-setup-status {
                text-align: center;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
                border: 2px solid #e9ecef;
            }
            .ai-setup-status h3 {
                margin: 0 0 0.5rem 0;
                color: #495057;
                font-size: 1.1em;
            }
            .ai-setup-status p {
                margin: 0 0 1rem 0;
                color: #6c757d;
                font-size: 0.9em;
            }
            .ai-progress {
                background: #e9ecef;
                border-radius: 4px;
                height: 8px;
                overflow: hidden;
            }
            .progress-bar {
                background: linear-gradient(90deg, #007bff, #0056b3);
                height: 100%;
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
        // Add event listeners
        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target === modal || target.classList.contains('modal-close')) {
                modal.remove();
                style.remove();
            }
        });
        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('game-option')) {
                const optionId = target.dataset.option;
                const option = options.find(opt => opt.id === optionId);
                if (option) {
                    this.startGameByOption(option);
                }
                modal.remove();
                style.remove();
            }
        });
        document.body.appendChild(modal);
    }
    /**
     * Start game with selected option
     */
    startGameByOption(option) {
        logger.debug('Starting game with option:', option);
        if (!this.gameManager) {
            logger.error('Game manager not initialized');
            return;
        }
        this.gameManager.startNewGame({
            player1: { type: option.p1, name: 'Circles' },
            player2: { type: option.p2, name: 'Squares' }
        });
    }
    /**
     * Handle game state changes
     */
    handleStateChange(state, move) {
        logger.debug('Game state changed:', state);
        this.updateGameInfo(state);
        this.updateUI();
        this.updateBoardDisplay(state);
        this.renderPieceSelectionPanel(state);
    }
    /**
     * Update the canvas display with current game state
     */
    updateBoardDisplay(state) {
        if (!this.gameCanvas || !state)
            return;
        // Draw the board
        this.gameCanvas.drawBoard();
        // Draw pieces if any exist
        if (state.pieces && Object.keys(state.pieces).length > 0) {
            // Convert pieces to the format expected by the canvas renderer
            const piecesData = this.convertPiecesForCanvas(state.pieces);
            // Get selected piece coordinates for highlighting
            let selectedCoord = null;
            if (this.selectedPieceId && state.pieces[this.selectedPieceId]) {
                selectedCoord = state.pieces[this.selectedPieceId].coords;
            }
            this.gameCanvas.drawPieces(piecesData, selectedCoord);
        }
        // Draw valid placement positions during setup
        if (state.gamePhase === 'setup') {
            this.drawValidPlacementPositions(state);
        }
        // Draw movement indicators for selected piece during gameplay
        logger.debug('Game phase check:', {
            gamePhase: state.gamePhase,
            selectedPieceId: this.selectedPieceId,
            hasSelectedPiece: this.selectedPieceId && state.pieces[this.selectedPieceId]
        });
        if (state.gamePhase === 'gameplay' && this.selectedPieceId && state.pieces[this.selectedPieceId]) {
            this.drawMovementIndicators(state, this.selectedPieceId);
        }
    }
    /**
     * Draw valid placement positions for setup phase
     */
    drawValidPlacementPositions(state) {
        if (!this.gameCanvas || !this.pieceDefs)
            return;
        const { ctx } = this.gameCanvas;
        const originX = this.boardData?.board?.center_offset?.[0] || 600;
        const originY = this.boardData?.board?.center_offset?.[1] || 600;
        const gridSize = this.boardData?.board?.coordinate_scale || 45;
        // Get valid positions for current player
        const startingArea = state.currentPlayer === 'circles' ?
            this.pieceDefs.board_data.starting_areas.circles_starting_area.positions :
            this.pieceDefs.board_data.starting_areas.squares_starting_area.positions;
        // Filter out occupied positions
        const validPositions = startingArea.filter(pos => {
            const intersection = state.board.intersections.find(int => int.coords[0] === pos[0] && int.coords[1] === pos[1]);
            return !intersection || !intersection.piece;
        });
        // Draw highlights for valid positions
        ctx.save();
        ctx.strokeStyle = state.currentPlayer === 'circles' ? '#FF6B6B' : '#4ECDC4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        logger.debug('Drawing highlights for', state.currentPlayer, 'player:', {
            totalPositions: validPositions.length,
            samplePositions: validPositions.slice(0, 3),
            startingArea: state.currentPlayer === 'circles' ? 'circles' : 'squares'
        });
        for (const pos of validPositions) {
            const [x, y] = pos;
            const centerPixelX = originX + x * gridSize;
            const centerPixelY = originY - y * gridSize;
            ctx.beginPath();
            ctx.arc(centerPixelX, centerPixelY, 8, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.restore();
    }
    /**
     * Draw movement indicators for selected piece during gameplay
     */
    drawMovementIndicators(state, selectedPieceId) {
        if (!this.gameCanvas || !this.gameManager)
            return;
        const selectedPiece = state.pieces[selectedPieceId];
        if (!selectedPiece)
            return;
        // Get legal moves for the selected piece
        const legalMoves = this.gameManager.getLegalMovesForCurrentState();
        const validMoves = legalMoves
            .filter(move => move.fromCoords &&
            move.fromCoords[0] === selectedPiece.coords[0] &&
            move.fromCoords[1] === selectedPiece.coords[1])
            .map(move => move.toCoords)
            .filter(Boolean);
        // Debug logging
        logger.debug('Movement indicators:', {
            selectedPiece: selectedPiece.coords,
            legalMovesCount: legalMoves.length,
            validMovesCount: validMoves.length,
            validMoves: validMoves.slice(0, 5) // Show first 5 moves
        });
        if (validMoves.length === 0)
            return;
        // Use proper graphics functions for movement indicators
        const { ctx } = this.gameCanvas;
        const originX = this.boardData?.board?.center_offset?.[0] || 600;
        const originY = this.boardData?.board?.center_offset?.[1] || 600;
        const gridSize = this.boardData?.board?.coordinate_scale || 45;
        // Scale the indicator size based on grid size
        const baseSize = 8;
        const scaledSize = baseSize * (gridSize / 25); // Scale relative to original 25px grid
        // Draw movement indicators directly
        ctx.save();
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2 * (gridSize / 25);
        validMoves.forEach(coords => {
            const centerPixelX = originX + coords[0] * gridSize;
            const centerPixelY = originY - coords[1] * gridSize;
            // Draw move indicator circle
            ctx.beginPath();
            ctx.arc(centerPixelX, centerPixelY, scaledSize, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
            ctx.fill();
            // Draw border
            ctx.beginPath();
            ctx.arc(centerPixelX, centerPixelY, scaledSize, 0, 2 * Math.PI);
            ctx.stroke();
        });
        ctx.restore();
    }
    /**
     * Convert pieces from game state format to canvas rendering format
     */
    convertPiecesForCanvas(pieces) {
        const canvasPieces = {};
        for (const [pieceId, piece] of Object.entries(pieces)) {
            const coordStr = `${piece.coords[0]},${piece.coords[1]}`;
            // Use the graphics from the piece definition if available, otherwise fall back to defaults
            let pieceData;
            if (piece.graphics) {
                // Use the graphics that were set when the piece was created
                pieceData = {
                    id: piece.id,
                    type: piece.type,
                    player: piece.player,
                    size: piece.graphics.size || this.getPieceSize(piece.type),
                    colors: piece.graphics.colors || this.getPieceColors(piece.type),
                    rotation: piece.graphics.rotation || 0,
                    outerColor: piece.graphics.outerColor || this.getPieceOuterColor(piece.type, piece.player),
                    innerColor: piece.graphics.innerColor || this.getPieceInnerColor(piece.type),
                    color: piece.graphics.color, // Add the color property for gem pieces
                    graphics: piece.graphics // Preserve the original graphics object
                };
            }
            else {
                // Fall back to default graphics
                pieceData = {
                    id: piece.id,
                    type: piece.type,
                    player: piece.player,
                    size: this.getPieceSize(piece.type),
                    colors: this.getPieceColors(piece.type),
                    rotation: 0,
                    outerColor: this.getPieceOuterColor(piece.type, piece.player),
                    innerColor: this.getPieceInnerColor(piece.type)
                };
            }
            canvasPieces[coordStr] = pieceData;
        }
        return canvasPieces;
    }
    /**
     * Get piece size based on type
     */
    getPieceSize(type) {
        const sizeMap = {
            'Ruby': 8,
            'Pearl': 8,
            'Amber': 8,
            'Jade': 8,
            'Amalgam': 10,
            'Portal': 6,
            'Void': 10
        };
        return sizeMap[type] || 8;
    }
    /**
     * Get piece colors based on type
     */
    getPieceColors(type) {
        const colorMap = {
            'Ruby': ['#E63960'],
            'Pearl': ['#F8F6DA'],
            'Amber': ['#F6C13F'],
            'Jade': ['#A9E886'],
            'Amalgam': ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'],
            'Portal': ['#87CEEB'],
            'Void': ['#5B4E7A']
        };
        return colorMap[type] || ['#666'];
    }
    /**
     * Get piece outer color based on type and player
     */
    getPieceOuterColor(type, player) {
        if (type === 'Portal')
            return '#87CEEB';
        if (type === 'Void')
            return '#5B4E7A';
        return player === 'circles' ? '#0066CC' : '#CC0066';
    }
    /**
     * Get piece inner color based on type
     */
    getPieceInnerColor(type) {
        if (type === 'Portal')
            return '#ADD8E6';
        if (type === 'Void')
            return '#8D7EA9';
        return '#FFFFFF';
    }
    renderPieceSelectionPanel(state) {
        if (!this.pieceSelectionPanel || !this.gameManager || !this.pieceDefs)
            return;
        // Only show during setup phase
        if (!state || state.gamePhase !== 'setup') {
            this.pieceSelectionPanel.innerHTML = '';
            return;
        }
        // Check if current player is AI
        const isAIPlayer = this.gameManager.currentPlayer?.type !== 'human';
        if (isAIPlayer) {
            // Show AI setup progress
            const player = state.currentPlayer;
            const pieceDefs = this.pieceDefs.piece_definitions[player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
            const placedPieces = Object.keys(state.pieces);
            const unplaced = Object.entries(pieceDefs)
                .filter(([id, def]) => !placedPieces.includes(id) && def.placement === 'setup_phase');
            this.pieceSelectionPanel.innerHTML = `
                <div class="ai-setup-status">
                    <h3>${player === 'circles' ? 'Circles' : 'Squares'} AI is setting up...</h3>
                    <p>Pieces remaining: ${unplaced.length}</p>
                    <div class="ai-progress">
                        <div class="progress-bar" style="width: ${((16 - unplaced.length) / 16) * 100}%"></div>
                    </div>
                </div>
            `;
            return;
        }
        // Get unplaced pieces for current player
        const player = state.currentPlayer;
        const pieceDefs = this.pieceDefs.piece_definitions[player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const placedPieces = Object.keys(state.pieces);
        const unplaced = Object.entries(pieceDefs)
            .filter(([id, def]) => !placedPieces.includes(id) && def.placement === 'setup_phase');
        logger.debug('renderPieceSelectionPanel', { player, unplaced, state });
        // Render buttons
        this.pieceSelectionPanel.innerHTML = unplaced.map(([id, def], idx) => {
            const symbol = this.getPieceSymbol(def.type);
            const selected = this.selectedPieceId === id ? 'selected' : '';
            return `<button class="piece-select-btn ${player} ${selected}" data-piece-id="${id}" tabindex="0">
                <span class="piece-symbol">${symbol}</span>
                <span class="piece-type-label">${def.type}</span>
                <span class="piece-hotkey">${this.getPieceHotkey(def.type, idx)}</span>
            </button>`;
        }).join('');
        // Add event listeners
        Array.from(this.pieceSelectionPanel.querySelectorAll('.piece-select-btn')).forEach(btn => {
            btn.addEventListener('click', () => {
                const pieceId = btn.getAttribute('data-piece-id');
                this.selectedPieceId = pieceId;
                this.renderPieceSelectionPanel(state);
            });
        });
    }
    getPieceSymbol(type) {
        const symbols = {
            Ruby: 'R', Pearl: 'P', Amber: 'A', Jade: 'J', Amalgam: 'M', Portal: 'O', Void: 'V'
        };
        return symbols[type] || '?';
    }
    getPieceHotkey(type, idx) {
        // Assign hotkeys: R, P, A, J, 1-8 fallback
        const map = {
            Ruby: 'R', Pearl: 'P', Amber: 'A', Jade: 'J', Amalgam: 'M', Portal: 'O', Void: 'V'
        };
        return map[type] || String(idx + 1);
    }
    /**
     * Handle game end
     */
    handleGameEnd(state) {
        logger.info('Game ended:', state);
        let message = '';
        if (state.winner) {
            const winnerName = state.winner === 'circles' ? 'Circles' : 'Squares';
            const victoryType = state.victoryType === 'objective' ? 'Objective Victory' : 'Elimination Victory';
            message = `${winnerName} wins by ${victoryType}!`;
        }
        else {
            message = 'Game ended in a draw.';
        }
        this.showMessage(message);
        this.updateGameInfo(state);
    }
    /**
     * Handle errors
     */
    handleError(error) {
        logger.error('Game error:', error);
        this.showError(typeof error === 'string' ? error : error.message || 'An error occurred');
    }
    /**
     * Update game information display
     */
    updateGameInfo(state) {
        if (!state)
            return;
        // Update status
        let statusText = '';
        if (state.winner) {
            const winnerName = state.winner === 'circles' ? 'Circles' : 'Squares';
            statusText = `${winnerName} wins!`;
        }
        else {
            const currentPlayer = state.currentPlayer === 'circles' ? 'Circles' : 'Squares';
            if (state.gamePhase === 'setup') {
                statusText = `Setup Phase - ${currentPlayer}'s turn (${state.setupTurn}/16)`;
            }
            else {
                statusText = `${currentPlayer}'s turn`;
            }
        }
        if (this.statusElement) {
            this.statusElement.textContent = statusText;
        }
        // Update score
        if (this.scoreElement) {
            const circlesPieces = Object.values(state.pieces).filter(p => p.player === 'circles').length;
            const squaresPieces = Object.values(state.pieces).filter(p => p.player === 'squares').length;
            const scoreCirclesElement = document.getElementById('score-circles');
            const scoreSquaresElement = document.getElementById('score-squares');
            if (scoreCirclesElement)
                scoreCirclesElement.textContent = String(circlesPieces);
            if (scoreSquaresElement)
                scoreSquaresElement.textContent = String(squaresPieces);
        }
    }
    /**
     * Update UI elements
     */
    updateUI() {
        // Update button states
        if (this.undoButton) {
            this.undoButton.disabled = !this.gameManager || !this.gameManager.canUndo();
        }
    }
    /**
     * Show a message to the user
     */
    showMessage(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-info';
        toast.textContent = message;
        this.addToastStyles();
        document.body.appendChild(toast);
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    /**
     * Show an error message
     */
    showError(message) {
        // Create error toast
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        this.addToastStyles();
        document.body.appendChild(toast);
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    /**
     * Add toast styles if not already present
     */
    addToastStyles() {
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 4px;
                    color: white;
                    font-weight: 600;
                    z-index: 1000;
                    animation: toast-slide-in 0.3s ease-out;
                }
                .toast-info {
                    background: #17a2b8;
                }
                .toast-error {
                    background: #dc3545;
                }
                @keyframes toast-slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    /**
     * Clean up resources
     */
    destroy() {
        logger.debug('Destroying game');
        if (this.gameManager) {
            this.gameManager.destroy();
            this.gameManager = null;
        }
    }
}
// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM loaded, initializing Amalgam game');
    const game = new AmalgamGame();
    window.amalgamGame = game; // Make accessible for debugging
    game.initialize().catch(error => {
        console.error('Failed to start game:', error);
        alert('Failed to start game: ' + error.message);
    });
});
// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.amalgamGame) {
        window.amalgamGame.destroy();
    }
});
