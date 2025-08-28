/**
 * SVG rendering utilities for the Amalgam game board
 * Handles drawing board elements, pieces, golden lines, and visual effects
 * Pure drawing functions with no game logic
 */

import { logger } from '../utils/logger.js';

/**
 * Draw the complete game board
 * @param {SVGElement} svgElement - SVG element to draw on
 * @param {Object} board - Board object with intersections and other data
 */
export function drawBoard(svgElement, board) {
    logger.debug('Drawing Amalgam board');
    
    // Clear existing content
    svgElement.innerHTML = '';
    
    // Set SVG dimensions
    svgElement.setAttribute('width', board.width);
    svgElement.setAttribute('height', board.height);
    svgElement.setAttribute('viewBox', `0 0 ${board.width} ${board.height}`);
    
    // Draw golden lines first (background)
    drawGoldenLines(svgElement, board.goldenLineConnections);
    
    // Draw intersections
    drawIntersections(svgElement, board.intersections, board.intersectionRadius);
    
    // Draw starting area indicators (we'll need to pass this data separately)
    // drawStartingAreas(svgElement, boardData.starting_areas, board.coordinateScale, board.centerOffset);
}

/**
 * Draw golden line network
 * @param {SVGElement} svgElement - SVG element
 * @param {Array} goldenLineConnections - Array of golden line connections
 */
function drawGoldenLines(svgElement, goldenLineConnections) {
    const goldenLinesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    goldenLinesGroup.setAttribute('class', 'golden-lines');
    
    // Draw connections
    for (const connection of goldenLineConnections) {
        const fromCoords = connection.from;
        const toCoords = connection.to;
        
        // Convert coordinates to SVG positions
        const fromX = 600 + (fromCoords[0] * 40);
        const fromY = 600 - (fromCoords[1] * 40);
        const toX = 600 + (toCoords[0] * 40);
        const toY = 600 - (toCoords[1] * 40);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('class', 'golden-line');
        line.setAttribute('stroke', '#FFD700');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('opacity', '0.6');
        
        goldenLinesGroup.appendChild(line);
    }
    
    svgElement.appendChild(goldenLinesGroup);
}

/**
 * Draw board intersections
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Object>} intersections - Array of intersection data
 * @param {number} radius - Intersection radius
 */
function drawIntersections(svgElement, intersections, radius) {
    const intersectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    intersectionsGroup.setAttribute('class', 'intersections');
    
    for (const intersection of intersections) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', intersection.x);
        circle.setAttribute('cy', intersection.y);
        circle.setAttribute('r', radius);
        circle.setAttribute('class', 'intersection');
        circle.setAttribute('data-coords', JSON.stringify(intersection.coords));
        circle.setAttribute('data-id', intersection.id);
        
        intersectionsGroup.appendChild(circle);
    }
    
    svgElement.appendChild(intersectionsGroup);
}

/**
 * Draw starting area indicators
 * @param {SVGElement} svgElement - SVG element
 * @param {Object} startingAreas - Starting areas configuration
 * @param {number} scale - Coordinate scale
 * @param {Array<number>} offset - Center offset
 */
function drawStartingAreas(svgElement, startingAreas, scale, offset) {
    const areasGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    areasGroup.setAttribute('class', 'starting-areas');
    
    // Draw circles starting area
    const circlesArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    circlesArea.setAttribute('x', offset[0] - (12 * scale));
    circlesArea.setAttribute('y', offset[1] - (12 * scale));
    circlesArea.setAttribute('width', 24 * scale);
    circlesArea.setAttribute('height', 5 * scale);
    circlesArea.setAttribute('class', 'starting-area circles-area');
    circlesArea.setAttribute('fill', 'rgba(255, 0, 0, 0.1)');
    circlesArea.setAttribute('stroke', '#FF0000');
    circlesArea.setAttribute('stroke-width', '2');
    circlesArea.setAttribute('stroke-dasharray', '5,5');
    
    areasGroup.appendChild(circlesArea);
    
    // Draw squares starting area
    const squaresArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    squaresArea.setAttribute('x', offset[0] - (12 * scale));
    squaresArea.setAttribute('y', offset[1] + (7 * scale));
    squaresArea.setAttribute('width', 24 * scale);
    squaresArea.setAttribute('height', 5 * scale);
    squaresArea.setAttribute('class', 'starting-area squares-area');
    squaresArea.setAttribute('fill', 'rgba(0, 0, 255, 0.1)');
    squaresArea.setAttribute('stroke', '#0000FF');
    squaresArea.setAttribute('stroke-width', '2');
    squaresArea.setAttribute('stroke-dasharray', '5,5');
    
    areasGroup.appendChild(squaresArea);
    
    svgElement.appendChild(areasGroup);
}

