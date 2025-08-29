/**
 * Graphics module for rendering the Amalgam game board and pieces
 * Based on the working reference implementation with Canvas 2D rendering
 */

import type { BoardData, Vector2, CanvasContext, IntersectionId } from '../core/types.js';

// Board rendering constants from reference implementation
const GRID_SIZE = 25; // Spacing between intersections
const GOLDEN_RADIUS = 4;
const DIAMOND_SIZE = 3;
const GOLDEN_COLOR = '#FFD700';
const STANDARD_COLOR = '#000000';
const GOLDEN_LINE_COLOR = '#FFD700';
const GOLDEN_LINE_WIDTH = 2;
const BLACK_LINE_COLOR = '#000000';
const BLACK_LINE_WIDTH = 1.5;

// Polygon fill colors for background shapes
const POLYGON_FILL_COLOR_1 = '#343434';
const POLYGON_FILL_COLOR_2 = '#5A5A5A';
const POLYGON_FILL_COLOR_3 = '#7D7D7D';

// Amalgam piece colors from reference
const AMALGAM_COLORS = ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F']; // Red, Green, Pale Yellow, Yellow/Orange

// Piece type definitions
interface PieceData {
    type: string;
    size: number;
    colors?: string[];
    rotation?: number;
    outerColor?: string;
    innerColor?: string;
}

interface PolygonPoint {
    x: number;
    y: number;
}

/**
 * Create and setup the game canvas
 * @param container - Container element for the canvas
 * @param boardData - Board data including dimensions
 * @returns Canvas context and helper functions
 */
export function createGameCanvas(container: HTMLElement, boardData: BoardData): CanvasContext {
    // Clear the container
    container.innerHTML = '';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 800;
    // Border styling handled by CSS
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D rendering context');
    }
    
    // Calculate board dimensions
    const boardSize = Math.min(canvas.width, canvas.height);
    const originX = boardSize / 2;
    const originY = boardSize / 2;
    
    container.appendChild(canvas);
    
    // Create board dictionary from board data
    const boardDict = createBoardDictionary(boardData);
    
    // Create golden connections lookup
    const goldenConnections = createGoldenConnectionsSet(boardData.golden_lines.golden_lines_dict);
    
    return {
        canvas,
        ctx,
        originX,
        originY,
        boardDict,
        goldenConnections,
        drawBoard: () => drawBoard(ctx, originX, originY, boardDict, goldenConnections, boardData),
        drawPieces: (pieces: Record<IntersectionId, PieceData>, selectedPieceCoord?: Vector2 | null) => 
            drawPieces(ctx, originX, originY, pieces, selectedPieceCoord),
        getCoordinatesFromPixel: (mouseX: number, mouseY: number) => 
            getCoordinatesFromPixel(mouseX, mouseY, originX, originY)
    };
}

/**
 * Create board dictionary from board data (golden and standard intersections)
 */
function createBoardDictionary(boardData: BoardData): Record<IntersectionId, 'golden' | 'standard'> {
    const boardDict: Record<IntersectionId, 'golden' | 'standard'> = {};
    
    // Mark golden intersections from JSON data
    if (boardData.golden_coordinates) {
        boardData.golden_coordinates.forEach(coord => {
            boardDict[coord] = "golden";
        });
    }
    
    // Mark standard intersections from JSON data
    if (boardData.standard_coordinates) {
        boardData.standard_coordinates.forEach(coord => {
            if (!boardDict[coord]) {
                boardDict[coord] = "standard";
            }
        });
    }
    
    return boardDict;
}

/**
 * Create golden connections set for fast lookup
 */
function createGoldenConnectionsSet(goldenLinesDict: Record<string, Array<{x: number, y: number}>>): Set<string> {
    const goldenConnections = new Set<string>();
    
    for (const coordStr in goldenLinesDict) {
        const connections = goldenLinesDict[coordStr];
        const parts = coordStr.split(',').map(Number);
        const x1 = parts[0];
        const y1 = parts[1];
        
        if (Array.isArray(connections)) {
            connections.forEach(target => {
                const x2 = target.x;
                const y2 = target.y;
                // Create a canonical key for the connection to handle both directions
                const key = `${Math.min(x1, x2)},${Math.min(y1, y2)}-${Math.max(x1, x2)},${Math.max(y1, y2)}`;
                goldenConnections.add(key);
            });
        }
    }
    
    return goldenConnections;
}

