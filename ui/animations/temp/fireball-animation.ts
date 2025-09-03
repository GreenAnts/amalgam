// Fireball Animation V3 for Amalgam Game
// Magical whispy smoke with flowing wisps and ethereal particle effects

export interface FireballAnimationConfig {
  sourcePieces: Array<{ x: number; y: number }>; // 2 Ruby/Amalgam pieces in formation
  targetPosition: { x: number; y: number }; // Target piece position
  isAmplified: boolean; // Whether Void is part of formation
  canvas: HTMLCanvasElement;
  onTargetDestroyed?: () => void; // Callback when target is destroyed
}

export interface MagicWisp {
  id: number;
  // Core properties
  x: number;
  y: number;
  vx: number;
  vy: number;
  
  // Wisp characteristics
  size: number;
  baseSize: number;
  color: string;
  alpha: number;
  maxAlpha: number;
  
  // Animation state
  phase: 'forming' | 'flowing' | 'piercing' | 'impact' | 'dispersing';
  progress: number; // 0-1 progress through current phase
  
  // Flow properties
  flowAngle: number; // Direction of internal flow
  flowSpeed: number; // Speed of internal movement
  swirlAngle: number; // Swirling motion
  swirlSpeed: number; // Swirling speed
  driftX: number; // Natural drift
  driftY: number; // Natural drift
  
  // Life cycle
  life: number;
  maxLife: number;
  
  // Trail for smoke effect
  trail: Array<{ x: number; y: number; alpha: number; size: number }>;
  maxTrailLength: number;
  
  // Dispersion after impact
  dispersionAngle: number;
  dispersionSpeed: number;
  
  // Magical properties
  magicField: number; // Influence of magical field
  energyLevel: number; // Current energy level

  // Distance-aware targeting
  finalTargetX: number;
  finalTargetY: number;
  reachedEnd: boolean;

  // Charge-phase vertical oscillation (prevents straight-line alignment)
  anchorX: number;       // baseline X to oscillate around
  anchorY: number;       // baseline Y to oscillate around
  chargeAmp: number;     // oscillation amplitude in px
  chargePhase: number;   // phase offset
  chargeSpeed: number;   // frequency multiplier

  // Flow-phase dispersion control
  perpOffset: number;    // stable perpendicular offset for staging cluster

  // Smoothing state for target blending
  lastTX?: number;
  lastTY?: number;
  hasLastTarget?: boolean;
}

export interface TargetFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  alpha: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

export class FireballAnimation {
  private magicWisps: MagicWisp[] = [];
  private config: FireballAnimationConfig;
  private animationTime: number = 0;
  private isActive: boolean = true;
  
  // Formation and movement
  private formationCenter: { x: number; y: number };
  private firingDirection: { x: number; y: number };
  private targetReached: boolean = false;
  private targetDestroyed: boolean = false;
  
  // Target effects
  private targetFragments: TargetFragment[] = [];
  private targetShatterTime: number = 0;
  
  // Magical field for organic movement
  private magicField: Array<Array<{ angle: number; strength: number }>> = [];
  private fieldUpdateTime: number = 0;
  
  // Animation phases timing (in milliseconds) - REDUCED for faster response
  private readonly PHASE_TIMINGS = {
    FORMING: 1500,    // 1.5s formation around rubies (reduced from 3s)
    FLOWING: 1000,    // 1s flowing together (reduced from 1.5s)
    PIERCING: 800,    // 0.8s fast movement to target (reduced from 1s)
    IMPACT: 200,      // 0.2s impact effect (reduced from 0.4s)
    DISPERSING: 1500  // 1.5s dispersion and fade (reduced from 2s)
  };

  constructor(config: FireballAnimationConfig) {
    console.log('✨ FIREBALL V3 - MAGICAL WHISPY SMOKE WITH FLOWING WISPS!');
    console.log('🎯 V3 Features: Ethereal particles, organic flow, magical wisps');
    
    this.config = config;
    this.formationCenter = this.calculateFormationCenter();
    this.firingDirection = this.calculateFiringDirection();
    this.initializeMagicField();
    this.initializeMagicWisps();
  }

