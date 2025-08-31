/**
 * Graphics Configuration Manager
 * Centralized system for managing all visual parameters and scaling
 */
class GraphicsConfigManager {
    constructor() {
        this.config = null;
        this.currentGridSize = 45; // Default from board data
        // No default config - must load from JSON
    }
    /**
     * Load graphics configuration from JSON file
     */
    async loadConfig() {
        try {
            const response = await fetch('/data/graphics-config.json');
            if (!response.ok) {
                throw new Error(`Failed to load graphics config: ${response.statusText}`);
            }
            this.config = await response.json();
            if (!this.config) {
                throw new Error('Graphics configuration loaded but is null');
            }
            return this.config;
        }
        catch (error) {
            console.error('Failed to load graphics config:', error);
            throw new Error('Graphics configuration is required but could not be loaded');
        }
    }
    /**
     * Get the current graphics configuration
     */
    getConfig() {
        if (!this.config) {
            throw new Error('Graphics configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }
    /**
     * Set the current grid size (from board data)
     */
    setGridSize(gridSize) {
        this.currentGridSize = gridSize;
    }
    /**
     * Get the current grid size
     */
    getGridSize() {
        return this.currentGridSize;
    }
    /**
     * Calculate scaled size based on current grid size
     */
    getScaledSize(baseSize) {
        const config = this.getConfig();
        const scaleFactor = this.currentGridSize / config.scaling.base_grid_size;
        return baseSize * scaleFactor;
    }
    /**
     * Calculate scaled line width based on current grid size
     */
    getScaledLineWidth(baseWidth) {
        const config = this.getConfig();
        const scaleFactor = this.currentGridSize / config.scaling.base_grid_size;
        return baseWidth * scaleFactor;
    }
    /**
     * Get board configuration
     */
    getBoardConfig() {
        return this.getConfig().board;
    }
    /**
     * Get piece configuration
     */
    getPieceConfig() {
        return this.getConfig().pieces;
    }
    /**
     * Get visual feedback configuration
     */
    getVisualFeedbackConfig() {
        return this.getConfig().visual_feedback;
    }
    /**
     * Get UI configuration
     */
    getUIConfig() {
        return this.getConfig().ui;
    }
    /**
     * Get animation configuration
     */
    getAnimationConfig() {
        return this.getConfig().animations;
    }
    /**
     * Get scaling configuration
     */
    getScalingConfig() {
        return this.getConfig().scaling;
    }
    /**
     * Get responsive scale factor based on screen width
     */
    getResponsiveScaleFactor() {
        const config = this.getConfig();
        const screenWidth = window.innerWidth;
        const breakpoints = config.scaling.responsive_breakpoints;
        const scaleFactors = config.scaling.scale_factors;
        if (screenWidth < breakpoints.small) {
            return scaleFactors.small;
        }
        else if (screenWidth < breakpoints.medium) {
            return scaleFactors.medium;
        }
        else if (screenWidth < breakpoints.large) {
            return scaleFactors.large;
        }
        else {
            return scaleFactors.xlarge;
        }
    }
}
// Export singleton instance
export const graphicsConfig = new GraphicsConfigManager();
