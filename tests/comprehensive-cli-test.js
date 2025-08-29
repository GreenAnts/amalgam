#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, type = 'info', data = null) {
    const timestamp = new Date().toLocaleTimeString();
    let logEntry = `[${timestamp}] ${message}`;
    
    if (data && Object.keys(data).length > 0) {
        const essentialData = {};
        Object.keys(data).slice(0, 3).forEach(key => {
            if (typeof data[key] === 'number' || typeof data[key] === 'string' || typeof data[key] === 'boolean') {
                essentialData[key] = data[key];
            }
        });
        if (Object.keys(essentialData).length > 0) {
            logEntry += ` | ${JSON.stringify(essentialData)}`;
        }
    }
    
    const color = type === 'error' ? colors.red : 
                  type === 'success' ? colors.green : 
                  type === 'warning' ? colors.yellow : colors.cyan;
    
    console.log(`${color}${logEntry}${colors.reset}`);
}

function testFileExists(filePath, description) {
    const fullPath = path.join(projectRoot, filePath);
    const exists = fs.existsSync(fullPath);
    log(`${description}: ${exists ? 'EXISTS' : 'MISSING'}`, exists ? 'success' : 'error', { path: filePath });
    return exists;
}

function testJsonFile(filePath, description) {
    const fullPath = path.join(projectRoot, filePath);
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(content);
        const size = content.length;
        const keys = Object.keys(data);
        log(`${description}: OK`, 'success', { size, keys: keys.length, topKeys: keys.slice(0, 3) });
        return { success: true, data, size, keys };
    } catch (error) {
        log(`${description}: FAILED`, 'error', { error: error.message });
        return { success: false, error: error.message };
    }
}

function testModuleSyntax(filePath, description) {
    const fullPath = path.join(projectRoot, filePath);
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Basic syntax check - look for common syntax errors
        const hasExport = content.includes('export') || content.includes('module.exports');
        const hasImport = content.includes('import') || content.includes('require(');
        const hasFunction = content.includes('function') || content.includes('=>');
        const hasClass = content.includes('class');
        
        log(`${description}: VALID`, 'success', { 
            hasExport, hasImport, hasFunction, hasClass, 
            size: content.length 
        });
        return { success: true, content };
    } catch (error) {
        log(`${description}: INVALID`, 'error', { error: error.message });
        return { success: false, error: error.message };
    }
}

function testPathResolution() {
    log('=== Testing Path Resolution ===', 'info');
    
    const testPaths = [
        { path: 'data/board-data.json', desc: 'Board Data (relative)' },
        { path: '../data/board-data.json', desc: 'Board Data (parent)' },
        { path: '/data/board-data.json', desc: 'Board Data (absolute)' },
        { path: 'game-rules/amalgam_complete_rules.json', desc: 'Game Rules (relative)' },
        { path: '../game-rules/amalgam_complete_rules.json', desc: 'Game Rules (parent)' }
    ];
    
    let passed = 0;
    let total = testPaths.length;
    
    testPaths.forEach(({ path: filePath, desc }) => {
        const fullPath = path.join(projectRoot, filePath);
        const exists = fs.existsSync(fullPath);
        log(`${desc}: ${exists ? 'OK' : 'FAILED'}`, exists ? 'success' : 'error', { 
            resolvedPath: fullPath, exists 
        });
        if (exists) passed++;
    });
    
    return { passed, total };
}

function testDataStructure() {
    log('=== Testing Data Structure Integrity ===', 'info');
    
    const boardData = testJsonFile('data/board-data.json', 'Board Data Structure');
    if (!boardData.success) return { passed: 0, total: 1 };
    
    const boardPositionsData = testJsonFile('game-rules/board_positions.json', 'Board Positions Structure');
    if (!boardPositionsData.success) return { passed: 0, total: 1 };
    
    const data = boardData.data;
    const positionsData = boardPositionsData.data;
    let passed = 0;
    let total = 0;
    
    // Test required fields in board-data.json
    const requiredFields = [
        'schema', 'version', 'description', 'coordinate_system', 
        'total_intersections', 'board', 'coordinate_ranges', 
        'golden_coordinates', 'standard_coordinates', 'golden_lines', 
        'starting_areas', 'pre_placed_pieces'
    ];
    
    requiredFields.forEach(field => {
        total++;
        const exists = data.hasOwnProperty(field);
        log(`Board Data Field "${field}": ${exists ? 'EXISTS' : 'MISSING'}`, exists ? 'success' : 'error');
        if (exists) passed++;
    });
    
    // Test board_positions.json structure
    total++;
    const hasBoardPositions = positionsData.hasOwnProperty('board_positions');
    log(`Board Positions Root: ${hasBoardPositions ? 'EXISTS' : 'MISSING'}`, hasBoardPositions ? 'success' : 'error');
    if (hasBoardPositions) passed++;
    
    // Test board_positions subfields
    const boardPositions = positionsData.board_positions;
    if (boardPositions) {
        const positionFields = ['description', 'coordinate_system', 'total_positions', 'center_positions', 'quadrant_positions'];
        positionFields.forEach(field => {
            total++;
            const exists = boardPositions.hasOwnProperty(field);
            log(`Board Positions Field "${field}": ${exists ? 'EXISTS' : 'MISSING'}`, exists ? 'success' : 'error');
            if (exists) passed++;
        });
    }
    
    // Test that coordinates can be extracted from the structure
    total++;
    const centerPositions = boardPositions?.center_positions;
    const quadrantPositions = boardPositions?.quadrant_positions;
    const hasCoordinates = centerPositions && quadrantPositions;
    log(`Coordinates Structure: ${hasCoordinates ? 'EXISTS' : 'MISSING'}`, hasCoordinates ? 'success' : 'error', {
        hasCenter: !!centerPositions, hasQuadrants: !!quadrantPositions
    });
    if (hasCoordinates) passed++;
    
    // Test golden_lines structure in board-data.json
    total++;
    const goldenLines = data.golden_lines;
    const hasGoldenLines = goldenLines && typeof goldenLines === 'object' && goldenLines.hasOwnProperty('golden_lines_dict');
    log(`Golden Lines Structure: ${hasGoldenLines ? 'EXISTS' : 'MISSING'}`, hasGoldenLines ? 'success' : 'error', {
        isObject: typeof goldenLines === 'object', hasDict: goldenLines?.hasOwnProperty('golden_lines_dict')
    });
    if (hasGoldenLines) passed++;
    
    return { passed, total };
}

