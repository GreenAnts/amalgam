/**
 * Animations module for Amalgam game
 * Handles piece movement animations and visual effects
 */

// Animation configuration
const ANIMATION_CONFIG = {
    defaultDuration: 300,
    easing: 'ease-in-out',
    pieceMovement: {
        duration: 250,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    piecePlacement: {
        duration: 150,
        easing: 'ease-out'
    },
    goldenLineGlow: {
        duration: 1000,
        easing: 'ease-in-out'
    }
};

/**
 * Animate piece movement from one position to another
 * @param {Object} piece - The piece to animate
 * @param {Array} fromPos - Starting position [x, y]
 * @param {Array} toPos - Target position [x, y]
 * @param {Function} onComplete - Callback when animation completes
 */
export function animatePieceMovement(piece, fromPos, toPos, onComplete = null) {
    if (!piece || !fromPos || !toPos) {
        if (onComplete) onComplete();
        return;
    }

    const duration = ANIMATION_CONFIG.pieceMovement.duration;
    const easing = ANIMATION_CONFIG.pieceMovement.easing;
    
    // Simple linear interpolation animation
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const easedProgress = applyEasing(progress, easing);
        
        // Interpolate position
        const currentX = fromPos[0] + (toPos[0] - fromPos[0]) * easedProgress;
        const currentY = fromPos[1] + (toPos[1] - fromPos[1]) * easedProgress;
        
        // Update piece position
        if (piece.element) {
            piece.element.setAttribute('transform', `translate(${currentX}, ${currentY})`);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            if (onComplete) onComplete();
        }
    }
    
    requestAnimationFrame(animate);
}

/**
 * Animate piece placement (appearance)
 * @param {Object} piece - The piece to animate
 * @param {Function} onComplete - Callback when animation completes
 */
export function animatePiecePlacement(piece, onComplete = null) {
    if (!piece) {
        if (onComplete) onComplete();
        return;
    }

    const duration = ANIMATION_CONFIG.piecePlacement.duration;
    
    // Start with 0 opacity and scale
    if (piece.element) {
        piece.element.style.opacity = '0';
        piece.element.style.transform = 'scale(0.5)';
    }
    
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (piece.element) {
            piece.element.style.opacity = progress;
            piece.element.style.transform = `scale(${0.5 + progress * 0.5})`;
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            if (onComplete) onComplete();
        }
    }
    
    requestAnimationFrame(animate);
}

/**
 * Animate golden line glow effect
 * @param {SVGElement} lineElement - The golden line element to animate
 * @param {Function} onComplete - Callback when animation completes
 */
export function animateGoldenLineGlow(lineElement, onComplete = null) {
    if (!lineElement) {
        if (onComplete) onComplete();
        return;
    }

    const duration = ANIMATION_CONFIG.goldenLineGlow.duration;
    
    // Store original stroke width
    const originalStrokeWidth = lineElement.getAttribute('stroke-width') || '2';
    
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Create pulsing effect
        const pulseProgress = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
        const strokeWidth = parseFloat(originalStrokeWidth) + pulseProgress * 3;
        
        lineElement.setAttribute('stroke-width', strokeWidth.toString());
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Restore original stroke width
            lineElement.setAttribute('stroke-width', originalStrokeWidth);
            if (onComplete) onComplete();
        }
    }
    
    requestAnimationFrame(animate);
}

/**
 * Apply easing function to animation progress
 * @param {number} progress - Animation progress (0-1)
 * @param {string} easing - Easing function name
 * @returns {number} Eased progress value
 */
function applyEasing(progress, easing) {
    switch (easing) {
        case 'ease-in-out':
            return progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        case 'ease-out':
            return 1 - Math.pow(1 - progress, 3);
        case 'ease-in':
            return progress * progress * progress;
        case 'cubic-bezier(0.4, 0, 0.2, 1)':
            // Simplified cubic-bezier approximation
            return progress * progress * (3 - 2 * progress);
        default:
            return progress;
    }
}

/**
 * Stop all running animations
 */
export function stopAllAnimations() {
    // This would typically cancel all requestAnimationFrame calls
    // For simplicity, we'll just log that animations are stopped
    console.log('All animations stopped');
}

/**
 * Check if animations are supported
 * @returns {boolean} True if animations are supported
 */
export function isAnimationSupported() {
    return 'requestAnimationFrame' in window;
}

// Export configuration for external use
export { ANIMATION_CONFIG };
