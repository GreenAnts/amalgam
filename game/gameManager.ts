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
     * Update the game display
     */
    private updateDisplay(): void {
        if (!this.state || !this.gameCanvas) {
            return;
        }
        
        logger.debug('Updating display');
        
        // Clear canvas
        this.gameCanvas.ctx.clearRect(0, 0, this.gameCanvas.canvas.width, this.gameCanvas.canvas.height);
        
        // Draw board background
        this.drawBoardBackground();
        
        // Draw pieces
        this.drawAllPieces();
        
        // Draw UI overlays
        this.drawUIOverlays();
    }
    
    /**
     * Draw the board background
     */
    private drawBoardBackground(): void {
        if (!this.gameCanvas || !this.board) return;
        
        const { ctx, originX, originY } = this.gameCanvas;
        const gridSize = 25; // Should match the board data
        
        // Draw background polygons
        this.drawBackgroundPolygons(ctx, originX, originY, gridSize);
        
        // Draw grid lines
        this.drawGridLines(ctx, originX, originY, gridSize);
        
        // Draw intersections
        this.drawIntersections(ctx, originX, originY, gridSize);
    }
    
    /**
     * Draw background polygon shapes
     */
    private drawBackgroundPolygons(ctx: CanvasRenderingContext2D, originX: number, originY: number, gridSize: number): void {
        // Define polygon sets (simplified for now)
        const polygons = [
            // Central area
            [{x: 0, y: 6}, {x: 6, y: 6}, {x: 6, y: 0}, {x: 0, y: 0}],
            [{x: 0, y: 0}, {x: -6, y: 0}, {x: -6, y: -6}, {x: 0, y: -6}],
            [{x: 0, y: -6}, {x: 6, y: -6}, {x: 6, y: 0}, {x: 0, y: 0}],
            [{x: 0, y: 0}, {x: -6, y: 0}, {x: -6, y: 6}, {x: 0, y: 6}]
        ];
        
        ctx.fillStyle = '#f0f0f0';
        polygons.forEach(polygon => {
            ctx.beginPath();
            ctx.moveTo(originX + polygon[0].x * gridSize, originY - polygon[0].y * gridSize);
            for (let i = 1; i < polygon.length; i++) {
                ctx.lineTo(originX + polygon[i].x * gridSize, originY - polygon[i].y * gridSize);
            }
            ctx.closePath();
            ctx.fill();
        });
    }
    
    /**
     * Draw grid lines
     */
    private drawGridLines(ctx: CanvasRenderingContext2D, originX: number, originY: number, gridSize: number): void {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        
        // Draw some basic grid lines (simplified)
        for (let i = -6; i <= 6; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(originX + i * gridSize, originY - 6 * gridSize);
            ctx.lineTo(originX + i * gridSize, originY + 6 * gridSize);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(originX - 6 * gridSize, originY - i * gridSize);
            ctx.lineTo(originX + 6 * gridSize, originY - i * gridSize);
            ctx.stroke();
        }
    }
    
    /**
     * Draw intersections
     */
    private drawIntersections(ctx: CanvasRenderingContext2D, originX: number, originY: number, gridSize: number): void {
        ctx.fillStyle = '#999';
        
        // Draw intersections at grid points
        for (let x = -6; x <= 6; x++) {
            for (let y = -6; y <= 6; y++) {
                const pixelX = originX + x * gridSize;
                const pixelY = originY - y * gridSize;
                
                ctx.beginPath();
                ctx.arc(pixelX, pixelY, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    /**
     * Draw all pieces on the board
     */
    private drawAllPieces(): void {
        if (!this.state || !this.gameCanvas) return;
        
        const { ctx, originX, originY } = this.gameCanvas;
        const gridSize = 25;
        
        const renderContext = {
            ctx,
            originX,
            originY,
            gridSize
        };
        
        // Draw each piece
        for (const [pieceId, piece] of Object.entries(this.state.pieces)) {
            // Create graphics object from piece definition
            const graphics = this.createPieceGraphics(pieceId, piece);
            
            // Create temporary piece with graphics for rendering
            const pieceWithGraphics = {
                ...piece,
                graphics
            };
            
            // Render the piece
            this.renderPiece(renderContext, pieceWithGraphics, piece.coords);
        }
        
        // Draw selection highlight
        if (this.selectedPiece) {
            const graphics = this.createPieceGraphics(this.selectedPiece.id, this.selectedPiece);
            this.renderPieceHighlight(renderContext, this.selectedPiece.coords, graphics.size);
        }
    }
    
    /**
     * Create graphics object for a piece
     */
    private createPieceGraphics(pieceId: string, piece: Piece): any {
        if (!this.pieceDefs) return { shape: 'circle', size: 10 };
        
        const playerPieceDefs = this.pieceDefs.piece_definitions[piece.player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const pieceDef = playerPieceDefs[pieceId];
        
        if (pieceDef?.graphics) {
            return pieceDef.graphics;
        }
        
        // Default graphics based on piece type
        switch (piece.type) {
            case 'Ruby':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    size: 10
                };
            case 'Pearl':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    size: 10
                };
            case 'Amber':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    size: 10
                };
            case 'Jade':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    size: 10
                };
            case 'Amalgam':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    colors: ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'],
                    size: 12,
                    rotation: piece.player === 'circles' ? Math.PI : Math.PI / 2
                };
            case 'Portal':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    outerColor: '#87CEEB',
                    innerColor: '#ADD8E6',
                    size: 8
                };
            case 'Void':
                return {
                    shape: piece.player === 'circles' ? 'circle' : 'square',
                    outerColor: '#5B4E7A',
                    innerColor: '#8D7EA9',
                    size: 12
                };
            default:
                return { shape: 'circle', size: 10 };
        }
    }
    
    /**
     * Render a piece using the graphics system
     */
    private renderPiece(context: any, piece: any, coords: Vector2): void {
        // Import and use the graphics rendering functions
        // This would need to be properly imported from the graphics module
        const [x, y] = coords;
        const centerPixelX = context.originX + x * context.gridSize;
        const centerPixelY = context.originY - y * context.gridSize;
        
        // Simple piece rendering for now
        const { ctx } = context;
        const graphics = piece.graphics;
        
        ctx.save();
        ctx.translate(centerPixelX, centerPixelY);
        
        if (graphics.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, graphics.size, 0, 2 * Math.PI);
            ctx.fillStyle = graphics.color || '#666';
            ctx.fill();
        } else {
            ctx.rotate(45 * Math.PI / 180);
            ctx.fillStyle = graphics.color || '#666';
            ctx.fillRect(-graphics.size, -graphics.size, graphics.size * 2, graphics.size * 2);
        }
        
        ctx.restore();
    }
    
    /**
     * Render piece highlight
     */
    private renderPieceHighlight(context: any, coords: Vector2, size: number): void {
        const [x, y] = coords;
        const centerPixelX = context.originX + x * context.gridSize;
        const centerPixelY = context.originY - y * context.gridSize;
        
        const { ctx } = context;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, size * 1.5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
    
    /**
     * Draw UI overlays
     */
    private drawUIOverlays(): void {
        if (!this.state || !this.gameCanvas) return;
        
        const { ctx } = this.gameCanvas;
        
        // Draw game phase indicator
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.fillText(`Phase: ${this.state.gamePhase}`, 10, 30);
        
        if (this.state.gamePhase === 'setup') {
            ctx.fillText(`Setup Turn: ${this.state.setupTurn}/16`, 10, 50);
            ctx.fillText(`Current Player: ${this.state.currentPlayer}`, 10, 70);
        }
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

    /**
     * Handle intersection click
     */
    private handleIntersectionClick(coords: Vector2): void {
        if (!this.gameCanvas) return;
        
        const state = this.getState();
        if (!state) return;
        
        // Check if it's a valid intersection
        if (!this.gameCanvas.boardDict[`${coords[0]},${coords[1]}`]) {
            logger.debug('Clicked on invalid intersection:', coords);
            return;
        }
        
        // Create move intent and pass to game manager
        const moveIntent = {
            coords: coords,
            type: 'click' as const
        };
        
        // Handle the move intent through the game manager
        this.handleMoveIntent(moveIntent);
    }
}