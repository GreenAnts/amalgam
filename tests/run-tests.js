#!/usr/bin/env node

import { runAllTests } from './consolidated-test-runner.js';

const args = process.argv.slice(2);
const command = args[0] || 'all';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function showHelp() {
    console.log(`${colors.bright}${colors.cyan}🧪 Amalgam Test Suite Runner${colors.reset}\n`);
    console.log(`Usage: node tests/run-tests.js [command]\n`);
    console.log(`Commands:`);
    console.log(`  all        Run comprehensive test suite (default)`);
    console.log(`  help       Show this help message\n`);
    console.log(`Examples:`);
    console.log(`  node tests/run-tests.js all`);
    console.log(`  npm test\n`);
    console.log(`Web Interface:`);
    console.log(`  Open tests/unified-test-navigation.html in your browser`);
}

async function main() {
    switch (command) {
        case 'all':
            console.log(`${colors.bright}${colors.cyan}🚀 Running Comprehensive Test Suite...${colors.reset}\n`);
            const results = runAllTests();
            process.exit(results.totalPassed === results.totalTests ? 0 : 1);
            break;
            
        case 'help':
        default:
            showHelp();
            break;
    }
}

main().catch(error => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
});
