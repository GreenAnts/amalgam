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
 * Utility function to darken a hex color (from reference implementation)
 */
function darkenColor(hex, percent) {
    hex = hex.replace(/^#/, '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.floor(r * (100 - percent) / 100);
    g = Math.floor(g * (100 - percent) / 100);
    b = Math.floor(b * (100 - percent) / 100);
    const rStr = r.toString(16).padStart(2, '0');
    const gStr = g.toString(16).padStart(2, '0');
    const bStr = b.toString(16).padStart(2, '0');
    return `#${rStr}${gStr}${bStr}`;
}
/**
 * Create and setup the game canvas
 * @param container - Container element for the canvas
 * @param boardData - Board data including dimensions
 * @returns Canvas context and helper functions
 */
export function createGameCanvas(container, boardData) {
    // Preserve existing elements (like action-panel) before clearing
    const existingElements = Array.from(container.children);
    const elementsToPreserve = existingElements.filter(el => el.id === 'action-panel' || el.classList.contains('preserve'));
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
    // Re-append preserved elements
    elementsToPreserve.forEach(element => {
        container.appendChild(element);
    });
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
        // Use existing graphics if available, otherwise create default graphics
        const graphics = piece.graphics || createPieceGraphics(piece);
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
    // Draw selection highlight (from reference implementation)
    if (selectedCoord) {
        const [x, y] = selectedCoord;
        const centerPixelX = originX + x * GRID_SIZE;
        const centerPixelY = originY - y * GRID_SIZE;
        // Find the piece at the selected coordinates
        const coordStr = `${x},${y}`;
        const piece = pieces[coordStr];
        if (piece) {
            ctx.beginPath();
            ctx.arc(centerPixelX, centerPixelY, piece.size * 1.5, 0, 2 * Math.PI);
            ctx.strokeStyle = '#ffff00'; // Yellow highlight color
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.closePath();
        }
    }
}
/**
 * Create graphics object for a piece
 */
function createPieceGraphics(piece) {
    // If the piece already has graphics defined, use them
    if (piece.graphics) {
        return piece.graphics;
    }
    // Otherwise, create default graphics
    const pieceType = piece.type;
    const player = piece.player;
    if (pieceType === 'Amalgam') {
        return {
            shape: player === 'circles' ? 'circle' : 'square',
            size: piece.size || 12,
            colors: AMALGAM_COLORS,
            rotation: piece.rotation || (player === 'circles' ? Math.PI : Math.PI / 2)
        };
    }
    else if (pieceType === 'Portal') {
        return {
            shape: player === 'circles' ? 'circle' : 'square',
            size: piece.size || 8,
            outerColor: '#87CEEB',
            innerColor: '#ADD8E6'
        };
    }
    else if (pieceType === 'Void') {
        return {
            shape: player === 'circles' ? 'circle' : 'square',
            size: piece.size || 12,
            outerColor: '#5B4E7A',
            innerColor: '#8D7EA9'
        };
    }
    else {
        // For gem pieces (Ruby, Pearl, Amber, Jade)
        const colorMap = {
            'Ruby': '#E63960',
            'Pearl': '#87CEEB',
            'Amber': '#F6C13F',
            'Jade': '#A9E886'
        };
        return {
            shape: player === 'circles' ? 'circle' : 'square',
            size: piece.size || 10,
            color: colorMap[pieceType] || '#666'
        };
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
/**
 * Render piece selection highlight
 */
export function renderSelectionHighlight(context, coords) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + coords[0] * gridSize;
    const centerPixelY = originY - coords[1] * gridSize;
    // Draw selection ring
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, 18, 0, 2 * Math.PI);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Add pulsing effect
    const time = Date.now() / 1000;
    const pulse = 0.8 + 0.2 * Math.sin(time * 4);
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, 22, 0, 2 * Math.PI);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
}
/**
 * Render valid move indicators
 */
