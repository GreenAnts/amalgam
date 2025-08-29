// Main Game Script
// Use a function to ensure code runs after the DOM is ready
window.onload = function() {
    // Get the canvas and context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const coordsDisplay = document.getElementById('selectedCoords');
    const gameMessageDisplay = document.getElementById('gameMessage');
    const resetButton = document.getElementById('resetButton');
    const currentPlayerDisplay = document.getElementById('currentPlayerDisplay'); // Get the element
    const turnCounterDisplay = document.getElementById('turnCounterDisplay'); // Get the new element

    // Define the size of the board and grid spacing
    const gridSize = 25; // Spacing between intersections
    let boardSize = Math.min(canvas.width, canvas.height);
    let originX = boardSize / 2;
    let originY = boardSize / 2;

    // Colors for the amalgam pieces, based on the user's images
    // Red, Green, Pale Yellow, Yellow/Orange
    const amalgamColors = ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'];
    
    // Define all the golden line connections from your provided GDScript
    const goldenLinesDict = {
        "-12,0": [{x: -11, y: 5}, {x: -11, y: -5}, {x: -8, y: 3}, {x: -8, y: -3}, {x: 12, y: 0}],
        "-11,5": [{x: -12, y: 0}, {x: -9, y: 8}],
        "-9,8": [{x: -11, y: 5}, {x: -8, y: 3}, {x: -6, y: 6}, {x: -8, y: 9}],
        "-8,9": [{x: -9, y: 8}, {x: -5, y: 11}, {x: -6, y: 6}],
        "-5,11": [{x: -8, y: 9}, {x: 0, y: 12}, {x: 0, y: 6}],
        "0,12": [{x: -5, y: 11}, {x: 5, y: 11}, {x: 0, y: -12}],
        "5,11": [{x: 0, y: 12}, {x: 8, y: 9}, {x: 0, y: 6}],
        "8,9": [{x: 5, y: 11}, {x: 9, y: 8}, {x: 6, y: 6}],
        "9,8": [{x: 11, y: 5}, {x: 8, y: 3}, {x: 6, y: 6}, {x: 8, y: 9}],
        "11,5": [{x: 12, y: 0}, {x: 9, y: 8}],
        "12,0": [{x: 11, y: 5}, {x: 11, y: -5}, {x: 8, y: 3}, {x: 8, y: -3}, {x: -12, y: 0}],
        "11,-5": [{x: 12, y: 0}, {x: 9, y: -8}],
        "9,-8": [{x: 11, y: -5}, {x: 8, y: -3}, {x: 6, y: -6}, {x: 8, y: -9}],
        "8,-9": [{x: 9, y: -8}, {x: 5, y: -11}, {x: 6, y: -6}],
        "5,-11": [{x: 8, y: -9}, {x: 0, y: -12}, {x: 0, y: -6}],
        "0,-12": [{x: 5, y: -11}, {x: -5, y: -11}, {x: 0, y: 12}],
        "-5,-11": [{x: 0, y: -12}, {x: -8, y: -9}],
        "-8,-9": [{x: -5, y: -11}, {x: -9, y: -8}, {x: -6, y: -6}],
        "-9,-8": [{x: -11, y: -5}, {x: -8, y: -3}, {x: -6, y: -6}, {x: -8, y: -9}],
        "-11,-5": [{x: -12, y: 0}, {x: -9, y: -8}],
        "6,6": [{x: 8, y: 9}, {x: 9, y: 8}, {x: 6, y: -6}, {x: -6, y: 6}, {x: 0, y: 0}],
        "6,-6": [{x: 8, y: -9}, {x: 9, y: -8}, {x: 6, y: 6}, {x: -6, y: -6}, {x: 0, y: 0}],
        "-6,-6": [{x: -8, y: -9}, {x: -9, y: -8}, {x: -6, y: 6}, {x: 6, y: -6}, {x: 0, y: 0}],
        "-6,6": [{x: -8, y: 9}, {x: -9, y: 8}, {x: -6, y: -6}, {x: 6, y: 6}, {x: 0, y: 0}],
        "6,0": [{x: 8, y: 3}, {x: 8, y: -3}, {x: 0, y: 6}, {x: 0, y: -6}],
        "-6,0": [{x: -8, y: 3}, {x: -8, y: -3}, {x: 0, y: 6}, {x: 0, y: -6}],
        "0,6": [{x: 6, y: 0}, {x: -6, y: 0}, {x: 5, y: 11}, {x: -5, y: 11}],
        "0,-6": [{x: 6, y: 0}, {x: -6, y: 0}, {x: 5, y: -11}, {x: -5, y: -11}],
        "0,0": [{x: 6, y: 6}, {x: -6, y: 6}, {x: -6, y: -6}, {x: 6, y: -6}, {x: 6, y: 0}, {x: -6, y: 0}, {x: 0, y: 6}, {x: 0, y: -6}],
        "-8,3": [{x: -6, y: 0}, {x: -12, y: 0}, {x: -9, y: 8}],
        "-8,-3": [{x: -6, y: 0}, {x: -12, y: 0}, {x: -9, y: -8}],
        "8,3": [{x: 6, y: 0}, {x: 12, y: 0}, {x: 9, y: 8}],
        "8,-3": [{x: 6, y: 0}, {x: 12, y: 0}, {x: 9, y: -8}],
    };

    // This array holds all coordinates that should be golden
    const goldenCoords = [
        "-12,0", "-11,5", "-9,8", "-8,9", "-5,11", "0,12", "5,11", "8,9", "9,8", "11,5", "12,0",
        "11,-5", "9,-8", "8,-9", "5,-11", "0,-12", "-5,-11", "-8,-9", "-9,-8", "-11,-5",
        "6,6", "6,-6", "-6,-6", "-6,6", "6,0", "-6,0", "0,6", "0,-6", "-8,3", "-8,-3", "8,3", "8,-3", "0,0",
        "0,6", "1,6", "2,6", "3,6", "4,6", "5,6",
        "0,-6", "1,-6", "2,-6", "3,-6", "4,-6", "5,-6",
        "-1,6", "-2,6", "-3,6", "-4,6", "-5,6",
        "-1,-6", "-2,-6", "-3,-6", "-4,-6", "-5,-6",
        "6,1", "6,2", "6,3", "6,4", "6,5",
        "6,-1", "6,-2", "6,-3", "6,-4", "6,-5",
        "-6,1", "-6,2", "-6,3", "-6,4", "-6,5",
        "-6,-1", "-6,-2", "-6,-3", "-6,-4", "-6,-5",
        "1,5", "2,4", "3,3", "4,2", "5,1",
        "-1,5", "-2,4", "-3,3", "-4,2", "-5,1",
        "1,-5", "2,-4", "3,-3", "4,-2", "5,-1",
        "-1,-5", "-2,-4", "-3,-3", "-4,-2", "-5,-1",
        "1,1", "2,2", "4,4", "5,5",
        "1,-1", "2,-2", "4,-4", "5,-5",
        "-1,1", "-2,2", "-4,4", "-5,5",
        "-1,-1", "-2,-2", "-4,-4", "-5,-5",
        "0,0", "1,0", "2,0", "3,0", "4,0", "5,0",
        "-1,0", "-2,0", "-3,0", "-4,0", "-5,0",
        "7,0", "8,0", "9,0", "10,0", "11,0",
        "-7,0", "-8,0", "-9,0", "-10,0", "-11,0",
        "0,1", "0,2", "0,3", "0,4", "0,5",
        "0,-1", "0,-2", "0,-3", "0,-4", "0,-5",
        "0,7", "0,8", "0,9", "0,10", "0,11",
        "0,-7", "0,-8", "0,-9", "0,-10", "0,-11",
        "1,7", "2,8", "3,9", "4,10",
        "-1,7", "-2,8", "-3,9", "-4,10",
        "1,-7", "2,-8", "3,-9", "4,-10",
        "-1,-7", "-2,-8", "-3,-9", "-4,-10",
    ];

    // This array holds all coordinates that are valid standard intersections
    const standardCoords = [
        "0,1", "0,2", "0,-1", "0,-2", "1,0", "-1,0", "2,0", "-2,0", "0,3", "0,-3", "3,0", "-3,0",
        "0,4", "0,-4", "4,0", "-4,0", "0,5", "0,-5", "5,0", "-5,0", "0,7", "0,-7", "7,0", "-7,0",
        "0,8", "0,-8", "8,0", "-8,0", "0,9", "0,-9", "9,0", "-9,0", "0,10", "0,-10", "10,0",
        "-10,0", "0,11", "0,-11", "11,0", "-11,0", "0,12", "0,-12", "12,0", "-12,0",
        "1,1", "1,2", "1,3", "1,4", "1,5", "1,6", "1,7", "1,8", "1,9", "1,10", "1,11",
        "2,1", "2,2", "2,3", "2,4", "2,5", "2,6", "2,7", "2,8", "2,9", "2,10", "2,11",
        "3,1", "3,2", "3,3", "3,4", "3,5", "3,6", "3,7", "3,8", "3,9", "3,10", "3,11",
        "4,1", "4,2", "4,3", "4,4", "4,5", "4,6", "4,7", "4,8", "4,9", "4,10", "4,11",
        "5,1", "5,2", "5,3", "5,4", "5,5", "5,6", "5,7", "5,8", "5,9", "5,10", "5,11",
        "6,1", "6,2", "6,3", "6,4", "6,5", "6,6", "6,7", "6,8", "6,9", "6,10",
        "7,1", "7,2", "7,3", "7,4", "7,5", "7,6", "7,7", "7,8", "7,9",
        "8,1", "8,2", "8,3", "8,4", "8,5", "8,6", "8,7", "8,8", "8,9",
        "9,1", "9,2", "9,3", "9,4", "9,5", "9,6", "9,7", "9,8",
        "10,1", "10,2", "10,3", "10,4", "10,5", "10,6",
        "11,1", "11,2", "11,3", "11,4", "11,5",
        "-1,1", "-1,2", "-1,3", "-1,4", "-1,5", "-1,6", "-1,7", "-1,8", "-1,9", "-1,10", "-1,11",
        "-2,1", "-2,2", "-2,3", "-2,4", "-2,5", "-2,6", "-2,7", "-2,8", "-2,9", "-2,10", "-2,11",
        "-3,1", "-3,2", "-3,3", "-3,4", "-3,5", "-3,6", "-3,7", "-3,8", "-3,9", "-3,10", "-3,11",
        "-4,1", "-4,2", "-4,3", "-4,4", "-4,5", "-4,6", "-4,7", "-4,8", "-4,9", "-4,10", "-4,11",
        "-5,1", "-5,2", "-5,3", "-5,4", "-5,5", "-5,6", "-5,7", "-5,8", "-5,9", "-5,10", "-5,11",
        "-6,1", "-6,2", "-6,3", "-6,4", "-6,5", "-6,6", "-6,7", "-6,8", "-6,9", "-6,10",
        "-7,1", "-7,2", "-7,3", "-7,4", "-7,5", "-7,6", "-7,7", "-7,8", "-7,9",
        "-8,1", "-8,2", "-8,3", "-8,4", "-8,5", "-8,6", "-8,7", "-8,8", "-8,9",
        "-9,1", "-9,2", "-9,3", "-9,4", "-9,5", "-9,6", "-9,7", "-9,8",
        "-10,1", "-10,2", "-10,3", "-10,4", "-10,5", "-10,6",
        "-11,1", "-11,2", "-11,3", "-11,4", "-11,5",
        "1,-1", "1,-2", "1,-3", "1,-4", "1,-5", "1,-6", "1,-7", "1,-8", "1,-9", "1,-10", "1,-11",
        "2,-1", "2,-2", "2,-3", "2,-4", "2,-5", "2,-6", "2,-7", "2,-8", "2,-9", "2,-10", "2,-11",
        "3,-1", "3,-2", "3,-3", "3,-4", "3,-5", "3,-6", "3,-7", "3,-8", "3,-9", "3,-10", "3,-11",
        "4,-1", "4,-2", "4,-3", "4,-4", "4,-5", "4,-6", "4,-7", "4,-8", "4,-9", "4,-10", "4,-11",
        "5,-1", "5,-2", "5,-3", "5,-4", "5,-5", "5,-6", "5,-7", "5,-8", "5,-9", "5,-10", "5,-11",
        "6,-1", "6,-2", "6,-3", "6,-4", "6,-5", "6,-6", "6,-7", "6,-8", "6,-9", "6,-10",
        "7,-1", "7,-2", "7,-3", "7,-4", "7,-5", "7,-6", "7,-7", "7,-8", "7,-9",
        "8,-1", "8,-2", "8,-3", "8,-4", "8,-5", "8,-6", "8,-7", "8,-8", "8,-9",
        "9,-1", "9,-2", "9,-3", "9,-4", "9,-5", "9,-6", "9,-7", "9,-8",
        "10,-1", "10,-2", "10,-3", "10,-4", "10,-5", "10,-6",
        "11,-1", "11,-2", "11,-3", "11,-4", "11,-5",
        "-1,-1", "-1,-2", "-1,-3", "-1,-4", "-1,-5", "-1,-6", "-1,-7", "-1,-8", "-1,-9", "-1,-10", "-1,-11",
        "-2,-1", "-2,-2", "-2,-3", "-2,-4", "-2,-5", "-2,-6", "-2,-7", "-2,-8", "-2,-9", "-2,-10", "-2,-11",
        "-3,-1", "-3,-2", "-3,-3", "-3,-4", "-3,-5", "-3,-6", "-3,-7", "-3,-8", "-3,-9", "-3,-10", "-3,-11",
        "-4,-1", "-4,-2", "-4,-3", "-4,-4", "-4,-5", "-4,-6", "-4,-7", "-4,-8", "-4,-9", "-4,-10", "-4,-11",
        "-5,-1", "-5,-2", "-5,-3", "-5,-4", "-5,-5", "-5,-6", "-5,-7", "-5,-8", "-5,-9", "-5,-10", "-5,-11",
        "-6,-1", "-6,-2", "-6,-3", "-6,-4", "-6,-5", "-6,-6", "-6,-7", "-6,-8", "-6,-9", "-6,-10",
        "-7,-1", "-7,-2", "-7,-3", "-7,-4", "-7,-5", "-7,-6", "-7,-7", "-7,-8", "-7,-9",
        "-8,-1", "-8,-2", "-8,-3", "-8,-4", "-8,-5", "-8,-6", "-8,-7", "-8,-8", "-8,-9",
        "-9,-1", "-9,-2", "-9,-3", "-9,-4", "-9,-5", "-9,-6", "-9,-7", "-9,-8",
        "-10,-1", "-10,-2", "-10,-3", "-10,-4", "-10,-5", "-10,-6",
        "-11,-1", "-11,-2", "-11,-3", "-11,-4", "-11,-5",
    ];

    const boardDict = {};
    goldenCoords.forEach(coord => {
        boardDict[coord] = "golden";
    });
    standardCoords.forEach(coord => {
        if (!boardDict[coord]) {
            boardDict[coord] = "standard";
        }
    });

    // Create a Set of all golden line connections for fast lookup
    const goldenConnections = new Set();
    for (const coordStr in goldenLinesDict) {
        const connections = goldenLinesDict[coordStr];
        const parts = coordStr.split(',').map(Number);
        const x1 = parts[0];
        const y1 = parts[1];
        if (Array.isArray(connections)) {
            connections.forEach(target => {
                const x2 = target.x;
                const y2 = target.y;
                // Create a canonical key for the connection to handle both directions
                const key = `${Math.min(x1, x2)},${Math.min(y1, y2)}-${Math.max(x1, x2)},${Math.max(y1, y2)}`;
                goldenConnections.add(key);
            });
        }
    }

    // Initialize game logic AFTER goldenCoords is defined
    const playerManager = new PlayerManager(); // Initialize PlayerManager
    const gameLogic = new GameLogic(playerManager, goldenCoords, goldenLinesDict); // Pass playerManager to GameLogic

    // Function to update UI elements (player turn and turn count)
    function updateUI() {
        currentPlayerDisplay.textContent = playerManager.getCurrentPlayer().name;
        turnCounterDisplay.textContent = playerManager.getTurnCount();
    }

    // Initialize AI Logic
    const aiLogic = new AILogic(gameLogic, playerManager, drawBoard, gameMessageDisplay, updateUI);

    // Define a utility function to darken a hex color
    function darkenColor(hex, percent) {
        hex = hex.replace(/^#/, '');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);
        r = r.toString(16).padStart(2, '0');
        g = g.toString(16).padStart(2, '0');
        b = b.toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    // Function to draw the Amalgam Circle piece with rotation
    function drawAmalgamCircle(x, y, size, colors, rotation) {
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;
        const radius = size;
        const outerRadius = radius * 1.2;
        
        // Darken the colors for the outer ring
        const outerColors = colors.map(c => darkenColor(c, 20));

        ctx.save();
        ctx.translate(centerPixelX, centerPixelY);
        // Use the pre-calculated rotation angle
        ctx.rotate(rotation);

        // Define the quadrants of the piece. Red is defined as the "top" quadrant (PI/4 to 3PI/4).
        // This quadrant will be rotated to face the origin (0,0) by the rotation angle.
        const angles = [
            { start: -Math.PI / 4, end: Math.PI / 4, color: colors[2] }, // Right (Pale Yellow)
            { start: Math.PI / 4, end: 3 * Math.PI / 4, color: colors[0] }, // Top (Red)
            { start: 3 * Math.PI / 4, end: 5 * Math.PI / 4, color: colors[1] }, // Left (Green)
            { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4, color: colors[3] }  // Bottom (Yellow/Orange)
        ];

        // Draw the four quadrants of the outer ring
        angles.forEach((quadrant) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, outerRadius, quadrant.start, quadrant.end);
            ctx.lineTo(0, 0);
            ctx.fillStyle = darkenColor(quadrant.color, 20);
            ctx.fill();
            ctx.closePath();
        });

        // Draw the four quadrants of the inner circle
        angles.forEach((quadrant) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, quadrant.start, quadrant.end);
            ctx.lineTo(0, 0);
            ctx.fillStyle = quadrant.color;
            ctx.fill();
            ctx.closePath();
        });
        
        ctx.restore();
    }

    // Function to draw the Amalgam Square piece (rotated dynamically)
    function drawAmalgamSquare(x, y, size, colors, rotation) {
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;
        
        const outerColors = colors.map(c => darkenColor(c, 20));

        // Size of the outer and inner squares
        const outerSize = size * 2.1;
        const innerSize = size * 1.5;

        ctx.save();
        ctx.translate(centerPixelX, centerPixelY);

        // The square is a diamond (rotated 45 degrees), so we add this to the orientation angle
        ctx.rotate(rotation + (45 * Math.PI / 180));

        // Draw the four quadrants of the outer diamond (a rotated square)
        const halfOuter = outerSize / 2;
        const outerRects = [
            { x: -halfOuter, y: 0, w: halfOuter, h: halfOuter, color: outerColors[0] }, // Red
            { x: 0, y: 0, w: halfOuter, h: halfOuter, color: outerColors[2] }, // Pale Yellow
            { x: 0, y: -halfOuter, w: halfOuter, h: halfOuter, color: outerColors[3] }, // Yellow/Orange
            { x: -halfOuter, y: -halfOuter, w: halfOuter, h: halfOuter, color: outerColors[1] } // Green
        ];

        outerRects.forEach(rect => {
            ctx.fillStyle = rect.color;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        });

        // Draw the four inner squares, forming the inner diamond
        const halfInner = innerSize / 2;
        const innerRects = [
            { x: -halfInner, y: 0, w: halfInner, h: halfInner, color: colors[0] }, // Red
            { x: 0, y: 0, w: halfInner, h: halfInner, color: colors[2] }, // Pale Yellow
            { x: 0, y: -halfInner, w: halfInner, h: halfInner, color: colors[3] }, // Yellow/Orange
            { x: -halfInner, y: -halfInner, w: halfInner, h: halfInner, color: colors[1] } // Green
        ];
        
        innerRects.forEach(rect => {
            ctx.fillStyle = rect.color;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        });

        ctx.restore();
    }

    // Function to draw the Void Circle piece
    function drawVoidCircle(x, y, size, outerColor, innerColor) {
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;
        const radius = size;
        
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, radius * 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = outerColor;
        ctx.fill();
        ctx.closePath();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = innerColor;
        ctx.fill();
        ctx.closePath();
    }

    // Function to draw the Void Square piece (unrotated)
    function drawVoidSquare(x, y, size, outerColor, innerColor) {
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;

        ctx.save();
        ctx.translate(centerPixelX, centerPixelY);
        ctx.rotate(45 * Math.PI / 180);

        // Outer square dimensions
        const outerSize = size * 2.1;
        const halfOuter = outerSize / 2;

        // Inner square dimensions
        const innerSize = size * 1.5;
        const halfInner = innerSize / 2;

        // Draw outer diamond (rotated square)
        ctx.fillStyle = outerColor;
        ctx.fillRect(-halfOuter, -halfOuter, outerSize, outerSize);

        // Draw inner diamond (rotated square)
        ctx.fillStyle = innerColor;
        ctx.fillRect(-halfInner, -halfInner, innerSize, innerSize);

        ctx.restore();
    }

    // Function to draw the Portal Circle piece
    function drawPortalCircle(x, y, size, outerColor, innerColor) {
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;
        const radius = size;

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, radius * 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = outerColor;
        ctx.fill();
        ctx.closePath();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = innerColor;
        ctx.fill();
        ctx.closePath();
    }

    // Function to draw the Portal Square piece (unrotated)
    function drawPortalSquare(x, y, size, outerColor, innerColor) {
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;

        ctx.save();
        ctx.translate(centerPixelX, centerPixelY);
        ctx.rotate(45 * Math.PI / 180);
        
        // Outer square dimensions
        const outerSize = size * 2.1;
        const halfOuter = outerSize / 2;

        // Inner square dimensions
        const innerSize = size * 1.5;
        const halfInner = innerSize / 2; // Corrected typo here

        // Draw outer diamond (rotated square)
        ctx.fillStyle = outerColor;
        ctx.fillRect(-halfOuter, -halfOuter, outerSize, outerSize);

        // Draw inner diamond (rotated square)
        ctx.fillStyle = innerColor;
        ctx.fillRect(-halfInner, -halfInner, innerSize, innerSize);

        ctx.restore();
    }

    function drawSelectedPieceHighlight(selectedPieceCoord, pieces) {
        if (!selectedPieceCoord) return;

        const piece = pieces[selectedPieceCoord];
        if (!piece) return;

        const [x, y] = selectedPieceCoord.split(',').map(Number);
        const centerPixelX = originX + x * gridSize;
        const centerPixelY = originY - y * gridSize;

        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, piece.size * 1.5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffff00'; // Yellow highlight color
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.closePath();
    }

    function drawPieces(pieces, selectedPieceCoord) {
        for (const coordStr in pieces) {
            const piece = pieces[coordStr];
            const [x, y] = coordStr.split(',').map(Number);

            switch (piece.type) {
                case 'amalgamCircle':
                    drawAmalgamCircle(x, y, piece.size, piece.colors, piece.rotation);
                    break;
                case 'amalgamSquare':
                    drawAmalgamSquare(x, y, piece.size, piece.colors, piece.rotation);
                    break;
                case 'voidCircle':
                    drawVoidCircle(x, y, piece.size, piece.outerColor, piece.innerColor);
                    break;
                case 'voidSquare':
                    drawVoidSquare(x, y, piece.size, piece.outerColor, piece.innerColor);
                    break;
                case 'portalCircle':
                    drawPortalCircle(x, y, piece.size, piece.outerColor, piece.innerColor);
                    break;
                case 'portalSquare':
                    drawPortalSquare(x, y, piece.size, piece.outerColor, piece.innerColor);
                    break;
            }
        }
        
        // Draw the highlight for the selected piece last so it's on top
        drawSelectedPieceHighlight(selectedPieceCoord, pieces);
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const standardColor = '#000000'; // Now black
        const goldenColor = '#FFD700';
        const goldenLineColor = '#FFD700';
        const goldenLineWidth = 2;
        const blackLineColor = '#000000';
        const blackLineWidth = 1.5;
        const polygonFillColor1 = '#343434';
        const polygonFillColor2 = '#5A5A5A';
        const polygonFillColor3 = '#7D7D7D';

        // Define the first set of polygons
        const polygonsToDraw1 = [
            [{x: 0, y: 12}, {x: 5, y: 11}, {x: 8, y: 9}, {x: 6, y: 6}, {x: 0, y: 6}],
            [{x: 0, y: 12}, {x: -5, y: 11}, {x: -8, y: 9}, {x: -6, y: 6}, {x: 0, y: 6}],
            [{x: 0, y: -12}, {x: -5, y: -11}, {x: -8, y: -9}, {x: -6, y: -6}, {x: 0, y: -6}],
            [{x: 0, y: -12}, {x: 5, y: -11}, {x: 8, y: -9}, {x: 6, y: -6}, {x: 0, y: -6}]
        ];

        // Define the second set of polygons
        const polygonsToDraw2 = [
            [{x: 0, y: 6}, {x: 6, y: 6}, {x: 6, y: 0}],
            [{x: 0, y: 6}, {x: -6, y: 6}, {x: -6, y: 0}],
            [{x: 0, y: -6}, {x: -6, y: -6}, {x: -6, y: 0}],
            [{x: 0, y: -6}, {x: 6, y: -6}, {x: 6, y: 0}],
            [{x: 12, y: 0}, {x: 11, y: 5}, {x: 9, y: 8}, {x: 8, y: 3}],
            [{x: -12, y: 0}, {x: -11, y: 5}, {x: -9, y: 8}, {x: -8, y: 3}],
            [{x: -12, y: 0}, {x: -11, y: -5}, {x: -9, y: -8}, {x: -8, y: -3}],
            [{x: 12, y: 0}, {x: 11, y: -5}, {x: 9, y: -8}, {x: 8, y: -3}],
            // New polygon shapes (triangles)
            [{x: 6, y: 6}, {x: 8, y: 9}, {x: 9, y: 8}],
            [{x: -6, y: 6}, {x: -8, y: 9}, {x: -9, y: 8}],
            [{x: -6, y: -6}, {x: -8, y: -9}, {x: -9, y: -8}],
            [{x: 6, y: -6}, {x: 8, y: -9}, {x: 9, y: -8}]
        ];

        // Define the new set of polygons
        const polygonsToDraw3 = [
            // Triangle from 0,0 to 6,0 to 0,6
            [{x: 0, y: 0}, {x: 6, y: 0}, {x: 0, y: 6}],
            [{x: 0, y: 0}, {x: -6, y: 0}, {x: 0, y: 6}],
            [{x: 0, y: 0}, {x: -6, y: 0}, {x: 0, y: -6}],
            [{x: 0, y: 0}, {x: 6, y: 0}, {x: 0, y: -6}],
            // Complex shape from 6,0 to 6,6 to 9,8 to 8,3 to 12,0
            [{x: 6, y: 0}, {x: 6, y: 6}, {x: 9, y: 8}, {x: 8, y: 3}, {x: 12, y: 0}],
            [{x: -6, y: 0}, {x: -6, y: 6}, {x: -9, y: 8}, {x: -8, y: 3}, {x: -12, y: 0}],
            [{x: -6, y: 0}, {x: -6, y: -6}, {x: -9, y: -8}, {x: -8, y: -3}, {x: -12, y: 0}],
            [{x: 6, y: 0}, {x: 6, y: -6}, {x: 9, y: -8}, {x: 8, y: -3}, {x: 12, y: 0}]
        ];

        // Draw all filled polygons in order
        ctx.fillStyle = polygonFillColor1;
        polygonsToDraw1.forEach(polygonPoints => {
            if (polygonPoints.length > 0) {
                ctx.beginPath();
                ctx.moveTo(originX + polygonPoints[0].x * gridSize, originY - polygonPoints[0].y * gridSize);
                for (let i = 1; i < polygonPoints.length; i++) {
                    ctx.lineTo(originX + polygonPoints[i].x * gridSize, originY - polygonPoints[i].y * gridSize);
                }
                ctx.closePath();
                ctx.fill();
            }
        });

        ctx.fillStyle = polygonFillColor2;
        polygonsToDraw2.forEach(polygonPoints => {
            if (polygonPoints.length > 0) {
                ctx.beginPath();
                ctx.moveTo(originX + polygonPoints[0].x * gridSize, originY - polygonPoints[0].y * gridSize);
                for (let i = 1; i < polygonPoints.length; i++) {
                    ctx.lineTo(originX + polygonPoints[i].x * gridSize, originY - polygonPoints[i].y * gridSize);
                }
                ctx.closePath();
                ctx.fill();
            }
        });

        ctx.fillStyle = polygonFillColor3;
        polygonsToDraw3.forEach(polygonPoints => {
            if (polygonPoints.length > 0) {
                ctx.beginPath();
                ctx.moveTo(originX + polygonPoints[0].x * gridSize, originY - polygonPoints[0].y * gridSize);
                for (let i = 1; i < polygonPoints.length; i++) {
                    ctx.lineTo(originX + polygonPoints[i].x * gridSize, originY - polygonPoints[i].y * gridSize);
                }
                ctx.closePath();
                ctx.fill();
            }
        });

        // Draw black lines first, behind golden lines
        ctx.strokeStyle = blackLineColor;
        ctx.lineWidth = blackLineWidth;
        ctx.lineCap = 'round';
        for (const coordStr in boardDict) {
            const [x, y] = coordStr.split(',').map(Number);
            const startX = originX + x * gridSize;
            const startY = originY - y * gridSize;

            // Check horizontal neighbor
            const neighborHStr = `${x + 1},${y}`;
            if (boardDict[neighborHStr] !== undefined) {
                const key = `${Math.min(x, x + 1)},${Math.min(y, y)}-${Math.max(x, x + 1)},${Math.max(y, y)}`;
                if (!goldenConnections.has(key)) {
                    const endX = originX + (x + 1) * gridSize;
                    const endY = originY - y * gridSize;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    ctx.closePath();
                }
            }

            // Check vertical neighbor
            const neighborVStr = `${x},${y + 1}`;
            if (boardDict[neighborVStr] !== undefined) {
                const key = `${Math.min(x, x)},${Math.min(y, y + 1)}-${Math.max(x, x)},${Math.max(y, y + 1)}`;
                if (!goldenConnections.has(key)) {
                    const endX = originX + x * gridSize;
                    const endY = originY - (y + 1) * gridSize;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    ctx.closePath();
                }
            }
        }

        // Then, draw the golden lines on top
        ctx.strokeStyle = goldenLineColor;
        ctx.lineWidth = goldenLineWidth;
        ctx.lineCap = 'round';
        for (const coordStr in goldenLinesDict) {
            const connections = goldenLinesDict[coordStr];
            const parts = coordStr.split(',').map(Number);
            const startX = originX + parts[0] * gridSize;
            const startY = originY - parts[1] * gridSize;
            if (Array.isArray(connections)) {
                connections.forEach(target => {
                    const endX = originX + target.x * gridSize;
                    const endY = originY - target.y * gridSize;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    ctx.closePath();
                });
            }
        }

        // Finally, draw the intersections on top of the lines
        const goldenRadius = 4;
        const diamondSize = 3;
        for (const coordStr in boardDict) {
            const intersectionType = boardDict[coordStr];
            const parts = coordStr.split(',').map(Number);
            const x = parts[0];
            const y = parts[1];
            const pixelX = originX + x * gridSize;
            const pixelY = originY - y * gridSize;

            ctx.fillStyle = intersectionType === "golden" ? goldenColor : standardColor;
            ctx.beginPath();
            if (intersectionType === "golden") {
                ctx.arc(pixelX, pixelY, goldenRadius, 0, 2 * Math.PI);
            } else { // Standard intersections are now diamonds
                ctx.moveTo(pixelX, pixelY - diamondSize); // Top point
                ctx.lineTo(pixelX + diamondSize, pixelY); // Right point
                ctx.lineTo(pixelX, pixelY + diamondSize); // Bottom point
                ctx.lineTo(pixelX - diamondSize, pixelY); // Left point
                ctx.closePath();
            }
            ctx.fill();
            ctx.closePath();
        }

        // Get current game state and draw the pieces
        const gameState = gameLogic.getGameState();
        drawPieces(gameState.pieces, gameState.selectedPieceCoord);
    }

    async function handleCanvasClick(event) { // Make this function async
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        const gameX = Math.round((mouseX - originX) / gridSize);
        const gameY = Math.round((originY - mouseY) / gridSize);

        const currentPlayer = playerManager.getCurrentPlayer();
        if (currentPlayer.isAI) {
            // If it's AI's turn, human clicks should be ignored.
            gameMessageDisplay.textContent = "It's the AI's turn!";
            return;
        }

        // Handle the click through the game logic
        const result = gameLogic.handleClick(gameX, gameY, boardDict);
        
        // Update the UI based on the result
        gameMessageDisplay.textContent = result.message;
        
        // Update selected coordinates display
        const gameState = gameLogic.getGameState();
        if (gameState.selectedPieceCoord) {
            const selectedPiece = gameState.pieces[gameState.selectedPieceCoord];
            coordsDisplay.textContent = `${gameState.selectedPieceCoord} (${selectedPiece.name})`;
        } else {
            coordsDisplay.textContent = 'None';
        }
        
        // Update current player display and turn count immediately after human's action
        updateUI();
        
        // Redraw the board to reflect the changes
        drawBoard();

        // If a move was successfully made by the human, switch turn and let AI play
        if (result.moveMade) {
            playerManager.switchTurn();
            updateUI(); // Update UI for AI's turn
            // If the next player is AI, trigger AI's turn
            if (playerManager.getCurrentPlayer().isAI) {
                await aiLogic.takeAITurn(); // Await AI's turn
            }
        }
    }

    async function handleResetClick() { // Make this function async
        const result = gameLogic.resetGame();
        gameMessageDisplay.textContent = result.message;
        coordsDisplay.textContent = 'None';
        updateUI(); // Reset current player and turn count display
        drawBoard();
        // After reset, if current player is AI, make AI take turn
        if (playerManager.getCurrentPlayer().isAI) {
            await aiLogic.takeAITurn();
        }
    }

    // Event listeners
    canvas.addEventListener('click', handleCanvasClick);
    resetButton.addEventListener('click', handleResetClick);
    
    window.addEventListener('resize', function() {
        boardSize = Math.min(canvas.offsetWidth, canvas.offsetHeight);
        canvas.width = boardSize;
        canvas.height = boardSize;
        originX = boardSize / 2;
        originY = boardSize / 2;
        drawBoard();
    });

    // Initial draw
    drawBoard();
    updateUI(); // Set initial current player and turn count
};
