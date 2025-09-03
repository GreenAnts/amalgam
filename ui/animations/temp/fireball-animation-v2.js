import { graphicsConfig } from '../../graphics-config.js';
export class FireballV2Animation {
    constructor(config) {
        this.isActive = true;
        this.timeMs = 0;
        this.phase = 'charge';
        // Timings (ms)
        this.T = {
            CHARGE: 700,
            LAUNCH: 900,
            IMPACT: 250,
            FADE: 900
        };
        this.embers = [];
        this.fragments = [];
        this.shockwave = null;
        this.destroyed = false;
        // light flow influence grid (coarser and cheaper than V3)
        this.flowAngles = [];
        this.config = config;
        const fwd = this.getForwardMostPiece(config.sourcePieces, config.targetPosition);
        this.startPos = { x: fwd.x, y: fwd.y };
        this.endPos = { x: config.targetPosition.x, y: config.targetPosition.y };
        this.initFlowGrid();
    }
    computeMidpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    getForwardMostPiece(pieces, target) {
        // Choose the piece that is closer to the target (forward-most toward target)
        let best = pieces[0];
        let bestD = Math.hypot(target.x - best.x, target.y - best.y);
        for (let i = 1; i < pieces.length; i++) {
            const p = pieces[i];
            const d = Math.hypot(target.x - p.x, target.y - p.y);
            if (d < bestD) {
                best = p;
                bestD = d;
            }
        }
        return best;
    }
    computeArcControlPoint(start, end) {
        const mx = (start.x + end.x) / 2;
        const my = (start.y + end.y) / 2;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        // perpendicular offset for arc height
        const nx = -dy;
        const ny = dx;
        const len = Math.max(1, Math.hypot(nx, ny));
        // arc height scales with distance; amplified increases arc
        const dist = Math.hypot(dx, dy);
        const height = (this.config.isAmplified ? 0.22 : 0.16) * dist;
        return { x: mx + (nx / len) * height, y: my + (ny / len) * height };
    }
    initFlowGrid() {
        const cols = 14, rows = 10;
        this.flowAngles = new Array(cols);
        for (let i = 0; i < cols; i++) {
            this.flowAngles[i] = new Array(rows);
            for (let j = 0; j < rows; j++) {
                const angle = Math.sin(i * 0.35) * Math.cos(j * 0.27) * 0.6;
                this.flowAngles[i][j] = angle;
            }
        }
    }
    flowAt(x, y) {
        const cols = this.flowAngles.length;
        const rows = this.flowAngles[0].length;
        const cx = Math.min(cols - 1, Math.max(0, Math.floor((x / this.config.canvas.width) * cols)));
        const cy = Math.min(rows - 1, Math.max(0, Math.floor((y / this.config.canvas.height) * rows)));
        return this.flowAngles[cx][cy];
    }
    squigglePoint(t) {
        // Base linear interpolation from start to end
        const sx = this.startPos.x;
        const sy = this.startPos.y;
        const ex = this.endPos.x;
        const ey = this.endPos.y;
        const bx = sx + (ex - sx) * t;
        const by = sy + (ey - sy) * t;
        // Perpendicular vector
        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        // Squiggle amplitude and frequency scale with distance
        const dist = len;
        const baseAmp = (this.config.isAmplified ? 0.055 : 0.04) * dist; // reduced amplitude
        const amp = baseAmp * (0.85 + 0.3 * Math.sin(t * Math.PI)); // slight variation over time
        const freq = this.config.isAmplified ? 3.0 : 2.2; // fewer oscillations
        const phase = Math.PI * 2 * freq * t;
        const offset = Math.sin(phase) * amp;
        return { x: bx + nx * offset, y: by + ny * offset };
    }
    spawnChargeEmbers(dt) {
        // spawn rate scales with time for nice anticipation ramp
        const rate = this.config.isAmplified ? 28 : 18;
        const count = Math.floor((dt / 1000) * rate) + 1;
        for (let i = 0; i < count; i++) {
            const src = Math.random() < 0.5 ? this.config.sourcePieces[0] : this.config.sourcePieces[1];
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.4 + Math.random() * 0.8;
            const hue = 8 + Math.floor(Math.random() * 24); // warm ember hues
            this.embers.push({
                x: src.x + Math.cos(ang) * (8 + Math.random() * 10),
                y: src.y + Math.sin(ang) * (8 + Math.random() * 10),
                vx: Math.cos(ang) * spd * 0.6,
                vy: Math.sin(ang) * spd * 0.6,
                size: 1 + Math.random() * 1.5,
                alpha: 0.6,
                life: 0,
                maxLife: 600 + Math.random() * 500,
                hue
            });
        }
    }
    spawnTrailEmbers(pos, dt) {
        const rate = this.config.isAmplified ? 40 : 25;
        const count = Math.floor((dt / 1000) * rate) + 1;
        for (let i = 0; i < count; i++) {
            const jitter = (r) => (Math.random() - 0.5) * r;
            const hue = 10 + Math.floor(Math.random() * 35);
            this.embers.push({
                x: pos.x + jitter(6),
                y: pos.y + jitter(6),
                vx: jitter(0.6),
                vy: jitter(0.6) - 0.15, // slight upward drift
                size: 1.2 + Math.random() * 1.8,
                alpha: 0.8,
                life: 0,
                maxLife: 700 + Math.random() * 500,
                hue
            });
        }
    }
    updateEmbers(dt) {
        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.life += dt;
            e.x += e.vx;
            e.y += e.vy;
            // fade and shrink
            e.alpha *= 0.985;
            e.size *= 0.992;
            if (e.life > e.maxLife || e.alpha < 0.05) {
                this.embers.splice(i, 1);
            }
        }
    }
    createImpactEffects() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        if (this.config.onTargetDestroyed)
            this.config.onTargetDestroyed();
        // shockwave ring
        this.shockwave = { r: 2, alpha: 0.9 };
        // create shards matching Amalgam diamond quadrants (same colors and shape)
        const size = this.getShardBaseSize(); // diamond half-diagonal scaled from graphics config
        const quadColors = this.getTargetQuadrantColors();
        // diamond corners (local space), rotated 45 degrees
        const corners = [
            { x: 0, y: -size }, // top
            { x: size, y: 0 }, // right
            { x: 0, y: size }, // bottom
            { x: -size, y: 0 } // left
        ];
        // quadrants as triangles from center to adjacent corners
        const quads = [
            { pts: [{ x: 0, y: 0 }, corners[0], corners[1]], color: quadColors[1], dir: { x: 1, y: -1 } }, // right (light blue in test)
            { pts: [{ x: 0, y: 0 }, corners[1], corners[2]], color: quadColors[0], dir: { x: 1, y: 1 } }, // bottom-right (ruby)
            { pts: [{ x: 0, y: 0 }, corners[2], corners[3]], color: quadColors[2], dir: { x: -1, y: 1 } }, // bottom-left (amber)
            { pts: [{ x: 0, y: 0 }, corners[3], corners[0]], color: quadColors[3], dir: { x: -1, y: -1 } } // top-left (jade)
        ];
        for (const q of quads) {
            const spd = 2.2 + Math.random() * 2.2;
            const jitter = 0.35;
            const vx = (q.dir.x + (Math.random() - 0.5) * jitter) * spd;
            const vy = (q.dir.y + (Math.random() - 0.5) * jitter) * spd;
            const rotation = (Math.random() - 0.5) * 0.6;
            const rotationSpeed = (Math.random() - 0.5) * 0.18;
            // shallow copy with tiny perturbation so edges feel fractured
            const pts = q.pts.map(p => ({ x: p.x * (0.96 + Math.random() * 0.08), y: p.y * (0.96 + Math.random() * 0.08) }));
            this.fragments.push({
                x: this.endPos.x,
                y: this.endPos.y,
                vx, vy,
                alpha: 1,
                life: 0,
                maxLife: 900 + Math.random() * 700,
                rotation,
                rotationSpeed,
                points: pts,
                fill: q.color
            });
        }
    }
    getShardBaseSize() {
        // Derive shard sizing from graphics configuration per target type
        try {
            const cfg = graphicsConfig.getConfig ? graphicsConfig.getConfig() : null;
            const pcs = cfg ? cfg.pieces : undefined;
            const tt = (this.config.targetType || 'Amalgam').toLowerCase();
            let base;
            if (tt === 'amalgam')
                base = pcs?.amalgam?.size;
            else if (tt === 'portal')
                base = pcs?.portal?.size;
            else if (tt === 'void')
                base = pcs?.void?.size;
            else if (tt === 'ruby')
                base = pcs?.gems?.ruby?.size;
            else if (tt === 'pearl')
                base = pcs?.gems?.pearl?.size;
            else if (tt === 'amber')
                base = pcs?.gems?.amber?.size;
            else if (tt === 'jade')
                base = pcs?.gems?.jade?.size;
            if (typeof base !== 'number')
                base = 14;
            const scaled = graphicsConfig.getScaledSize ? graphicsConfig.getScaledSize(base) : base;
            const factor = this.config.isAmplified ? 1.9 : 1.6;
            return scaled * factor;
        }
        catch {
            return this.config.isAmplified ? 26 : 22;
        }
    }
    getTargetQuadrantColors() {
        try {
            const cfg = graphicsConfig.getConfig ? graphicsConfig.getConfig() : null;
            const pcs = cfg ? cfg.pieces : undefined;
            const tt = (this.config.targetType || 'Amalgam');
            if (tt === 'Amalgam' && pcs?.amalgam?.quadrants) {
                const q = pcs.amalgam.quadrants;
                // Order: [top, right, left, bottom]
                return [q.top, q.right, q.left, q.bottom];
            }
            if (tt === 'Void' && pcs?.void) {
                return [pcs.void.outer_color, pcs.void.inner_color, pcs.void.outer_color, pcs.void.inner_color];
            }
            if (tt === 'Portal' && pcs?.portal) {
                return [pcs.portal.outer_color, pcs.portal.inner_color, pcs.portal.outer_color, pcs.portal.inner_color];
            }
            if (tt === 'Ruby' && pcs?.gems?.ruby?.color)
                return [pcs.gems.ruby.color, pcs.gems.ruby.color, pcs.gems.ruby.color, pcs.gems.ruby.color];
            if (tt === 'Pearl' && pcs?.gems?.pearl?.color)
                return [pcs.gems.pearl.color, pcs.gems.pearl.color, pcs.gems.pearl.color, pcs.gems.pearl.color];
            if (tt === 'Amber' && pcs?.gems?.amber?.color)
                return [pcs.gems.amber.color, pcs.gems.amber.color, pcs.gems.amber.color, pcs.gems.amber.color];
            if (tt === 'Jade' && pcs?.gems?.jade?.color)
                return [pcs.gems.jade.color, pcs.gems.jade.color, pcs.gems.jade.color, pcs.gems.jade.color];
            return ['#E63960', '#87CEEB', '#F6C13F', '#A9E886'];
        }
        catch {
            return ['#E63960', '#87CEEB', '#F6C13F', '#A9E886'];
        }
    }
    updateFragments(dt) {
        for (let i = this.fragments.length - 1; i >= 0; i--) {
            const f = this.fragments[i];
            f.life += dt;
            f.x += f.vx;
            f.y += f.vy;
            f.vy += 0.05; // light gravity
            f.rotation += f.rotationSpeed;
            // fade over time
            f.alpha *= 0.975;
            if (f.life > f.maxLife || f.alpha < 0.05) {
                this.fragments.splice(i, 1);
            }
        }
        if (this.shockwave) {
            this.shockwave.r += 3.6;
            this.shockwave.alpha *= 0.94;
            if (this.shockwave.alpha < 0.06)
                this.shockwave = null;
        }
    }
    update(deltaTime) {
        if (!this.isActive)
            return;
        this.timeMs += deltaTime;
        // phase progression
        if (this.phase === 'charge' && this.timeMs >= this.T.CHARGE) {
            this.phase = 'launch';
            this.timeMs = 0;
        }
        else if (this.phase === 'launch' && this.timeMs >= this.T.LAUNCH) {
            this.phase = 'impact';
            this.timeMs = 0;
            this.createImpactEffects();
        }
        else if (this.phase === 'impact' && this.timeMs >= this.T.IMPACT) {
            this.phase = 'fade';
            this.timeMs = 0;
        }
        // per-phase updates
        if (this.phase === 'charge') {
            this.spawnChargeEmbers(deltaTime);
        }
        else if (this.phase === 'launch') {
            // param t in [0,1]
            const t = Math.min(1, this.timeMs / this.T.LAUNCH);
            const pos = this.squigglePoint(t);
            // light flow influence for subtle organic texture
            const flow = this.flowAt(pos.x, pos.y);
            pos.x += Math.cos(flow) * 0.5;
            pos.y += Math.sin(flow) * 0.5;
            this.spawnTrailEmbers(pos, deltaTime);
        }
        // global updates
        this.updateEmbers(deltaTime);
        this.updateFragments(deltaTime);
        // finish condition
        if (this.phase === 'fade' && this.embers.length === 0 && this.fragments.length === 0 && !this.shockwave) {
            this.isActive = false;
        }
    }
    draw(ctx) {
        if (!this.isActive)
            return;
        ctx.save();
        // draw charge aura around rubies
        if (this.phase === 'charge') {
            const pulse = 0.5 + 0.5 * Math.sin((Date.now() % 800) / 800 * Math.PI * 2);
            for (const src of this.config.sourcePieces) {
                ctx.globalAlpha = 0.25 + 0.25 * pulse;
                const r = (this.config.isAmplified ? 18 : 14) + 4 * pulse;
                const grad = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, r);
                grad.addColorStop(0, 'rgba(255,70,40,0.9)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(src.x, src.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // draw main projectile (glowing orb) during launch and impact
        if (this.phase === 'launch' || this.phase === 'impact') {
            const t = Math.min(1, this.timeMs / this.T.LAUNCH);
            const pos = this.squigglePoint(this.phase === 'launch' ? t : 1);
            const coreR = this.config.isAmplified ? 6 : 5;
            const glowR = coreR * 3.2;
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
            grad.addColorStop(0, 'rgba(255,120,60,1)');
            grad.addColorStop(0.35, 'rgba(255,60,30,0.85)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
            ctx.fill();
            // bright core
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, coreR, 0, Math.PI * 2);
            ctx.fill();
        }
        // draw embers (trail + charge)
        for (const e of this.embers) {
            ctx.globalAlpha = e.alpha;
            ctx.fillStyle = `hsl(${e.hue}, 90%, 60%)`;
            ctx.shadowColor = `hsl(${e.hue}, 90%, 60%)`;
            ctx.shadowBlur = e.size * 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
        // draw impact effects
        if (this.shockwave) {
            ctx.globalAlpha = this.shockwave.alpha;
            ctx.strokeStyle = 'rgba(255,180,140,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.endPos.x, this.endPos.y, this.shockwave.r, 0, Math.PI * 2);
            ctx.stroke();
        }
        for (const f of this.fragments) {
            ctx.globalAlpha = f.alpha;
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);
            ctx.fillStyle = f.fill;
            ctx.shadowColor = f.fill;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            if (f.points.length) {
                ctx.moveTo(f.points[0].x, f.points[0].y);
                for (let k = 1; k < f.points.length; k++) {
                    const pt = f.points[k];
                    ctx.lineTo(pt.x, pt.y);
                }
                ctx.closePath();
            }
            ctx.fill();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.restore();
    }
    isComplete() { return !this.isActive; }
}
export class FireballAnimationManager {
    constructor(canvas) {
        this.animations = [];
        this.canvas = canvas;
    }
    createFireballAnimation(sourcePieces, targetPosition, isAmplified = false, onTargetDestroyed, targetType) {
        const id = `fireball_v2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const anim = new FireballV2Animation({
            sourcePieces,
            targetPosition,
            isAmplified,
            canvas: this.canvas,
            onTargetDestroyed,
            targetType
        });
        this.animations.push(anim);
        return id;
    }
    update(deltaTime) {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const a = this.animations[i];
            a.update(deltaTime);
            if (a.isComplete())
                this.animations.splice(i, 1);
        }
    }
    draw(ctx) {
        for (const a of this.animations)
            a.draw(ctx);
    }
    getActiveAnimationCount() { return this.animations.length; }
    clearAll() { this.animations = []; }
}
// Fireball Animation V2 (versioned) for Amalgam Game
// For now, V2 mirrors the current implementation to keep test suite versions distinct.
export * from './fireball-animation.js';
