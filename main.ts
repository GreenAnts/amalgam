/**
 * Main entry point for the Amalgam game
 * Loads data, creates game components, and initializes the application
 */

import { logger } from './utils/logger.js';
import { GameManager } from './game/gameManager.js';
import type { 
    BoardData, 
    PieceDefinitions, 
    GameState, 
    Move, 
    CanvasContext,
    Vector2,
    Piece,
    PlayerId
} from './core/types.js';

interface GameOption {
    id: string;
    label: string;
    p1: string;
    p2: string;
}

interface CanvasPieceData {
    id?: string;
    type: string;
    player?: string;
    size: number;
    colors?: string[];
    rotation?: number;
    outerColor?: string;
    innerColor?: string;
    color?: string;
    graphics?: any;
}

/**
 * Extended GameManager with piece selection support for main application
 */
class PatchedGameManager extends GameManager {
    private getSelectedPieceIdForPlacement: (() => string | null) | null = null;

    /**
     * Set callback to get selected piece ID for placement
     * @param callback - Function that returns the currently selected piece ID
     */
    setSelectedPieceIdCallback(callback: () => string | null): void {
        this.getSelectedPieceIdForPlacement = callback;
    }

    /**
     * Override to use selected piece ID during setup
     */
    protected convertMoveIntentToMove(moveIntent: any): Move | null {
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
            let pieceId: string | null = null;
            
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
        } else if (this.state.gamePhase === 'gameplay') {
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
    getUnplacedPieces(): string[] {
        return super.getUnplacedPieces();
    }
}

/**
 * Main game application class
 */
export class AmalgamGame {
    public gameManager: PatchedGameManager | null = null;
    private boardData: BoardData | null = null;
    private pieceDefs: PieceDefinitions | null = null;
    private gameCanvas: CanvasContext | null = null;
    private statusElement: HTMLElement | null = null;
    private scoreElement: HTMLElement | null = null;
    private newGameButton: HTMLButtonElement | null = null;
    private undoButton: HTMLButtonElement | null = null;
    private selectedPieceId: string | null = null;
    private pieceSelectionPanel: HTMLElement | null = null;
    private actionPanel: HTMLElement | null = null;
    private portalSwapMode: { enabled: boolean; sourcePiece: string | null } = { enabled: false, sourcePiece: null };
    
    // Permanent action buttons
    private selectedPieceInfo: HTMLElement | null = null;
    private portalSwapButton: HTMLButtonElement | null = null;
    private fireballButton: HTMLButtonElement | null = null;
    private tidalWaveButton: HTMLButtonElement | null = null;
    private sapButton: HTMLButtonElement | null = null;
    private launchButton: HTMLButtonElement | null = null;

    /**
     * Initialize the game application
     */
    async initialize(): Promise<void> {
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
        } catch (error) {
            logger.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game: ' + (error as Error).message);
        }
    }

