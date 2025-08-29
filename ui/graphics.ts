/**
 * Graphics rendering system for Amalgam game pieces
 * Handles all piece types with proper colors, shapes, and visual properties
 */

import type { Piece, PieceGraphics, Vector2 } from '../core/types.js';

export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    originX: number;
    originY: number;
    gridSize: number;
}

/**
 * Render a piece at the given coordinates
 * @param context - Rendering context
 * @param piece - Piece to render
 * @param coords - Board coordinates
 */
export function renderPiece(context: RenderContext, piece: Piece, coords: Vector2): void {
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
function renderGemPiece(context: RenderContext, x: number, y: number, graphics: PieceGraphics, color: string): void {
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
    } else {
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
function renderAmalgamPiece(context: RenderContext, x: number, y: number, graphics: PieceGraphics): void {
    const { ctx } = context;
    const size = graphics.size;
    const colors = graphics.colors || ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'];
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
            { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4, color: colors[3] }  // Bottom (Yellow/Orange)
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
    } else {
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
function renderPortalPiece(context: RenderContext, x: number, y: number, graphics: PieceGraphics): void {
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
    } else {
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
function renderVoidPiece(context: RenderContext, x: number, y: number, graphics: PieceGraphics): void {
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
    } else {
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
export function renderPieceHighlight(context: RenderContext, coords: Vector2, size: number): void {
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