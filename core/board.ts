/**
 * Board data structures and helpers for Amalgam game
 * Pure functions for board creation, state management, and coordinate utilities
 * Follows immutable patterns - all functions return new objects rather than mutating inputs
 */

import { deepCopy } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import type { 
    Vector2, 
    Board, 
    BoardData, 
    Intersection, 
    GameState, 
    PlayerId, 
    Piece,
    PieceType
} from './types.js';

/**
 * Create a new board from board data
 * @param boardData - Board configuration data
 * @returns New Board instance
 */
export function createBoard(boardData: BoardData): Board {
    logger.debug('Creating new Amalgam board from data', boardData);
    
    const intersections = generateIntersections(boardData);
    
    // Generate golden line connections from the dictionary
    const goldenLineConnections: Array<{from: Vector2; to: Vector2}> = [];
    const goldenLineIntersections: Vector2[] = [];
    
    // First, add all coordinates from golden_coordinates array if it exists
    const goldenCoords = new Set<string>();
    
    if (boardData.golden_coordinates && Array.isArray(boardData.golden_coordinates)) {
        boardData.golden_coordinates.forEach(coordStr => {
            goldenCoords.add(coordStr);
        });
        logger.debug(`Added ${boardData.golden_coordinates.length} golden coordinates from golden_coordinates array`);
    }
    
    // Then, process golden_lines_dict for connections
    if (boardData.golden_lines.golden_lines_dict) {
        Object.entries(boardData.golden_lines.golden_lines_dict).forEach(([coordStr, connections]) => {
            const [x, y] = coordStr.split(',').map(Number);
            goldenCoords.add(coordStr);
            
            connections.forEach((connection: any) => {
                const toCoordStr = `${connection.x},${connection.y}`;
                goldenCoords.add(toCoordStr);
                
                // Add connection (avoid duplicates)
                const connectionKey = [coordStr, toCoordStr].sort().join('|');
                if (!goldenLineConnections.some(conn => 
                    [conn.from.join(','), conn.to.join(',')].sort().join('|') === connectionKey
                )) {
                    goldenLineConnections.push({
                        from: [x, y],
                        to: [connection.x, connection.y]
                    });
                }
            });
        });
        logger.debug(`Processed ${Object.keys(boardData.golden_lines.golden_lines_dict).length} entries from golden_lines_dict`);
    }
    
    // Convert all golden coordinates to Vector2 array
    goldenCoords.forEach(coordStr => {
        const [x, y] = coordStr.split(',').map(Number);
        goldenLineIntersections.push([x, y]);
    });
    
    logger.debug(`Total golden line intersections: ${goldenLineIntersections.length}`);
    
    return {
        intersections: intersections,
        goldenLineConnections: goldenLineConnections,
        goldenLineIntersections: goldenLineIntersections,
        goldenLinesDict: deepCopy(boardData.golden_lines.golden_lines_dict || {}),
        width: boardData.board.width,
        height: boardData.board.height,
        coordinateScale: boardData.board.coordinate_scale,
        centerOffset: deepCopy(boardData.board.center_offset),
        intersectionRadius: boardData.board.intersectionRadius,
        pieceRadius: boardData.board.pieceRadius
    };
}

/**
 * Clone a board (deep copy)
 * @param board - Board to clone
 * @returns New Board instance
 */
export function cloneBoard(board: Board): Board {
    return {
        ...board,
        intersections: board.intersections.map(intersection => ({...intersection})),
        goldenLineConnections: deepCopy(board.goldenLineConnections),
        goldenLineIntersections: deepCopy(board.goldenLineIntersections),
        goldenLinesDict: deepCopy(board.goldenLinesDict),
        centerOffset: [...board.centerOffset]
    };
}

/**
 * Create initial game state
 * @param board - Board instance  
 * @param boardData - Board data for pre-placed pieces
 * @returns Initial GameState
 */