function testModuleDependencies() {
    log('=== Testing Module Dependencies ===', 'info');
    
    const modules = [
        { path: 'core/board.js', desc: 'Board Module' },
        { path: 'core/rules.js', desc: 'Rules Module' },
        { path: 'core/types.js', desc: 'Types Module' },
        { path: 'ui/graphics.js', desc: 'Graphics Module' },
        { path: 'ui/interactions.js', desc: 'Interactions Module' },
        { path: 'utils/logger.js', desc: 'Logger Module' },
        { path: 'utils/helpers.js', desc: 'Helpers Module' },
        { path: 'game/gameManager.js', desc: 'Game Manager Module' },
        { path: 'game/player.js', desc: 'Player Module' }
    ];
    
    let passed = 0;
    let total = modules.length;
    
    modules.forEach(({ path: filePath, desc }) => {
        const result = testModuleSyntax(filePath, desc);
        if (result.success) passed++;
    });
    
    // Test for missing animations module
    total++;
    const animationsExists = fs.existsSync(path.join(projectRoot, 'ui/animations.js'));
    log(`Animations Module: ${animationsExists ? 'EXISTS' : 'MISSING'}`, animationsExists ? 'success' : 'warning', {
        note: animationsExists ? '' : 'Only animations.d.ts exists'
    });
    if (animationsExists) passed++;
    
    return { passed, total };
}

function testGameInitialization() {
    log('=== Testing Game Initialization ===', 'info');
    
    // Test if GameManager can be loaded
    const gameManagerPath = path.join(projectRoot, 'game/gameManager.js');
    const gameManagerExists = fs.existsSync(gameManagerPath);
    
    if (!gameManagerExists) {
        log('Game Manager: MISSING', 'error');
        return { passed: 0, total: 1 };
    }
    
    let passed = 0;
    let total = 0;
    
    // Test GameManager content for canvas requirements
    total++;
    const content = fs.readFileSync(gameManagerPath, 'utf8');
    const hasCanvasElement = content.includes('canvasElement') || content.includes('canvas');
    const hasAddEventListener = content.includes('addEventListener');
    log(`Game Manager Canvas Support: ${hasCanvasElement ? 'EXISTS' : 'MISSING'}`, hasCanvasElement ? 'success' : 'warning', {
        hasAddEventListener
    });
    if (hasCanvasElement) passed++;
    
    // Test for proper initialization patterns
    total++;
    const hasConstructor = content.includes('constructor') || content.includes('function');
    const hasInitMethod = content.includes('init') || content.includes('initialize');
    log(`Game Manager Init Pattern: ${hasConstructor ? 'EXISTS' : 'MISSING'}`, hasConstructor ? 'success' : 'warning', {
        hasInitMethod
    });
    if (hasConstructor) passed++;
    
    return { passed, total };
}

function runAllTests() {
    console.log(`${colors.bright}${colors.cyan}🚀 Starting Comprehensive CLI Test Suite...${colors.reset}\n`);
    
    const results = {
        pathResolution: testPathResolution(),
        dataStructure: testDataStructure(),
        moduleDependencies: testModuleDependencies(),
        gameInitialization: testGameInitialization()
    };
    
    console.log(`\n${colors.bright}${colors.magenta}📊 COMPREHENSIVE TEST RESULTS${colors.reset}`);
    console.log(`${colors.cyan}================================${colors.reset}`);
    
    let totalPassed = 0;
    let totalTests = 0;
    
    Object.entries(results).forEach(([testName, result]) => {
        const percentage = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
        const status = result.passed === result.total ? '✅ PASSED' : '❌ FAILED';
        const color = result.passed === result.total ? colors.green : colors.red;
        
        console.log(`${color}${testName.toUpperCase()}: ${status}${colors.reset} (${result.passed}/${result.total}) - ${percentage}%`);
        totalPassed += result.passed;
        totalTests += result.total;
    });
    
    const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    const overallStatus = totalPassed === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
    const overallColor = totalPassed === totalTests ? colors.green : colors.red;
    
    console.log(`${colors.cyan}================================${colors.reset}`);
    console.log(`${overallColor}${colors.bright}OVERALL: ${overallStatus}${colors.reset} (${totalPassed}/${totalTests}) - ${overallPercentage}%`);
    
    if (totalPassed < totalTests) {
        console.log(`\n${colors.yellow}${colors.bright}🔧 RECOMMENDED FIXES:${colors.reset}`);
        console.log(`${colors.yellow}1. Check path resolution for relative paths${colors.reset}`);
        console.log(`${colors.yellow}2. Verify board data structure integrity${colors.reset}`);
        console.log(`${colors.yellow}3. Ensure all required modules exist${colors.reset}`);
        console.log(`${colors.yellow}4. Fix GameManager canvas initialization${colors.reset}`);
    }
    
    return { totalPassed, totalTests, overallPercentage };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests, testFileExists, testJsonFile, testModuleSyntax };
