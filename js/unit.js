/**
 * unit.js - 战斗单位 v2.3
 * 新防御公式（百分比减伤）、移除老鹰高空免疫、分身不召唤、追敌不抖
 */

import { ANIMAL_DB, TIER_PRICES, RANGED_UNITS, SKILL_ONLY_UNITS, MAX_CLONES, CLONE_ATTACK_INTERVAL, CLONE_STAT_RATIO, calcDamageReduction } from './config.js';
import { Projectile } from './projectile.js';

export class Unit {
    constructor(emoji, team, x, y, isAnimating = true) {
        this.emoji = emoji;
        this.team = team;
        this.data = ANIMAL_DB[emoji];
        this.x = x;
        this.y = y;
        this.startX = x;

        this.maxHp = this.data.hp;
        this.hp = this.maxHp;
        this.atk = this.data.atk;
        this.def = this.data.def;
        this.atkSpd = this.data.spd;
        this.range = this.data.range;
        this.moveSpeed = this.data.ms;

        this.alive = true;
        this.target = null;
        this.lastAttack = 0;
        this.direction = team === 'left' ? 1 : -1;
        this.effects = {};
        this.skillCooldown = 0;
        this.attackCount = 0;
        this.hasRevived = false;
        this.isInvisible = false;
        this.hasFlanked = false;
        this.flankTimer = 0;

        this.size = 18 + (this.data.tier * this.data.tier);
        if (this.data.tier === 10) this.size = 120;
        if (this.data.tier === 1) this.size = 16;

        this.barWidth = Math.min(80, 20 + this.maxHp / 200);
        this.barHeight = Math.max(4, this.data.tier * 0.8);

        this.scale = isAnimating ? 0 : 1;
        this.targetScale = 1;
        this.attackAnim = 0;
        this.deathAnim = 0;
        this.idleOffset = Math.random() * Math.PI * 2;
        this.hitFlash = 0;

        this.isSkillUnit = SKILL_ONLY_UNITS.includes(this.data.name);
        this.nextSkillTime = 0;
        this.invincibleCooldown = 0;
        this.isClone = false;
        this.cloneCount = 0;
    }

    update(dt, enemies, alliedUnits, projectiles, effectsManager, canvasWidth, canvasHeight, audioManager) {
        if (this.hp <= 0) {
            if (this.alive) {
                this.alive = false;
                this.deathAnim = 0;
                effectsManager.addDeathEffect(this.x, this.y);
                if (audioManager) audioManager.playDeath();
                for (const ally of alliedUnits) {
                    if (ally.alive && ally.data.skill === '忠诚') {
                        ally.atk = Math.floor(ally.atk * 1.5);
                        effectsManager.addTextEffect(ally.x, ally.y - ally.size, '💪', 0.8);
                    }
                }
            } else {
                this.deathAnim += dt;
            }
            return;
        }

        if (this.scale < this.targetScale) {
            this.scale += dt * 3;
            if (this.scale > this.targetScale) this.scale = this.targetScale;
        }
        if (this.attackAnim > 0) this.attackAnim -= dt * 5;
        if (this.hitFlash > 0) this.hitFlash -= dt * 6;

        // 状态效果
        if (this.effects.poison) {
            this.hp -= this.effects.poison.dps * dt;
            this.effects.poison.time -= dt;
            if (this.effects.poison.time <= 0) delete this.effects.poison;
            if (this.hp <= 0) { this.hp = 0; this.alive = false; this.deathAnim = 0; effectsManager.addDeathEffect(this.x, this.y); return; }
        }
        if (this.effects.stun) {
            this.effects.stun -= dt;
            if (this.effects.stun <= 0) delete this.effects.stun;
            return;
        }
        if (this.effects.invincible) {
            this.effects.invincible -= dt;
            if (this.effects.invincible <= 0) delete this.effects.invincible;
        }
        if (this.effects.slow) {
            this.effects.slow -= dt;
            if (this.effects.slow <= 0) delete this.effects.slow;
        }
        if (this.skillCooldown > 0) this.skillCooldown -= dt;
        if (this.invincibleCooldown > 0) this.invincibleCooldown -= dt;

        // 绕后
        if (this.data.skill === '绕后' && !this.hasFlanked) {
            this.flankTimer += dt;
            if (this.flankTimer >= 5) {
                let targetX = this.team === 'left'
                    ? canvasWidth - 80 - Math.random() * 100
                    : 80 + Math.random() * 100;
                let targetY = this.y + (Math.random() - 0.5) * 150;
                targetY = Math.max(80, Math.min(canvasHeight - 80, targetY));
                effectsManager.addTextEffect(this.x, this.y, '💨', 0.5);
                this.x = targetX;
                this.y = targetY;
                this.hasFlanked = true;
                this.direction = -this.direction;
                effectsManager.addTextEffect(this.x, this.y, '⚡', 0.8);
                if (audioManager) audioManager.playSkill();
            }
        }

        // 潜行
        this.isInvisible = (this.data.skill === '潜行' && this.attackCount < 1);

        // 技能型定时释放
        if (this.isSkillUnit) {
            this.nextSkillTime -= dt;
            if (this.nextSkillTime <= 0) {
                this._performSkillOnlyAttack(enemies, effectsManager, audioManager);
                this.nextSkillTime = this.data.name === '猛犸象' ? 5 : 2;
            }
        }

        // 寻找目标
        let minDist = Infinity;
        this.target = null;
        for (const enemy of enemies) {
            if (!enemy.alive || enemy.isInvisible) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                this.target = enemy;
            }
        }