  private calculateFormationCenter(): { x: number; y: number } {
    const [piece1, piece2] = this.config.sourcePieces;
    return {
      x: (piece1.x + piece2.x) / 2,
      y: (piece1.y + piece2.y) / 2
    };
  }

  private calculateFiringDirection(): { x: number; y: number } {
    const dx = this.config.targetPosition.x - this.formationCenter.x;
    const dy = this.config.targetPosition.y - this.formationCenter.y;
    
    // Normalize the direction vector
    const length = Math.sqrt(dx * dx + dy * dy);
    return {
      x: dx / length,
      y: dy / length
    };
  }

  private initializeMagicField(): void {
    // Create a magical flow field for organic movement
    const fieldSize = 20;
    this.magicField = [];
    
    for (let i = 0; i < fieldSize; i++) {
      this.magicField[i] = [];
      for (let j = 0; j < fieldSize; j++) {
        // Create organic, flowing patterns
        const angle = Math.sin(i * 0.3) * Math.cos(j * 0.2) * Math.PI;
        const strength = 0.5 + Math.sin(i * 0.5) * Math.cos(j * 0.4) * 0.5;
        this.magicField[i][j] = { angle, strength };
      }
    }
  }

  private updateMagicField(deltaTime: number): void {
    this.fieldUpdateTime += deltaTime;
    
    // Animate the magical field
    for (let i = 0; i < this.magicField.length; i++) {
      for (let j = 0; j < this.magicField[i].length; j++) {
        const field = this.magicField[i][j];
        field.angle += Math.sin(this.fieldUpdateTime * 0.001 + i * 0.1) * 0.01;
        field.strength = 0.5 + Math.sin(this.fieldUpdateTime * 0.002 + i * 0.2) * Math.cos(this.fieldUpdateTime * 0.001 + j * 0.3) * 0.5;
      }
    }
  }

  private getFieldInfluence(x: number, y: number): { angle: number; strength: number } {
    // Get influence from the magical field at a specific position
    const fieldX = Math.floor((x / 800) * this.magicField.length);
    const fieldY = Math.floor((y / 600) * this.magicField[0].length);
    
    if (fieldX >= 0 && fieldX < this.magicField.length && 
        fieldY >= 0 && fieldY < this.magicField[0].length) {
      return this.magicField[fieldX][fieldY];
    }
    
    return { angle: 0, strength: 0 };
  }

  private initializeMagicWisps(): void {
    const wispCount = this.config.isAmplified ? 60 : 45;
    
    for (let i = 0; i < wispCount; i++) {
      const wisp = this.createMagicWisp(i);
      this.magicWisps.push(wisp);
    }
  }

  private createMagicWisp(index: number): MagicWisp {
    const [piece1, piece2] = this.config.sourcePieces;
    
    // Create dispersed, organic formation instead of rigid circles
    const formationPattern = this.getDispersedFormationPosition(index);
    
    // Shared end point: center of the target piece
    const finalTargetX = this.config.targetPosition.x;
    const finalTargetY = this.config.targetPosition.y;

    const anchorX = formationPattern.x;
    const anchorY = formationPattern.y;
    const chargeAmp = 4 + Math.random() * 8;
    const chargePhase = Math.random() * Math.PI * 2;
    const chargeSpeed = 1 + Math.random() * 1.5;
    const perpOffset = (Math.random() * 2 - 1) * 18; // ±18px perpendicular dispersion during flowing

    return {
      id: index,
      x: formationPattern.x,
      y: formationPattern.y,
      vx: 0,
      vy: 0,
      size: 3 + Math.random() * 6, // Varying wisp sizes
      baseSize: 3 + Math.random() * 6,
      color: this.getMagicWispColor(),
      alpha: 0.3 + Math.random() * 0.4, // Start semi-transparent
      maxAlpha: 0.7 + Math.random() * 0.3,
      phase: 'forming',
      progress: 0,
      flowAngle: Math.random() * Math.PI * 2,
      flowSpeed: 0.02 + Math.random() * 0.03,
      swirlAngle: Math.random() * Math.PI * 2,
      swirlSpeed: 0.03 + Math.random() * 0.04,
      driftX: (Math.random() - 0.5) * 0.5,
      driftY: 0, // prevent downward sag during charge
      life: 0,
      maxLife: 7000,
      trail: [],
      maxTrailLength: 8 + Math.floor(Math.random() * 6),
      dispersionAngle: Math.random() * Math.PI * 2,
      dispersionSpeed: 0.5 + Math.random() * 1.5,
      magicField: Math.random() * 0.3,
      energyLevel: 0.3 + Math.random() * 0.4,
      finalTargetX,
      finalTargetY,
      reachedEnd: false,
      anchorX,
      anchorY,
      chargeAmp,
      chargePhase,
      chargeSpeed,
      perpOffset
    };
  }

