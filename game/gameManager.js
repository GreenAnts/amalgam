/**
 * Game manager for orchestrating Amalgam game flow
 * Coordinates between core logic, UI, and players
 * Implements the move pipeline and turn management
 */

import { logger } from '../utils/logger.js';
import { isValidMove, applyMove, getLegalMoves, hasLegalMoves } from '../core/rules.js';
import { createBoard, createInitialState, cloneState, getIntersectionByCoords } from '../core/board.js';
import { drawBoard, drawPieces, updateBoardDisplay, highlightIntersections, highlightPieces, clearHighlights, showAbilityEffect } from '../ui/graphics.js';
import { createInteractionManager } from '../ui/interactions.js';
import { createAnimationManager } from '../ui/animations.js';
import { createPlayer } from './player.js';

/**
 * Main game manager class
 */
export class GameManager {
    constructor(svgElement, boardData, pieceDefs, callbacks = {}) {
        this.svgElement = svgElement;
        this.boardData = boardData;
        this.pieceDefs = pieceDefs;
        this.callbacks = callbacks;
        
        // Game state
        this.state = null;
        this.board = null;
        
        // Players
        this.player1 = null;
        this.player2 = null;
        this.currentPlayer = null;
        
        // UI components
        this.interactionManager = null;
        this.animationManager = null;
        
        // Game flow
        this.isGameActive = false;
        this.isPaused = false;
        this.moveHistory = [];
        this.stateHistory = [];
        
        // Initialize components
        this.initialize();
    }

    /**
     * Initialize the game manager
     */
    initialize() {
        logger.debug('Initializing GameManager');
        
        // Create board
        this.board = createBoard(this.boardData);
        
        // Ensure rules have access to board starting areas via pieceDefs
        // Some rules reference pieceDefs.board_data for starting_areas
        if (this.pieceDefs && !this.pieceDefs.board_data) {
            this.pieceDefs = { ...this.pieceDefs, board_data: this.boardData };
        }
        
        // Create UI managers
        this.interactionManager = createInteractionManager(this.svgElement, this.board);
        this.animationManager = createAnimationManager(this.svgElement);
        
        // Set up interaction callbacks
        this.interactionManager.setMoveIntentCallback((moveIntent) => {
            this.handleMoveIntent(moveIntent);
        });
        
        this.interactionManager.setHoverCallback((coords) => {
            this.handleHover(coords);
        });
        
        this.interactionManager.setSelectCallback((coords) => {
            this.handleSelection(coords);
        });
        
        // Draw initial board
        drawBoard(this.svgElement, this.board);
        
        logger.debug('GameManager initialized');
    }

    /**
     * Start a new game
     * @param {Object} playerConfig - Player configuration
     */
    startNewGame(playerConfig = {}) {
        logger.info('Starting new game with config:', playerConfig);
        
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
        this.state = createInitialState(this.board, this.boardData);
        
        // Clear history
        this.moveHistory = [];
        this.stateHistory = [];
        
        // Set current player
        this.currentPlayer = this.state.currentPlayer === 'circles' ? this.player1 : this.player2;
        
        // Enable interactions
        this.interactionManager.setEnabled(true);
        
        // Update display
        this.updateDisplay();
        
        // Start game loop
        this.isGameActive = true;
        this.gameLoop();
        
        // Notify callbacks
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(this.state, null);
        }
        
