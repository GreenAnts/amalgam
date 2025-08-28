/**
 * Board data structures and helpers for Amalgam game
 * Defines board representation, state management, and utility functions
 * Handles Vector2 coordinate system and piece type management
 */

import { deepCopy } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} Vector2
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} Intersection
 * @property {number} id - Unique identifier
 * @property {number} x - SVG X coordinate
 * @property {number} y - SVG Y coordinate
 * @property {Array<number>} coords - Vector2 coordinates [x, y]
 * @property {string|null} piece - Piece ID or null if empty
 */

/**
 * @typedef {Object} Board
 * @property {Array<Intersection>} intersections - All board intersections
 * @property {Array<Object>} goldenLineConnections - Golden line connection pairs
 * @property {Array<Array<number>>} goldenLineIntersections - Coordinates of golden line intersections
 * @property {number} width - Board width
 * @property {number} height - Board height
 * @property {number} coordinateScale - Scale factor for coordinate conversion
 * @property {Array<number>} centerOffset - Center offset for coordinate conversion
 * @property {number} intersectionRadius - Radius of intersection circles
 * @property {number} pieceRadius - Radius of piece circles
 */

/**
 * @typedef {Object} GameState
 * @property {Board} board - Current board state
 * @property {string} currentPlayer - Current player ID ('circles' or 'squares')
 * @property {string} gamePhase - Current game phase ('setup' or 'gameplay')
 * @property {number} setupTurn - Current setup turn (1-16)
 * @property {Object} pieces - All pieces on the board
 * @property {Array<Object>} moveHistory - History of moves made
 * @property {string|null} winner - Winner ID or null if game ongoing
 * @property {string|null} victoryType - Type of victory achieved
 */

/**
 * @typedef {Object} Piece
 * @property {string} id - Unique piece identifier
 * @property {string} type - Piece type (Ruby, Pearl, Amber, Jade, Amalgam, Portal, Void)
 * @property {string} player - Player ID ('circles' or 'squares')
 * @property {Array<number>} coords - Current coordinates [x, y]
 * @property {boolean} isPrePlaced - Whether piece was pre-placed
 */

/**
 * Generate all valid board intersections from coordinate ranges
 * @param {Object} boardData - Board configuration data
 * @returns {Array<Intersection>} - Array of all valid intersections
 */
