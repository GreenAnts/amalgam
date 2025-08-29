// aiLogic.js - Handles AI player's turn actions
class AILogic {
    constructor(gameLogic, playerManager, drawBoard, gameMessageDisplay, updateUI) {
        this.gameLogic = gameLogic;
        this.playerManager = playerManager;
        this.drawBoard = drawBoard; // Function to redraw the board
        this.gameMessageDisplay = gameMessageDisplay; // UI element for messages
        this.updateUI = updateUI; // Function to update player/turn display
        this.aiThinkingTime = 1000; // milliseconds
    }

    async takeAITurn() {
        this.gameMessageDisplay.textContent = `${this.playerManager.getCurrentPlayer().name} is thinking...`;
        await new Promise(resolve => setTimeout(resolve, this.aiThinkingTime)); // Simulate thinking time

        const gameState = this.gameLogic.getGameState();
        const currentPlayer = this.playerManager.getCurrentPlayer();
        const aiPieces = Object.entries(gameState.pieces).filter(([, piece]) =>
            currentPlayer.pieceType.includes(piece.type)
        );

        let moveMade = false;

        // Simple AI: Iterate through its pieces and try to move them to the first valid golden coordinate
        for (const [pieceCoord, piece] of aiPieces) {
            // First, select the piece
            let result = this.gameLogic.handleClick(
                parseInt(pieceCoord.split(',')[0]),
                parseInt(pieceCoord.split(',')[1])
            );

            if (result.success) {
                // Now, find a valid move for the selected piece
                const potentialMoves = this.gameLogic.getValidMoves(pieceCoord);

                for (const moveCoord of potentialMoves) {
                    result = this.gameLogic.handleClick(
                        moveCoord.x,
                        moveCoord.y
                    );
                    if (result.success && result.moveMade) {
                        this.gameMessageDisplay.textContent = `${currentPlayer.name} moved ${piece.name} to (${moveCoord.x}, ${moveCoord.y}).`;
                        moveMade = true;
                        break; // Move made, break from finding moves for this piece
                    }
                }
            }
            if (moveMade) {
                break; // Move made, break from iterating through AI pieces
            }
        }

        if (!moveMade) {
            this.gameMessageDisplay.textContent = `${currentPlayer.name} couldn't find a move and skipped their turn.`;
            // If AI can't move, it implicitly passes its turn.
        }
        
        // After AI makes a move (or tries to), switch turn
        this.playerManager.switchTurn();
        this.updateUI(); // Update UI after AI's turn
        this.drawBoard(); // Redraw board to reflect AI's move
        
        // After AI's turn, prompt for human player's next action
        if (!this.playerManager.getCurrentPlayer().isAI) {
            this.gameMessageDisplay.textContent += ` It's ${this.playerManager.getCurrentPlayer().name}'s turn.`;
        }
    }
}