  private getDispersedFormationPosition(index: number): { x: number; y: number } {
    const [piece1, piece2] = this.config.sourcePieces;
    
    // Create multiple emission sources around each ruby piece
    const emissionSources = this.createEmissionSources(piece1, piece2);
    
    // Use Voronoi-like clustering for natural dispersion
    const clusterIndex = index % emissionSources.length;
    const baseSource = emissionSources[clusterIndex];
    
    // Add organic randomness using Perlin-like noise
    const noiseX = this.simplexNoise(index * 0.1, 0) * 25;
    const noiseY = this.simplexNoise(0, index * 0.1) * 25;
    
    // Create natural clustering with some particles closer, some further
    const clusterRadius = 15 + Math.random() * 20;
    const clusterAngle = Math.random() * Math.PI * 2;
    
    // Add turbulence for smoke-like dispersion
    const turbulenceX = Math.sin(index * 0.3) * Math.cos(index * 0.2) * 12;
    const turbulenceY = Math.cos(index * 0.2) * Math.sin(index * 0.3) * 12;
    
    return {
      x: baseSource.x + Math.cos(clusterAngle) * clusterRadius + noiseX + turbulenceX,
      y: baseSource.y + Math.sin(clusterAngle) * clusterRadius + noiseY + turbulenceY
    };
  }

  private createEmissionSources(piece1: { x: number; y: number }, piece2: { x: number; y: number }): Array<{ x: number; y: number }> {
    const sources: Array<{ x: number; y: number }> = [];
    
    // Create multiple emission points around each ruby piece
    const rubyRadius = 18;
    const emissionPointsPerRuby = 6;
    
    // Emission points around first ruby
    for (let i = 0; i < emissionPointsPerRuby; i++) {
      const angle = (Math.PI * 2 * i) / emissionPointsPerRuby;
      const radius = rubyRadius + (Math.random() - 0.5) * 8;
      sources.push({
        x: piece1.x + Math.cos(angle) * radius,
        y: piece1.y + Math.sin(angle) * radius
      });
    }
    
    // Emission points around second ruby
    for (let i = 0; i < emissionPointsPerRuby; i++) {
      const angle = (Math.PI * 2 * i) / emissionPointsPerRuby;
      const radius = rubyRadius + (Math.random() - 0.5) * 8;
      sources.push({
        x: piece2.x + Math.cos(angle) * radius,
        y: piece2.y + Math.sin(angle) * radius
      });
    }
    
    // Add some emission points in the space between rubies
    const midPoint = this.formationCenter;
    const betweenPoints = 4;
    for (let i = 0; i < betweenPoints; i++) {
      const t = (i + 1) / (betweenPoints + 1);
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      sources.push({
        x: midPoint.x + offsetX,
        y: midPoint.y + offsetY
      });
    }
    
    return sources;
  }

  // Simplified Perlin-like noise for organic randomness
  private simplexNoise(x: number, y: number): number {
    const n0 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const n1 = Math.sin(x * 39.233 + y * 12.9898) * 43758.5453;
    return (n0 + n1) % 1;
  }

