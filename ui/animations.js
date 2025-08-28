/**
 * Animation utilities for visual effects
 * Provides smooth transitions and effects for game interactions
 * No timing logic that influences game rules - visuals only
 */

import { logger } from '../utils/logger.js';

/**
 * Animation manager for handling visual effects
 */
export class AnimationManager {
    constructor(svgElement) {
        this.svgElement = svgElement;
        this.activeAnimations = new Set();
    }

    /**
     * Animate a piece capture with fade out effect
     * @param {number} intersectionId - Intersection ID of captured piece
     * @param {Function} onComplete - Callback when animation completes
     */
    animateCapture(intersectionId, onComplete) {
        const piece = this.svgElement.querySelector(`.piece[data-intersection-id="${intersectionId}"]`);
        
        if (!piece) {
            onComplete();
            return;
        }

        logger.debug('Animating capture', intersectionId);
        
        const animation = {
            id: `capture-${intersectionId}-${Date.now()}`,
            element: piece,
            startTime: performance.now(),
            duration: 300
        };
        
        this.activeAnimations.add(animation);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Fade out effect
            const opacity = 1 - progress;
            piece.style.opacity = opacity;
            
            // Scale down effect
            const scale = 1 - (progress * 0.3);
            piece.style.transform = `scale(${scale})`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.activeAnimations.delete(animation);
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Animate a piece placement with bounce effect
     * @param {number} intersectionId - Intersection ID where piece was placed
     * @param {string} playerId - Player ID for piece color
     * @param {Function} onComplete - Callback when animation completes
     */
    animatePlacement(intersectionId, playerId, onComplete) {
        const intersection = this.svgElement.querySelector(`[data-intersection-id="${intersectionId}"]`);
        
        if (!intersection) {
            onComplete();
            return;
        }

        logger.debug('Animating placement', intersectionId);
        
        const x = intersection.getAttribute('cx');
        const y = intersection.getAttribute('cy');
        
        // Create temporary piece for animation
        const tempPiece = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        tempPiece.setAttribute('cx', x);
        tempPiece.setAttribute('cy', y);
        tempPiece.setAttribute('r', '12');
        tempPiece.setAttribute('class', `piece piece--${playerId}`);
        tempPiece.style.opacity = '0';
        tempPiece.style.transform = 'scale(0)';
        
        this.svgElement.appendChild(tempPiece);
        
        const animation = {
            id: `placement-${intersectionId}-${Date.now()}`,
            element: tempPiece,
            startTime: performance.now(),
            duration: 400
        };
        
        this.activeAnimations.add(animation);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Bounce effect
            const bounceProgress = progress < 0.5 
                ? 2 * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            const scale = bounceProgress;
            const opacity = progress;
            
            tempPiece.style.opacity = opacity;
            tempPiece.style.transform = `scale(${scale})`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.activeAnimations.delete(animation);
                tempPiece.remove();
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Animate a piece movement with smooth transition
     * @param {number} fromId - Source intersection ID
     * @param {number} toId - Target intersection ID
     * @param {string} playerId - Player ID
     * @param {Function} onComplete - Callback when animation completes
     */
    animateMovement(fromId, toId, playerId, onComplete) {
        const fromIntersection = this.svgElement.querySelector(`[data-intersection-id="${fromId}"]`);
        const toIntersection = this.svgElement.querySelector(`[data-intersection-id="${toId}"]`);
        
        if (!fromIntersection || !toIntersection) {
            onComplete();
            return;
        }

        logger.debug('Animating movement', { fromId, toId });
        
        const fromX = parseFloat(fromIntersection.getAttribute('cx'));
        const fromY = parseFloat(fromIntersection.getAttribute('cy'));
        const toX = parseFloat(toIntersection.getAttribute('cx'));
        const toY = parseFloat(toIntersection.getAttribute('cy'));
        
        // Create temporary animated piece
        const animatedPiece = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        animatedPiece.setAttribute('cx', fromX);
        animatedPiece.setAttribute('cy', fromY);
        animatedPiece.setAttribute('r', '12');
        animatedPiece.setAttribute('class', `piece piece--${playerId} piece--selected`);
        
        this.svgElement.appendChild(animatedPiece);
        
        const animation = {
            id: `movement-${fromId}-${toId}-${Date.now()}`,
            element: animatedPiece,
            startTime: performance.now(),
            duration: 500
        };
        
        this.activeAnimations.add(animation);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Smooth easing
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentX = fromX + (toX - fromX) * easeProgress;
            const currentY = fromY + (toY - fromY) * easeProgress;
            
            animatedPiece.setAttribute('cx', currentX);
            animatedPiece.setAttribute('cy', currentY);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.activeAnimations.delete(animation);
                animatedPiece.remove();
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Animate a highlight pulse effect
     * @param {Array<number>} intersectionIds - Intersection IDs to highlight
     * @param {string} highlightClass - CSS class for highlighting
     * @param {Function} onComplete - Callback when animation completes
     */
    animateHighlight(intersectionIds, highlightClass, onComplete) {
        logger.debug('Animating highlight', intersectionIds);
        
        const elements = intersectionIds.map(id => 
            this.svgElement.querySelector(`[data-intersection-id="${id}"]`)
        ).filter(el => el);
        
        if (elements.length === 0) {
            onComplete();
            return;
        }
        
        const animation = {
            id: `highlight-${Date.now()}`,
            elements: elements,
            startTime: performance.now(),
            duration: 600
        };
        
        this.activeAnimations.add(animation);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Pulse effect
            const pulseProgress = Math.sin(progress * Math.PI * 2);
            const scale = 1 + (pulseProgress * 0.1);
            
            elements.forEach(element => {
                element.style.transform = `scale(${scale})`;
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.activeAnimations.delete(animation);
                elements.forEach(element => {
                    element.style.transform = '';
                });
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Animate a win celebration
     * @param {string} winnerId - Winner player ID
     * @param {Function} onComplete - Callback when animation completes
     */
    animateWinCelebration(winnerId, onComplete) {
        logger.debug('Animating win celebration', winnerId);
        
        const pieces = this.svgElement.querySelectorAll(`.piece--${winnerId}`);
        
        if (pieces.length === 0) {
            onComplete();
            return;
        }
        
        const animation = {
            id: `celebration-${Date.now()}`,
            elements: Array.from(pieces),
            startTime: performance.now(),
            duration: 2000
        };
        
        this.activeAnimations.add(animation);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Celebration effect - pieces bounce and glow
            pieces.forEach((piece, index) => {
                const delay = (index / pieces.length) * 0.5;
                const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / 0.5));
                
                if (adjustedProgress > 0 && adjustedProgress < 1) {
                    const bounce = Math.sin(adjustedProgress * Math.PI * 4) * 0.2;
                    const scale = 1 + bounce;
                    const rotation = adjustedProgress * 360;
                    
                    piece.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
                    piece.style.filter = `drop-shadow(0 0 10px ${winnerId === 'p1' ? '#dc3545' : '#007bff'})`;
                } else if (adjustedProgress >= 1) {
                    piece.style.transform = '';
                    piece.style.filter = '';
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.activeAnimations.delete(animation);
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Stop all active animations
     */
    stopAllAnimations() {
        this.activeAnimations.forEach(animation => {
            if (animation.element) {
                animation.element.remove();
            }
        });
        this.activeAnimations.clear();
    }

    /**
     * Check if any animations are currently running
     * @returns {boolean} - Whether animations are active
     */
    hasActiveAnimations() {
        return this.activeAnimations.size > 0;
    }
}

/**
 * Create animation manager
 * @param {SVGElement} svgElement - SVG element
 * @returns {AnimationManager} - Animation manager instance
 */
export function createAnimationManager(svgElement) {
    return new AnimationManager(svgElement);
}
