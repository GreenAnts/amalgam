/**
 * AMALGAM GAME RULES - COMPLETE IMPLEMENTATION GUIDE
 * ==================================================
 *
 * This file serves as the comprehensive implementation guide for all Amalgam game mechanics.
 * Each function is thoroughly documented with implementation instructions for junior developers.
 *
 * CRITICAL CONCEPTS TO UNDERSTAND:
 * 1. The game has TWO phases: Setup (16 turns) and Gameplay (unlimited turns)
 * 2. There are 6 movement types: standard, nexus, portal_swap, portal_line, portal_standard, portal_phasing
 * 3. There are 4 abilities: Fireball, Tidal Wave, Sap, Launch (each with standard + amplified versions)
 * 4. Combat is automatic after movement with specific immunity rules
 * 5. Victory conditions: Objective (Void to enemy Amalgam) or Elimination (destroy all non-Portals)
 *
 * DEVELOPMENT WORKFLOW:
 * 1. Read the complete game rules documents thoroughly
 * 2. Implement each function following the detailed comments
 * 3. Use the comprehensive test suite to validate implementation
 * 4. Refer to existing partial implementations in core/rules.ts
 *
 * COORDINATE SYSTEM:
 * - Uses Vector2 format: [x, y] where [0, 0] is board center
 * - Board extends from [-12, -12] to [12, 12]
 * - Y increases upward (toward Circles), decreases downward (toward Squares)
 */
// =============================================================================
// SECTION 1: CORE VALIDATION FUNCTIONS
// =============================================================================
/**
 * MAIN MOVE VALIDATION FUNCTION
 * =============================
 *
 * This is the primary entry point for validating any move in the game.
 * It determines the move type and delegates to appropriate validation functions.
 *
 * IMPLEMENTATION STEPS:
 * 1. Validate basic move structure (required fields present)
 * 2. Check if it's the correct player's turn
 * 3. Determine move type and validate according to game phase
 * 4. For setup phase: validate piece placement
 * 5. For gameplay phase: validate movement type and rules
 * 6. Return comprehensive validation result
 *
 * @param state - Current game state
 * @param move - Move to validate
 * @param pieceDefs - Piece definitions for rule reference
 * @returns Validation result with detailed error messages
 */
export function isValidMove(state, move, pieceDefs) {
    // TODO: Implement comprehensive move validation
    // Step 1: Basic validation
    if (!move || !state) {
        return { ok: false, reason: 'Invalid move or game state' };
    }
    // Step 2: Check player turn
    if (move.playerId !== state.currentPlayer) {
        return { ok: false, reason: `Not ${move.playerId}'s turn` };
    }
    // Step 3: Phase-specific validation
    if (state.gamePhase === 'setup') {
        return validateSetupMove(state, move, pieceDefs);
    }
    else {
        return validateGameplayMove(state, move, pieceDefs);
    }
}
/**
 * SETUP PHASE MOVE VALIDATION
 * ===========================
 *
 * Validates piece placement during the 16-turn setup phase.
 *
 * SETUP PHASE RULES:
 * - 16 total turns (8 per player)
 * - Squares player goes first, then alternating
 * - Each player places exactly 2 of each gem type (Ruby, Pearl, Amber, Jade)
 * - Pieces must be placed in player's designated starting area
 * - Cannot place on occupied intersections
 * - Cannot place more than 2 of any gem type
 *
 * IMPLEMENTATION STEPS:
 * 1. Verify move type is 'place'
 * 2. Check if piece ID is valid and unplaced
 * 3. Validate target coordinates are in player's starting area
 * 4. Verify intersection is empty
 * 5. Check player hasn't exceeded piece type limits
 *
 * @param state - Current game state
 * @param move - Placement move to validate
 * @param pieceDefs - Piece definitions for starting areas
 * @returns Validation result
 */