export function createInitialState(board: Board, boardData?: any): GameState {
    const pieces: Record<string, Piece> = {};
    
    // Add pre-placed pieces according to game rules
    // Circles pre-placed pieces
    pieces['C_Void'] = {
        id: 'C_Void',
        type: 'Void',
        player: 'circles' as PlayerId,
        coords: [0, 12],
        isPrePlaced: true,
        graphics: {
            shape: 'circle',
            outerColor: '#5B4E7A',
            innerColor: '#8D7EA9',
            size: 12
        }
    };
    
    pieces['C_Amalgam'] = {
        id: 'C_Amalgam',
        type: 'Amalgam',
        player: 'circles' as PlayerId,
        coords: [0, 6],
        isPrePlaced: true,
        graphics: {
            shape: 'circle',
            colors: ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'],
            size: 10,
            rotation: Math.PI // Face toward origin
        }
    };
    
    pieces['C_Portal1'] = {
        id: 'C_Portal1',
        type: 'Portal',
        player: 'circles' as PlayerId,
        coords: [6, 6],
        isPrePlaced: true,
        graphics: {
            shape: 'circle',
            outerColor: '#87CEEB',
            innerColor: '#ADD8E6',
            size: 6
        }
    };
    
    pieces['C_Portal2'] = {
        id: 'C_Portal2',
        type: 'Portal',
        player: 'circles' as PlayerId,
        coords: [-6, 6],
        isPrePlaced: true,
        graphics: {
            shape: 'circle',
            outerColor: '#87CEEB',
            innerColor: '#ADD8E6',
            size: 6
        }
    };
    
    // Squares pre-placed pieces
    pieces['S_Void'] = {
        id: 'S_Void',
        type: 'Void',
        player: 'squares' as PlayerId,
        coords: [0, -12],
        isPrePlaced: true,
        graphics: {
            shape: 'square',
            outerColor: '#5B4E7A',
            innerColor: '#8D7EA9',
            size: 10
        }
    };
    
    pieces['S_Amalgam'] = {
        id: 'S_Amalgam',
        type: 'Amalgam',
        player: 'squares' as PlayerId,
        coords: [0, -6],
        isPrePlaced: true,
        graphics: {
            shape: 'square',
            colors: ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'],
            size: 10,
            rotation: Math.PI / 2 // Face toward origin
        }
    };
    
    pieces['S_Portal1'] = {
        id: 'S_Portal1',
        type: 'Portal',
        player: 'squares' as PlayerId,
        coords: [6, -6],
        isPrePlaced: true,
        graphics: {
            shape: 'square',
            outerColor: '#87CEEB',
            innerColor: '#ADD8E6',
            size: 6
        }
    };
    
    pieces['S_Portal2'] = {
        id: 'S_Portal2',
        type: 'Portal',
        player: 'squares' as PlayerId,
        coords: [-6, -6],
        isPrePlaced: true,
        graphics: {
            shape: 'square',
            outerColor: '#87CEEB',
            innerColor: '#ADD8E6',
            size: 6
        }
    };
    
    // Place pre-placed pieces on the board
    let initialBoard = cloneBoard(board);
    for (const [pieceId, piece] of Object.entries(pieces)) {
        if (piece.isPrePlaced) {
            initialBoard = placePiece(initialBoard, piece.coords, pieceId);
            logger.debug(`Placed pre-placed piece ${pieceId} at ${JSON.stringify(piece.coords)}`);
        }
    }
    
    return {
        board: initialBoard,
        pieces: pieces,
        currentPlayer: 'squares' as PlayerId, // Squares goes first in setup
        gamePhase: 'setup',
        setupTurn: 1,
        moveHistory: [],
        winner: null
    };
}

/**
 * Clone game state (deep copy)
 * @param state - State to clone
 * @returns New GameState instance
 */
export function cloneState(state: GameState): GameState {
    return {
        ...state,
        board: cloneBoard(state.board),
        pieces: deepCopy(state.pieces),
        moveHistory: deepCopy(state.moveHistory)
    };
}

/**
 * Generate intersections from board data
 * @param boardData - Board configuration
 * @returns Array of intersections
 */
