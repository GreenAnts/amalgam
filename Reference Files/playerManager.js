// playerManager.js - Manages player turns and piece ownership
class PlayerManager {
    constructor() {
        this.players = {
            'player1': { name: 'Player 1', pieceType: ['amalgamSquare', 'voidSquare', 'portalSquare'], isAI: false, turn: true }, // Player 1 (human) controls squares
            'player2': { name: 'Player 2 (AI)', pieceType: ['amalgamCircle', 'voidCircle', 'portalCircle'], isAI: true, turn: false }  // Player 2 (AI) controls circles
        };
        this.currentPlayerId = 'player1'; // Player 1 (human) starts
        this.turnCount = 1; // Initialize the turn counter
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerId];
    }

    switchTurn() {
        this.players[this.currentPlayerId].turn = false; // Set current player's turn to false
        if (this.currentPlayerId === 'player1') {
            this.currentPlayerId = 'player2';
        } else {
            this.currentPlayerId = 'player1';
            this.turnCount++; // Increment turn count when Player 2 (AI) finishes their turn and it switches back to Player 1
        }
        this.players[this.currentPlayerId].turn = true; // Set new current player's turn to true
        return this.getCurrentPlayer(); // Return the new current player
    }

    canMovePiece(pieceType) {
        const currentPlayer = this.getCurrentPlayer();
        return currentPlayer.pieceType.includes(pieceType);
    }
    
    getTurnCount() {
        return this.turnCount;
    }

    // This method is crucial for game reset
    reset() {
        this.currentPlayerId = 'player1';
        this.turnCount = 1;
        // Also ensure individual player 'turn' flags are reset
        this.players['player1'].turn = true;
        this.players['player2'].turn = false;
    }
}
