/**
 * Main entry point for the Amalgam game
 * Loads data, creates game components, and initializes the application
 */

import { logger } from './utils/logger.js';
import { GameManager as OrigGameManager } from './game/gameManager.js';

/**
 * Main game application class
 */
class AmalgamGame {
    constructor() {
        this.gameManager = null;
        this.boardData = null;
        this.pieceDefs = null;
        this.svgElement = null;
        this.statusElement = null;
        this.scoreElement = null;
        this.newGameButton = null;
        this.undoButton = null;
        this.selectedPieceId = null; // Track selected piece for placement
        this.pieceSelectionPanel = null;
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
            this.initializeUI();
            
            // Create game manager
            this.createGameManager();
            
            // Start default game
            this.startDefaultGame();
            
            logger.info('Amalgam game initialized successfully');
        } catch (error) {
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
                    this.boardData.board_positions = positionsData.board_positions;
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
            if (this.pieceDefs && !this.pieceDefs.board_data) {
                this.pieceDefs.board_data = this.boardData;
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
    initializeUI() {
        logger.debug('Initializing UI elements');
        
        // Get SVG element
        this.svgElement = document.getElementById('board');
        if (!this.svgElement) {
            throw new Error('Board SVG element not found');
        }
        
        // Get UI elements
        this.statusElement = document.getElementById('status');
        this.scoreElement = document.getElementById('score');
        this.newGameButton = document.getElementById('new-game');
        this.undoButton = document.getElementById('undo');
        this.pieceSelectionPanel = document.getElementById('piece-selection-panel');
        
        if (!this.statusElement || !this.scoreElement || !this.newGameButton || !this.undoButton || !this.pieceSelectionPanel) {
            throw new Error('Required UI elements not found');
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        logger.debug('UI elements initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // New game button
        this.newGameButton.addEventListener('click', () => {
            this.showGameOptions();
        });
        
        // Undo button
        this.undoButton.addEventListener('click', () => {
            if (this.gameManager) {
                this.gameManager.undoMove();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
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
                if (this.gameManager) {
                    this.gameManager.clearSelection();
                }
                break;
        }
        // Piece selection hotkeys (only during setup phase)
        if (this.gameManager && this.gameManager.state && this.gameManager.state.gamePhase === 'setup') {
            const player = this.gameManager.state.currentPlayer;
            const pieceDefs = this.pieceDefs.piece_definitions[player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
            const placedPieces = Object.keys(this.gameManager.state.pieces);
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
                this.renderPieceSelectionPanel(this.gameManager.state);
            }
        }
    }

    /**
     * Create the game manager
     */
    createGameManager() {
        logger.debug('Creating game manager');
        
        this.gameManager = new PatchedGameManager(
            this.svgElement,
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
    startDefaultGame() {
        logger.debug('Starting default game');
        
        if (!this.gameManager) {
            logger.error('Game manager not initialized');
            return;
        }
        
        // Start with Human vs Random AI
        this.gameManager.startNewGame({
            player1: { type: 'human', name: 'Circles' },
            player2: { type: 'random', name: 'Squares' }
        });
    }

    /**
     * Show game options dialog
     */
    showGameOptions() {
        const options = [
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
            if (event.target === modal || event.target.classList.contains('modal-close')) {
                modal.remove();
                style.remove();
            }
        });
        
        modal.addEventListener('click', (event) => {
            if (event.target.classList.contains('game-option')) {
                const optionId = event.target.dataset.option;
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
        this.renderPieceSelectionPanel(state);
    }

    renderPieceSelectionPanel(state) {
        if (!this.pieceSelectionPanel) return;
        // Only show during setup phase and for human player
        if (!state || state.gamePhase !== 'setup' || !this.gameManager || this.gameManager.currentPlayer.type !== 'human') {
            this.pieceSelectionPanel.innerHTML = '';
            return;
        }
        // Get unplaced pieces for current player
        const player = state.currentPlayer;
        const pieceDefs = this.pieceDefs.piece_definitions[player === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const placedPieces = Object.keys(state.pieces);
        const unplaced = Object.entries(pieceDefs)
            .filter(([id, def]) => !placedPieces.includes(id) && def.placement === 'setup_phase');
        console.log('[DEBUG] renderPieceSelectionPanel', { player, unplaced, state });
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
            btn.addEventListener('click', (e) => {
                const pieceId = btn.getAttribute('data-piece-id');
                this.selectedPieceId = pieceId;
                this.renderPieceSelectionPanel(state);
            });
        });
    }

    getPieceSymbol(type) {
        const symbols = { Ruby: 'R', Pearl: 'P', Amber: 'A', Jade: 'J', Amalgam: 'M', Portal: 'O', Void: 'V' };
        return symbols[type] || '?';
    }
    getPieceHotkey(type, idx) {
        // Assign hotkeys: R, P, A, J, 1-8 fallback
        const map = { Ruby: 'R', Pearl: 'P', Amber: 'A', Jade: 'J', Amalgam: 'M', Portal: 'O', Void: 'V' };
        return map[type] || (idx + 1);
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
        } else {
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
        this.showError(error.message || 'An error occurred');
    }

    /**
     * Update game information display
     */
    updateGameInfo(state) {
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
            
            if (scoreCirclesElement) scoreCirclesElement.textContent = circlesPieces;
            if (scoreSquaresElement) scoreSquaresElement.textContent = squaresPieces;
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
        
        // Add toast styles
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
        
        // Add toast styles if not already present
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
        
        document.body.appendChild(toast);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
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

// Patch GameManager to use selectedPieceId for placement
class PatchedGameManager extends OrigGameManager {
    constructor(...args) {
        super(...args);
        this.getSelectedPieceIdForPlacement = null; // callback
    }
    setSelectedPieceIdCallback(cb) {
        this.getSelectedPieceIdForPlacement = cb;
    }
    convertMoveIntentToMove(moveIntent) {
        if (!moveIntent || !moveIntent.coords) return null;
        const coords = moveIntent.coords;
        if (this.state.gamePhase === 'setup') {
            const unplacedPieces = this.getUnplacedPieces();
            let pieceId = null;
            if (this.getSelectedPieceIdForPlacement) {
                pieceId = this.getSelectedPieceIdForPlacement();
            }
            if (!pieceId || !unplacedPieces.includes(pieceId)) {
                pieceId = unplacedPieces[0];
            }
            if (pieceId) {
                return {
                    type: 'place',
                    pieceId,
                    toCoords: coords,
                    playerId: this.currentPlayer.id
                };
            }
        }
        // fallback to original
        return super.convertMoveIntentToMove(moveIntent);
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
