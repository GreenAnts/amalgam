# Amalgam Game Development TODO

## 🎯 **SCALING SYSTEM ARCHITECTURAL IMPROVEMENT**

### **Priority: HIGH** - After current scaling issues are resolved

### **Problem Identified:**
The current scaling system has multiple hardcoded values scattered across different files, making it difficult to maintain consistent scaling across all visual elements.

### **Current Issues:**
- Hardcoded `gridSize = 25` in multiple places
- Hardcoded piece sizes (8px, 10px, 12px, 18px) in various files
- Hardcoded intersection radii in different locations
- Hardcoded indicator sizes scattered across graphics functions
- No single source of truth for scaling variables

### **Solution: Centralized Variable System**

#### **1. Create Central Scaling Configuration**
```
data/scaling-config.json
{
  "baseGridSize": 25,
  "currentGridSize": 45,
  "scalingFactor": 1.8,
  
  "pieceSizes": {
    "basePieceRadius": 10,
    "currentPieceRadius": 18,
    "portalScale": 0.7,
    "gemScale": 1.0
  },
  
  "intersectionSizes": {
    "baseIntersectionRadius": 6,
    "currentIntersectionRadius": 8
  },
  
  "indicatorSizes": {
    "baseSelectionRadius": 12,
    "baseValidMoveRadius": 8,
    "baseHoverRadius": 15,
    "lineWidthScale": 1.0
  }
}
```

#### **2. Files to Update for Variable System**
- `data/board-data.json` - Use scaling config values
- `data/piece-definitions.json` - Use scaling config values
- `ui/graphics.ts` - Import and use scaling config
- `ui/interactions.ts` - Use scaling config for coordinate conversion
- `game/gameManager.ts` - Use scaling config for all rendering
- `core/board.ts` - Use scaling config for piece creation

#### **3. Implementation Steps**
1. **Create scaling configuration file** with all current values
2. **Update all hardcoded values** to reference the scaling config
3. **Create scaling utility functions** for common calculations
4. **Test all visual elements** scale proportionally
5. **Document the scaling system** for future developers

#### **4. Benefits**
- ✅ **Single source of truth** for all scaling values
- ✅ **Easy to change** - modify one file to scale everything
- ✅ **Consistent proportions** - all elements scale together
- ✅ **Maintainable** - no more hunting for hardcoded values
- ✅ **Future-proof** - easy to add new scaling options

#### **5. Testing Requirements**
- [ ] All pieces scale proportionally
- [ ] All indicators scale proportionally  
- [ ] All intersections scale proportionally
- [ ] Click coordinates align with visual elements
- [ ] Setup phase indicators work correctly
- [ ] Movement indicators work correctly
- [ ] Selection highlights work correctly

---

## **Current Status:**
- ✅ **Board scaling** - Working with coordinate_scale: 45
- ✅ **Piece scaling** - Working with pieceRadius: 18
- ✅ **Intersection scaling** - Working with intersectionRadius: 8
- ⏳ **Indicator scaling** - In progress (using proper graphics functions)
- ⏳ **Variable system** - TODO (this improvement)

## **Next Steps:**
1. Verify current indicator fixes work properly
2. Test all visual elements scale correctly
3. Implement centralized variable system
4. Document the new scaling architecture
