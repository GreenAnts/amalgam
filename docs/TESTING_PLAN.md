# 🧪 Amalgam Testing & Debug Framework

## Philosophy: Testing vs Debugging

### **🧪 Testing Suite Purpose**
- **Automated verification** of system components
- **Regression testing** to catch breaking changes  
- **Integration testing** across modules
- **Performance validation** (rendering, memory, etc.)
- **CI/CD compatibility** for future automation

### **🔍 Debug Suite Purpose**  
- **Step-by-step diagnosis** of specific issues
- **Interactive exploration** with manual control
- **Visual inspection** of rendering and state
- **Real-time problem isolation** during development
- **Detailed logging** with copy-paste functionality for LLM assistance

## File Structure & Organization

```
amalgam/
├── tests/                          # 🧪 AUTOMATED TESTING SUITE
│   ├── index.html                  # Testing hub & navigation
│   ├── unified-suite.html          # Main comprehensive test runner
│   ├── integration/                # Integration tests
│   ├── unit/                      # Unit tests for components
│   └── performance/               # Performance & memory tests
│
├── debug/                          # 🔍 MANUAL DEBUG TOOLS  
│   ├── index.html                  # Debug tool navigation
│   ├── board-analysis.html         # Board rendering analysis
│   ├── data-inspector.html         # Data structure inspection
│   ├── piece-validation.html       # Piece rendering validation
│   └── state-explorer.html         # Game state exploration
│
├── docs/                          # 📚 DOCUMENTATION
│   ├── TESTING_PLAN.md            # This file
│   ├── API.md                     # API documentation
│   └── DEBUGGING_GUIDE.md         # Debug procedures
│
└── [root files should be minimal] # Only core game files
```

## Testing Categories & Token Optimization

### **🎯 Token-Efficient Error Reporting**

Each test/debug tool should provide:

1. **📊 Summary Report** (for LLM context)
   ```
   Status: 7/10 tests PASSED, 3 FAILED
   Critical Issues: [board rendering, piece placement]
   ```

2. **🔍 Detailed Logs** (copy specific sections)
   - Separate copy buttons for each test category
   - Filterable output (errors only, specific component, etc.)
   - Structured JSON output for programmatic parsing

3. **📋 Issue Templates** (standardized problem reports)
   ```
   Issue: Board intersections not rendering
   Component: ui/graphics.js - drawStandardLines()
   Expected: 292 standard intersections
   Actual: 0 standard intersections
   Context: [minimal relevant data]
   ```

## Current Testing Tools Analysis

### **✅ Keep & Organize:**
- `unified-test.html` → `tests/unified-suite.html`
- `board-debug.html` → `debug/board-analysis.html`
- `TESTING_PLAN.md` → `docs/TESTING_PLAN.md`

### **🗑️ Remove (Legacy):**
- `test-cache-bust.html` (replaced by unified suite)
- `simple-test.html` (obsolete)
- `debug-test.html` (merged into board-analysis)
- Any standalone test files in root

### **🔄 Consolidate:**
- Multiple canvas tests → Single parameterized test
- Separate board/piece tests → Integrated validation
- Scattered debug tools → Organized debug suite

## Implementation Guidelines

### **For Test Files:**
```javascript
// Token-efficient error reporting
function reportIssue(component, expected, actual, context = {}) {
    return {
        timestamp: new Date().toISOString(),
        component,
        expected,
        actual,
        severity: determineSeverity(expected, actual),
        context: minimizeContext(context)
    };
}
```

### **For Debug Tools:**
```javascript
// Selective data copying
function copyRelevantData(section) {
    const relevantOnly = filterToEssentials(allData[section]);
    copyToClipboard(JSON.stringify(relevantOnly, null, 2));
}
```

## Cursor Rules Integration

The following rules should be added to `.cursor/rules/cursor-amalgam-rules.json`:

```json
{
  "testing_rules": {
    "file_organization": {
      "tests_location": "tests/ directory only",
      "debug_location": "debug/ directory only", 
      "no_root_tests": "Never create test files in project root",
      "naming_convention": "descriptive-kebab-case.html"
    },
    "test_design": {
      "token_efficiency": "Always provide copy buttons for specific error sections",
      "error_templates": "Use structured error reporting format",
      "minimal_context": "Include only essential data in error reports",
      "progressive_detail": "Summary first, details on demand"
    },
    "consolidation": {
      "avoid_duplication": "Merge similar tests into parameterized versions",
      "single_truth": "One authoritative test per component",
      "navigation_hubs": "Provide clear navigation between related tools"
    }
  },
  "debugging_rules": {
    "manual_tools": "Debug tools for step-by-step investigation",
    "automated_tests": "Test tools for regression verification", 
    "clear_separation": "Never mix automated testing with manual debugging",
    "copy_functionality": "All debug output must be copyable in sections"
  }
}
```

## Next Actions

1. **🏗️ Reorganize** existing files into proper structure
2. **🔧 Fix** the board data corruption issue  
3. **📦 Consolidate** redundant testing tools
4. **📋 Update** Cursor rules with testing guidelines
5. **🧹 Clean** root directory of test files

This approach provides:
- ✅ **Clear separation** of concerns (testing vs debugging)
- ✅ **Token-efficient** error reporting for LLM assistance  
- ✅ **Organized structure** for maintainability
- ✅ **User-friendly** navigation and copying
- ✅ **Scalable** framework for future development