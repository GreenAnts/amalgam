#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files to fix
const filesToFix = [
    'tests/unified-test-runner.html',
    'tests/json/simple-json-test.html',
    'tests/board/board-debug.html',
    'tests/debug/comparison-tool.html',
    'tests/debug/data-inspector.html',
    'tests/debug/debug-test.html'
];

function fixPathsInFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${filePath}`);
        return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;
    
    // Fix relative paths to absolute paths
    const pathReplacements = [
        { from: '../../data/', to: '/data/' },
        { from: '../data/', to: '/data/' },
        { from: '../../game-rules/', to: '/game-rules/' },
        { from: '../game-rules/', to: '/game-rules/' },
        { from: '../../ui/', to: '/ui/' },
        { from: '../ui/', to: '/ui/' },
        { from: '../../core/', to: '/core/' },
        { from: '../core/', to: '/core/' },
        { from: '../../utils/', to: '/utils/' },
        { from: '../utils/', to: '/utils/' },
        { from: '../../game/', to: '/game/' },
        { from: '../game/', to: '/game/' }
    ];
    
    pathReplacements.forEach(({ from, to }) => {
        if (content.includes(from)) {
            content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Fixed paths in: ${filePath}`);
        return true;
    } else {
        console.log(`ℹ️  No changes needed: ${filePath}`);
        return false;
    }
}

console.log('🔧 Fixing path resolution issues...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
    if (fixPathsInFile(file)) {
        fixedCount++;
    }
});

console.log(`\n📊 Summary: Fixed ${fixedCount}/${filesToFix.length} files`);
console.log('🎯 All relative paths have been converted to absolute paths');
