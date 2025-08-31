// Ability Animation Manager for Amalgam Game
// Integrates particle effects with game abilities
import { ParticleSystem, ParticlePresets } from './particle-system.js';
export class AbilityAnimationManager {
    constructor(canvas) {
        this.animations = new Map();
        this.lastTime = 0;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    /**
     * Start an ability animation
     * @param abilityId - Unique identifier for the ability
     * @param abilityType - Type of ability (fireball, tidalWave, sap, launch)
     * @param config - Animation configuration
     */
    startAbilityAnimation(abilityId, abilityType, config) {
        // Stop any existing animation with the same ID
        this.stopAbilityAnimation(abilityId);
        // Get the preset configuration
        const preset = ParticlePresets[abilityType];
        if (!preset) {
            console.warn(`Unknown ability type: ${abilityType}`);
            return;
        }
        // Create custom configuration based on preset and ability config
        const particleConfig = {
            ...preset,
            bounds: { width: this.canvas.width, height: this.canvas.height },
            count: Math.floor(preset.count * (config.intensity || 1)),
            speed: preset.speed * (config.intensity || 1)
        };
        // Create particle system
        const particleSystem = new ParticleSystem(particleConfig);
        // Create animation object
        const animation = {
            id: abilityId,
            type: abilityType,
            system: particleSystem,
            config: config,
            startTime: Date.now(),
            isActive: true
        };
        // Store the animation
        this.animations.set(abilityId, animation);
        console.log(`Started ${abilityType} animation for ability ${abilityId}`);
    }
    /**
     * Stop an ability animation
     * @param abilityId - ID of the animation to stop
     */
    stopAbilityAnimation(abilityId) {
        const animation = this.animations.get(abilityId);
        if (animation) {
            animation.isActive = false;
            this.animations.delete(abilityId);
            console.log(`Stopped animation for ability ${abilityId}`);
        }
    }
    /**
     * Stop all active animations
     */
    stopAllAnimations() {
        this.animations.clear();
        console.log('Stopped all ability animations');
    }
    /**
     * Update all active animations
     * @param deltaTime - Time since last frame
     */
    update(deltaTime) {
        const currentTime = Date.now();
        // Update each animation
        for (const [abilityId, animation] of this.animations.entries()) {
            if (!animation.isActive) {
                this.animations.delete(abilityId);
                continue;
            }
            // Check if animation duration has expired
            const elapsed = currentTime - animation.startTime;
            if (elapsed > animation.config.duration) {
                this.stopAbilityAnimation(abilityId);
                continue;
            }
            // Update particle system
            animation.system.update(deltaTime);
            // Add target area attraction if specified
            if (animation.config.targetArea) {
                const centerX = animation.config.targetArea.x + animation.config.targetArea.width / 2;
                const centerY = animation.config.targetArea.y + animation.config.targetArea.height / 2;
                animation.system.addForce(centerX, centerY, 0.1, 'attract');
            }
        }
    }
    /**
     * Render all active animations
     */
    render() {
        // Create a temporary canvas for compositing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        // Clear temporary canvas
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        // Render each animation
        for (const animation of this.animations.values()) {
            if (animation.isActive) {
                animation.system.draw(tempCtx);
            }
        }
        // Composite onto main canvas
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen'; // Additive blending for glow effects
        this.ctx.drawImage(tempCanvas, 0, 0);
        this.ctx.restore();
    }
    /**
     * Get active animation count
     */
    getActiveAnimationCount() {
        return this.animations.size;
    }
    /**
     * Check if an animation is active
     * @param abilityId - ID of the animation to check
     */
    isAnimationActive(abilityId) {
        return this.animations.has(abilityId);
    }
}
// Predefined ability configurations
export const AbilityConfigs = {
    fireball: {
        duration: 3000,
        intensity: 0.8
    },
    tidalWave: {
        duration: 4000,
        intensity: 0.9
    },
    sap: {
        duration: 5000,
        intensity: 0.6
    },
    launch: {
        duration: 2000,
        intensity: 0.7
    }
};
// Helper function to create ability animation with target area
export function createTargetedAbilityAnimation(manager, abilityType, targetX, targetY, targetSize = 100) {
    const abilityId = `${abilityType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const config = {
        ...AbilityConfigs[abilityType],
        targetArea: {
            x: targetX - targetSize / 2,
            y: targetY - targetSize / 2,
            width: targetSize,
            height: targetSize
        }
    };
    manager.startAbilityAnimation(abilityId, abilityType, config);
    return abilityId;
}
