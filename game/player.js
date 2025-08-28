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
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.isAI = false;
    }

    /**
     * Get the next move for this player
     * @param {Object} state - Current game state
     * @returns {Promise<Object>} - Promise resolving to move intent
     */
    async getMove(state) {
        throw new Error('getMove must be implemented by subclass');
    }

    /**
     * Check if this player can make a move
     * @param {Object} state - Current game state
     * @returns {boolean} - Whether player can move
     */
    canMove(state) {
        return state.currentPlayer === this.id && !state.winner;
    }
}

/**
 * Human player implementation
 * Relies on external move input (typically from UI interactions)
 */
export class HumanPlayer extends Player {
    constructor(id, name = 'Human') {
        super(id, name);
        this.isAI = false;
        this.pendingMove = null;
        this.moveResolvers = [];
    }

    /**
     * Set a move intent from UI interaction
     * @param {Object} moveIntent - Move intent from UI
     */
    setMoveIntent(moveIntent) {
        this.pendingMove = moveIntent;
        
        // Resolve any waiting promises
        while (this.moveResolvers.length > 0) {
            const resolve = this.moveResolvers.shift();
            resolve(this.pendingMove);
        }
        
        this.pendingMove = null;
    }

    /**
     * Get the next move (waits for UI input)
     * @param {Object} state - Current game state
     * @returns {Promise<Object>} - Promise resolving to move intent
     */
    async getMove(state) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }

        return new Promise((resolve) => {
            // If we already have a pending move, resolve immediately
            if (this.pendingMove) {
                const move = this.pendingMove;
                this.pendingMove = null;
                resolve(move);
                return;
            }
            
            // Otherwise, wait for move input
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
        super(id, name);
        this.isAI = true;
    }

    /**
     * Get a random legal move
     * @param {Object} state - Current game state
     * @returns {Promise<Object>} - Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }

        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        
        if (legalMoves.length === 0) {
            // No legal moves, pass
            return {
                type: 'pass',
                playerId: this.id,
                meta: { source: 'ai', strategy: 'random' }
            };
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
        super(id, name);
        this.isAI = true;
    }

    /**
     * Get a move using heuristic evaluation
     * @param {Object} state - Current game state
     * @returns {Promise<Object>} - Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }

        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        
        if (legalMoves.length === 0) {
            return {
                type: 'pass',
                playerId: this.id,
                meta: { source: 'ai', strategy: 'heuristic' }
            };
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
        
        return {
            ...bestMove,
            meta: { source: 'ai', strategy: 'heuristic', score: bestScore }
        };
    }

    /**
     * Evaluate a move using simple heuristics
     * @param {Object} state - Current game state
     * @param {Object} move - Move to evaluate
     * @returns {number} - Move score (higher is better)
     */
    evaluateMove(state, move) {
        let score = 0;

        switch (move.type) {
            case 'capture':
                // Captures are very good
                score += 100;
                break;
                
            case 'place':
                // Placing pieces is good, especially in strategic positions
                score += 10;
                score += this.evaluatePosition(state, move.intersectionId);
                break;
                
            case 'move':
                // Moving pieces is moderately good
                score += 5;
                score += this.evaluatePosition(state, move.intersectionId);
                break;
        }

        return score;
    }

    /**
     * Evaluate the strategic value of a position
     * @param {Object} state - Game state
     * @param {number} intersectionId - Intersection ID
     * @returns {number} - Position score
     */
    evaluatePosition(state, intersectionId) {
        // Simple heuristic: positions with more connections are better
        const intersection = state.board.intersections.find(int => int.id === intersectionId);
        if (!intersection) return 0;

        // Count connections to this intersection
        const connections = state.board.connections.filter(([id1, id2]) => 
            id1 === intersectionId || id2 === intersectionId
        ).length;

        return connections * 2;
    }
}

/**
 * AI player that uses minimax search
 */
export class MinimaxAIPlayer extends Player {
    constructor(id, name = 'Minimax AI', depth = 3) {
        super(id, name);
        this.isAI = true;
        this.searchDepth = depth;
    }

    /**
     * Get a move using minimax search
     * @param {Object} state - Current game state
     * @returns {Promise<Object>} - Promise resolving to move intent
     */
    async getMove(state, pieceDefs) {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }

        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        
        if (legalMoves.length === 0) {
            return {
                type: 'pass',
                playerId: this.id,
                meta: { source: 'ai', strategy: 'minimax' }
            };
        }

        // Use minimax to find best move
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of legalMoves) {
            const score = this.minimax(state, move, this.searchDepth, false);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        logger.debug(`Minimax AI chose move with score ${bestScore}:`, bestMove);
        
        return {
            ...bestMove,
            meta: { source: 'ai', strategy: 'minimax', score: bestScore, depth: this.searchDepth }
        };
    }

    /**
     * Minimax search algorithm
     * @param {Object} state - Game state
     * @param {Object} move - Move to evaluate
     * @param {number} depth - Search depth
     * @param {boolean} isMaximizing - Whether maximizing player
     * @returns {number} - Move score
     */
    minimax(state, move, depth, isMaximizing) {
        // This is a simplified implementation
        // In a real implementation, you would apply the move and search deeper
        
        if (depth === 0) {
            return this.evaluatePosition(state, move.intersectionId || 0);
        }

        // For now, just return a simple evaluation
        return this.evaluateMove(state, move);
    }

    /**
     * Evaluate a move (simplified for this implementation)
     * @param {Object} state - Game state
     * @param {Object} move - Move to evaluate
     * @returns {number} - Move score
     */
    evaluateMove(state, move) {
        let score = 0;

        switch (move.type) {
            case 'capture':
                score += 100;
                break;
            case 'place':
                score += 10;
                break;
            case 'move':
                score += 5;
                break;
        }

        return score;
    }

    /**
     * Evaluate position (simplified)
     * @param {Object} state - Game state
     * @param {number} intersectionId - Intersection ID
     * @returns {number} - Position score
     */
    evaluatePosition(state, intersectionId) {
        return 1; // Simplified evaluation
    }
}

/**
 * Create a player instance based on type
 * @param {string} type - Player type ('human', 'random', 'heuristic', 'minimax')
 * @param {string} id - Player ID
 * @param {string} name - Player name
 * @param {Object} options - Additional options
 * @returns {Player} - Player instance
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
