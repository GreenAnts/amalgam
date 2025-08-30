/**
 * Game Statistics Module
 * Handles game performance metrics and analytics
 */
export class GameStatistics {
    constructor() {
        this.statistics = {
            gamesPlayed: 0,
            gamesWon: 0,
            movesRecorded: 0,
            averageGameTime: 0,
            totalGameTime: 0
        };
        this.currentGame = null;
        this.gameStartTime = null;
    }
    /**
     * Start a new game session
     * @param gameId - Unique identifier for the game
     * @param playerName - Name of the player
     * @returns Success status
     */
    startGame(gameId, playerName) {
        if (!gameId || !playerName || typeof gameId !== 'string' || typeof playerName !== 'string') {
            return false;
        }
        this.currentGame = {
            gameId,
            playerName,
            moves: [],
            startTime: Date.now()
        };
        this.gameStartTime = Date.now();
        return true;
    }
    /**
     * Record a move in the current game
     * @param moveType - Type of move made
     * @param moveTime - Time taken for the move (ms)
     * @returns Success status
     */
    recordMove(moveType, moveTime) {
        if (!this.currentGame || !moveType || typeof moveType !== 'string') {
            return false;
        }
        this.currentGame.moves.push({
            type: moveType,
            time: moveTime || (this.gameStartTime ? Date.now() - this.gameStartTime : 0),
            timestamp: Date.now()
        });
        this.statistics.movesRecorded++;
        return true;
    }
    /**
     * End the current game
     * @param result - Game result ('win', 'lose', 'draw')
     * @returns Game statistics or null if invalid
     */
    endGame(result) {
        if (!this.currentGame || !['win', 'lose', 'draw'].includes(result)) {
            return null;
        }
        const gameTime = Date.now() - this.currentGame.startTime;
        this.statistics.gamesPlayed++;
        this.statistics.totalGameTime += gameTime;
        if (result === 'win') {
            this.statistics.gamesWon++;
        }
        this.statistics.averageGameTime = this.statistics.totalGameTime / this.statistics.gamesPlayed;
        const gameStats = {
            gameId: this.currentGame.gameId,
            result,
            duration: gameTime,
            movesCount: this.currentGame.moves.length
        };
        this.currentGame = null;
        this.gameStartTime = null;
        return gameStats;
    }
    /**
     * Get current statistics
     * @returns Current statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }
    /**
     * Export statistics as JSON string
     * @returns JSON string of statistics
     */
    exportStatistics() {
        return JSON.stringify({ statistics: this.statistics }, null, 2);
    }
    /**
     * Import statistics from JSON string
     * @param jsonString - JSON string containing statistics
     * @returns Success status
     */
    importStatistics(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.statistics && typeof data.statistics === 'object') {
                this.statistics = { ...this.statistics, ...data.statistics };
                return true;
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Reset all statistics
     */
    resetStatistics() {
        this.statistics = {
            gamesPlayed: 0,
            gamesWon: 0,
            movesRecorded: 0,
            averageGameTime: 0,
            totalGameTime: 0
        };
        this.currentGame = null;
        this.gameStartTime = null;
    }
    /**
     * Get win rate percentage
     * @returns Win rate as percentage
     */
    getWinRate() {
        if (this.statistics.gamesPlayed === 0)
            return 0;
        return Math.round((this.statistics.gamesWon / this.statistics.gamesPlayed) * 100);
    }
}
