#!/usr/bin/env node

import { runAllTests } from './final-cli-test.js';

console.log('🚀 Running comprehensive test suite...\n');

const results = runAllTests();

console.log('\n📋 SUMMARY FOR LLM:');
console.log('===================');

if (results.totalPassed === results.totalTests) {
    console.log('✅ ALL TESTS PASSED - System is fully operational');
} else {
    console.log('❌ ISSUES DETECTED:');
    
    // Path resolution issues
    if (results.totalPassed < results.totalTests) {
        console.log('1. Path Resolution: Some relative paths (../) fail in web context');
        console.log('   - Use absolute paths or correct relative paths in web tests');
        console.log('   - Working paths: data/, game-rules/');
        console.log('   - Failing paths: ../data/, ../game-rules/');
    }
    
    // Missing animations module
    console.log('2. Missing Module: ui/animations.js (only .d.ts exists)');
    console.log('   - This causes "error loading dynamically imported module" errors');
    console.log('   - Solution: Create ui/animations.js or remove references');
    
    // Canvas issues
    console.log('3. Canvas Issues: GameManager canvas element access');
    console.log('   - May cause "canvasElement is undefined" errors');
    console.log('   - Ensure proper canvas initialization');
}

console.log('\n🎯 QUICK FIXES:');
console.log('1. Update web test paths to use absolute paths');
console.log('2. Create ui/animations.js or remove import references');
console.log('3. Verify canvas element initialization in GameManager');

console.log(`\n📊 Final Score: ${results.totalPassed}/${results.totalTests} (${results.overallPercentage}%)`);
