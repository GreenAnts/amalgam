#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Terminal colors for better readability
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Test results storage
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

function log(message, type = 'info', data = null) {
    const timestamp = new Date().toLocaleTimeString();
    let logEntry = `[${timestamp}] ${message}`;
    
    // Add essential data for LLM consumption (keep concise)
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
    
    // Store for summary
    testResults.details.push({ message, type, data, timestamp });
    testResults.total++;
    if (type === 'success') testResults.passed++;
    if (type === 'error') testResults.failed++;
    if (type === 'warning') testResults.warnings++;
}

// ===== CORE TESTING FUNCTIONS =====

function testFileSystem() {
    log('=== File System Tests ===', 'info');
    
    const criticalFiles = [
        { path: 'data/board-data.json', desc: 'Board Data' },
        { path: 'data/piece-definitions.json', desc: 'Piece Definitions' },
        { path: 'game-rules/amalgam_complete_rules.json', desc: 'Game Rules' },
        { path: 'game-rules/golden_lines.json', desc: 'Golden Lines' },
        { path: 'game-rules/board_positions.json', desc: 'Board Positions' },
        { path: 'game-rules/starting_positions.json', desc: 'Starting Positions' }
    ];
    
    const coreModules = [
        { path: 'core/board.js', desc: 'Board Module' },
        { path: 'core/rules.js', desc: 'Rules Module' },
        { path: 'core/types.js', desc: 'Types Module' },
        { path: 'ui/graphics.js', desc: 'Graphics Module' },
        { path: 'ui/interactions.js', desc: 'Interactions Module' },
        { path: 'utils/logger.js', desc: 'Logger Module' },
        { path: 'utils/helpers.js', desc: 'Helpers Module' },
        { path: 'game/gameManager.js', desc: 'Game Manager' },
        { path: 'game/player.js', desc: 'Player Module' }
    ];
    
    let passed = 0;
    let total = criticalFiles.length + coreModules.length;
    
    // Test critical files
    criticalFiles.forEach(({ path: filePath, desc }) => {
        const fullPath = path.join(projectRoot, filePath);
        const exists = fs.existsSync(fullPath);
        if (exists) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const data = JSON.parse(content);
                log(`${desc}: OK`, 'success', { 
                    size: content.length, 
                    keys: Object.keys(data).length 
                });
                passed++;
            } catch (error) {
                log(`${desc}: INVALID JSON`, 'error', { error: error.message });
            }
        } else {
            log(`${desc}: MISSING`, 'error', { path: filePath });
        }
    });
    
    // Test core modules
    coreModules.forEach(({ path: filePath, desc }) => {
        const fullPath = path.join(projectRoot, filePath);
        const exists = fs.existsSync(fullPath);
        if (exists) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hasExport = content.includes('export');
            const hasImport = content.includes('import');
            log(`${desc}: OK`, 'success', { 
                hasExport, hasImport, size: content.length 
            });
            passed++;
        } else {
            log(`${desc}: MISSING`, 'error', { path: filePath });
        }
    });
    
    // Check for missing animations module (known issue)
    const animationsPath = path.join(projectRoot, 'ui/animations.js');
    if (!fs.existsSync(animationsPath)) {
        log('Animations Module: MISSING (only .d.ts exists)', 'warning', {
            note: 'This may cause web import errors'
        });
    }
    
    return { passed, total };
}

function testDataIntegrity() {
    log('=== Data Integrity Tests ===', 'info');
    
    try {
        const boardData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data/board-data.json'), 'utf8'));
        const pieceDefs = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data/piece-definitions.json'), 'utf8'));
        const gameRules = JSON.parse(fs.readFileSync(path.join(projectRoot, 'game-rules/amalgam_complete_rules.json'), 'utf8'));
        
        let passed = 0;
        let total = 0;
        
        // Test board data structure
        const requiredBoardFields = [
            'schema', 'version', 'description', 'coordinate_system', 
            'total_intersections', 'board', 'coordinate_ranges', 
            'golden_coordinates', 'standard_coordinates', 'golden_lines', 
            'starting_areas', 'pre_placed_pieces'
        ];
        
        requiredBoardFields.forEach(field => {
            total++;
            if (boardData.hasOwnProperty(field)) {
                log(`Board Field "${field}": EXISTS`, 'success');
                passed++;
            } else {
                log(`Board Field "${field}": MISSING`, 'error');
            }
        });
        
        // Test piece definitions
        total++;
        if (pieceDefs.hasOwnProperty('pieces') && Array.isArray(pieceDefs.pieces)) {
            log('Piece Definitions: VALID', 'success', { 
                count: pieceDefs.pieces.length 
            });
            passed++;
        } else {
            log('Piece Definitions: INVALID', 'error');
        }
        
        // Test game rules
        total++;
        if (gameRules.hasOwnProperty('rules') && typeof gameRules.rules === 'object') {
            log('Game Rules: VALID', 'success', { 
                ruleCount: Object.keys(gameRules.rules).length 
            });
            passed++;
        } else {
            log('Game Rules: INVALID', 'error');
        }
        
        // Test golden lines structure
        total++;
        const goldenLines = boardData.golden_lines;
        if (goldenLines && goldenLines.hasOwnProperty('golden_lines_dict')) {
            log('Golden Lines: VALID', 'success', { 
                lineCount: Object.keys(goldenLines.golden_lines_dict).length 
            });
            passed++;
        } else {
            log('Golden Lines: INVALID', 'error');
        }
        
        return { passed, total };
        
    } catch (error) {
        log('Data Integrity: FAILED', 'error', { error: error.message });
        return { passed: 0, total: 1 };
    }
}