/**
 * Main board drawing function from reference implementation
 */
function drawBoard(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    boardDict: Record<IntersectionId, 'golden' | 'standard'>,
    goldenConnections: Set<string>,
    boardData: BoardData
): void {
    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw background polygons (board shape)
    drawBackgroundPolygons(ctx, originX, originY);
    
    // Draw black lines first, behind golden lines
    drawStandardLines(ctx, originX, originY, boardDict, goldenConnections);
    
    // Draw golden lines on top
    drawGoldenLines(ctx, originX, originY, boardData.golden_lines.golden_lines_dict);
    
    // Draw intersections on top of lines
    drawIntersections(ctx, originX, originY, boardDict);
}

/**
 * Draw background polygon shapes from reference
 */
function drawBackgroundPolygons(ctx: CanvasRenderingContext2D, originX: number, originY: number): void {
    // Define polygon sets from reference
    const polygonsToDraw1: PolygonPoint[][] = [
        [{x: 0, y: 12}, {x: 5, y: 11}, {x: 8, y: 9}, {x: 6, y: 6}, {x: 0, y: 6}],
        [{x: 0, y: 12}, {x: -5, y: 11}, {x: -8, y: 9}, {x: -6, y: 6}, {x: 0, y: 6}],
        [{x: 0, y: -12}, {x: -5, y: -11}, {x: -8, y: -9}, {x: -6, y: -6}, {x: 0, y: -6}],
        [{x: 0, y: -12}, {x: 5, y: -11}, {x: 8, y: -9}, {x: 6, y: -6}, {x: 0, y: -6}]
    ];
    
    const polygonsToDraw2: PolygonPoint[][] = [
        [{x: 0, y: 6}, {x: 6, y: 6}, {x: 6, y: 0}],
        [{x: 0, y: 6}, {x: -6, y: 6}, {x: -6, y: 0}],
        [{x: 0, y: -6}, {x: -6, y: -6}, {x: -6, y: 0}],
        [{x: 0, y: -6}, {x: 6, y: -6}, {x: 6, y: 0}],
        [{x: 12, y: 0}, {x: 11, y: 5}, {x: 9, y: 8}, {x: 8, y: 3}],
        [{x: -12, y: 0}, {x: -11, y: 5}, {x: -9, y: 8}, {x: -8, y: 3}],
        [{x: -12, y: 0}, {x: -11, y: -5}, {x: -9, y: -8}, {x: -8, y: -3}],
        [{x: 12, y: 0}, {x: 11, y: -5}, {x: 9, y: -8}, {x: 8, y: -3}],
        [{x: 6, y: 6}, {x: 8, y: 9}, {x: 9, y: 8}],
        [{x: -6, y: 6}, {x: -8, y: 9}, {x: -9, y: 8}],
        [{x: -6, y: -6}, {x: -8, y: -9}, {x: -9, y: -8}],
        [{x: 6, y: -6}, {x: 8, y: -9}, {x: 9, y: -8}]
    ];
    
    const polygonsToDraw3: PolygonPoint[][] = [
        [{x: 0, y: 0}, {x: 6, y: 0}, {x: 0, y: 6}],
        [{x: 0, y: 0}, {x: -6, y: 0}, {x: 0, y: 6}],
        [{x: 0, y: 0}, {x: -6, y: 0}, {x: 0, y: -6}],
        [{x: 0, y: 0}, {x: 6, y: 0}, {x: 0, y: -6}],
        [{x: 6, y: 0}, {x: 6, y: 6}, {x: 9, y: 8}, {x: 8, y: 3}, {x: 12, y: 0}],
        [{x: -6, y: 0}, {x: -6, y: 6}, {x: -9, y: 8}, {x: -8, y: 3}, {x: -12, y: 0}],
        [{x: -6, y: 0}, {x: -6, y: -6}, {x: -9, y: -8}, {x: -8, y: -3}, {x: -12, y: 0}],
        [{x: 6, y: 0}, {x: 6, y: -6}, {x: 9, y: -8}, {x: 8, y: -3}, {x: 12, y: 0}]
    ];
    
    // Draw polygon sets with different colors
    drawPolygonSet(ctx, originX, originY, polygonsToDraw1, POLYGON_FILL_COLOR_1);
    drawPolygonSet(ctx, originX, originY, polygonsToDraw2, POLYGON_FILL_COLOR_2);
    drawPolygonSet(ctx, originX, originY, polygonsToDraw3, POLYGON_FILL_COLOR_3);
}