function validateSetupMove(state, move, pieceDefs) {
    // TODO: Implement setup move validation
    // Reference: /data/game-rules/starting_positions.json
    return { ok: false, reason: 'Setup move validation not implemented' };
}
/**
 * GAMEPLAY PHASE MOVE VALIDATION
 * ==============================
 *
 * Validates movement during the main gameplay phase.
 *
 * GAMEPLAY TURN STRUCTURE:
 * 1. Movement (mandatory) - choose one movement type
 * 2. Attack (automatic) - moved piece attacks all valid adjacent enemies
 * 3. Ability (optional) - activate any abilities enabled by the movement
 *
 * IMPLEMENTATION STEPS:
 * 1. Validate piece exists and belongs to current player
 * 2. Determine movement type from move parameters
 * 3. Validate movement according to type-specific rules
 * 4. Check destination is valid and unoccupied
 * 5. Verify movement doesn't violate piece-specific restrictions
 *
 * @param state - Current game state
 * @param move - Movement move to validate
 * @param pieceDefs - Piece definitions for reference
 * @returns Validation result
 */
function validateGameplayMove(state, move, pieceDefs) {
    // TODO: Implement gameplay move validation
    return { ok: false, reason: 'Gameplay move validation not implemented' };
}
// =============================================================================
// SECTION 2: MOVEMENT TYPE VALIDATION FUNCTIONS
// =============================================================================
/**
 * STANDARD MOVEMENT VALIDATION
 * ============================
 *
 * Validates basic 8-directional adjacent movement.
 *
 * STANDARD MOVEMENT RULES:
 * - Move exactly 1 intersection in any 8-directional direction
 * - Available to all piece types
 * - For non-Portal pieces: destination can be any valid board intersection
 * - For Portal pieces: destination must be a golden line intersection
 *
 * VALID DIRECTIONS (from [x,y]):
 * - Horizontal: [x±1, y]
 * - Vertical: [x, y±1]
 * - Diagonal: [x±1, y±1]
 *
 * @param state - Current game state
 * @param move - Movement move with fromCoords and toCoords
 * @returns Validation result
 */
export function validateStandardMovement(state, move) {
    // TODO: Implement standard movement validation
    // Step 1: Verify fromCoords and toCoords are adjacent (distance = 1)
    // Step 2: Check destination is valid board intersection
    // Step 3: Verify destination is unoccupied
    // Step 4: For Portal pieces, verify destination is on golden line
    return { ok: false, reason: 'Standard movement validation not implemented' };
}
/**
 * NEXUS MOVEMENT VALIDATION
 * =========================
 *
 * Validates movement adjacent to Pearl + Amber formations.
 *
 * NEXUS MOVEMENT RULES:
 * - Requires a nexus formation: 2 adjacent pieces from {Pearl, Amber, Amalgam}
 * - Valid combinations: Pearl+Amber, Pearl+Amalgam, Amber+Amalgam
 * - Moving piece must be adjacent to any piece in the nexus
 * - Destination must be adjacent to any piece in the nexus
 * - Multiple destinations may be available (player chooses one)
 *
 * IMPLEMENTATION STEPS:
 * 1. Identify all nexus formations involving player's pieces
 * 2. Check if moving piece is adjacent to any nexus
 * 3. Verify destination is adjacent to the same nexus
 * 4. Ensure destination is valid and unoccupied
 *
 * @param state - Current game state
 * @param move - Nexus movement move
 * @returns Validation result
 */
export function validateNexusMovement(state, move) {
    // TODO: Implement nexus movement validation
    // Reference: Game rules section on nexus_movement
    return { ok: false, reason: 'Nexus movement validation not implemented' };
}
/**
 * PORTAL SWAP VALIDATION
 * ======================
 *
 * Validates position exchange between golden line pieces and Portals.
 *
 * PORTAL SWAP RULES:
 * - Initiating piece must be on a golden line intersection
 * - Initiating piece must belong to current player
 * - Target must be one of current player's Portal pieces
 * - Both pieces instantly exchange positions
 * - No movement restrictions on final positions
 *
 * IMPLEMENTATION STEPS:
 * 1. Verify initiating piece is on golden line intersection
 * 2. Confirm target piece is player's Portal
 * 3. Check both pieces belong to current player
 * 4. Validate the position exchange is possible
 *
 * @param state - Current game state
 * @param move - Portal swap move (should specify both pieces)
 * @returns Validation result
 */
