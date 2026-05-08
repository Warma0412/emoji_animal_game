/**
 * app.js - 应用入口 v2.2
 */

import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.stack-item') || e.target.closest('.pool-item')) {
            e.preventDefault();
        }
    });

    if (typeof window !== 'undefined') {
        window.__game = game;
    }

    console.log('⚔️ Emoji Battle Arena v2.2 loaded!');
});
