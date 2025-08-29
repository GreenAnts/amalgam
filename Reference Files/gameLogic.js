// gameLogic.js - Game logic class
class GameLogic {
    constructor(playerManager, goldenCoords = [], goldenLinesDict = {}) {
        this.selectedPieceCoord = null;
        this.pieces = this.initializePieces();
        // Ensure goldenCoords stores strings like "x,y" for consistent lookups
        this.goldenCoords = goldenCoords.map(coord => typeof coord === 'object' ? `${coord.x},${coord.y}` : coord);
        this.goldenLinesDict = goldenLinesDict;
        this.playerManager = playerManager;
    }

    initializePieces() {
        const gridSize = 25;
        const normalPieceSize = gridSize * 0.45;
        const portalPieceSize = gridSize * 0.25;

        const amalgamColors = ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'];
        const voidOuterColor = '#5B4E7A';
        const voidInnerColor = '#8D7EA9';
        const portalOuterColor = '#87CEEB';
        const portalInnerColor = '#ADD8E6';

        return {
            '0,6': { name: 'Amalgam-Circle', type: 'amalgamCircle', colors: amalgamColors, size: normalPieceSize, rotation: Math.PI },
            '0,-6': { name: 'Amalgam-Square', type: 'amalgamSquare', colors: amalgamColors, size: normalPieceSize, rotation: Math.PI / 2 },
            '0,12': { name: 'Void-Circle', type: 'voidCircle', outerColor: voidOuterColor, innerColor: voidInnerColor, size: normalPieceSize },
            '0,-12': { name: 'Void-Square', type: 'voidSquare', outerColor: voidOuterColor, innerColor: voidInnerColor, size: normalPieceSize },
            '6,6': { name: 'Portal-C1', type: 'portalCircle', outerColor: portalOuterColor, innerColor: portalInnerColor, size: portalPieceSize },
            '6,-6': { name: 'Portal-S1', type: 'portalSquare', outerColor: portalOuterColor, innerColor: portalInnerColor, size: portalPieceSize },
            '-6,6': { name: 'Portal-C2', type: 'portalCircle', outerColor: portalOuterColor, innerColor: portalInnerColor, size: portalPieceSize },
            '-6,-6': { name: 'Portal-S2', type: 'portalSquare', outerColor: portalOuterColor, innerColor: portalInnerColor, size: portalPieceSize },
        };
    }

    // Helper to convert {x,y} to "x,y" string
    _coordToString(x, y) {
        return `${x},${y}`;
    }

    // Helper to convert "x,y" string to {x,y} object
    _stringToCoord(coordStr) {
        const [x, y] = coordStr.split(',').map(Number);
        return { x, y };
    }

    // Check if a coordinate string is a valid golden intersection (i.e., exists in our goldenCoords array)
    _isGoldenCoordinate(coordStr) {
        return this.goldenCoords.includes(coordStr);
    }

    // Check if two coordinates are adjacent (horizontal, vertical, or diagonal)
    isAdjacent(coord1Str, coord2Str) {
        const coord1 = this._stringToCoord(coord1Str);
        const coord2 = this._stringToCoord(coord2Str);

        const dx = Math.abs(coord1.x - coord2.x);
        const dy = Math.abs(coord1.y - coord2.y);

        return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
    }

    // Check if a move is valid based on golden lines
    _isValidMoveAlongGoldenLine(startCoordStr, endCoordStr) {
        const connections = this.goldenLinesDict[startCoordStr];
        if (!connections) {
            return false;
        }
        const endCoord = this._stringToCoord(endCoordStr);
        return connections.some(c => c.x === endCoord.x && c.y === endCoord.y);
    }

    // Check if a location is empty
    _isLocationEmpty(coordStr) {
        return !this.pieces[coordStr];
    }

