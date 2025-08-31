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
    logger.debug('validateSetupMove: Starting setup move validation', {
        move: move,
        gamePhase: state.gamePhase,
        setupTurn: state.setupTurn,
        currentPlayer: state.currentPlayer
    });
    
    if (move.type !== 'place') {
        return { ok: false, reason: 'Only placement moves allowed during setup' };
    }
    
    const { pieceId, toCoords } = move;
    
    if (!pieceId || !toCoords) {
        return { ok: false, reason: 'Missing piece ID or coordinates' };
    }
    
    // Validate turn order - ensure it's actually this player's turn
    if (move.playerId !== state.currentPlayer) {
        return { ok: false, reason: `Not ${move.playerId}'s turn (current: ${state.currentPlayer})` };
    }
    
    // Check if piece exists and belongs to player
    const playerPieces = pieceDefs.piece_definitions[move.playerId === 'circles' ? 'circles_pieces' : 'squares_pieces'];
    const pieceDef = playerPieces[pieceId];
    if (!pieceDef) {
        return { ok: false, reason: `Invalid piece ID: ${pieceId}` };
    }
    
    // Check if this is a setup phase piece
    if (pieceDef.placement !== 'setup_phase') {
        return { ok: false, reason: `Piece ${pieceId} cannot be placed during setup phase` };
    }
    
    // Check if piece is already placed
    if (state.pieces[pieceId]) {
        return { ok: false, reason: `Piece ${pieceId} already placed` };
    }
    
    // Validate piece type limits (max 2 of each gem type)
    const existingPiecesOfType = Object.values(state.pieces).filter(p => 
        p.player === move.playerId && p.type === pieceDef.type
    );
    if (existingPiecesOfType.length >= 2) {
        return { ok: false, reason: `Already placed maximum pieces of type ${pieceDef.type}` };
    }
    
    // Check if coordinates are in valid starting area
    if (!pieceDefs.board_data?.starting_areas) {
        return { ok: false, reason: 'Starting areas not defined in piece definitions' };
    }
    
    const startingArea = move.playerId === 'circles' ? 
        pieceDefs.board_data.starting_areas.circles_starting_area.positions :
        pieceDefs.board_data.starting_areas.squares_starting_area.positions;
    
    logger.debug('Validating coordinates against starting area:', {
        playerId: move.playerId,
        toCoords: toCoords,
        startingAreaSize: startingArea.length,
        sampleStartingPositions: startingArea.slice(0, 3)
    });
    
    const isValidStartingPosition = startingArea.some(pos => 
        pos[0] === toCoords[0] && pos[1] === toCoords[1]
    );
    
    if (!isValidStartingPosition) {
        logger.warn('Invalid starting position:', {
            playerId: move.playerId,
            toCoords: toCoords,
            startingAreaType: move.playerId === 'circles' ? 'circles' : 'squares',
            reason: 'Coordinates not found in starting area'
        });
        return { ok: false, reason: `Position [${toCoords[0]}, ${toCoords[1]}] not in ${move.playerId} starting area` };
    }
    
    // Check if position is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: `Position [${toCoords[0]}, ${toCoords[1]}] already occupied` };
    }
    
    logger.debug('validateSetupMove: Setup move validation passed');
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
            return validatePortalStandardMove(state, move);
        case 'portal_phasing':
            return validatePortalPhasingMove(state, move);
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
    
    // Check if source is adjacent to any nexus (but cannot use formations it's part of)
    const isAdjacentToNexus = nexusFormations.some(formation => {
        // First check if the moving piece is part of this specific formation
        const isPartOfThisFormation = formation.pieces.some(nexusCoords => 
            fromCoords[0] === nexusCoords[0] && fromCoords[1] === nexusCoords[1]
        );
        
        // If piece is part of this formation, it cannot use this formation
        if (isPartOfThisFormation) {
            return false;
        }
        
        // Check if piece is adjacent to any piece in this formation
        return formation.pieces.some(nexusCoords => 
            areAdjacent(fromCoords, nexusCoords)
        );
    });
    
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
    
    // Get piece from state.pieces collection
    const sourcePiece = state.pieces[fromIntersection.piece];
    if (!sourcePiece || sourcePiece.player !== move.playerId) {
        return { ok: false, reason: 'Source piece does not belong to player' };
    }
    
    if (sourcePiece.type === 'Portal') {
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
    
    const destPiece = state.pieces[toIntersection.piece];
    if (!destPiece || destPiece.player !== move.playerId) {
        return { ok: false, reason: 'Destination piece does not belong to player' };
    }
    
    if (destPiece.type !== 'Portal') {
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
    
    const piece = state.pieces[fromIntersection.piece];
    if (!piece || piece.player !== move.playerId) {
        return { ok: false, reason: 'Source piece does not belong to player' };
    }
    
    if (piece.type !== 'Portal') {
        return { ok: false, reason: 'Source must have Portal piece' };
    }
    
    // Check if destination is directly connected via golden line
    const connections = getGoldenLineConnections(state.board, fromCoords);
    const isDirectlyConnected = connections.some(conn => 
        conn[0] === toCoords[0] && conn[1] === toCoords[1]
    );
    
    if (!isDirectlyConnected) {
        return { ok: false, reason: 'Destination not directly connected via golden line' };
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
function validatePortalStandardMove(state: GameState, move: Move): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has Portal piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const piece = state.pieces[fromIntersection.piece];
    if (!piece || piece.player !== move.playerId) {
        return { ok: false, reason: 'Source piece does not belong to player' };
    }
    
    if (piece.type !== 'Portal') {
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
function validatePortalPhasingMove(state: GameState, move: Move): MoveResult {
    const { fromCoords, toCoords } = move;
    
    if (!fromCoords || !toCoords) {
        return { ok: false, reason: 'Missing from or to coordinates' };
    }
    
    // Check if source has piece
    const fromIntersection = getIntersectionByCoords(state.board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        return { ok: false, reason: 'No piece at source position' };
    }
    
    const piece = state.pieces[fromIntersection.piece];
    if (!piece || piece.player !== move.playerId) {
        return { ok: false, reason: 'Source piece does not belong to player' };
    }
    
    // Check if path is straight line
    const path = findPhasingPath(state.board, fromCoords, toCoords, piece.type === 'Portal', state.pieces);
    if (!path) {
        return { ok: false, reason: 'Invalid phasing path' };
    }
    
    // Check if destination is empty
    if (!isEmptyIntersection(state.board, toCoords)) {
        return { ok: false, reason: 'Destination occupied' };
    }
    
    // Check Portal restrictions - Portal pieces can only move to golden line intersections
    if (piece.type === 'Portal' && !isGoldenLineIntersection(state.board, toCoords)) {
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
            
            // Handle automatic attacks will be done after move processing
            
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
            
            // Handle automatic attacks will be done after move processing
            
            newState.currentPlayer = newState.currentPlayer === 'circles' ? 'squares' : 'circles';
            break;
    }
    
    // Check for win condition
    const winCheck = checkWin(newState, pieceDefs);
    if (winCheck.winner) {
        newState.winner = winCheck.winner;
        newState.victoryType = winCheck.victoryType;
    }
    
    // Only find available abilities during gameplay phase
    let availableAbilities: Ability[] = [];
    if (newState.gamePhase === 'gameplay') {
        availableAbilities = findAvailableAbilities(newState, move.playerId, pieceDefs);
    }
    
    // Track destroyed pieces from the attack result
    let destroyedPieces: string[] = [];
    if (move.type !== 'place' && move.toCoords) {
        if (move.type === 'portal_swap' && move.fromCoords) {
            // For portal swap, apply combat at both positions since both pieces moved
            const fromAttackResult = performAutomaticAttack(newState, move.fromCoords, pieceDefs);
            newState.board = fromAttackResult.board;
            newState.pieces = fromAttackResult.pieces;
            destroyedPieces = fromAttackResult.destroyedPieces || [];
            
            const toAttackResult = performAutomaticAttack(newState, move.toCoords, pieceDefs);
            newState.board = toAttackResult.board;
            newState.pieces = toAttackResult.pieces;
            destroyedPieces = [...destroyedPieces, ...(toAttackResult.destroyedPieces || [])];
        } else {
            // Standard movement - apply combat at destination only
            const attackResult = performAutomaticAttack(newState, move.toCoords, pieceDefs);
            newState.board = attackResult.board;
            newState.pieces = attackResult.pieces;
            destroyedPieces = attackResult.destroyedPieces || [];
        }
    }
    
    return { 
        ok: true, 
        nextState: newState,
        destroyedPieces: destroyedPieces,
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
function performAutomaticAttack(state: GameState, coords: Vector2, pieceDefs: PieceDefinitions): { board: Board; pieces: Record<string, Piece>; destroyedPieces: string[] } {
    const newState = { board: { ...state.board, intersections: [...state.board.intersections] }, pieces: { ...state.pieces } };
    const movedPiece = getIntersectionByCoords(newState.board, coords);
    
    if (!movedPiece || !movedPiece.piece) {
        return { ...newState, destroyedPieces: [] };
    }
    
    const pieceDef = pieceDefs.piece_definitions[movedPiece.piece.startsWith('C_') ? 'circles_pieces' : 'squares_pieces'][movedPiece.piece];
    if (!pieceDef) {
        return { ...newState, destroyedPieces: [] };
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
            const pieceToRemove = adjacent.piece;
            adjacent.piece = null;
            delete newState.pieces[pieceToRemove];
            destroyedPieces.push(pieceToRemove);
        }
    }
    
    return { ...newState, destroyedPieces };
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
 * Find phasing path between two coordinates
 * @param board - Board state
 * @param fromCoords - Source coordinates
 * @param toCoords - Target coordinates
 * @param isPortal - Whether moving piece is Portal
 * @param pieces - Pieces collection for type checking
 * @returns Path coordinates or null if no path
 */
function findPhasingPath(board: Board, fromCoords: Vector2, toCoords: Vector2, isPortal: boolean, pieces: Record<string, Piece>): Vector2[] | null {
    const [fromX, fromY] = fromCoords;
    const [toX, toY] = toCoords;
    
    // Check if path is straight line (horizontal, vertical, or diagonal)
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    // Must be horizontal, vertical, or diagonal
    if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) {
        return null;
    }
    
    // Calculate direction vector
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    
    const path: Vector2[] = [];
    let currentX = fromX + stepX;
    let currentY = fromY + stepY;
    
    // Walk along the path
    while (currentX !== toX || currentY !== toY) {
        // Check if we hit a blocking piece
        const intersection = getIntersectionByCoords(board, [currentX, currentY]);
        if (intersection && intersection.piece) {
            const piece = pieces[intersection.piece];
            if (piece && piece.type === 'Portal' && !isPortal) {
                // Non-Portal can move through Portal
                path.push([currentX, currentY]);
                currentX += stepX;
                currentY += stepY;
                continue;
            } else if (isPortal) {
                // Portal can move through anything
                path.push([currentX, currentY]);
                currentX += stepX;
                currentY += stepY;
                continue;
            } else {
                // Hit a blocking piece
                return null;
            }
        } else {
            // Empty space
            path.push([currentX, currentY]);
            currentX += stepX;
            currentY += stepY;
        }
    }
    
    // Add the final destination to the path
    path.push([toX, toY]);
    
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
    
    // Early return if no pieces
    if (playerPieces.length < 2) {
        return abilities;
    }
    
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
export function getLegalMovesForPiece(state: GameState, piece: Piece, pieceDefs: PieceDefinitions): Move[] {
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
    
    // Nexus movement - for all piece types
    const nexusFormations = findNexusFormations(state, piece.player);
    if (nexusFormations.length > 0) {
        // Check if this piece is adjacent to any nexus formation (but cannot use formations it's part of)
        const isAdjacentToNexus = nexusFormations.some(formation => {
            // First check if the piece is part of this specific formation
            const isPartOfThisFormation = formation.pieces.some(nexusCoords => 
                piece.coords[0] === nexusCoords[0] && piece.coords[1] === nexusCoords[1]
            );
            
            // If piece is part of this formation, it cannot use this formation
            if (isPartOfThisFormation) {
                return false;
            }
            
            // Check if piece is adjacent to any piece in this formation
            return formation.pieces.some(nexusCoords => 
                areAdjacent(piece.coords, nexusCoords)
            );
        });
        
        if (isAdjacentToNexus) {
            // Find all valid nexus destinations - only from formations the piece is actually adjacent to
            const nexusDestinations = new Set<string>();
            for (const formation of nexusFormations) {
                // Skip formations that this piece is part of (same logic as validation)
                const isPartOfThisFormation = formation.pieces.some(nexusCoords => 
                    piece.coords[0] === nexusCoords[0] && piece.coords[1] === nexusCoords[1]
                );
                
                if (isPartOfThisFormation) {
                    continue;
                }
                
                // Check if this piece is actually adjacent to THIS specific formation
                const isAdjacentToThisFormation = formation.pieces.some(nexusCoords => 
                    areAdjacent(piece.coords, nexusCoords)
                );
                
                if (!isAdjacentToThisFormation) {
                    continue;
                }
                
                for (const nexusCoords of formation.pieces) {
                    const adjacentToNexus = getAdjacentCoords(nexusCoords);
                    for (const dest of adjacentToNexus) {
                        if (isValidCoords(state.board, dest) && isEmptyIntersection(state.board, dest)) {
                            // For Portal pieces, destination must be on golden line
                            if (pieceDef.type === 'Portal' && !isGoldenLineIntersection(state.board, dest)) {
                                continue;
                            }
                            
                            const destKey = `${dest[0]},${dest[1]}`;
                            if (!nexusDestinations.has(destKey)) {
                                nexusDestinations.add(destKey);
                                moves.push({
                                    type: 'nexus',
                                    fromCoords: piece.coords,
                                    toCoords: dest,
                                    pieceId: piece.id,
                                    playerId: piece.player
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Portal-specific movements
    if (pieceDef.type === 'Portal') {
        // Portal standard movement (already handled above with golden line restriction)
        
        // Portal line movement - direct golden line connections (like reference implementation)
        const connections = getGoldenLineConnections(state.board, piece.coords);
        for (const connectedPos of connections) {
            // Skip if destination is occupied
            if (!isEmptyIntersection(state.board, connectedPos)) {
                continue;
            }
            
            moves.push({
                type: 'portal_line',
                fromCoords: piece.coords,
                toCoords: connectedPos,
                pieceId: piece.id,
                playerId: piece.player
            });
        }
        
        // Portal phasing - Portal can phase through any piece
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [dx, dy] of directions) {
            let currentPos = [piece.coords[0], piece.coords[1]] as Vector2;
            let phaseFound = false;
            
            // Continue while there are pieces to phase through
            while (true) {
                const nextPos = [currentPos[0] + dx, currentPos[1] + dy] as Vector2;
                
                if (!isValidCoords(state.board, nextPos)) {
                    break; // Out of bounds
                }
                
                const pieceAtNext = Object.values(state.pieces).find(p => 
                    p.coords[0] === nextPos[0] && p.coords[1] === nextPos[1]
                );
                
                if (pieceAtNext) {
                    // Portal can phase through any piece
                    currentPos = nextPos;
                    phaseFound = true;
                } else {
                    // Empty intersection - this is our destination
                    if (phaseFound && isGoldenLineIntersection(state.board, nextPos)) {
                        moves.push({
                            type: 'portal_phasing',
                            fromCoords: piece.coords,
                            toCoords: nextPos,
                            pieceId: piece.id,
                            playerId: piece.player
                        });
                    }
                    break;
                }
            }
        }
        
        // Portal swap
        const playerPieces = Object.values(state.pieces).filter(p => p.player === piece.player);
        for (const otherPiece of playerPieces) {
            if (otherPiece.id !== piece.id && 
                pieceDefs.piece_definitions[piece.player === 'circles' ? 'circles_pieces' : 'squares_pieces'][otherPiece.id]?.type !== 'Portal' &&
                isGoldenLineIntersection(state.board, otherPiece.coords)) {
                
                moves.push({
                    type: 'portal_swap',
                    fromCoords: otherPiece.coords, // Non-Portal piece initiates swap
                    toCoords: piece.coords, // Portal piece position
                    pieceId: otherPiece.id,
                    playerId: piece.player
                });
            }
        }
    }
    
    // Non-Portal phasing - can only phase through Portal pieces
    if (pieceDef.type !== 'Portal') {
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [dx, dy] of directions) {
            let currentPos = [piece.coords[0], piece.coords[1]] as Vector2;
            let phaseFound = false;
            
            // Continue while there are Portal pieces to phase through
            while (true) {
                const nextPos = [currentPos[0] + dx, currentPos[1] + dy] as Vector2;
                
                if (!isValidCoords(state.board, nextPos)) {
                    break; // Out of bounds
                }
                
                const pieceAtNext = Object.values(state.pieces).find(p => 
                    p.coords[0] === nextPos[0] && p.coords[1] === nextPos[1]
                );
                
                if (pieceAtNext) {
                    // Non-Portal can only phase through Portal pieces
                    const nextPieceDef = pieceDefs.piece_definitions[pieceAtNext.player === 'circles' ? 'circles_pieces' : 'squares_pieces'][pieceAtNext.id];
                    if (nextPieceDef?.type === 'Portal') {
                        currentPos = nextPos;
                        phaseFound = true;
                    } else {
                        // Hit a non-Portal piece - can't phase through
                        break;
                    }
                } else {
                    // Empty intersection - this is our destination
                    if (phaseFound) {
                        moves.push({
                            type: 'portal_phasing',
                            fromCoords: piece.coords,
                            toCoords: nextPos,
                            pieceId: piece.id,
                            playerId: piece.player
                        });
                    }
                    break;
                }
            }
        }
    }
    
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