function generateIntersections(boardData: BoardData): Intersection[] {
    const intersections: Intersection[] = [];
    
    // Use explicit board positions if available
    if (boardData.board_positions?.coordinates) {
        logger.debug('Using explicit board positions', { count: boardData.board_positions.coordinates.length });
        
        boardData.board_positions.coordinates.forEach((coords) => {
            const [gameX, gameY] = coords;
            const pixelX = boardData.board.center_offset[0] + (gameX * boardData.board.coordinate_scale);
            const pixelY = boardData.board.center_offset[1] - (gameY * boardData.board.coordinate_scale);
            
            intersections.push({
                id: `${gameX},${gameY}`,
                coords: coords,
                x: pixelX,
                y: pixelY,
                piece: null
            });
        });
    } else if (boardData.golden_coordinates && boardData.standard_coordinates) {
        // Use golden and standard coordinates from board data
        logger.debug('Using golden and standard coordinates', { 
            golden: boardData.golden_coordinates.length, 
            standard: boardData.standard_coordinates.length 
        });
        
        // Process golden coordinates
        boardData.golden_coordinates.forEach((coordStr) => {
            const [gameX, gameY] = coordStr.split(',').map(Number);
            const pixelX = boardData.board.center_offset[0] + (gameX * boardData.board.coordinate_scale);
            const pixelY = boardData.board.center_offset[1] - (gameY * boardData.board.coordinate_scale);
            
            intersections.push({
                id: coordStr,
                coords: [gameX, gameY],
                x: pixelX,
                y: pixelY,
                piece: null
            });
        });
        
        // Process standard coordinates
        boardData.standard_coordinates.forEach((coordStr) => {
            const [gameX, gameY] = coordStr.split(',').map(Number);
            const pixelX = boardData.board.center_offset[0] + (gameX * boardData.board.coordinate_scale);
            const pixelY = boardData.board.center_offset[1] - (gameY * boardData.board.coordinate_scale);
            
            intersections.push({
                id: coordStr,
                coords: [gameX, gameY],
                x: pixelX,
                y: pixelY,
                piece: null
            });
        });
    } else {
        // Fallback to range-based generation
        logger.warn('Falling back to coordinate range generation: No board positions available');
        
        for (let x = -12; x <= 12; x++) {
            for (let y = -12; y <= 12; y++) {
                if (isInBounds(x, y)) {
                    const pixelX = boardData.board.center_offset[0] + (x * boardData.board.coordinate_scale);
                    const pixelY = boardData.board.center_offset[1] - (y * boardData.board.coordinate_scale);
                    
                    intersections.push({
                        id: `${x},${y}`,
                        coords: [x, y],
                        x: pixelX,
                        y: pixelY,
                        piece: null
                    });
                }
            }
        }
    }
    
    logger.debug(`Generated ${intersections.length} intersections`);
    return intersections;
}

/**
 * Check if coordinates are within valid board bounds (for range-based generation)
 * @param x - X coordinate
 * @param y - Y coordinate  
 * @returns True if coordinates are valid
 */
function isInBounds(x: number, y: number): boolean {
    const distance = Math.abs(x) + Math.abs(y);
    return distance <= 12;
}

/**
 * Get intersection by coordinates
 * @param board - Board instance
 * @param coords - Vector2 coordinates
 * @returns Intersection or null if not found
 */
export function getIntersectionByCoords(board: Board, coords: Vector2): Intersection | null {
    return board.intersections.find(intersection => 
        intersection.coords[0] === coords[0] && intersection.coords[1] === coords[1]
    ) || null;
}

/**
 * Check if intersection is empty
 * @param board - Board instance
 * @param coords - Vector2 coordinates
 * @returns True if intersection exists and is empty
 */
export function isEmptyIntersection(board: Board, coords: Vector2): boolean {
    const intersection = getIntersectionByCoords(board, coords);
    return intersection !== null && intersection.piece === null;
}

/**
 * Check if coordinates are valid on the board
 * @param board - Board instance
 * @param coords - Vector2 coordinates
 * @returns True if coordinates are valid
 */
export function isValidCoords(board: Board, coords: Vector2): boolean {
    return getIntersectionByCoords(board, coords) !== null;
}

/**
 * Place a piece on an intersection (immutable)
 * @param board - Board state
 * @param coords - Vector2 coordinates
 * @param pieceId - Piece identifier
 * @returns New Board instance
 */
export function placePiece(board: Board, coords: Vector2, pieceId: string): Board {
    const newBoard = cloneBoard(board);
    const intersection = newBoard.intersections.find(int => 
        int.coords[0] === coords[0] && int.coords[1] === coords[1]
    );
    
    if (intersection) {
        intersection.piece = pieceId;
    }
    
    return newBoard;
}

/**
 * Remove a piece from an intersection (immutable)
 * @param board - Board state
 * @param coords - Vector2 coordinates
 * @returns New Board instance
 */
export function removePiece(board: Board, coords: Vector2): Board {
    const newBoard = cloneBoard(board);
    const intersection = newBoard.intersections.find(int => 
        int.coords[0] === coords[0] && int.coords[1] === coords[1]
    );
    
    if (intersection) {
        intersection.piece = null;
    }
    
    return newBoard;
}

/**
 * Move a piece from one intersection to another (immutable)
 * @param board - Board state
 * @param fromCoords - Source coordinates
 * @param toCoords - Target coordinates
 * @returns New Board instance
 */
