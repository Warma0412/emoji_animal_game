/**
 * game.js - 核心游戏逻辑 v2.3
 * 移除沙盒模式，新增职业标签显示
 */

import { ANIMAL_DB, TIER_PRICES, BATTLE_TIME_LIMIT, MAX_ARMY_SIZE, MONEY_MODES, CLASS_CONFIG } from './config.js';
import { EffectsManager } from './effects.js';
import { Unit } from './unit.js';
import { AudioManager } from './audio.js';

export class Game {
    constructor() {
        this.state = 'start';
        this.money = 0;
        this.moneyTier = '';
        this.moneyTierName = '';
        this.army = [];
        this.deployedUnits = [];
        this.deployMode = 'auto';
        this.selectedAnimal = null;
        this.armyStackData = [];

        this.units = [];
        this.enemyUnits = [];
        this.projectiles = [];

        this.effects = new EffectsManager();
        this.audio = new AudioManager();

        this.canvas = document.getElementById('battleCanvas');
        this.deployCanvas = document.getElementById('deployCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.deployCtx = this.deployCanvas.getContext('2d');

        this.lastTime = 0;
        this.winner = null;
        this.battleStartTime = 0;
        this.gameSpeed = 1;

        this.longPressTimer = null;
        this.longPressTarget = null;

        this.goldMode = 'random';
        this.gameMode = 'normal';
        this.currentWave = 1;

        this.isHoldPlacing = false;
        this.lastPlacePos = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this._bindEvents();
        this.initShop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.deployCanvas.width = window.innerWidth;
        this.deployCanvas.height = window.innerHeight - 160;
    }

    _bindEvents() {
        document.getElementById('btnNewGame').addEventListener('click', () => {
            this.gameMode = 'normal';
            this.startNewGame();
        });
        document.getElementById('btnSurvival').addEventListener('click', () => {
            this.gameMode = 'survival';
            this.startNewGame();
        });

        document.getElementById('btnReplay').addEventListener('click', () => {
            document.getElementById('resultScreen').style.display = 'none';
            document.getElementById('battleScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'block';
        });

        document.querySelectorAll('.gold-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gold-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.goldMode = btn.dataset.gold;
            });
        });

        document.getElementById('soundToggle').addEventListener('click', (e) => {
            this.audio.init();
            const enabled = this.audio.toggle();
            e.target.textContent = enabled ? '🔊 音效' : '🔇 静音';
            e.target.classList.toggle('muted', !enabled);
        });

        document.getElementById('btnAuto').addEventListener('click', () => this.setDeployMode('auto'));
        document.getElementById('btnManual').addEventListener('click', () => this.setDeployMode('manual'));
        document.getElementById('btnBattle').addEventListener('click', () => this.startBattle());
        document.getElementById('btnStartBattle').addEventListener('click', () => this.startBattle());
        document.getElementById('btnClearDeploy').addEventListener('click', () => this.clearDeploy());
        document.getElementById('btnBackToShop').addEventListener('click', () => this.backToShop());
        document.getElementById('btnNextWave').addEventListener('click', () => this._nextWave());

