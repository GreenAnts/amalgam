// Fireball Animation for Amalgam Game
// Red smoke effect that emits from ruby pieces, flows like magical smoke, 
// forms a spear-like shape, and shatters the target piece

export interface FireballAnimationConfig {
  sourcePieces: Array<{ x: number; y: number }>; // 2 Ruby/Amalgam pieces in formation
  targetPosition: { x: number; y: number }; // Target piece position
  isAmplified: boolean; // Whether Void is part of formation
  canvas: HTMLCanvasElement;
}

export interface FireballParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  phase: 'emission' | 'flowing' | 'gathering' | 'spear' | 'impact';
  size: number;
  color: string;
  alpha: number;
  smokeOpacity: number; // For smoke-like transparency
  swirlAngle: number; // For smoke swirling
  swirlSpeed: number; // For smoke swirling speed
  driftX: number; // For smoke drifting
  driftY: number; // For smoke drifting
  emissionSource: { x: number; y: number }; // Which piece emitted this particle
  targetDistance: number; // Distance from target for spear formation
  spearAngle: number; // Angle for spear formation
  impactVelocity: number; // Velocity for impact effect
  trail: Array<{ x: number; y: number; alpha: number }>; // Particle trail for smoke effect
  flowFieldAngle: number; // For natural smoke flow
  flowFieldStrength: number; // Strength of flow field influence
  emissionRing: number; // Which concentric ring this particle belongs to
  emissionAngle: number; // Angle within the emission ring
  curvePath: string; // Curved path for smoke flow
  curveProgress: number; // Progress along the curve
  curveSpeed: number; // Speed along the curve
}

