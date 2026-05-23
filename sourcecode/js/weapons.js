import { ITEM_DEFS } from './items.js';
import { STICKMAN_TYPES } from './stickman-types.js';

export const WEAPON_DEFS = [
  { id: 'knife',      name: '小刀',  icon: '🔪', damage: 10, type: 'melee' },
  { id: 'cleaver',    name: '菜刀',  icon: '🪓', damage: 15, type: 'melee' },
  { id: 'greatsword', name: '大剑',  icon: '⚔️', damage: 25, type: 'melee' },
  { id: 'whip',       name: '鞭子',  icon: '🪢', damage: 12, type: 'melee' },
  { id: 'poison',     name: '毒水',  icon: '🧪', damage: 0,  type: 'poison' },
  { id: 'bomb',       name: '炸弹',  icon: '💣', damage: 40, type: 'melee' },
];

const SPAWN_DEFS = [
  { id: 'normal',  name: '普通',  icon: '🧑', typeKey: 'normal' },
  { id: 'soldier', name: '军人',  icon: '💂', typeKey: 'soldier' },
  { id: 'armored', name: '装甲',  icon: '🛡️', typeKey: 'armored' },
  { id: 'zombie',  name: '僵尸',  icon: '🧟', typeKey: 'zombie' },
];

export class WeaponManager {
  constructor(stickmen, particleSystem, itemManager, spawnFn) {
    this.stickmen = stickmen;
    this.particles = particleSystem;
    this.itemManager = itemManager;
    this.spawnFn = spawnFn;

    this.mode = 'weapons'; // 'weapons' | 'items' | 'spawn'
    this.equippedWeapon = null;
    this.equippedItem = null;
    this.equippedSpawn = null;

    this.ghostEl = document.getElementById('dragGhost');
    this.weaponListEl = document.getElementById('weaponList');
    this.itemListEl = document.getElementById('itemList');
    this.spawnListEl = document.getElementById('spawnList');

    this._hitCooldown = 0;
    this._hitInterval = 0.15;
    this._dodgeCooldown = 0;
    this._mouseDown = false;
    this._mouseX = 0;
    this._mouseY = 0;

    this._buildWeaponUI();
    this._buildItemUI();
    this._buildSpawnUI();
    this._bindTabSwitcher();
    this._bindEvents();
  }

  _buildWeaponUI() {
    for (const w of WEAPON_DEFS) {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.dataset.weaponId = w.id;
      const dmgLabel = w.type === 'poison' ? '30' : String(w.damage);
      const dmgClass = w.type === 'poison' ? 'weapon-dmg poison' : 'weapon-dmg';
      slot.innerHTML = `<span class="weapon-icon">${w.icon}</span><span class="weapon-name">${w.name}</span><span class="${dmgClass}">-${dmgLabel}</span>`;
      this.weaponListEl.appendChild(slot);
    }
  }

  _buildItemUI() {
    for (const item of ITEM_DEFS) {
      const slot = document.createElement('div');
      slot.className = 'item-slot';
      slot.dataset.itemId = item.id;
      const effect = item.category === 'food' ? `+${item.healAmount}HP` :
                     item.restDuration ? `+${Math.round(item.speedBuff * 100)}%速` : '障碍';
      if (item.id === 'table') {
        slot.innerHTML = `<canvas class="table-icon-canvas" width="40" height="32"></canvas><span class="item-name">${item.name}</span><span class="item-effect">${effect}</span>`;
        requestAnimationFrame(() => {
          const c = slot.querySelector('.table-icon-canvas');
          if (!c) return;
          const cx = c.getContext('2d');
          const w = 40, midX = w / 2;
          cx.strokeStyle = '#8B5E3C'; cx.lineWidth = 2; cx.lineCap = 'round';
          cx.beginPath(); cx.moveTo(7, 16); cx.lineTo(5, 28); cx.stroke();
          cx.beginPath(); cx.moveTo(33, 16); cx.lineTo(35, 28); cx.stroke();
          cx.fillStyle = '#A0724A';
          cx.beginPath(); cx.roundRect(3, 11, 34, 6, 2); cx.fill();
          cx.fillStyle = 'rgba(255,255,255,0.25)';
          cx.fillRect(5, 12, 30, 2);
          cx.fillStyle = '#8B5E3C';
          cx.fillRect(3, 15, 34, 2);
        });
      } else {
        slot.innerHTML = `<span class="item-icon">${item.icon}</span><span class="item-name">${item.name}</span><span class="item-effect">${effect}</span>`;
      }
      this.itemListEl.appendChild(slot);
    }
  }

