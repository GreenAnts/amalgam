/**
 * Player interfaces and implementations
 * Defines HumanPlayer and AIPlayer classes with consistent interfaces
 * AI players must not access DOM and should be pure functions
 */

import { logger } from '../utils/logger.js';
import { getLegalMoves } from '../core/rules.js';
import type { GameState, Move, PieceDefinitions, PlayerId, Intersection } from '../core/types.js';

/**
 * Base player class with common functionality
 */
export abstract class Player {
    public readonly id: PlayerId;
    public readonly name: string;
    public readonly isAI: boolean;
    public readonly type: string;
    
    protected moveCallback: ((move: Move | null) => void) | null = null;

    constructor(id: PlayerId, name: string, isAI: boolean = false, type: string = 'unknown') {
        this.id = id;
        this.name = name;
        this.isAI = isAI;
        this.type = type;
    }

    /**
     * Get the next move for this player
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    abstract getMove(state: GameState, pieceDefs: PieceDefinitions): Promise<Move | null>;

    /**
     * Check if this player can make a move
     * @param state - Current game state
     * @returns Whether player can move
     */
    canMove(state: GameState): boolean {
        return state.currentPlayer === this.id && !state.winner;
    }
    
    /**
     * Set move callback for human players
     * @param callback - Callback function
     */
    setMoveCallback(callback: (move: Move | null) => void): void {
        this.moveCallback = callback;
    }
}

/**
 * Human player implementation
 * Relies on external move input (typically from UI interactions)
 */
export class HumanPlayer extends Player {
    private pendingMove: Move | null = null;
    private moveResolvers: Array<(move: Move | null) => void> = [];

    constructor(id: PlayerId, name: string = 'Human') {
        super(id, name, false, 'human');
    }

    /**
     * Set a move intent from UI interaction
     * @param moveIntent - Move intent from UI
     */
    setMoveIntent(moveIntent: Move | null): void {
        this.pendingMove = moveIntent;
        
        // Resolve any waiting promises
        while (this.moveResolvers.length > 0) {
            const resolve = this.moveResolvers.shift()!;
            resolve(this.pendingMove);
        }
        
        this.pendingMove = null;
    }

    /**
     * Get the next move (waits for UI input)
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state: GameState, pieceDefs: PieceDefinitions): Promise<Move | null> {
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
    clearPendingMove(): void {
        this.pendingMove = null;
        this.moveResolvers.forEach(resolve => resolve(null));
        this.moveResolvers = [];
    }
}

/**
 * Simple AI player that makes random legal moves
 */
export class RandomAIPlayer extends Player {
    constructor(id: PlayerId, name: string = 'Random AI') {
        super(id, name, true, 'random');
    }

    /**
     * Get a random legal move
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state: GameState, pieceDefs: PieceDefinitions): Promise<Move | null> {
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
    constructor(id: PlayerId, name: string = 'Heuristic AI') {
        super(id, name, true, 'heuristic');
    }

    /**
     * Get a move using heuristic evaluation
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state: GameState, pieceDefs: PieceDefinitions): Promise<Move | null> {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }

        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        
        if (legalMoves.length === 0) {
            return null;
        }

        // Evaluate each move and choose the best one
        let bestMove: Move | null = null;
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
    private evaluateMove(state: GameState, move: Move): number {
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
    private evaluatePosition(state: GameState, coords: [number, number]): number {
        // Simple heuristic: positions closer to center are better
        const [x, y] = coords;
        const distanceFromCenter = Math.sqrt(x * x + y * y);
        
        // Closer to center is better (inverted distance)
        let score = Math.max(0, 12 - distanceFromCenter);
        
        // Golden line intersections are valuable
        const intersection = state.board.intersections.find(int => 
            int.coords[0] === x && int.coords[1] === y
        );
        
        if (intersection) {
            // Check if it's a golden line intersection
            const isGolden = state.board.goldenLineIntersections.some(glCoords => 
                glCoords[0] === x && glCoords[1] === y
            );
            
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
    private searchDepth: number;

    constructor(id: PlayerId, name: string = 'Minimax AI', depth: number = 3) {
        super(id, name, true, 'minimax');
        this.searchDepth = depth;
    }

    /**
     * Get a move using minimax search
     * @param state - Current game state
     * @param pieceDefs - Piece definitions
     * @returns Promise resolving to move intent
     */
    async getMove(state: GameState, pieceDefs: PieceDefinitions): Promise<Move | null> {
        if (!this.canMove(state)) {
            throw new Error('Not this player\'s turn');
        }

        const legalMoves = getLegalMoves(state, this.id, pieceDefs);
        
        if (legalMoves.length === 0) {
            return null;
        }

        // Use minimax to find best move
        let bestMove: Move | null = null;
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
    private minimax(state: GameState, move: Move, depth: number, isMaximizing: boolean, pieceDefs: PieceDefinitions): number {
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
    private evaluateMove(state: GameState, move: Move): number {
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
export function createPlayer(type: string, id: PlayerId, name: string, options: Record<string, any> = {}): Player {
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