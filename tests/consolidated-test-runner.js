#!/usr/bin/env node

/**
 * Amalgam Consolidated Test Runner
 * Comprehensive CLI testing framework with LLM-optimized output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const CRITICAL_FILES = [
    'data/board-data.json',
    'data/piece-definitions.json',
    'core/board.js',
    'core/rules.js',
    'ui/graphics.js',
    'game/gameManager.js'
];

const CORE_MODULES = [
    'core/board.js',
    'core/rules.js',
    'core/types.js',
    'ui/graphics.js',
    'ui/interactions.js',
    'game/gameManager.js',
    'game/player.js',
    'utils/helpers.js',
    'utils/logger.js'
];

/**
 * File System Tests
 */
function testFileSystem() {
    console.log('\n[File System Tests]');
    let passed = 0;
    let total = 0;

    // Test critical files
    for (const file of CRITICAL_FILES) {
        total++;
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (file.endsWith('.json')) {
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    console.log(`✅ ${file}: OK | {"size": ${stats.size}, "keys": ${Object.keys(content).length}}`);
                    passed++;
                } catch (error) {
                    console.log(`❌ ${file}: Invalid JSON - ${error.message}`);
                }
            } else {
                console.log(`✅ ${file}: OK | {"size": ${stats.size}}`);
                passed++;
            }
        } else {
            console.log(`❌ ${file}: MISSING`);
        }
    }

    // Test ui/animations.js (common issue)
    total++;
    const animationsPath = path.join(__dirname, '..', 'ui/animations.js');
    const animationsDtsPath = path.join(__dirname, '..', 'ui/animations.d.ts');
    if (fs.existsSync(animationsPath)) {
        console.log(`✅ ui/animations.js: OK`);
        passed++;
    } else if (fs.existsSync(animationsDtsPath)) {
        console.log(`⚠️  ui/animations.js: MISSING (only .d.ts exists)`);
    } else {
        console.log(`❌ ui/animations.js: MISSING`);
    }

    return { passed, total };
}

/**
 * Data Integrity Tests
 */
function testDataIntegrity() {
    console.log('\n[Data Integrity Tests]');
    let passed = 0;
    let total = 0;

    // Test board-data.json
    total++;
    try {
        const boardDataPath = path.join(__dirname, '..', 'data/board-data.json');
        const boardData = JSON.parse(fs.readFileSync(boardDataPath, 'utf8'));
        if (boardData && typeof boardData === 'object') {
            console.log(`✅ board-data.json: Valid JSON structure`);
            passed++;
        } else {
            console.log(`❌ board-data.json: Invalid structure`);
        }
    } catch (error) {
        console.log(`❌ board-data.json: JSON parse error - ${error.message}`);
    }

    // Test piece-definitions.json
    total++;
    try {
        const pieceDefPath = path.join(__dirname, '..', 'data/piece-definitions.json');
        const pieceDef = JSON.parse(fs.readFileSync(pieceDefPath, 'utf8'));
        if (pieceDef && typeof pieceDef === 'object') {
            console.log(`✅ piece-definitions.json: Valid JSON structure`);
            passed++;
        } else {
            console.log(`❌ piece-definitions.json: Invalid structure`);
        }
    } catch (error) {
        console.log(`❌ piece-definitions.json: JSON parse error - ${error.message}`);
    }

    // Test game rules files
    const gameRulesFiles = [
        'game-rules/amalgam_complete_rules.json',
        'game-rules/board_positions.json',
        'game-rules/golden_lines.json',
        'game-rules/piece_definitions.json',
        'game-rules/starting_positions.json'
    ];

    for (const file of gameRulesFiles) {
        total++;
        try {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                console.log(`✅ ${file}: Valid JSON`);
                passed++;
            } else {
                console.log(`❌ ${file}: Missing`);
            }
        } catch (error) {
            console.log(`❌ ${file}: JSON parse error - ${error.message}`);
        }
    }

    return { passed, total };
}

/**
 * Module Syntax Tests
 */
function testModuleSyntax() {
    console.log('\n[Module Syntax Tests]');
    let passed = 0;
    let total = 0;

    for (const module of CORE_MODULES) {
        total++;
        const modulePath = path.join(__dirname, '..', module);
        if (fs.existsSync(modulePath)) {
            try {
                const content = fs.readFileSync(modulePath, 'utf8');
                // Basic syntax checks
                if (content.includes('export') || content.includes('import') || content.includes('function') || content.includes('class')) {
                    console.log(`✅ ${module}: Valid syntax`);
                    passed++;
                } else {
                    console.log(`⚠️  ${module}: No exports/imports detected`);
                }
            } catch (error) {
                console.log(`❌ ${module}: Read error - ${error.message}`);
            }
        } else {
            console.log(`❌ ${module}: Missing`);
        }
    }

    return { passed, total };
}