export function validatePortalSwap(state, move) {
    // TODO: Implement portal swap validation
    // Reference: Game rules section on portal_swap
    return { ok: false, reason: 'Portal swap validation not implemented' };
}
/**
 * PORTAL LINE MOVEMENT VALIDATION
 * ===============================
 *
 * Validates Portal movement along golden line paths.
 *
 * PORTAL LINE MOVEMENT RULES:
 * - Only available to Portal pieces
 * - Must move along connected golden line paths
 * - Cannot move through occupied golden line intersections
 * - Destination must be an unoccupied golden line intersection
 * - Path must be clear (no pieces blocking the route)
 *
 * IMPLEMENTATION STEPS:
 * 1. Verify moving piece is a Portal
 * 2. Check both source and destination are on golden lines
 * 3. Find path between source and destination using golden line connections
 * 4. Verify path is clear of obstacles
 * 5. Confirm destination is unoccupied
 *
 * @param state - Current game state
 * @param move - Portal line movement move
 * @returns Validation result
 */
export function validatePortalLineMovement(state, move) {
    // TODO: Implement portal line movement validation
    // Reference: /data/game-rules/golden_lines.json for path connections
    return { ok: false, reason: 'Portal line movement validation not implemented' };
}
/**
 * PORTAL STANDARD MOVEMENT VALIDATION
 * ===================================
 *
 * Validates Portal pieces using standard adjacent movement.
 *
 * PORTAL STANDARD MOVEMENT RULES:
 * - Only available to Portal pieces
 * - Same as standard movement (1 intersection in 8 directions)
 * - CRITICAL RESTRICTION: destination must be golden line intersection
 * - Cannot land on regular board intersections
 *
 * IMPLEMENTATION STEPS:
 * 1. Verify moving piece is a Portal
 * 2. Check movement is exactly 1 intersection distance
 * 3. Verify destination is on golden line network
 * 4. Confirm destination is unoccupied
 *
 * @param state - Current game state
 * @param move - Portal standard movement move
 * @returns Validation result
 */
export function validatePortalStandardMovement(state, move) {
    // TODO: Implement portal standard movement validation
    return { ok: false, reason: 'Portal standard movement validation not implemented' };
}
/**
 * PORTAL PHASING VALIDATION
 * =========================
 *
 * Validates movement through other pieces in straight lines.
 *
 * PORTAL PHASING RULES:
 * - Non-Portal pieces: can phase through Portal pieces only
 * - Portal pieces: can phase through any piece type
 * - Must continue in exact same direction until reaching empty intersection
 * - Final destination must be unoccupied
 * - For Portal pieces: final destination must be golden line intersection
 *
 * IMPLEMENTATION STEPS:
 * 1. Determine direction vector from fromCoords to first obstruction
 * 2. Continue in same direction while encountering "phaseable" pieces
 * 3. Stop at first empty intersection or non-phaseable piece
 * 4. Verify final destination meets piece-specific requirements
 *
 * @param state - Current game state
 * @param move - Portal phasing movement move
 * @returns Validation result
 */
export function validatePortalPhasing(state, move) {
    // TODO: Implement portal phasing validation
    // Reference: Game rules section on portal_phasing
    return { ok: false, reason: 'Portal phasing validation not implemented' };
}
// =============================================================================
// SECTION 3: MOVE EXECUTION FUNCTIONS
// =============================================================================
/**
 * MAIN MOVE APPLICATION FUNCTION
 * ==============================
 *
 * Applies a validated move to the game state and returns the new state.
 *
 * MOVE APPLICATION SEQUENCE:
 * 1. Validate move (call isValidMove)
 * 2. Apply movement to board and pieces
 * 3. Execute automatic combat (Step 2 of turn)
 * 4. Detect available abilities (Step 3 preparation)
 * 5. Update turn counters and check for phase transitions
 * 6. Check victory conditions
 * 7. Return new state with all changes
 *
 * @param state - Current game state
 * @param move - Move to apply
 * @param pieceDefs - Piece definitions for reference
 * @returns Result with new state or error
 */
