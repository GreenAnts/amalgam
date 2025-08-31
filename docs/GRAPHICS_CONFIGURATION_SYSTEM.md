# 🎨 Graphics Configuration System

## Overview

The Amalgam game now uses a centralized graphics configuration system that allows easy adjustment of all visual parameters from a single location. This system eliminates hardcoded values throughout the codebase and provides automatic scaling based on the board's coordinate system.

## 🎯 Key Features

### **Centralized Configuration**
- All visual parameters stored in `data/graphics-config.json`
- Single source of truth for colors, sizes, and effects
- Easy to modify without touching code

### **Automatic Scaling**
- Elements automatically scale based on board grid size
- Maintains proportions across different screen sizes
- Responsive design support

### **Type Safety**
- Full TypeScript support with proper interfaces
- Compile-time validation of configuration structure
- IntelliSense support for configuration properties

### **Error Handling**
- Application fails fast if configuration cannot be loaded
- Graceful degradation for missing values
- No breaking changes if config file is missing

## 📁 File Structure

```
data/
├── graphics-config.json          # Main configuration file
└── board-data.json              # Board-specific data

ui/
├── graphics-config.ts           # Configuration manager
└── graphics.ts                  # Updated graphics system

tests/features/
├── graphics-config-test.html    # Configuration system tests
└── movement-indicator-scaling-test.html  # Scaling tests
```

## 🔧 Configuration Categories

### **Board Settings**
```json
{
  "board": {
    "grid_spacing": 45,
    "center_offset": [600, 600],
    "intersection_radius": 8,
    "piece_radius": 18,
    "background_colors": {
      "primary": "#f0f0f0",
      "secondary": "#e0e0e0",
      "grid_line": "#ccc",
      "grid_line_width": 1
    }
  }
}
```

### **Piece Rendering**
```json
{
  "pieces": {
    "amalgam": {
      "size": 12,
      "outer_ring_multiplier": 1.2,
      "colors": ["#E63960", "#A9E886", "#F8F6DA", "#F6C13F"],
      "darken_percent": 20
    },
    "portal": {
      "size": 8,
      "outer_color": "#87CEEB",
      "inner_color": "#ADD8E6"
    },
    "gems": {
      "ruby": { "size": 10, "color": "#E63960" },
      "pearl": { "size": 10, "color": "#F8F6DA" },
      "amber": { "size": 10, "color": "#F6C13F" },
      "jade": { "size": 10, "color": "#A9E886" }
    }
  }
}
```

### **Visual Feedback**
```json
{
  "visual_feedback": {
    "selection_highlight": {
      "base_size": 15,
      "color": "#00FF00",
      "line_width": 3,
      "pulse_animation": {
        "enabled": true,
        "min_alpha": 0.3,
        "max_alpha": 0.8,
        "duration_ms": 1000
      }
    },
    "valid_move_indicators": {
      "base_size": 8,
      "fill_color": "rgba(0, 255, 0, 0.6)",
      "border_color": "#00FF00",
      "line_width": 2
    }
  }
}
```

### **UI Elements**
```json
{
  "ui": {
    "action_panel": {
      "width": 200,
      "height": 300,
      "offset_from_piece": 30,
      "background_color": "#ffffff",
      "border_color": "#cccccc",
      "border_width": 1,
      "border_radius": 8,
      "shadow": "0 2px 10px rgba(0,0,0,0.1)"
    }
  }
}
```

### **Scaling Configuration**
```json
{
  "scaling": {
    "base_grid_size": 25,
    "scale_factors": {
      "small": 0.8,
      "medium": 1.0,
      "large": 1.2,
      "xlarge": 1.5
    },
    "responsive_breakpoints": {
      "small": 768,
      "medium": 1024,
      "large": 1440
    }
  }
}
```

## 🚀 Usage Examples

### **Loading Configuration**
```typescript
import { graphicsConfig } from './ui/graphics-config.js';

// Load configuration (async)
await graphicsConfig.loadConfig();

// Get configuration
const config = graphicsConfig.getConfig();
```

### **Scaling Elements**
```typescript
// Set current grid size
graphicsConfig.setGridSize(45);

// Get scaled sizes
const scaledSize = graphicsConfig.getScaledSize(8); // Base size 8px
const scaledLineWidth = graphicsConfig.getScaledLineWidth(2); // Base width 2px
```

### **Using Visual Feedback Config**
```typescript
const visualConfig = graphicsConfig.getVisualFeedbackConfig();
const selectionSize = graphicsConfig.getScaledSize(visualConfig.selection_highlight.base_size);
const selectionColor = visualConfig.selection_highlight.color;
```

