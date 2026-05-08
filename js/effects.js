/**
 * effects.js - 粒子特效 & 伤害数字 & 区域效果 v2.1
 * 优化：移除死亡💀emoji，简化范围伤害特效
 */

export class AreaEffect {
    constructor(x, y, radius, color, duration = 0.5, damage = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.life = duration;
        this.maxLife = duration;
        this.damage = damage;
        this.expanding = true;
        this.currentRadius = 5;
    }

    update(dt) {
        if (this.expanding) {
            this.currentRadius += (this.radius - this.currentRadius) * 0.2;
            if (this.currentRadius > this.radius * 0.9) this.expanding = false;
        }
        this.life -= dt;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * 0.5;
        const r = this.expanding ? this.currentRadius : this.radius;

        // 外圈虚线圆（标记范围）
        ctx.save();
        ctx.strokeStyle = this.color.replace('ALPHA', (alpha * 0.8).toFixed(3));
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 半透明填充
        ctx.fillStyle = this.color.replace('ALPHA', (alpha * 0.15).toFixed(3));
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();

        // 内圈实心（较小）
        ctx.fillStyle = this.color.replace('ALPHA', (alpha * 0.3).toFixed(3));
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/** 简单的范围伤害波纹指示器 */
export class RangeIndicator {
    constructor(x, y, radius, color = 'rgba(255,100,50,ALPHA)') {
        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.currentRadius = 0;
        this.life = 0.6;
        this.maxLife = 0.6;
        this.color = color;
    }

    update(dt) {
        this.currentRadius += (this.maxRadius - this.currentRadius) * 0.15;
        this.life -= dt;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * 0.4;
        ctx.save();
        ctx.strokeStyle = this.color.replace('ALPHA', alpha.toFixed(3));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

export class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 100 * dt;
        this.life -= dt;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

export class EffectsManager {
    constructor() {
        this.textEffects = [];
        this.particles = [];
        this.areaEffects = [];
        this.rangeIndicators = [];
        this.screenShake = 0;
    }

    addTextEffect(x, y, text, duration = 1.0) {
        this.textEffects.push({ x, y, text, life: duration, maxLife: duration });
    }

    addDamageNumber(x, y, dmg, isBig = false) {
        let text = dmg.toString();
        if (isBig) text += '!';
        this.textEffects.push({
            x: x + (Math.random() - 0.5) * 20,
            y,
            text,
            life: 0.8,
            maxLife: 0.8,
            isBig
        });
    }

    addAreaEffect(x, y, radius, color, duration = 0.5, damage = 0) {
        this.areaEffects.push(new AreaEffect(x, y, radius, color, duration, damage));
    }

    /** 新增：简单的范围波纹指示 */
    addRangeIndicator(x, y, radius, color = 'rgba(255,100,50,ALPHA)') {
        this.rangeIndicators.push(new RangeIndicator(x, y, radius, color));
    }

    addParticleBurst(x, y, count, color, speed = 200) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const spd = speed * (0.5 + Math.random() * 0.5);
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd - 50,
                0.5 + Math.random() * 0.3,
                color,
                2 + Math.random() * 3
            ));
        }
    }

    /** 死亡特效：只用小粒子爆散，不显示💀emoji */
    addDeathEffect(x, y) {
        this.addParticleBurst(x, y, 8, '#ff6b6b', 120);
    }

    shakeScreen(intensity = 5) {
        this.screenShake = Math.max(this.screenShake, intensity);
    }

    update(dt) {
        this.textEffects = this.textEffects.filter(e => {
            e.life -= dt;
            e.y -= 35 * dt;
            return e.life > 0;
        });

        this.particles = this.particles.filter(p => p.update(dt));
        this.areaEffects = this.areaEffects.filter(e => e.update(dt));
        this.rangeIndicators = this.rangeIndicators.filter(e => e.update(dt));

        if (this.screenShake > 0) {
            this.screenShake *= 0.9;
            if (this.screenShake < 0.5) this.screenShake = 0;
        }
    }

    draw(ctx) {
        for (const e of this.areaEffects) e.draw(ctx);
        for (const e of this.rangeIndicators) e.draw(ctx);
        for (const p of this.particles) p.draw(ctx);

        for (const e of this.textEffects) {
            const alpha = Math.min(1, e.life / (e.maxLife * 0.5));
            const scale = e.isBig ? 1.3 : 1;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${Math.round(20 * scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = e.isBig ? '#ff4444' : '#ffd700';
            ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
            ctx.lineWidth = 3;
            ctx.strokeText(e.text, e.x, e.y);
            ctx.fillText(e.text, e.x, e.y);
            ctx.restore();
        }
    }

    getShakeOffset() {
        if (this.screenShake <= 0) return { x: 0, y: 0 };
        return {
            x: (Math.random() - 0.5) * this.screenShake * 2,
            y: (Math.random() - 0.5) * this.screenShake * 2
        };
    }
}