/**
 * Draw all pieces on the board
 * @param {SVGElement} svgElement - SVG element
 * @param {Object} board - Board state
 * @param {Object} pieces - Pieces data
 * @param {number} pieceRadius - Piece radius
 */
export function drawPieces(svgElement, board, pieces, pieceRadius) {
    logger.debug('Drawing pieces on board');
    
    // Remove existing pieces
    const existingPieces = svgElement.querySelector('.pieces');
    if (existingPieces) {
        existingPieces.remove();
    }
    
    const piecesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    piecesGroup.setAttribute('class', 'pieces');
    
    // Draw each piece
    for (const piece of Object.values(pieces)) {
        const pieceElement = createPieceElement(piece, pieceRadius);
        piecesGroup.appendChild(pieceElement);
    }
    
    svgElement.appendChild(piecesGroup);
}

/**
 * Create a piece element
 * @param {Object} piece - Piece data
 * @param {number} radius - Piece radius
 * @returns {SVGElement} - Piece SVG element
 */
function createPieceElement(piece, radius) {
    const pieceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pieceGroup.setAttribute('class', `piece piece--${piece.player} piece--${piece.type.toLowerCase()}`);
    pieceGroup.setAttribute('data-piece-id', piece.id);
    
    // Convert coordinates to SVG position
    const x = 600 + (piece.coords[0] * 40);
    const y = 600 - (piece.coords[1] * 40);
    
    // Create piece circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', radius);
    circle.setAttribute('class', 'piece-circle');
    
    // Set piece color based on type and player
    const colors = getPieceColors(piece);
    circle.setAttribute('fill', colors.fill);
    circle.setAttribute('stroke', colors.stroke);
    circle.setAttribute('stroke-width', '2');
    
    pieceGroup.appendChild(circle);
    
    // Add piece symbol/text
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    symbol.setAttribute('x', x);
    symbol.setAttribute('y', y + 4);
    symbol.setAttribute('text-anchor', 'middle');
    symbol.setAttribute('class', 'piece-symbol');
    symbol.setAttribute('fill', colors.text);
    symbol.setAttribute('font-size', '12');
    symbol.setAttribute('font-weight', 'bold');
    symbol.textContent = getPieceSymbol(piece.type);
    
    pieceGroup.appendChild(symbol);
    
    return pieceGroup;
}

/**
 * Get piece colors based on type and player
 * @param {Object} piece - Piece data
 * @returns {Object} - Color configuration
 */
function getPieceColors(piece) {
    const baseColors = {
        circles: {
            fill: '#FF6B6B',
            stroke: '#CC0000',
            text: '#FFFFFF'
        },
        squares: {
            fill: '#4ECDC4',
            stroke: '#006666',
            text: '#FFFFFF'
        }
    };
    
    const playerColors = baseColors[piece.player];
    
    // Special colors for special pieces
    if (piece.type === 'Void') {
        return {
            fill: '#2C3E50',
            stroke: '#000000',
            text: '#FFFFFF'
        };
    } else if (piece.type === 'Portal') {
        return {
            fill: '#9B59B6',
            stroke: '#6C3483',
            text: '#FFFFFF'
        };
    } else if (piece.type === 'Amalgam') {
        return {
            fill: '#F39C12',
            stroke: '#E67E22',
            text: '#FFFFFF'
        };
    }
    
    return playerColors;
}

/**
 * Get piece symbol
 * @param {string} type - Piece type
 * @returns {string} - Piece symbol
 */
function getPieceSymbol(type) {
    const symbols = {
        'Ruby': 'R',
        'Pearl': 'P',
        'Amber': 'A',
        'Jade': 'J',
        'Amalgam': 'M',
        'Portal': 'O',
        'Void': 'V'
    };
    
    return symbols[type] || '?';
}

/**
 * Highlight intersections (for legal moves, etc.)
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Array<number>>} coordsArray - Array of coordinates to highlight
 * @param {string} highlightClass - CSS class for highlighting
 */
