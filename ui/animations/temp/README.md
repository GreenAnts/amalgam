# Animation System for Amalgam Game Abilities

This directory contains the complete animation system for Amalgam game abilities, including particle systems, animation managers, and a comprehensive test suite.

## 🎯 **For Future LLMs & Developers**

**START HERE**: This README is the definitive guide for implementing new animations in Amalgam.

### **Quick Start for New Animations**
1. **Read this README** - Understand the architecture
2. **Check the test suite** - `tests/animations/animations-test-suite.html`
3. **Follow the implementation guide** - See "Adding New Animations" section below
4. **Update documentation** - Keep this README current

---

## 📁 **File Structure**

### **Core Animation Files**
- `fireball-animation.ts` - **V3** fireball animation (current development - MAGICAL WHISPY SMOKE)
- `fireball-animation-v1.ts` - **V1** fireball animation (stable smoke effect)
- `README.md` - This comprehensive guide

### **Versioning System**
- **V1**: Stable smoke effect with curved paths and proper particle cleanup
- **V2**: Cohesive spear with painterly texture and target shattering
- **V3**: **DEFAULT** - Magical whispy smoke with flowing wisps and ethereal particle effects
- **Test Suite**: Supports switching between versions via dropdown (V3 is default)

### **Test Files**
- `tests/animations/animations-test-suite.html` - **MAIN TEST SUITE** (use this for all testing)
- `ability-animation-test.html` - Legacy test page (deprecated)
- `fireball-animation-test.html` - Legacy fireball test (deprecated)

### **Integration Files**
- `tests.html` - Main test hub (includes animations test suite)
- `ui/graphics.ts` - Game graphics system (for piece rendering)

---

## 🏗️ **Architecture Overview**

### **Animation Test Suite** (`tests/animations/animations-test-suite.html`)
The **primary testing interface** for all animations:

- **Animation Type Subheaders**: Fireball, Tidal Wave, Sap, Launch, Portal Swap, Movement, Combat
- **Version Dropdown**: Different iterations of each animation (V1.0, V2.0, V3.0)
- **Formation Controls**: Horizontal, Vertical, Diagonal piece formations
- **Ability Types**: Standard vs Amplified versions
- **Range Controls**: Game-accurate distance testing (1-9)
- **Grid System**: Matches actual game coordinate system

### **Implementation Status**
- ✅ **Fireball V1**: Smoke effect with curved paths and particle cleanup
- ✅ **Fireball V2**: Cohesive spear with painterly texture and target shattering
- ✅ **Fireball V3**: **COMPLETE** - Magical whispy smoke with flowing wisps and ethereal particles
- ⏳ **Tidal Wave**: Not yet implemented
- ⏳ **Sap**: Not yet implemented  
- ⏳ **Launch**: Not yet implemented
- ⏳ **Portal Swap**: Not yet implemented
- ⏳ **Movement**: Not yet implemented
- ⏳ **Combat**: Not yet implemented

---

## 🚀 **Adding New Animations**

### **Step 1: Update Test Suite**
1. **Enable the animation type** in `tests/animations/animations-test-suite.html`:
   ```html
   <button class="animation-subheader" data-animation="tidalwave" data-implemented="true">Tidal Wave</button>
   ```

2. **Add version options** to the dropdown:
   ```html
   <select id="animationVersion" class="animation-dropdown">
       <option value="v1">Version 1.0</option>
       <option value="v2">Version 1.1</option>  <!-- New version -->
   </select>
   ```

### **Step 2: Create Animation Implementation**
1. **Create new animation file** (e.g., `tidalwave-animation.ts`):
   ```typescript
   export class TidalWaveAnimation {
       constructor(sourcePieces, targetPosition, isAmplified) {
           // Initialize tidal wave animation
       }
       
       update(deltaTime) {
           // Update animation state
       }
       
       draw(ctx) {
           // Render animation
       }
   }
   ```

