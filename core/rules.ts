/**
 * Pure game logic and rules for Amalgam
 * Implements move validation, application, ability system, and win condition checking
 * All functions are deterministic and side-effect free
 */

import { logger } from '../utils/logger.js';
import { 
    getIntersectionByCoords, 
    isEmptyIntersection, 
    placePiece, 
    removePiece, 
    movePiece,
    getPlayerPieces,
    countPlayerPieces,
    areAdjacent,
    distance,
    isStraightLine,
    getAdjacentCoords,
    getAdjacentIntersections,
    isGoldenLineIntersection,
    getGoldenLineConnections,
    isValidCoords
} from './board.js';
import type {
    GameState,
    Move,
    MoveResult,
    Ability,
    Formation,
    PieceDefinitions,
    Piece,
    PlayerId,
    Vector2,
    Board,
    PieceGraphics
} from './types.js';

/**
 * Check if a move is valid for the current game state
 * @param state - Current game state
 * @param move - Move to validate
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
export function isValidMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    logger.debug('Validating move', move);
    
    // Check if game is already over
    if (state.winner) {
        return { ok: false, reason: 'Game is already over' };
    }
    
    // Check if it's the player's turn
    if (move.playerId !== state.currentPlayer) {
        return { ok: false, reason: 'Not your turn' };
    }
    
    // Validate based on game phase
    if (state.gamePhase === 'setup') {
        return validateSetupMove(state, move, pieceDefs);
    } else {
        return validateGameplayMove(state, move, pieceDefs);
    }
}

/**
 * Validate a move during setup phase
 * @param state - Game state
 * @param move - Setup move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validateSetupMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    if (move.type !== 'place') {
        return { ok: false, reason: 'Only placement moves allowed during setup' };
    }
    
    const { pieceId, toCoords } = move;
    
    if (!pieceId || !toCoords) {
        return { ok: false, reason: 'Missing piece ID or coordinates' };
    }
    
    // Check if piece exists and belongs to player
    const pieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][pieceId];
    if (!pieceDef) {
        return { ok: false, reason: 'Invalid piece ID' };
    }
    
    // Check if piece is already placed
    if (state.pieces[pieceId]) {
        return { ok: false, reason: 'Piece already placed' };
    }
    
    // Check if coordinates are in valid starting area
    const startingArea = move.playerId === 'circles' ? 
        pieceDefs.board_data!.starting_areas.circles_starting_area.positions :
        pieceDefs.board_data!.starting_areas.squares_starting_area.positions;
    
    const isValidStartingPosition = startingArea.some(pos => 
        pos[0] === toCoords[0] && pos[1] === toCoords[1]
    );
    
    if (!isValidStartingPosition) {
        logger.info('Invalid starting position check:', {
            playerId: move.playerId,
            toCoords: toCoords,
            toCoordsString: `[${toCoords[0]}, ${toCoords[1]}]`,
            startingAreaSize: startingArea.length,
            samplePositions: startingArea.slice(0, 3),
            sampleStrings: startingArea.slice(0, 3).map(pos => `[${pos[0]}, ${pos[1]}]`)
        });
        return { ok: false, reason: 'Invalid starting area position' };
    }
    
    // Check if position is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Position already occupied' };
    }
    
    return { ok: true };
}

/**
 * Validate a move during gameplay phase
 * @param state - Game state
 * @param move - Gameplay move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validateGameplayMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    switch (move.type) {
        case 'standard':
            return validateStandardMove(state, move, pieceDefs);
        case 'nexus':
            return validateNexusMove(state, move, pieceDefs);
        case 'portal_swap':
            return validatePortalSwapMove(state, move, pieceDefs);
        case 'portal_line':
            return validatePortalLineMove(state, move, pieceDefs);
        case 'portal_standard':
            return validatePortalStandardMove(state, move, pieceDefs);
        case 'portal_phasing':
            return validatePortalPhasingMove(state, move, pieceDefs);
        default:
            return { ok: false, reason: 'Invalid move type' };
    }
}

/**
 * Validate a standard movement
 * @param state - Game state
 * @param move - Standard move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validateStandardMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has player's piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const pieceId = fromIntersection.piece;
    const pieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][pieceId];
    if (!pieceDef || pieceDef.player !== move.playerId) {
        return { ok: false, reason: 'Piece does not belong to player' };
    }
    
    // Check if destination is adjacent
    if (!areAdjacent(fromCoords, toCoords)) {
        return { ok: false, reason: 'Destination not adjacent to source' };
    }
    
    // Check if destination is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Destination occupied' };
    }
    
    // Check Portal restrictions - Portal pieces can only move to golden line intersections
    if (pieceDef.type === 'Portal' && !isGoldenLineIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Portal pieces can only move to golden line intersections' };
    }
    
    return { ok: true };
}

/**
 * Validate a nexus movement
 * @param state - Game state
 * @param move - Nexus move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validateNexusMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has player's piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    // Check if valid nexus formation exists
    const nexusFormations = findNexusFormations(state, move.playerId);
    if (nexusFormations.length === 0) {
        return { ok: false, reason: 'No valid nexus formation exists' };
    }
    
    // Check if source is adjacent to any nexus
    const isAdjacentToNexus = nexusFormations.some(formation => 
        formation.pieces.some(nexusCoords => areAdjacent(fromCoords, nexusCoords))
    );
    
    if (!isAdjacentToNexus) {
        return { ok: false, reason: 'Source not adjacent to nexus formation' };
    }
    
    // Check if destination is adjacent to any nexus
    const isDestinationAdjacentToNexus = nexusFormations.some(formation => 
        formation.pieces.some(nexusCoords => areAdjacent(toCoords, nexusCoords))
    );
    
    if (!isDestinationAdjacentToNexus) {
        return { ok: false, reason: 'Destination not adjacent to nexus formation' };
    }
    
    // Check if destination is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Destination occupied' };
    }
    
    return { ok: true };
}

/**
 * Validate a portal swap move
 * @param state - Game state
 * @param move - Portal swap move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validatePortalSwapMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has player's non-Portal piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const sourcePieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][fromIntersection.piece];
    if (!sourcePieceDef || sourcePieceDef.type === 'Portal') {
        return { ok: false, reason: 'Source piece must be non-Portal' };
    }
    
    // Check if source is on golden line
    if (!isGoldenLineIntersection(state.board, fromCoords)) {
        return { ok: false, reason: 'Source must be on golden line intersection' };
    }
    
    // Check if destination has player's Portal piece
    const toIntersection = getIntersectionByCoords(state.board, toCoords);
    if (!toIntersection || !toIntersection.piece) {
        return { ok: false, reason: 'No piece at destination position' };
    }
    
    const destPieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][toIntersection.piece];
    if (!destPieceDef || destPieceDef.type !== 'Portal') {
        return { ok: false, reason: 'Destination must have Portal piece' };
    }
    
    return { ok: true };
}

/**
 * Validate a portal line movement
 * @param state - Game state
 * @param move - Portal line move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validatePortalLineMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has Portal piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const pieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][fromIntersection.piece];
    if (!pieceDef || pieceDef.type !== 'Portal') {
        return { ok: false, reason: 'Source must have Portal piece' };
    }
    
    // Check if path exists along golden lines
    const path = findGoldenLinePath(state.board, fromCoords, toCoords);
    if (!path) {
        return { ok: false, reason: 'No valid golden line path to destination' };
    }
    
    // Check if path is blocked
    for (const pathCoords of path) {
        if (!isEmptyIntersection(state.board, pathCoords) && 
            !areAdjacent(pathCoords, fromCoords)) {
            return { ok: false, reason: 'Golden line path is blocked' };
        }
    }
    
    return { ok: true };
}

/**
 * Validate a portal standard movement
 * @param state - Game state
 * @param move - Portal standard move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validatePortalStandardMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has Portal piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const pieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][fromIntersection.piece];
    if (!pieceDef || pieceDef.type !== 'Portal') {
        return { ok: false, reason: 'Source must have Portal piece' };
    }
    
    // Check if destination is adjacent
    if (!areAdjacent(fromCoords, toCoords)) {
        return { ok: false, reason: 'Destination not adjacent to source' };
    }
    
    // Check if destination is on golden line
    if (!isGoldenLineIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Portal must land on golden line intersection' };
    }
    
    // Check if destination is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Destination occupied' };
    }
    
    return { ok: true };
}

/**
 * Validate a portal phasing movement
 * @param state - Game state
 * @param move - Portal phasing move
 * @param pieceDefs - Piece definitions
 * @returns Validation result
 */
function validatePortalPhasingMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const pieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][fromIntersection.piece];
    if (!pieceDef) {
        return { ok: false, reason: 'Invalid piece' };
    }
    
    // Check if path is straight line
    const path = findPhasingPath(state.board, fromCoords, toCoords, pieceDef.type === 'Portal');
    if (!path) {
        return { ok: false, reason: 'Invalid phasing path' };
    }
    
    // Check if destination is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Destination occupied' };
    }
    
    // Check Portal restrictions - Portal pieces can only move to golden line intersections
    if (pieceDef.type === 'Portal' && !isGoldenLineIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Portal pieces can only move to golden line intersections' };
    }
    
    return { ok: true };
}

/**
 * Apply a move to the current game state
 * @param state - Current game state
 * @param move - Move to apply
 * @param pieceDefs - Piece definitions
 * @returns Result with new state
 */
export function applyMove(state: GameState, move: Move, pieceDefs: PieceDefinitions): MoveResult {
    logger.debug('Applying move', move);
    
    // Validate move first
    const validation = isValidMove(state, move, pieceDefs);
    if (!validation.ok) {
        return validation;
    }
    
    // Create new state
    const newState: GameState = {
        ...state,
        board: { ...state.board, intersections: [...state.board.intersections] },
        pieces: { ...state.pieces },
        moveHistory: [...state.moveHistory, move]
    };
    
    // Apply move based on type
    switch (move.type) {
        case 'place':
            if (!move.toCoords || !move.pieceId) {
                return { ok: false, reason: 'Missing coordinates or piece ID for placement' };
            }
            
            newState.board = placePiece(newState.board, move.toCoords, move.pieceId);
            const pieceDef = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'][move.pieceId];
            
            // Create default graphics if not provided
            const graphics: PieceGraphics = pieceDef.graphics || {
                shape: move.playerId === 'circles' ? 'circle' : 'square',
                color: '#666',
                size: 10
            };
            
            newState.pieces[move.pieceId] = {
                id: move.pieceId,
                type: pieceDef.type,
                player: move.playerId,
                coords: move.toCoords,
                isPrePlaced: false,
                graphics: graphics
            };
            
            // Advance setup turn
            if (state.gamePhase === 'setup') {
                newState.setupTurn++;
                if (newState.setupTurn > 16) {
                    newState.gamePhase = 'gameplay';
                    newState.currentPlayer = 'squares'; // Squares goes first
                } else {
                    newState.currentPlayer = newState.currentPlayer === 'circles' ? 'squares' : 'circles';
                }
            }
            break;
            
        case 'standard':
        case 'nexus':
        case 'portal_standard':
        case 'portal_phasing':
            if (!move.fromCoords || !move.toCoords) {
                return { ok: false, reason: 'Missing from or to coordinates' };
            }
            
            // Get piece ID from source intersection if not provided in move
            const sourcePieceId = move.pieceId || getIntersectionByCoords(newState.board, move.fromCoords)?.piece;
            if (!sourcePieceId) {
                return { ok: false, reason: 'No piece found at source coordinates' };
            }
            
            newState.board = movePiece(newState.board, move.fromCoords, move.toCoords);
            newState.pieces[sourcePieceId].coords = move.toCoords;
            
            // Handle automatic attacks
            const attackResult = performAutomaticAttack(newState, move.toCoords, pieceDefs);
            newState.board = attackResult.board;
            newState.pieces = attackResult.pieces;
            
            // Switch players
            newState.currentPlayer = newState.currentPlayer === 'circles' ? 'squares' : 'circles';
            break;
            
        case 'portal_swap':
            if (!move.fromCoords || !move.toCoords) {
                return { ok: false, reason: 'Missing from or to coordinates' };
            }
            
            // Swap piece positions
            const fromPiece = newState.board.intersections.find(int => 
                int.coords[0] === move.fromCoords![0] && int.coords[1] === move.fromCoords![1]
            );
            const toPiece = newState.board.intersections.find(int => 
                int.coords[0] === move.toCoords![0] && int.coords[1] === move.toCoords![1]
            );
            
            if (!fromPiece || !toPiece) {
                return { ok: false, reason: 'Invalid swap coordinates' };
            }
            
            const tempPiece = fromPiece.piece;
            fromPiece.piece = toPiece.piece;
            toPiece.piece = tempPiece;
            
            // Update piece coordinates
            if (fromPiece.piece) {
                newState.pieces[fromPiece.piece].coords = move.fromCoords;
            }
            if (toPiece.piece) {
                newState.pieces[toPiece.piece].coords = move.toCoords;
            }
            
            newState.currentPlayer = newState.currentPlayer === 'circles' ? 'squares' : 'circles';
            break;
            
        case 'portal_line':
            if (!move.fromCoords || !move.toCoords) {
                return { ok: false, reason: 'Missing from or to coordinates' };
            }
            
            // Get piece ID from source intersection if not provided in move
            const linePieceId = move.pieceId || getIntersectionByCoords(newState.board, move.fromCoords)?.piece;
            if (!linePieceId) {
                return { ok: false, reason: 'No piece found at source coordinates' };
            }
            
            newState.board = movePiece(newState.board, move.fromCoords, move.toCoords);
            newState.pieces[linePieceId].coords = move.toCoords;
            
            // Handle automatic attacks
            const lineAttackResult = performAutomaticAttack(newState, move.toCoords, pieceDefs);
            newState.board = lineAttackResult.board;
            newState.pieces = lineAttackResult.pieces;
            
            newState.currentPlayer = newState.currentPlayer === 'circles' ? 'squares' : 'circles';
            break;
    }
    
    // Check for win condition
    const winCheck = checkWin(newState, pieceDefs);
    if (winCheck.winner) {
        newState.winner = winCheck.winner;
        newState.victoryType = winCheck.victoryType;
    }
    
    // Find available abilities
    const availableAbilities = findAvailableAbilities(newState, move.playerId, pieceDefs);
    
    return { 
        ok: true, 
        nextState: newState,
        destroyedPieces: [], // TODO: Track destroyed pieces
        availableAbilities: availableAbilities
    };
}