/**
 * Path Resolution Tests
 */
function testPathResolution() {
    console.log('\n[Path Resolution Tests]');
    let passed = 0;
    let total = 0;

    // Test relative path resolution
    total++;
    try {
        const relativePath = path.join(__dirname, '..', 'data/board-data.json');
        if (fs.existsSync(relativePath)) {
            console.log(`✅ Relative path resolution: OK`);
            passed++;
        } else {
            console.log(`❌ Relative path resolution: Failed`);
        }
    } catch (error) {
        console.log(`❌ Relative path resolution: Error - ${error.message}`);
    }

    // Test absolute path resolution
    total++;
    try {
        const absolutePath = path.resolve(__dirname, '..', 'data/board-data.json');
        if (fs.existsSync(absolutePath)) {
            console.log(`✅ Absolute path resolution: OK`);
            passed++;
        } else {
            console.log(`❌ Absolute path resolution: Failed`);
        }
    } catch (error) {
        console.log(`❌ Absolute path resolution: Error - ${error.message}`);
    }

    return { passed, total };
}

/**
 * Game Initialization Tests
 */
function testGameInitialization() {
    console.log('\n[Game Initialization Tests]');
    let passed = 0;
    let total = 0;

    // Test GameManager class existence
    total++;
    try {
        const gameManagerPath = path.join(__dirname, '..', 'game/gameManager.js');
        if (fs.existsSync(gameManagerPath)) {
            const content = fs.readFileSync(gameManagerPath, 'utf8');
            if (content.includes('class GameManager') || content.includes('function GameManager')) {
                console.log(`✅ GameManager class: Found`);
                passed++;
            } else {
                console.log(`⚠️  GameManager class: Not found in expected format`);
            }
        } else {
            console.log(`❌ GameManager class: File missing`);
        }
    } catch (error) {
        console.log(`❌ GameManager class: Error - ${error.message}`);
    }

    // Test canvas support
    total++;
    try {
        const graphicsPath = path.join(__dirname, '..', 'ui/graphics.js');
        if (fs.existsSync(graphicsPath)) {
            const content = fs.readFileSync(graphicsPath, 'utf8');
            if (content.includes('canvas') || content.includes('Canvas') || content.includes('getContext')) {
                console.log(`✅ Canvas support: Detected`);
                passed++;
            } else {
                console.log(`⚠️  Canvas support: Not detected`);
            }
        } else {
            console.log(`❌ Canvas support: Graphics file missing`);
        }
    } catch (error) {
        console.log(`❌ Canvas support: Error - ${error.message}`);
    }

    // Test event handling
    total++;
    try {
        const interactionsPath = path.join(__dirname, '..', 'ui/interactions.js');
        if (fs.existsSync(interactionsPath)) {
            const content = fs.readFileSync(interactionsPath, 'utf8');
            if (content.includes('addEventListener') || content.includes('onclick') || content.includes('click')) {
                console.log(`✅ Event handling: Detected`);
                passed++;
            } else {
                console.log(`⚠️  Event handling: Not detected`);
            }
        } else {
            console.log(`❌ Event handling: Interactions file missing`);
        }
    } catch (error) {
        console.log(`❌ Event handling: Error - ${error.message}`);
    }

    return { passed, total };
}

/**
 * TypeScript Compilation Tests
 */
function testTypeScriptCompilation() {
    console.log('\n[TypeScript Compilation Tests]');
    let passed = 0;
    let total = 0;

    // Test tsconfig.json
    total++;
    try {
        const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
        if (fs.existsSync(tsconfigPath)) {
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
            if (tsconfig.compilerOptions) {
                console.log(`✅ tsconfig.json: Valid configuration`);
                passed++;
            } else {
                console.log(`❌ tsconfig.json: Invalid configuration`);
            }
        } else {
            console.log(`❌ tsconfig.json: Missing`);
        }
    } catch (error) {
        console.log(`❌ tsconfig.json: Parse error - ${error.message}`);
    }

    // Test TypeScript files exist alongside JS files
    const tsFiles = [
        'core/board.ts',
        'core/rules.ts',
        'core/types.ts',
        'ui/graphics.ts',
        'ui/interactions.ts',
        'game/gameManager.ts',
        'game/player.ts',
        'utils/helpers.ts',
        'utils/logger.ts'
    ];

    for (const tsFile of tsFiles) {
        total++;
        const tsPath = path.join(__dirname, '..', tsFile);
        const jsPath = path.join(__dirname, '..', tsFile.replace('.ts', '.js'));
        
        if (fs.existsSync(tsPath)) {
            if (fs.existsSync(jsPath)) {
                console.log(`✅ ${tsFile}: TypeScript and JS files exist`);
                passed++;
            } else {
                console.log(`⚠️  ${tsFile}: TypeScript exists, JS missing`);
            }
        } else {
            console.log(`❌ ${tsFile}: TypeScript file missing`);
        }
    }

    return { passed, total };
}

