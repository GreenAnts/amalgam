/**
 * Graphics rendering system for Amalgam game pieces
 * Handles all piece types with proper colors, shapes, and visual properties
 */
// Board rendering constants
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
// Amalgam piece colors
const AMALGAM_COLORS = ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'];
/**
 * Create and setup the game canvas
 * @param container - Container element for the canvas
 * @param boardData - Board data including dimensions
 * @returns Canvas context and helper functions
 */
export function createGameCanvas(container, boardData) {
    // Clear the container
    container.innerHTML = '';
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 800;
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
        drawPieces: (pieces, selectedCoord) => drawPieces(ctx, originX, originY, pieces, selectedCoord),
        getCoordinatesFromPixel: (mouseX, mouseY) => getCoordinatesFromPixel(mouseX, mouseY, originX, originY)
    };
}
/**
 * Create board dictionary from board data (golden and standard intersections)
 */
function createBoardDictionary(boardData) {
    const boardDict = {};
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
function createGoldenConnectionsSet(goldenLinesDict) {
    const goldenConnections = new Set();
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
 * Main board drawing function
 */
function drawBoard(ctx, originX, originY, boardDict, goldenConnections, boardData) {
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
 * Draw background polygon shapes
 */
function drawBackgroundPolygons(ctx, originX, originY) {
    // Define polygon sets
    const polygonsToDraw1 = [
        [{ x: 0, y: 12 }, { x: 5, y: 11 }, { x: 8, y: 9 }, { x: 6, y: 6 }, { x: 0, y: 6 }],
        [{ x: 0, y: 12 }, { x: -5, y: 11 }, { x: -8, y: 9 }, { x: -6, y: 6 }, { x: 0, y: 6 }],
        [{ x: 0, y: -12 }, { x: -5, y: -11 }, { x: -8, y: -9 }, { x: -6, y: -6 }, { x: 0, y: -6 }],
        [{ x: 0, y: -12 }, { x: 5, y: -11 }, { x: 8, y: -9 }, { x: 6, y: -6 }, { x: 0, y: -6 }]
    ];
    const polygonsToDraw2 = [
        [{ x: 0, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 0 }],
        [{ x: 0, y: 6 }, { x: -6, y: 6 }, { x: -6, y: 0 }],
        [{ x: 0, y: -6 }, { x: -6, y: -6 }, { x: -6, y: 0 }],
        [{ x: 0, y: -6 }, { x: 6, y: -6 }, { x: 6, y: 0 }],
        [{ x: 12, y: 0 }, { x: 11, y: 5 }, { x: 9, y: 8 }, { x: 8, y: 3 }],
        [{ x: -12, y: 0 }, { x: -11, y: 5 }, { x: -9, y: 8 }, { x: -8, y: 3 }],
        [{ x: -12, y: 0 }, { x: -11, y: -5 }, { x: -9, y: -8 }, { x: -8, y: -3 }],
        [{ x: 12, y: 0 }, { x: 11, y: -5 }, { x: 9, y: -8 }, { x: 8, y: -3 }],
        [{ x: 6, y: 6 }, { x: 8, y: 9 }, { x: 9, y: 8 }],
        [{ x: -6, y: 6 }, { x: -8, y: 9 }, { x: -9, y: 8 }],
        [{ x: -6, y: -6 }, { x: -8, y: -9 }, { x: -9, y: -8 }],
        [{ x: 6, y: -6 }, { x: 8, y: -9 }, { x: 9, y: -8 }]
    ];
    const polygonsToDraw3 = [
        [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 6 }],
        [{ x: 0, y: 0 }, { x: -6, y: 0 }, { x: 0, y: 6 }],
        [{ x: 0, y: 0 }, { x: -6, y: 0 }, { x: 0, y: -6 }],
        [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: -6 }],
        [{ x: 6, y: 0 }, { x: 6, y: 6 }, { x: 9, y: 8 }, { x: 8, y: 3 }, { x: 12, y: 0 }],
        [{ x: -6, y: 0 }, { x: -6, y: 6 }, { x: -9, y: 8 }, { x: -8, y: 3 }, { x: -12, y: 0 }],
        [{ x: -6, y: 0 }, { x: -6, y: -6 }, { x: -9, y: -8 }, { x: -8, y: -3 }, { x: -12, y: 0 }],
        [{ x: 6, y: 0 }, { x: 6, y: -6 }, { x: 9, y: -8 }, { x: 8, y: -3 }, { x: 12, y: 0 }]
    ];
    // Draw polygon sets with different colors
    drawPolygonSet(ctx, originX, originY, polygonsToDraw1, POLYGON_FILL_COLOR_1);
    drawPolygonSet(ctx, originX, originY, polygonsToDraw2, POLYGON_FILL_COLOR_2);
    drawPolygonSet(ctx, originX, originY, polygonsToDraw3, POLYGON_FILL_COLOR_3);
}
/**
 * Draw a set of polygons with the same fill color
 */
function drawPolygonSet(ctx, originX, originY, polygons, fillColor) {
    ctx.fillStyle = fillColor;
    polygons.forEach(polygon => {
        ctx.beginPath();
        polygon.forEach((point, index) => {
            const pixelX = originX + point.x * GRID_SIZE;
            const pixelY = originY - point.y * GRID_SIZE;
            if (index === 0) {
                ctx.moveTo(pixelX, pixelY);
            }
            else {
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
function drawStandardLines(ctx, originX, originY, boardDict, goldenConnections) {
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
function drawGoldenLines(ctx, originX, originY, goldenLinesDict) {
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
function drawIntersections(ctx, originX, originY, boardDict) {
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
        }
        else { // Standard intersections are now diamonds
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
function drawPieces(ctx, originX, originY, pieces, selectedCoord) {
    for (const coordStr in pieces) {
        const piece = pieces[coordStr];
        const [x, y] = coordStr.split(',').map(Number);
        // Create graphics object for the piece
        const graphics = createPieceGraphics(piece);
        // Render the piece
        const renderContext = {
            ctx,
            originX,
            originY,
            gridSize: GRID_SIZE
        };
        const pieceWithGraphics = {
            ...piece,
            graphics
        };
        renderPiece(renderContext, pieceWithGraphics, [x, y]);
    }
    // Draw selection highlight
    if (selectedCoord) {
        const [x, y] = selectedCoord;
        const centerPixelX = originX + x * GRID_SIZE;
        const centerPixelY = originY - y * GRID_SIZE;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, 15, 0, 2 * Math.PI);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}
/**
 * Create graphics object for a piece
 */
function createPieceGraphics(piece) {
    switch (piece.type) {
        case 'Ruby':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                color: '#E63960',
                size: 10
            };
        case 'Pearl':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                color: '#87CEEB',
                size: 10
            };
        case 'Amber':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                color: '#F6C13F',
                size: 10
            };
        case 'Jade':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                color: '#A9E886',
                size: 10
            };
        case 'Amalgam':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                colors: AMALGAM_COLORS,
                size: 12,
                rotation: piece.player === 'circles' ? Math.PI : Math.PI / 2
            };
        case 'Portal':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                outerColor: '#87CEEB',
                innerColor: '#ADD8E6',
                size: 8
            };
        case 'Void':
            return {
                shape: piece.player === 'circles' ? 'circle' : 'square',
                outerColor: '#5B4E7A',
                innerColor: '#8D7EA9',
                size: 12
            };
        default:
            return { shape: 'circle', size: 10, color: '#666' };
    }
}
/**
 * Convert pixel coordinates to game coordinates
 */
function getCoordinatesFromPixel(mouseX, mouseY, originX, originY) {
    const gameX = Math.round((mouseX - originX) / GRID_SIZE);
    const gameY = Math.round((originY - mouseY) / GRID_SIZE);
    return [gameX, gameY];
}
/**
 * Render a piece at the given coordinates
 * @param context - Rendering context
 * @param piece - Piece to render
 * @param coords - Board coordinates
 */
export function renderPiece(context, piece, coords) {
    const [x, y] = coords;
    const centerPixelX = context.originX + x * context.gridSize;
    const centerPixelY = context.originY - y * context.gridSize;
    const graphics = piece.graphics;
    switch (piece.type) {
        case 'Ruby':
            renderGemPiece(context, centerPixelX, centerPixelY, graphics, '#E63960');
            break;
        case 'Pearl':
            renderGemPiece(context, centerPixelX, centerPixelY, graphics, '#87CEEB');
            break;
        case 'Amber':
            renderGemPiece(context, centerPixelX, centerPixelY, graphics, '#F6C13F');
            break;
        case 'Jade':
            renderGemPiece(context, centerPixelX, centerPixelY, graphics, '#A9E886');
            break;
        case 'Amalgam':
            renderAmalgamPiece(context, centerPixelX, centerPixelY, graphics);
            break;
        case 'Portal':
            renderPortalPiece(context, centerPixelX, centerPixelY, graphics);
            break;
        case 'Void':
            renderVoidPiece(context, centerPixelX, centerPixelY, graphics);
            break;
    }
}
/**
 * Render a basic gem piece (Ruby, Pearl, Amber, Jade)
 * @param context - Rendering context
 * @param x - Pixel X coordinate
 * @param y - Pixel Y coordinate
 * @param graphics - Graphics properties
 * @param color - Piece color
 */
function renderGemPiece(context, x, y, graphics, color) {
    const { ctx } = context;
    const size = graphics.size;
    ctx.save();
    ctx.translate(x, y);
    if (graphics.shape === 'circle') {
        // Draw circle gem
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
        // Add highlight
        ctx.beginPath();
        ctx.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.closePath();
    }
    else {
        // Draw square gem (rotated 45 degrees to form diamond)
        ctx.rotate(45 * Math.PI / 180);
        ctx.fillStyle = color;
        ctx.fillRect(-size, -size, size * 2, size * 2);
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(-size * 0.7, -size * 0.7, size * 0.4, size * 0.4);
    }
    ctx.restore();
}
/**
 * Render an Amalgam piece with four-color quadrants
 * @param context - Rendering context
 * @param x - Pixel X coordinate
 * @param y - Pixel Y coordinate
 * @param graphics - Graphics properties
 */
function renderAmalgamPiece(context, x, y, graphics) {
    const { ctx } = context;
    const size = graphics.size;
    const colors = graphics.colors || AMALGAM_COLORS;
    const rotation = graphics.rotation || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    if (graphics.shape === 'circle') {
        // Draw four quadrants
        const angles = [
            { start: -Math.PI / 4, end: Math.PI / 4, color: colors[2] }, // Right (Pale Yellow)
            { start: Math.PI / 4, end: 3 * Math.PI / 4, color: colors[0] }, // Top (Red)
            { start: 3 * Math.PI / 4, end: 5 * Math.PI / 4, color: colors[1] }, // Left (Green)
            { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4, color: colors[3] } // Bottom (Yellow/Orange)
        ];
        angles.forEach((quadrant) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, size, quadrant.start, quadrant.end);
            ctx.lineTo(0, 0);
            ctx.fillStyle = quadrant.color;
            ctx.fill();
            ctx.closePath();
        });
        // Add outer ring
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, 2 * Math.PI);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
    else {
        // Draw square Amalgam (diamond shape)
        ctx.rotate(45 * Math.PI / 180);
        const halfSize = size;
        const quadrants = [
            { x: -halfSize, y: 0, w: halfSize, h: halfSize, color: colors[0] }, // Red
            { x: 0, y: 0, w: halfSize, h: halfSize, color: colors[2] }, // Pale Yellow
            { x: 0, y: -halfSize, w: halfSize, h: halfSize, color: colors[3] }, // Yellow/Orange
            { x: -halfSize, y: -halfSize, w: halfSize, h: halfSize, color: colors[1] } // Green
        ];
        quadrants.forEach(rect => {
            ctx.fillStyle = rect.color;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        });
        // Add outer border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size, -size, size * 2, size * 2);
    }
    ctx.restore();
}
/**
 * Render a Portal piece with special visual effects
 * @param context - Rendering context
 * @param x - Pixel X coordinate
 * @param y - Pixel Y coordinate
 * @param graphics - Graphics properties
 */
function renderPortalPiece(context, x, y, graphics) {
    const { ctx } = context;
    const size = graphics.size;
    const outerColor = graphics.outerColor || '#87CEEB';
    const innerColor = graphics.innerColor || '#ADD8E6';
    ctx.save();
    ctx.translate(x, y);
    if (graphics.shape === 'circle') {
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = outerColor;
        ctx.fill();
        ctx.closePath();
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        ctx.fillStyle = innerColor;
        ctx.fill();
        ctx.closePath();
        // Add portal effect lines
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(-size * 1.5, 0);
            ctx.lineTo(size * 1.5, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    else {
        // Draw square portal (diamond shape)
        ctx.rotate(45 * Math.PI / 180);
        // Outer square
        ctx.fillStyle = outerColor;
        ctx.fillRect(-size * 1.2, -size * 1.2, size * 2.4, size * 2.4);
        // Inner square
        ctx.fillStyle = innerColor;
        ctx.fillRect(-size, -size, size * 2, size * 2);
        // Add portal effect lines
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(-size * 1.5, 0);
            ctx.lineTo(size * 1.5, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
}
/**
 * Render a Void piece with dark, mysterious appearance
 * @param context - Rendering context
 * @param x - Pixel X coordinate
 * @param y - Pixel Y coordinate
 * @param graphics - Graphics properties
 */
function renderVoidPiece(context, x, y, graphics) {
    const { ctx } = context;
    const size = graphics.size;
    const outerColor = graphics.outerColor || '#5B4E7A';
    const innerColor = graphics.innerColor || '#8D7EA9';
    ctx.save();
    ctx.translate(x, y);
    if (graphics.shape === 'circle') {
        // Draw outer circle with glow effect
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(91, 78, 122, 0.3)';
        ctx.fill();
        ctx.closePath();
        // Draw main outer circle
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = outerColor;
        ctx.fill();
        ctx.closePath();
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        ctx.fillStyle = innerColor;
        ctx.fill();
        ctx.closePath();
        // Add void effect (spiral pattern)
        ctx.strokeStyle = '#2A1B3D';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 4);
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.8, 0, Math.PI);
            ctx.stroke();
            ctx.restore();
        }
    }
    else {
        // Draw square void (diamond shape)
        ctx.rotate(45 * Math.PI / 180);
        // Outer glow
        ctx.fillStyle = 'rgba(91, 78, 122, 0.3)';
        ctx.fillRect(-size * 1.3, -size * 1.3, size * 2.6, size * 2.6);
        // Outer square
        ctx.fillStyle = outerColor;
        ctx.fillRect(-size * 1.2, -size * 1.2, size * 2.4, size * 2.4);
        // Inner square
        ctx.fillStyle = innerColor;
        ctx.fillRect(-size, -size, size * 2, size * 2);
        // Add void effect lines
        ctx.strokeStyle = '#2A1B3D';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(-size * 1.5, 0);
            ctx.lineTo(size * 1.5, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
}
/**
 * Render a piece highlight for selection
 * @param context - Rendering context
 * @param coords - Board coordinates
 * @param size - Highlight size
 */
export function renderPieceHighlight(context, coords, size) {
    const { ctx } = context;
    const [x, y] = coords;
    const centerPixelX = context.originX + x * context.gridSize;
    const centerPixelY = context.originY - y * context.gridSize;
    ctx.save();
    // Draw yellow highlight circle
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, size * 1.5, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();
    // Add pulsing effect
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, size * 1.8, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}
export { AMALGAM_COLORS, GRID_SIZE };