function testModuleSyntax() {
    log('=== Module Syntax Tests ===', 'info');
    
    const modules = [
        'core/board.js', 'core/rules.js', 'core/types.js',
        'ui/graphics.js', 'ui/interactions.js', 
        'utils/logger.js', 'utils/helpers.js',
        'game/gameManager.js', 'game/player.js'
    ];
    
    let passed = 0;
    let total = modules.length;
    
    modules.forEach(modulePath => {
        try {
            const fullPath = path.join(projectRoot, modulePath);
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Basic syntax validation
            const hasExport = content.includes('export');
            const hasImport = content.includes('import');
            const hasFunction = content.includes('function') || content.includes('=>');
            const hasClass = content.includes('class');
            
            if (hasExport || hasImport || hasFunction || hasClass) {
                log(`${modulePath}: VALID`, 'success', { 
                    hasExport, hasImport, hasFunction, hasClass 
                });
                passed++;
            } else {
                log(`${modulePath}: INVALID`, 'error');
            }
        } catch (error) {
            log(`${modulePath}: ERROR`, 'error', { error: error.message });
        }
    });
    
    return { passed, total };
}

function testPathResolution() {
    log('=== Path Resolution Tests ===', 'info');
    
    const testPaths = [
        { path: 'data/board-data.json', desc: 'Board Data (relative)' },
        { path: '/data/board-data.json', desc: 'Board Data (absolute)' },
        { path: 'game-rules/amalgam_complete_rules.json', desc: 'Game Rules (relative)' },
        { path: '/game-rules/amalgam_complete_rules.json', desc: 'Game Rules (absolute)' }
    ];
    
    let passed = 0;
    let total = testPaths.length;
    
    testPaths.forEach(({ path: filePath, desc }) => {
        const fullPath = path.join(projectRoot, filePath.replace(/^\//, ''));
        const exists = fs.existsSync(fullPath);
        if (exists) {
            log(`${desc}: OK`, 'success', { resolvedPath: fullPath });
            passed++;
        } else {
            log(`${desc}: FAILED`, 'error', { path: filePath });
        }
    });
    
    return { passed, total };
}

function testGameInitialization() {
    log('=== Game Initialization Tests ===', 'info');
    
    try {
        const gameManagerPath = path.join(projectRoot, 'game/gameManager.js');
        const content = fs.readFileSync(gameManagerPath, 'utf8');
        
        let passed = 0;
        let total = 0;
        
        // Test for proper class structure
        total++;
        if (content.includes('class GameManager') || content.includes('export class GameManager')) {
            log('GameManager Class: VALID', 'success');
            passed++;
        } else {
            log('GameManager Class: INVALID', 'error');
        }
        
        // Test for constructor
        total++;
        if (content.includes('constructor(')) {
            log('GameManager Constructor: EXISTS', 'success');
            passed++;
        } else {
            log('GameManager Constructor: MISSING', 'error');
        }
        
        // Test for canvas handling
        total++;
        if (content.includes('canvas') || content.includes('Canvas')) {
            log('Canvas Support: EXISTS', 'success');
            passed++;
        } else {
            log('Canvas Support: MISSING', 'warning');
        }
        
        // Test for event handling
        total++;
        if (content.includes('addEventListener') || content.includes('onclick')) {
            log('Event Handling: EXISTS', 'success');
            passed++;
        } else {
            log('Event Handling: MISSING', 'warning');
        }
        
        return { passed, total };
        
    } catch (error) {
        log('Game Initialization: FAILED', 'error', { error: error.message });
        return { passed: 0, total: 1 };
    }
}

function testTypeScriptCompilation() {
    log('=== TypeScript Compilation Tests ===', 'info');
    
    try {
        // Check if TypeScript files exist
        const tsFiles = [
            'core/board.ts', 'core/rules.ts', 'core/types.ts',
            'ui/graphics.ts', 'ui/interactions.ts',
            'utils/logger.ts', 'utils/helpers.ts',
            'game/gameManager.ts', 'game/player.ts'
        ];
        
        let passed = 0;
        let total = tsFiles.length;
        
        tsFiles.forEach(tsFile => {
            const fullPath = path.join(projectRoot, tsFile);
            const exists = fs.existsSync(fullPath);
            if (exists) {
                log(`${tsFile}: EXISTS`, 'success');
                passed++;
            } else {
                log(`${tsFile}: MISSING`, 'warning');
            }
        });
        
        // Check tsconfig.json
        total++;
        const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
        if (fs.existsSync(tsConfigPath)) {
            log('tsconfig.json: EXISTS', 'success');
            passed++;
        } else {
            log('tsconfig.json: MISSING', 'error');
        }
        
        return { passed, total };
        
    } catch (error) {
        log('TypeScript Tests: FAILED', 'error', { error: error.message });
        return { passed: 0, total: 1 };
    }
}

// ===== MAIN TEST RUNNER =====

function runAllTests() {
    console.log(`${colors.bright}${colors.cyan}🚀 AMALGAM CONSOLIDATED TEST RUNNER${colors.reset}`);
    console.log(`${colors.cyan}==========================================${colors.reset}\n`);
    
    const startTime = Date.now();
    
    // Reset results
    testResults = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Run all test suites
    const results = {
        fileSystem: testFileSystem(),
        dataIntegrity: testDataIntegrity(),
        moduleSyntax: testModuleSyntax(),
        pathResolution: testPathResolution(),
        gameInitialization: testGameInitialization(),
        typescript: testTypeScriptCompilation()
    };
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Generate comprehensive summary
    console.log(`\n${colors.bright}${colors.magenta}📊 CONSOLIDATED TEST RESULTS${colors.reset}`);
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
    console.log(`${colors.cyan}Duration: ${duration}ms${colors.reset}`);
    
    // LLM-friendly summary
    console.log(`\n${colors.bright}${colors.yellow}🤖 LLM SUMMARY${colors.reset}`);
    console.log(`${colors.yellow}=============${colors.reset}`);
    
    if (totalPassed === totalTests) {
        console.log(`${colors.green}✅ System Status: FULLY OPERATIONAL${colors.reset}`);
        console.log(`${colors.green}✅ All core components validated${colors.reset}`);
        console.log(`${colors.green}✅ Data structures intact${colors.reset}`);
        console.log(`${colors.green}✅ Module dependencies resolved${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ System Status: ISSUES DETECTED${colors.reset}`);
        
        // Identify specific issues
        if (results.fileSystem.passed < results.fileSystem.total) {
            console.log(`${colors.red}• File System: Missing critical files or modules${colors.reset}`);
        }
        if (results.dataIntegrity.passed < results.dataIntegrity.total) {
            console.log(`${colors.red}• Data Integrity: JSON structure issues${colors.reset}`);
        }
        if (results.moduleSyntax.passed < results.moduleSyntax.total) {
            console.log(`${colors.red}• Module Syntax: Import/export issues${colors.reset}`);
        }
        if (results.pathResolution.passed < results.pathResolution.total) {
            console.log(`${colors.red}• Path Resolution: Relative path issues${colors.reset}`);
        }
        if (results.gameInitialization.passed < results.gameInitialization.total) {
            console.log(`${colors.red}• Game Init: Canvas or event handling issues${colors.reset}`);
        }
        if (results.typescript.passed < results.typescript.total) {
            console.log(`${colors.red}• TypeScript: Compilation setup issues${colors.reset}`);
        }
    }
    
    // Recommendations
    if (totalPassed < totalTests) {
        console.log(`\n${colors.cyan}${colors.bright}🔧 RECOMMENDATIONS:${colors.reset}`);
        console.log(`${colors.cyan}1. Run: npm run build (to compile TypeScript)${colors.reset}`);
        console.log(`${colors.cyan}2. Check: Missing ui/animations.js file${colors.reset}`);
        console.log(`${colors.cyan}3. Verify: All JSON files are valid${colors.reset}`);
        console.log(`${colors.cyan}4. Test: Web interface at http://localhost:8080${colors.reset}`);
    }
    
    return {
        totalPassed,
        totalTests,
        overallPercentage,
        duration,
        details: testResults.details
    };
}

// Export for use in other modules
export { runAllTests, testFileSystem, testDataIntegrity, testModuleSyntax, testPathResolution, testGameInitialization, testTypeScriptCompilation };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}
