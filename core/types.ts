/**
 * Core TypeScript type definitions for the Amalgam game
 * Defines fundamental data structures used throughout the application
 */

// Basic primitive types
export type PlayerId = 'circles' | 'squares';
export type PieceType = 'Ruby' | 'Pearl' | 'Amber' | 'Jade' | 'Amalgam' | 'Portal' | 'Void';
export type GamePhase = 'setup' | 'gameplay';
export type MoveType = 'place' | 'standard' | 'nexus' | 'portal_swap' | 'portal_line' | 'portal_standard' | 'portal_phasing';
export type IntersectionId = string; // Format: "x,y"

// Coordinate system
export type Vector2 = [number, number]; // [x, y]

// Board-related types
export interface Intersection {
    id: IntersectionId;
    coords: Vector2;
    x: number;
    y: number;
    piece: string | null;
}

export interface BoardData {
    board: {
        width: number;
        height: number;
        coordinate_scale: number;
        center_offset: Vector2;
        intersectionRadius: number;
        pieceRadius: number;
    };
    board_positions?: {
        coordinates: Vector2[];
    };
    golden_coordinates?: string[];
    standard_coordinates?: string[];
    golden_lines: {
        golden_line_intersections?: Vector2[];
        golden_lines_dict: Record<string, Array<{x: number, y: number}>>;
        connections?: Array<{
            from: Vector2;
            to: Vector2;
        }>;
    };
    starting_areas: {
        circles_starting_area: {
            positions: Vector2[];
            description: string;
        };
        squares_starting_area: {
            positions: Vector2[];
            description: string;
        };
    };
}

export interface Board {
    intersections: Intersection[];
    goldenLineConnections: Array<{from: Vector2; to: Vector2}>;
    goldenLineIntersections: Vector2[];
    goldenLinesDict: Record<IntersectionId, Array<{x: number, y: number}>>;
    width: number;
    height: number;
    coordinateScale: number;
    centerOffset: Vector2;
    intersectionRadius: number;
    pieceRadius: number;
}

// Game piece types
export interface PieceGraphics {
    shape: 'circle' | 'square';
    size: number;
    // For Void and Portal pieces
    outerColor?: string;
    innerColor?: string;
    // For Amalgam pieces
    colors?: string[];
    rotation?: number;
    // For gem pieces
    color?: string;
}

export interface Piece {
    id: string;
    type: PieceType;
    player: PlayerId;
    coords: Vector2;
    isPrePlaced: boolean;
    graphics: PieceGraphics;
}

// Move system
export interface Move {
    type: MoveType;
    fromCoords?: Vector2;
    toCoords?: Vector2;
    pieceId?: string;
    playerId: PlayerId;
    meta?: Record<string, any>;
}

export interface MoveIntent {
    coords: Vector2;
    type: 'click' | 'hover';
    meta?: Record<string, any>;
}

// Game state
export interface GameState {
    board: Board;
    pieces: Record<string, Piece>;
    currentPlayer: PlayerId;
    gamePhase: GamePhase;
    setupTurn: number;
    moveHistory: Move[];
    winner: PlayerId | null;
    victoryType?: string;
}

// Move validation results
export interface MoveResult {
    ok: boolean;
    reason?: string;
    nextState?: GameState;
    destroyedPieces?: string[];
    availableAbilities?: Ability[];
}

// Ability system
export interface Ability {
    type: string;
    formation: Vector2[];
    direction?: string;
    targetCoords?: Vector2;
    playerId: PlayerId;
}

export interface Formation {
    type: string;
    pieces: Vector2[];
    isAmplified: boolean;
}

// Piece definitions
export interface PieceDefinition {
    type: PieceType;
    player: PlayerId;
    placement: 'setup_phase' | 'game_phase';
    abilities?: string[];
}

export interface PieceDefinitions {
    piece_definitions: {
        circles_pieces: Record<string, PieceDefinition>;
        squares_pieces: Record<string, PieceDefinition>;
    };
    board_data?: BoardData;
}

// Canvas rendering types  
export interface CanvasContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    originX: number;
    originY: number;
    boardDict: Record<IntersectionId, 'golden' | 'standard'>;
    goldenConnections: Set<string>;
    drawBoard: () => void;
    drawPieces: (pieces: Record<IntersectionId, any>, selectedCoord?: Vector2 | null) => void;
    getCoordinatesFromPixel: (mouseX: number, mouseY: number) => Vector2;
}

// Player types
export interface Player {
    id: PlayerId;
    name: string;
    type: 'human' | 'ai';
}

// Game manager callbacks
export interface GameCallbacks {
    onStateChange?: (state: GameState, move?: Move) => void;
    onGameEnd?: (state: GameState) => void;
    onError?: (error: Error | string) => void;
}