/**
 * Draw a set of polygons with the same fill color
 */
function drawPolygonSet(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    polygons: PolygonPoint[][], 
    fillColor: string
): void {
    ctx.fillStyle = fillColor;
    polygons.forEach(polygon => {
        ctx.beginPath();
        polygon.forEach((point, index) => {
            const pixelX = originX + point.x * GRID_SIZE;
            const pixelY = originY - point.y * GRID_SIZE;
            if (index === 0) {
                ctx.moveTo(pixelX, pixelY);
            } else {
                ctx.lineTo(pixelX, pixelY);
            }
        });
        ctx.closePath();
        ctx.fill();
    });
}

/**
 * Draw standard (black) grid lines
 */
function drawStandardLines(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    boardDict: Record<IntersectionId, 'golden' | 'standard'>,
    goldenConnections: Set<string>
): void {
    ctx.strokeStyle = BLACK_LINE_COLOR;
    ctx.lineWidth = BLACK_LINE_WIDTH;
    ctx.lineCap = 'round';
    
    for (const coordStr in boardDict) {
        const [x, y] = coordStr.split(',').map(Number);
        const startX = originX + x * GRID_SIZE;
        const startY = originY - y * GRID_SIZE;
        
        // Check horizontal neighbor
        const neighborHStr = `${x + 1},${y}`;
        if (boardDict[neighborHStr] !== undefined) {
            const key = `${Math.min(x, x + 1)},${Math.min(y, y)}-${Math.max(x, x + 1)},${Math.max(y, y)}`;
            if (!goldenConnections.has(key)) {
                const endX = originX + (x + 1) * GRID_SIZE;
                const endY = originY - y * GRID_SIZE;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        // Check vertical neighbor
        const neighborVStr = `${x},${y + 1}`;
        if (boardDict[neighborVStr] !== undefined) {
            const key = `${Math.min(x, x)},${Math.min(y, y + 1)}-${Math.max(x, x)},${Math.max(y, y + 1)}`;
            if (!goldenConnections.has(key)) {
                const endX = originX + x * GRID_SIZE;
                const endY = originY - (y + 1) * GRID_SIZE;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }
}

/**
 * Draw golden lines
 */
function drawGoldenLines(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    goldenLinesDict: Record<string, Array<{x: number, y: number}>>
): void {
    ctx.strokeStyle = GOLDEN_LINE_COLOR;
    ctx.lineWidth = GOLDEN_LINE_WIDTH;
    ctx.lineCap = 'round';
    
    for (const coordStr in goldenLinesDict) {
        const connections = goldenLinesDict[coordStr];
        const parts = coordStr.split(',').map(Number);
        const startX = originX + parts[0] * GRID_SIZE;
        const startY = originY - parts[1] * GRID_SIZE;
        
        if (Array.isArray(connections)) {
            connections.forEach(target => {
                const endX = originX + target.x * GRID_SIZE;
                const endY = originY - target.y * GRID_SIZE;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            });
        }
    }
}

/**
 * Draw intersections (golden circles and standard diamonds)
 */
function drawIntersections(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    boardDict: Record<IntersectionId, 'golden' | 'standard'>
): void {
    for (const coordStr in boardDict) {
        const intersectionType = boardDict[coordStr];
        const parts = coordStr.split(',').map(Number);
        const x = parts[0];
        const y = parts[1];
        const pixelX = originX + x * GRID_SIZE;
        const pixelY = originY - y * GRID_SIZE;
        
        ctx.fillStyle = intersectionType === "golden" ? GOLDEN_COLOR : STANDARD_COLOR;
        ctx.beginPath();
        if (intersectionType === "golden") {
            ctx.arc(pixelX, pixelY, GOLDEN_RADIUS, 0, 2 * Math.PI);
        } else { // Standard intersections are now diamonds
            ctx.moveTo(pixelX, pixelY - DIAMOND_SIZE); // Top point
            ctx.lineTo(pixelX + DIAMOND_SIZE, pixelY); // Right point
            ctx.lineTo(pixelX, pixelY + DIAMOND_SIZE); // Bottom point
            ctx.lineTo(pixelX - DIAMOND_SIZE, pixelY); // Left point
            ctx.closePath();
        }
        ctx.fill();
    }
}

/**
 * Draw game pieces
 */
function drawPieces(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    pieces: Record<IntersectionId, PieceData>, 
    selectedPieceCoord?: Vector2 | null
): void {
    for (const coordStr in pieces) {
        const piece = pieces[coordStr];
        const [x, y] = coordStr.split(',').map(Number);
        const size = piece.size || 12;
        
        switch (piece.type) {
            case 'amalgamCircle':
                drawAmalgamCircle(ctx, originX, originY, x, y, size, piece.colors || [], piece.rotation || 0);
                break;
            case 'amalgamSquare':
                drawAmalgamSquare(ctx, originX, originY, x, y, size, piece.colors || [], piece.rotation || 0);
                break;
            case 'voidCircle':
                drawVoidCircle(ctx, originX, originY, x, y, size, piece.outerColor || '#000000', piece.innerColor || '#FFFFFF');
                break;
            case 'voidSquare':
                drawVoidSquare(ctx, originX, originY, x, y, size, piece.outerColor || '#000000', piece.innerColor || '#FFFFFF');
                break;
            case 'portalCircle':
                drawPortalCircle(ctx, originX, originY, x, y, size, piece.outerColor || '#000000', piece.innerColor || '#FFFFFF');
                break;
            case 'portalSquare':
                drawPortalSquare(ctx, originX, originY, x, y, size, piece.outerColor || '#000000', piece.innerColor || '#FFFFFF');
                break;
        }
    }
    
    // Draw selection highlight last
    if (selectedPieceCoord) {
        drawSelectedPieceHighlight(ctx, originX, originY, selectedPieceCoord, pieces);
    }
}

/**
 * Convert pixel coordinates to game coordinates
 */
function getCoordinatesFromPixel(mouseX: number, mouseY: number, originX: number, originY: number): Vector2 {
    const gameX = Math.round((mouseX - originX) / GRID_SIZE);
    const gameY = Math.round((originY - mouseY) / GRID_SIZE);
    return [gameX, gameY];
}

/**
 * Draw Amalgam Circle piece (quadrant-based)
 */
function drawAmalgamCircle(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    x: number, 
    y: number, 
    size: number, 
    colors: string[], 
    rotation: number
): void {
    const centerPixelX = originX + x * GRID_SIZE;
    const centerPixelY = originY - y * GRID_SIZE;
    const radius = size;
    
    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);
    ctx.rotate(rotation);
    
    // Draw the amalgam circle with quadrants
    const angles = [
        { start: -Math.PI / 4, end: Math.PI / 4, color: colors[2] || AMALGAM_COLORS[2] },
        { start: Math.PI / 4, end: 3 * Math.PI / 4, color: colors[0] || AMALGAM_COLORS[0] },
        { start: 3 * Math.PI / 4, end: 5 * Math.PI / 4, color: colors[1] || AMALGAM_COLORS[1] },
        { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4, color: colors[3] || AMALGAM_COLORS[3] }
    ];
    
    angles.forEach(angle => {
        ctx.fillStyle = angle.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, angle.start, angle.end);
        ctx.closePath();
        ctx.fill();
    });
    
    ctx.restore();
}

function drawAmalgamSquare(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    x: number, 
    y: number, 
    size: number, 
    colors: string[], 
    rotation: number
): void {
    const centerPixelX = originX + x * GRID_SIZE;
    const centerPixelY = originY - y * GRID_SIZE;
    
    const outerColors = colors.map(c => darkenColor(c, 20));

    // Size of the outer and inner squares
    const outerSize = size * 2.1;
    const innerSize = size * 1.5;

    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);

    // The square is a diamond (rotated 45 degrees), so we add this to the orientation angle
    ctx.rotate(rotation + (45 * Math.PI / 180));

    // Draw the four quadrants of the outer diamond (a rotated square)
    const halfOuter = outerSize / 2;
    const outerRects = [
        { x: -halfOuter, y: 0, w: halfOuter, h: halfOuter, color: outerColors[0] || AMALGAM_COLORS[0] }, // Red
        { x: 0, y: 0, w: halfOuter, h: halfOuter, color: outerColors[2] || AMALGAM_COLORS[2] }, // Pale Yellow
        { x: 0, y: -halfOuter, w: halfOuter, h: halfOuter, color: outerColors[3] || AMALGAM_COLORS[3] }, // Yellow/Orange
        { x: -halfOuter, y: -halfOuter, w: halfOuter, h: halfOuter, color: outerColors[1] || AMALGAM_COLORS[1] } // Green
    ];

    outerRects.forEach(rect => {
        ctx.fillStyle = rect.color;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });

    // Draw the four inner squares, forming the inner diamond
    const halfInner = innerSize / 2;
    const innerRects = [
        { x: -halfInner, y: 0, w: halfInner, h: halfInner, color: colors[0] || AMALGAM_COLORS[0] }, // Red
        { x: 0, y: 0, w: halfInner, h: halfInner, color: colors[2] || AMALGAM_COLORS[2] }, // Pale Yellow
        { x: 0, y: -halfInner, w: halfInner, h: halfInner, color: colors[3] || AMALGAM_COLORS[3] }, // Yellow/Orange
        { x: -halfInner, y: -halfInner, w: halfInner, h: halfInner, color: colors[1] || AMALGAM_COLORS[1] } // Green
    ];
    
    innerRects.forEach(rect => {
        ctx.fillStyle = rect.color;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });

    ctx.restore();
}

function drawVoidCircle(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    x: number, 
    y: number, 
    size: number, 
    outerColor: string, 
    innerColor: string
): void {
    const centerPixelX = originX + x * GRID_SIZE;
    const centerPixelY = originY - y * GRID_SIZE;
    const radius = size;
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, radius * 1.2, 0, 2 * Math.PI);
    ctx.fillStyle = outerColor;
    ctx.fill();
    ctx.closePath();

    // Draw inner circle
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = innerColor;
    ctx.fill();
    ctx.closePath();
}

