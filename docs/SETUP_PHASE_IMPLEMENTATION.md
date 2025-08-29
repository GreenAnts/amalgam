# Amalgam Setup Phase Implementation

This document describes the complete implementation of the Amalgam game setup phase, including starting pieces, piece graphics, and game flow.

## Overview

The setup phase is the initial phase of the Amalgam game where players place their gem pieces on the board before gameplay begins. This implementation includes:

- **Pre-placed pieces**: Special pieces (Void, Amalgam, Portal) that start on the board
- **Setup phase pieces**: Gem pieces (Ruby, Pearl, Amber, Jade) that players place during setup
- **Piece graphics**: Visual representation of all pieces with proper colors and shapes
- **Starting positions**: Valid placement zones for each player
- **Turn management**: 16 alternating turns with proper player order

## Setup Phase Rules

### Turn Structure
- **Total turns**: 16 (8 pieces per player)
- **Starting player**: Squares player places first
- **Turn order**: Squares → Circles → Squares → Circles... (alternating)
- **Post-setup**: Squares player gets first move in gameplay

### Piece Distribution
Each player places exactly 8 gem pieces:
- **Ruby**: 2 pieces (Fireball ability)
- **Pearl**: 2 pieces (Tidal Wave ability)  
- **Amber**: 2 pieces (Sap ability)
- **Jade**: 2 pieces (Launch ability)

### Placement Restrictions
- **Circles player**: Must place in upper board area (Y coordinate ≥ 7)
- **Squares player**: Must place in lower board area (Y coordinate ≤ -7)
- **Piece limits**: Cannot place more than 2 pieces of any single gem type
- **Occupancy**: Cannot place on occupied intersections

## Pre-Placed Pieces

