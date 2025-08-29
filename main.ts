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
class AmalgamGame {
    private gameManager: PatchedGameManager | null = null;
    private boardData: BoardData | null = null;
    private pieceDefs: PieceDefinitions | null = null;
    private gameCanvas: CanvasContext | null = null;
    private statusElement: HTMLElement | null = null;
    private scoreElement: HTMLElement | null = null;
    private newGameButton: HTMLButtonElement | null = null;
    private undoButton: HTMLButtonElement | null = null;
    private selectedPieceId: string | null = null;
    private pieceSelectionPanel: HTMLElement | null = null;

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
            
            // Start default game
            this.startDefaultGame();
            
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
            const boardResponse = await fetch('./data/board-data.json');
            if (!boardResponse.ok) {
                throw new Error(`Failed to load board data: ${boardResponse.statusText}`);
            }
            this.boardData = await boardResponse.json();

            // Load valid board positions and merge into boardData
            const positionsResponse = await fetch('./game-rules/board_positions.json');
            if (positionsResponse.ok) {
                const positionsData = await positionsResponse.json();
                if (positionsData && positionsData.board_positions) {
                    this.boardData!.board_positions = positionsData.board_positions;
                }
            } else {
                logger.warn('Could not load board_positions.json, falling back to range-based intersections.');
            }
            
            // Load piece definitions
            const pieceResponse = await fetch('./data/piece-definitions.json');
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
        
        if (!this.statusElement || !this.scoreElement || !this.newGameButton || !this.undoButton || !this.pieceSelectionPanel) {
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
        
        // Canvas click events handled by InteractionManager
        logger.info('Canvas click events will be handled by InteractionManager');
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }

    /**
     * Handle canvas click events
     */
    private handleCanvasClick(event: MouseEvent): void {
        logger.info('Canvas click event received!');
        
        if (!this.gameManager || !this.gameCanvas) {
            logger.warn('Canvas click: gameManager or gameCanvas not available');
            return;
        }
        
        // Get canvas coordinates
        const rect = this.gameCanvas.canvas.getBoundingClientRect();
        const scaleX = this.gameCanvas.canvas.width / rect.width;
        const scaleY = this.gameCanvas.canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        
        // Convert to game coordinates
        const gameCoords = this.gameCanvas.getCoordinatesFromPixel(mouseX, mouseY);
        
        logger.info('Canvas clicked at game coordinates:', gameCoords);
        
        // Handle the intersection click
        this.handleIntersectionClick(gameCoords);
    }

    /**
     * Handle intersection click
     */
    private handleIntersectionClick(coords: Vector2): void {
        if (!this.gameManager || !this.gameCanvas) return;
        
        const state = this.gameManager.getState();
        if (!state) return;
        
        // Check if it's a valid intersection
        if (!this.gameCanvas.boardDict[`${coords[0]},${coords[1]}`]) {
            logger.debug('Clicked on invalid intersection:', coords);
            return;
        }
        
        if (state.gamePhase === 'setup') {
            this.handleSetupClick(coords);
        } else {
            this.handleGameplayClick(coords);
        }
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
        // For now, just log the click
        logger.debug('Gameplay click at:', coords);
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
            { id: 'human-vs-human', label: 'Human vs Human', p1: 'human', p2: 'human' },
            { id: 'human-vs-random', label: 'Human vs Random AI', p1: 'human', p2: 'random' },
            { id: 'human-vs-heuristic', label: 'Human vs Heuristic AI', p1: 'human', p2: 'heuristic' },
            { id: 'random-vs-random', label: 'Random AI vs Random AI', p1: 'random', p2: 'random' },
            { id: 'heuristic-vs-heuristic', label: 'Heuristic AI vs Heuristic AI', p1: 'heuristic', p2: 'heuristic' }
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
    private startGameByOption(option: GameOption): void {
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
            this.gameCanvas.drawPieces(piecesData, null); // No selected piece highlight for now
        }
        
        // Draw valid placement positions during setup
        if (state.gamePhase === 'setup') {
            this.drawValidPlacementPositions(state);
        }
    }
    
    /**
     * Draw valid placement positions for setup phase
     */
    private drawValidPlacementPositions(state: GameState): void {
        if (!this.gameCanvas || !this.pieceDefs) return;
        
        const { ctx, originX, originY } = this.gameCanvas;
        const gridSize = 25;
        
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
        
        // Only show during setup phase and for human player
        if (!state || state.gamePhase !== 'setup' || (this.gameManager as any).currentPlayer?.type !== 'human') {
            this.pieceSelectionPanel.innerHTML = '';
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