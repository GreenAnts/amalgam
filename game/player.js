/**
 * Player interfaces and implementations
 * Defines HumanPlayer and AIPlayer classes with consistent interfaces
 * AI players must not access DOM and should be pure functions
 */
import { logger } from '../utils/logger.js';
import { getLegalMoves } from '../core/rules.js';
/**
 * Base player class with common functionality
 */
export class Player {
    constructor(id, name, isAI = false, type = 'unknown') {
        this.moveCallback = null;
        this.id = id;
        this.name = name;
        this.isAI = isAI;
        this.type = type;
    }
    /**
     * Check if this player can make a move
     * @param state - Current game state
     * @returns Whether player can move
     */
    canMove(state) {
        return state.currentPlayer === this.id && !state.winner;
    }
    /**
     * Set move callback for human players
     * @param callback - Callback function
     */
    setMoveCallback(callback) {
        this.moveCallback = callback;
    }
}
/**
 * Human player implementation
 * Relies on external move input (typically from UI interactions)
 */
export class HumanPlayer extends Player {
    constructor(id, name = 'Human') {
        super(id, name, false, 'human');
        this.pendingMove = null;
        this.moveResolvers = [];
    }
    /**
     * Set a move intent from UI interaction
     * @param moveIntent - Move intent from UI
     */
    setMoveIntent(moveIntent) {
        logger.debug(`HumanPlayer.setMoveIntent called with move:`, moveIntent);
        this.pendingMove = moveIntent;
        // Resolve any waiting promises
        logger.debug(`HumanPlayer.setMoveIntent: resolving ${this.moveResolvers.length} waiting promises`);
        while (this.moveResolvers.length > 0) {
            const resolve = this.moveResolvers.shift();
            resolve(this.pendingMove);
        }
        this.pendingMove = null;
        logger.debug('HumanPlayer.setMoveIntent: completed');
    }
    /**
     * Get the next move (waits for UI input)
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }
        logger.debug('HumanPlayer.getMove: creating new Promise');
        return new Promise((resolve) => {
            // If we already have a pending move, resolve immediately
            if (this.pendingMove) {
                const move = this.pendingMove;
                this.pendingMove = null;
                logger.debug('HumanPlayer.getMove: resolving immediately with pending move');
                resolve(move);
                return;
            }
            // Otherwise, wait for move input
            logger.debug('HumanPlayer.getMove: adding resolver to queue, waiting for move input');
            this.moveResolvers.push(resolve);
        });
    }
    /**
     * Clear any pending moves
     */
    clearPendingMove() {
        this.pendingMove = null;
        this.moveResolvers.forEach(resolve => resolve(null));
        this.moveResolvers = [];
    }
}
/**
 * Simple AI player that makes random legal moves
 */
