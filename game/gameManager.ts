/**
 * Game manager for orchestrating Amalgam game flow
 * Coordinates between core logic, UI, and players
 * Implements the move pipeline and turn management
 */

import { logger } from '../utils/logger.js';
import { isValidMove, applyMove, getLegalMoves, hasLegalMoves } from '../core/rules.js';
import { createBoard, createInitialState, cloneState, getIntersectionByCoords } from '../core/board.js';
import { createInteractionManager, InteractionManager } from '../ui/interactions.js';
import { createPlayer, Player } from './player.js';
import type {
    GameState,
    Move,
    MoveResult,
    Board,
    BoardData,
    PieceDefinitions,
    GameCallbacks,
    CanvasContext,
    Vector2,
    Piece,
    PlayerId,
    MoveIntent,
    Ability,
    Intersection
} from '../core/types.js';

interface PlayerConfig {
    player1?: {
        type?: string;
        name?: string;
        options?: Record<string, any>;
    };
    player2?: {
        type?: string;
        name?: string;
        options?: Record<string, any>;
    };
}

interface AnimationManager {
    animatePlacement: (toId: string, playerId: PlayerId, callback: () => void) => void;
    animateMovement: (fromId: string, toId: string, playerId: PlayerId, callback: () => void) => void;
    animatePortalSwap?: (fromId: string, toId: string, callback: () => void) => void;
    animateWinCelebration: (winner: PlayerId, callback: () => void) => void;
    stopAllAnimations: () => void;
}

/**
 * Main game manager class
 */
export class GameManager {
    private gameCanvas: CanvasContext;
    private boardData: BoardData;
    private pieceDefs: PieceDefinitions;
    private callbacks: GameCallbacks;
    
    // Game state
    protected state: GameState | null = null;
    private board: Board | null = null;
    
    // Players
    private player1: Player | null = null;
    private player2: Player | null = null;
    protected currentPlayer: Player | null = null;
    
    // UI components
    private interactionManager: InteractionManager | null = null;
    private animationManager: AnimationManager | null = null;
    
    // Game flow
    private isGameActive: boolean = false;
    private isPaused: boolean = false;
    private moveHistory: Move[] = [];
    private stateHistory: GameState[] = [];
    
    // Selection state
    private selectedPiece: Piece | null = null;

    constructor(gameCanvas: CanvasContext, boardData: BoardData, pieceDefs: PieceDefinitions, callbacks: GameCallbacks = {}) {
        this.gameCanvas = gameCanvas;
        this.boardData = boardData;
        this.pieceDefs = pieceDefs;
        this.callbacks = callbacks;
        
        // Initialize components
        this.initialize();
    }

    /**
     * Initialize the game manager
     */
    private initialize(): void {
        logger.debug('Initializing GameManager');
        
        // Create board
        this.board = createBoard(this.boardData);
        
        // Ensure rules have access to board starting areas via pieceDefs
        // Some rules reference pieceDefs.board_data for starting_areas
        if (this.pieceDefs && !this.pieceDefs.board_data) {
            this.pieceDefs = { ...this.pieceDefs, board_data: this.boardData };
        }
        
        // Create UI managers with canvas
        this.interactionManager = createInteractionManager(this.gameCanvas.canvas, this.board);
        
        // Create a basic animation manager placeholder
        this.animationManager = {
            animatePlacement: (toId: string, playerId: PlayerId, callback: () => void) => {
                // Simple placeholder - just call callback immediately
                setTimeout(callback, 100);
            },
            animateMovement: (fromId: string, toId: string, playerId: PlayerId, callback: () => void) => {
                // Simple placeholder - just call callback immediately
                setTimeout(callback, 100);
            },
            animateWinCelebration: (winner: PlayerId, callback: () => void) => {
                logger.info(`🎉 ${winner.toUpperCase()} WINS! 🎉`);
                setTimeout(callback, 1000);
            },
            stopAllAnimations: () => {
                // Placeholder
            }
        };
        
        // Set up interaction callbacks
        this.interactionManager.setMoveIntentCallback((moveIntent: MoveIntent) => {
            this.handleMoveIntent(moveIntent);
        });
        
        this.interactionManager.setHoverCallback((coords: Vector2 | null) => {
            this.handleHover(coords);
        });
        
        this.interactionManager.setSelectCallback((coords: Vector2 | null) => {
            this.handleSelection(coords);
        });
        
        // Draw initial board
        this.gameCanvas.drawBoard();
        
        logger.debug('GameManager initialized');
    }

