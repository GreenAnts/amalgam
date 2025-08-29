#!/bin/bash

# Protect critical test files from deletion by multiple agents
# Run this script to make test files read-only and prevent accidental deletion

echo "🔒 Protecting critical test files from multiple agent conflicts..."

# Make test files read-only to prevent deletion
chmod 444 tests/consolidated-test-runner.js
chmod 444 tests/run-tests.js

# Create backup copies
cp tests/consolidated-test-runner.js tests/consolidated-test-runner.js.backup
cp tests/run-tests.js tests/run-tests.js.backup

echo "✅ Test files protected and backed up"
echo "📁 Backup files created:"
echo "   - tests/consolidated-test-runner.js.backup"
echo "   - tests/run-tests.js.backup"

# Function to restore files if needed
echo ""
echo "To restore files if needed, run:"
echo "  chmod 644 tests/consolidated-test-runner.js tests/run-tests.js"
echo "  cp tests/consolidated-test-runner.js.backup tests/consolidated-test-runner.js"
echo "  cp tests/run-tests.js.backup tests/run-tests.js"