  _buildSpawnUI() {
    for (const sp of SPAWN_DEFS) {
      const slot = document.createElement('div');
      slot.className = 'spawn-slot';
      slot.dataset.spawnId = sp.id;
      slot.innerHTML = `<span class="spawn-icon">${sp.icon}</span><span class="spawn-name">${sp.name}</span>`;
      this.spawnListEl.appendChild(slot);
    }
  }

  _bindTabSwitcher() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this._unequip();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        this.mode = tab.dataset.tab;
        this.weaponListEl.classList.add('hidden');
        this.itemListEl.classList.add('hidden');
        this.spawnListEl.classList.add('hidden');

        if (this.mode === 'weapons') {
          this.weaponListEl.classList.remove('hidden');
        } else if (this.mode === 'items') {
          this.itemListEl.classList.remove('hidden');
        } else if (this.mode === 'spawn') {
          this.spawnListEl.classList.remove('hidden');
        }
      });
    });
  }

  _bindEvents() {
    // weapon click to equip
    this.weaponListEl.addEventListener('click', (e) => {
      const slot = e.target.closest('.weapon-slot');
      if (!slot) return;
      e.preventDefault();
      const w = WEAPON_DEFS.find(w => w.id === slot.dataset.weaponId);
      if (!w) return;
      if (this.equippedWeapon && this.equippedWeapon.id === w.id) { this._unequip(); return; }
      this._equipWeapon(w, slot);
    });

    // item click to equip for placement
    this.itemListEl.addEventListener('click', (e) => {
      const slot = e.target.closest('.item-slot');
      if (!slot) return;
      e.preventDefault();
      const item = ITEM_DEFS.find(i => i.id === slot.dataset.itemId);
      if (!item) return;
      if (this.equippedItem && this.equippedItem.id === item.id) { this._unequip(); return; }
      this._equipItem(item, slot);
    });

    // spawn click to equip
    this.spawnListEl.addEventListener('click', (e) => {
      const slot = e.target.closest('.spawn-slot');
      if (!slot) return;
      e.preventDefault();
      const sp = SPAWN_DEFS.find(s => s.id === slot.dataset.spawnId);
      if (!sp) return;
      if (this.equippedSpawn && this.equippedSpawn.id === sp.id) { this._unequip(); return; }
      this._equipSpawn(sp, slot);
    });

    // mouse
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#bottomBar') || e.target.closest('#resetBtn') || e.target.closest('#tabSwitcher')) return;
      this._mouseDown = true;
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
      if (this.equippedItem) this._placeItem(e.clientX, e.clientY);
      if (this.equippedSpawn) this._placeStickman(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
      this._updateGhostPosition(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => { this._mouseDown = false; });

    // touch
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('#bottomBar') || e.target.closest('#resetBtn') || e.target.closest('#tabSwitcher')) return;
      this._mouseDown = true;
      const t = e.touches[0];
      this._mouseX = t.clientX;
      this._mouseY = t.clientY;
      if (this.equippedItem) this._placeItem(t.clientX, t.clientY);
      if (this.equippedSpawn) this._placeStickman(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      this._mouseX = t.clientX;
      this._mouseY = t.clientY;
      this._updateGhostPosition(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => { this._mouseDown = false; });

    // right-click or Escape to unequip
    window.addEventListener('contextmenu', (e) => {
      if (this.equippedWeapon || this.equippedItem || this.equippedSpawn) { e.preventDefault(); this._unequip(); }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._unequip();
    });
  }

  _equipWeapon(weapon, slotEl) {
    this._unequip();
    this.equippedWeapon = weapon;
    slotEl.classList.add('active');
    this.ghostEl.textContent = weapon.icon;
    this.ghostEl.classList.remove('hidden');
    this._updateGhostPosition(this._mouseX, this._mouseY);
    document.body.style.cursor = 'none';
  }

  _equipItem(item, slotEl) {
    this._unequip();
    this.equippedItem = item;
    slotEl.classList.add('active');
    if (item.id === 'table') {
      this.ghostEl.textContent = '';
      this.ghostEl.innerHTML = '<canvas width="60" height="44" id="ghostTableCanvas"></canvas>';
      requestAnimationFrame(() => {
        const c = document.getElementById('ghostTableCanvas');
        if (!c) return;
        const cx = c.getContext('2d');
        cx.strokeStyle = '#8B5E3C'; cx.lineWidth = 3; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(10, 22); cx.lineTo(7, 40); cx.stroke();
        cx.beginPath(); cx.moveTo(50, 22); cx.lineTo(53, 40); cx.stroke();
        cx.fillStyle = '#A0724A';
        cx.beginPath(); cx.roundRect(5, 14, 50, 9, 3); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.25)'; cx.fillRect(8, 15, 44, 3);
        cx.fillStyle = '#8B5E3C'; cx.fillRect(5, 21, 50, 2);
      });
    } else {
      this.ghostEl.textContent = item.icon;
    }
    this.ghostEl.classList.remove('hidden');
    this._updateGhostPosition(this._mouseX, this._mouseY);
    document.body.style.cursor = 'none';
  }

  _equipSpawn(sp, slotEl) {
    this._unequip();
    this.equippedSpawn = sp;
    slotEl.classList.add('active');
    this.ghostEl.textContent = sp.icon;
    this.ghostEl.classList.remove('hidden');
    this._updateGhostPosition(this._mouseX, this._mouseY);
    document.body.style.cursor = 'none';
  }

  _unequip() {
    this.equippedWeapon = null;
    this.equippedItem = null;
    this.equippedSpawn = null;
    this.ghostEl.classList.add('hidden');
    document.querySelectorAll('.weapon-slot, .item-slot, .spawn-slot').forEach(s => s.classList.remove('active'));
    document.body.style.cursor = 'crosshair';
  }

  _updateGhostPosition(clientX, clientY) {
    if (!this.equippedWeapon && !this.equippedItem && !this.equippedSpawn) return;
    this.ghostEl.style.left = clientX + 'px';
    this.ghostEl.style.top = clientY + 'px';
  }

  _getCanvasCoords(clientX, clientY) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  _placeItem(clientX, clientY) {
    if (!this.equippedItem) return;
    const { x, y } = this._getCanvasCoords(clientX, clientY);
    const canvas = document.getElementById('gameCanvas');
    const horizonY = canvas.height * 0.48;
    if (y < horizonY || y > canvas.height - 100) return;
    this.itemManager.place(this.equippedItem, x, y);
  }

  _placeStickman(clientX, clientY) {
    if (!this.equippedSpawn || !this.spawnFn) return;
    const { x, y } = this._getCanvasCoords(clientX, clientY);
    const canvas = document.getElementById('gameCanvas');
    const horizonY = canvas.height * 0.48;
    if (y < horizonY || y > canvas.height - 100) return;
    const type = STICKMAN_TYPES[this.equippedSpawn.typeKey];
    const sm = this.spawnFn(type);
    sm.x = x;
    sm.y = y;
    this.stickmen = window._game.stickmen;
  }

  _tryAttack() {
    if (!this.equippedWeapon) return;
    const { x: cx, y: cy } = this._getCanvasCoords(this._mouseX, this._mouseY);

    for (const sm of this.stickmen) {
      if (!sm.isAlive()) continue;
      const bounds = sm.getBounds();
      const m = 20;
      if (cx >= bounds.x - m && cx <= bounds.x + bounds.w + m &&
          cy >= bounds.y - m && cy <= bounds.y + bounds.h + m) {
        sm.takeDamage(this.equippedWeapon.damage, cx, cy, this.equippedWeapon.id, this.particles);
        break;
      }
    }
  }

  update(dt) {
    // weapon attacks
    if (this.equippedWeapon) {
      this._hitCooldown -= dt;
      if (this._mouseDown && this._hitCooldown <= 0) {
        this._tryAttack();
        this._hitCooldown = this._hitInterval;
      }

      // dodge for all stickmen
      this._dodgeCooldown -= dt;
      if (this._dodgeCooldown <= 0) {
        const { x: cx, y: cy } = this._getCanvasCoords(this._mouseX, this._mouseY);
        for (const sm of this.stickmen) {
          if (!sm.isAlive()) continue;
          const bounds = sm.getBounds();
          const dist = Math.sqrt(
            (cx - (bounds.x + bounds.w / 2)) ** 2 +
            (cy - (bounds.y + bounds.h / 2)) ** 2
          );
          if (dist < 150) sm.tryDodge(cx, cy);
        }
        this._dodgeCooldown = 0.5;
      }
    }

    // cleanup consumed food items
    this.itemManager.cleanup();
  }
}
