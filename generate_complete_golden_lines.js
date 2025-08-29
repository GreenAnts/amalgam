const fs = require('fs');

// Load the complete golden lines structure
const goldenLinesData = JSON.parse(fs.readFileSync('game-rules/golden_lines.json', 'utf8'));
const network = goldenLinesData.golden_lines_network;

console.log('Generating complete golden lines network...\n');

let allConnections = [];

// Helper to add bidirectional connections (avoid duplicates)
const addConnection = (from, to) => {
  // Check if connection already exists (either direction)
  const exists = allConnections.some(conn => 
    (conn.from[0] === from[0] && conn.from[1] === from[1] && conn.to[0] === to[0] && conn.to[1] === to[1]) ||
    (conn.from[0] === to[0] && conn.from[1] === to[1] && conn.to[0] === from[0] && conn.to[1] === from[1])
  );
  
  if (!exists) {
    allConnections.push({from: from, to: to});
  }
};

// 1. EXPLICIT CONNECTIONS from connection mappings
console.log('1. Processing explicit connections...');

for (const [section, connections] of Object.entries({
  'outer_terminal_connections': network.outer_terminal_connections,
  'major_hub_connections': network.major_hub_connections, 
  'connection_completions': network.connection_completions,
  'corner_squares': network.inner_network_intersections.corner_squares,
  'center_edge_connections': network.inner_network_intersections.center_edge_connections,
  'outer_diamond_connections': network.inner_network_intersections.outer_diamond_connections
})) {
  for (const [from, toList] of Object.entries(connections)) {
    const fromCoords = JSON.parse(from);
    toList.forEach(to => {
      addConnection(fromCoords, to);
    });
  }
}

console.log(`Added ${allConnections.length} explicit connections`);

// 2. IMPLIED CONNECTIONS within line segments
console.log('2. Processing implied connections within line segments...');

const lineSegments = network.inner_line_intersections;

// Helper function to generate connections within a line segment
function generateLineConnections(points, segmentName) {
  let segmentConnections = 0;
  
  if (segmentName === 'large_square_perimeter') {
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
        addConnection(sorted[i], sorted[i + 1]);
        segmentConnections++;
      }
    }
  }
  
  if (segmentName === 'inner_rotated_square') {
    // These form diagonal lines - connect points that form straight diagonals
    const patterns = [
      points.filter(p => p[0] + p[1] === 6),   // NE diagonal upper: [1,5], [2,4], [3,3], [4,2], [5,1]
      points.filter(p => p[0] + p[1] === -6),  // SW diagonal lower: [-5,-1], [-4,-2], [-3,-3], [-2,-4], [-1,-5]
      points.filter(p => p[0] - p[1] === -6),  // NW diagonal upper: [-5,1], [-4,2], [-3,3], [-2,4], [-1,5]
      points.filter(p => p[0] - p[1] === 6)    // SE diagonal lower: [1,-5], [2,-4], [3,-3], [4,-2], [5,-1]
    ];
    
    patterns.forEach(pattern => {
      const sorted = pattern.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sorted.length - 1; i++) {
        addConnection(sorted[i], sorted[i + 1]);
        segmentConnections++;
      }
    });
  }
  
  if (segmentName === 'center_cross_and_x') {
    // Group by lines
    const horizontals = {};
    const verticals = {};
    const diagonalPos = []; // y = x
    const diagonalNeg = []; // y = -x
    
    points.forEach(p => {
      // Horizontal lines
      if (!horizontals[p[1]]) horizontals[p[1]] = [];
      horizontals[p[1]].push(p);
      
      // Vertical lines
      if (!verticals[p[0]]) verticals[p[0]] = [];
      verticals[p[0]].push(p);
      
      // Diagonal classification
      if (p[0] === p[1]) diagonalPos.push(p);
      if (p[0] === -p[1]) diagonalNeg.push(p);
    });
    
    // Connect horizontal lines
    for (const [y, linePoints] of Object.entries(horizontals)) {
      if (linePoints.length > 1) {
        const sorted = linePoints.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < sorted.length - 1; i++) {
          addConnection(sorted[i], sorted[i + 1]);
          segmentConnections++;
        }
      }
    }
    
    // Connect vertical lines  
    for (const [x, linePoints] of Object.entries(verticals)) {
      if (linePoints.length > 1) {
        const sorted = linePoints.sort((a, b) => a[1] - b[1]);
        for (let i = 0; i < sorted.length - 1; i++) {
          addConnection(sorted[i], sorted[i + 1]);
          segmentConnections++;
        }
      }
    }
    
    // Connect positive diagonal (y = x)
    if (diagonalPos.length > 1) {
      const sorted = diagonalPos.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sorted.length - 1; i++) {
        addConnection(sorted[i], sorted[i + 1]);
        segmentConnections++;
      }
    }
    
    // Connect negative diagonal (y = -x)
    if (diagonalNeg.length > 1) {
      const sorted = diagonalNeg.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sorted.length - 1; i++) {
        addConnection(sorted[i], sorted[i + 1]);
        segmentConnections++;
      }
    }
  }
  
  if (segmentName === 'triangular_extensions') {
    // These form diagonal extensions from center, but with different slopes
    // Group by direction based on the actual pattern:
    const diagonals = [
      points.filter(p => p[0] - p[1] === -6 && p[0] > 0),  // [1,7], [2,8], [3,9], [4,10] - northeast
      points.filter(p => p[0] - p[1] === -8 && p[0] < 0),  // [-1,7], [-2,8], [-3,9], [-4,10] - northwest  
      points.filter(p => p[0] - p[1] === 8 && p[0] > 0),   // [1,-7], [2,-8], [3,-9], [4,-10] - southeast
      points.filter(p => p[0] - p[1] === 6 && p[0] < 0)    // [-1,-7], [-2,-8], [-3,-9], [-4,-10] - southwest
    ];
    
    diagonals.forEach(diagonal => {
      if (diagonal.length > 1) {
        const sorted = diagonal.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < sorted.length - 1; i++) {
          addConnection(sorted[i], sorted[i + 1]);
          segmentConnections++;
        }
      }
    });
  }
  
  console.log(`  ${segmentName}: ${segmentConnections} connections`);
  return segmentConnections;
}

// Process each line segment
let impliedTotal = 0;
for (const [segmentName, points] of Object.entries(lineSegments)) {
  impliedTotal += generateLineConnections(points, segmentName);
}

console.log(`Added ${impliedTotal} implied connections`);
console.log(`\nTotal connections generated: ${allConnections.length}`);

// Update board-data.json
const boardData = JSON.parse(fs.readFileSync('data/board-data.json', 'utf8'));
boardData.golden_lines.connections = allConnections;

// Write updated board data
fs.writeFileSync('data/board-data.json', JSON.stringify(boardData, null, 2));
console.log(`\nUpdated board-data.json with ${allConnections.length} complete golden line connections!`);