/**
 * Perform automatic attack after movement
 * @param state - Game state
 * @param coords - Coordinates of moved piece
 * @param pieceDefs - Piece definitions
 * @returns Updated state with attack results
 */
function performAutomaticAttack(state: GameState, coords: Vector2, pieceDefs: PieceDefinitions): { board: Board; pieces: Record<string, Piece> } {
    const newState = { board: { ...state.board, intersections: [...state.board.intersections] }, pieces: { ...state.pieces } };
    const movedPiece = getIntersectionByCoords(newState.board, coords);
    
    if (!movedPiece || !movedPiece.piece) {
        return newState;
    }
    
    const pieceDef = pieceDefs.piece_definitions[movedPiece.piece.startsWith('C_') ? 'circles_pieces' : 'squares_pieces'][movedPiece.piece];
    if (!pieceDef) {
        return newState;
    }
    
    const adjacentIntersections = getAdjacentIntersections(newState.board, coords);
    const destroyedPieces: string[] = [];
    
    for (const adjacent of adjacentIntersections) {
        if (!adjacent.piece) continue;
        
        const adjacentPieceDef = pieceDefs.piece_definitions[adjacent.piece.startsWith('C_') ? 'circles_pieces' : 'squares_pieces'][adjacent.piece];
        if (!adjacentPieceDef) continue;
        
        // Check if pieces are from different players
        if (pieceDef.player === adjacentPieceDef.player) continue;
        
        // Check if attack is valid based on piece types
        if (canAttack(pieceDef, adjacentPieceDef)) {
            // Remove attacked piece
            adjacent.piece = null;
            delete newState.pieces[adjacent.piece!];
            destroyedPieces.push(adjacent.piece!);
        }
    }
    
    return newState;
}

