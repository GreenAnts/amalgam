/**
 * Test Utilities for Setup Phase Test Suite
 * Provides logging, status updates, and statistics tracking
 */

// Test results tracking
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

/**
 * Log a message to the test log panel
 * @param {string} level - Log level (info, success, warning, error)
 * @param {string} message - Message to log
 */
export function log(level, message) {
    const logDiv = document.getElementById('test-log');
    if (logDiv) {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${level}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
    }
    
    // Also log to console for debugging
    console.log(`[${level.toUpperCase()}] ${message}`);
}

/**
 * Update the status of a test card
 * @param {string} testId - ID of the test card element
 * @param {string} status - Status (info, success, error, warning)
 * @param {string} message - Status message
 */
export function updateTestStatus(testId, status, message) {
    const testCard = document.getElementById(testId);
    if (testCard) {
        const statusDiv = testCard.querySelector('.test-status');
        if (statusDiv) {
            statusDiv.className = `test-status status-${status}`;
            statusDiv.textContent = message;
        }
        
        // Update card styling based on status
        testCard.className = `test-card ${status}`;
    }
}

/**
 * Update the statistics display
 */
export function updateStats() {
    const totalElement = document.getElementById('total-tests');
    const passedElement = document.getElementById('passed-tests');
    const failedElement = document.getElementById('failed-tests');
    const successRateElement = document.getElementById('success-rate');
    
    if (totalElement) totalElement.textContent = testResults.total;
    if (passedElement) passedElement.textContent = testResults.passed;
    if (failedElement) failedElement.textContent = testResults.failed;
    
    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    if (successRateElement) successRateElement.textContent = `${successRate}%`;
}

/**
 * Reset test results
 */
export function resetTestResults() {
    testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    };
    updateStats();
}

/**
 * Add a test result
 * @param {boolean} passed - Whether the test passed
 * @param {string} testName - Name of the test
 */
export function addTestResult(passed, testName) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        log('success', `✅ ${testName}: Passed`);
    } else {
        testResults.failed++;
        log('error', `❌ ${testName}: Failed`);
    }
    updateStats();
}

/**
 * Add a warning result
 * @param {string} testName - Name of the test
 * @param {string} message - Warning message
 */
export function addWarningResult(testName, message) {
    testResults.total++;
    testResults.warnings++;
    log('warning', `⚠️ ${testName}: ${message}`);
    updateStats();
}

/**
 * Get current test results
 * @returns {Object} Current test results
 */
export function getTestResults() {
    return { ...testResults };
}

/**
 * Generate a summary report
 * @returns {Object} Summary report
 */
export function generateSummary() {
    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    
    return {
        timestamp: new Date().toISOString(),
        results: { ...testResults },
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            warnings: testResults.warnings,
            successRate: successRate
        },
        status: successRate === 100 ? 'PASSED' : successRate >= 80 ? 'WARNING' : 'FAILED'
    };
}

/**
 * Copy results to clipboard for LLM analysis
 */
export function copyResultsToClipboard() {
    const summary = generateSummary();
    const resultsText = JSON.stringify(summary, null, 2);
    
    navigator.clipboard.writeText(resultsText).then(() => {
        log('success', '📋 Results copied to clipboard for LLM analysis');
    }).catch(err => {
        log('error', `Failed to copy results: ${err.message}`);
    });
}

/**
 * Run all tests automatically
 */
export async function runAllTests() {
    log('info', '🚀 Starting comprehensive setup phase test suite...');
    resetTestResults();
    
    // Run all test functions
    const testFunctions = [
        'runFileSystemTest',
        'runModuleLoadingTest', 
        'runTypeScriptTest',
        'runGameInitializationTest',
        'runPlayerSwitchingTest',
        'runPiecePlacementTest',
        'runStartingAreaTest',
        'runCanvasEventTest',
        'runInteractionManagerTest',
        'runMoveIntentTest',
        'runHighlightingTest',
        'runCanvasRenderingTest'
    ];
    
    for (const testFunc of testFunctions) {
        if (window[testFunc] && typeof window[testFunc] === 'function') {
            try {
                await window[testFunc]();
                // Add small delay between tests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                log('error', `Test ${testFunc} failed: ${error.message}`);
            }
        }
    }
    
    const summary = generateSummary();
    log('info', `🎯 Test suite completed. Success rate: ${summary.summary.successRate}%`);
    
    return summary;
}

/**
 * Initialize the test suite
 */
export function initializeTestSuite() {
    log('info', '🎮 Setup Phase Test Suite Initialized');
    log('info', 'Ready to run comprehensive setup phase tests');
    
    // Set up global test functions
    window.runAllTests = runAllTests;
    window.copyResultsToClipboard = copyResultsToClipboard;
    window.resetTestResults = resetTestResults;
    
    // Auto-run basic tests on page load
    setTimeout(() => {
        if (window.runFileSystemTest) window.runFileSystemTest();
        if (window.runModuleLoadingTest) window.runModuleLoadingTest();
        if (window.runTypeScriptTest) window.runTypeScriptTest();
    }, 500);
}

// Auto-initialize when module loads
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeTestSuite);
}