  private getMagicWispColor(): string {
    // Create magical, ethereal red colors with variations
    const baseRed = 139;
    const variations = [
      `rgba(${baseRed}, 0, 0, 0.8)`,           // Dark red
      `rgba(${baseRed + 20}, 0, 0, 0.7)`,      // Medium red
      `rgba(${baseRed + 40}, 0, 0, 0.9)`,      // Bright red
      `rgba(${baseRed + 60}, 0, 0, 0.8)`,      // Vibrant red
      `rgba(${baseRed + 80}, 0, 0, 0.7)`,      // Brightest red
      `rgba(${baseRed + 100}, 20, 0, 0.6)`     // Magical orange-red
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  private addToTrail(wisp: MagicWisp): void {
    // Add current position to trail for smoke effect
    wisp.trail.push({
      x: wisp.x,
      y: wisp.y,
      alpha: wisp.alpha * 0.8,
      size: wisp.size * 0.7
    });
    
    // Limit trail length
    if (wisp.trail.length > wisp.maxTrailLength) {
      wisp.trail.shift();
    }
  }

  private updateFormingPhase(wisp: MagicWisp, deltaTime: number): void {
    // Slowly form with organic, dispersed gathering
    wisp.progress += deltaTime / this.PHASE_TIMINGS.FORMING;
    
    if (wisp.progress >= 1) {
      wisp.phase = 'flowing';
      wisp.progress = 0;
    }
    
    // During formation, wisps gather organically toward the center
    // Instead of rigid circles, use natural flow patterns
    
    // Calculate natural gathering position using gradient flow
    const gatheringPosition = this.getNaturalGatheringPosition(wisp);
    
    // 2D oscillation (spherical/figure-8) around gathering point using local tangent/normal
    const t = this.animationTime * 0.002 * wisp.chargeSpeed + wisp.chargePhase;
    // Ease-in oscillation to avoid snap and prep for smooth handoff
    const easeIn = Math.min(1, Math.max(0, wisp.progress));
    const easeOut = Math.min(1, Math.max(0, 1 - wisp.progress));
    const ampScale = 0.85 * easeIn + 0.15; // grow from 0.15 to 1.0 through phase
    const tanX = this.firingDirection.x;
    const tanY = this.firingDirection.y;
    const norX = -tanY;
    const norY = tanX;
    const oscN = (wisp.chargeAmp * ampScale) * Math.sin(t);
    const oscT = (wisp.chargeAmp * 0.6 * ampScale) * Math.sin(2 * t); // slight figure-8
    const offsetX = norX * oscN + tanX * oscT;
    const offsetY = norY * oscN + tanY * oscT;
    
    // Raw target
    const rawTX = gatheringPosition.x + offsetX;
    const rawTY = gatheringPosition.y + offsetY;
    
    // Blend with previous to avoid micro-resets
    let targetX = rawTX;
    let targetY = rawTY;
    if (wisp.hasLastTarget) {
      targetX = (wisp.lastTX! * 0.85) + (rawTX * 0.15);
      targetY = (wisp.lastTY! * 0.85) + (rawTY * 0.15);
    }
    wisp.lastTX = targetX;
    wisp.lastTY = targetY;
    wisp.hasLastTarget = true;
    
    // Smooth movement toward oscillating target
    const dx = targetX - wisp.x;
    const dy = targetY - wisp.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0.5) {
      const moveSpeed = 0.8 + Math.random() * 0.4;
      const step = moveSpeed * 0.12;
      wisp.vx = (dx / distance) * step;
      wisp.vy = (dy / distance) * step;
    }
    
    // Update position
    wisp.x += wisp.vx;
    wisp.y += wisp.vy;
    
    // Add magical swirling and flow
    wisp.swirlAngle += wisp.swirlSpeed;
    wisp.flowAngle += wisp.flowSpeed;
    
    // Enhanced magical field influence for organic movement
    const fieldInfluence = this.getFieldInfluence(wisp.x, wisp.y);
    // Light, smoothed influence
    wisp.x += Math.cos(fieldInfluence.angle) * fieldInfluence.strength * 0.15;
    wisp.y += Math.sin(fieldInfluence.angle) * fieldInfluence.strength * 0.15;
    
    // Small unbiased drift (very low to prevent jitter)
    wisp.x += wisp.driftX * 0.35;
    wisp.y += wisp.driftY * 0.35;
    
    // Gradually increase alpha and size with organic variation
    wisp.alpha = Math.min(wisp.alpha + 0.002, wisp.maxAlpha);
    wisp.size = wisp.baseSize + Math.sin(wisp.progress * Math.PI * 1.5) * 3;
    
    // Add to trail
    this.addToTrail(wisp);
  }

  private getNaturalGatheringPosition(wisp: MagicWisp): { x: number; y: number } {
    // Create organic gathering pattern instead of rigid circles
    const baseAngle = (wisp.id * 137.5) % 360; // Golden angle for natural distribution
    const baseRadius = 20 + Math.sin(wisp.id * 0.1) * 15; // Varying distances
    
    // Add some wisps closer to center, some further out
    const distanceVariation = Math.sin(wisp.id * 0.3) * 0.3 + 0.7;
    const radius = baseRadius * distanceVariation;
    
    // Use spiral-like pattern for organic distribution
    const spiralAngle = baseAngle * (Math.PI / 180) + wisp.id * 0.1;
    const spiralRadius = radius * (1 + Math.sin(wisp.id * 0.2) * 0.2);
    
    // Add turbulence for smoke-like dispersion
    const turbulenceX = Math.sin(wisp.id * 0.4) * Math.cos(wisp.id * 0.3) * 8;
    const turbulenceY = Math.cos(wisp.id * 0.3) * Math.sin(wisp.id * 0.4) * 8;
    
    return {
      x: this.formationCenter.x + Math.cos(spiralAngle) * spiralRadius + turbulenceX,
      y: this.formationCenter.y + Math.sin(spiralAngle) * spiralRadius + turbulenceY
    };
  }

  private updateFlowingPhase(wisp: MagicWisp, deltaTime: number): void {
    // Wisps flow together into a cohesive magical stream without aligning on a line
    wisp.progress += deltaTime / this.PHASE_TIMINGS.FLOWING;
    
    if (wisp.progress >= 1) {
      wisp.phase = 'piercing';
      wisp.progress = 0;
    }
    
    // Staging cluster ahead of rubies with perpendicular dispersion per wisp
    const normalX = -this.firingDirection.y;
    const normalY = this.firingDirection.x;
    const stagingBaseX = this.formationCenter.x + this.firingDirection.x * 40;
    const stagingBaseY = this.formationCenter.y + this.firingDirection.y * 40;
    let stagingX = stagingBaseX + normalX * wisp.perpOffset;
    let stagingY = stagingBaseY + normalY * wisp.perpOffset;

    // 2D oscillation (spherical/figure-8) around staging point
    const t = this.animationTime * 0.002 * wisp.chargeSpeed + wisp.chargePhase + 0.7;
    // Ease-out oscillation so it smoothly settles before piercing
    const easeOut = Math.min(1, Math.max(0, 1 - wisp.progress));
    const ampScale = 0.2 + 0.8 * easeOut; // shrink as we approach the end of flowing
    const tanX = this.firingDirection.x;
    const tanY = this.firingDirection.y;
    const oscN = (wisp.chargeAmp * ampScale) * Math.sin(t);
    const oscT = (wisp.chargeAmp * 0.55 * ampScale) * Math.sin(2 * t);
    const offsetX = normalX * oscN + tanX * oscT;
    const offsetY = normalY * oscN + tanY * oscT;
    stagingX += offsetX;
    stagingY += offsetY;

    // Smooth movement toward oscillating staging position with target blending
    let dx = stagingX - wisp.x;
    let dy = stagingY - wisp.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0.5) {
      const flowSpeed = 1.2 + Math.random() * 0.8;
      const step = flowSpeed * 0.09;
      wisp.vx = (dx / distance) * step;
      wisp.vy = (dy / distance) * step;
    }

    // Update position
    wisp.x += wisp.vx;
    wisp.y += wisp.vy;

    // Continue magical flow influences (small)
    wisp.swirlAngle += wisp.swirlSpeed * 1.3;
    wisp.flowAngle += wisp.flowSpeed * 1.3;
    const fieldInfluence = this.getFieldInfluence(wisp.x, wisp.y);
    wisp.x += Math.cos(fieldInfluence.angle) * fieldInfluence.strength * 0.15;
    wisp.y += Math.sin(fieldInfluence.angle) * fieldInfluence.strength * 0.15;

    // Minor unbiased drift
    wisp.x += wisp.driftX * 0.35;
    wisp.y += wisp.driftY * 0.35;
    
    // Add to trail
    this.addToTrail(wisp);
  }