    /**
     * Start a new game
     * @param playerConfig - Player configuration
     */
    startNewGame(playerConfig: PlayerConfig = {}): void {
        logger.info('Starting new game with config:', playerConfig);
        
        if (!this.board) {
            throw new Error('Board not initialized');
        }
        
        // Create players
        this.player1 = createPlayer(
            playerConfig.player1?.type || 'human',
            'circles',
            playerConfig.player1?.name || 'Circles',
            playerConfig.player1?.options || {}
        );
        
        this.player2 = createPlayer(
            playerConfig.player2?.type || 'random',
            'squares',
            playerConfig.player2?.name || 'Squares',
            playerConfig.player2?.options || {}
        );
        
        // Create initial game state
        this.state = createInitialState(this.board);
        
        // Clear history
        this.moveHistory = [];
        this.stateHistory = [];
        
        // Set current player
        this.currentPlayer = this.state.currentPlayer === 'circles' ? this.player1 : this.player2;
        
        logger.info('Initial player assignment:', {
            stateCurrentPlayer: this.state.currentPlayer,
            player1Id: this.player1.id,
            player2Id: this.player2.id,
            selectedCurrentPlayer: this.currentPlayer.id
        });
        
        // Enable interactions
        this.interactionManager?.setEnabled(true);
        
        // Update display
        this.updateDisplay();
        
        // Start game loop
        this.isGameActive = true;
        this.gameLoop();
        
        // Notify callbacks
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(this.state, undefined);
        }
        