function generateIntersections(boardData) {
    const intersections = [];
    const { coordinate_scale, center_offset } = boardData.board;
    let id = 0;

    // Load valid positions from board_positions.json if available
    let validCoords = [];
    try {
        // If running in a browser, require may not work; fallback to boardData.board_positions
        let boardPositions = boardData.board_positions;
        if (!boardPositions && typeof require !== 'undefined') {
            boardPositions = require('../game-rules/board_positions.json').board_positions;
        }
        if (boardPositions) {
            // Flatten all coordinate arrays from the board_positions object
            for (const key of Object.keys(boardPositions)) {
                if (Array.isArray(boardPositions[key])) {
                    validCoords = validCoords.concat(boardPositions[key]);
                } else if (typeof boardPositions[key] === 'object') {
                    for (const subkey of Object.keys(boardPositions[key])) {
                        validCoords = validCoords.concat(boardPositions[key][subkey]);
                    }
                }
            }
        }
    } catch (e) {
        // Fallback: generate all coordinates in range (legacy behavior)
        const { x_range, y_range } = boardData.coordinate_ranges;
        for (let x = x_range[0]; x <= x_range[1]; x++) {
            for (let y = y_range[0]; y <= y_range[1]; y++) {
                validCoords.push([x, y]);
            }
        }
    }

    // Remove duplicates (in case of overlap in board_positions.json)
    const seen = new Set();
    validCoords = validCoords.filter(([x, y]) => {
        const key = `${x},${y}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Generate intersections only for valid coordinates
    for (const [x, y] of validCoords) {
        const svgX = center_offset[0] + (x * coordinate_scale);
        const svgY = center_offset[1] - (y * coordinate_scale); // Invert Y for SVG
        intersections.push({
            id: id++,
            x: svgX,
            y: svgY,
            coords: [x, y],
            piece: null
        });
    }

    logger.debug(`Generated ${intersections.length} intersections (valid only)`);
    return intersections;
}

/**
 * Create a new board from board data
 * @param {Object} boardData - Board configuration data
 * @returns {Board} - New board instance
 */
export function createBoard(boardData) {
    logger.debug('Creating new Amalgam board from data', boardData);
    
    const intersections = generateIntersections(boardData);
    
    return {
        intersections: intersections,
        goldenLineConnections: deepCopy(boardData.golden_lines.connections),
        goldenLineIntersections: deepCopy(boardData.golden_lines.golden_line_intersections),
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
 * @param {Board} board - Board to clone
 * @returns {Board} - Cloned board
 */
export function cloneBoard(board) {
    return deepCopy(board);
}

/**
 * Get intersection by coordinates
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {Intersection|null} - Intersection or null if not found
 */
export function getIntersectionByCoords(board, coords) {
    return board.intersections.find(int => 
        int.coords[0] === coords[0] && int.coords[1] === coords[1]
    ) || null;
}

/**
 * Get intersection by ID
 * @param {Board} board - Board state
 * @param {number} intersectionId - Intersection ID
 * @returns {Intersection|null} - Intersection or null if not found
 */
export function getIntersection(board, intersectionId) {
    return board.intersections.find(int => int.id === intersectionId) || null;
}

/**
 * Check if coordinates are valid board positions
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {boolean} - Whether coordinates are valid
 */
export function isValidCoords(board, coords) {
    return getIntersectionByCoords(board, coords) !== null;
}

/**
 * Check if intersection is empty
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {boolean} - Whether intersection is empty
 */
export function isEmptyIntersection(board, coords) {
    const intersection = getIntersectionByCoords(board, coords);
    return intersection && !intersection.piece;
}

/**
 * Get all 8-directional adjacent coordinates
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {Array<Array<number>>} - Array of adjacent coordinates
 */
export function getAdjacentCoords(coords) {
    const [x, y] = coords;
    return [
        [x-1, y-1], [x, y-1], [x+1, y-1],
        [x-1, y],             [x+1, y],
        [x-1, y+1], [x, y+1], [x+1, y+1]
    ];
}

/**
 * Get valid adjacent intersections
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {Array<Intersection>} - Array of valid adjacent intersections
 */
export function getAdjacentIntersections(board, coords) {
    const adjacentCoords = getAdjacentCoords(coords);
    return adjacentCoords
        .map(adjCoords => getIntersectionByCoords(board, adjCoords))
        .filter(int => int !== null);
}

/**
 * Check if coordinates are on a golden line
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {boolean} - Whether coordinates are on golden line
 */
export function isGoldenLineIntersection(board, coords) {
    return board.goldenLineIntersections.some(glCoords => 
        glCoords[0] === coords[0] && glCoords[1] === coords[1]
    );
}

/**
 * Get golden line connections from a position
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {Array<Array<number>>} - Array of connected coordinates
 */
export function getGoldenLineConnections(board, coords) {
    const connections = [];
    
    for (const connection of board.goldenLineConnections) {
        if (connection.from[0] === coords[0] && connection.from[1] === coords[1]) {
            connections.push(connection.to);
        } else if (connection.to[0] === coords[0] && connection.to[1] === coords[1]) {
            connections.push(connection.from);
        }
    }
    
    return connections;
}

/**
 * Place a piece on an intersection (immutable)
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @param {string} pieceId - Piece ID
 * @returns {Board} - New board with piece placed
 */
export function placePiece(board, coords, pieceId) {
    const newBoard = cloneBoard(board);
    const intersection = getIntersectionByCoords(newBoard, coords);
    
    if (intersection) {
        intersection.piece = pieceId;
        logger.debug(`Placed piece ${pieceId} on coordinates [${coords[0]}, ${coords[1]}]`);
    } else {
        logger.warn(`Attempted to place piece on invalid coordinates [${coords[0]}, ${coords[1]}]`);
    }
    
    return newBoard;
}

/**
 * Remove a piece from an intersection (immutable)
 * @param {Board} board - Board state
 * @param {Array<number>} coords - Vector2 coordinates [x, y]
 * @returns {Board} - New board with piece removed
 */
export function removePiece(board, coords) {
    const newBoard = cloneBoard(board);
    const intersection = getIntersectionByCoords(newBoard, coords);
    
    if (intersection) {
        intersection.piece = null;
        logger.debug(`Removed piece from coordinates [${coords[0]}, ${coords[1]}]`);
    }
    
    return newBoard;
}

/**
 * Move a piece from one position to another (immutable)
 * @param {Board} board - Board state
 * @param {Array<number>} fromCoords - Source coordinates [x, y]
 * @param {Array<number>} toCoords - Target coordinates [x, y]
 * @returns {Board} - New board with piece moved
 */
export function movePiece(board, fromCoords, toCoords) {
    const fromIntersection = getIntersectionByCoords(board, fromCoords);
    if (!fromIntersection || !fromIntersection.piece) {
        logger.warn(`No piece to move from coordinates [${fromCoords[0]}, ${fromCoords[1]}]`);
        return board;
    }
    
    const pieceId = fromIntersection.piece;
    let newBoard = removePiece(board, fromCoords);
    newBoard = placePiece(newBoard, toCoords, pieceId);
    
    logger.debug(`Moved piece ${pieceId} from [${fromCoords[0]}, ${fromCoords[1]}] to [${toCoords[0]}, ${toCoords[1]}]`);
    return newBoard;
}

/**
 * Get all pieces for a player
 * @param {Board} board - Board state
 * @param {string} playerId - Player ID
 * @returns {Array<Object>} - Array of pieces with coordinates
 */
export function getPlayerPieces(board, playerId) {
    const pieces = [];
    
    for (const intersection of board.intersections) {
        if (intersection.piece && intersection.piece.startsWith(playerId === 'circles' ? 'C_' : 'S_')) {
            pieces.push({
                id: intersection.piece,
                coords: intersection.coords
            });
        }
    }
    
    return pieces;
}

/**
 * Count pieces for a player
 * @param {Board} board - Board state
 * @param {string} playerId - Player ID
 * @returns {number} - Number of pieces
 */
export function countPlayerPieces(board, playerId) {
    return getPlayerPieces(board, playerId).length;
}

/**
 * Check if two coordinates are adjacent
 * @param {Array<number>} coords1 - First coordinates [x, y]
 * @param {Array<number>} coords2 - Second coordinates [x, y]
 * @returns {boolean} - Whether coordinates are adjacent
 */
export function areAdjacent(coords1, coords2) {
    const [x1, y1] = coords1;
    const [x2, y2] = coords2;
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

/**
 * Calculate distance between two coordinates
 * @param {Array<number>} coords1 - First coordinates [x, y]
 * @param {Array<number>} coords2 - Second coordinates [x, y]
 * @returns {number} - Distance between coordinates
 */
export function distance(coords1, coords2) {
    const [x1, y1] = coords1;
    const [x2, y2] = coords2;
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Check if coordinates form a straight line
 * @param {Array<Array<number>>} coordsArray - Array of coordinates
 * @returns {boolean} - Whether coordinates form a straight line
 */
export function isStraightLine(coordsArray) {
    if (coordsArray.length < 2) return false;
    
    const [x1, y1] = coordsArray[0];
    const [x2, y2] = coordsArray[1];
    
    // Check if all coordinates lie on the same line
    for (let i = 2; i < coordsArray.length; i++) {
        const [xi, yi] = coordsArray[i];
        if ((x2 - x1) * (yi - y1) !== (y2 - y1) * (xi - x1)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Create initial game state
 * @param {Board} board - Board configuration
 * @param {Object} boardData - Board data with pre-placed pieces
 * @returns {GameState} - Initial game state
 */
export function createInitialState(board, boardData) {
    const pieces = {};
    
    // Add pre-placed pieces
    for (const [player, playerPieces] of Object.entries(boardData.pre_placed_pieces)) {
        for (const [pieceId, coords] of Object.entries(playerPieces)) {
            pieces[pieceId] = {
                id: pieceId,
                type: pieceId.split('_')[1],
                player: player === 'circles' ? 'circles' : 'squares',
                coords: coords,
                isPrePlaced: true
            };
        }
    }
    
    return {
        board: cloneBoard(board),
        currentPlayer: 'squares', // Squares goes first in setup
        gamePhase: 'setup',
        setupTurn: 1,
        pieces: pieces,
        moveHistory: [],
        winner: null,
        victoryType: null
    };
}

/**
 * Clone game state (deep copy)
 * @param {GameState} state - Game state to clone
 * @returns {GameState} - Cloned game state
 */
export function cloneState(state) {
    return deepCopy(state);
}

/**
 * Serialize board to JSON
 * @param {Board} board - Board to serialize
 * @returns {string} - JSON string
 */
export function serializeBoard(board) {
    return JSON.stringify(board);
}

/**
 * Deserialize board from JSON
 * @param {string} json - JSON string
 * @returns {Board} - Board object
 */
export function deserializeBoard(json) {
    return JSON.parse(json);
}