function drawVoidSquare(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    x: number, 
    y: number, 
    size: number, 
    outerColor: string, 
    innerColor: string
): void {
    const centerPixelX = originX + x * GRID_SIZE;
    const centerPixelY = originY - y * GRID_SIZE;

    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);
    ctx.rotate(45 * Math.PI / 180);

    // Outer square dimensions
    const outerSize = size * 2.1;
    const halfOuter = outerSize / 2;

    // Inner square dimensions
    const innerSize = size * 1.5;
    const halfInner = innerSize / 2;

    // Draw outer diamond (rotated square)
    ctx.fillStyle = outerColor;
    ctx.fillRect(-halfOuter, -halfOuter, outerSize, outerSize);

    // Draw inner diamond (rotated square)
    ctx.fillStyle = innerColor;
    ctx.fillRect(-halfInner, -halfInner, innerSize, innerSize);

    ctx.restore();
}

function drawPortalCircle(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    x: number, 
    y: number, 
    size: number, 
    outerColor: string, 
    innerColor: string
): void {
    const centerPixelX = originX + x * GRID_SIZE;
    const centerPixelY = originY - y * GRID_SIZE;
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, size * 1.3, 0, 2 * Math.PI);
    ctx.fillStyle = outerColor;
    ctx.fill();
    ctx.closePath();

    // Draw inner portal effect
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, size * 0.8, 0, 2 * Math.PI);
    ctx.fillStyle = innerColor;
    ctx.fill();
    ctx.closePath();
}