/**
 * Check if one piece can attack another
 * @param attackerDef - Attacker piece definition
 * @param targetDef - Target piece definition
 * @returns Whether attack is valid
 */
function canAttack(attackerDef: any, targetDef: any): boolean {
    if (attackerDef.type === 'Portal') {
        return targetDef.type === 'Portal';
    } else if (attackerDef.type === 'Void') {
        return true; // Void can attack everything
    } else {
        return targetDef.type !== 'Portal'; // Standard pieces cannot attack Portal
    }
}

/**
 * Check for win condition
 * @param state - Game state
 * @param pieceDefs - Piece definitions
 * @returns Win check result
 */
export function checkWin(state: GameState, pieceDefs: PieceDefinitions): { winner: PlayerId | null; victoryType?: string } {
    // Don't check for victory during setup phase
    if (state.gamePhase === 'setup') {
        return { winner: null };
    }
    
    // Check objective victory
    const circlesVoid = Object.values(state.pieces).find(p => p.id === 'C_Void');
    const squaresVoid = Object.values(state.pieces).find(p => p.id === 'S_Void');
    
    if (circlesVoid && circlesVoid.coords[0] === 0 && circlesVoid.coords[1] === -6) {
        return { winner: 'circles', victoryType: 'objective' };
    }
    
    if (squaresVoid && squaresVoid.coords[0] === 0 && squaresVoid.coords[1] === 6) {
        return { winner: 'squares', victoryType: 'objective' };
    }
    
    // Check elimination victory
    // Only count gem pieces placed during setup, not pre-placed pieces (Void, Amalgam, Portal)
    const circlesPieces = Object.values(state.pieces).filter(p => 
        p.player === 'circles' && 
        !p.isPrePlaced && 
        ['Ruby', 'Pearl', 'Amber', 'Jade'].includes(p.type)
    );
    const squaresPieces = Object.values(state.pieces).filter(p => 
        p.player === 'squares' && 
        !p.isPrePlaced && 
        ['Ruby', 'Pearl', 'Amber', 'Jade'].includes(p.type)
    );
    
    if (circlesPieces.length === 0) {
        return { winner: 'squares', victoryType: 'elimination' };
    }
    
    if (squaresPieces.length === 0) {
        return { winner: 'circles', victoryType: 'elimination' };
    }
    
    return { winner: null };
}

