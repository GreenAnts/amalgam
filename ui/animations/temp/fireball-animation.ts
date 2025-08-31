// Fireball Animation for Amalgam Game
// Follows game rules: particles form around 2 pieces in figure-8, then shoot in straight line

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
  phase: 'forming' | 'gathering' | 'firing' | 'impact';
  size: number;
  color: string;
  alpha: number;
  lastX?: number; // For trail effect
  lastY?: number; // For trail effect
  swarmAngle: number; // For swarm behavior
  swarmSpeed: number; // For swarm behavior
  individualOffset: number; // For individual variation
  clusterId: number; // For unified figure-8
  startPosition: { x: number; y: number }; // For trail effect
}

export class FireballAnimation {
  private particles: FireballParticle[] = [];
  private config: FireballAnimationConfig;
  private animationTime: number = 0;
  private isActive: boolean = true;
  private formationCenter: { x: number; y: number };
  private firingDirection: { x: number; y: number };
  private targetReached: boolean = false;
  private impactExplosion: boolean = false; // Flag for impact explosion
  private impactParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; alpha: number }> = []; // Array for impact explosion particles

  constructor(config: FireballAnimationConfig) {
    this.config = config;
    this.formationCenter = this.calculateFormationCenter();
    this.firingDirection = this.calculateFiringDirection();
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

  private initializeParticles(): void {
    const particleCount = this.config.isAmplified ? 150 : 120; // More particles for density
    
    // Create single cluster for unified figure-8 pattern
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: this.formationCenter.x,
        y: this.formationCenter.y,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 3000 + Math.random() * 2000,
        phase: 'forming',
        size: 0.5 + Math.random() * 1.5, // Smaller particles for light trail effect
        color: this.getParticleColor(),
        alpha: 0.4 + Math.random() * 0.4, // More subtle alpha
        lastX: undefined, // Initialize for trail effect
        lastY: undefined, // Initialize for trail effect
        swarmAngle: Math.random() * Math.PI * 2, // Initialize for swarm behavior
        swarmSpeed: 0.05 + Math.random() * 0.03, // Initialize for swarm behavior
        individualOffset: Math.random() * Math.PI * 2, // Initialize for individual variation
        clusterId: 0, // Single cluster for unified figure-8
        startPosition: { x: this.formationCenter.x, y: this.formationCenter.y } // Center position
      });
    }
  }

  private getParticleColor(): string {
    const colors = [
      '#ff2200', // Deep ruby red
      '#ff4400', // Bright ruby red
      '#ff6600', // Ruby orange-red
      '#ff1100', // Dark ruby
      '#ff3300'  // Medium ruby
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private updateFormingPhase(particle: FireballParticle, deltaTime: number): void {
    const time = this.animationTime / 1000; // Convert to seconds
    
    // Single figure-8 pattern where the two circles are centered on the two pieces
    const t = (particle.life / particle.maxLife) * Math.PI * 4 + particle.individualOffset; // 2 full figure-8 cycles
    
    // Calculate the distance between the two pieces
    const [piece1, piece2] = this.config.sourcePieces;
    const pieceDistance = Math.sqrt(
      Math.pow(piece2.x - piece1.x, 2) + Math.pow(piece2.y - piece1.y, 2)
    );
    
    // Figure-8 parametric equations - scale based on piece distance
    const scale = pieceDistance * 0.6; // Scale the figure-8 to fit around both pieces
    const figure8X = scale * Math.sin(t);
    const figure8Y = scale * Math.sin(t) * Math.cos(t);
    
    // Add gentle swarm-like movement (less chaotic)
    particle.swarmAngle += particle.swarmSpeed * 0.5; // Slower swarm movement
    const swarmX = Math.cos(particle.swarmAngle) * 15 * 0.15; // Reduced swarm influence
    const swarmY = Math.sin(particle.swarmAngle) * 15 * 0.15;
    
    // Add minimal individual particle jitter for subtle movement
    const jitterX = (Math.random() - 0.5) * 3; // Reduced jitter
    const jitterY = (Math.random() - 0.5) * 3;
    
    // Position relative to the formation center (center of the figure-8)
    particle.x = this.formationCenter.x + figure8X + swarmX + jitterX;
    particle.y = this.formationCenter.y + figure8Y + swarmY + jitterY;
    
    // Store previous position for trail effect
    if (!particle.hasOwnProperty('lastX')) {
      particle.lastX = particle.x;
      particle.lastY = particle.y;
    }
    
    // Transition to gathering phase after 2 seconds
    if (this.animationTime > 2000) {
      particle.phase = 'gathering';
    }
  }

  private updateGatheringPhase(particle: FireballParticle, deltaTime: number): void {
    // Particles gather toward the forward piece
    const forwardPiece = this.config.sourcePieces[1]; // Second piece is "forward"
    const dx = forwardPiece.x - particle.x;
    const dy = forwardPiece.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      // Move toward forward piece
      particle.vx = (dx / distance) * 2;
      particle.vy = (dy / distance) * 2;
      particle.x += particle.vx;
      particle.y += particle.vy;
    } else {
      // Start firing phase
      particle.phase = 'firing';
      particle.x = forwardPiece.x;
      particle.y = forwardPiece.y;
    }
  }

  private updateFiringPhase(particle: FireballParticle, deltaTime: number): void {
    // Particles shoot in straight line toward target
    const speed = this.config.isAmplified ? 8 : 6;
    particle.x += this.firingDirection.x * speed;
    particle.y += this.firingDirection.y * speed;
    
    // Check if particle reached target
    const dx = this.config.targetPosition.x - particle.x;
    const dy = this.config.targetPosition.y - particle.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceToTarget < 10) {
      particle.phase = 'impact';
      this.targetReached = true;
    }
  }

  private updateImpactPhase(particle: FireballParticle, deltaTime: number): void {
    // Particles explode outward from target
    const dx = particle.x - this.config.targetPosition.x;
    const dy = particle.y - this.config.targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50) {
      // Expand outward
      const angle = Math.atan2(dy, dx);
      const speed = 3;
      particle.x += Math.cos(angle) * speed;
      particle.y += Math.sin(angle) * speed;
    }
    
    // Fade out
    particle.alpha *= 0.95;
  }

  update(deltaTime: number): void {
    if (!this.isActive) return;
    
    this.animationTime += deltaTime;
    
    // Update each particle based on its phase
    for (const particle of this.particles) {
      particle.life += deltaTime;
      
      switch (particle.phase) {
        case 'forming':
          this.updateFormingPhase(particle, deltaTime);
          break;
        case 'gathering':
          this.updateGatheringPhase(particle, deltaTime);
          break;
        case 'firing':
          this.updateFiringPhase(particle, deltaTime);
          break;
        case 'impact':
          this.updateImpactPhase(particle, deltaTime);
          break;
      }
    }
    
    // Check if animation is complete
    const allParticlesDead = this.particles.every(p => p.alpha < 0.1);
    if (allParticlesDead && this.targetReached) {
      this.isActive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;
    
    ctx.save();
    
    // Draw particles
    for (const particle of this.particles) {
      if (particle.alpha > 0.1) {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        
        // Add glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 2;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw formation connection line
    if (this.animationTime < 1500) {
      const [piece1, piece2] = this.config.sourcePieces;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(piece1.x, piece1.y);
      ctx.lineTo(piece2.x, piece2.y);
      ctx.stroke();
    }
    
    // Draw firing line
    if (this.animationTime > 1500 && this.animationTime < 2500) {
      const forwardPiece = this.config.sourcePieces[1];
      const lineLength = 100;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(forwardPiece.x, forwardPiece.y);
      ctx.lineTo(
        forwardPiece.x + this.firingDirection.x * lineLength,
        forwardPiece.y + this.firingDirection.y * lineLength
      );
      ctx.stroke();
    }
    
    ctx.restore();
  }

  isComplete(): boolean {
    return !this.isActive;
  }

  // Get animation progress (0-1)
  getProgress(): number {
    return Math.min(this.animationTime / 4000, 1); // 4 second total duration
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