export function highlightIntersections(svgElement, coordsArray, highlightClass = 'intersection--legal') {
    clearHighlights(svgElement);
    
    for (const coords of coordsArray) {
        const intersection = svgElement.querySelector(`[data-coords='[${coords[0]},${coords[1]}]']`);
        if (intersection) {
            intersection.classList.add(highlightClass);
        }
    }
}

/**
 * Highlight pieces
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<string>} pieceIds - Array of piece IDs to highlight
 * @param {string} highlightClass - CSS class for highlighting
 */
export function highlightPieces(svgElement, pieceIds, highlightClass = 'piece--selected') {
    clearPieceHighlights(svgElement);
    
    for (const pieceId of pieceIds) {
        const piece = svgElement.querySelector(`[data-piece-id='${pieceId}']`);
        if (piece) {
            piece.classList.add(highlightClass);
        }
    }
}

/**
 * Clear all highlights
 * @param {SVGElement} svgElement - SVG element
 */
export function clearHighlights(svgElement) {
    const intersections = svgElement.querySelectorAll('.intersection');
    intersections.forEach(int => {
        int.classList.remove('intersection--legal', 'intersection--selected', 'intersection--hover');
    });
}

/**
 * Clear piece highlights
 * @param {SVGElement} svgElement - SVG element
 */
export function clearPieceHighlights(svgElement) {
    const pieces = svgElement.querySelectorAll('.piece');
    pieces.forEach(piece => {
        piece.classList.remove('piece--selected', 'piece--hover', 'piece--legal');
    });
}

/**
 * Highlight golden line connections
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Object>} connections - Array of connection objects
 */
export function highlightGoldenLines(svgElement, connections) {
    const goldenLines = svgElement.querySelectorAll('.golden-line');
    goldenLines.forEach(line => {
        line.classList.remove('golden-line--active');
    });
    
    for (const connection of connections) {
        // Find and highlight the corresponding line
        // This would need more sophisticated matching logic
    }
}

/**
 * Update the entire board display
 * @param {SVGElement} svgElement - SVG element
 * @param {Object} board - Board state
 * @param {Object} pieces - Pieces data
 * @param {Object} boardData - Board configuration
 */
export function updateBoardDisplay(svgElement, board, pieces, boardData) {
    // Update piece positions
    drawPieces(svgElement, board, pieces, boardData.board.pieceRadius);
    
    // Update any highlights or visual effects
    // This would be called after moves or state changes
}

/**
 * Animate piece movement
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<number>} fromCoords - Source coordinates
 * @param {Array<number>} toCoords - Target coordinates
 * @param {string} pieceId - Piece ID
 * @param {Function} onComplete - Callback when animation completes
 */
export function animatePieceMove(svgElement, fromCoords, toCoords, pieceId, onComplete) {
    const piece = svgElement.querySelector(`[data-piece-id='${pieceId}']`);
    if (!piece) {
        if (onComplete) onComplete();
        return;
    }
    
    const fromX = 600 + (fromCoords[0] * 40);
    const fromY = 600 - (fromCoords[1] * 40);
    const toX = 600 + (toCoords[0] * 40);
    const toY = 600 - (toCoords[1] * 40);
    
    // Simple linear animation
    const duration = 500; // milliseconds
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentX = fromX + (toX - fromX) * progress;
        const currentY = fromY + (toY - fromY) * progress;
        
        piece.setAttribute('transform', `translate(${currentX - fromX}, ${currentY - fromY})`);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            piece.removeAttribute('transform');
            if (onComplete) onComplete();
        }
    }
    
    requestAnimationFrame(animate);
}

/**
 * Show ability effects (fireball, tidal wave, etc.)
 * @param {SVGElement} svgElement - SVG element
 * @param {string} abilityType - Type of ability
 * @param {Array<Array<number>>} formation - Formation coordinates
 * @param {string} direction - Direction for directional abilities
 * @param {Function} onComplete - Callback when effect completes
 */
export function showAbilityEffect(svgElement, abilityType, formation, direction, onComplete) {
    const effectsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    effectsGroup.setAttribute('class', 'ability-effects');
    
    switch (abilityType) {
        case 'fireball':
            showFireballEffect(svgElement, formation, direction, effectsGroup);
            break;
        case 'tidal_wave':
            showTidalWaveEffect(svgElement, formation, direction, effectsGroup);
            break;
        case 'sap':
            showSapEffect(svgElement, formation, effectsGroup);
            break;
        case 'launch':
            showLaunchEffect(svgElement, formation, direction, effectsGroup);
            break;
    }
    
    svgElement.appendChild(effectsGroup);
    
    // Remove effect after animation
    setTimeout(() => {
        effectsGroup.remove();
        if (onComplete) onComplete();
    }, 1000);
}

