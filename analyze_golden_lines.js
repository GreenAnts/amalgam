const fs = require('fs');

// Load the complete golden lines structure
const goldenLinesData = JSON.parse(fs.readFileSync('game-rules/golden_lines.json', 'utf8'));
const network = goldenLinesData.golden_lines_network;

console.log('=== DEEP ANALYSIS OF GOLDEN_LINES.JSON ===\n');

// 1. Explicit connections from connection mappings
let explicitConnections = [];

console.log('1. EXPLICIT CONNECTIONS:');
for (const [section, connections] of Object.entries({
  'outer_terminal_connections': network.outer_terminal_connections,
  'major_hub_connections': network.major_hub_connections, 
  'connection_completions': network.connection_completions,
  'corner_squares': network.inner_network_intersections.corner_squares,
  'center_edge_connections': network.inner_network_intersections.center_edge_connections,
  'outer_diamond_connections': network.inner_network_intersections.outer_diamond_connections
})) {
  console.log(`\n${section}:`);
  for (const [from, toList] of Object.entries(connections)) {
    const fromCoords = JSON.parse(from);
    toList.forEach(to => {
      explicitConnections.push({from: fromCoords, to: to});
      console.log(`  ${from} -> [${to[0]},${to[1]}]`);
    });
  }
}

console.log(`\nTotal explicit connections: ${explicitConnections.length}`);

// 2. IMPLIED CONNECTIONS within line segments
console.log('\n\n2. IMPLIED CONNECTIONS WITHIN LINE SEGMENTS:');

const lineSegments = network.inner_line_intersections;
let impliedConnections = [];

// Helper function to generate connections within a line segment
function generateLineConnections(points, segmentName) {
  console.log(`\n${segmentName}:`);
  console.log('Points:', points);
  
  // For each type of line, we need to identify which points connect to which
  // This requires understanding the geometric structure
  
  if (segmentName === 'large_square_perimeter') {
    // These form the perimeter of a square - need to connect adjacent points
    // Group by edges: top, bottom, left, right
    const edges = {
      top: points.filter(p => p[1] === 6),
      bottom: points.filter(p => p[1] === -6),
      left: points.filter(p => p[0] === -6),
      right: points.filter(p => p[0] === 6)
    };
    
    // Connect adjacent points on each edge
    for (const [edge, edgePoints] of Object.entries(edges)) {
      const sorted = edgePoints.sort((a, b) => edge.includes('top') || edge.includes('bottom') ? a[0] - b[0] : a[1] - b[1]);
      for (let i = 0; i < sorted.length - 1; i++) {
        impliedConnections.push({from: sorted[i], to: sorted[i + 1]});
        console.log(`  [${sorted[i]}] -> [${sorted[i + 1]}] (${edge} edge)`);
      }
    }
  }
  
  if (segmentName === 'inner_rotated_square') {
    // These form diagonal lines - connect points that form straight diagonals
    const diagonals = [
      points.filter(p => p[0] + p[1] === 6), // top-right diagonal  
      points.filter(p => p[0] - p[1] === 0 && p[1] > 0), // This doesn't match the pattern...
    ];
    
    // Actually, let me check the pattern more carefully
    console.log('  Analyzing diagonal patterns...');
    // [1,5], [2,4], [3,3], [4,2], [5,1] - these have sum = 6
    // [-1,5], [-2,4], [-3,3], [-4,2], [-5,1] - these have difference = -6
    // etc.
    
    const patterns = [
      points.filter(p => p[0] + p[1] === 6),   // NE diagonal upper
      points.filter(p => p[0] + p[1] === -6),  // SW diagonal lower  
      points.filter(p => p[0] - p[1] === -6),  // NW diagonal upper
      points.filter(p => p[0] - p[1] === 6)    // SE diagonal lower
    ];
    
    patterns.forEach((pattern, idx) => {
      const sorted = pattern.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sorted.length - 1; i++) {
        impliedConnections.push({from: sorted[i], to: sorted[i + 1]});
        console.log(`  [${sorted[i]}] -> [${sorted[i + 1]}] (diagonal ${idx})`);
      }
    });
  }
  
  if (segmentName === 'center_cross_and_x') {
    // These form cross and X patterns
    // Horizontal lines: same Y, different X
    // Vertical lines: same X, different Y  
    // Diagonal lines: constant slope
    
    // Group by lines
    const horizontals = {};
    const verticals = {};
    const diagonals = {
      main_pos: [], // y = x
      main_neg: [], // y = -x  
      off_pos: [],  // y = x + offset
      off_neg: []   // y = -x + offset
    };
    
    points.forEach(p => {
      // Horizontal lines
      if (!horizontals[p[1]]) horizontals[p[1]] = [];
      horizontals[p[1]].push(p);
      
      // Vertical lines
      if (!verticals[p[0]]) verticals[p[0]] = [];
      verticals[p[0]].push(p);
      
      // Diagonal classification
      if (p[0] === p[1]) diagonals.main_pos.push(p);
      if (p[0] === -p[1]) diagonals.main_neg.push(p);
    });
    
    // Connect horizontal lines
    for (const [y, linePoints] of Object.entries(horizontals)) {
      if (linePoints.length > 1) {
        const sorted = linePoints.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < sorted.length - 1; i++) {
          impliedConnections.push({from: sorted[i], to: sorted[i + 1]});
          console.log(`  [${sorted[i]}] -> [${sorted[i + 1]}] (horizontal y=${y})`);
        }
      }
    }
    
    // Connect vertical lines
    for (const [x, linePoints] of Object.entries(verticals)) {
      if (linePoints.length > 1) {
        const sorted = linePoints.sort((a, b) => a[1] - b[1]);
        for (let i = 0; i < sorted.length - 1; i++) {
          impliedConnections.push({from: sorted[i], to: sorted[i + 1]});
          console.log(`  [${sorted[i]}] -> [${sorted[i + 1]}] (vertical x=${x})`);
        }
      }
    }
    
    // Connect diagonal lines
    for (const [type, diagPoints] of Object.entries(diagonals)) {
      if (diagPoints.length > 1) {
        const sorted = diagPoints.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < sorted.length - 1; i++) {
          impliedConnections.push({from: sorted[i], to: sorted[i + 1]});
          console.log(`  [${sorted[i]}] -> [${sorted[i + 1]}] (${type} diagonal)`);
        }
      }
    }
  }
  
  if (segmentName === 'triangular_extensions') {
    // These form diagonal extensions from center
    // Group by slope/direction
    const slopes = [
      points.filter(p => p[0] + p[1] === 8),   // Upper right diagonal
      points.filter(p => p[0] + p[1] === -8),  // Lower left diagonal  
      points.filter(p => p[0] - p[1] === -8),  // Upper left diagonal
      points.filter(p => p[0] - p[1] === 8)    // Lower right diagonal
    ];
    
    slopes.forEach((slope, idx) => {
      const sorted = slope.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sorted.length - 1; i++) {
        impliedConnections.push({from: sorted[i], to: sorted[i + 1]});
        console.log(`  [${sorted[i]}] -> [${sorted[i + 1]}] (extension ${idx})`);
      }
    });
  }
}

// Process each line segment
for (const [segmentName, points] of Object.entries(lineSegments)) {
  generateLineConnections(points, segmentName);
}

console.log(`\nTotal implied connections: ${impliedConnections.length}`);
console.log(`\nGRAND TOTAL: ${explicitConnections.length + impliedConnections.length} connections`);
console.log(`Current board-data.json has: 40 connections`);
console.log(`Missing: ${explicitConnections.length + impliedConnections.length - 40} connections`);