/**
 * Find nexus formations for a player
 * @param state - Game state
 * @param playerId - Player ID
 * @returns Array of nexus formations
 */
function findNexusFormations(state: GameState, playerId: PlayerId): Formation[] {
    const formations: Formation[] = [];
    const playerPieces = Object.values(state.pieces).filter(p => p.player === playerId);
    
    // Find Pearl + Amber combinations
    const pearls = playerPieces.filter(p => p.type === 'Pearl');
    const ambers = playerPieces.filter(p => p.type === 'Amber');
    const amalgams = playerPieces.filter(p => p.type === 'Amalgam');
    
    // Check Pearl + Amber
    for (const pearl of pearls) {
        for (const amber of ambers) {
            if (areAdjacent(pearl.coords, amber.coords)) {
                formations.push({
                    type: 'nexus',
                    pieces: [pearl.coords, amber.coords],
                    isAmplified: false
                });
            }
        }
    }
    
    // Check Pearl + Amalgam
    for (const pearl of pearls) {
        for (const amalgam of amalgams) {
            if (areAdjacent(pearl.coords, amalgam.coords)) {
                formations.push({
                    type: 'nexus',
                    pieces: [pearl.coords, amalgam.coords],
                    isAmplified: false
                });
            }
        }
    }
    
    // Check Amber + Amalgam
    for (const amber of ambers) {
        for (const amalgam of amalgams) {
            if (areAdjacent(amber.coords, amalgam.coords)) {
                formations.push({
                    type: 'nexus',
                    pieces: [amber.coords, amalgam.coords],
                    isAmplified: false
                });
            }
        }
    }
    
    return formations;
}

/**
 * Find golden line path between two coordinates
 * @param board - Board state
 * @param fromCoords - Source coordinates
 * @param toCoords - Target coordinates
 * @returns Path coordinates or null if no path
 */
function findGoldenLinePath(board: Board, fromCoords: Vector2, toCoords: Vector2): Vector2[] | null {
    // Simple pathfinding - this would need to be more sophisticated
    // For now, just check if there's a direct connection
    const connections = getGoldenLineConnections(board, fromCoords);
    const hasDirectConnection = connections.some(conn => 
        conn[0] === toCoords[0] && conn[1] === toCoords[1]
    );
    
    if (hasDirectConnection) {
        return [fromCoords, toCoords];
    }
    
    return null;
}

