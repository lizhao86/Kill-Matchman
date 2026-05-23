import { Stickman } from './stickman.js';
import { STICKMAN_TYPES, getRandomType } from './stickman-types.js';
import { ParticleSystem } from './particles.js';
import { WeaponManager } from './weapons.js';
import { ItemManager } from './items.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');
const killCountEl = document.getElementById('killCount');

const MAX_STICKMEN = 12;
const INITIAL_STICKMEN = 6;
const RESPAWN_DELAY = 2.0;

let stickmen = [];
let particles, weapons, itemManager;
let lastTime = 0;
let gameTime = 0;
let killCount = 0;
let respawnQueue = [];

let cloudLayers = [];
let flowers = [];
let butterflies = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  for (const sm of stickmen) sm.resize(canvas.width, canvas.height);
  generateSceneObjects();
}

function generateSceneObjects() {
  const w = canvas.width, h = canvas.height;
  const horizonY = h * 0.48;

  flowers = [];
  for (let i = 0; i < 30; i++) {
    const depth = Math.random();
    flowers.push({
      x: Math.random() * w,
      y: horizonY + depth * (h - horizonY - 100),
      size: 2 + depth * 4,
      color: ['#ff6b6b', '#feca57', '#ff9ff3', '#48dbfb', '#fff'][Math.floor(Math.random() * 5)],
      phase: Math.random() * Math.PI * 2,
      depth,
    });
  }
  flowers.sort((a, b) => a.depth - b.depth);

  butterflies = [];
  for (let i = 0; i < 4; i++) {
    butterflies.push({
      x: Math.random() * w,
      y: horizonY + 20 + Math.random() * (h * 0.3),
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 15,
      color: ['#ff6b6b', '#feca57', '#a29bfe', '#55efc4'][i],
      wingPhase: Math.random() * Math.PI * 2,
      size: 4 + Math.random() * 3,
    });
  }

  cloudLayers = [];
  for (let i = 0; i < 6; i++) {
    cloudLayers.push({
      x: Math.random() * (w + 200) - 100,
      y: 30 + Math.random() * (horizonY * 0.5),
      scale: 0.5 + Math.random() * 0.6,
      speed: 5 + Math.random() * 10,
      opacity: 0.5 + Math.random() * 0.3,
    });
  }
}

function spawnStickman(typeConfig) {
  const type = typeConfig || getRandomType();
  const sm = new Stickman(canvas.width, canvas.height, type);
  const minY = sm._getMinY();
  const maxY = sm._getMaxY();
  const edge = Math.floor(Math.random() * 3);
  switch (edge) {
    case 0: sm.x = -20; sm.y = minY + Math.random() * (maxY - minY); sm.dirX = 1; break;
    case 1: sm.x = canvas.width + 20; sm.y = minY + Math.random() * (maxY - minY); sm.dirX = -1; break;
    case 2: sm.x = 100 + Math.random() * (canvas.width - 200); sm.y = maxY; sm.dirX = Math.random() > 0.5 ? 1 : -1; break;
  }
  sm.facingRight = sm.dirX > 0;
  sm.onDeath = onStickmanDeath;
  sm.onConvert = onStickmanConvert;
  stickmen.push(sm);
  return sm;
}

function onStickmanDeath(sm) {
  killCount++;
  killCountEl.textContent = killCount;
  killCountEl.style.transform = 'scale(1.4)';
  setTimeout(() => { killCountEl.style.transform = 'scale(1)'; }, 200);

  respawnQueue.push(RESPAWN_DELAY);
}

function onStickmanConvert(sm) {
  particles.spawnConvertBurst(sm.x, sm.y - sm.bodyHeight / 2);
  sm.convertToZombie(STICKMAN_TYPES.zombie);
}

function init() {
  resizeCanvas();
  particles = new ParticleSystem();
  itemManager = new ItemManager();

  stickmen = [];
  for (let i = 0; i < INITIAL_STICKMEN; i++) spawnStickman();

  weapons = new WeaponManager(stickmen, particles, itemManager, spawnStickman);
  killCount = 0;
  killCountEl.textContent = '0';
  lastTime = performance.now();
  window._game = { stickmen, particles, weapons, itemManager };
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  stickmen = [];
  respawnQueue = [];
  particles.clear();
  itemManager.clear();
  killCount = 0;
  killCountEl.textContent = '0';

  for (let i = 0; i < INITIAL_STICKMEN; i++) spawnStickman();
  weapons.stickmen = stickmen;
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  gameTime += dt;

  // respawn
  for (let i = respawnQueue.length - 1; i >= 0; i--) {
    respawnQueue[i] -= dt;
    if (respawnQueue[i] <= 0) {
      respawnQueue.splice(i, 1);
      if (stickmen.filter(s => !s.isDone()).length < MAX_STICKMEN) {
        spawnStickman();
        weapons.stickmen = stickmen;
      }
    }
  }

  // remove fully dead stickmen
  stickmen = stickmen.filter(s => !s.isDone());
  weapons.stickmen = stickmen;

  // update
  weapons.update(dt);
  const items = itemManager.getItems();
  for (const sm of stickmen) sm.update(dt, particles, items, stickmen);
  particles.update(dt);

  // draw
  drawBackground(dt);
  itemManager.draw(ctx, gameTime);
  for (const sm of stickmen) sm.draw(ctx);
  particles.draw(ctx);

  requestAnimationFrame(gameLoop);
}