export class FireballAnimation {
  private particles: FireballParticle[] = [];
  private config: FireballAnimationConfig;
  private animationTime: number = 0;
  private isActive: boolean = true;
  private formationCenter: { x: number; y: number };
  private firingDirection: { x: number; y: number };
  private targetReached: boolean = false;
  private impactParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; alpha: number; size: number }> = [];
  private targetDestroyed: boolean = false;
  private flowField: number[][] = []; // Flow field for natural smoke movement

  constructor(config: FireballAnimationConfig) {
    console.log('🔥 NEW SMOKE FIREBALL ANIMATION LOADED!'); // Debug log
    this.config = config;
    this.formationCenter = this.calculateFormationCenter();
    this.firingDirection = this.calculateFiringDirection();
    this.initializeFlowField();
    this.initializeParticles();
  }

  private calculateFormationCenter(): { x: number; y: number } {
    const [piece1, piece2] = this.config.sourcePieces;
    return {
      x: (piece1.x + piece2.x) / 2,
      y: (piece1.y + piece2.y) / 2
    };
  }

  private calculateFiringDirection(): { x: number; y: number } {
    const [piece1, piece2] = this.config.sourcePieces;
    const dx = piece2.x - piece1.x;
    const dy = piece2.y - piece1.y;
    
    // Normalize the direction vector
    const length = Math.sqrt(dx * dx + dy * dy);
    return {
      x: dx / length,
      y: dy / length
    };
  }

  private initializeFlowField(): void {
    // Create a flow field for natural smoke movement
    const fieldSize = 50;
    this.flowField = [];
    
    for (let i = 0; i < fieldSize; i++) {
      this.flowField[i] = [];
      for (let j = 0; j < fieldSize; j++) {
        // Create flowing patterns toward the target
        const x = (i / fieldSize) * this.config.canvas.width;
        const y = (j / fieldSize) * this.config.canvas.height;
        
        // Flow toward target with some swirling
        const dx = this.config.targetPosition.x - x;
        const dy = this.config.targetPosition.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const baseAngle = Math.atan2(dy, dx);
          const swirl = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 0.3;
          this.flowField[i][j] = baseAngle + swirl;
        } else {
          this.flowField[i][j] = 0;
        }
      }
    }
  }

  private getFlowFieldAngle(x: number, y: number): number {
    const fieldSize = 50;
    const i = Math.floor((x / this.config.canvas.width) * fieldSize);
    const j = Math.floor((y / this.config.canvas.height) * fieldSize);
    
    if (i >= 0 && i < fieldSize && j >= 0 && j < fieldSize) {
      return this.flowField[i][j];
    }
    return 0;
  }

  private generateCurvePath(startX: number, startY: number, endX: number, endY: number): string {
    // Generate a curved path for smoke flow
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Add some randomness to the curve
    const offsetX = (Math.random() - 0.5) * 50;
    const offsetY = (Math.random() - 0.5) * 50;
    
    const controlX = midX + offsetX;
    const controlY = midY + offsetY;
    
    return `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`;
  }

  private getPointOnCurve(path: string, progress: number): { x: number; y: number } {
    // Simple linear interpolation for now - can be enhanced with proper path calculation
    const startX = parseFloat(path.split('M')[1].split(',')[0]);
    const startY = parseFloat(path.split('M')[1].split(',')[1].split(' ')[0]);
    const endX = parseFloat(path.split(' ').pop()!.split(',')[0]);
    const endY = parseFloat(path.split(' ').pop()!.split(',')[1]);
    
    return {
      x: startX + (endX - startX) * progress,
      y: startY + (endY - startY) * progress
    };
  }

  private initializeParticles(): void {
    const particleCount = this.config.isAmplified ? 200 : 150;
    
    // Create particles with concentric ring emission pattern
    for (let i = 0; i < particleCount; i++) {
      const emissionSource = this.config.sourcePieces[i % 2]; // Alternate between pieces
      const emissionRing = Math.floor(i / (particleCount / 6)); // 6 concentric rings
      const emissionAngle = (i % (particleCount / 6)) * (Math.PI * 2 / (particleCount / 6));
      
      // Calculate position on the emission ring
      const ringRadius = 5 + emissionRing * 3; // Rings get larger
      const startX = emissionSource.x + Math.cos(emissionAngle) * ringRadius;
      const startY = emissionSource.y + Math.sin(emissionAngle) * ringRadius;
      
      // Generate curved path toward target
      const curvePath = this.generateCurvePath(startX, startY, this.config.targetPosition.x, this.config.targetPosition.y);
      
      this.particles.push({
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 4000 + Math.random() * 2000,
        phase: 'emission',
        size: 1 + Math.random() * 2, // Varied sizes for smoke effect
        color: this.getSmokeColor(),
        alpha: 0.3 + Math.random() * 0.4, // Subtle smoke opacity
        smokeOpacity: 0.2 + Math.random() * 0.3, // Additional smoke transparency
        swirlAngle: Math.random() * Math.PI * 2,
        swirlSpeed: 0.02 + Math.random() * 0.03,
        driftX: (Math.random() - 0.5) * 0.5,
        driftY: (Math.random() - 0.5) * 0.5,
        emissionSource: emissionSource,
        targetDistance: 0,
        spearAngle: Math.random() * Math.PI * 2,
        impactVelocity: 2 + Math.random() * 3,
        trail: [], // Initialize empty trail
        flowFieldAngle: 0,
        flowFieldStrength: 0.5 + Math.random() * 0.5,
        emissionRing: emissionRing,
        emissionAngle: emissionAngle,
        curvePath: curvePath,
        curveProgress: 0,
        curveSpeed: 0.001 + Math.random() * 0.002
      });
    }
  }

  private getSmokeColor(): string {
    const colors = [
      '#8B0000', // Dark red
      '#A0522D', // Sienna
      '#CD5C5C', // Indian red
      '#B22222', // Fire brick
      '#DC143C', // Crimson
      '#8B4513'  // Saddle brown
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private updateEmissionPhase(particle: FireballParticle, deltaTime: number): void {
    // Particles emerge from concentric rings around the pieces
    const time = this.animationTime / 1000;
    
    // Calculate emission direction from the ring
    const ringRadius = 5 + particle.emissionRing * 3;
    const emissionDirection = {
      x: Math.cos(particle.emissionAngle),
      y: Math.sin(particle.emissionAngle)
    };
    
    // Move particles outward from the emission ring
    const emissionSpeed = 1 + Math.random() * 2;
    particle.vx = emissionDirection.x * emissionSpeed;
    particle.vy = emissionDirection.y * emissionSpeed;
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Add gentle swirling during emission
    particle.swirlAngle += particle.swirlSpeed;
    const swirlRadius = 2 + Math.random() * 3;
    particle.x += Math.cos(particle.swirlAngle) * swirlRadius * 0.05;
    particle.y += Math.sin(particle.swirlAngle) * swirlRadius * 0.05;
    
    // Gradually increase alpha for smoke effect
    particle.alpha = Math.min(particle.alpha + 0.02, 0.7);
    
    // Add to trail for smoke effect
    this.addToTrail(particle);
    
    // Transition to flowing phase after emission
    if (this.animationTime > 1200) {
      particle.phase = 'flowing';
    }
  }

  private updateFlowingPhase(particle: FireballParticle, deltaTime: number): void {
    // Smoke flows naturally using curved paths
    particle.curveProgress += particle.curveSpeed;
    
    if (particle.curveProgress <= 1) {
      // Follow the curved path
      const curvePoint = this.getPointOnCurve(particle.curvePath, particle.curveProgress);
      const dx = curvePoint.x - particle.x;
      const dy = curvePoint.y - particle.y;
      
      // Move toward the curve point
      const flowSpeed = 2 + Math.random() * 3;
      particle.vx = (dx / Math.sqrt(dx * dx + dy * dy)) * flowSpeed;
      particle.vy = (dy / Math.sqrt(dx * dx + dy * dy)) * flowSpeed;
    } else {
      // Continue toward target
      const dx = this.config.targetPosition.x - particle.x;
      const dy = this.config.targetPosition.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const flowSpeed = 3 + Math.random() * 2;
        particle.vx = (dx / distance) * flowSpeed;
        particle.vy = (dy / distance) * flowSpeed;
      }
    }
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Add smoke swirling
    particle.swirlAngle += particle.swirlSpeed * 2;
    const swirlRadius = 3 + Math.random() * 4;
    particle.x += Math.cos(particle.swirlAngle) * swirlRadius * 0.03;
    particle.y += Math.sin(particle.swirlAngle) * swirlRadius * 0.03;
    
    // Add natural smoke drift
    particle.x += particle.driftX * 0.3;
    particle.y += particle.driftY * 0.3;
    
    // Add to trail for smoke effect
    this.addToTrail(particle);
    
    // Transition to gathering phase
    if (this.animationTime > 2200) {
      particle.phase = 'gathering';
    }
  }

  private updateGatheringPhase(particle: FireballParticle, deltaTime: number): void {
    // Particles gather into a spear-like formation
    const forwardPiece = this.config.sourcePieces[1];
    const dx = forwardPiece.x - particle.x;
    const dy = forwardPiece.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 3) {
      // Gather toward forward piece
      const gatherSpeed = 2 + Math.random() * 2;
      particle.vx = (dx / distance) * gatherSpeed;
      particle.vy = (dy / distance) * gatherSpeed;
    }
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Start forming spear shape
    particle.spearAngle = Math.atan2(
      this.config.targetPosition.y - forwardPiece.y,
      this.config.targetPosition.x - forwardPiece.x
    );
    
    // Add to trail for smoke effect
    this.addToTrail(particle);
    
    // Transition to spear phase
    if (this.animationTime > 2700) {
      particle.phase = 'spear';
    }
  }

  private updateSpearPhase(particle: FireballParticle, deltaTime: number): void {
    // Form sharp spear-like shape and thrust forward
    const forwardPiece = this.config.sourcePieces[1];
    
    // Calculate distance from target for spear formation
    const dx = this.config.targetPosition.x - forwardPiece.x;
    const dy = this.config.targetPosition.y - forwardPiece.y;
    const totalDistance = Math.sqrt(dx * dx + dy * dy);
    
    particle.targetDistance = Math.sqrt(
      Math.pow(this.config.targetPosition.x - particle.x, 2) +
      Math.pow(this.config.targetPosition.y - particle.y, 2)
    );
    
    // Spear formation: particles align in a sharp, focused shape
    const spearSpeed = this.config.isAmplified ? 12 : 10;
    const spearDirection = {
      x: dx / totalDistance,
      y: dy / totalDistance
    };
    
    // Move particles forward in spear formation
    particle.vx = spearDirection.x * spearSpeed;
    particle.vy = spearDirection.y * spearSpeed;
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Add to trail for smoke effect
    this.addToTrail(particle);
    
    // Check if spear reached target
    if (particle.targetDistance < 15) {
      particle.phase = 'impact';
      this.targetReached = true;
      this.createImpactEffect();
    }
  }

  private updateImpactPhase(particle: FireballParticle, deltaTime: number): void {
    // Impact effect: particles scatter and fade
    const dx = particle.x - this.config.targetPosition.x;
    const dy = particle.y - this.config.targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 30) {
      // Scatter outward from impact point
      const angle = Math.atan2(dy, dx);
      const scatterSpeed = particle.impactVelocity;
      particle.vx = Math.cos(angle) * scatterSpeed;
      particle.vy = Math.sin(angle) * scatterSpeed;
    }
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Rapid fade out for impact effect
    particle.alpha *= 0.9;
    particle.smokeOpacity *= 0.85;
    
    // Clear trail on impact
    particle.trail = [];
  }

  private addToTrail(particle: FireballParticle): void {
    // Add current position to trail
    particle.trail.push({
      x: particle.x,
      y: particle.y,
      alpha: particle.alpha * 0.5
    });
    
    // Limit trail length for performance
    if (particle.trail.length > 8) {
      particle.trail.shift();
    }
    
    // Fade trail over time
    particle.trail.forEach((point, index) => {
      point.alpha *= 0.95;
    });
  }

  private createImpactEffect(): void {
    if (this.targetDestroyed) return;
    
    this.targetDestroyed = true;
    
    // Create impact explosion particles
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      const speed = 3 + Math.random() * 4;
      
      this.impactParticles.push({
        x: this.config.targetPosition.x,
        y: this.config.targetPosition.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        alpha: 0.8 + Math.random() * 0.2,
        size: 1 + Math.random() * 3
      });
    }
  }

  private updateImpactParticles(deltaTime: number): void {
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const particle = this.impactParticles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Add gravity effect
      particle.vy += 0.1;
      
      // Update life and fade
      particle.life += deltaTime;
      particle.alpha *= 0.95;
      
      // Remove dead particles
      if (particle.alpha < 0.1) {
        this.impactParticles.splice(i, 1);
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.isActive) return;
    
    this.animationTime += deltaTime;
    
    // Update impact particles
    this.updateImpactParticles(deltaTime);
    
    // Update each particle based on its phase
    for (const particle of this.particles) {
      particle.life += deltaTime;
      
      switch (particle.phase) {
        case 'emission':
          this.updateEmissionPhase(particle, deltaTime);
          break;
        case 'flowing':
          this.updateFlowingPhase(particle, deltaTime);
          break;
        case 'gathering':
          this.updateGatheringPhase(particle, deltaTime);
          break;
        case 'spear':
          this.updateSpearPhase(particle, deltaTime);
          break;
        case 'impact':
          this.updateImpactPhase(particle, deltaTime);
          break;
      }
    }
    
    // Check if animation is complete
    const allParticlesDead = this.particles.every(p => p.alpha < 0.1);
    const allImpactDead = this.impactParticles.length === 0;
    if (allParticlesDead && allImpactDead && this.targetReached) {
      this.isActive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;
    
    ctx.save();
    
    // Draw smoke particles with enhanced effects and trails
    for (const particle of this.particles) {
      if (particle.alpha > 0.1) {
        // Draw particle trail for smoke effect
        if (particle.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
          
          for (let i = 1; i < particle.trail.length; i++) {
            const point = particle.trail[i];
            ctx.lineTo(point.x, point.y);
          }
          
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = particle.size * 0.5;
          ctx.globalAlpha = particle.trail[0].alpha * 0.3;
          ctx.stroke();
        }
        
        // Create smoke-like effect with multiple layers
        const smokeAlpha = particle.alpha * particle.smokeOpacity;
        
        // Outer smoke glow
        ctx.globalAlpha = smokeAlpha * 0.3;
        ctx.fillStyle = '#4A0000';
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 4;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner smoke core
        ctx.globalAlpha = smokeAlpha * 0.6;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = particle.size * 2;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright center for magical effect
        ctx.globalAlpha = smokeAlpha * 0.8;
        ctx.fillStyle = '#FF4444';
        ctx.shadowBlur = particle.size;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw impact particles
    for (const particle of this.impactParticles) {
      if (particle.alpha > 0.1) {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#FF6600';
        ctx.shadowColor = '#FF6600';
        ctx.shadowBlur = particle.size * 2;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }

  isComplete(): boolean {
    return !this.isActive;
  }

  // Get animation progress (0-1)
  getProgress(): number {
    return Math.min(this.animationTime / 5000, 1); // 5 second total duration
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
    isAmplified: boolean = false
  ): string {
    const animationId = `fireball_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const config: FireballAnimationConfig = {
      sourcePieces,
      targetPosition,
      isAmplified,
      canvas: this.canvas
    };
    
    const animation = new FireballAnimation(config);
    this.animations.push(animation);
    
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
