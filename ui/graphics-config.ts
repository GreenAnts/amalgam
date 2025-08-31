/**
 * Graphics Configuration Manager
 * Centralized system for managing all visual parameters and scaling
 */

export interface GraphicsConfig {
    schema: string;
    version: string;
    description: string;
    board: {
        description: string;
        grid_spacing: number;
        center_offset: [number, number];
        intersection_radius: number;
        piece_radius: number;
                       background_colors: {
                   primary: string;
                   secondary: string;
                   tertiary: string;
                   grid_line: string;
                   grid_line_width: number;
               };
    };
    pieces: {
        description: string;
        amalgam: {
            size: number;
            outer_ring_multiplier: number;
            quadrants: {
                top: string;
                right: string;
                left: string;
                bottom: string;
            };
            darken_percent: number;
        };
        portal: {
            size: number;
            outer_color: string;
            inner_color: string;
        };
        void: {
            size: number;
            outer_color: string;
            inner_color: string;
        };
        gems: {
            ruby: { size: number; color: string; };
            pearl: { size: number; color: string; };
            amber: { size: number; color: string; };
            jade: { size: number; color: string; };
        };
    };
    visual_feedback: {
        description: string;
        selection_highlight: {
            base_size: number;
            color: string;
            line_width: number;
            pulse_animation: {
                enabled: boolean;
                min_alpha: number;
                max_alpha: number;
                duration_ms: number;
            };
        };
        valid_move_indicators: {
            base_size: number;
            fill_color: string;
            border_color: string;
            line_width: number;
        };
        hover_effect: {
            base_size: number;
            color: string;
            line_width: number;
        };
        setup_phase_highlights: {
            circles_color: string;
            squares_color: string;
            line_width: number;
            dash_pattern: number[];
            radius: number;
        };
    };
    ui: {
        description: string;
        action_panel: {
            width: number;
            height: number;
            offset_from_piece: number;
            background_color: string;
            border_color: string;
            border_width: number;
            border_radius: number;
            shadow: string;
        };
        buttons: {
            padding: string;
            border_radius: number;
            font_size: string;
            font_weight: string;
            transition_duration: string;
        };
    };
    animations: {
        description: string;
        selection_pulse: {
            duration_ms: number;
            easing: string;
        };
        move_indicator_fade: {
            duration_ms: number;
            easing: string;
        };
        piece_movement: {
            duration_ms: number;
            easing: string;
        };
    };
    scaling: {
        description: string;
        base_grid_size: number;
        scale_factors: {
            small: number;
            medium: number;
            large: number;
            xlarge: number;
        };
        responsive_breakpoints: {
            small: number;
            medium: number;
            large: number;
        };
    };
}

class GraphicsConfigManager {
    private config: GraphicsConfig | null = null;
    private currentGridSize: number = 45; // Default from board data

    constructor() {
        // No default config - must load from JSON
    }

    /**
     * Load graphics configuration from JSON file
     */
    async loadConfig(): Promise<GraphicsConfig> {
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
        } catch (error) {
            console.error('Failed to load graphics config:', error);
            throw new Error('Graphics configuration is required but could not be loaded');
        }
    }

    /**
     * Get the current graphics configuration
     */
    getConfig(): GraphicsConfig {
        if (!this.config) {
            throw new Error('Graphics configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }

    /**
     * Set the current grid size (from board data)
     */
    setGridSize(gridSize: number): void {
        this.currentGridSize = gridSize;
    }

    /**
     * Get the current grid size
     */
    getGridSize(): number {
        return this.currentGridSize;
    }

    /**
     * Calculate scaled size based on current grid size
     */
    getScaledSize(baseSize: number): number {
        const config = this.getConfig();
        const scaleFactor = this.currentGridSize / config.scaling.base_grid_size;
        return baseSize * scaleFactor;
    }

    /**
     * Calculate scaled line width based on current grid size
     */
    getScaledLineWidth(baseWidth: number): number {
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
    getResponsiveScaleFactor(): number {
        const config = this.getConfig();
        const screenWidth = window.innerWidth;
        const breakpoints = config.scaling.responsive_breakpoints;
        const scaleFactors = config.scaling.scale_factors;

        if (screenWidth < breakpoints.small) {
            return scaleFactors.small;
        } else if (screenWidth < breakpoints.medium) {
            return scaleFactors.medium;
        } else if (screenWidth < breakpoints.large) {
            return scaleFactors.large;
        } else {
            return scaleFactors.xlarge;
        }
    }

}

// Export singleton instance
export const graphicsConfig = new GraphicsConfigManager();