  private updatePiercingPhase(wisp: MagicWisp, deltaTime: number): void {
    // Distance-aware, target-position-based piercing (not purely time-based)
    const distToTarget = this.getDistanceToTarget();
    const baseSpeed = 2.8;
    const distanceScaledSpeed = baseSpeed + Math.min(6, distToTarget * 0.004); // scale with target distance

    // Desired target with slight organic curve
    const fieldInfluence = this.getFieldInfluence(wisp.x, wisp.y);
    const curveIntensity = 12 * wisp.magicField;
    const targetX = wisp.finalTargetX + Math.cos(fieldInfluence.angle) * curveIntensity;
    const targetY = wisp.finalTargetY + Math.sin(fieldInfluence.angle) * curveIntensity;

    const dx = targetX - wisp.x;
    const dy = targetY - wisp.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0.5) {
      wisp.vx = (dx / distance) * distanceScaledSpeed;
      wisp.vy = (dy / distance) * distanceScaledSpeed;
    }

    // Update position
    wisp.x += wisp.vx;
    wisp.y += wisp.vy;

    // Enhanced magical swirling and flow during piercing
    wisp.swirlAngle += wisp.swirlSpeed * 3;
    wisp.flowAngle += wisp.flowSpeed * 3;

    // Natural drift
    wisp.x += wisp.driftX * 1.2;

