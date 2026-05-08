/**
 * projectile.js - 投射物系统 v2.3
 * 新增：ignoreDef 参数传递（暴君等无视防御技能）
 */

import { PROJECTILE_TYPES } from './config.js';

export class Projectile {
    constructor(x, y, target, damage, isCrit, team, type = 'normal', ignoreDef = false) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.isCrit = isCrit;
        this.team = team;
        this.alive = true;
        this.type = type;
        this.ignoreDef = ignoreDef;
        this.config = PROJECTILE_TYPES[this.type] || PROJECTILE_TYPES['normal'];
        this.rotation = 0;
        this.scale = 1;
        this.trail = [];
    }

    update(effectsManager) {
        if (!this.target || !this.target.alive || !this.alive) {
            this.alive = false;
            return;
        }

        this.trail.push({ x: this.x, y: this.y, life: 1 });
        this.trail = this.trail.filter(t => { t.life -= 0.1; return t.life > 0; });

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
            this.target.takeDamage(this.damage, { x: this.x, y: this.y, team: this.team }, effectsManager, this.ignoreDef);
            this.alive = false;
            const effect = this.isCrit ? '💥' : (this.type === 'fire' ? '🔥' : this.type === 'ice' ? '❄️' : '💢');
            effectsManager.addTextEffect(this.target.x, this.target.y, effect, 0.6);
        } else {
            this.x += (dx / dist) * this.config.speed;
            this.y += (dy / dist) * this.config.speed;
            this.rotation += 0.3;
            this.scale = 1 + Math.sin(Date.now() / 100) * 0.2;
        }
    }

    draw(ctx) {
        for (const t of this.trail) {
            const trailColor = this.type === 'fire' ? `rgba(255, 100, 0, ${t.life * 0.3})` :
                               this.type === 'ice' ? `rgba(100, 200, 255, ${t.life * 0.3})` :
                               `rgba(255, 255, 0, ${t.life * 0.3})`;
            ctx.fillStyle = trailColor;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3 * t.life, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.emoji, 0, 0);
        ctx.restore();
    }
}