// ── Background ──
function drawBackground(dt) {
  const w = canvas.width, h = canvas.height;
  const horizonY = h * 0.48;
  const barH = 90;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#74b9ff');
  skyGrad.addColorStop(0.5, '#a0d2ff');
  skyGrad.addColorStop(1, '#dfe6e9');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  // sun
  const sunX = w - 90, sunY = 75;
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(gameTime * 0.15);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (55 + Math.sin(gameTime * 1.5) * 8), Math.sin(a) * (55 + Math.sin(gameTime * 1.5) * 8));
    ctx.strokeStyle = 'rgba(255,220,80,0.15)'; ctx.lineWidth = 6; ctx.stroke();
  }
  ctx.restore();

  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 60);
  sunGlow.addColorStop(0, 'rgba(255,230,100,0.6)'); sunGlow.addColorStop(1, 'rgba(255,230,100,0)');
  ctx.fillStyle = sunGlow; ctx.fillRect(sunX - 60, sunY - 60, 120, 120);
  ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(sunX, sunY, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(sunX, sunY, 25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(sunX - 6, sunY - 8, 10, 0, Math.PI * 2); ctx.fill();

  for (const c of cloudLayers) {
    c.x += c.speed * dt; if (c.x > w + 100) c.x = -100;
    ctx.globalAlpha = c.opacity; drawCloud(c.x, c.y, c.scale); ctx.globalAlpha = 1;
  }

  // ground
  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h - barH);
  groundGrad.addColorStop(0, '#a8d88a'); groundGrad.addColorStop(0.3, '#7EC850');
  groundGrad.addColorStop(0.7, '#6bb840'); groundGrad.addColorStop(1, '#5a9e35');
  ctx.fillStyle = groundGrad; ctx.fillRect(0, horizonY, w, h - horizonY);

  const hGlow = ctx.createLinearGradient(0, horizonY - 4, 0, horizonY + 8);
  hGlow.addColorStop(0, 'rgba(200,230,201,0)'); hGlow.addColorStop(0.5, 'rgba(200,230,201,0.5)'); hGlow.addColorStop(1, 'rgba(200,230,201,0)');
  ctx.fillStyle = hGlow; ctx.fillRect(0, horizonY - 4, w, 12);

  for (let i = 0; i < 8; i++) {
    const t = i / 8, py = horizonY + t * t * (h - horizonY - barH);
    ctx.strokeStyle = `rgba(80,140,50,${0.04 + t * 0.06})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
  }

  ctx.lineWidth = 1.5;
  for (let i = 0; i < w; i += 14) {
    const sway = Math.sin(gameTime * 2 + i * 0.05) * 2;
    ctx.strokeStyle = '#5DA03A'; ctx.beginPath(); ctx.moveTo(i, horizonY);
    ctx.quadraticCurveTo(i + sway, horizonY - 3, i - 1 + sway, horizonY - (4 + Math.sin(i * 0.13) * 2)); ctx.stroke();
  }

  for (const f of flowers) {
    const bob = Math.sin(gameTime * 2 + f.phase) * 1;
    ctx.strokeStyle = '#4e9030'; ctx.lineWidth = 1 + f.depth;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - f.size * 2 + bob); ctx.stroke();
    ctx.fillStyle = f.color;
    const py = f.y - f.size * 2 + bob;
    for (let p = 0; p < 4; p++) {
      const a = (p / 4) * Math.PI * 2 + gameTime * 0.3;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.size * 0.6, py + Math.sin(a) * f.size * 0.4, f.size * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffeaa7'; ctx.beginPath(); ctx.arc(f.x, py, f.size * 0.2, 0, Math.PI * 2); ctx.fill();
  }

  const barGrad = ctx.createLinearGradient(0, h - barH, 0, h);
  barGrad.addColorStop(0, '#4a7c32'); barGrad.addColorStop(1, '#3d6628');
  ctx.fillStyle = barGrad; ctx.fillRect(0, h - barH, w, barH);

  for (const b of butterflies) {
    b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(gameTime * 3 + b.wingPhase) * 0.5; b.wingPhase += dt * 12;
    if (b.x < -20) b.x = w + 20; if (b.x > w + 20) b.x = -20;
    if (b.y < horizonY + 10) b.vy = Math.abs(b.vy); if (b.y > h - barH - 30) b.vy = -Math.abs(b.vy);
    const ws = Math.abs(Math.sin(b.wingPhase)) * b.size;
    ctx.fillStyle = b.color; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.ellipse(b.x - ws * 0.5, b.y, ws, b.size * 0.6, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.x + ws * 0.5, b.y, ws, b.size * 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#2d3436';
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 1.2, b.size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 20 * scale, y - 10 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 36 * scale, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 18 * scale, y + 6 * scale, 16 * scale, 0, Math.PI * 2);
  ctx.fill();
}

window.addEventListener('resize', resizeCanvas);
resetBtn.addEventListener('click', resetGame);

init();