    // Add to trail
    this.addToTrail(wisp);

    // Transition to impact when reaching the shared end point
    if (!wisp.reachedEnd && distance < 6) {
      wisp.reachedEnd = true;
      wisp.phase = 'impact';
      wisp.progress = 0;
    }
  }

  private updateImpactPhase(wisp: MagicWisp, deltaTime: number): void {
    // Impact effect at target with magical flash
    wisp.progress += deltaTime / this.PHASE_TIMINGS.IMPACT;
    
    if (wisp.progress >= 1) {
      wisp.phase = 'dispersing';
      wisp.progress = 0;
      
      // Create target shattering effect on first wisp to reach impact
      if (!this.targetDestroyed) {
        this.createTargetShatteringEffect();
        this.targetDestroyed = true;
      }
    }
    
    // Impact flash effect
    wisp.alpha = wisp.maxAlpha + Math.sin(wisp.progress * Math.PI * 6) * 0.3;
    wisp.size = wisp.baseSize * (1 + Math.sin(wisp.progress * Math.PI * 4) * 0.5);
    
    // Add to trail
    this.addToTrail(wisp);
  }

  private updateDispersingPhase(wisp: MagicWisp, deltaTime: number): void {
    // Disperse and fade after impact with magical dissipation
    wisp.progress += deltaTime / this.PHASE_TIMINGS.DISPERSING;
    
    if (wisp.progress >= 1) {
      wisp.alpha = 0;
      return;
    }
    
    // Continue dispersing from the shared end point at the target center
    const backSideX = wisp.finalTargetX;
    const backSideY = wisp.finalTargetY;
    
    const disperseProgress = wisp.progress;
    const disperseDistance = 40 * disperseProgress;
    
    const targetX = backSideX + Math.cos(wisp.dispersionAngle) * disperseDistance;
    const targetY = backSideY + Math.sin(wisp.dispersionAngle) * disperseDistance;
    
    // Smooth movement toward dispersion position
    const dx = targetX - wisp.x;
    const dy = targetY - wisp.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 1) {
      const disperseSpeed = wisp.dispersionSpeed;
      wisp.vx = (dx / distance) * disperseSpeed;
      wisp.vy = (dy / distance) * disperseSpeed;
    }
    
    // Update position
    wisp.x += wisp.vx;
    wisp.y += wisp.vy;
    
    // Enhanced magical swirling during dispersion
    wisp.swirlAngle += wisp.swirlSpeed * 4;
    wisp.flowAngle += wisp.flowSpeed * 4;
    
    // Magical field influence
    const fieldInfluence = this.getFieldInfluence(wisp.x, wisp.y);
    wisp.x += Math.cos(fieldInfluence.angle) * fieldInfluence.strength * 1.2;
    wisp.y += Math.sin(fieldInfluence.angle) * fieldInfluence.strength * 1.2;
    
    // Natural drift (no vertical bias)
    wisp.x += wisp.driftX * 2.2;
    
    // Fade out
    wisp.alpha *= 0.97;
    wisp.size *= 0.98;
    
    // Add to trail
    this.addToTrail(wisp);
  }

  private getDistanceToTarget(): number {
    const dx = this.config.targetPosition.x - this.formationCenter.x;
    const dy = this.config.targetPosition.y - this.formationCenter.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createTargetShatteringEffect(): void {
    if (this.targetDestroyed) return;
    
    this.targetShatterTime = this.animationTime;
    
    // Call the callback to notify that target is destroyed
    if (this.config.onTargetDestroyed) {
      this.config.onTargetDestroyed();
    }
    
    // Create target fragments (shattered pieces)
    const fragmentCount = this.config.isAmplified ? 40 : 30;
    
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 * i) / fragmentCount;
      const speed = 2 + Math.random() * 4;
      const size = 2 + Math.random() * 5;
      
      this.targetFragments.push({
        x: this.config.targetPosition.x,
        y: this.config.targetPosition.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 2500 + Math.random() * 1500,
        alpha: 0.9 + Math.random() * 0.1,
        size,
        color: Math.random() > 0.7 ? '#FFFFFF' : '#FF4444', // White and red fragments
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.4
      });
    }
  }

  private updateTargetFragments(deltaTime: number): void {
    for (let i = this.targetFragments.length - 1; i >= 0; i--) {
      const fragment = this.targetFragments[i];
      
      // Update position
      fragment.x += fragment.vx;
      fragment.y += fragment.vy;
      
      // Add slight gravity effect
      fragment.vy += 0.08;
      
      // Update rotation
      fragment.rotation += fragment.rotationSpeed;
      
      // Update life and fade
      fragment.life += deltaTime;
      fragment.alpha = fragment.alpha * (1 - fragment.life / fragment.maxLife);
      
      // Remove dead fragments
      if (fragment.alpha < 0.05) {
        this.targetFragments.splice(i, 1);
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.isActive) return;
    
    this.animationTime += deltaTime;
    
    // Update magical field
    this.updateMagicField(deltaTime);
    
    // Update target fragments
    this.updateTargetFragments(deltaTime);
    
    // Update each magical wisp based on its phase
    for (const wisp of this.magicWisps) {
      wisp.life += deltaTime;
      
      switch (wisp.phase) {
        case 'forming':
          this.updateFormingPhase(wisp, deltaTime);
          break;
        case 'flowing':
          this.updateFlowingPhase(wisp, deltaTime);
          break;
        case 'piercing':
          this.updatePiercingPhase(wisp, deltaTime);
          break;
        case 'impact':
          this.updateImpactPhase(wisp, deltaTime);
          break;
        case 'dispersing':
          this.updateDispersingPhase(wisp, deltaTime);
          break;
      }
    }
    
    // Check if animation is complete - only when ALL wisps have finished dispersing
    const allWispsDead = this.magicWisps.every(w => w.alpha < 0.05);
    const allFragmentsDead = this.targetFragments.length === 0;
    
    // Animation is complete when all wisps have dispersed and all fragments are gone
    if (allWispsDead && allFragmentsDead) {
      this.isActive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;
    
    ctx.save();
    
    // Draw magical wisps with ethereal, smoke-like effects
    for (const wisp of this.magicWisps) {
      if (wisp.alpha > 0.05) {
        this.drawMagicWisp(ctx, wisp);
      }
    }
    
    // Draw target fragments (shattered pieces)
    for (const fragment of this.targetFragments) {
      if (fragment.alpha > 0.05) {
        this.drawTargetFragment(ctx, fragment);
      }
    }
    
    ctx.restore();
  }

  private drawMagicWisp(ctx: CanvasRenderingContext2D, wisp: MagicWisp): void {
    ctx.save();
    
    // Validate wisp coordinates before drawing
    if (!this.isValidCoordinate(wisp.x, wisp.y) || !this.isFinite(wisp.x) || !this.isFinite(wisp.y)) {
      console.warn('Invalid wisp coordinates:', wisp.x, wisp.y);
      ctx.restore();
      return;
    }
    
    // Draw trail first (smoke effect)
    for (let i = 0; i < wisp.trail.length; i++) {
      const trailPoint = wisp.trail[i];
      
      // Validate trail point coordinates
      if (!this.isValidCoordinate(trailPoint.x, trailPoint.y) || !this.isFinite(trailPoint.x) || !this.isFinite(trailPoint.y)) {
        continue; // Skip invalid trail points
      }
      
      const trailAlpha = trailPoint.alpha * (i / wisp.trail.length);
      
      if (trailAlpha > 0.05) {
        ctx.globalAlpha = trailAlpha;
        
        // Create radial gradient for smoke effect
        const gradient = ctx.createRadialGradient(
          trailPoint.x, trailPoint.y, 0,
          trailPoint.x, trailPoint.y, trailPoint.size
        );
        
        gradient.addColorStop(0, wisp.color);
        gradient.addColorStop(0.7, wisp.color.replace('rgba', 'rgba').replace(/[\d.]+\)$/, '0.3)'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, trailPoint.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw main wisp
    ctx.globalAlpha = wisp.alpha;
    
    // Create radial gradient for main wisp
    const gradient = ctx.createRadialGradient(
      wisp.x, wisp.y, 0,
      wisp.x, wisp.y, wisp.size
    );
    
    gradient.addColorStop(0, wisp.color);
    gradient.addColorStop(0.6, wisp.color.replace('rgba', 'rgba').replace(/[\d.]+\)$/, '0.6)'));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y, wisp.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add subtle glow effect
    ctx.shadowColor = wisp.color;
    ctx.shadowBlur = wisp.size * 0.8;
    ctx.fill();
    
    ctx.restore();
  }

  private drawTargetFragment(ctx: CanvasRenderingContext2D, fragment: TargetFragment): void {
    ctx.save();
    
    ctx.globalAlpha = fragment.alpha;
    ctx.translate(fragment.x, fragment.y);
    ctx.rotate(fragment.rotation);
    
    // Draw angular fragment shape
    ctx.fillStyle = fragment.color;
    ctx.shadowColor = fragment.color;
    ctx.shadowBlur = fragment.size * 0.5;
    
    ctx.beginPath();
    // Create irregular fragment shape
    const size = fragment.size;
    ctx.moveTo(-size * 0.8, -size * 0.6);
    ctx.lineTo(size * 0.7, -size * 0.8);
    ctx.lineTo(size * 0.9, size * 0.4);
    ctx.lineTo(size * 0.3, size * 0.9);
    ctx.lineTo(-size * 0.6, size * 0.7);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  private isValidCoordinate(x: number, y: number): boolean {
    // Check if coordinates are valid numbers and within reasonable bounds
    return !isNaN(x) && !isNaN(y) && 
           isFinite(x) && isFinite(y) &&
           x >= -1000 && x <= 2000 && 
           y >= -1000 && y <= 2000;
  }

  private isFinite(value: number): boolean {
    return Number.isFinite(value);
  }

  isComplete(): boolean {
    return !this.isActive;
  }

  // Get animation progress (0-1)
  getProgress(): number {
    const totalDuration = Object.values(this.PHASE_TIMINGS).reduce((a, b) => a + b, 0);
    return Math.min(this.animationTime / totalDuration, 1);
  }
}

// Animation manager for multiple fireball animations
export class FireballAnimationManager {
  private animations: FireballAnimation[] = [];
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  createFireballAnimation(
    sourcePieces: Array<{ x: number; y: number }>,
    targetPosition: { x: number; y: number },
    isAmplified: boolean = false,
    onTargetDestroyed?: () => void
  ): string {
    console.log('✨ V3 Manager: Creating Magical Whispy Fireball Animation');
    const animationId = `fireball_v3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const config: FireballAnimationConfig = {
      sourcePieces,
      targetPosition,
      isAmplified,
      canvas: this.canvas,
      onTargetDestroyed
    };
    
    console.log('🎯 V3 Manager: Animation config:', config);
    const animation = new FireballAnimation(config);
    console.log('✨ V3 Manager: Animation created:', animation);
    
    this.animations.push(animation);
    console.log('📚 V3 Manager: Total animations:', this.animations.length);
    
    return animationId;
  }

  update(deltaTime: number): void {
    // Update all animations
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const animation = this.animations[i];
      animation.update(deltaTime);
      
      // Remove completed animations
      if (animation.isComplete()) {
        this.animations.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Draw all animations
    for (const animation of this.animations) {
      animation.draw(ctx);
    }
  }

  getActiveAnimationCount(): number {
    return this.animations.length;
  }

  clearAll(): void {
    this.animations = [];
  }
}
