#!/usr/bin/env node

/**
 * Amalgam Test Runner - Simple Entry Point
 * Imports and runs the consolidated test runner
 */

import { runAllTests } from './consolidated-test-runner.js';

// Run all tests and exit with appropriate code
const results = runAllTests();
process.exit(results.overallPercentage === 100 ? 0 : 1);