export function applyMove(state, move, pieceDefs) {
    // TODO: Implement move application
    // Step 1: Validate the move first
    const validation = isValidMove(state, move, pieceDefs);
    if (!validation.ok) {
        return validation;
    }
    // Step 2: Apply the movement
    // Step 3: Execute combat
    // Step 4: Detect abilities
    // Step 5: Update game state
    // Step 6: Check victory conditions
    return { ok: false, reason: 'Move application not implemented' };
}
/**
 * SETUP PHASE MOVE APPLICATION
 * ============================
 *
 * Applies piece placement during setup phase.
 *
 * SETUP APPLICATION STEPS:
 * 1. Place piece at target coordinates
 * 2. Update pieces collection in game state
 * 3. Increment setup turn counter
 * 4. Switch to next player (Squares → Circles → Squares...)
 * 5. Check if setup phase is complete (turn 16)
 * 6. If complete, transition to gameplay phase
 *
 * @param state - Current game state
 * @param move - Placement move
 * @param pieceDefs - Piece definitions
 * @returns Result with updated state
 */
function applySetupMove(state, move, pieceDefs) {
    // TODO: Implement setup move application
    return { ok: false, reason: 'Setup move application not implemented' };
}
/**
 * GAMEPLAY PHASE MOVE APPLICATION
 * ===============================
 *
 * Applies movement during gameplay phase with combat and abilities.
 *
 * GAMEPLAY APPLICATION STEPS:
 * 1. Apply movement (update piece positions)
 * 2. Execute automatic combat (moved piece attacks adjacent enemies)
 * 3. Remove destroyed pieces from game state
 * 4. Detect available ability formations
 * 5. Switch to next player
 * 6. Check victory conditions
 *
 * @param state - Current game state
 * @param move - Movement move
 * @param pieceDefs - Piece definitions
 * @returns Result with updated state and available abilities
 */
function applyGameplayMove(state, move, pieceDefs) {
    // TODO: Implement gameplay move application
    return { ok: false, reason: 'Gameplay move application not implemented' };
}
// =============================================================================
// SECTION 4: COMBAT SYSTEM FUNCTIONS
// =============================================================================
/**
 * MAIN COMBAT EXECUTION FUNCTION
 * ==============================
 *
 * Executes automatic combat after a piece moves (Step 2 of gameplay turn).
 *
 * COMBAT RULES:
 * - Moved piece attacks ALL valid adjacent opponents simultaneously
 * - No player choice in targeting - all valid targets are attacked
 * - Combat outcome: attacker survives, valid targets are destroyed
 * - Different piece types have different attack patterns and immunities
 *
 * IMPLEMENTATION STEPS:
 * 1. Identify the moved piece and its new position
 * 2. Get all adjacent intersections (8-directional)
 * 3. Find opponent pieces at adjacent positions
 * 4. Filter targets based on piece-specific combat rules
 * 5. Remove all valid targets from the game state
 * 6. Return list of destroyed pieces
 *
 * @param state - Game state after movement
 * @param movedPiece - The piece that just moved
 * @returns Array of destroyed piece IDs
 */
export function executeCombat(state, movedPiece) {
    // TODO: Implement combat execution
    // Step 1: Get adjacent positions
    // Step 2: Find enemy pieces at those positions
    // Step 3: Apply piece-specific combat rules
    // Step 4: Return destroyed piece IDs
    return [];
}
/**
 * STANDARD COMBAT EXECUTION
 * =========================
 *
 * Combat for Ruby, Pearl, Amber, Jade, and Amalgam pieces.
 *
 * STANDARD COMBAT RULES:
 * - Attack range: all 8-directional adjacent positions
 * - Valid targets: opponent pieces that are NOT Portal pieces
 * - Immune targets: opponent Portal pieces cannot be attacked
 * - Effect: all valid adjacent opponents destroyed
 *
 * @param state - Game state
 * @param attackingPiece - Standard piece that moved
 * @returns Array of destroyed piece IDs
 */
