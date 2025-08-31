// Simplified Particle System for Amalgam Game Abilities
// Based on the CodePen particle swarm but adapted for different shapes and directions
export class Particle {
    constructor(x, y, config, random) {
        this.random = random;
        this.position = { x, y };
        this.velocity = this.getInitialVelocity(config.direction, config.speed);
        this.life = 0;
        this.maxLife = this.random() * 1000 + 500;
        this.size = config.size * (0.5 + this.random() * 0.5);
        this.color = config.color;
        this.shape = config.shape;
        this.angle = this.random() * Math.PI * 2;
    }
    getInitialVelocity(direction, speed) {
        switch (direction) {
            case 'radial':
                const angle = this.random() * Math.PI * 2;
                return {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                };
            case 'linear':
                return {
                    x: (this.random() - 0.5) * speed,
                    y: (this.random() - 0.5) * speed
                };
            case 'spiral':
                const spiralAngle = this.random() * Math.PI * 2;
                const spiralRadius = this.random() * 50 + 10;
                return {
                    x: Math.cos(spiralAngle) * speed * 0.5,
                    y: Math.sin(spiralAngle) * speed * 0.5
                };
            default: // random
                return {
                    x: (this.random() - 0.5) * speed * 2,
                    y: (this.random() - 0.5) * speed * 2
                };
        }
    }
    update(deltaTime, bounds) {
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        // Update angle for rotation effects
        this.angle += 0.02 * deltaTime;
        // Wrap around edges
        if (this.position.x < 0)
            this.position.x = bounds.width;
        if (this.position.x > bounds.width)
            this.position.x = 0;
        if (this.position.y < 0)
            this.position.y = bounds.height;
        if (this.position.y > bounds.height)
            this.position.y = 0;
        // Update life
        this.life += deltaTime;
        // Add some natural movement variation
        this.velocity.x += (this.random() - 0.5) * 0.1;
        this.velocity.y += (this.random() - 0.5) * 0.1;
        // Dampen velocity
        this.velocity.x *= 0.99;
        this.velocity.y *= 0.99;
    }
    draw(ctx) {
        const alpha = 1 - (this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);
        switch (this.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(-this.size, this.size);
                ctx.lineTo(this.size, this.size);
                ctx.closePath();
                ctx.fill();
                break;
            case 'line':
                ctx.lineWidth = this.size;
                ctx.beginPath();
                ctx.moveTo(-this.size, 0);
                ctx.lineTo(this.size, 0);
                ctx.stroke();
                break;
        }
        ctx.restore();
    }
    isDead() {
        return this.life >= this.maxLife;
    }
}
export class ParticleSystem {
    constructor(config) {
        this.particles = [];
        this.lastTime = 0;
        this.config = config;
        this.random = () => Math.random();
        this.initializeParticles();
    }
    initializeParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.count; i++) {
            const x = this.random() * this.config.bounds.width;
            const y = this.random() * this.config.bounds.height;
            this.particles.push(new Particle(x, y, this.config, this.random));
        }
    }
    update(deltaTime) {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime, this.config.bounds);
            // Remove dead particles and create new ones
            if (particle.isDead()) {
                this.particles.splice(i, 1);
                const x = this.random() * this.config.bounds.width;
                const y = this.random() * this.config.bounds.height;
                this.particles.push(new Particle(x, y, this.config, this.random));
            }
        }
    }
    draw(ctx) {
        ctx.save();
        // Clear with fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, this.config.bounds.width, this.config.bounds.height);
        // Draw all particles
        for (const particle of this.particles) {
            particle.draw(ctx);
        }
        ctx.restore();
    }
    // Method to add attraction/repulsion effects
    addForce(centerX, centerY, strength, type) {
        for (const particle of this.particles) {
            const dx = centerX - particle.position.x;
            const dy = centerY - particle.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                const force = strength / (distance * distance);
                const factor = type === 'attract' ? force : -force;
                particle.velocity.x += (dx / distance) * factor;
                particle.velocity.y += (dy / distance) * factor;
            }
        }
    }
    // Method to change configuration on the fly
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Reinitialize if count changed
        if (newConfig.count && newConfig.count !== this.particles.length) {
            this.initializeParticles();
        }
    }
}
// Preset configurations for different ability effects
export const ParticlePresets = {
    fireball: {
        count: 200,
        speed: 2,
        size: 3,
        color: '#ff4400',
        shape: 'circle',
        direction: 'radial',
        bounds: { width: 800, height: 600 }
    },
    tidalWave: {
        count: 300,
        speed: 1.5,
        size: 2,
        color: '#0088ff',
        shape: 'line',
        direction: 'linear',
        bounds: { width: 800, height: 600 }
    },
    sap: {
        count: 150,
        speed: 0.8,
        size: 4,
        color: '#88ff00',
        shape: 'triangle',
        direction: 'spiral',
        bounds: { width: 800, height: 600 }
    },
    launch: {
        count: 100,
        speed: 3,
        size: 2,
        color: '#ffff00',
        shape: 'square',
        direction: 'linear',
        bounds: { width: 800, height: 600 }
    }
};