export class RandomAIPlayer extends Player {
    constructor(id, name = 'Random AI') {
        super(id, name, true, 'random');
    }
    /**
     * Get a random legal move
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }
        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        if (legalMoves.length === 0) {
            // No legal moves, return null
            return null;
        }
        // Choose random move
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const move = legalMoves[randomIndex];
        logger.debug(`Random AI chose move:`, move);
        return {
            ...move,
            meta: { source: 'ai', strategy: 'random' }
        };
    }
}
/**
 * AI player that uses a simple heuristic strategy
 */
export class HeuristicAIPlayer extends Player {
    constructor(id, name = 'Heuristic AI') {
        super(id, name, true, 'heuristic');
    }
    /**
     * Get a move using heuristic evaluation
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }
        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        if (legalMoves.length === 0) {
            return null;
        }
        // Evaluate each move and choose the best one
        let bestMove = null;
        let bestScore = -Infinity;
        for (const move of legalMoves) {
            const score = this.evaluateMove(state, move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        logger.debug(`Heuristic AI chose move with score ${bestScore}:`, bestMove);
        return bestMove ? {
            ...bestMove,
            meta: { source: 'ai', strategy: 'heuristic', score: bestScore }
        } : null;
    }
    /**
     * Evaluate a move using simple heuristics
     * @param state - Current game state
     * @param move - Move to evaluate
     * @returns Move score (higher is better)
     */
    evaluateMove(state, move) {
        let score = 0;
        switch (move.type) {
            case 'place':
                // Placing pieces is good, especially in strategic positions
                score += 10;
                if (move.toCoords) {
                    score += this.evaluatePosition(state, move.toCoords);
                }
                break;
            case 'standard':
            case 'nexus':
            case 'portal_standard':
            case 'portal_phasing':
                // Moving pieces is moderately good
                score += 5;
                if (move.toCoords) {
                    score += this.evaluatePosition(state, move.toCoords);
                }
                break;
            case 'portal_swap':
                // Portal swaps are strategic
                score += 8;
                break;
            case 'portal_line':
                // Portal line moves are powerful
                score += 12;
                break;
        }
        return score;
    }
    /**
     * Evaluate the strategic value of a position
     * @param state - Game state
     * @param coords - Coordinates to evaluate
     * @returns Position score
     */
    evaluatePosition(state, coords) {
        // Simple heuristic: positions closer to center are better
        const [x, y] = coords;
        const distanceFromCenter = Math.sqrt(x * x + y * y);
        // Closer to center is better (inverted distance)
        let score = Math.max(0, 12 - distanceFromCenter);
        // Golden line intersections are valuable
        const intersection = state.board.intersections.find(int => int.coords[0] === x && int.coords[1] === y);
        if (intersection) {
            // Check if it's a golden line intersection
            const isGolden = state.board.goldenLineIntersections.some(glCoords => glCoords[0] === x && glCoords[1] === y);
            if (isGolden) {
                score += 5;
            }
        }
        return score;
    }
}
/**
 * AI player that uses minimax search
 */
export class MinimaxAIPlayer extends Player {
    constructor(id, name = 'Minimax AI', depth = 3) {
        super(id, name, true, 'minimax');
        this.searchDepth = depth;
    }
    /**
     * Get a move using minimax search
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }
        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        if (legalMoves.length === 0) {
            return null;
        }
        // Use minimax to find best move
        let bestMove = null;
        let bestScore = -Infinity;
        for (const move of legalMoves) {
            const score = this.minimax(state, move, this.searchDepth, false, pieceDefs);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        logger.debug(`Minimax AI chose move with score ${bestScore}:`, bestMove);
        return bestMove ? {
            ...bestMove,
            meta: { source: 'ai', strategy: 'minimax', score: bestScore, depth: this.searchDepth }
        } : null;
    }
    /**
     * Minimax search algorithm
     * @param state - Game state
     * @param move - Move to evaluate
     * @param depth - Search depth
     * @param isMaximizing - Whether maximizing player
     * @param pieceDefs - Piece definitions
     * @returns Move score
     */
    minimax(state, move, depth, isMaximizing, pieceDefs) {
        // This is a simplified implementation
        // In a real implementation, you would apply the move and search deeper
        if (depth === 0) {
            return this.evaluateMove(state, move);
        }
        // For now, just return a simple evaluation
        return this.evaluateMove(state, move);
    }
    /**
     * Evaluate a move (simplified for this implementation)
     * @param state - Game state
     * @param move - Move to evaluate
     * @returns Move score
     */
    evaluateMove(state, move) {
        let score = 0;
        switch (move.type) {
            case 'place':
                score += 10;
                break;
            case 'standard':
            case 'nexus':
            case 'portal_standard':
            case 'portal_phasing':
                score += 5;
                break;
            case 'portal_swap':
                score += 8;
                break;
            case 'portal_line':
                score += 12;
                break;
        }
        return score;
    }
}
/**
 * Create a player instance based on type
 * @param type - Player type ('human', 'random', 'heuristic', 'minimax')
 * @param id - Player ID
 * @param name - Player name
 * @param options - Additional options
 * @returns Player instance
 */
export function createPlayer(type, id, name, options = {}) {
    switch (type) {
        case 'human':
            return new HumanPlayer(id, name);
        case 'random':
            return new RandomAIPlayer(id, name);
        case 'heuristic':
            return new HeuristicAIPlayer(id, name);
        case 'minimax':
            return new MinimaxAIPlayer(id, name, options.depth || 3);
        default:
            throw new Error(`Unknown player type: ${type}`);
    }
}