export function executeStandardCombat(state, attackingPiece) {
    // TODO: Implement standard combat
    return [];
}
/**
 * PORTAL COMBAT EXECUTION
 * =======================
 *
 * Combat for Portal pieces (unique targeting rules).
 *
 * PORTAL COMBAT RULES:
 * - Attack range: 8-directional adjacent + connected golden line intersections
 * - Valid targets: ONLY opponent Portal pieces
 * - Immune targets: all non-Portal opponent pieces
 * - Golden line attacks: can attack opponent Portals at distance via connections
 * - Effect: all valid Portal targets destroyed
 *
 * @param state - Game state
 * @param attackingPortal - Portal piece that moved
 * @returns Array of destroyed piece IDs
 */
export function executePortalCombat(state, attackingPortal) {
    // TODO: Implement portal combat
    // Reference: golden line connections for distance attacks
    return [];
}
/**
 * VOID COMBAT EXECUTION
 * =====================
 *
 * Combat for Void pieces (can attack everything).
 *
 * VOID COMBAT RULES:
 * - Attack range: all 8-directional adjacent positions
 * - Valid targets: ALL opponent pieces (including Portals)
 * - Immune targets: none - Void attacks everything
 * - Special property: only non-Portal piece that can destroy opponent Portals
 * - Effect: all adjacent opponents destroyed
 *
 * @param state - Game state
 * @param attackingVoid - Void piece that moved
 * @returns Array of destroyed piece IDs
 */
export function executeVoidCombat(state, attackingVoid) {
    // TODO: Implement void combat
    return [];
}
// =============================================================================
// SECTION 5: ABILITY SYSTEM FUNCTIONS
// =============================================================================
/**
 * FORMATION DETECTION FUNCTION
 * ============================
 *
 * Detects all valid ability formations after a movement.
 *
 * FORMATION DETECTION RULES:
 * - Only detect formations that involve the piece that just moved
 * - Each formation must meet specific piece type and positioning requirements
 * - Formations can be amplified if Void piece is positioned correctly
 * - Player can activate multiple formations in same turn if available
 *
 * FORMATION TYPES:
 * - Fireball: 2 Ruby/Amalgam pieces in straight line
 * - Tidal Wave: 2 Pearl/Amalgam pieces in straight line
 * - Sap: 2 Amber/Amalgam pieces in straight line (any distance apart)
 * - Launch: 2 Jade/Amalgam pieces in straight line + adjacent piece to launch
 *
 * @param state - Game state after movement
 * @param movedPiece - The piece that just moved
 * @returns Array of detected formations available for activation
 */
export function detectFormations(state, movedPiece) {
    // TODO: Implement formation detection
    return [];
}
/**
 * FIREBALL ABILITY EXECUTION
 * ==========================
 *
 * Executes Fireball ability from Ruby formations.
 *
 * FIREBALL RULES:
 * - Formation: 2 Ruby/Amalgam pieces adjacent in straight line
 * - Targeting: line attack extending from formation in chosen direction
 * - Standard: 6 intersections range, targets first non-Portal opponent
 * - Amplified: 9 intersections range, can target any opponent (including Portals)
 * - Effect: first valid target destroyed
 *
 * IMPLEMENTATION STEPS:
 * 1. Validate formation pieces and positioning
 * 2. Check for Void amplification
 * 3. Calculate firing direction options
 * 4. Trace line from formation in chosen direction
 * 5. Find first valid target within range
 * 6. Destroy target and return result
 *
 * @param state - Game state
 * @param formation - Fireball formation to execute
 * @param direction - Chosen firing direction
 * @returns Array of destroyed piece IDs
 */
export function executeFireball(state, formation, direction) {
    // TODO: Implement fireball execution
    return [];
}
/**
 * TIDAL WAVE ABILITY EXECUTION
 * ============================
 *
 * Executes Tidal Wave ability from Pearl formations.
 *
 * TIDAL WAVE RULES:
 * - Formation: 2 Pearl/Amalgam pieces adjacent in straight line
 * - Targeting: rectangular area extending from formation
 * - Standard: 4×5 rectangle, targets all non-Portal opponents in area
 * - Amplified: 5×7 rectangle, can target any opponents (including Portals)
 * - Effect: all valid targets in area destroyed simultaneously
 *
 * @param state - Game state
 * @param formation - Tidal Wave formation to execute
 * @param direction - Chosen firing direction
 * @returns Array of destroyed piece IDs
 */
