# Amalgam - Abstract Board Game

A modular, clean 2-player abstract board game built with HTML, CSS, and JavaScript using ES modules.

## Project Structure

```
amalgam/
├── data/                    # Static configuration data
│   └── board-data.json     # Board geometry and game rules
├── core/                   # Pure game logic
│   ├── board.js           # Board state management
│   └── rules.js           # Game rules and move validation
├── ui/                     # Rendering and interaction
│   ├── graphics.js        # SVG rendering utilities
│   ├── interactions.js    # Mouse event handling
│   └── animations.js      # Visual effects (optional)
├── game/                   # Game orchestration
│   ├── gameManager.js     # Main game controller
│   └── player.js          # Human and AI player implementations
├── utils/                  # Generic utilities
│   ├── logger.js          # Logging utilities
│   └── helpers.js         # Common helper functions
├── index.html             # Main HTML page
├── style.css              # Game styling
├── main.js                # Application entry point
└── README.md              # This file
```

## Features

- **Modular Architecture**: Clean separation of concerns with distinct modules for logic, UI, and game management
- **Pure Game Logic**: Core rules are deterministic and side-effect free
- **Multiple AI Players**: Random, heuristic, and minimax AI implementations
- **Smooth Animations**: Visual effects for piece movements, captures, and celebrations
- **Responsive Design**: Works on desktop and mobile devices
- **ES Modules**: Modern JavaScript with import/export
- **Comprehensive Logging**: Debug and error tracking throughout the application

## Getting Started

### Prerequisites

- Modern web browser with ES module support
- Local web server (for development)

### Installation

1. Clone or download the project files
2. Start a local web server in the project directory:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

3. Open your browser and navigate to `http://localhost:8000`

### Development Setup

The project is ready to run immediately. For development:

1. Open the browser's developer console to see debug logs
2. Use `window.amalgamGame` to access the game instance for debugging
3. Modify files in their respective modules following the established patterns

## Game Rules

The game follows abstract board game principles:

- **Placement Phase**: Players take turns placing pieces on empty intersections
- **Movement Phase**: Players can move their pieces along connected lines
- **Capture**: Players can capture opponent pieces when they have adjacent pieces
- **Win Condition**: Capture all opponent pieces or achieve strategic position

## Architecture Overview

### Core Module (`/core`)
- **board.js**: Immutable board state management with copy-on-write operations
- **rules.js**: Pure functions for move validation, application, and win checking

### UI Module (`/ui`)
- **graphics.js**: SVG rendering for board, pieces, and highlights
- **interactions.js**: Mouse event handling and move intent generation
- **animations.js**: Visual effects using requestAnimationFrame

### Game Module (`/game`)
- **gameManager.js**: Orchestrates game flow, coordinates between modules
- **player.js**: Player interface implementations (Human, Random AI, Heuristic AI, Minimax AI)

### Utils Module (`/utils`)
- **logger.js**: Consistent logging with configurable levels
- **helpers.js**: Generic utilities (deep copy, RNG, array helpers, etc.)

## Player Types

### Human Player
- Controlled via mouse clicks
- Supports piece selection and movement
- Validates moves in real-time

### Random AI
- Makes random legal moves
- Good for testing and casual play

### Heuristic AI
- Uses simple strategic evaluation
- Prefers captures and strategic positions
- Moderate difficulty

### Minimax AI
- Uses minimax search algorithm
- Configurable search depth
- Highest difficulty level

## Customization

### Board Configuration
Modify `data/board-data.json` to change:
- Board geometry and intersections
- Connection patterns
- Starting piece count
- Win conditions

### Game Rules
Update `core/rules.js` to modify:
- Move validation logic
- Win condition checking
- Game flow rules

### Visual Styling
Customize `style.css` for:
- Board appearance
- Piece colors and effects
- Responsive layout
- Animation timing

## Development Guidelines

### Code Style
- Use ES modules with import/export
- Follow camelCase for variables/functions
- Use PascalCase for classes
- Keep functions small and single-responsibility
- Document complex functions with JSDoc

### Module Dependencies
```
core → (none)
ui → utils
game → core, ui, utils
main → game, core, ui, utils
```

### Error Handling
- Core logic returns explicit results with success/failure
- UI reflects error states appropriately
- Logger captures all errors for debugging

## Browser Compatibility

- Chrome 61+ (ES modules)
- Firefox 60+ (ES modules)
- Safari 10.1+ (ES modules)
- Edge 16+ (ES modules)

## Future Enhancements

- [ ] Undo/redo functionality
- [ ] Game state persistence
- [ ] Network multiplayer
- [ ] Advanced AI algorithms
- [ ] Custom board themes
- [ ] Sound effects
- [ ] Tutorial mode
- [ ] Statistics tracking

## Contributing

1. Follow the established module structure
2. Maintain separation of concerns
3. Add appropriate logging
4. Test with different player configurations
5. Update documentation for new features

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the logging output for debugging information
3. Ensure you're running on a local web server (not file:// protocol)
4. Verify browser compatibility with ES modules