        logger.info('New game started');
    }

    /**
     * Main game loop
     */
    private async gameLoop(): Promise<void> {
        while (this.isGameActive && !this.isPaused) {
            if (!this.state || !this.currentPlayer) {
                break;
            }
            
            // Check for game end
            if (this.state.winner) {
                this.handleGameEnd();
                break;
            }
            
            // Check if current player has legal moves
            if (!hasLegalMoves(this.state, this.currentPlayer.id, this.pieceDefs)) {
                logger.warn(`No legal moves for ${this.currentPlayer.id}, skipping turn`);
                this.switchPlayer();
                continue;
            }
            
            // Get move from current player
            try {
                const move = await this.getPlayerMove();
                if (move) {
                    await this.processMove(move);
                } else {
                    logger.warn('Player returned null move, skipping turn');
                    this.switchPlayer();
                }
            } catch (error) {
                logger.error('Error getting player move:', error);
                this.handleError(error as Error);
                break;
            }
            
            // Small delay to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * Get move from current player
     * @returns Player's move
     */
    private async getPlayerMove(): Promise<Move | null> {
        if (!this.currentPlayer || !this.state) {
            return null;
        }
        
        if (this.currentPlayer.type === 'human') {
            // Human player - wait for UI interaction
            return new Promise((resolve) => {
                this.currentPlayer!.setMoveCallback(resolve);
            });
        } else {
            // AI player - get move immediately
            return this.currentPlayer.getMove(this.state, this.pieceDefs);
        }
    }

    /**
     * Process a move
     * @param move - Move to process
     */
    private async processMove(move: Move): Promise<void> {
        if (!this.state || !this.currentPlayer) {
            return;
        }
        
        logger.info('Processing move:', {
            move: move,
            currentPlayer: this.currentPlayer.id,
            gamePhase: this.state.gamePhase,
            setupTurn: this.state.setupTurn
        });
        
        // Validate move
        const validation = isValidMove(this.state, move, this.pieceDefs);
        if (!validation.ok) {
            logger.warn('Invalid move:', validation.reason);
            // Do not surface as an application error; simply ignore the invalid input
            return;
        }
        
        // Apply move
        const result = applyMove(this.state, move, this.pieceDefs);
        if (!result.ok) {
            logger.warn('Failed to apply move:', result.reason);
            this.handleError(new Error(`Failed to apply move: ${result.reason}`));
            return;
        }
        
        // Update state
        this.state = result.nextState!;
        
        // Store in history
        this.moveHistory.push(move);
        this.stateHistory.push(cloneState(this.state));
        
        // Handle animations
        await this.handleMoveAnimations(move, result);
        
        // Switch players
        this.switchPlayer();
        
        // Update display
        this.updateDisplay();
        
        // Notify callbacks
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(this.state, move);
        }
        
        // Check for game end
        if (this.state.winner) {
            this.handleGameEnd();
        }
    }

    /**
     * Handle move animations
     * @param move - Move that was made
     * @param result - Move result
     */
    private async handleMoveAnimations(move: Move, result: MoveResult): Promise<void> {
        if (!this.state || !this.animationManager) {
            return;
        }
        
        if (move.type === 'place' && move.toCoords) {
            // Animate piece placement (convert coords to intersection id)
            const toIntersection = getIntersectionByCoords(this.state.board, move.toCoords);
            const toId = toIntersection ? toIntersection.id : null;
            if (toId !== null) {
                await new Promise<void>(resolve => this.animationManager!.animatePlacement(toId, move.playerId, resolve));
            }
        } else if (move.fromCoords && move.toCoords && (
            move.type === 'standard' || 
            move.type === 'nexus' || 
            move.type === 'portal_standard' || 
            move.type === 'portal_phasing'
        )) {
            // Animate piece movement (convert coords to ids)
            const fromIntersection = getIntersectionByCoords(this.state.board, move.fromCoords);
            const toIntersection = getIntersectionByCoords(this.state.board, move.toCoords);
            const fromId = fromIntersection ? fromIntersection.id : null;
            const toId = toIntersection ? toIntersection.id : null;
            if (fromId !== null && toId !== null) {
                await new Promise<void>(resolve => this.animationManager!.animateMovement(fromId, toId, move.playerId, resolve));
            }
        } else if (move.type === 'portal_swap' && move.fromCoords && move.toCoords) {
            // Animate portal swap if available
            if (this.animationManager.animatePortalSwap) {
                const fromIntersection = getIntersectionByCoords(this.state.board, move.fromCoords);
                const toIntersection = getIntersectionByCoords(this.state.board, move.toCoords);
                const fromId = fromIntersection ? fromIntersection.id : null;
                const toId = toIntersection ? toIntersection.id : null;
                if (fromId !== null && toId !== null) {
                    await new Promise<void>(resolve => this.animationManager!.animatePortalSwap!(fromId, toId, resolve));
                }
            }
        }
        
        // Show ability effects if any
        if (result.availableAbilities && result.availableAbilities.length > 0) {
            for (const ability of result.availableAbilities) {
                await this.handleAbilityActivation(ability);
            }
        }
    }

    /**
     * Handle ability activation
     * @param ability - Ability to activate
     */
    private async handleAbilityActivation(ability: Ability): Promise<void> {
        logger.debug('Handling ability activation:', ability);
        
        // Show ability effect - placeholder for now
        logger.info(`Activating ability: ${ability.type} with formation:`, ability.formation);
        
        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    /**
     * Handle game end
     */
    private handleGameEnd(): void {
        if (!this.state) {
            return;
        }
        
        logger.info('Game ended:', this.state.winner);
        
        this.isGameActive = false;
        this.interactionManager?.setEnabled(false);
        
        // Show win celebration
        this.animationManager?.animateWinCelebration(this.state.winner!, () => {
            logger.debug('Win celebration completed');
        });
        
        // Notify callbacks
        if (this.callbacks.onGameEnd) {
            this.callbacks.onGameEnd(this.state);
        }
    }

    /**
     * Handle move intent from UI
     * @param moveIntent - Move intent from UI
     */
    private handleMoveIntent(moveIntent: MoveIntent): void {
        logger.debug('Handling move intent:', moveIntent);
        
        if (!this.isGameActive || this.isPaused) {
            return;
        }
        
        // Convert move intent to move
        const move = this.convertMoveIntentToMove(moveIntent);
        if (move) {
            // Process move asynchronously
            this.processMove(move).catch(error => {
                logger.error('Error processing move:', error);
                this.handleError(error as Error);
            });
        }
    }

    /**
     * Convert move intent to move
     * @param moveIntent - Move intent from UI
     * @returns Move object or null if invalid
     */
    protected convertMoveIntentToMove(moveIntent: MoveIntent): Move | null {
        if (!moveIntent || !moveIntent.coords || !this.state || !this.currentPlayer) {
            return null;
        }
        
        const coords = moveIntent.coords;
        logger.info('Converting move intent:', {
            coords: coords,
            gamePhase: this.state.gamePhase,
            currentPlayer: this.currentPlayer.id
        });
        
        // Handle setup phase
        if (this.state.gamePhase === 'setup') {
            const unplacedPieces = this.getUnplacedPieces();
            if (unplacedPieces.length > 0) {
                return {
                    type: 'place',
                    pieceId: unplacedPieces[0],
                    toCoords: coords,
                    playerId: this.currentPlayer.id
                };
            }
        }
        
        // Handle gameplay phase
        if (this.state.gamePhase === 'gameplay') {
            const selectedPiece = this.getSelectedPiece();
            if (selectedPiece) {
                return {
                    type: 'standard',
                    fromCoords: selectedPiece.coords,
                    toCoords: coords,
                    pieceId: selectedPiece.id,
                    playerId: this.currentPlayer.id
                };
            }
        }
        
        return null;
    }

    /**
     * Handle hover events
     * @param coords - Hovered coordinates
     */
    private handleHover(coords: Vector2 | null): void {
        if (!this.isGameActive || this.isPaused) {
            return;
        }
        
        // Show legal moves for current piece
        const legalMoves = this.getLegalMovesForCurrentState();
        const legalCoords = legalMoves.map(move => move.toCoords!).filter(Boolean);
        
        // TODO: Implement highlighting for canvas-based rendering
        logger.debug('Legal moves for hover:', legalCoords);
    }

    /**
     * Handle selection events
     * @param coords - Selected coordinates
     */
    private handleSelection(coords: Vector2 | null): void {
        if (!this.isGameActive || this.isPaused || !coords || !this.currentPlayer) {
            return;
        }
        
        // Find piece at coordinates
        const piece = this.getPieceAtCoords(coords);
        if (piece && piece.player === this.currentPlayer.id) {
            this.setSelectedPiece(piece);
            // TODO: Implement highlighting for canvas-based rendering
            logger.debug('Selected piece:', piece);
        }
    }

    /**
     * Get unplaced pieces for current player
     * @returns Array of unplaced piece IDs
     */
    protected getUnplacedPieces(): string[] {
        if (!this.currentPlayer || !this.state) {
            return [];
        }
        
        const playerPieceDefs = this.pieceDefs.piece_definitions[this.currentPlayer.id === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const placedPieces = Object.keys(this.state.pieces);
        
        return Object.keys(playerPieceDefs).filter(pieceId => 
            !placedPieces.includes(pieceId) && playerPieceDefs[pieceId].placement === 'setup_phase'
        );
    }

    /**
     * Get legal moves for current state
     * @returns Array of legal moves
     */
    private getLegalMovesForCurrentState(): Move[] {
        if (!this.state || !this.currentPlayer) {
            return [];
        }
        
        return getLegalMoves(this.state, this.currentPlayer.id, this.pieceDefs);
    }

    /**
     * Get piece at coordinates
     * @param coords - Coordinates
     * @returns Piece or null
     */
    private getPieceAtCoords(coords: Vector2): Piece | null {
        if (!this.state) {
            return null;
        }
        
        return Object.values(this.state.pieces).find(piece => 
            piece.coords[0] === coords[0] && piece.coords[1] === coords[1]
        ) || null;
    }

    /**
     * Set selected piece
     * @param piece - Piece to select
     */
    private setSelectedPiece(piece: Piece | null): void {
        this.selectedPiece = piece;
    }

    /**
     * Get selected piece
     * @returns Selected piece or null
     */
    private getSelectedPiece(): Piece | null {
        return this.selectedPiece;
    }

    /**
     * Clear selection
     */
    private clearSelection(): void {
        this.selectedPiece = null;
        // TODO: Clear highlights for canvas-based rendering
    }

    /**
     * Switch to next player
     */
    private switchPlayer(): void {
        if (!this.currentPlayer || !this.player1 || !this.player2 || !this.state) {
            return;
        }
        
        const previousPlayer = this.currentPlayer.id;
        this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
        this.state.currentPlayer = this.currentPlayer.id;
        
        // Clear selection when switching players
        this.clearSelection();
        
        logger.info('Switched player:', {
            from: previousPlayer,
            to: this.currentPlayer.id,
            gamePhase: this.state.gamePhase,
            setupTurn: this.state.setupTurn
        });
    }

    /**
     * Update the display
     */
    private updateDisplay(): void {
        if (!this.state) return;
        
        // Redraw the board
        this.gameCanvas.drawBoard();
        
        // TODO: Convert pieces to proper format and draw them
        // this.gameCanvas.drawPieces(pieces, this.getSelectedCoords());
        
        // Update any highlights
        this.updateHighlights();
    }

    /**
     * Update highlights based on current state
     */
    private updateHighlights(): void {
        if (!this.isGameActive || this.isPaused) {
            return;
        }
        
        // Show legal moves for selected piece
        const selectedPiece = this.getSelectedPiece();
        if (selectedPiece) {
            const legalMoves = this.getLegalMovesForCurrentState();
            const legalCoords = legalMoves
                .filter(move => move.fromCoords && 
                    move.fromCoords[0] === selectedPiece.coords[0] && 
                    move.fromCoords[1] === selectedPiece.coords[1])
                .map(move => move.toCoords!)
                .filter(Boolean);
            
            // TODO: Implement highlighting for canvas-based rendering
            logger.debug('Legal moves for selected piece:', legalCoords);
        }
    }

    /**
     * Undo the last move
     */
    undoMove(): void {
        if (this.stateHistory.length === 0) {
            logger.warn('No moves to undo');
            return;
        }
        
        if (!this.board) {
            return;
        }
        
        // Remove last move
        this.moveHistory.pop();
        this.stateHistory.pop();
        
        // Restore previous state
        if (this.stateHistory.length > 0) {
            this.state = this.stateHistory[this.stateHistory.length - 1];
        } else {
            this.state = createInitialState(this.board);
        }
        
        // Switch back to previous player
        this.switchPlayer();
        
        // Update display
        this.updateDisplay();
        
        logger.debug('Undid last move');
    }

    /**
     * Check if undo is possible
     * @returns Whether undo is possible
     */
    canUndo(): boolean {
        return this.stateHistory.length > 0;
    }

    /**
     * Pause the game
     */
    pauseGame(): void {
        this.isPaused = true;
        this.interactionManager?.setEnabled(false);
        logger.debug('Game paused');
    }

    /**
     * Resume the game
     */
    resumeGame(): void {
        this.isPaused = false;
        this.interactionManager?.setEnabled(true);
        this.gameLoop();
        logger.debug('Game resumed');
    }

    /**
     * Get current game state
     * @returns Current game state
     */
    getState(): GameState | null {
        return this.state;
    }

    /**
     * Set callbacks
     * @param callbacks - Callback functions
     */
    setCallbacks(callbacks: GameCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Handle errors
     * @param error - Error to handle
     */
    private handleError(error: Error): void {
        logger.error('GameManager error:', error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        logger.debug('Destroying GameManager');
        
        this.isGameActive = false;
        this.isPaused = true;
        
        if (this.interactionManager) {
            this.interactionManager.destroy();
        }
        
        if (this.animationManager) {
            this.animationManager.stopAllAnimations();
        }
        
        // Clear state
        this.state = null;
        this.board = null;
        this.player1 = null;
        this.player2 = null;
        this.currentPlayer = null;
        this.moveHistory = [];
        this.stateHistory = [];
        
        logger.debug('GameManager destroyed');
    }
}