export function executeTidalWave(state, formation, direction) {
    // TODO: Implement tidal wave execution
    return [];
}
/**
 * SAP ABILITY EXECUTION
 * =====================
 *
 * Executes Sap ability from Amber formations.
 *
 * SAP RULES:
 * - Formation: 2 Amber/Amalgam pieces in straight line (any distance apart)
 * - Targeting: line between the two formation pieces
 * - Standard: single line, targets all non-Portal opponents on line
 * - Amplified: 3 parallel lines, can target any opponents (including Portals)
 * - Effect: all valid targets on line(s) destroyed simultaneously
 *
 * @param state - Game state
 * @param formation - Sap formation to execute
 * @returns Array of destroyed piece IDs
 */
export function executeSap(state, formation) {
    // TODO: Implement sap execution
    return [];
}
/**
 * LAUNCH ABILITY EXECUTION
 * ========================
 *
 * Executes Launch ability from Jade formations.
 *
 * LAUNCH RULES:
 * - Formation: 2 Jade/Amalgam pieces adjacent + 1 piece to launch (extending line)
 * - Targeting: launched piece travels away from formation
 * - Standard: 4 intersections range from forward formation piece
 * - Amplified: 6 intersections range with Void amplification
 * - Effect: launched piece moves to destination, then executes combat and abilities
 *
 * LAUNCH SEQUENCE:
 * 1. Move launched piece to destination
 * 2. Launched piece executes Step 2 (combat) at new position
 * 3. Launched piece may execute Step 3 (abilities) at new position
 * 4. Original player's turn continues
 *
 * @param state - Game state
 * @param formation - Launch formation to execute
 * @param launchedPiece - Piece being launched
 * @param destination - Target landing position
 * @returns Array of destroyed piece IDs from launch and subsequent combat
 */
export function executeLaunch(state, formation, launchedPiece, destination) {
    // TODO: Implement launch execution
    return [];
}
// =============================================================================
// SECTION 6: VICTORY CONDITION FUNCTIONS
// =============================================================================
/**
 * VICTORY CONDITION CHECKER
 * =========================
 *
 * Checks all victory conditions after each move.
 *
 * VICTORY CONDITIONS:
 * 1. Objective Victory: player's Void reaches opponent's Amalgam starting position
 * 2. Elimination Victory: all opponent pieces destroyed except Portals
 * 3. Surrender: player voluntarily concedes
 * 4. Draw: mutual agreement or stalemate
 *
 * @param state - Current game state
 * @returns Victory result or null if game continues
 */
export function checkVictoryConditions(state) {
    // TODO: Implement victory condition checking
    // Check objective victory first, then elimination
    return null;
}
/**
 * OBJECTIVE VICTORY CHECKER
 * =========================
 *
 * Checks if a player has achieved objective victory.
 *
 * OBJECTIVE VICTORY RULES:
 * - Circles wins: C_Void reaches [0, -6] (S_Amalgam starting position)
 * - Squares wins: S_Void reaches [0, 6] (C_Amalgam starting position)
 * - Victory is immediate when Void reaches target intersection
 *
 * @param state - Current game state
 * @returns Objective victory result or null
 */
export function checkObjectiveVictory(state) {
    // TODO: Implement objective victory checking
    return null;
}
/**
 * ELIMINATION VICTORY CHECKER
 * ===========================
 *
 * Checks if a player has achieved elimination victory.
 *
 * ELIMINATION VICTORY RULES:
 * - Circles wins: all Squares pieces destroyed except S_Portal1 and S_Portal2
 * - Squares wins: all Circles pieces destroyed except C_Portal1 and C_Portal2
 * - Portal pieces do not count toward elimination but can be destroyed
 * - Victory occurs when only opponent Portals remain
 *
 * @param state - Current game state
 * @returns Elimination victory result or null
 */
export function checkEliminationVictory(state) {
    // TODO: Implement elimination victory checking
    return null;
}
// =============================================================================
// SECTION 7: UTILITY FUNCTIONS
// =============================================================================
/**
 * GET LEGAL MOVES FUNCTION
 * ========================
 *
 * Returns all legal moves for a player in the current state.
 * Used by AI players and UI for move validation.
 *
 * @param state - Current game state
 * @param playerId - Player to get moves for
 * @param pieceDefs - Piece definitions
 * @returns Array of all legal moves
 */
