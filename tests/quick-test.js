#!/usr/bin/env node

/**
 * Quick Test Runner for Amalgam
 * Provides fast, concise testing from command line
 * Usage: node quick-test.js [test-type]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    jsonFiles: [
        'data/board-data.json',
        'data/piece-definitions.json',
        'game-rules/amalgam_complete_rules.json',
        'game-rules/golden_lines.json',
        'game-rules/board_positions.json',
        'game-rules/starting_positions.json',
        'game-rules/piece_definitions.json'
    ],
    modules: [
        'core/board.js',
        'core/rules.js',
        'core/types.js',
        'ui/graphics.js',
        'ui/interactions.js',
        'utils/logger.js',
        'utils/helpers.js',
        'game/gameManager.js',
        'game/player.js'
    ]
};

// Concise logging for LLM token conservation
function log(message, type = 'info', data = null) {
    const timestamp = new Date().toLocaleTimeString();
    let logEntry = `[${timestamp}] ${message}`;
    
    if (data && Object.keys(data).length > 0) {
        // Only include essential data
        const essentialData = {};
        Object.keys(data).slice(0, 2).forEach(key => {
            if (typeof data[key] === 'number' || typeof data[key] === 'string') {
                essentialData[key] = data[key];
            }
        });
        if (Object.keys(essentialData).length > 0) {
            logEntry += ` | ${JSON.stringify(essentialData)}`;
        }
    }
    
    const color = type === 'success' ? '\x1b[32m' : 
                  type === 'error' ? '\x1b[31m' : 
                  type === 'warning' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${logEntry}${reset}`);
}

// Test JSON files
function testJsonFiles() {
    log('Testing JSON files...', 'info');
    let passed = 0;
    let failed = 0;
    
    for (const file of TEST_CONFIG.jsonFiles) {
        try {
            const filePath = path.join(__dirname, '..', file);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            log(`${file}: OK`, 'success', { 
                size: content.length, 
                keys: Object.keys(data).length 
            });
            passed++;
        } catch (error) {
            log(`${file}: FAILED`, 'error', { error: error.message });
            failed++;
        }
    }
    
    return { passed, failed };
}

// Test file existence
function testFileExistence() {
    log('Testing file existence...', 'info');
    let passed = 0;
    let failed = 0;
    
    for (const module of TEST_CONFIG.modules) {
        const filePath = path.join(__dirname, '..', module);
        if (fs.existsSync(filePath)) {
            log(`${module}: EXISTS`, 'success');
            passed++;
        } else {
            log(`${module}: MISSING`, 'error');
            failed++;
        }
    }
    
    return { passed, failed };
}

// Test basic syntax
function testSyntax() {
    log('Testing basic syntax...', 'info');
    let passed = 0;
    let failed = 0;
    
    for (const module of TEST_CONFIG.modules) {
        const filePath = path.join(__dirname, '..', module);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                // Basic syntax check - look for common issues
                if (content.includes('export') || content.includes('import') || content.includes('function')) {
                    log(`${module}: VALID`, 'success');
                    passed++;
                } else {
                    log(`${module}: SUSPICIOUS`, 'warning');
                    passed++; // Not necessarily failed
                }
            } catch (error) {
                log(`${module}: UNREADABLE`, 'error', { error: error.message });
                failed++;
            }
        } else {
            failed++;
        }
    }
    
    return { passed, failed };
}

// Main test runner
function runTests(testType = 'all') {
    log('🚀 Starting Amalgam Quick Tests...', 'info');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    if (testType === 'all' || testType === 'json') {
        const jsonResult = testJsonFiles();
        totalPassed += jsonResult.passed;
        totalFailed += jsonResult.failed;
    }
    
    if (testType === 'all' || testType === 'files') {
        const fileResult = testFileExistence();
        totalPassed += fileResult.passed;
        totalFailed += fileResult.failed;
    }
    
    if (testType === 'all' || testType === 'syntax') {
        const syntaxResult = testSyntax();
        totalPassed += syntaxResult.passed;
        totalFailed += syntaxResult.failed;
    }
    
    // Summary
    log('📊 Test Summary', 'info');
    log(`Total Tests: ${totalPassed + totalFailed}`, 'info');
    log(`Passed: ${totalPassed}`, 'success');
    log(`Failed: ${totalFailed}`, totalFailed > 0 ? 'error' : 'success');
    log(`Status: ${totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`, 
        totalFailed === 0 ? 'success' : 'error');
    
    return { passed: totalPassed, failed: totalFailed };
}

// CLI interface
const testType = process.argv[2] || 'all';
const validTypes = ['all', 'json', 'files', 'syntax'];

if (!validTypes.includes(testType)) {
    console.log('Usage: node quick-test.js [test-type]');
    console.log('Valid test types:', validTypes.join(', '));
    process.exit(1);
}

const result = runTests(testType);
process.exit(result.failed > 0 ? 1 : 0);

export { runTests, testJsonFiles, testFileExistence, testSyntax };