### Void Pieces
- **C_Void**: [0, 12] - Circles player (Circle shape)
- **S_Void**: [0, -12] - Squares player (Square shape)
- **Graphics**: Dark purple outer ring (#5B4E7A), lighter purple inner (#8D7EA9)
- **Special**: Victory pieces - opponent must reach these positions to win

### Amalgam Pieces
- **C_Amalgam**: [0, 6] - Circles player (Circle shape)
- **S_Amalgam**: [0, -6] - Squares player (Square shape)
- **Graphics**: Four-color quadrants (Red, Green, Pale Yellow, Yellow/Orange)
- **Special**: Can use all four gem abilities

### Portal Pieces
- **C_Portal1**: [6, 6], **C_Portal2**: [-6, 6] - Circles player (Circle shapes)
- **S_Portal1**: [6, -6], **S_Portal2**: [-6, -6] - Squares player (Square shapes)
- **Graphics**: Light blue outer ring (#87CEEB), lighter blue inner (#ADD8E6)
- **Special**: Unique movement and combat rules

## Starting Areas

### Circles Starting Area (Upper Board)
**44 valid positions** with Y coordinate ≥ 7:

```
Y=11: [1,11], [2,11], [3,11], [4,11], [-1,11], [-2,11], [-3,11], [-4,11]
Y=10: [1,10], [2,10], [3,10], [5,10], [6,10], [-1,10], [-2,10], [-3,10], [-5,10], [-6,10]
Y=9:  [1,9], [2,9], [4,9], [5,9], [6,9], [7,9], [-1,9], [-2,9], [-4,9], [-5,9], [-6,9], [-7,9]
Y=8:  [1,8], [3,8], [4,8], [5,8], [6,8], [7,8], [-1,8], [-3,8], [-4,8], [-5,8], [-6,8], [-7,8]
Y=7:  [2,7], [3,7], [4,7], [5,7], [6,7], [-2,7], [-3,7], [-4,7], [-5,7], [-6,7]
```

### Squares Starting Area (Lower Board)
**44 valid positions** with Y coordinate ≤ -7:

```
Y=-11: [1,-11], [2,-11], [3,-11], [4,-11], [-1,-11], [-2,-11], [-3,-11], [-4,-11]
Y=-10: [1,-10], [2,-10], [3,-10], [5,-10], [6,-10], [-1,-10], [-2,-10], [-3,-10], [-5,-10], [-6,-10]
Y=-9:  [1,-9], [2,-9], [4,-9], [5,-9], [6,-9], [7,-9], [-1,-9], [-2,-9], [-4,-9], [-5,-9], [-6,-9], [-7,-9]
Y=-8:  [1,-8], [3,-8], [4,-8], [5,-8], [6,-8], [7,-8], [-1,-8], [-3,-8], [-4,-8], [-5,-8], [-6,-8], [-7,-8]
Y=-7:  [2,-7], [3,-7], [4,-7], [5,-7], [6,-7], [-2,-7], [-3,-7], [-4,-7], [-5,-7], [-6,-7]
```

## Piece Graphics System

### Shape System
- **Circles player**: All pieces use circular shapes
- **Squares player**: All pieces use square shapes (rotated 45° to form diamonds)

### Color Scheme
Each piece type has distinct colors for easy identification:

#### Gem Pieces
- **Ruby**: #E63960 (Red) - Fireball ability
- **Pearl**: #87CEEB (Light Blue) - Tidal Wave ability
- **Amber**: #F6C13F (Yellow/Orange) - Sap ability
- **Jade**: #A9E886 (Light Green) - Launch ability

#### Special Pieces
- **Amalgam**: Four-color quadrants
  - Red: #E63960
  - Green: #A9E886
  - Pale Yellow: #F8F6DA
  - Yellow/Orange: #F6C13F
- **Portal**: Light blue gradient
  - Outer: #87CEEB
  - Inner: #ADD8E6
- **Void**: Dark purple gradient
  - Outer: #5B4E7A
  - Inner: #8D7EA9

### Graphics Implementation

#### Basic Gem Pieces
```typescript
interface GemGraphics {
    shape: 'circle' | 'square';
    color: string;
    size: number;
}
```

#### Amalgam Pieces
```typescript
interface AmalgamGraphics {
    shape: 'circle' | 'square';
    colors: string[]; // 4 colors for quadrants
    size: number;
    rotation: number; // Faces toward origin
}
```

#### Portal/Void Pieces
```typescript
interface SpecialGraphics {
    shape: 'circle' | 'square';
    outerColor: string;
    innerColor: string;
    size: number;
}
```

## Implementation Files

### Core Files
- `core/board.ts` - Board creation and initial state
- `core/types.ts` - Type definitions including PieceGraphics
- `core/rules.ts` - Setup phase validation and move application

### Data Files
- `data/board-data.json` - Board configuration and starting areas
- `data/piece-definitions.json` - Complete piece definitions with graphics

### UI Files
- `ui/graphics.ts` - Piece rendering system
- `game/gameManager.ts` - Game flow and setup phase management

### Test Files
- `tests/setup-phase-test.html` - Comprehensive setup phase demonstration

## Game Flow

### 1. Game Initialization
```typescript
// Create board and initial state
const board = createBoard(boardData);
const gameState = createInitialState(board);
```

### 2. Setup Phase Loop
```typescript
// For each of 16 turns
for (let turn = 1; turn <= 16; turn++) {
    const currentPlayer = turn % 2 === 1 ? 'squares' : 'circles';
    
    // Get unplaced pieces for current player
    const unplacedPieces = getUnplacedPieces(currentPlayer);
    
    // Player places a piece
    const move = {
        type: 'place',
        pieceId: selectedPieceId,
        toCoords: selectedPosition,
        playerId: currentPlayer
    };
    
    // Validate and apply move
    const result = applyMove(gameState, move, pieceDefs);
}
```

### 3. Transition to Gameplay
```typescript
// After 16 turns, transition to gameplay
gameState.gamePhase = 'gameplay';
gameState.currentPlayer = 'squares'; // Squares goes first
```

## Testing

### Setup Phase Test
The `tests/setup-phase-test.html` file provides a comprehensive demonstration of:

- Pre-placed pieces with correct graphics
- Starting areas visualization
- Turn progression
- Piece placement validation
- Visual feedback for game state

### Running the Test
1. Open `tests/setup-phase-test.html` in a web browser
2. Observe the pre-placed pieces on the board
3. Use the controls to simulate turn progression
4. Verify piece graphics and positioning

## Key Features

### Visual Distinction
- **Player identification**: Circles vs Squares shapes
- **Piece type identification**: Distinct colors for each gem type
- **Special piece recognition**: Unique graphics for Amalgam, Portal, and Void

### Game Balance
- **Equal piece distribution**: Both players get identical piece sets
- **Strategic positioning**: Starting areas provide tactical options
- **Turn order advantage**: Squares player gets first gameplay move

### Extensibility
- **Modular graphics system**: Easy to add new piece types
- **Configurable starting areas**: Starting positions can be modified
- **Flexible piece definitions**: Piece properties stored in JSON

## Future Enhancements

### UI Improvements
- **Piece selection interface**: Visual piece picker during setup
- **Placement preview**: Show valid positions for selected piece
- **Turn indicators**: Clear visual feedback for current player

### Game Features
- **Setup phase undo**: Allow players to change piece placement
- **Setup phase save/load**: Save and restore setup configurations
- **AI setup assistance**: AI suggestions for optimal piece placement

### Graphics Enhancements
- **Piece animations**: Smooth placement and movement animations
- **Visual effects**: Glow effects, particle systems for special pieces
- **Accessibility**: High contrast mode, colorblind-friendly options
