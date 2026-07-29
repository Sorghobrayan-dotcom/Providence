import './style.css';
import { BossDuelScene } from './scenes/BossDuelScene';
import { YouVersionClient } from './api/YouVersionClient';
import { GlooClient } from './api/GlooClient';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const hudRoot = document.querySelector<HTMLElement>('#hud-root');
if (!canvas || !hudRoot) {
  throw new Error('index.html is missing #game-canvas or #hud-root.');
}

// credentials never reach the browser; the dev proxy adds them (vite.config.ts)
const youVersion = new YouVersionClient({ baseUrl: '/scripture' });

const gloo = new GlooClient({ apiKey: undefined, baseUrl: '/gloo' });

const scene = new BossDuelScene({ canvas, hudRoot, youVersion, gloo });
scene.start();