/**
 * Show fireball effect
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Array<number>>} formation - Formation coordinates
 * @param {string} direction - Direction
 * @param {SVGElement} effectsGroup - Effects group
 */
function showFireballEffect(svgElement, formation, direction, effectsGroup) {
    // Create fireball visual effect
    const fireball = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fireball.setAttribute('r', '8');
    fireball.setAttribute('fill', '#FF4500');
    fireball.setAttribute('class', 'fireball-effect');
    
    // Position fireball at formation center
    const centerX = (formation[0][0] + formation[1][0]) / 2;
    const centerY = (formation[0][1] + formation[1][1]) / 2;
    const x = 600 + (centerX * 40);
    const y = 600 - (centerY * 40);
    
    fireball.setAttribute('cx', x);
    fireball.setAttribute('cy', y);
    
    effectsGroup.appendChild(fireball);
    
    // Animate fireball
    animateFireball(fireball, direction, 600);
}

/**
 * Show tidal wave effect
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Array<number>>} formation - Formation coordinates
 * @param {string} direction - Direction
 * @param {SVGElement} effectsGroup - Effects group
 */
function showTidalWaveEffect(svgElement, formation, direction, effectsGroup) {
    // Create tidal wave visual effect
    const wave = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    wave.setAttribute('width', '160');
    wave.setAttribute('height', '200');
    wave.setAttribute('fill', 'rgba(0, 191, 255, 0.3)');
    wave.setAttribute('stroke', '#00BFFF');
    wave.setAttribute('stroke-width', '2');
    wave.setAttribute('class', 'tidal-wave-effect');
    
    // Position wave
    const x = 600 + (formation[0][0] * 40) - 80;
    const y = 600 - (formation[0][1] * 40) - 100;
    
    wave.setAttribute('x', x);
    wave.setAttribute('y', y);
    
    effectsGroup.appendChild(wave);
}

/**
 * Show sap effect
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Array<number>>} formation - Formation coordinates
 * @param {SVGElement} effectsGroup - Effects group
 */
function showSapEffect(svgElement, formation, effectsGroup) {
    // Create sap line effect
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#8B4513');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('class', 'sap-effect');
    
    const x1 = 600 + (formation[0][0] * 40);
    const y1 = 600 - (formation[0][1] * 40);
    const x2 = 600 + (formation[1][0] * 40);
    const y2 = 600 - (formation[1][1] * 40);
    
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    
    effectsGroup.appendChild(line);
}

/**
 * Show launch effect
 * @param {SVGElement} svgElement - SVG element
 * @param {Array<Array<number>>} formation - Formation coordinates
 * @param {string} direction - Direction
 * @param {SVGElement} effectsGroup - Effects group
 */
function showLaunchEffect(svgElement, formation, direction, effectsGroup) {
    // Create launch visual effect
    const launch = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    launch.setAttribute('r', '6');
    launch.setAttribute('fill', '#32CD32');
    launch.setAttribute('class', 'launch-effect');
    
    // Position at formation
    const x = 600 + (formation[0][0] * 40);
    const y = 600 - (formation[0][1] * 40);
    
    launch.setAttribute('cx', x);
    launch.setAttribute('cy', y);
    
    effectsGroup.appendChild(launch);
}

/**
 * Animate fireball movement
 * @param {SVGElement} fireball - Fireball element
 * @param {string} direction - Direction
 * @param {number} distance - Distance to travel
 */
function animateFireball(fireball, direction, distance) {
    const startTime = performance.now();
    const duration = 800;
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Calculate movement based on direction
        let dx = 0, dy = 0;
        switch (direction) {
            case 'up': dy = -distance * progress; break;
            case 'down': dy = distance * progress; break;
            case 'left': dx = -distance * progress; break;
            case 'right': dx = distance * progress; break;
            case 'up-left': dx = -distance * progress * 0.707; dy = -distance * progress * 0.707; break;
            case 'up-right': dx = distance * progress * 0.707; dy = -distance * progress * 0.707; break;
            case 'down-left': dx = -distance * progress * 0.707; dy = distance * progress * 0.707; break;
            case 'down-right': dx = distance * progress * 0.707; dy = distance * progress * 0.707; break;
        }
        
        fireball.setAttribute('transform', `translate(${dx}, ${dy})`);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}