    /**
     * Load all game data files
     */
    private async loadGameData(): Promise<void> {
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
                    this.boardData!.board_positions = positionsData.board_positions;
                }
            } else {
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
        } catch (error) {
            logger.error('Failed to load game data:', error);
            throw error;
        }
    }

    /**
     * Initialize UI elements
     */
    private async initializeUI(): Promise<void> {
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
        this.newGameButton = document.getElementById('new-game') as HTMLButtonElement;
        this.undoButton = document.getElementById('undo') as HTMLButtonElement;
        this.pieceSelectionPanel = document.getElementById('piece-selection-panel');
        this.actionPanel = document.getElementById('action-panel');
        
        // Get permanent action buttons
        this.selectedPieceInfo = document.getElementById('selected-piece-info');
        this.portalSwapButton = document.getElementById('portal-swap-btn') as HTMLButtonElement;
        this.fireballButton = document.getElementById('fireball-btn') as HTMLButtonElement;
        this.tidalWaveButton = document.getElementById('tidal-wave-btn') as HTMLButtonElement;
        this.sapButton = document.getElementById('sap-btn') as HTMLButtonElement;
        this.launchButton = document.getElementById('launch-btn') as HTMLButtonElement;
        
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
    private setupEventListeners(): void {
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
    private handleCanvasClick(event: MouseEvent): void {
        // This method is now redundant as InteractionManager handles clicks
        // Keep for backward compatibility but don't process
        logger.debug('Canvas click event received but handled by InteractionManager');
    }

    /**
     * Handle intersection click (now handled by GameManager via InteractionManager)
     */
    private handleIntersectionClick(coords: Vector2): void {
        // This method is now redundant as GameManager handles intersection clicks
        // Keep for backward compatibility but don't process
        logger.debug('Intersection click handled by GameManager');
    }

    /**
     * Handle setup phase clicks
     */
    private handleSetupClick(coords: Vector2): void {
        if (!this.gameManager) return;
        
        // Create move intent and send to game manager
        const moveIntent = {
            coords: coords,
            type: 'click' as const
        };
        
        // Call the game manager's handleMoveIntent method
        this.gameManager.handleMoveIntent(moveIntent);
        
        logger.debug('Setup click at:', coords);
    }

    /**
     * Handle gameplay phase clicks
     */
    private handleGameplayClick(coords: Vector2): void {
        if (!this.gameManager) return;
        
        const state = this.gameManager.getState();
        if (!state) return;
        
        // Get intersection at clicked coordinates
        const intersection = this.gameCanvas?.boardDict[`${coords[0]},${coords[1]}`];
        if (!intersection) return;
        
        // Check if there's a piece at this location
        const pieceAtLocation = Object.values(state.pieces).find(piece => 
            piece.coords[0] === coords[0] && piece.coords[1] === coords[1]
        );
        
        // Handle portal swap target selection
        if (this.portalSwapMode.enabled && this.portalSwapMode.sourcePiece) {
            const sourcePiece = state.pieces[this.portalSwapMode.sourcePiece];
            
            if (pieceAtLocation && 
                pieceAtLocation.type === 'Portal' && 
                pieceAtLocation.player === state.currentPlayer &&
                pieceAtLocation.id !== this.portalSwapMode.sourcePiece) {
                
                // Execute portal swap move
                const portalSwapMove = {
                    type: 'portal_swap' as const,
                    fromCoords: sourcePiece.coords,
                    toCoords: pieceAtLocation.coords,
                    pieceId: sourcePiece.id,
                    playerId: state.currentPlayer
                };
                
                const moveIntent = {
                    coords: coords,
                    type: 'click' as const,
                    meta: { portalSwap: true, move: portalSwapMove }
                };
                
                this.gameManager.handleMoveIntent(moveIntent);
                
                // Reset portal swap mode
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap executed!');
                
                console.log('🔄 Portal swap executed:', sourcePiece.id, '↔️', pieceAtLocation.id);
                return;
            } else {
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
                    type: 'standard' as const,
                    fromCoords: selectedPiece.coords,
                    toCoords: coords,
                    playerId: state.currentPlayer
                };
                
                // Create move intent and send to game manager
                const moveIntent = {
                    coords: coords,
                    type: 'click' as const,
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
    private showActionButtons(piece: Piece): void {
        if (!this.selectedPieceInfo) return;
        
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
        this.updateButtonState(this.portalSwapButton!, canPortalSwap);
        
        // Update ability buttons based on piece type
        const canFireball = piece.type === 'Ruby' || piece.type === 'Amalgam';
        this.updateButtonState(this.fireballButton!, canFireball);
        
        const canTidalWave = piece.type === 'Pearl' || piece.type === 'Amalgam';
        this.updateButtonState(this.tidalWaveButton!, canTidalWave);
        
        const canSap = piece.type === 'Amber' || piece.type === 'Amalgam';
        this.updateButtonState(this.sapButton!, canSap);
        
        const canLaunch = piece.type === 'Jade' || piece.type === 'Amalgam';
        this.updateButtonState(this.launchButton!, canLaunch);
        
        console.log(`Debug: Updated action buttons for ${piece.type} - Portal Swap: ${canPortalSwap}, Golden: ${isOnGolden}`);
    }
    
    /**
     * Update button state (enabled/disabled)
     */
    private updateButtonState(button: HTMLButtonElement, enabled: boolean): void {
        if (enabled) {
            button.disabled = false;
            button.classList.remove('disabled');
        } else {
            button.disabled = true;
            button.classList.add('disabled');
        }
    }
    
    /**
     * Position the action panel next to the selected piece
     */
    private positionActionPanel(coords: Vector2): void {
        if (!this.actionPanel || !this.gameCanvas) return;
        
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
        } else if (top + panelHeight > window.innerHeight) {
            top = window.innerHeight - panelHeight - 10;
        }
        
        this.actionPanel.style.left = `${left}px`;
        this.actionPanel.style.top = `${top}px`;
    }
    
    /**
     * Hide action buttons (reset to default state)
     */
    private hideActionButtons(): void {
        // Reset piece info display
        if (this.selectedPieceInfo) {
            this.selectedPieceInfo.innerHTML = '<span class="no-selection">Select a piece to see available actions</span>';
        }
        
        // Disable all action buttons
        this.updateButtonState(this.portalSwapButton!, false);
        this.updateButtonState(this.fireballButton!, false);
        this.updateButtonState(this.tidalWaveButton!, false);
        this.updateButtonState(this.sapButton!, false);
        this.updateButtonState(this.launchButton!, false);
    }
    
    /**
     * Check if coordinates are on golden line
     */
    private isOnGoldenLine(coords: Vector2): boolean {
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
    private handlePortalSwap(piece: Piece): void {
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
    private handleFireball(piece: Piece): void {
        alert(`Fireball ability selected for ${piece.type}. Click to select direction.`);
        // TODO: Implement ability targeting
    }
    
    /**
     * Handle Tidal Wave ability
     */
    private handleTidalWave(piece: Piece): void {
        alert(`Tidal Wave ability selected for ${piece.type}. Click to select direction.`);
        // TODO: Implement ability targeting
    }
    
    /**
     * Handle Sap ability
     */
    private handleSap(piece: Piece): void {
        alert(`Sap ability selected for ${piece.type}. Click to select target.`);
        // TODO: Implement ability targeting
    }
    
    /**
     * Handle Launch ability
     */
    private handleLaunch(piece: Piece): void {
        alert(`Launch ability selected for ${piece.type}. Click to select target.`);
        // TODO: Implement ability targeting
    }

    /**
     * Get valid moves for a piece
     */
    private getValidMovesForPiece(piece: Piece): Vector2[] {
        if (!this.gameManager || !this.pieceDefs) return [];
        
        const state = this.gameManager.getState();
        if (!state) return [];
        
        // Get adjacent coordinates as potential moves
        const adjacentCoords: Vector2[] = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const newCoords: Vector2 = [piece.coords[0] + dx, piece.coords[1] + dy];
                
                // Check if coordinates are valid and within board bounds
                if (newCoords[0] >= -12 && newCoords[0] <= 12 && 
                    newCoords[1] >= -12 && newCoords[1] <= 12) {
                    
                    // Check if the position is empty
                    const pieceAtPos = Object.values(state.pieces).find(p => 
                        p.coords[0] === newCoords[0] && p.coords[1] === newCoords[1]
                    );
                    
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
    private async updateVisualFeedback(selectedCoords: Vector2 | null, validMoves: Vector2[]): Promise<void> {
        // This method is now redundant as GameManager handles visual feedback
        // Keep for backward compatibility but don't process
        logger.debug('Visual feedback handled by GameManager');
    }

    /**
     * Handle keyboard shortcuts
     */
    private handleKeyboardShortcuts(event: KeyboardEvent): void {
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
            const state = this.gameManager.getState()!;
            if (state.gamePhase === 'setup') {
                const player = state.currentPlayer;
                const pieceDefs = this.pieceDefs.piece_definitions[player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
                const placedPieces = Object.keys(state.pieces);
                const unplaced = Object.entries(pieceDefs)
                    .filter(([id, def]) => !placedPieces.includes(id) && def.placement === 'setup_phase');
                
                // Hotkeys: R, P, A, J, M, O, V, 1-8
                const key = event.key.toUpperCase();
                let found: string | null = null;
                
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
    private createGameManager(): void {
        logger.debug('Creating game manager');
        
        if (!this.gameCanvas || !this.boardData || !this.pieceDefs) {
            throw new Error('Required components not initialized');
        }
        
        this.gameManager = new PatchedGameManager(
            this.gameCanvas,
            this.boardData,
            this.pieceDefs,
            {
                onStateChange: (state, move) => this.handleStateChange(state, move),
                onGameEnd: (state) => this.handleGameEnd(state),
                onError: (error) => this.handleError(error)
            }
        );
        
        // Provide callback for selected piece
        this.gameManager.setSelectedPieceIdCallback(() => this.selectedPieceId);
        
        // Hook into InteractionManager for piece selection UI
        this.setupPieceSelectionHandling();
    }

    /**
     * Set up piece selection handling for UI updates
     */
    private setupPieceSelectionHandling(): void {
        if (!this.gameManager) return;
        
        // Get the InteractionManager from GameManager
        const interactionManager = this.gameManager.getInteractionManager();
        if (!interactionManager) {
            logger.warn('No InteractionManager available for piece selection');
            return;
        }
        
        // Store the original GameManager callback 
        const originalCallback = (moveIntent: any) => {
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
    private handlePieceSelectionUI(moveIntent: any): void {
        if (moveIntent.type !== 'click') return;
        
        const coords = moveIntent.coords;
        const state = this.gameManager?.getState();
        if (!state || state.gamePhase !== 'gameplay') return;
        
        // Find piece at clicked coordinates
        const pieceAtLocation = Object.values(state.pieces).find(piece => 
            piece.coords[0] === coords[0] && piece.coords[1] === coords[1]
        );
        
        // Handle portal swap target selection (existing logic)
        if (this.portalSwapMode.enabled && this.portalSwapMode.sourcePiece) {
            const sourcePiece = state.pieces[this.portalSwapMode.sourcePiece];
            
            if (pieceAtLocation && 
                pieceAtLocation.type === 'Portal' && 
                pieceAtLocation.player === state.currentPlayer &&
                pieceAtLocation.id !== this.portalSwapMode.sourcePiece) {
                
                // Execute portal swap move (existing logic)
                const portalSwapMove = {
                    type: 'portal_swap' as const,
                    fromCoords: sourcePiece.coords,
                    toCoords: pieceAtLocation.coords,
                    pieceId: sourcePiece.id,
                    playerId: state.currentPlayer
                };
                
                this.gameManager?.handleMoveIntent({
                    coords: coords,
                    type: 'click' as const,
                    meta: { portalSwap: true, move: portalSwapMove }
                });
                
                // Reset portal swap mode
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap executed!');
                
                console.log('🔄 Portal swap executed:', sourcePiece.id, '↔️', pieceAtLocation.id);
                return;
            } else {
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
        } else {
            // Deselect piece
            this.selectedPieceId = null;
            this.hideActionButtons();
        }
    }

    /**
     * Start a default game
     */
    private startDefaultGame(): void {
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
    private showGameOptions(): void {
        const options: GameOption[] = [
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
            const target = event.target as Element;
            if (target === modal || target.classList.contains('modal-close')) {
                modal.remove();
                style.remove();
            }
        });
        
        modal.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
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
    public startGameByOption(option: GameOption): void {
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
    private handleStateChange(state: GameState, move?: Move): void {
        logger.debug('Game state changed:', state);
        
        this.updateGameInfo(state);
        this.updateUI();
        this.updateBoardDisplay(state);
        this.renderPieceSelectionPanel(state);
    }
    
    /**
     * Update the canvas display with current game state
     */
    private updateBoardDisplay(state: GameState): void {
        if (!this.gameCanvas || !state) return;
        
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
    private drawValidPlacementPositions(state: GameState): void {
        if (!this.gameCanvas || !this.pieceDefs) return;
        
        const { ctx } = this.gameCanvas;
        const originX = this.boardData?.board?.center_offset?.[0] || 600;
        const originY = this.boardData?.board?.center_offset?.[1] || 600;
        const gridSize = this.boardData?.board?.coordinate_scale || 45;
        
        // Get valid positions for current player
        const startingArea = state.currentPlayer === 'circles' ? 
            this.pieceDefs.board_data!.starting_areas.circles_starting_area.positions :
            this.pieceDefs.board_data!.starting_areas.squares_starting_area.positions;
        
        // Filter out occupied positions
        const validPositions = startingArea.filter(pos => {
            const intersection = state.board.intersections.find(int => 
                int.coords[0] === pos[0] && int.coords[1] === pos[1]
            );
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
    private drawMovementIndicators(state: GameState, selectedPieceId: string): void {
        if (!this.gameCanvas || !this.gameManager) return;
        
        const selectedPiece = state.pieces[selectedPieceId];
        if (!selectedPiece) return;
        
        // Get legal moves for the selected piece
        const legalMoves = this.gameManager.getLegalMovesForCurrentState();
        const validMoves = legalMoves
            .filter(move => move.fromCoords && 
                move.fromCoords[0] === selectedPiece.coords[0] && 
                move.fromCoords[1] === selectedPiece.coords[1])
            .map(move => move.toCoords!)
            .filter(Boolean);
        
        // Debug logging
        logger.debug('Movement indicators:', {
            selectedPiece: selectedPiece.coords,
            legalMovesCount: legalMoves.length,
            validMovesCount: validMoves.length,
            validMoves: validMoves.slice(0, 5) // Show first 5 moves
        });
        
        if (validMoves.length === 0) return;
        
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
    private convertPiecesForCanvas(pieces: Record<string, Piece>): Record<string, CanvasPieceData> {
        const canvasPieces: Record<string, CanvasPieceData> = {};
        
        for (const [pieceId, piece] of Object.entries(pieces)) {
            const coordStr = `${piece.coords[0]},${piece.coords[1]}`;
            
            // Use the graphics from the piece definition if available, otherwise fall back to defaults
            let pieceData: CanvasPieceData;
            
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
            } else {
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
    private getPieceSize(type: string): number {
        const sizeMap: Record<string, number> = {
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
    private getPieceColors(type: string): string[] {
        const colorMap: Record<string, string[]> = {
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
    private getPieceOuterColor(type: string, player: string): string {
        if (type === 'Portal') return '#87CEEB';
        if (type === 'Void') return '#5B4E7A';
        return player === 'circles' ? '#0066CC' : '#CC0066';
    }
    
    /**
     * Get piece inner color based on type
     */
    private getPieceInnerColor(type: string): string {
        if (type === 'Portal') return '#ADD8E6';
        if (type === 'Void') return '#8D7EA9';
        return '#FFFFFF';
    }
    


    private renderPieceSelectionPanel(state: GameState): void {
        if (!this.pieceSelectionPanel || !this.gameManager || !this.pieceDefs) return;
        
        // Only show during setup phase
        if (!state || state.gamePhase !== 'setup') {
            this.pieceSelectionPanel.innerHTML = '';
            return;
        }
        
        // Check if current player is AI
        const isAIPlayer = (this.gameManager as any).currentPlayer?.type !== 'human';
        
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
                const pieceId = (btn as HTMLElement).getAttribute('data-piece-id');
                this.selectedPieceId = pieceId;
                this.renderPieceSelectionPanel(state);
            });
        });
    }

    private getPieceSymbol(type: string): string {
        const symbols: Record<string, string> = { 
            Ruby: 'R', Pearl: 'P', Amber: 'A', Jade: 'J', Amalgam: 'M', Portal: 'O', Void: 'V' 
        };
        return symbols[type] || '?';
    }
    
    private getPieceHotkey(type: string, idx: number): string {
        // Assign hotkeys: R, P, A, J, 1-8 fallback
        const map: Record<string, string> = { 
            Ruby: 'R', Pearl: 'P', Amber: 'A', Jade: 'J', Amalgam: 'M', Portal: 'O', Void: 'V' 
        };
        return map[type] || String(idx + 1);
    }

    /**
     * Handle game end
     */
    private handleGameEnd(state: GameState): void {
        logger.info('Game ended:', state);
        
        let message = '';
        if (state.winner) {
            const winnerName = state.winner === 'circles' ? 'Circles' : 'Squares';
            const victoryType = state.victoryType === 'objective' ? 'Objective Victory' : 'Elimination Victory';
            message = `${winnerName} wins by ${victoryType}!`;
        } else {
            message = 'Game ended in a draw.';
        }
        
        this.showMessage(message);
        this.updateGameInfo(state);
    }

    /**
     * Handle errors
     */
    private handleError(error: Error | string): void {
        logger.error('Game error:', error);
        this.showError(typeof error === 'string' ? error : error.message || 'An error occurred');
    }

    /**
     * Update game information display
     */
    private updateGameInfo(state: GameState): void {
        if (!state) return;
        
        // Update status
        let statusText = '';
        if (state.winner) {
            const winnerName = state.winner === 'circles' ? 'Circles' : 'Squares';
            statusText = `${winnerName} wins!`;
        } else {
            const currentPlayer = state.currentPlayer === 'circles' ? 'Circles' : 'Squares';
            if (state.gamePhase === 'setup') {
                statusText = `Setup Phase - ${currentPlayer}'s turn (${state.setupTurn}/16)`;
            } else {
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
            
            if (scoreCirclesElement) scoreCirclesElement.textContent = String(circlesPieces);
            if (scoreSquaresElement) scoreSquaresElement.textContent = String(squaresPieces);
        }
    }

    /**
     * Update UI elements
     */
    private updateUI(): void {
        // Update button states
        if (this.undoButton) {
            this.undoButton.disabled = !this.gameManager || !this.gameManager.canUndo();
        }
    }

    /**
     * Show a message to the user
     */
    private showMessage(message: string): void {
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
    private showError(message: string): void {
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
    private addToastStyles(): void {
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
    destroy(): void {
        logger.debug('Destroying game');
        
        if (this.gameManager) {
            this.gameManager.destroy();
            this.gameManager = null;
        }
    }
}

// Make types available globally for debugging
declare global {
    interface Window {
        amalgamGame?: AmalgamGame;
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