2. **Add to animation manager** in `ability-animations.ts`:
   ```typescript
   import { TidalWaveAnimation } from './tidalwave-animation.js';
   
   export class AbilityAnimationManager {
       createTidalWaveAnimation(sourcePieces, targetPosition, isAmplified) {
           // Implementation
       }
   }
   ```

### **Step 3: Update Test Suite Logic**
In `tests/animations/animations-test-suite.html`, add to the `castAnimation()` method:
```javascript
switch (this.currentAnimationType) {
    case 'fireball':
        // Existing fireball logic
        break;
    case 'tidalwave':
        const tidalWaveId = this.animationManager.createTidalWaveAnimation(
            sourcePieces,
            this.targetPosition,
            isAmplified
        );
        break;
    // ... other cases
}
```

### **Step 4: Update Documentation**
1. **Update implementation status** in test suite header
2. **Add to this README** under "Implementation Status"
3. **Update navigation** in `tests.html` if needed

---

## 🎨 **Animation Features**

### **Fireball V3 - Magical Whispy System**
- **Formation Phase**: 3s slow gathering around ruby pieces with magical field influence
- **Flowing Phase**: 1.5s flowing together into cohesive magical stream
- **Piercing Phase**: 1s fast movement to target with organic curves and magical flow
- **Impact Phase**: 0.4s impact flash and target shattering
- **Dispersing Phase**: 2s outward dispersion and magical dissipation

### **Magical Wisp Characteristics**
- **Ethereal particle system** with smoke-like trails and transparency
- **Organic flow movement** using animated magical field influence
- **Varying wisp sizes** and alpha levels for natural appearance
- **Radial gradients** for soft, smoke-like rendering
- **Trail effects** that create flowing smoke appearance
- **Magical field influence** for organic, non-linear movement

### **Advanced Particle Features**
- **Trail system** with fade-out for smoke effects
- **Magical field** that creates organic flow patterns
- **Swirling motion** with independent rotation speeds
- **Natural drift** for realistic particle movement
- **Energy level variations** for dynamic effects
- **Smooth transitions** between animation phases

### **Target Effects**
- **Shattering animation** with multiple angular fragments
- **Outward dispersion** of fragments with rotation
- **Gravity effects** for realistic movement
- **Fade-out timing** for smooth completion

### **Particle Shapes**
- **Circle** - For fireball effects
- **Square** - For launch effects  
- **Triangle** - For sap effects
- **Line** - For tidal wave effects

### **Movement Patterns**
- **Radial** - Particles move outward from center
- **Linear** - Particles move in straight lines
- **Spiral** - Particles move in spiral patterns
- **Random** - Particles move in random directions

### **Ability Presets**
- **Fireball** - Red circular particles with radial movement
- **Tidal Wave** - Blue line particles with linear movement
- **Sap** - Green triangular particles with spiral movement
- **Launch** - Yellow square particles with linear movement

---

## 🧪 **Testing Guidelines**

### **Using the Test Suite**
1. **Open**: `tests/animations/animations-test-suite.html`
2. **Select Animation Type**: Click subheader button
3. **Choose Version**: Select from dropdown (V3 is default for fireball)
4. **Set Formation**: Horizontal, Vertical, or Diagonal
5. **Select Ability Type**: Standard or amplified
6. **Set Range**: 1-9 game distances
7. **Cast Animation**: Click cast button

### **Testing Checklist**
- [ ] Animation plays correctly
- [ ] Formation positioning works
- [ ] Range targeting is accurate
- [ ] Amplified version has more effects
- [ ] Performance is acceptable (< 200ms response)
- [ ] Visual effects match game style
- [ ] Coordinate system is accurate

---

## 🔧 **Technical Details**

### **Coordinate System**
- **Origin**: Top-left (50px from edges)
- **Grid Size**: 45px (matches game coordinate_scale)
- **X-axis**: Right direction (0, 1, 2, 3...)
- **Y-axis**: Down direction (0, 1, 2, 3...)
- **Formations**: All start from [0,0] position