export function getLegalMoves(state, playerId, pieceDefs) {
    // TODO: Implement legal move generation
    return [];
}
/**
 * CHECK LEGAL MOVES EXISTENCE
 * ===========================
 *
 * Quickly checks if a player has any legal moves without generating the full list.
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @param pieceDefs - Piece definitions
 * @returns True if player has at least one legal move
 */
export function hasLegalMoves(state, playerId, pieceDefs) {
    // TODO: Implement legal move existence check
    return true;
}
/**
 * COORDINATE UTILITIES
 * ===================
 *
 * Helper functions for coordinate calculations and validations.
 */
/**
 * Check if two coordinates are 8-directionally adjacent
 */
export function areAdjacent(coords1, coords2) {
    const dx = Math.abs(coords1[0] - coords2[0]);
    const dy = Math.abs(coords1[1] - coords2[1]);
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
}
/**
 * Get all 8-directional adjacent coordinates
 */
export function getAdjacentCoords(coords) {
    const [x, y] = coords;
    return [
        [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
        [x - 1, y], [x + 1, y],
        [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]
    ];
}
/**
 * Check if coordinates form a straight line
 */
export function isStraightLine(coords) {
    if (coords.length < 2)
        return true;
    if (coords.length === 2)
        return true;
    const [first, second] = coords;
    const dx = second[0] - first[0];
    const dy = second[1] - first[1];
    for (let i = 2; i < coords.length; i++) {
        const expectedX = first[0] + (dx * (i - 1));
        const expectedY = first[1] + (dy * (i - 1));
        if (coords[i][0] !== expectedX || coords[i][1] !== expectedY) {
            return false;
        }
    }
    return true;
}
/**
 * Calculate Manhattan distance between coordinates
 */
export function manhattanDistance(coords1, coords2) {
    return Math.abs(coords1[0] - coords2[0]) + Math.abs(coords1[1] - coords2[1]);
}
/**
 * Calculate Euclidean distance between coordinates
 */
export function euclideanDistance(coords1, coords2) {
    const dx = coords1[0] - coords2[0];
    const dy = coords1[1] - coords2[1];
    return Math.sqrt(dx * dx + dy * dy);
}
// =============================================================================
// DEVELOPER NOTES AND IMPLEMENTATION PRIORITIES
// =============================================================================
/**
 * RECOMMENDED IMPLEMENTATION ORDER:
 * =================================
 *
 * 1. FOUNDATION (High Priority):
 *    - Basic coordinate utilities (already partially done)
 *    - Board state management functions
 *    - Game state validation
 *
 * 2. SETUP PHASE (High Priority):
 *    - Setup move validation and application
 *    - Starting area validation
 *    - Phase transition logic
 *
 * 3. BASIC MOVEMENT (High Priority):
 *    - Standard movement validation and application
 *    - Basic combat system (standard, portal, void)
 *    - Victory condition checking
 *
 * 4. ADVANCED MOVEMENT (Medium Priority):
 *    - Nexus movement
 *    - Portal swap
 *    - Portal line movement
 *    - Portal phasing
 *
 * 5. ABILITY SYSTEM (Medium Priority):
 *    - Formation detection
 *    - Fireball ability
 *    - Tidal Wave ability
 *    - Sap ability
 *    - Launch ability (most complex)
 *
 * 6. POLISH (Low Priority):
 *    - AI player improvements
 *    - Animation system
 *    - Advanced UI features
 *
 * TESTING APPROACH:
 * ================
 *
 * - Use the comprehensive test suite to validate each function
 * - Implement functions one at a time and run related tests
 * - Test edge cases and boundary conditions
 * - Verify integration between systems (movement + combat + abilities)
 *
 * DEBUGGING TIPS:
 * ==============
 *
 * - Use console.log extensively during development
 * - Test with simple scenarios before complex ones
 * - Refer to existing partial implementations in core/rules.ts
 * - Use the debug tools in the tests directory
 * - Validate against the complete game rules documents
 */