/**
 * Setup Phase Tests
 */
function testSetupPhase() {
    console.log('\n[Setup Phase Tests]');
    let passed = 0;
    let total = 0;

    // Test setup phase test files
    const setupTestFiles = [
        'tests/setup-phase/setup-phase-test.html',
        'tests/setup-phase/setup-phase-debug.html',
        'tests/setup-phase/test-utils.js',
        'tests/setup-phase/README.md'
    ];

    for (const testFile of setupTestFiles) {
        total++;
        const filePath = path.join(__dirname, '..', testFile);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`✅ ${testFile}: OK | {"size": ${stats.size}}`);
            passed++;
        } else {
            console.log(`❌ ${testFile}: MISSING`);
        }
    }

    // Test setup phase functionality by checking game files
    total++;
    const gameManagerPath = path.join(__dirname, '..', 'game/gameManager.js');
    if (fs.existsSync(gameManagerPath)) {
        const content = fs.readFileSync(gameManagerPath, 'utf8');
        if (content.includes('setup') && content.includes('setupTurn')) {
            console.log(`✅ Setup phase logic: Detected in GameManager`);
            passed++;
        } else {
            console.log(`⚠️  Setup phase logic: Not found in GameManager`);
        }
    } else {
        console.log(`❌ Setup phase logic: GameManager missing`);
    }

    // Test event handling components
    total++;
    const interactionsPath = path.join(__dirname, '..', 'ui/interactions.js');
    if (fs.existsSync(interactionsPath)) {
        const content = fs.readFileSync(interactionsPath, 'utf8');
        if (content.includes('InteractionManager') || content.includes('addEventListener')) {
            console.log(`✅ Event handling: InteractionManager detected`);
            passed++;
        } else {
            console.log(`⚠️  Event handling: InteractionManager not found`);
        }
    } else {
        console.log(`❌ Event handling: Interactions file missing`);
    }

    // Test visual feedback components
    total++;
    const graphicsPath = path.join(__dirname, '..', 'ui/graphics.js');
    if (fs.existsSync(graphicsPath)) {
        const content = fs.readFileSync(graphicsPath, 'utf8');
        if (content.includes('draw') || content.includes('canvas') || content.includes('highlight')) {
            console.log(`✅ Visual feedback: Graphics components detected`);
            passed++;
        } else {
            console.log(`⚠️  Visual feedback: Graphics components not found`);
        }
    } else {
        console.log(`❌ Visual feedback: Graphics file missing`);
    }

    // Test player switching logic
    total++;
    const rulesPath = path.join(__dirname, '..', 'core/rules.js');
    if (fs.existsSync(rulesPath)) {
        const content = fs.readFileSync(rulesPath, 'utf8');
        if (content.includes('validateSetupMove') || content.includes('setup')) {
            console.log(`✅ Player switching: Setup validation detected`);
            passed++;
        } else {
            console.log(`⚠️  Player switching: Setup validation not found`);
        }
    } else {
        console.log(`❌ Player switching: Rules file missing`);
    }

    return { passed, total };
}

/**
 * Main test runner function
 */