### **Performance Requirements**
- **User interactions**: < 200ms response
- **Animation updates**: < 16ms per frame (60 FPS)
- **Particle count**: Optimize for target performance
- **Memory usage**: Clean up completed animations

### **Integration with Main Game**
```typescript
// In your game's main.ts or gameManager.ts
import { FireballAnimationManager } from './ui/animations/temp/fireball-animation.js';

class GameManager {
  private animationManager: FireballAnimationManager;
  
  constructor(canvas: HTMLCanvasElement) {
    this.animationManager = new FireballAnimationManager(canvas);
  }
  
  castAbility(abilityType: string, targetX: number, targetY: number) {
    // Game logic for casting ability
    // ...
    
    // Create animation
    const abilityId = this.animationManager.createFireballAnimation(
      sourcePieces,
      targetPosition,
      isAmplified
    );
  }
  
  update(deltaTime: number) {
    // Update game logic
    // ...
    
    // Update animations
    this.animationManager.update(deltaTime);
  }
  
  render() {
    // Render game
    // ...
    
    // Render animations on top
    this.animationManager.render();
  }
}
```

---

## 📋 **Development Workflow**

### **For New Animations**
1. **Plan the animation** - What should it look like?
2. **Update test suite** - Enable the animation type
3. **Implement animation** - Create the animation class
4. **Test thoroughly** - Use the test suite
5. **Optimize performance** - Ensure smooth playback
6. **Update documentation** - Keep this README current

### **For Animation Updates**
1. **Add new version** - Update dropdown options
2. **Implement changes** - Modify animation logic
3. **Test both versions** - Ensure backward compatibility
4. **Update documentation** - Document changes

### **For Bug Fixes**
1. **Reproduce in test suite** - Isolate the issue
2. **Fix the animation** - Update implementation
3. **Test thoroughly** - Ensure fix works
4. **Update documentation** - Document the fix

---

## 🎯 **Best Practices**

### **Animation Design**
- **Match game style** - Use consistent colors and effects
- **Consider performance** - Optimize particle counts
- **Test at all ranges** - Ensure animations work at all distances
- **Handle edge cases** - Test with different formations

### **Code Quality**
- **Follow existing patterns** - Use similar structure to fireball V3
- **Add proper comments** - Document complex logic
- **Handle errors gracefully** - Don't crash on invalid inputs
- **Keep it modular** - Separate concerns properly

### **Testing**
- **Test all formations** - Horizontal, vertical, diagonal
- **Test all ranges** - 1-9 distances
- **Test both types** - Standard and amplified
- **Test performance** - Ensure smooth playback

---

## 🔮 **Future Enhancements**

### **Planned Features**
- **Sound effects** integration
- **Screen shake** effects
- **Particle trails** and connections
- **Weather effects** (rain, snow, etc.)
- **Explosion effects** for combat
- **Portal effects** for movement

### **Animation Ideas**
- **Tidal Wave**: Area attack with wave-like particle effects
- **Sap**: Debuff with spiral particle patterns
- **Launch**: Movement boost with linear particle trails
- **Portal Swap**: Teleportation with portal-like effects
- **Movement**: Standard movement with subtle particle trails
- **Combat**: Combat resolution with impact effects

---

## 📞 **Support**

### **For LLMs**
- **Read this README first** - It contains all the information you need
- **Check the test suite** - See how existing animations work
- **Follow the patterns** - Use similar structure to fireball V3
- **Update documentation** - Keep this guide current

### **For Developers**
- **Use the test suite** - It's the primary testing interface
- **Follow the guidelines** - They ensure consistency
- **Test thoroughly** - Don't skip the testing checklist
- **Ask for help** - If something isn't clear, ask!

---

**Last Updated**: [Current Date]  
**Version**: 3.0  
**Maintained By**: Amalgam Development Team