    // Get all valid moves for a given piece at startCoordStr
    getValidMoves(startCoordStr) {
        const validMoves = [];
        const pieceType = this.pieces[startCoordStr]?.type;

        if (!pieceType) return validMoves;

        const startCoord = this._stringToCoord(startCoordStr);
        const candidateMoves = new Set();

        // All pieces can move to adjacent locations
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const targetX = startCoord.x + dx;
                const targetY = startCoord.y + dy;
                const targetCoordStr = this._coordToString(targetX, targetY);
                
                candidateMoves.add(targetCoordStr);
            }
        }

        // Only portal pieces have the additional ability to move along golden lines
        if (pieceType === 'portalCircle' || pieceType === 'portalSquare') {
            const connections = this.goldenLinesDict[startCoordStr];
            if (connections) {
                for (const conn of connections) {
                    const connStr = this._coordToString(conn.x, conn.y);
                    if (this._isGoldenCoordinate(connStr)) { // Ensure connected point is also a golden intersection
                        candidateMoves.add(connStr);
                    }
                }
            }
        }

        // Filter candidate moves based on game rules and emptiness
        for (const endCoordStr of Array.from(candidateMoves)) {
            if (!this._isLocationEmpty(endCoordStr)) {
                continue; // Cannot move to an occupied space
            }

            const isAdjacentMove = this.isAdjacent(startCoordStr, endCoordStr);
            
            // Non-portal pieces can move to ANY adjacent, empty space.
            if (pieceType !== 'portalCircle' && pieceType !== 'portalSquare') {
                if (isAdjacentMove) {
                    validMoves.push(this._stringToCoord(endCoordStr));
                }
            } else {
                // Portal pieces: can move along golden lines OR to adjacent golden intersections
                const isTargetGolden = this._isGoldenCoordinate(endCoordStr);
                const canPortalMoveByLine = this._isValidMoveAlongGoldenLine(startCoordStr, endCoordStr);
                if (canPortalMoveByLine || (isAdjacentMove && isTargetGolden)) {
                    validMoves.push(this._stringToCoord(endCoordStr));
                }
            }
        }
        return validMoves;
    }


    handleClick(gameX, gameY) {
        const clickedCoordStr = this._coordToString(gameX, gameY);
        const currentPlayer = this.playerManager.getCurrentPlayer();
        let message = '';
        let success = false;
        let moveMade = false;

        if (this.selectedPieceCoord) {
            // A piece is already selected
            if (clickedCoordStr === this.selectedPieceCoord) {
                this.selectedPieceCoord = null;
                return { success: true, message: 'Piece deselected.', moveMade: false };
            } else if (this.pieces[clickedCoordStr]) {
                const pieceToSelect = this.pieces[clickedCoordStr];
                if (!this.playerManager.canMovePiece(pieceToSelect.type)) {
                    return { success: false, message: `That's not ${currentPlayer.name}'s piece!`, moveMade: false };
                }
                this.selectedPieceCoord = clickedCoordStr;
                return { success: true, message: `Selected new piece: ${pieceToSelect.name}`, moveMade: false };
            } else if (!this._isLocationEmpty(clickedCoordStr)) {
                return { success: false, message: 'Cannot move to an occupied space.', moveMade: false };
            } else {
                // The target location is empty. Now check if the move is valid.
                const pieceToMove = this.pieces[this.selectedPieceCoord];
                const isPortalPiece = pieceToMove.type === 'portalCircle' || pieceToMove.type === 'portalSquare';
                const isAdjacentMove = this.isAdjacent(this.selectedPieceCoord, clickedCoordStr);

                let canMove = false;
                
                if (isPortalPiece) {
                    // Portal pieces: move along golden lines OR to adjacent golden intersections
                    const isTargetGolden = this._isGoldenCoordinate(clickedCoordStr); 
                    const canPortalMoveByLine = this._isValidMoveAlongGoldenLine(this.selectedPieceCoord, clickedCoordStr);
                    if (canPortalMoveByLine || (isAdjacentMove && isTargetGolden)) {
                        canMove = true;
                    } else {
                        message = 'Portal pieces can only move along golden lines or to adjacent golden intersections.';
                    }
                } else {
                    // Non-portal pieces can move to any adjacent, empty space.
                    if (isAdjacentMove) {
                        canMove = true;
                    } else {
                        message = 'Non-portal pieces can only move to adjacent intersections.';
                    }
                }

                if (canMove) {
                    if (!this.playerManager.canMovePiece(pieceToMove.type)) {
                        return { success: false, message: `It's ${currentPlayer.name}'s turn. They cannot move ${pieceToMove.name}.`, moveMade: false };
                    }

                    this.pieces[clickedCoordStr] = pieceToMove;
                    delete this.pieces[this.selectedPieceCoord];
                    this.selectedPieceCoord = null;
                    return { success: true, message: `Moved ${pieceToMove.name} to (${gameX}, ${gameY}).`, moveMade: true };
                } else {
                    return { success: false, message: message, moveMade: false };
                }
            }
        } else {
            // No piece is selected
            if (this.pieces[clickedCoordStr]) {
                const pieceToSelect = this.pieces[clickedCoordStr];
                if (!this.playerManager.canMovePiece(pieceToSelect.type)) {
                    return { success: false, message: `That's not ${currentPlayer.name}'s piece!`, moveMade: false };
                }
                this.selectedPieceCoord = clickedCoordStr;
                return { success: true, message: `Selected piece: ${pieceToSelect.name}`, moveMade: false };
            } else {
                return { success: false, message: 'Clicked on an invalid area.', moveMade: false };
            }
        }
    }

    resetGame() {
        this.pieces = this.initializePieces();
        this.selectedPieceCoord = null;
        this.playerManager.reset();
        return { success: true, message: 'Game reset to initial state.' };
    }

    getGameState() {
        return {
            pieces: { ...this.pieces },
            selectedPieceCoord: this.selectedPieceCoord,
            goldenCoords: this.goldenCoords, // Essential for AI
            goldenLinesDict: this.goldenLinesDict // Essential for AI
        };
    }
}