export function renderValidMoveIndicators(context, validMoves) {
    const { ctx, originX, originY, gridSize } = context;
    validMoves.forEach(coords => {
        const centerPixelX = originX + coords[0] * gridSize;
        const centerPixelY = originY - coords[1] * gridSize;
        // Draw move indicator circle
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.fill();
        // Draw border
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}
/**
 * Render hover effect
 */
export function renderHoverEffect(context, coords) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + coords[0] * gridSize;
    const centerPixelY = originY - coords[1] * gridSize;
    // Draw subtle hover ring
    ctx.beginPath();
    ctx.arc(centerPixelX, centerPixelY, 15, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
}
export function renderPiece(context, piece, coords) {
    const [x, y] = coords;
    // Use the graphics property from the piece
    const graphics = piece.graphics;
    const pieceType = piece.type;
    const shape = graphics?.shape;
    if (pieceType === 'Amalgam') {
        if (shape === 'circle') {
            drawAmalgamCircle(context, x, y, graphics.size, graphics.colors || AMALGAM_COLORS, graphics.rotation || 0);
        }
        else {
            drawAmalgamSquare(context, x, y, graphics.size, graphics.colors || AMALGAM_COLORS, graphics.rotation || 0);
        }
    }
    else if (pieceType === 'Portal') {
        if (shape === 'circle') {
            drawPortalCircle(context, x, y, graphics.size, graphics.outerColor || '#87CEEB', graphics.innerColor || '#ADD8E6');
        }
        else {
            drawPortalSquare(context, x, y, graphics.size, graphics.outerColor || '#87CEEB', graphics.innerColor || '#ADD8E6');
        }
    }
    else if (pieceType === 'Void') {
        if (shape === 'circle') {
            drawVoidCircle(context, x, y, graphics.size, graphics.outerColor || '#5B4E7A', graphics.innerColor || '#8D7EA9');
        }
        else {
            drawVoidSquare(context, x, y, graphics.size, graphics.outerColor || '#5B4E7A', graphics.innerColor || '#8D7EA9');
        }
    }
    else {
        // For gem pieces (Ruby, Pearl, Amber, Jade)
        // Use the color from the graphics object, which comes from the piece definitions
        const color = graphics.color || '#666';
        if (shape === 'circle') {
            renderGemCircle(context, x, y, graphics.size, color);
        }
        else {
            renderGemSquare(context, x, y, graphics.size, color);
        }
    }
}
/**
 * Draw Amalgam Circle piece (from reference implementation)
 */
function drawAmalgamCircle(context, x, y, size, colors, rotation) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
    const radius = size;
    const outerRadius = radius * 1.2;
    // Darken the colors for the outer ring
    const outerColors = colors.map(c => darkenColor(c, 20));
    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);
    ctx.rotate(rotation);
    // Define the quadrants of the piece. Red is defined as the "top" quadrant (PI/4 to 3PI/4).
    const angles = [
        { start: -Math.PI / 4, end: Math.PI / 4, color: colors[2] }, // Right (Pale Yellow)
        { start: Math.PI / 4, end: 3 * Math.PI / 4, color: colors[0] }, // Top (Red)
        { start: 3 * Math.PI / 4, end: 5 * Math.PI / 4, color: colors[1] }, // Left (Green)
        { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4, color: colors[3] } // Bottom (Yellow/Orange)
    ];
    // Draw the four quadrants of the outer ring
    angles.forEach((quadrant) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, outerRadius, quadrant.start, quadrant.end);
        ctx.lineTo(0, 0);
        ctx.fillStyle = darkenColor(quadrant.color, 20);
        ctx.fill();
        ctx.closePath();
    });
    // Draw the four quadrants of the inner circle
    angles.forEach((quadrant) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, quadrant.start, quadrant.end);
        ctx.lineTo(0, 0);
        ctx.fillStyle = quadrant.color;
        ctx.fill();
        ctx.closePath();
    });
    ctx.restore();
}
/**
 * Draw Amalgam Square piece (from reference implementation)
 */
function drawAmalgamSquare(context, x, y, size, colors, rotation) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
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
        { x: -halfOuter, y: 0, w: halfOuter, h: halfOuter, color: outerColors[0] }, // Red
        { x: 0, y: 0, w: halfOuter, h: halfOuter, color: outerColors[2] }, // Pale Yellow
        { x: 0, y: -halfOuter, w: halfOuter, h: halfOuter, color: outerColors[3] }, // Yellow/Orange
        { x: -halfOuter, y: -halfOuter, w: halfOuter, h: halfOuter, color: outerColors[1] } // Green
    ];
    outerRects.forEach(rect => {
        ctx.fillStyle = rect.color;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
    // Draw the four inner squares, forming the inner diamond
    const halfInner = innerSize / 2;
    const innerRects = [
        { x: -halfInner, y: 0, w: halfInner, h: halfInner, color: colors[0] }, // Red
        { x: 0, y: 0, w: halfInner, h: halfInner, color: colors[2] }, // Pale Yellow
        { x: 0, y: -halfInner, w: halfInner, h: halfInner, color: colors[3] }, // Yellow/Orange
        { x: -halfInner, y: -halfInner, w: halfInner, h: halfInner, color: colors[1] } // Green
    ];
    innerRects.forEach(rect => {
        ctx.fillStyle = rect.color;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
    ctx.restore();
}
/**
 * Draw Void Circle piece (from reference implementation)
 */
function drawVoidCircle(context, x, y, size, outerColor, innerColor) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
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
/**
 * Draw Void Square piece (from reference implementation)
 */
function drawVoidSquare(context, x, y, size, outerColor, innerColor) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
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
/**
 * Draw Portal Circle piece (from reference implementation)
 */
function drawPortalCircle(context, x, y, size, outerColor, innerColor) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
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
/**
 * Draw Portal Square piece (from reference implementation)
 */
function drawPortalSquare(context, x, y, size, outerColor, innerColor) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
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
/**
 * Render a gem circle piece
 */
function renderGemCircle(context, x, y, size, color) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
    const radius = size;
    const outerRadius = radius * 1.2;
    const innerRadius = radius;
    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);
    // Draw outer circle (darker border)
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = darkenColor(color, 20);
    ctx.fill();
    ctx.closePath();
    // Draw inner circle (main color)
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
    // Add highlight
    ctx.beginPath();
    ctx.arc(-innerRadius * 0.3, -innerRadius * 0.3, innerRadius * 0.2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.closePath();
    ctx.restore();
}
/**
 * Render a gem square piece
 */
function renderGemSquare(context, x, y, size, color) {
    const { ctx, originX, originY, gridSize } = context;
    const centerPixelX = originX + x * gridSize;
    const centerPixelY = originY - y * gridSize;
    const outerSize = size * 2.1;
    const innerSize = size * 1.5;
    ctx.save();
    ctx.translate(centerPixelX, centerPixelY);
    // Draw square gem (rotated 45 degrees to form diamond)
    ctx.rotate(45 * Math.PI / 180);
    // Draw outer diamond (darker border)
    ctx.fillStyle = darkenColor(color, 20);
    ctx.fillRect(-outerSize / 2, -outerSize / 2, outerSize, outerSize);
    // Draw inner diamond (main color)
    ctx.fillStyle = color;
    ctx.fillRect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);
    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(-innerSize * 0.35, -innerSize * 0.35, innerSize * 0.2, innerSize * 0.2);
    ctx.restore();
}
export { AMALGAM_COLORS, GRID_SIZE, createBoardDictionary, createGoldenConnectionsSet };
