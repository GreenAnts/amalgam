/**
 * Main entry point for the Amalgam game
 * Loads data, creates game components, and initializes the application
 */

import { logger } from './utils/logger.js';
import { GameManager } from './game/gameManager.js';
import { graphicsConfig } from './ui/graphics-config.js';
import { renderPiece } from './ui/graphics.js';
import { getFireballDirections, executeFireballAbility } from './core/rules.js';
import type { 
    BoardData, 
    PieceDefinitions, 
    GameState, 
    Move, 
    CanvasContext,
    Vector2,
    Piece,
    PlayerId,
    Ability
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
    private endTurnButton: HTMLButtonElement | null = null;
    private undoIconButton: HTMLButtonElement | null = null;
    private endTurnIconButton: HTMLButtonElement | null = null;
    private selectedPieceId: string | null = null;
    private pieceSelectionPanel: HTMLElement | null = null;
    private actionPanel: HTMLElement | null = null;
    private portalSwapMode: { enabled: boolean; sourcePiece: string | null } = { enabled: false, sourcePiece: null };
    private fireballMode: { enabled: boolean; formation: Vector2[] | null; availableDirections: Vector2[] | null } = { enabled: false, formation: null, availableDirections: null };
    
    // Track abilities used this turn to prevent reuse
    private abilitiesUsedThisTurn: Set<string> = new Set();
    
    // Permanent action buttons
    private selectedPieceInfo: HTMLElement | null = null;
    private portalSwapButton: HTMLButtonElement | null = null;
    private fireballButton: HTMLButtonElement | null = null;
    private tidalWaveButton: HTMLButtonElement | null = null;
    private sapButton: HTMLButtonElement | null = null;
    private launchButton: HTMLButtonElement | null = null;

    private lastLoggedMoveIndex: number = 0;

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
            const positionsResponse = await fetch('/data/game-rules/board_positions.json');
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
            
            // Load graphics configuration
            await graphicsConfig.loadConfig();
            logger.info('Graphics configuration loaded successfully');
            
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
        this.endTurnButton = document.getElementById('end-turn') as HTMLButtonElement;
        this.pieceSelectionPanel = document.getElementById('piece-selection-panel');
        this.actionPanel = document.getElementById('action-panel');
        // Control ribbon icon buttons (removed right ribbon; keep for safety if present)
        this.undoIconButton = document.getElementById('undo-icon') as HTMLButtonElement | null;
        this.endTurnIconButton = document.getElementById('end-turn-icon') as HTMLButtonElement | null;
        
        // Get permanent action buttons
        this.selectedPieceInfo = document.getElementById('selected-piece-info');
        this.portalSwapButton = document.getElementById('portal-swap-btn') as HTMLButtonElement;
        this.fireballButton = document.getElementById('fireball-btn') as HTMLButtonElement;
        this.tidalWaveButton = document.getElementById('tidal-wave-btn') as HTMLButtonElement;
        this.sapButton = document.getElementById('sap-btn') as HTMLButtonElement;
        this.launchButton = document.getElementById('launch-btn') as HTMLButtonElement;
        
        if (!this.statusElement || !this.scoreElement || !this.newGameButton || !this.pieceSelectionPanel || !this.actionPanel ||
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
            // Reset move log when starting a new game
            const list = document.getElementById('move-list');
            if (list) list.innerHTML = '';
            this.lastLoggedMoveIndex = 0;
        });
        
        // Primary controls: control ribbon icons
        if (this.undoIconButton) {
            this.undoIconButton.addEventListener('click', () => {
                if (!this.undoIconButton?.classList.contains('disabled') && this.gameManager) {
                    this.gameManager.undoMove();
                }
            });
        }

        // Ability tooltips: show descriptive text on hover next to the tab
        const tooltip = document.getElementById('ability-tooltip') as HTMLDivElement | null;
        const abilityDescriptions: Record<string, string> = {
            'portal-swap-btn': 'Swap your selected piece with an adjacent Portal following portal rules.',
            'fireball-btn': 'Ruby formation: launch a line attack along golden lines, destroying enemies.',
            'tidal-wave-btn': 'Pearl formation: create a wave that affects an area, pushing or disabling.',
            'sap-btn': 'Amber formation: sap enemy strength, reducing their effectiveness.',
            'launch-btn': 'Jade formation: launch/throw a piece to extend its movement.'
        };
        const hookTooltip = (btnId: string) => {
            const btn = document.getElementById(btnId);
            if (!btn || !tooltip) return;
            btn.addEventListener('mouseenter', () => {
                tooltip.textContent = abilityDescriptions[btnId] || '';
                tooltip.style.display = 'block';
                // Position bubble vertically aligned to hovered button
                const tabRect = (this.portalSwapButton?.closest('.ability-tab') as HTMLElement)?.getBoundingClientRect();
                const btnRect = btn.getBoundingClientRect();
                if (tabRect) {
                    const offsetY = btnRect.top - tabRect.top - 6; // small offset aligns arrow
                    tooltip.style.top = `${offsetY}px`;
                }
            });
            btn.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        };
        ['portal-swap-btn','fireball-btn','tidal-wave-btn','sap-btn','launch-btn'].forEach(hookTooltip);
        
        if (this.endTurnIconButton) {
            this.endTurnIconButton.addEventListener('click', () => {
                if (!this.endTurnIconButton?.classList.contains('disabled')) {
                    this.handleEndTurn();
                }
            });
        }
        
        // Legacy side-panel buttons (if present) now proxy to ribbon icons
        this.undoButton?.addEventListener('click', () => {
            this.undoIconButton?.click();
        });
        
        this.endTurnButton?.addEventListener('click', () => {
            this.endTurnIconButton?.click();
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
            if (this.fireballButton?.disabled) return;
            
            // Check if fireball was already used this turn
            if (this.abilitiesUsedThisTurn.has('fireball')) {
                this.showMessage('Fireball already used this turn - end your turn to use abilities again');
                return;
            }
            
            const state = this.gameManager?.getState();
            if (!state) return;
            
            // Check if there are available fireball abilities
            const fireballAbility = state.availableAbilities?.find(ability => ability.type === 'fireball');
            if (fireballAbility) {
                // Use the ability formation directly
                this.handleFireballFromAbility(fireballAbility);
            } else if (this.selectedPieceId && state.pieces[this.selectedPieceId]) {
                // Fallback to piece-based fireball (for when piece is selected)
                this.handleFireball(state.pieces[this.selectedPieceId]);
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
     * Start fireball animation
     */
    private async startFireballAnimation(formation: Vector2[], direction: Vector2): Promise<void> {
        logger.debug('Starting fireball animation', { formation, direction });
        
        try {
            if (!this.gameCanvas) {
                logger.warn('No canvas available for fireball animation');
                return;
            }
            
            // TODO: Integrate proper fireball animation
            // For now, just log that animation would start
            logger.debug('Fireball animation would start here', {
                formation, direction,
                centerX: (formation[0][0] + formation[1][0]) / 2,
                centerY: (formation[0][1] + formation[1][1]) / 2
            });
            
        } catch (error) {
            logger.error('Failed to start fireball animation:', error);
        }
    }

    /**
     * Handle end turn button click
     */
    private handleEndTurn(): void {
        if (!this.gameManager) {
            logger.warn('Cannot end turn - no game manager');
            return;
        }

        const state = this.gameManager.getState();
        if (!state || state.gamePhase === 'setup') {
            logger.warn('Cannot end turn during setup phase');
            return;
        }

        // Clear any active ability modes
        this.fireballMode.enabled = false;
        this.fireballMode.formation = null;
        this.fireballMode.availableDirections = null;
        this.portalSwapMode.enabled = false;
        this.portalSwapMode.sourcePiece = null;
        
        // Clear abilities used this turn (new turn starting)
        this.abilitiesUsedThisTurn.clear();
        
        // Clear visual indicators
        this.cleanupFireballIndicators();
        this.hideActionButtons();
        
        // Switch to next player
        this.gameManager.switchPlayer();
        
        // Clear available abilities since turn ended
        if (state.availableAbilities) {
            state.availableAbilities = [];
        }
        
        // Update UI
        this.updateGameInfo(state);
        
        // If the new player is AI, trigger their turn
        const newState = this.gameManager.getState();
        const currentPlayer = this.gameManager.getCurrentPlayer();
        if (newState && newState.gamePhase === 'gameplay' && currentPlayer && currentPlayer.type !== 'human') {
            logger.info('End turn: triggering AI player turn');
            // Use the existing GameManager method to handle AI turn
            if (this.gameManager && 'handleAITurnDuringGameplay' in this.gameManager) {
                (this.gameManager as any).handleAITurnDuringGameplay();
            }
        }
        
        logger.info('Turn ended manually by player');
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
                
                return;
            } else {
                // Invalid target or clicked elsewhere - cancel portal swap
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap cancelled');
                
                if (!pieceAtLocation || pieceAtLocation.type !== 'Portal') {
                    return;
                }
            }
        }
        
        // Handle fireball direction selection - now handled by direct click events on indicators
        // If clicking elsewhere while in fireball mode, cancel it
        if (this.fireballMode.enabled) {
            // Click elsewhere - cancel fireball mode
            this.fireballMode.enabled = false;
            this.fireballMode.formation = null;
            this.fireballMode.availableDirections = null;
            this.cleanupFireballIndicators();
            this.showMessage('Fireball cancelled - click on direction arrows to fire');
            
            // Don't return here - allow normal piece selection
        }
        
        // If clicking on a piece that belongs to current player, select it
        if (pieceAtLocation && pieceAtLocation.player === state.currentPlayer) {
            this.selectedPieceId = pieceAtLocation.id;
            logger.debug('Selected piece:', pieceAtLocation.id, 'at:', coords);
            
            // Show action buttons for the selected piece
            this.showActionButtons(pieceAtLocation);
            
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
        
        // Position the action panel using graphics configuration
        const uiConfig = graphicsConfig.getUIConfig();
        const panelWidth = uiConfig.action_panel.width;
        const panelHeight = uiConfig.action_panel.height;
        const offset = uiConfig.action_panel.offset_from_piece;
        
        // Check if panel would go off screen to the right
        let left = screenX + offset;
        if (left + panelWidth > window.innerWidth) {
            left = screenX - panelWidth - offset; // Position to the left instead
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
        
        if (!this.boardData?.golden_coordinates) {
            return false;
        }
        
        const coordString = `${coords[0]},${coords[1]}`;
        const isGolden = this.boardData.golden_coordinates.includes(coordString);
        
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
        
    }
    
    /**
     * Handle Fireball ability
     */
    private handleFireball(piece: Piece): void {
        const state = this.gameManager?.getState();
        if (!state) return;

        // Find valid fireball formations that include this piece
        const formation = this.findFireballFormationForPiece(state, piece);
        
        if (!formation) {
            this.showMessage(`${piece.type} is not in a valid fireball formation (requires adjacent Ruby/Amalgam)`);
            return;
        }

        // Get available firing directions
        const availableDirections = getFireballDirections(formation);
        
        if (availableDirections.length === 0) {
            this.showMessage('No valid firing directions available for this formation');
            return;
        }

        // Enable fireball mode
        this.fireballMode.enabled = true;
        this.fireballMode.formation = formation;
        this.fireballMode.availableDirections = availableDirections;
        
        // Show visual direction indicators
        this.showFireballDirections(formation, availableDirections);
        
        // Update message and hide action buttons
        this.showMessage(`Fireball ready! Click on a direction indicator to fire (${availableDirections.length} direction${availableDirections.length > 1 ? 's' : ''} available)`);
        this.hideActionButtons();
    }

    /**
     * Handle Fireball ability from available ability (after a move)
     */
    private handleFireballFromAbility(ability: Ability): void {
        if (!ability.formation) {
            this.showMessage('Invalid fireball ability - no formation specified');
            return;
        }

        // Get available firing directions
        const availableDirections = getFireballDirections(ability.formation);
        
        if (availableDirections.length === 0) {
            this.showMessage('No valid firing directions available for this formation');
            return;
        }

        // Enable fireball mode
        this.fireballMode.enabled = true;
        this.fireballMode.formation = ability.formation;
        this.fireballMode.availableDirections = availableDirections;
        
        // Show visual direction indicators
        this.showFireballDirections(ability.formation, availableDirections);
        
        // Update message and hide action buttons
        this.showMessage(`Fireball ready! Click on a direction indicator to fire (${availableDirections.length} direction${availableDirections.length > 1 ? 's' : ''} available)`);
        this.hideActionButtons();
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
                // Cancel fireball mode
                if (this.fireballMode.enabled) {
                    this.fireballMode.enabled = false;
                    this.fireballMode.formation = null;
                    this.fireballMode.availableDirections = null;
                    this.cleanupFireballIndicators();
                    this.showMessage('Fireball cancelled');
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
                
                return;
            } else {
                // Cancel portal swap mode
                this.portalSwapMode.enabled = false;
                this.portalSwapMode.sourcePiece = null;
                this.showMessage('Portal swap cancelled');
                
                if (!pieceAtLocation || pieceAtLocation.type !== 'Portal') {
                }
            }
        }
        
        // Handle piece selection for action buttons
        if (pieceAtLocation && pieceAtLocation.player === state.currentPlayer) {
            this.selectedPieceId = pieceAtLocation.id;
            logger.debug('UI: Selected piece:', pieceAtLocation.id, 'at:', coords);
            
            // Show action buttons
            this.showActionButtons(pieceAtLocation);
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
        
        // Check for available abilities after moves
        this.updateAbilityButtons(state);
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
    
    /**
     * Render a small SVG representing the piece for selection buttons
     */
    private renderPieceSVG(type: string, player: 'circles' | 'squares'): string {
        const outer = this.getPieceOuterColor(type, player);
        const inner = this.getPieceInnerColor(type);
        const stroke = '#654321';
        // Keep SVG simple and readable, matching in-game style
        return `
            <svg width="28" height="28" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <defs>
                    <radialGradient id="g_${type}_${player}" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stop-color="${inner}"/>
                        <stop offset="100%" stop-color="${outer}"/>
                    </radialGradient>
                </defs>
                <circle cx="20" cy="20" r="18" fill="url(#g_${type}_${player})" stroke="${stroke}" stroke-width="1.5"/>
                ${type === 'Portal' ? '<circle cx="20" cy="20" r="8" fill="none" stroke="#87CEEB" stroke-width="2"/>' : ''}
                ${type === 'Void' ? '<circle cx="20" cy="20" r="6" fill="#3b2f52"/>' : ''}
            </svg>
        `;
    }



    private renderPieceSelectionPanel(state: GameState): void {
        if (!this.pieceSelectionPanel || !this.gameManager || !this.pieceDefs) return;
        
        // Only show during setup phase
        if (!state || state.gamePhase !== 'setup') {
            this.pieceSelectionPanel.innerHTML = '';
            (this.pieceSelectionPanel as HTMLElement).style.display = 'none';
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
            if (unplaced.length === 0) {
                this.pieceSelectionPanel.innerHTML = '';
                (this.pieceSelectionPanel as HTMLElement).style.display = 'none';
                return;
            }
            (this.pieceSelectionPanel as HTMLElement).style.display = 'flex';
            
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
        if (unplaced.length === 0) {
            this.pieceSelectionPanel.innerHTML = '';
            (this.pieceSelectionPanel as HTMLElement).style.display = 'none';
            return;
        }
        (this.pieceSelectionPanel as HTMLElement).style.display = 'flex';

        // Group unplaced by piece type so we render one button per gem type
        const byType: Record<string, { ids: string[]; def: any } > = {};
        for (const [id, def] of unplaced) {
            const type = (def as any).type;
            if (!byType[type]) {
                byType[type] = { ids: [], def };
            }
            byType[type].ids.push(id);
        }
        
        logger.debug('renderPieceSelectionPanel', { player, unplaced, state });
        
        // Render one button per type with count badge
        const types = Object.keys(byType);
        this.pieceSelectionPanel.innerHTML = types.map((type, idx) => {
            const firstId = byType[type].ids[0];
            const remaining = byType[type].ids.length;
            const def = byType[type].def;
            const selected = this.selectedPieceId && byType[type].ids.includes(this.selectedPieceId) ? 'selected' : '';
            const svg = this.renderPieceSVG(type, player);
            const hotkey = this.getPieceHotkey(type, idx);
            return `<button class="piece-select-btn ${player} ${selected}" data-piece-id="${firstId}" data-type="${type}" data-hotkey="${hotkey}" tabindex="0" aria-label="${type}">
                ${svg}
                <span class="piece-type-label">${type}</span>
                <span class="piece-hotkey">${hotkey}</span>
            </button>`;
        }).join('');
        
        // Replace each button content with a canvas-drawn miniature matching the board renderer
        Array.from(this.pieceSelectionPanel.querySelectorAll('.piece-select-btn')).forEach((btn) => {
            const pieceId = (btn as HTMLElement).getAttribute('data-piece-id');
            const type = (btn as HTMLElement).getAttribute('data-type') || '';
            const hotkey = (btn as HTMLElement).getAttribute('data-hotkey') || '';
            const def = byType[type]?.def || (pieceId ? pieceDefs[pieceId] : undefined);
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            canvas.setAttribute('aria-hidden', 'true');
            (btn as HTMLElement).innerHTML = '';
            (btn as HTMLElement).appendChild(canvas);
            if (hotkey) {
                const bubble = document.createElement('span');
                bubble.className = 'piece-hotkey';
                bubble.textContent = hotkey;
                (btn as HTMLElement).appendChild(bubble);
            }

            // Add two-dot remaining indicator at bottom
            const dots = document.createElement('div');
            dots.className = 'piece-dots';
            const remaining = (byType[type]?.ids || []).length;
            for (let i = 0; i < 2; i++) {
                const dot = document.createElement('span');
                dot.className = 'piece-dot ' + (i < remaining ? 'active' : 'inactive');
                dots.appendChild(dot);
            }
            (btn as HTMLElement).appendChild(dots);

            try {
                // Draw using same pipeline as board pieces
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const tempContext = {
                        ctx,
                        originX: 24,
                        originY: 24,
                        gridSize: 1,
                        boardData: null
                    } as any;
                    const piece: any = {
                        id: pieceId,
                        type: type,
                        player,
                        graphics: {
                            shape: player === 'circles' ? 'circle' : 'square',
                            size: 12,
                            colors: this.getPieceColors(type),
                            color: this.getPieceColors(type)[0],
                            outerColor: this.getPieceOuterColor(type, player),
                            innerColor: this.getPieceInnerColor(type),
                            rotation: 0
                        }
                    };
                    (renderPiece as any)(tempContext, piece, [0, 0]);
                }
            } catch (_) {
                /* Ignore miniature draw errors to avoid blocking UI */
            }

            btn.addEventListener('click', () => {
                // Select the first available piece id for this type at click time
                const remainingIds = byType[type]?.ids || [];
                this.selectedPieceId = remainingIds[0] || pieceId;
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
        // Assign hotkeys: R, P, A, J, 1-8
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
        
        // Update dynamic piece type list (right panel): show pieces currently on the board (not removed)
        const listLeft = document.getElementById('piece-type-list-squares');
        const listRight = document.getElementById('piece-type-list-circles');
        if (listLeft && listRight && this.pieceDefs) {
            // Build a set of all piece types from definitions (both players)
            const allDefs = {
                ...this.pieceDefs.piece_definitions.circles_pieces,
                ...this.pieceDefs.piece_definitions.squares_pieces
            } as any;
            const allTypesSet = new Set<string>();
            Object.values(allDefs).forEach((def: any) => allTypesSet.add(def.type));

            // Count pieces on the board by type and player
            const countsOnBoardByPlayer: Record<'circles' | 'squares', Record<string, number>> = {
                circles: {},
                squares: {}
            };
            Object.values(state.pieces).forEach((p: any) => {
                const bucket = countsOnBoardByPlayer[p.player as 'circles' | 'squares'];
                bucket[p.type] = (bucket[p.type] || 0) + 1;
            });

            // Ordering: Void, Amalgam, gems (Ruby, Pearl, Amber, Jade), Portal, then any others
            const preferredOrder = ['Void', 'Amalgam', 'Ruby', 'Pearl', 'Amber', 'Jade', 'Portal'];
            const types = Array.from(allTypesSet).sort((a, b) => {
                const ia = preferredOrder.indexOf(a);
                const ib = preferredOrder.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b);
            });
            const makeRows = (player: 'circles' | 'squares') => types.map((t) => {
                const colors = this.getPieceColors(t);
                const onBoard = countsOnBoardByPlayer[player][t] || 0;
                const dotStyle = t === 'Amalgam' && colors.length >= 4
                    ? `background: conic-gradient(${colors[0]} 0 90deg, ${colors[1]} 90deg 180deg, ${colors[2]} 180deg 270deg, ${colors[3]} 270deg 360deg);`
                    : `background:${colors[0]}`;
                // Left column (squares) should use diamond/square shape; right column (circles) uses circle
                const shapeClass = player === 'squares' ? 'square' : 'circle';
                return `<div class="type-row"><span class="type-name"><span class="type-dot ${shapeClass}" style="${dotStyle}"></span><span class="type-label">${t}</span></span><span class="type-count">${onBoard}</span></div>`;
            }).join('');
            listLeft.innerHTML = makeRows('squares');
            listRight.innerHTML = makeRows('circles');
        }

        // Ensure move list container exists and stays scrollable
        const moveList = document.getElementById('move-list');
        if (moveList) {
            (moveList as HTMLElement).style.overflowY = 'auto';
        }

        // Log any new moves since last update
        const history = state.moveHistory || [];
        for (let i = this.lastLoggedMoveIndex; i < history.length; i++) {
            const m: any = history[i];
            if (m.ability && m.ability.type) {
                this.appendMoveLog({ ability: m.ability.type, player: m.playerId, moveType: 'ability' });
            } else if (m.pieceId && m.fromCoords && m.toCoords) {
                const piece = state.pieces[m.pieceId];
                const type = piece?.type || 'Piece';
                // Prefer move.playerId; if missing, infer from the piece BEFORE the move (check meta?.movedBy)
                const player = (m.playerId as ('circles'|'squares')) || (m.meta?.movedBy as ('circles'|'squares')) || piece?.player;
                this.appendMoveLog({ pieceType: type, player, moveType: 'moved', from: `(${m.fromCoords[0]},${m.fromCoords[1]})`, to: `(${m.toCoords[0]},${m.toCoords[1]})` });
            }
        }
        this.lastLoggedMoveIndex = history.length;

        // Update end turn button visibility and state
        if (this.endTurnButton) {
            // Only show end turn button during gameplay phase for human players
            const currentPlayer = this.gameManager?.getCurrentPlayer();
            const shouldShowEndTurn = state.gamePhase === 'gameplay' && 
                                      !state.winner && 
                                      currentPlayer?.type === 'human';
            
            // Debug logging to help diagnose issues
            console.log('🔧 DEBUG End Turn Button:', {
                gamePhase: state.gamePhase,
                winner: state.winner,
                currentPlayerType: currentPlayer?.type,
                currentPlayerId: currentPlayer?.id,
                stateCurrentPlayer: state.currentPlayer,
                shouldShowEndTurn: shouldShowEndTurn,
                gameManagerExists: !!this.gameManager
            });
            
            this.endTurnButton.style.display = shouldShowEndTurn ? 'inline-block' : 'none';
            this.endTurnButton.disabled = !shouldShowEndTurn;
            // Sync control icon state
            if (this.endTurnIconButton) {
                if (shouldShowEndTurn) {
                    this.endTurnIconButton.classList.remove('disabled');
                } else {
                    this.endTurnIconButton.classList.add('disabled');
                }
            }
        }
    }

    private appendMoveLog(entry: { pieceType?: string; player?: 'circles' | 'squares'; moveType: string; from?: string; to?: string; ability?: string }): void {
        const list = document.getElementById('move-list');
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'move-entry';
        const icon = document.createElement('span');
        const label = document.createElement('span');
        label.className = 'move-text';

        // Build small dot icon matching side panel style
        const type = entry.pieceType || entry.ability || 'Unknown';
        const colors = this.getPieceColors(type);
        const isCircles = entry.player === 'circles';
        const shapeClass = isCircles ? 'circle' : 'square';
        icon.className = `type-dot ${shapeClass}`;
        const dotStyle = type === 'Amalgam' && colors.length >= 4
            ? `conic-gradient(${colors[0]} 0 90deg, ${colors[1]} 90deg 180deg, ${colors[2]} 180deg 270deg, ${colors[3]} 270deg 360deg)`
            : colors[0];
        (icon as HTMLElement).style.background = dotStyle;

        // Compose text
        if (entry.ability) {
            label.textContent = `${type} used by ${entry.player === 'circles' ? 'Circles' : 'Squares'}`;
        } else {
            const from = entry.from || '';
            const to = entry.to || '';
            label.textContent = `${type} ${entry.moveType} ${from} to ${to}`;
        }

        row.appendChild(icon);
        row.appendChild(label);
        // Prepend newest entries at the top
        if (list.firstChild) {
            list.insertBefore(row, list.firstChild);
        } else {
            list.appendChild(row);
        }

        // Keep view near the newest entry (top of the list)
        requestAnimationFrame(() => {
            list.scrollTop = 0;
        });
    }

    /**
     * Update UI elements
     */
    private updateUI(): void {
        // Update button states
        if (this.undoButton) {
            const can = !!this.gameManager && this.gameManager.canUndo();
            this.undoButton.disabled = !can;
            if (this.undoIconButton) {
                if (can) {
                    this.undoIconButton.classList.remove('disabled');
                } else {
                    this.undoIconButton.classList.add('disabled');
                }
            }
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
                    bottom: 20px;
                    left: 20px;
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
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Find fireball formation that includes the given piece
     */
    private findFireballFormationForPiece(state: GameState, piece: Piece): Vector2[] | null {
        // Check for Ruby-Ruby, Ruby-Amalgam, or Amalgam-Amalgam formations
        const validTypes = ['Ruby', 'Amalgam'];
        if (!validTypes.includes(piece.type)) {
            return null;
        }

        // Find all pieces of the same player that can form fireball formations
        const playerPieces = Object.values(state.pieces).filter(p => 
            p.player === piece.player && validTypes.includes(p.type)
        );

        // Check each piece to see if it forms a valid adjacent formation with our piece
        for (const otherPiece of playerPieces) {
            if (otherPiece.id === piece.id) continue;

            // Check if pieces are adjacent
            const dx = Math.abs(piece.coords[0] - otherPiece.coords[0]);
            const dy = Math.abs(piece.coords[1] - otherPiece.coords[1]);
            
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                // Adjacent pieces found - return formation
                return [piece.coords, otherPiece.coords];
            }
        }

        return null;
    }

    /**
     * Show visual indicators for fireball directions
     */
    private showFireballDirections(formation: Vector2[], directions: Vector2[]): void {
        logger.debug('Showing fireball directions:', { formation, directions });
        
        // Create direction indicator elements as temporary visual feedback
        // This is a simple implementation - a full canvas-based solution would be better
        const boardContainer = document.getElementById('board-container');
        if (!boardContainer) {
            logger.warn('Board container not found for fireball indicators');
            return;
        }
        
        logger.debug('Board container found:', boardContainer);
        logger.debug('Board container dimensions:', {
            width: boardContainer.offsetWidth,
            height: boardContainer.offsetHeight,
            rect: boardContainer.getBoundingClientRect()
        });
        
        // Clean up any existing direction indicators
        document.querySelectorAll('.fireball-direction-indicator').forEach(el => el.remove());
        
        // Calculate formation center
        const [pos1, pos2] = formation;
        const centerX = (pos1[0] + pos2[0]) / 2;
        const centerY = (pos1[1] + pos2[1]) / 2;
        
        
        // Add direction indicators
        directions.forEach((direction, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'fireball-direction-indicator';
            indicator.style.position = 'absolute';
            indicator.style.width = '30px';
            indicator.style.height = '30px';
            indicator.style.backgroundColor = 'rgba(255, 100, 0, 0.9)';
            indicator.style.border = '3px solid #ff3300';
            indicator.style.borderRadius = '50%';
            indicator.style.cursor = 'pointer';
            indicator.style.zIndex = '99999'; // Extremely high z-index to appear above canvas
            indicator.style.display = 'flex';
            indicator.style.alignItems = 'center';
            indicator.style.justifyContent = 'center';
            indicator.style.fontSize = '18px';
            indicator.style.fontWeight = 'bold';
            indicator.style.color = 'white';
            indicator.style.boxShadow = '0 4px 12px rgba(255, 51, 0, 0.6)';
            indicator.style.transition = 'transform 0.2s ease';
            indicator.style.userSelect = 'none';
            
            // Add arrow or direction indicator (including diagonals)
            const arrow = direction[0] === 1 && direction[1] === 0 ? '→' :   // Right
                         direction[0] === -1 && direction[1] === 0 ? '←' :   // Left  
                         direction[0] === 0 && direction[1] === 1 ? '↓' :    // Down
                         direction[0] === 0 && direction[1] === -1 ? '↑' :   // Up
                         direction[0] === 1 && direction[1] === 1 ? '↘' :    // Down-Right
                         direction[0] === 1 && direction[1] === -1 ? '↗' :   // Up-Right
                         direction[0] === -1 && direction[1] === 1 ? '↙' :   // Down-Left  
                         direction[0] === -1 && direction[1] === -1 ? '↖' :  // Up-Left
                         '●'; // Fallback
            indicator.textContent = arrow;
            indicator.title = `Fire fireball in direction [${direction[0]}, ${direction[1]}]`;
            
            // Position the indicator properly using game coordinate system
            if (!this.gameCanvas) {
                logger.warn('No game canvas available for positioning indicators');
                return;
            }
            
            // Get canvas coordinate system parameters
            const canvas = this.gameCanvas.canvas;
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = boardContainer.getBoundingClientRect();
            
            // Calculate position 2 spaces away from formation center in game coordinates
            const indicatorGameX = centerX + direction[0] * 2;
            const indicatorGameY = centerY + direction[1] * 2;
            
            // Convert game coordinates to pixel coordinates using the canvas coordinate system
            // Use the exact same coordinate transformation as graphics.ts
            const gridSize = this.boardData?.board?.coordinate_scale || 45;
            const pixelX = this.gameCanvas.originX + indicatorGameX * gridSize;
            const pixelY = this.gameCanvas.originY - indicatorGameY * gridSize;
            
            // Center the 30px indicator (-15px offset from pixel coordinates)
            const screenX = pixelX - 15;
            const screenY = pixelY - 15;
            
            indicator.style.left = screenX + 'px';
            indicator.style.top = screenY + 'px';
            
            logger.debug(`Direction indicator ${index + 1}:`, {
                direction,
                screenPos: [screenX, screenY],
                containerSize: [containerRect.width, containerRect.height]
            });
            
            // Add hover effect
            indicator.addEventListener('mouseenter', () => {
                indicator.style.transform = 'scale(1.2)';
                indicator.style.backgroundColor = 'rgba(255, 51, 0, 1.0)';
            });
            indicator.addEventListener('mouseleave', () => {
                indicator.style.transform = 'scale(1.0)';
                indicator.style.backgroundColor = 'rgba(255, 100, 0, 0.9)';
            });
            
            // Add click handler directly to the indicator
            indicator.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                logger.debug(`Fireball direction indicator clicked: ${arrow} [${direction[0]}, ${direction[1]}]`);
                this.executeFireballInDirection(direction);
            });
            
            boardContainer.appendChild(indicator);
            logger.debug(`Appended direction indicator ${index + 1} to board container`);
        });
        
        // Also highlight the formation pieces
        const formationHighlight = document.createElement('div');
        formationHighlight.className = 'fireball-direction-indicator formation-highlight';
        formationHighlight.style.position = 'absolute';
        formationHighlight.style.width = '80px';
        formationHighlight.style.height = '40px';
        formationHighlight.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        formationHighlight.style.border = '3px dashed #ffcc00';
        formationHighlight.style.borderRadius = '10px';
        formationHighlight.style.zIndex = '999';
        formationHighlight.style.pointerEvents = 'none';
        
        // Position formation highlight at board center
        const containerRect2 = boardContainer.getBoundingClientRect();
        const highlightX = containerRect2.width / 2 - 40; // Center minus half width
        const highlightY = containerRect2.height / 2 - 20; // Center minus half height
        formationHighlight.style.left = highlightX + 'px';
        formationHighlight.style.top = highlightY + 'px';
        
        logger.debug('Formation highlight positioned at:', [highlightX, highlightY]);
        
        boardContainer.appendChild(formationHighlight);
        
        logger.debug(`Fireball direction indicators complete: ${directions.length} indicators added to board container`);
    }

    /**
     * Clean up fireball visual indicators
     */
    private cleanupFireballIndicators(): void {
        document.querySelectorAll('.fireball-direction-indicator').forEach(el => el.remove());
    }

    /**
     * Update ability buttons based on available abilities in game state
     */
    private updateAbilityButtons(state: GameState): void {
        // Debug logging to understand when this is called
        console.log('🔧 DEBUG updateAbilityButtons called:', {
            gamePhase: state.gamePhase,
            availableAbilities: state.availableAbilities,
            currentPlayer: state.currentPlayer
        });
        
        // Only show ability notifications during gameplay phase
        if (state.gamePhase !== 'gameplay' || !state.availableAbilities || state.availableAbilities.length === 0) {
            return; // No abilities available or not in gameplay phase
        }

        // Enable ability buttons based on available abilities
        const fireballAvailable = state.availableAbilities.some(ability => ability.type === 'fireball');
        const tidalWaveAvailable = state.availableAbilities.some(ability => ability.type === 'tidal_wave');
        const sapAvailable = state.availableAbilities.some(ability => ability.type === 'sap');
        const launchAvailable = state.availableAbilities.some(ability => ability.type === 'launch');

        if (fireballAvailable) {
            this.updateButtonState(this.fireballButton!, true);
            this.showMessage('Fireball ability available! Click the Fireball button to activate.');
        }
        if (tidalWaveAvailable) {
            this.updateButtonState(this.tidalWaveButton!, true);
        }
        if (sapAvailable) {
            this.updateButtonState(this.sapButton!, true);
        }
        if (launchAvailable) {
            this.updateButtonState(this.launchButton!, true);
        }
    }

    /**
     * Determine if a click corresponds to a valid fireball direction
     */
    private getFireballDirectionFromClick(clickCoords: Vector2, formation: Vector2[], availableDirections: Vector2[]): Vector2 | null {
        // For now, implement a simple approach:
        // Check if the click is in one of the available directions from the formation
        
        // Calculate the formation's center for direction calculation
        const [pos1, pos2] = formation;
        const formationCenter: Vector2 = [
            (pos1[0] + pos2[0]) / 2,
            (pos1[1] + pos2[1]) / 2
        ];
        
        // Calculate direction from formation to click
        const clickDirection: Vector2 = [
            clickCoords[0] - formationCenter[0],
            clickCoords[1] - formationCenter[1]
        ];
        
        // Normalize the click direction to match available directions
        const normalizedClickDir: Vector2 = [
            clickDirection[0] > 0 ? 1 : clickDirection[0] < 0 ? -1 : 0,
            clickDirection[1] > 0 ? 1 : clickDirection[1] < 0 ? -1 : 0
        ];
        
        // Check if normalized direction matches any available direction
        for (const availableDir of availableDirections) {
            if (availableDir[0] === normalizedClickDir[0] && availableDir[1] === normalizedClickDir[1]) {
                logger.debug('Fireball direction selected:', availableDir);
                return availableDir;
            }
        }
        
        // If no direct match, check if click is near the direction endpoints
        // This provides a larger clickable area for better UX
        for (const direction of availableDirections) {
            // Calculate endpoint 2-3 spaces away from formation for easier clicking
            const endpoint: Vector2 = [
                formationCenter[0] + direction[0] * 3,
                formationCenter[1] + direction[1] * 3
            ];
            
            // Check if click is within 1.5 spaces of the endpoint
            const distance = Math.sqrt(
                Math.pow(clickCoords[0] - endpoint[0], 2) + 
                Math.pow(clickCoords[1] - endpoint[1], 2)
            );
            
            if (distance <= 1.5) {
                logger.debug('Fireball direction selected (via endpoint):', direction);
                return direction;
            }
        }
        
        return null;
    }

    /**
     * Execute fireball in the specified direction (called when indicator is clicked)
     */
    private executeFireballInDirection(direction: Vector2): void {
        logger.debug('Executing fireball in direction:', direction);
        
        if (!this.fireballMode.enabled || !this.fireballMode.formation) {
            logger.warn('Fireball not in active mode');
            return;
        }
        
        const state = this.gameManager?.getState();
        if (!state || !this.pieceDefs) {
            logger.warn('Game state or piece definitions not available');
            return;
        }
        
        // Create a proper ability move and send it through GameManager
        const abilityMove: Move = {
            type: 'standard', // Placeholder move type - the ability will be processed
            playerId: state.currentPlayer,
            ability: {
                type: 'fireball',
                formation: this.fireballMode.formation,
                direction: direction
            }
        };
        
        // Start animation before processing the move
        this.startFireballAnimation(this.fireballMode.formation, direction);
        
        // Send the move through GameManager for proper processing
        if (this.gameManager) {
            // Process the ability move directly
            this.gameManager.processAbilityMove(abilityMove);
        }
        
        // Mark fireball as used this turn
        this.abilitiesUsedThisTurn.add('fireball');
            
        // Reset fireball mode and clean up visual indicators
        this.fireballMode.enabled = false;
        this.fireballMode.formation = null;
        this.fireballMode.availableDirections = null;
        this.cleanupFireballIndicators();
        
        // Clear available abilities since we used one
        const currentState = this.gameManager?.getState();
        if (currentState) {
            currentState.availableAbilities = [];
        }
        
        this.showMessage('Fireball launched!');
        logger.info('Fireball ability executed successfully');
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
                    logger.error('Failed to start game:', error);
        alert('Failed to start game: ' + error.message);
    });
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.amalgamGame) {
        window.amalgamGame.destroy();
    }
});