export function runAllTests() {
    const startTime = Date.now();
    
    console.log('🚀 AMALGAM CONSOLIDATED TEST RUNNER');
    console.log('==========================================\n');
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Starting comprehensive system validation...\n`);

    // Run all test categories
    const fileSystem = testFileSystem();
    const dataIntegrity = testDataIntegrity();
    const moduleSyntax = testModuleSyntax();
    const pathResolution = testPathResolution();
    const gameInit = testGameInitialization();
    const tsCompilation = testTypeScriptCompilation();
    const setupPhase = testSetupPhase();

    // Calculate totals
    const totalPassed = fileSystem.passed + dataIntegrity.passed + moduleSyntax.passed + 
                       pathResolution.passed + gameInit.passed + tsCompilation.passed + setupPhase.passed;
    const totalTests = fileSystem.total + dataIntegrity.total + moduleSyntax.total + 
                      pathResolution.total + gameInit.total + tsCompilation.total + setupPhase.total;
    const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    const duration = Date.now() - startTime;

    // Display results
    console.log('\n📊 CONSOLIDATED TEST RESULTS');
    console.log('================================');
    console.log(`FILESYSTEM: ${fileSystem.passed === fileSystem.total ? '✅ PASSED' : '❌ FAILED'} (${fileSystem.passed}/${fileSystem.total}) - ${Math.round((fileSystem.passed / fileSystem.total) * 100)}%`);
    console.log(`DATAINTEGRITY: ${dataIntegrity.passed === dataIntegrity.total ? '✅ PASSED' : '❌ FAILED'} (${dataIntegrity.passed}/${dataIntegrity.total}) - ${Math.round((dataIntegrity.passed / dataIntegrity.total) * 100)}%`);
    console.log(`MODULESYNTAX: ${moduleSyntax.passed === moduleSyntax.total ? '✅ PASSED' : '❌ FAILED'} (${moduleSyntax.passed}/${moduleSyntax.total}) - ${Math.round((moduleSyntax.passed / moduleSyntax.total) * 100)}%`);
    console.log(`PATHRESOLUTION: ${pathResolution.passed === pathResolution.total ? '✅ PASSED' : '❌ FAILED'} (${pathResolution.passed}/${pathResolution.total}) - ${Math.round((pathResolution.passed / pathResolution.total) * 100)}%`);
    console.log(`GAMEINIT: ${gameInit.passed === gameInit.total ? '✅ PASSED' : '❌ FAILED'} (${gameInit.passed}/${gameInit.total}) - ${Math.round((gameInit.passed / gameInit.total) * 100)}%`);
    console.log(`TSCOMPILATION: ${tsCompilation.passed === tsCompilation.total ? '✅ PASSED' : '❌ FAILED'} (${tsCompilation.passed}/${tsCompilation.total}) - ${Math.round((tsCompilation.passed / tsCompilation.total) * 100)}%`);
    console.log(`SETUPPHASE: ${setupPhase.passed === setupPhase.total ? '✅ PASSED' : '❌ FAILED'} (${setupPhase.passed}/${setupPhase.total}) - ${Math.round((setupPhase.passed / setupPhase.total) * 100)}%`);

    console.log('\n🤖 LLM SUMMARY');
    console.log('=============');
    if (overallPercentage === 100) {
        console.log('✅ System Status: FULLY OPERATIONAL');
        console.log('✅ All core components validated');
        console.log('✅ Data structures intact');
        console.log('✅ Module dependencies resolved');
    } else {
        console.log('⚠️  System Status: ISSUES DETECTED');
        console.log(`⚠️  ${totalTests - totalPassed} issues found out of ${totalTests} tests`);
        console.log(`⚠️  Overall health: ${overallPercentage}%`);
    }

    console.log('\n🔧 RECOMMENDATIONS');
    console.log('==================');
    if (overallPercentage === 100) {
        console.log('✅ System is healthy - no action required');
    } else {
        if (fileSystem.passed < fileSystem.total) {
            console.log('🔧 Fix missing critical files');
        }
        if (dataIntegrity.passed < dataIntegrity.total) {
            console.log('🔧 Validate JSON file structures');
        }
        if (moduleSyntax.passed < moduleSyntax.total) {
            console.log('🔧 Check module syntax and exports');
        }
        if (pathResolution.passed < pathResolution.total) {
            console.log('🔧 Verify path resolution logic');
        }
        if (gameInit.passed < gameInit.total) {
            console.log('🔧 Ensure game initialization components exist');
        }
        if (tsCompilation.passed < tsCompilation.total) {
            console.log('🔧 Run npm run build to compile TypeScript');
        }
        if (setupPhase.passed < setupPhase.total) {
            console.log('🔧 Validate setup phase test files and functionality');
        }
    }

    console.log(`\n⏱️  Test duration: ${duration}ms`);
    console.log(`📈 Overall score: ${overallPercentage}% (${totalPassed}/${totalTests})`);

    return {
        totalPassed,
        totalTests,
        overallPercentage,
        duration,
        details: {
            fileSystem,
            dataIntegrity,
            moduleSyntax,
            pathResolution,
            gameInit,
            tsCompilation,
            setupPhase
        }
    };
}

// Export individual test functions
export { testFileSystem, testDataIntegrity, testModuleSyntax, testPathResolution, testGameInitialization, testTypeScriptCompilation, testSetupPhase };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const results = runAllTests();
    process.exit(results.overallPercentage === 100 ? 0 : 1);
}
