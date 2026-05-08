/**
 * audio.js - Web Audio API 音效系统
 */

export class AudioManager {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.3 : 0;
        }
        return this.enabled;
    }

    _playTone(freq, duration, type = 'sine', volume = 0.2) {
        if (!this.enabled || !this.initialized) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* ignore */ }
    }

    _playNoise(duration, volume = 0.1) {
        if (!this.enabled || !this.initialized) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.value = volume;
            source.connect(gain);
            gain.connect(this.masterGain);
            source.start();
        } catch (e) { /* ignore */ }
    }

    playHit() { this._playTone(200 + Math.random() * 100, 0.1, 'square', 0.08); }

    playCrit() {
        this._playTone(400, 0.1, 'sawtooth', 0.12);
        setTimeout(() => this._playTone(600, 0.15, 'sawtooth', 0.1), 50);
    }

    playSkill() {
        this._playTone(300, 0.15, 'sine', 0.1);
        this._playTone(450, 0.2, 'sine', 0.08);
    }

    playDeath() { this._playTone(150, 0.3, 'triangle', 0.1); }

    playBuy() { this._playTone(800, 0.08, 'sine', 0.15); }

    playPlace() { this._playTone(600, 0.1, 'sine', 0.1); }

    playVictory() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.3, 'sine', 0.15), i * 150);
        });
    }

    playDefeat() {
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.4, 'triangle', 0.1), i * 200);
        });
    }

    playExplosion() { this._playNoise(0.3, 0.15); }
}