        // 部署：按住快速放置
        this.deployCanvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'deploy') return;
            if (!this.selectedAnimal) { this._showDeployHint('请先点击下方选择动物！'); return; }
            this.isHoldPlacing = true;
            this._placeAnimalAt(e.clientX, e.clientY);
            this.lastPlacePos = { x: e.clientX, y: e.clientY };
        });
        this.deployCanvas.addEventListener('mousemove', (e) => {
            if (!this.isHoldPlacing || this.state !== 'deploy' || !this.selectedAnimal) return;
            if (this.lastPlacePos) {
                const dx = e.clientX - this.lastPlacePos.x;
                const dy = e.clientY - this.lastPlacePos.y;
                if (Math.sqrt(dx * dx + dy * dy) < 30) return;
            }
            this._placeAnimalAt(e.clientX, e.clientY);
            this.lastPlacePos = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mouseup', () => { this.isHoldPlacing = false; this.lastPlacePos = null; });

        this.deployCanvas.addEventListener('touchstart', (e) => {
            if (this.state !== 'deploy' || !this.selectedAnimal) return;
            e.preventDefault();
            const t = e.touches[0];
            this.isHoldPlacing = true;
            this._placeAnimalAt(t.clientX, t.clientY);
            this.lastPlacePos = { x: t.clientX, y: t.clientY };
        });
        this.deployCanvas.addEventListener('touchmove', (e) => {
            if (!this.isHoldPlacing || this.state !== 'deploy' || !this.selectedAnimal) return;
            e.preventDefault();
            const t = e.touches[0];
            if (this.lastPlacePos) {
                const dx = t.clientX - this.lastPlacePos.x;
                const dy = t.clientY - this.lastPlacePos.y;
                if (Math.sqrt(dx * dx + dy * dy) < 30) return;
            }
            this._placeAnimalAt(t.clientX, t.clientY);
            this.lastPlacePos = { x: t.clientX, y: t.clientY };
        });
        this.deployCanvas.addEventListener('touchend', () => { this.isHoldPlacing = false; this.lastPlacePos = null; });

        document.addEventListener('mousemove', (e) => {
            const cursor = document.getElementById('cursorAnimal');
            if (this.state === 'deploy' && this.selectedAnimal) {
                cursor.style.display = 'block';
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
                cursor.textContent = this.selectedAnimal;
            } else {
                cursor.style.display = 'none';
            }
        });

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.gameSpeed = parseInt(btn.dataset.speed);
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // ========== 商店 ==========

    initShop() {
        const grid = document.getElementById('animalGrid');
        grid.innerHTML = '';

        for (const [emoji, data] of Object.entries(ANIMAL_DB)) {
            const classCfg = CLASS_CONFIG[data.class] || {};
            const card = document.createElement('div');
            card.className = 'animal-card';
            card.innerHTML = `
                <span class="emoji">${emoji}</span>
                <div class="name">${data.name}</div>
                <div class="tier">T${data.tier} · ${TIER_PRICES[data.tier]}G</div>
                <div class="card-info">
                    <span class="range-badge">📏 ${data.range}</span>
                    ${data.skill ? `<span class="skill-tag-mini">${data.skill}</span>` : ''}
                </div>
                <span class="class-badge class-${data.class}">${classCfg.badge || ''} ${data.class}</span>
            `;
            card.dataset.emoji = emoji;

            if (data.skill) {
                const skillEl = card.querySelector('.skill-tag-mini');
                skillEl.addEventListener('mouseenter', (e) => this._showSkillIntro(e, data.skillDesc));
                skillEl.addEventListener('mouseleave', () => this._hideSkillIntro());
            }

            card.addEventListener('mousedown', () => this._startLongPress(emoji, card));
            card.addEventListener('mouseup', () => this._endLongPress());
            card.addEventListener('mouseleave', () => this._endLongPress());
            card.addEventListener('touchstart', (e) => { e.preventDefault(); this._startLongPress(emoji, card); });
            card.addEventListener('touchend', () => this._endLongPress());

            grid.appendChild(card);
        }
    }

    _startLongPress(emoji, card) {
        if (card.classList.contains('disabled')) return;
        this._buy(emoji);
        this.longPressTarget = emoji;
        let speed = 200;
        const buyLoop = () => {
            if (!this.longPressTarget) return;
            if (this._buy(emoji)) {
                document.getElementById('buyHint').classList.add('show');
                speed = Math.max(50, speed * 0.9);
                this.longPressTimer = setTimeout(buyLoop, speed);
            } else {
                this._endLongPress();
            }
        };
        this.longPressTimer = setTimeout(buyLoop, 400);
    }

    _endLongPress() {
        this.longPressTarget = null;
        if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
        document.getElementById('buyHint').classList.remove('show');
    }

    _buy(emoji) {
        if (this.army.length >= MAX_ARMY_SIZE) return false;
        const price = TIER_PRICES[ANIMAL_DB[emoji].tier];
        if (this.money >= price) {
            this.money -= price;
            this.army.push(emoji);
            this._updateShopUI();
            this.audio.init();
            this.audio.playBuy();
            return true;
        }
        return false;
    }

    _sell(emoji) {
        const idx = this.army.lastIndexOf(emoji);
        if (idx !== -1) {
            this.money += Math.floor(TIER_PRICES[ANIMAL_DB[emoji].tier] / 2);
            this.army.splice(idx, 1);
            this._updateShopUI();
        }
    }

    _updateShopUI() {
        document.getElementById('moneyDisplay').textContent = this.money;
        document.getElementById('armyCount').textContent = this.army.length;

        document.querySelectorAll('.animal-card').forEach(card => {
            const emoji = card.dataset.emoji;
            const price = TIER_PRICES[ANIMAL_DB[emoji].tier];
            card.classList.toggle('disabled', this.money < price || this.army.length >= MAX_ARMY_SIZE);
        });

        this._updateArmyStack();
    }

    _updateArmyStack() {
        const stackDiv = document.getElementById('armyStack');
        stackDiv.innerHTML = '';
        const counts = {};
        this.army.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
        const sortedEmojis = Object.keys(counts).sort((a, b) => ANIMAL_DB[a].tier - ANIMAL_DB[b].tier);
        this.armyStackData = [];

        sortedEmojis.forEach(emoji => {
            const count = counts[emoji];
            const data = ANIMAL_DB[emoji];
            const classCfg = CLASS_CONFIG[data.class] || {};
            this.armyStackData.push({ emoji, count, data });

            const item = document.createElement('div');
            item.className = 'stack-item';
            item.innerHTML = `
                <div class="stack-emoji">${emoji}</div>
                <div class="stack-info">
                    <div class="stack-name">${data.name} <span class="stack-class class-${data.class}">${classCfg.badge || ''}</span></div>
                    <div style="font-size: 10px; color: #666;">📏${data.range} ${data.skill || ''}</div>
                </div>
                <div class="stack-count">×${count}</div>
            `;
            item.oncontextmenu = (e) => { e.preventDefault(); this._sell(emoji); };
            stackDiv.appendChild(item);
        });
    }

    _showSkillIntro(e, text) {
        const intro = document.getElementById('skillIntro');
        intro.textContent = text;
        intro.style.display = 'block';
        const rect = e.target.getBoundingClientRect();
        let left = rect.left;
        let top = rect.top - 60;
        if (left < 10) left = 10;
        if (left > window.innerWidth - 300) left = window.innerWidth - 300;
        if (top < 10) top = rect.bottom + 10;
        intro.style.left = left + 'px';
        intro.style.top = top + 'px';
    }

    _hideSkillIntro() { document.getElementById('skillIntro').style.display = 'none'; }

    // ========== 部署 ==========

    setDeployMode(mode) {
        this.deployMode = mode;
        document.getElementById('btnAuto').classList.toggle('active', mode === 'auto');
        document.getElementById('btnManual').classList.toggle('active', mode === 'manual');
    }

    _placeAnimalAt(clientX, clientY) {
        if (!this.selectedAnimal) return false;
        const rect = this.deployCanvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if (x > this.deployCanvas.width * 0.45) {
            this._showDeployHint('只能在左侧我方区域放置！');
            return false;
        }
        const idx = this.army.indexOf(this.selectedAnimal);
        if (idx === -1) {
            const remaining = {};
            this.army.forEach(e => { remaining[e] = (remaining[e] || 0) + 1; });
            const nextAnimal = Object.keys(remaining)[0];
            if (nextAnimal) {
                this.selectedAnimal = nextAnimal;
                this._updateDeployPanel();
                return this._placeAnimalAt(clientX, clientY);
            }
            this.selectedAnimal = null;
            this._updateDeployPanel();
            return false;
        }
        this.deployedUnits.push({ emoji: this.selectedAnimal, x, y });
        this.army.splice(idx, 1);
        this.audio.playPlace();
        this._updateDeployPanel();
        this._drawDeploy();

        if (!this.army.includes(this.selectedAnimal)) {
            const remaining = {};
            this.army.forEach(e => { remaining[e] = (remaining[e] || 0) + 1; });
            this.selectedAnimal = Object.keys(remaining)[0] || null;
            this._updateDeployPanel();
        }
        document.getElementById('btnStartBattle').disabled = this.deployedUnits.length === 0;
        return true;
    }

    _showDeployHint(text) {
        const hint = document.getElementById('deployHint');
        hint.textContent = text;
        hint.style.opacity = '1';
        setTimeout(() => { hint.style.opacity = '0.7'; }, 1000);
    }

    _updateDeployPanel() {
        const pool = document.getElementById('animalsPool');
        pool.innerHTML = '';
        const counts = {};
        this.army.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
        const sortedEmojis = Object.keys(counts).sort((a, b) => ANIMAL_DB[a].tier - ANIMAL_DB[b].tier);

        sortedEmojis.forEach(emoji => {
            const count = counts[emoji];
            const data = ANIMAL_DB[emoji];
            const classCfg = CLASS_CONFIG[data.class] || {};
            const item = document.createElement('div');
            item.className = 'pool-item';
            if (this.selectedAnimal === emoji) item.classList.add('selected');

            item.innerHTML = `
                <span class="emoji">${emoji}</span>
                <span class="count">${count}</span>
                <span class="range">📏${data.range}</span>
                <span class="pool-class class-${data.class}">${classCfg.badge} ${data.class}</span>
            `;
            item.onclick = () => {
                if (count > 0) { this.selectedAnimal = emoji; this._updateDeployPanel(); }
            };
            pool.appendChild(item);
        });

        document.getElementById('placedCount').textContent = this.deployedUnits.length;
        document.getElementById('remainingCount').textContent = this.army.length;
        document.getElementById('emptyHint').style.display = this.deployedUnits.length > 0 ? 'none' : 'block';
    }

    _drawDeploy() {
        const ctx = this.deployCtx;
        const w = this.deployCanvas.width;
        const h = this.deployCanvas.height;

        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(0.5, '#E0F6FF');
        grad.addColorStop(1, '#90EE90');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
        ctx.fillRect(w * 0.45, 0, w * 0.55, h);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 10]);
        ctx.beginPath(); ctx.moveTo(w * 0.45, 0); ctx.lineTo(w * 0.45, h); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#666';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👈 我方区域（按住拖动快速放置）', w * 0.22, 40);
        ctx.fillStyle = '#999';
        ctx.fillText('敌方区域 👉', w * 0.72, 40);

        this.deployedUnits.forEach(u => {
            ctx.font = '35px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(u.emoji, u.x, u.y);
        });
    }

    clearDeploy() {
        this.deployedUnits.forEach(u => { this.army.push(u.emoji); });
        this.deployedUnits = [];
        this.selectedAnimal = null;
        this._drawDeploy();
        this._updateDeployPanel();
        document.getElementById('btnStartBattle').disabled = true;
    }

    backToShop() {
        this.deployedUnits.forEach(u => { this.army.push(u.emoji); });
        this.deployedUnits = [];
        this.state = 'shop';
        document.getElementById('deployScreen').style.display = 'none';
        document.getElementById('shopScreen').style.display = 'flex';
        document.getElementById('cursorAnimal').style.display = 'none';
        this.selectedAnimal = null;
        this._updateShopUI();
    }

    // ========== 新游戏 ==========

    _rollMoney(mode) {
        if (mode === 'random' || !MONEY_MODES[mode]) {
            const roll = Math.random();
            if (roll < 0.3) return Math.max(10, Math.floor(Math.random() * 150) + 50);
            if (roll < 0.6) return Math.floor(Math.random() * 700) + 300;
            if (roll < 0.9) return Math.floor(Math.random() * 6500) + 1500;
            return Math.floor(Math.random() * 10000) + 15000;
        }
        const cfg = MONEY_MODES[mode];
        return Math.floor(Math.random() * (cfg.max - cfg.min)) + cfg.min;
    }

    _getMoneyTier(money) {
        if (money >= 15000) return { tier: 'tycoon', name: '富豪' };
        if (money >= 1500) return { tier: 'rich', name: '富裕' };
        if (money >= 300) return { tier: 'normal', name: '普通' };
        return { tier: 'poor', name: '贫穷' };
    }

    startNewGame() {
        if (this.gameMode === 'survival') {
            this.money = 800;
            this.currentWave = 1;
        } else {
            this.money = this._rollMoney(this.goldMode);
        }

        const mt = this._getMoneyTier(this.money);
        this.moneyTier = mt.tier;
        this.moneyTierName = mt.name;

        this.army = [];
        this.deployedUnits = [];
        this.deployMode = 'auto';
        this.selectedAnimal = null;
        this.gameSpeed = 1;

        this._updateShopUI();

        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('shopScreen').style.display = 'flex';
        document.getElementById('deployScreen').style.display = 'none';
        document.getElementById('battleScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'none';
        document.getElementById('cursorAnimal').style.display = 'none';

        document.getElementById('btnAuto').classList.add('active');
        document.getElementById('btnManual').classList.remove('active');
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.speed-btn[data-speed="1"]').classList.add('active');

        const tierEl = document.getElementById('moneyTier');
        tierEl.className = 'money-tier tier-' + this.moneyTier;
        tierEl.textContent = this.moneyTierName;

        const modeEl = document.getElementById('gameModeTag');
        if (this.gameMode === 'survival') {
            modeEl.textContent = `🌊 生存 · 第${this.currentWave}波`;
            modeEl.style.display = 'inline-block';
            modeEl.className = 'game-mode-tag tag-survival';
        } else {
            modeEl.style.display = 'none';
        }

        this.audio.init();
    }

    // ========== 战斗 ==========

    _generateDefaultFormation(armyEmojis, canvasW, canvasH) {
        const formations = [];
        const topMargin = canvasH * 0.18;
        const availableHeight = canvasH - topMargin - 100;

        const tierGroups = {};
        armyEmojis.forEach(emoji => {
            const tier = ANIMAL_DB[emoji].tier;
            if (!tierGroups[tier]) tierGroups[tier] = [];
            tierGroups[tier].push(emoji);
        });

        const sortedTiers = Object.keys(tierGroups).map(Number).sort((a, b) => a - b);
        const tierCount = sortedTiers.length;
        const maxX = canvasW * 0.38;
        const minX = 60;

        sortedTiers.forEach((tier, tierIdx) => {
            const emojis = tierGroups[tier];
            const xBase = minX + ((tierIdx / Math.max(tierCount - 1, 1)) * (maxX - minX));
            emojis.forEach((emoji, i) => {
                const data = ANIMAL_DB[emoji];
                const rangeOffset = data.range > 200 ? -30 : 0;
                const x = xBase + rangeOffset + (Math.random() - 0.5) * 40;
                const ySpacing = availableHeight / Math.max(emojis.length, 1);
                const y = topMargin + i * ySpacing + ySpacing / 2 + (Math.random() - 0.5) * 30;
                formations.push({ emoji, x: Math.max(50, x), y: Math.max(80, Math.min(canvasH - 80, y)) });
            });
        });
        return formations;
    }

    startBattle() {
        if (this.army.length === 0 && this.deployedUnits.length === 0) return;

        if (this.deployMode === 'manual' && this.state !== 'deploy') {
            this.state = 'deploy';
            document.getElementById('shopScreen').style.display = 'none';
            document.getElementById('deployScreen').style.display = 'flex';
            this.deployCanvas.height = window.innerHeight - 160;
            this.resize();
            this._updateDeployPanel();
            this._drawDeploy();
            document.getElementById('btnStartBattle').disabled = this.deployedUnits.length === 0;
            return;
        }

        document.getElementById('shopScreen').style.display = 'none';
        document.getElementById('deployScreen').style.display = 'none';
        document.getElementById('battleScreen').style.display = 'block';
        document.getElementById('cursorAnimal').style.display = 'none';

        this.units = [];
        this.enemyUnits = [];
        this.projectiles = [];
        this.effects = new EffectsManager();

        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.deployMode === 'manual') {
            for (const u of this.deployedUnits) {
                this.units.push(new Unit(u.emoji, 'left', u.x, u.y, true));
            }
            if (this.army.length > 0) {
                const autoFormation = this._generateDefaultFormation(this.army, w, h);
                for (const f of autoFormation) this.units.push(new Unit(f.emoji, 'left', f.x, f.y, true));
                this.army = [];
            }
        } else {
            const formation = this._generateDefaultFormation(this.army, w, h);
            for (const f of formation) this.units.push(new Unit(f.emoji, 'left', f.x, f.y, true));
        }

        // 敌方
        const totalValue = this.units.reduce((sum, u) => sum + TIER_PRICES[u.data.tier], 0);
        const waveMult = this.gameMode === 'survival' ? (0.5 + this.currentWave * 0.2) : 1.0;
        const enemyBudget = Math.floor(totalValue * (0.9 + Math.random() * 0.2) * waveMult);

        const enemyArmy = [];
        let currentCost = 0;
        const allEmojis = Object.keys(ANIMAL_DB);
        let attempts = 0;
        while (currentCost < enemyBudget && enemyArmy.length < MAX_ARMY_SIZE && attempts < 500) {
            const choice = allEmojis[Math.floor(Math.random() * allEmojis.length)];
            const cost = TIER_PRICES[ANIMAL_DB[choice].tier];
            if (currentCost + cost <= enemyBudget) { enemyArmy.push(choice); currentCost += cost; }
            attempts++;
        }

        const topMargin = h * 0.18;
        const availableHeight = h - topMargin - 100;
        const tierGroups = {};
        enemyArmy.forEach(emoji => {
            const tier = ANIMAL_DB[emoji].tier;
            if (!tierGroups[tier]) tierGroups[tier] = [];
            tierGroups[tier].push(emoji);
        });
        const sortedTiers = Object.keys(tierGroups).map(Number).sort((a, b) => a - b);
        const tierCount = sortedTiers.length;
        const minEX = w * 0.62;
        const maxEX = w - 60;

        sortedTiers.forEach((tier, tierIdx) => {
            const emojis = tierGroups[tier];
            const xBase = maxEX - ((tierIdx / Math.max(tierCount - 1, 1)) * (maxEX - minEX));
            emojis.forEach((emoji, i) => {
                const data = ANIMAL_DB[emoji];
                const rangeOffset = data.range > 200 ? 30 : 0;
                const x = xBase + rangeOffset + (Math.random() - 0.5) * 40;
                const ySpacing = availableHeight / Math.max(emojis.length, 1);
                const y = topMargin + i * ySpacing + ySpacing / 2 + (Math.random() - 0.5) * 30;
                this.enemyUnits.push(new Unit(emoji, 'right',
                    Math.min(w - 50, x), Math.max(80, Math.min(h - 80, y)), true
                ));
            });
        });

        const waveEl = document.getElementById('waveDisplay');
        if (this.gameMode === 'survival') {
            document.getElementById('waveNumber').textContent = this.currentWave;
            waveEl.style.display = 'block';
        } else {
            waveEl.style.display = 'none';
        }

        this.state = 'battle';
        this.winner = null;
        this.battleStartTime = Date.now();
        this.lastTime = performance.now();
        requestAnimationFrame(t => this._loop(t));
    }

    _loop(timestamp) {
        if (this.state !== 'battle') return;
        let dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        dt *= this.gameSpeed;

        const elapsed = (Date.now() - this.battleStartTime) / 1000;
        const remaining = Math.max(0, BATTLE_TIME_LIMIT - elapsed);
        document.getElementById('timerDisplay').textContent = `⏱️ ${Math.ceil(remaining)}s`;

        this._update(dt);
        this._draw();

        this.units = this.units.filter(u => u.alive || u.deathAnim <= 0.4);
        this.enemyUnits = this.enemyUnits.filter(u => u.alive || u.deathAnim <= 0.4);

        const leftAlive = this.units.filter(u => u.alive).length;
        const rightAlive = this.enemyUnits.filter(u => u.alive).length;
        document.getElementById('leftCount').textContent = leftAlive;
        document.getElementById('rightCount').textContent = rightAlive;

        let shouldEnd = false;
        if (leftAlive === 0 || rightAlive === 0) {
            if (leftAlive > 0) this.winner = 'left';
            else if (rightAlive > 0) this.winner = 'right';
            else this.winner = 'draw';
            shouldEnd = true;
        }
        if (remaining <= 0) {
            if (leftAlive > rightAlive) this.winner = 'left';
            else if (rightAlive > leftAlive) this.winner = 'right';
            else this.winner = 'draw';
            shouldEnd = true;
        }

        if (shouldEnd) { setTimeout(() => this._showResult(), 800); return; }
        requestAnimationFrame(t => this._loop(t));
    }

    _update(dt) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        for (const u of this.units) u.update(dt, this.enemyUnits, this.units, this.projectiles, this.effects, w, h, this.audio);
        for (const u of this.enemyUnits) u.update(dt, this.units, this.enemyUnits, this.projectiles, this.effects, w, h, this.audio);
        for (const p of this.projectiles) p.update(this.effects);
        this.projectiles = this.projectiles.filter(p => p.alive);
        this.effects.update(dt);
    }

    _draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const shake = this.effects.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y);

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(0.5, '#E0F6FF');
        grad.addColorStop(1, '#90EE90');
        ctx.fillStyle = grad;
        ctx.fillRect(-10, -10, w + 20, h + 20);

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 10]);
        ctx.beginPath(); ctx.moveTo(w / 2, h * 0.15); ctx.lineTo(w / 2, h); ctx.stroke();
        ctx.setLineDash([]);

        this.effects.draw(ctx);
        for (const p of this.projectiles) p.draw(ctx);

        const allUnits = [...this.units, ...this.enemyUnits];
        allUnits.sort((a, b) => {
            if (a.data.tier !== b.data.tier) return a.data.tier - b.data.tier;
            return a.y - b.y;
        });
        for (const u of allUnits) u.draw(ctx);

        ctx.restore();
    }

    _showResult() {
        document.getElementById('resultScreen').style.display = 'flex';
        let title, sub;
        const btnReplay = document.getElementById('btnReplay');
        const btnNextWave = document.getElementById('btnNextWave');

        if (this.gameMode === 'survival') {
            if (this.winner === 'left' || this.winner === 'draw') {
                const survivors = this.units.filter(u => u.alive && !u.isClone).length;
                const bonus = 200 + this.currentWave * 100;
                title = `🌊 第${this.currentWave}波 通关！`;
                sub = `存活 ${survivors} 只 · 补给 +${bonus} 金币`;
                btnNextWave.style.display = 'inline-block';
                btnReplay.textContent = '🏠 返回主页';
                this.audio.playVictory();
            } else {
                title = '💀 生存结束';
                sub = `坚持到了第 ${this.currentWave} 波！`;
                btnNextWave.style.display = 'none';
                btnReplay.textContent = '🔄 再来一局';
                this.audio.playDefeat();
            }
        } else {
            btnNextWave.style.display = 'none';
            btnReplay.textContent = '🔄 再来一局';
            if (this.winner === 'left') {
                title = '🏆 胜利!';
                sub = `友军全胜！`;
                this.audio.playVictory();
            } else if (this.winner === 'right') {
                title = '💀 失败...';
                sub = '你的军团被消灭了';
                this.audio.playDefeat();
            } else {
                title = '🤝 平局';
                sub = '双方势均力敌';
            }
        }
        document.getElementById('resultTitle').textContent = title;
        document.getElementById('resultSub').textContent = sub;
    }

    _nextWave() {
        const survivors = this.units.filter(u => u.alive && !u.isClone).map(u => u.emoji);
        this.army = survivors;
        this.currentWave++;
        const bonus = 200 + (this.currentWave - 1) * 100;
        this.money += bonus;

        this.deployedUnits = [];
        this.selectedAnimal = null;
        this.deployMode = 'auto';
        this.gameSpeed = 1;

        this.state = 'shop';
        document.getElementById('resultScreen').style.display = 'none';
        document.getElementById('battleScreen').style.display = 'none';
        document.getElementById('shopScreen').style.display = 'flex';

        document.getElementById('btnAuto').classList.add('active');
        document.getElementById('btnManual').classList.remove('active');
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.speed-btn[data-speed="1"]').classList.add('active');

        const mt = this._getMoneyTier(this.money);
        this.moneyTier = mt.tier;
        this.moneyTierName = mt.name;
        const tierEl = document.getElementById('moneyTier');
        tierEl.className = 'money-tier tier-' + this.moneyTier;
        tierEl.textContent = this.moneyTierName;

        const modeEl = document.getElementById('gameModeTag');
        modeEl.textContent = `🌊 生存 · 第${this.currentWave}波`;
        modeEl.style.display = 'inline-block';
        modeEl.className = 'game-mode-tag tag-survival';

        this._updateShopUI();
    }
}