### **Piece Configuration**
```typescript
const pieceConfig = graphicsConfig.getPieceConfig();
const amalgamColors = pieceConfig.amalgam.colors;
const portalSize = pieceConfig.portal.size;
```

## 🎨 Customization Guide

### **Changing Colors**
1. Open `data/graphics-config.json`
2. Find the relevant color property
3. Change the hex value
4. Save the file
5. Refresh the game

### **Adjusting Sizes**
1. Open `data/graphics-config.json`
2. Find the relevant size property
3. Change the numeric value
4. Save the file
5. Refresh the game

### **Modifying Effects**
1. Open `data/graphics-config.json`
2. Find the relevant effect configuration
3. Adjust parameters (duration, alpha, etc.)
4. Save the file
5. Refresh the game

### **Adding New Elements**
1. Add new properties to the appropriate section in `data/graphics-config.json`
2. Update the TypeScript interface in `ui/graphics-config.ts`
3. Use the new properties in your graphics code
4. Test with the graphics configuration test

## 🧪 Testing

### **Graphics Configuration Test**
- **Location**: `tests/features/graphics-config-test.html`
- **Purpose**: Verify configuration loading, scaling, and visual elements
- **Tests**: Configuration loading, scaling system, visual feedback, piece rendering

### **Movement Indicator Scaling Test**
- **Location**: `tests/features/movement-indicator-scaling-test.html`
- **Purpose**: Verify movement indicators align with board intersections
- **Tests**: Correct vs legacy scaling comparison

## 🔄 Migration from Hardcoded Values

### **Before (Hardcoded)**
```typescript
// Old way - hardcoded values scattered throughout code
const GRID_SIZE = 25;
const AMALGAM_COLORS = ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'];
const SELECTION_COLOR = '#00FF00';
const SELECTION_SIZE = 15;
```

### **After (Configuration-Based)**
```typescript
// New way - centralized configuration
graphicsConfig.setGridSize(gridSize);
const config = graphicsConfig.getConfig();
const colors = config.pieces.amalgam.colors;
const selectionColor = config.visual_feedback.selection_highlight.color;
const selectionSize = graphicsConfig.getScaledSize(config.visual_feedback.selection_highlight.base_size);
```

## 📊 Benefits

### **For Developers**
- **Maintainability**: All visual parameters in one place
- **Consistency**: Standardized approach across the codebase
- **Type Safety**: Compile-time validation prevents errors
- **Flexibility**: Easy to experiment with different visual styles

### **For Users**
- **Responsive Design**: Automatic scaling for different screen sizes
- **Consistent Experience**: Uniform visual elements throughout the game
- **Performance**: Optimized rendering with proper scaling

### **For Designers**
- **Easy Customization**: Change colors and sizes without coding
- **Rapid Prototyping**: Quick visual adjustments for testing
- **Version Control**: Track visual changes in configuration files

## 🔮 Future Enhancements

### **Planned Features**
- **Theme System**: Multiple visual themes (dark, light, high contrast)
- **Animation Configuration**: Centralized animation timing and easing
- **Accessibility Settings**: High contrast mode, larger text options
- **Export/Import**: Save and share custom configurations

### **Advanced Scaling**
- **Dynamic Scaling**: Real-time scaling based on window size
- **Device Optimization**: Automatic optimization for mobile/desktop
- **Performance Scaling**: Adjust detail level based on device performance

## 🛠️ Troubleshooting

### **Configuration Not Loading**
- Check that `data/graphics-config.json` exists and is valid JSON
- Verify the file path in the fetch request
- Check browser console for network errors

### **Scaling Issues**
- Ensure `graphicsConfig.setGridSize()` is called with the correct value
- Verify the base grid size in the configuration matches expectations
- Check that scaling calculations use the correct base size

### **Visual Elements Not Appearing**
- Verify the configuration contains the required properties
- Check that the graphics functions are using the configuration correctly
- Ensure the render context has the correct grid size

## 📝 Best Practices

1. **Always use configuration values** instead of hardcoded constants
2. **Test scaling** with different grid sizes to ensure proper proportions
3. **Validate configuration** structure when adding new properties
4. **Document changes** to the configuration schema
5. **Use TypeScript interfaces** for type safety and IntelliSense
6. **Test visual changes** with the provided test pages
7. **Keep configuration organized** by logical categories
8. **Use descriptive property names** for clarity

---

**The graphics configuration system provides a powerful, flexible foundation for managing all visual aspects of the Amalgam game while maintaining code quality and developer productivity.**