/**
 * Find phasing path between two coordinates
 * @param board - Board state
 * @param fromCoords - Source coordinates
 * @param toCoords - Target coordinates
 * @param isPortal - Whether moving piece is Portal
 * @returns Path coordinates or null if no path
 */
function findPhasingPath(board: Board, fromCoords: Vector2, toCoords: Vector2, isPortal: boolean): Vector2[] | null {
    const [fromX, fromY] = fromCoords;
    const [toX, toY] = toCoords;
    
    // Check if path is straight line
    if (fromX !== toX && fromY !== toY && Math.abs(fromX - toX) !== Math.abs(fromY - toY)) {
        return null;
    }
    
    // Calculate direction vector
    const dx = toX > fromX ? 1 : toX < fromX ? -1 : 0;
    const dy = toY > fromY ? 1 : toY < fromY ? -1 : 0;
    
    const path: Vector2[] = [];
    let currentX = fromX;
    let currentY = fromY;
    
    while (currentX !== toX || currentY !== toY) {
        currentX += dx;
        currentY += dy;
        path.push([currentX, currentY]);
        
        // Check if we hit a blocking piece
        const intersection = getIntersectionByCoords(board, [currentX, currentY]);
        if (intersection && intersection.piece) {
            const pieceType = intersection.piece.split('_')[1];
            if (pieceType === 'Portal' && !isPortal) {
                // Non-Portal can move through Portal
                continue;
            } else if (isPortal) {
                // Portal can move through anything
                continue;
            } else {
                // Hit a blocking piece
                return null;
            }
        }
    }
    
    return path;
}

/**
 * Find available abilities for a player
 * @param state - Game state
 * @param playerId - Player ID
 * @param pieceDefs - Piece definitions
 * @returns Array of available abilities
 */
function findAvailableAbilities(state: GameState, playerId: PlayerId, pieceDefs: PieceDefinitions): Ability[] {
    const abilities: Ability[] = [];
    const playerPieces = Object.values(state.pieces).filter(p => p.player === playerId);
    
    // Find all possible formations
    const formations = findFormations(playerPieces, pieceDefs);
    
    // Convert formations to abilities
    for (const formation of formations) {
        abilities.push({
            type: formation.type,
            formation: formation.pieces,
            direction: undefined, // Would be set by player choice
            playerId: playerId
        });
    }
    
    return abilities;
}

/**
 * Find all possible formations for pieces
 * @param pieces - Array of pieces
 * @param pieceDefs - Piece definitions
 * @returns Array of formations
 */
function findFormations(pieces: Piece[], pieceDefs: PieceDefinitions): Formation[] {
    const formations: Formation[] = [];
    
    // Find Fireball formations (Ruby + Ruby, Ruby + Amalgam)
    const rubies = pieces.filter(p => p.type === 'Ruby');
    const amalgams = pieces.filter(p => p.type === 'Amalgam');
    
    for (const ruby1 of rubies) {
        for (const ruby2 of rubies) {
            if (ruby1.id !== ruby2.id && areAdjacent(ruby1.coords, ruby2.coords) && 
                isStraightLine([ruby1.coords, ruby2.coords])) {
                formations.push({
                    type: 'fireball',
                    pieces: [ruby1.coords, ruby2.coords],
                    isAmplified: hasVoidAmplification(pieces, [ruby1.coords, ruby2.coords])
                });
            }
        }
    }
    
    for (const ruby of rubies) {
        for (const amalgam of amalgams) {
            if (areAdjacent(ruby.coords, amalgam.coords) && 
                isStraightLine([ruby.coords, amalgam.coords])) {
                formations.push({
                    type: 'fireball',
                    pieces: [ruby.coords, amalgam.coords],
                    isAmplified: hasVoidAmplification(pieces, [ruby.coords, amalgam.coords])
                });
            }
        }
    }
    
    // Similar logic for other abilities...
    // This is a simplified version - the full implementation would be much more complex
    
    return formations;
}

/**
 * Check if formation has Void amplification
 * @param pieces - All pieces
 * @param formationCoords - Formation coordinates
 * @returns Whether formation is amplified
 */
