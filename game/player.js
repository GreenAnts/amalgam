/**
 * Player interfaces and implementations
 * Defines HumanPlayer and AIPlayer classes with consistent interfaces
 * AI players must not access DOM and should be pure functions
 */
import { logger } from '../utils/logger.js';
import { getLegalMoves, isValidMove } from '../core/rules.js';
import { getAdjacentCoords } from '../core/board.js';
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
        logger.debug(`RandomAI ${this.id}: Getting move for phase ${state.gamePhase}`);
        // Handle setup phase specifically (since getLegalMoves isn't implemented yet)
        if (state.gamePhase === 'setup') {
            return this.getSetupMove(state, pieceDefs);
        }
        // For gameplay phase, try to make a random move
        logger.debug(`RandomAI ${this.id}: Attempting gameplay move`);
        return this.getGameplayMove(state, pieceDefs);
    }
    /**
     * Get setup phase move for AI player
     */
    async getSetupMove(state, pieceDefs) {
        logger.debug(`RandomAI ${this.id}: Getting setup move`);
        // Get unplaced pieces for this player
        const playerPieces = pieceDefs.piece_definitions[this.id === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const placedPieces = Object.keys(state.pieces);
        const unplacedPieces = Object.entries(playerPieces)
            .filter(([pieceId, pieceDef]) => !placedPieces.includes(pieceId) && pieceDef.placement === 'setup_phase');
        if (unplacedPieces.length === 0) {
            logger.debug(`RandomAI ${this.id}: No unplaced pieces available`);
            return null;
        }
        // Get valid starting positions
        if (!pieceDefs.board_data?.starting_areas) {
            logger.error(`RandomAI ${this.id}: No starting areas defined`);
            return null;
        }
        const startingArea = this.id === 'circles' ?
            pieceDefs.board_data.starting_areas.circles_starting_area.positions :
            pieceDefs.board_data.starting_areas.squares_starting_area.positions;
        // Filter out occupied positions
        const validPositions = startingArea.filter(pos => {
            const intersection = state.board.intersections.find(int => int.coords[0] === pos[0] && int.coords[1] === pos[1]);
            return intersection && !intersection.piece;
        });
        if (validPositions.length === 0) {
            logger.debug(`RandomAI ${this.id}: No valid positions available`);
            return null;
        }
        // Add thinking delay for better UX
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        // Select random piece and position
        const [pieceId] = unplacedPieces[Math.floor(Math.random() * unplacedPieces.length)];
        const position = validPositions[Math.floor(Math.random() * validPositions.length)];
        const move = {
            type: 'place',
            pieceId,
            toCoords: position,
            playerId: this.id
        };
        logger.debug(`RandomAI ${this.id}: Selected setup move`, move);
        return move;
    }
    /**
     * Get gameplay phase move for AI player
     */
    async getGameplayMove(state, pieceDefs) {
        logger.debug(`RandomAI ${this.id}: Getting gameplay move`);
        // Get all pieces belonging to this player
        const playerPieces = Object.values(state.pieces).filter(p => p.player === this.id);
        if (playerPieces.length === 0) {
            logger.debug(`RandomAI ${this.id}: No pieces available`);
            return null;
        }
        // Try to find a valid move (try up to 10 random attempts)
        for (let attempt = 0; attempt < 10; attempt++) {
            // Pick a random piece
            const piece = playerPieces[Math.floor(Math.random() * playerPieces.length)];
            // Get adjacent coordinates
            const adjacentCoords = getAdjacentCoords(piece.coords);
            if (adjacentCoords.length === 0)
                continue;
            // Pick a random adjacent position
            const targetCoords = adjacentCoords[Math.floor(Math.random() * adjacentCoords.length)];
            // Create potential move
            const move = {
                type: 'standard',
                fromCoords: piece.coords,
                toCoords: targetCoords,
                playerId: this.id
            };
            // Check if move is valid using rules module
            const validation = isValidMove(state, move, pieceDefs);
            if (validation.ok) {
                logger.debug(`RandomAI ${this.id}: Found valid move for ${piece.id}`, move);
                // Add minimal thinking delay for better responsiveness
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                return move;
            }
        }
        logger.debug(`RandomAI ${this.id}: No valid moves found after 10 attempts`);
        // Return null if no valid move found - this will pause the game gracefully
        return null;
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
        logger.debug(`HeuristicAI ${this.id}: Getting move for phase ${state.gamePhase}`);
        // Handle setup phase specifically
        if (state.gamePhase === 'setup') {
            return this.getSetupMove(state, pieceDefs);
        }
        // For gameplay phase, try to make a strategic move
        logger.debug(`HeuristicAI ${this.id}: Attempting strategic gameplay move`);
        return this.getGameplayMove(state, pieceDefs);
    }
    /**
     * Get gameplay phase move for Heuristic AI player (strategic movement)
     */
    async getGameplayMove(state, pieceDefs) {
        logger.debug(`HeuristicAI ${this.id}: Getting strategic gameplay move`);
        // Get all pieces belonging to this player
        const playerPieces = Object.values(state.pieces).filter(p => p.player === this.id);
        if (playerPieces.length === 0) {
            logger.debug(`HeuristicAI ${this.id}: No pieces available`);
            return null;
        }
        let bestMove = null;
        let bestScore = -Infinity;
        // Evaluate all possible moves for all pieces
        for (const piece of playerPieces) {
            const adjacentCoords = getAdjacentCoords(piece.coords);
            for (const targetCoords of adjacentCoords) {
                const move = {
                    type: 'standard',
                    fromCoords: piece.coords,
                    toCoords: targetCoords,
                    playerId: this.id
                };
                // Check if move is valid
                const validation = isValidMove(state, move, pieceDefs);
                if (validation.ok) {
                    // Evaluate the move strategically
                    let moveScore = 0;
                    // Prefer moves toward the center
                    const [x, y] = targetCoords;
                    const distanceFromCenter = Math.sqrt(x * x + y * y);
                    moveScore += Math.max(0, 12 - distanceFromCenter);
                    // Prefer moves that advance toward opponent's side
                    if (this.id === 'circles' && y < piece.coords[1]) {
                        moveScore += 5; // Moving toward squares (downward)
                    }
                    else if (this.id === 'squares' && y > piece.coords[1]) {
                        moveScore += 5; // Moving toward circles (upward)
                    }
                    // Prefer moves by more valuable pieces
                    switch (piece.type) {
                        case 'Void':
                            moveScore += 20; // Void is most important
                            break;
                        case 'Amalgam':
                            moveScore += 15; // Amalgam is very important
                            break;
                        case 'Ruby':
                        case 'Pearl':
                        case 'Amber':
                        case 'Jade':
                            moveScore += 10; // Gem pieces are important
                            break;
                        case 'Portal':
                            moveScore += 5; // Portals are utility pieces
                            break;
                    }
                    // Add some randomness to prevent predictable play
                    moveScore += Math.random() * 2;
                    if (moveScore > bestScore) {
                        bestScore = moveScore;
                        bestMove = move;
                    }
                }
            }
        }
        if (bestMove) {
            logger.debug(`HeuristicAI ${this.id}: Selected strategic move with score ${bestScore}`, bestMove);
            // Add minimal thinking delay for better responsiveness
            await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));
            return bestMove;
        }
        logger.debug(`HeuristicAI ${this.id}: No valid strategic moves found`);
        return null;
    }
    /**
     * Get setup phase move for Heuristic AI player (better strategy than random)
     */
    async getSetupMove(state, pieceDefs) {
        logger.debug(`HeuristicAI ${this.id}: Getting strategic setup move`);
        // Get unplaced pieces for this player
        const playerPieces = pieceDefs.piece_definitions[this.id === 'circles' ? 'circles_pieces' : 'squares_pieces'];
        const placedPieces = Object.keys(state.pieces);
        const unplacedPieces = Object.entries(playerPieces)
            .filter(([pieceId, pieceDef]) => !placedPieces.includes(pieceId) && pieceDef.placement === 'setup_phase');
        if (unplacedPieces.length === 0) {
            logger.debug(`HeuristicAI ${this.id}: No unplaced pieces available`);
            return null;
        }
        // Get valid starting positions
        if (!pieceDefs.board_data?.starting_areas) {
            logger.error(`HeuristicAI ${this.id}: No starting areas defined`);
            return null;
        }
        const startingArea = this.id === 'circles' ?
            pieceDefs.board_data.starting_areas.circles_starting_area.positions :
            pieceDefs.board_data.starting_areas.squares_starting_area.positions;
        // Filter out occupied positions
        const validPositions = startingArea.filter(pos => {
            const intersection = state.board.intersections.find(int => int.coords[0] === pos[0] && int.coords[1] === pos[1]);
            return intersection && !intersection.piece;
        });
        if (validPositions.length === 0) {
            logger.debug(`HeuristicAI ${this.id}: No valid positions available`);
            return null;
        }
        // Add minimal thinking delay for better responsiveness
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        // Simple heuristic: prefer central positions and spread pieces out
        const centerY = this.id === 'circles' ? 9 : -9; // Center of starting area
        // Score positions based on distance from center and existing pieces
        const scoredPositions = validPositions.map(pos => {
            let score = 0;
            // Prefer positions closer to center of starting area
            const distanceFromCenter = Math.abs(pos[1] - centerY) + Math.abs(pos[0]);
            score -= distanceFromCenter;
            // Prefer positions that spread pieces out (avoid clustering)
            const myPieces = Object.values(state.pieces).filter(p => p.player === this.id);
            let minDistanceToMyPieces = Infinity;
            for (const piece of myPieces) {
                const distance = Math.abs(piece.coords[0] - pos[0]) + Math.abs(piece.coords[1] - pos[1]);
                minDistanceToMyPieces = Math.min(minDistanceToMyPieces, distance);
            }
            if (minDistanceToMyPieces !== Infinity) {
                score += minDistanceToMyPieces * 2; // Bonus for spreading out
            }
            return { position: pos, score };
        });
        // Sort by score and pick the best position
        scoredPositions.sort((a, b) => b.score - a.score);
        const bestPosition = scoredPositions[0].position;
        // Select piece type strategically (vary the types)
        const pieceTypeCounts = Object.values(state.pieces)
            .filter(p => p.player === this.id)
            .reduce((counts, piece) => {
            counts[piece.type] = (counts[piece.type] || 0) + 1;
            return counts;
        }, {});
        // Prefer piece types we have fewer of
        const sortedUnplacedPieces = unplacedPieces.sort(([, defA], [, defB]) => {
            const countA = pieceTypeCounts[defA.type] || 0;
            const countB = pieceTypeCounts[defB.type] || 0;
            return countA - countB; // Sort by least placed first
        });
        const [pieceId] = sortedUnplacedPieces[0];
        const move = {
            type: 'place',
            pieceId,
            toCoords: bestPosition,
            playerId: this.id
        };
        logger.debug(`HeuristicAI ${this.id}: Selected strategic setup move`, move);
        return move;
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