        // 移动
        let isChasing = false;
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this.range) {
                isChasing = true;
                let moveDist = this.moveSpeed * dt * 45;
                if (this.data.skill === '狂暴' && this.hp < this.maxHp * 0.5) moveDist *= 1.5;
                if (this.data.skill === '狡猾' && this.hp < this.maxHp * 0.3) moveDist *= 2;
                if (dist > 0) {
                    this.x += (dx / dist) * moveDist;
                    this.y += (dy / dist) * moveDist * 0.4;
                }
            } else {
                if (!this.isSkillUnit) {
                    this.lastAttack += dt;
                    let spdMult = this.effects.slow ? 0.5 : 1;
                    if (this.data.skill === '狡猾' && this.hp < this.maxHp * 0.3) spdMult *= 2;
                    const interval = 1.0 / (this.atkSpd * spdMult);
                    if (this.lastAttack >= interval) {
                        this.lastAttack = 0;
                        this.attackAnim = 1;
                        this._performAttack(enemies, alliedUnits, projectiles, effectsManager, audioManager);
                    }
                }
            }
        } else {
            isChasing = true;
            const moveDist = this.moveSpeed * dt * 45;
            this.x += moveDist * this.direction;
        }

        // 分散力
        for (const ally of alliedUnits) {
            if (ally === this || !ally.alive) continue;
            const adx = this.x - ally.x;
            const ady = this.y - ally.y;
            const adist = Math.sqrt(adx * adx + ady * ady);
            const minSep = (this.size + ally.size) * 0.45;
            if (adist < minSep && adist > 1) {
                const pushForce = ((minSep - adist) / minSep) * 0.8;
                this.x += (adx / adist) * pushForce;
                this.y += (ady / adist) * pushForce;
            }
        }

        // 仅待命时微浮动
        if (!isChasing) {
            const bobScale = Math.min(0.4, this.moveSpeed * 0.2);
            this.y += Math.sin(Date.now() / 1200 + this.idleOffset) * bobScale;
        }

        this.y = Math.max(80, Math.min(canvasHeight - 80, this.y));

        // 再生
        if (this.data.skill === '再生' && this.hp < this.maxHp) {
            const heal = this.hp < this.maxHp * 0.5 ? 40 : 20;
            this.hp = Math.min(this.maxHp, this.hp + heal * dt);
        }

        // 复活判定
        if (this.hp <= 0 && this.alive) {
            if (this.data.skill === '复活' && !this.hasRevived) {
                this.hp = this.maxHp;
                this.hasRevived = true;
                effectsManager.addTextEffect(this.x, this.y - this.size, '✨', 1.5);
                effectsManager.addParticleBurst(this.x, this.y, 15, '#ffd700', 150);
                if (audioManager) audioManager.playSkill();
                for (const ally of alliedUnits) {
                    if (ally.alive && Math.abs(ally.x - this.x) < 200) {
                        ally.hp = Math.min(ally.maxHp, ally.hp + this.maxHp * 0.5);
                        effectsManager.addTextEffect(ally.x, ally.y - ally.size, '💚', 0.5);
                    }
                }
            } else {
                this.alive = false;
                this.deathAnim = 0;
            }
        }
    }

    _performSkillOnlyAttack(enemies, effectsManager, audioManager) {
        if (this.data.name === '猛犸象') {
            const dmg = 200;
            const range = 200;
            effectsManager.addAreaEffect(this.x, this.y, range, 'rgba(139,69,19,ALPHA)', 0.8, dmg);
            effectsManager.addRangeIndicator(this.x, this.y, range, 'rgba(180,120,50,ALPHA)');
            for (const e of enemies) {
                if (e.alive) {
                    const dist = Math.sqrt(Math.pow(e.x - this.x, 2) + Math.pow(e.y - this.y, 2));
                    if (dist < range) {
                        e.takeDamage(dmg, this, effectsManager, true); // 技能伤害也过减伤
                        e.effects.stun = 2;
                    }
                }
            }
            effectsManager.addTextEffect(this.x, this.y - this.size, '💢', 1);
            effectsManager.shakeScreen(6);
            if (audioManager) audioManager.playExplosion();
        }
        if (this.data.name === '龙') {
            const facing = this.direction;
            const coneX = this.x + facing * 150;
            const coneY = this.y;
            const range = 300;
            effectsManager.addAreaEffect(coneX, coneY, range * 0.6, 'rgba(255,69,0,ALPHA)', 1.5, 0);
            effectsManager.addRangeIndicator(coneX, coneY, range * 0.5, 'rgba(255,100,0,ALPHA)');
            for (const e of enemies) {
                if (e.alive) {
                    let inRange = false;
                    if (facing > 0 && e.x > this.x && e.x < this.x + range && Math.abs(e.y - this.y) < 100) inRange = true;
                    if (facing < 0 && e.x < this.x && e.x > this.x - range && Math.abs(e.y - this.y) < 100) inRange = true;
                    if (inRange) {
                        e.takeDamage(250, this, effectsManager);
                    }
                }
            }
            effectsManager.shakeScreen(5);
            if (audioManager) audioManager.playExplosion();
        }
    }

    _performAttack(enemies, alliedUnits, projectiles, effectsManager, audioManager) {
        if (!this.target || !this.target.alive) return;

        this.attackCount++;
        let dmg = this.atk;
        let isCrit = false;
        let projType = 'normal';
        let ignoreDef = false; // 暴君无视防御

        // 暴击
        if ((this.data.skill === '暴击' || (this.data.skill === '潜行' && this.attackCount <= 1))
            && Math.random() < (this.data.tier >= 7 ? 0.4 : 0.35)) {
            dmg *= (this.data.name === '豹子' ? 5 : 3.5);
            isCrit = true;
            if (audioManager) audioManager.playCrit();
        }

        // 飞踢
        if (this.data.skill === '飞踢' && this.attackCount % 3 === 0) {
            dmg *= 4;
            effectsManager.addTextEffect(this.x, this.y - this.size, '🦶', 0.8);
            this.target.x += 80 * (this.team === 'left' ? 1 : -1);
            projType = 'arrow';
        }
        // 伏击
        else if (this.data.skill === '伏击' && this.attackCount === 1) {
            dmg *= 10;
            effectsManager.addTextEffect(this.x, this.y - this.size, '🥷', 1);
        }
        // 处决
        else if (this.data.skill === '处决' && this.target.hp < this.target.maxHp * 0.35) {
            dmg = 99999;
            effectsManager.addTextEffect(this.target.x, this.target.y - this.target.size, '⚔️', 1);
            effectsManager.shakeScreen(5);
        }
        // 暴君（无视防御）
        else if (this.data.skill === '暴君') {
            ignoreDef = true;
        }
        // 吞噬
        else if (this.data.skill === '吞噬' && this.target.hp < this.target.maxHp * 0.25) {
            dmg = 99999;
            effectsManager.addTextEffect(this.target.x, this.target.y, '😋', 1);
        }
        // 血怒
        else if (this.data.skill === '血怒' && this.target.hp < this.target.maxHp * 0.5) {
            dmg *= 2;
            effectsManager.addTextEffect(this.x, this.y - this.size, '🩸', 0.5);
        }
        // 冲锋
        else if (this.data.skill === '冲锋' && this.attackCount === 1) {
            dmg *= 3;
            this.target.x += 60 * (this.team === 'left' ? 1 : -1);
            effectsManager.addTextEffect(this.x, this.y - this.size, '🐴💨', 0.8);
        }
        // 连击
        else if (this.data.skill === '连击') {
            const target = this.target;
            const d = dmg * 0.8;
            setTimeout(() => {
                if (target && target.alive) target.takeDamage(d, this, effectsManager);
            }, 150);
        }

        const isRanged = this.range > 200 || RANGED_UNITS.includes(this.data.name);

        if (isRanged) {
            if (this.data.skill === '冰封') projType = 'ice';
            else if (this.data.skill === '剧毒') projType = 'poison';

            projectiles.push(new Projectile(
                this.x, this.y, this.target, dmg, isCrit, this.team, projType, ignoreDef
            ));

            // AOE + 范围指示
            if (['毁灭', '践踏', '翻滚', '冲撞'].includes(this.data.skill)) {
                const aoeRange = this.data.skill === '毁灭' ? 180 : 100;
                const aoeDmg = dmg * (this.data.skill === '毁灭' ? 0.8 : 0.5);
                const color = this.data.skill === '毁灭' ? 'rgba(255,69,0,ALPHA)' : 'rgba(160,82,45,ALPHA)';
                const centerX = (this.x + this.target.x) / 2;
                const centerY = (this.y + this.target.y) / 2;
                effectsManager.addAreaEffect(centerX, centerY, aoeRange, color, 0.6, aoeDmg);
                effectsManager.addRangeIndicator(centerX, centerY, aoeRange);
                for (const e of enemies) {
                    if (e.alive && e !== this.target) {
                        const dist = Math.sqrt(Math.pow(e.x - centerX, 2) + Math.pow(e.y - centerY, 2));
                        if (dist < aoeRange) {
                            e.takeDamage(aoeDmg, this, effectsManager);
                            if (this.data.skill === '冲撞') {
                                e.x += 60 * (this.team === 'left' ? 1 : -1);
                                e.effects.stun = 1;
                            }
                        }
                    }
                }
                effectsManager.shakeScreen(3);
                if (audioManager) audioManager.playExplosion();
            }
        } else {
            // 近战：应用防御减伤
            this.target.takeDamage(dmg, this, effectsManager, ignoreDef);
            if (isCrit) effectsManager.addTextEffect(this.target.x, this.target.y - this.target.size / 2, '💥', 0.6);

            // 翻滚
            if (this.data.skill === '翻滚') {
                this.hp = Math.min(this.maxHp, this.hp + dmg * 0.5);
                effectsManager.addTextEffect(this.x, this.y, '🌀', 0.5);
                const centerX = (this.x + this.target.x) / 2;
                const centerY = (this.y + this.target.y) / 2;
                effectsManager.addAreaEffect(centerX, centerY, 80, 'rgba(0,255,100,ALPHA)', 0.4);
                effectsManager.addRangeIndicator(centerX, centerY, 80, 'rgba(0,200,100,ALPHA)');
                for (const e of enemies) {
                    if (e.alive && e !== this.target && Math.abs(e.x - centerX) < 80 && Math.abs(e.y - centerY) < 40) {
                        e.takeDamage(this.atk * 0.5, this, effectsManager);
                        this.hp = Math.min(this.maxHp, this.hp + this.atk * 0.25);
                    }
                }
            }
            // 践踏
            if (this.data.skill === '践踏') {
                const centerX = (this.x + this.target.x) / 2;
                const centerY = (this.y + this.target.y) / 2;
                effectsManager.addAreaEffect(centerX, centerY, 100, 'rgba(160,82,45,ALPHA)', 0.5);
                effectsManager.addRangeIndicator(centerX, centerY, 100, 'rgba(160,100,45,ALPHA)');
                for (const e of enemies) {
                    if (e.alive && e !== this.target && Math.abs(e.x - centerX) < 100 && Math.abs(e.y - centerY) < 50) {
                        e.takeDamage(100, this, effectsManager);
                    }
                }
                effectsManager.addTextEffect(this.x, this.y, '👣', 0.5);
            }
            // 威吓
            if (this.data.skill === '威吓') {
                for (const e of enemies) {
                    if (e.alive && Math.abs(e.x - this.x) < 150) {
                        e.effects.slow = Math.max(e.effects.slow || 0, 3);
                    }
                }
            }
        }

        // 吸血
        if (this.data.skill === '吸血') {
            const heal = dmg * 0.8;
            this.hp = Math.min(this.maxHp, this.hp + heal);
            effectsManager.addTextEffect(this.x, this.y - this.size, '❤️', 0.4);
        }
        // 减速
        if (this.data.skill === '减速') this.target.effects.slow = 5;
        // 剧毒
        if (this.data.skill === '剧毒') {
            this.target.effects.poison = { dps: this.data.tier >= 5 ? 15 : 3, time: 5 };
        }
        // 缠绕
        if (this.data.skill === '缠绕' && Math.random() < 0.4) {
            this.target.effects.stun = 2;
            effectsManager.addTextEffect(this.target.x, this.target.y, '⛓️', 1);
        }
        // 冰封
        if (this.data.skill === '冰封' && Math.random() < 0.5) {
            this.target.effects.stun = 3;
            effectsManager.addTextEffect(this.target.x, this.target.y, '❄️', 1);
        }
        // 严寒
        if (this.data.skill === '严寒' && Math.random() < 0.2) {
            this.target.effects.stun = 1;
            effectsManager.addTextEffect(this.target.x, this.target.y, '🧊', 0.6);
        }
        // 狂暴
        if (this.data.skill === '狂暴' && this.hp < this.maxHp * 0.5) {
            this.lastAttack = 99;
        }
        // 召唤（分身不可再召唤）
        if (this.data.skill === '召唤' && !this.isClone
            && this.attackCount % CLONE_ATTACK_INTERVAL === 0
            && this.attackCount > 0
            && this.cloneCount < MAX_CLONES) {
            const numToSummon = Math.min(2, MAX_CLONES - this.cloneCount);
            for (let i = 0; i < numToSummon; i++) {
                const clone = new Unit('🐋', this.team, this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 80, true);
                clone.maxHp = Math.floor(this.maxHp * CLONE_STAT_RATIO);
                clone.hp = clone.maxHp;
                clone.atk = Math.floor(this.atk * CLONE_STAT_RATIO);
                clone.isClone = true;
                clone.size = this.size * 0.65;
                alliedUnits.push(clone);
            }
            this.cloneCount += numToSummon;
            effectsManager.addTextEffect(this.x, this.y - this.size, '👥', 1);
            if (audioManager) audioManager.playSkill();
        }
        // 长舌
        if (this.data.skill === '长舌') {
            this.target.x = this.x + 50 * (this.team === 'left' ? 1 : -1);
            this.target.effects.stun = 1;
            effectsManager.addTextEffect(this.target.x, this.target.y, '👅', 0.8);
        }
        // 狼群
        if (this.data.skill === '狼群') {
            let wolfCount = 0;
            for (const ally of alliedUnits) {
                if (ally.alive && ally !== this && ally.data.skill === '狼群' &&
                    Math.abs(ally.x - this.x) < 200 && Math.abs(ally.y - this.y) < 150) {
                    wolfCount++;
                }
            }
            if (wolfCount > 0) {
                const bonusDmg = dmg * wolfCount * 0.2;
                if (this.target && this.target.alive) this.target.takeDamage(bonusDmg, this, effectsManager);
            }
        }
        // 表演（嘲讽）
        if (this.data.skill === '表演') {
            for (const e of enemies) {
                if (e.alive && Math.abs(e.x - this.x) < 150 && Math.abs(e.y - this.y) < 100) {
                    e.target = this;
                }
            }
        }

        if (!isCrit && audioManager) audioManager.playHit();
    }

    /**
     * ★ 新防御公式：百分比减伤
     * reduction = def / (def + 100)，最高95%，最低受到5%伤害
     * ignoreDef = true 时无视防御（暴君技能）
     */
    takeDamage(rawDmg, attacker, effectsManager, ignoreDef = false) {
        if (!this.alive) return;

        if (this.effects.invincible && this.effects.invincible > 0) return;

        // 乌龟无敌
        if (this.data.skill === '无敌' && this.invincibleCooldown <= 0 && this.hp - rawDmg <= 0) {
            this.hp = 1;
            this.effects.invincible = 3;
            this.invincibleCooldown = 15;
            effectsManager.addTextEffect(this.x, this.y - this.size, '🛡️', 1.5);
            effectsManager.addParticleBurst(this.x, this.y, 10, '#ffd700', 80);
            return;
        }

        // 闪避
        if (this.data.skill === '闪避' && Math.random() < 0.4) {
            effectsManager.addTextEffect(this.x, this.y - this.size, '💨', 0.5);
            return;
        }

        // ★ 应用百分比减伤
        let actualDmg = rawDmg;
        if (!ignoreDef && this.def > 0) {
            const reduction = calcDamageReduction(this.def);
            actualDmg = rawDmg * (1 - reduction);
        }
        // 保证最低 5% 伤害
        actualDmg = Math.max(rawDmg * 0.05, actualDmg);
        actualDmg = Math.max(1, Math.round(actualDmg));

        // 螃蟹额外减伤
        if (this.data.name === '螃蟹') actualDmg = Math.round(actualDmg * 0.7);

        // 冰封：冻结目标受伤翻倍
        if (this.effects.stun && attacker && attacker.data && attacker.data.skill === '冰封') {
            actualDmg *= 2;
        }

        // 反刺
        if (this.data.skill === '反刺' && attacker && attacker.hp !== undefined && attacker.x !== undefined && Math.abs(attacker.x - this.x) < 100) {
            const reflect = Math.round(actualDmg * 0.3);
            attacker.hp -= reflect;
            if (attacker.hp <= 0 && attacker.alive) { attacker.alive = false; attacker.deathAnim = 0; }
        }
        // 膨胀
        if (this.data.skill === '膨胀' && attacker && attacker.hp !== undefined) {
            const reflect = Math.round(actualDmg * 0.4);
            attacker.hp -= reflect;
            if (attacker.hp <= 0 && attacker.alive) { attacker.alive = false; attacker.deathAnim = 0; }
        }

        this.hp -= actualDmg;

        if (this.hp <= 0) {
            this.hp = 0;
            if (!(this.data.skill === '复活' && !this.hasRevived)) {
                this.alive = false;
                this.deathAnim = 0;
            }
            return;
        }

        effectsManager.addDamageNumber(this.x, this.y - this.size, Math.floor(actualDmg), actualDmg > this.maxHp * 0.15);
        this.hitFlash = 1;
        if (actualDmg > this.maxHp * 0.3) effectsManager.shakeScreen(3);
    }

    draw(ctx) {
        if (!this.alive && this.deathAnim > 0.4) return;

        ctx.save();
        ctx.globalAlpha = 1.0;

        let drawX = this.x;
        let drawY = this.y;
        let drawScale = this.scale;

        if (!this.alive) {
            const fade = Math.max(0, 1 - this.deathAnim * 2.5);
            drawScale *= fade;
            ctx.globalAlpha = fade;
        }

        if (this.attackAnim > 0 && this.alive) {
            drawX += Math.sin(this.attackAnim * Math.PI) * 15 * this.direction;
        }

        if (this.isInvisible) ctx.globalAlpha = 0.35;

        if (this.hitFlash > 0 && this.alive) {
            ctx.globalAlpha = Math.max(ctx.globalAlpha * 0.7, 0.6);
        }

        // 无敌光环
        if (this.effects.invincible && this.effects.invincible > 0) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 80) * 0.15;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.9 * drawScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 阴影
        if (this.alive) {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(drawX, drawY + this.size * drawScale * 0.4, this.size * drawScale * 0.3, this.size * drawScale * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.alive && !this.isInvisible) {
            ctx.globalAlpha = this.hitFlash > 0 ? 0.85 : 1.0;
        }

        // 绘制emoji
        ctx.font = `${this.size * drawScale}px 'Segoe UI Emoji'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(drawX, drawY);
        if (this.team === 'left') {
            ctx.scale(-1 * drawScale, drawScale);
        } else {
            ctx.scale(drawScale, drawScale);
        }
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();

        if (this.effects.stun) {
            ctx.font = `${this.size * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.8;
            ctx.fillText('😵', drawX, drawY - this.size * 0.5);
        }

        ctx.restore();

        if (!this.alive) return;

        // 血条
        const barW = Math.max(30, Math.min(80, this.barWidth));
        const barH = Math.max(3, this.barHeight);
        const hpPct = Math.min(1, Math.max(0, this.hp) / this.maxHp);
        const barY = drawY - this.size * drawScale / 2 - barH - 10;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(drawX - barW / 2 - 1, barY - 1, barW + 2, barH + 2);

        let r, g, b;
        if (this.team === 'left') {
            g = Math.floor(200 * hpPct + 50); r = Math.floor(255 * (1 - hpPct)); b = 50;
        } else {
            r = Math.floor(200 * hpPct + 55); g = Math.floor(100 * hpPct); b = Math.floor(100 * hpPct);
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(drawX - barW / 2, barY, barW * hpPct, barH);
        if (hpPct < 1) {
            ctx.fillStyle = 'rgba(80,80,80,0.5)';
            ctx.fillRect(drawX - barW / 2 + barW * hpPct, barY, barW * (1 - hpPct), barH);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX - barW / 2, barY, barW, barH);
    }
}