function hasVoidAmplification(pieces: Piece[], formationCoords: Vector2[]): boolean {
    const voids = pieces.filter(p => p.type === 'Void');
    
    for (const voidPiece of voids) {
        for (const formationCoord of formationCoords) {
            if (areAdjacent(voidPiece.coords, formationCoord)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Get all legal moves for a player
 * @param state - Game state
 * @param playerId - Player ID
 * @param pieceDefs - Piece definitions
 * @returns Array of legal moves
 */
export function getLegalMoves(state: GameState, playerId: PlayerId, pieceDefs: PieceDefinitions): Move[] {
    const moves: Move[] = [];
    
    if (state.gamePhase === 'setup') {
        // Setup phase moves
        const unplacedPieces = getUnplacedPieces(state, playerId, pieceDefs);
        const validPositions = getValidSetupPositions(state, playerId, pieceDefs);
        
        for (const pieceId of unplacedPieces) {
            for (const position of validPositions) {
                moves.push({
                    type: 'place',
                    pieceId: pieceId,
                    toCoords: position,
                    playerId: playerId
                });
            }
        }
    } else {
        // Gameplay moves
        const playerPieces = Object.values(state.pieces).filter(p => p.player === playerId);
        
        for (const piece of playerPieces) {
            const pieceMoves = getLegalMovesForPiece(state, piece, pieceDefs);
            moves.push(...pieceMoves);
        }
    }
    
    return moves;
}

/**
 * Get unplaced pieces for a player during setup
 * @param state - Game state
 * @param playerId - Player ID
 * @param pieceDefs - Piece definitions
 * @returns Array of unplaced piece IDs
 */
function getUnplacedPieces(state: GameState, playerId: PlayerId, pieceDefs: PieceDefinitions): string[] {
    const playerPieceDefs = pieceDefs.piece_definitions[playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'];
    const placedPieces = Object.keys(state.pieces);
    
    return Object.keys(playerPieceDefs).filter(pieceId => 
        !placedPieces.includes(pieceId) && playerPieceDefs[pieceId].placement === 'setup_phase'
    );
}

/**
 * Get valid setup positions for a player
 * @param state - Game state
 * @param playerId - Player ID
 * @param pieceDefs - Piece definitions
 * @returns Array of valid positions
 */
function getValidSetupPositions(state: GameState, playerId: PlayerId, pieceDefs: PieceDefinitions): Vector2[] {
    const startingArea = playerId === 'circles' ? 
        pieceDefs.board_data!.starting_areas.circles_starting_area.positions :
        pieceDefs.board_data!.starting_areas.squares_starting_area.positions;
    
    return startingArea.filter(position => 
        isEmptyIntersection(state.board, position)
    );
}

/**
 * Get legal moves for a specific piece
 * @param state - Game state
 * @param piece - Piece object
 * @param pieceDefs - Piece definitions
 * @returns Array of legal moves
 */
function getLegalMovesForPiece(state: GameState, piece: Piece, pieceDefs: PieceDefinitions): Move[] {
    const moves: Move[] = [];
    const pieceDef = pieceDefs.piece_definitions[piece.player === 'circles' ? 'circles_pieces' : 'squares_pieces'][piece.id];
    
    if (!pieceDef) return moves;
    
    // Standard movement
    const adjacentCoords = getAdjacentCoords(piece.coords);
    for (const coords of adjacentCoords) {
        if (isValidCoords(state.board, coords) && isEmptyIntersection(state.board, coords)) {
            if (pieceDef.type === 'Portal' && !isGoldenLineIntersection(state.board, coords)) {
                continue; // Portal must land on golden line
            }
            
            moves.push({
                type: 'standard',
                fromCoords: piece.coords,
                toCoords: coords,
                pieceId: piece.id,
                playerId: piece.player
            });
        }
    }
    
    // Other movement types would be added here...
    
    return moves;
}

/**
 * Check if a player has any legal moves
 * @param state - Game state
 * @param playerId - Player ID
 * @param pieceDefs - Piece definitions
 * @returns Whether player has legal moves
 */
export function hasLegalMoves(state: GameState, playerId: PlayerId, pieceDefs: PieceDefinitions): boolean {
    return getLegalMoves(state, playerId, pieceDefs).length > 0;
}