export function movePiece(board: Board, fromCoords: Vector2, toCoords: Vector2): Board {
    const newBoard = cloneBoard(board);
    
    const fromIntersection = newBoard.intersections.find(int => 
        int.coords[0] === fromCoords[0] && int.coords[1] === fromCoords[1]
    );
    const toIntersection = newBoard.intersections.find(int => 
        int.coords[0] === toCoords[0] && int.coords[1] === toCoords[1]
    );
    
    if (fromIntersection && toIntersection) {
        toIntersection.piece = fromIntersection.piece;
        fromIntersection.piece = null;
    }
    
    return newBoard;
}

/**
 * Get all pieces belonging to a player
 * @param state - Game state
 * @param playerId - Player identifier
 * @returns Array of pieces
 */
export function getPlayerPieces(state: GameState, playerId: PlayerId): Piece[] {
    return Object.values(state.pieces).filter(piece => piece.player === playerId);
}

/**
 * Count pieces for a player
 * @param state - Game state
 * @param playerId - Player identifier
 * @returns Number of pieces
 */
export function countPlayerPieces(state: GameState, playerId: PlayerId): number {
    return getPlayerPieces(state, playerId).length;
}

/**
 * Check if two coordinates are adjacent
 * @param coords1 - First coordinate
 * @param coords2 - Second coordinate
 * @returns True if coordinates are adjacent
 */
export function areAdjacent(coords1: Vector2, coords2: Vector2): boolean {
    const dx = Math.abs(coords1[0] - coords2[0]);
    const dy = Math.abs(coords1[1] - coords2[1]);
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
}

/**
 * Calculate distance between two coordinates
 * @param coords1 - First coordinate
 * @param coords2 - Second coordinate
 * @returns Distance value
 */
export function distance(coords1: Vector2, coords2: Vector2): number {
    const dx = coords1[0] - coords2[0];
    const dy = coords1[1] - coords2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if coordinates form a straight line
 * @param coords - Array of coordinates
 * @returns True if coordinates are in a straight line
 */
export function isStraightLine(coords: Vector2[]): boolean {
    if (coords.length < 2) return true;
    if (coords.length === 2) return true;
    
    const [first, second] = coords;
    const dx = second[0] - first[0];
    const dy = second[1] - first[1];
    
    for (let i = 2; i < coords.length; i++) {
        const expectedX = first[0] + (dx * i);
        const expectedY = first[1] + (dy * i);
        
        if (coords[i][0] !== expectedX || coords[i][1] !== expectedY) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get adjacent coordinate positions
 * @param coords - Center coordinates
 * @returns Array of adjacent coordinates
 */
export function getAdjacentCoords(coords: Vector2): Vector2[] {
    const [x, y] = coords;
    return [
        [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
        [x - 1, y],                   [x + 1, y],
        [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]
    ];
}

/**
 * Get adjacent intersections that exist on the board
 * @param board - Board instance
 * @param coords - Center coordinates
 * @returns Array of adjacent intersections
 */
export function getAdjacentIntersections(board: Board, coords: Vector2): Intersection[] {
    const adjacentCoords = getAdjacentCoords(coords);
    return adjacentCoords
        .map(coord => getIntersectionByCoords(board, coord))
        .filter((intersection): intersection is Intersection => intersection !== null);
}

/**
 * Check if intersection is on a golden line
 * @param board - Board instance
 * @param coords - Vector2 coordinates
 * @returns True if intersection is on golden line
 */
export function isGoldenLineIntersection(board: Board, coords: Vector2): boolean {
    return board.goldenLineIntersections.some(glCoords => 
        glCoords[0] === coords[0] && glCoords[1] === coords[1]
    );
}

/**
 * Get golden line connections from a position using reference implementation format
 * @param board - Board state
 * @param coords - Vector2 coordinates
 * @returns Array of connected coordinates
 */
export function getGoldenLineConnections(board: Board, coords: Vector2): Vector2[] {
    const coordStr = `${coords[0]},${coords[1]}`;
    
    // First check if we have the golden_lines_dict from reference implementation
    if (board.goldenLinesDict && board.goldenLinesDict[coordStr]) {
        return board.goldenLinesDict[coordStr].map(conn => [conn.x, conn.y] as Vector2);
    }
    
    // Fallback to pair-wise connections for compatibility
    const connections: Vector2[] = [];
    for (const connection of board.goldenLineConnections) {
        if (connection.from[0] === coords[0] && connection.from[1] === coords[1]) {
            connections.push(connection.to);
        } else if (connection.to[0] === coords[0] && connection.to[1] === coords[1]) {
            connections.push(connection.from);
        }
    }
    
    return connections;
}