function drawPortalSquare(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    x: number, 
    y: number, 
    size: number, 
    outerColor: string, 
    innerColor: string
): void {
    const centerPixelX = originX + x * GRID_SIZE;
    const centerPixelY = originY - y * GRID_SIZE;
    
    // Rotate the square for portal effect
    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);
    ctx.rotate(Math.PI / 4);
    
    // Outer square
    ctx.fillStyle = outerColor;
    ctx.fillRect(-size * 0.9, -size * 0.9, size * 1.8, size * 1.8);
    
    // Inner square
    ctx.fillStyle = innerColor;
    ctx.fillRect(-size * 0.6, -size * 0.6, size * 1.2, size * 1.2);
    
    ctx.restore();
}

function drawSelectedPieceHighlight(
    ctx: CanvasRenderingContext2D, 
    originX: number, 
    originY: number, 
    selectedPieceCoord: Vector2, 
    pieces: Record<IntersectionId, PieceData>
): void {
    const coordStr = `${selectedPieceCoord[0]},${selectedPieceCoord[1]}`;
    if (!pieces[coordStr]) return;
    
    const centerPixelX = originX + selectedPieceCoord[0] * GRID_SIZE;
    const centerPixelY = originY - selectedPieceCoord[1] * GRID_SIZE;
    
    // Draw highlight ring
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, 15, 0, 2 * Math.PI);
    ctx.stroke();
}

// Helper function to darken colors
function darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

export { AMALGAM_COLORS, GRID_SIZE };