        logger.info('New game started');
    }

    /**
     * Main game loop
     */
    async gameLoop() {
        while (this.isGameActive && !this.isPaused) {
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
                this.handleError(error);
                break;
            }
            
            // Small delay to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * Get move from current player
     * @returns {Promise<Object>} - Player's move
     */
    async getPlayerMove() {
        if (this.currentPlayer.type === 'human') {
            // Human player - wait for UI interaction
            return new Promise((resolve) => {
                this.currentPlayer.setMoveCallback(resolve);
            });
        } else {
            // AI player - get move immediately
            return this.currentPlayer.getMove(this.state, this.pieceDefs);
        }
    }

    /**
     * Process a move
     * @param {Object} move - Move to process
     */
    async processMove(move) {
        logger.debug('Processing move:', move);
        
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
        this.state = result.nextState;
        
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
     * @param {Object} move - Move that was made
     * @param {Object} result - Move result
     */
    async handleMoveAnimations(move, result) {
        if (move.type === 'place') {
            // Animate piece placement (convert coords to intersection id)
            const toIntersection = getIntersectionByCoords(this.state.board, move.toCoords);
            const toId = toIntersection ? toIntersection.id : null;
            if (toId !== null) {
                await new Promise(resolve => this.animationManager.animatePlacement(toId, this.currentPlayer.id, resolve));
            }
        } else if (move.type === 'standard' || move.type === 'nexus' || move.type === 'portal_standard' || move.type === 'portal_phasing') {
            // Animate piece movement (convert coords to ids)
            const fromIntersection = getIntersectionByCoords(this.state.board, move.fromCoords);
            const toIntersection = getIntersectionByCoords(this.state.board, move.toCoords);
            const fromId = fromIntersection ? fromIntersection.id : null;
            const toId = toIntersection ? toIntersection.id : null;
            if (fromId !== null && toId !== null) {
                await new Promise(resolve => this.animationManager.animateMovement(fromId, toId, this.currentPlayer.id, resolve));
            }
        } else if (move.type === 'portal_swap') {
            // Animate portal swap if available
            if (typeof this.animationManager.animatePortalSwap === 'function') {
                const fromIntersection = getIntersectionByCoords(this.state.board, move.fromCoords);
                const toIntersection = getIntersectionByCoords(this.state.board, move.toCoords);
                const fromId = fromIntersection ? fromIntersection.id : null;
                const toId = toIntersection ? toIntersection.id : null;
                if (fromId !== null && toId !== null) {
                    await new Promise(resolve => this.animationManager.animatePortalSwap(fromId, toId, resolve));
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
     * @param {Object} ability - Ability to activate
     */
    async handleAbilityActivation(ability) {
        logger.debug('Handling ability activation:', ability);
        
        // Show ability effect
        showAbilityEffect(
            this.svgElement,
            ability.type,
            ability.formation,
            ability.direction,
            () => {
                logger.debug('Ability effect completed');
            }
        );
        
        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    /**
     * Handle game end
     */
    handleGameEnd() {
        logger.info('Game ended:', this.state.winner);
        
        this.isGameActive = false;
        this.interactionManager.setEnabled(false);
        
        // Show win celebration
        this.animationManager.animateWinCelebration(this.state.winner, () => {
            logger.debug('Win celebration completed');
        });
        
        // Notify callbacks
        if (this.callbacks.onGameEnd) {
            this.callbacks.onGameEnd(this.state);
        }
    }

    /**
     * Handle move intent from UI
     * @param {Object} moveIntent - Move intent from UI
     */
    handleMoveIntent(moveIntent) {
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
                this.handleError(error);
            });
        }
    }

    /**
     * Convert move intent to move
     * @param {Object} moveIntent - Move intent from UI
     * @returns {Object|null} - Move object or null if invalid
     */
    convertMoveIntentToMove(moveIntent) {
        if (!moveIntent || !moveIntent.coords) {
            return null;
        }
        
        const coords = moveIntent.coords;
        
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
     * @param {Array<number>} coords - Hovered coordinates
     */
    handleHover(coords) {
        if (!this.isGameActive || this.isPaused) {
            return;
        }
        
        // Show legal moves for current piece
        const legalMoves = this.getLegalMovesForCurrentState();
        const legalCoords = legalMoves.map(move => move.toCoords || move.coords);
        
        highlightIntersections(this.svgElement, legalCoords, 'intersection--legal');
    }

    /**
     * Handle selection events
     * @param {Array<number>} coords - Selected coordinates
     */
    handleSelection(coords) {
        if (!this.isGameActive || this.isPaused) {
            return;
        }
        
        // Find piece at coordinates
        const piece = this.getPieceAtCoords(coords);
        if (piece && piece.player === this.currentPlayer.id) {
            this.setSelectedPiece(piece);
            highlightPieces(this.svgElement, [piece.id], 'piece--selected');
        }
    }

    /**
     * Get unplaced pieces for current player
     * @returns {Array<string>} - Array of unplaced piece IDs
     */
    getUnplacedPieces() {
        const playerPieceDefs = this.pieceDefs.piece_definitions[this.currentPlayer.id === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const placedPieces = Object.keys(this.state.pieces);
        
        return Object.keys(playerPieceDefs).filter(pieceId => 
            !placedPieces.includes(pieceId) && playerPieceDefs[pieceId].placement === 'setup_phase'
        );
    }

    /**
     * Get legal moves for current state
     * @returns {Array<Object>} - Array of legal moves
     */
    getLegalMovesForCurrentState() {
        return getLegalMoves(this.state, this.currentPlayer.id, this.pieceDefs);
    }

    /**
     * Get piece at coordinates
     * @param {Array<number>} coords - Coordinates
     * @returns {Object|null} - Piece or null
     */
    getPieceAtCoords(coords) {
        return Object.values(this.state.pieces).find(piece => 
            piece.coords[0] === coords[0] && piece.coords[1] === coords[1]
        ) || null;
    }

    /**
     * Set selected piece
     * @param {Object} piece - Piece to select
     */
    setSelectedPiece(piece) {
        this.selectedPiece = piece;
    }

    /**
     * Get selected piece
     * @returns {Object|null} - Selected piece or null
     */
    getSelectedPiece() {
        return this.selectedPiece || null;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedPiece = null;
        clearHighlights(this.svgElement);
    }

    /**
     * Switch to next player
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
        this.state.currentPlayer = this.currentPlayer.id;
        
        // Clear selection when switching players
        this.clearSelection();
        
        logger.debug('Switched to player:', this.currentPlayer.id);
    }

    /**
     * Update the display
     */
    updateDisplay() {
        if (!this.state) return;
        
        // Update pieces
        drawPieces(this.svgElement, this.state.board, this.state.pieces, this.board.pieceRadius);
        
        // Update any highlights
        this.updateHighlights();
    }

    /**
     * Update highlights based on current state
     */
    updateHighlights() {
        // Clear existing highlights
        clearHighlights(this.svgElement);
        
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
                .map(move => move.toCoords);
            
            highlightIntersections(this.svgElement, legalCoords, 'intersection--legal');
        }
    }

    /**
     * Undo the last move
     */
    undoMove() {
        if (this.stateHistory.length === 0) {
            logger.warn('No moves to undo');
            return;
        }
        
        // Remove last move
        this.moveHistory.pop();
        this.stateHistory.pop();
        
        // Restore previous state
        if (this.stateHistory.length > 0) {
            this.state = this.stateHistory[this.stateHistory.length - 1];
        } else {
            this.state = createInitialState(this.board, this.boardData);
        }
        
        // Switch back to previous player
        this.switchPlayer();
        
        // Update display
        this.updateDisplay();
        
        logger.debug('Undid last move');
    }

    /**
     * Check if undo is possible
     * @returns {boolean} - Whether undo is possible
     */
    canUndo() {
        return this.stateHistory.length > 0;
    }

    /**
     * Pause the game
     */
    pauseGame() {
        this.isPaused = true;
        this.interactionManager.setEnabled(false);
        logger.debug('Game paused');
    }

    /**
     * Resume the game
     */
    resumeGame() {
        this.isPaused = false;
        this.interactionManager.setEnabled(true);
        this.gameLoop();
        logger.debug('Game resumed');
    }

    /**
     * Get current game state
     * @returns {Object} - Current game state
     */
    getState() {
        return this.state;
    }

    /**
     * Set callbacks
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Handle errors
     * @param {Error} error - Error to handle
     */
    handleError(error) {
        logger.error('GameManager error:', error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
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
