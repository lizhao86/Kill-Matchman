export const ITEM_DEFS = [
  { id: 'bread',  name: '面包', icon: '🍞', category: 'food', healAmount: 20 },
  { id: 'apple',  name: '苹果', icon: '🍎', category: 'food', healAmount: 10 },
  { id: 'water',  name: '水',   icon: '💧', category: 'food', healAmount: 15 },
  { id: 'juice',  name: '果汁', icon: '🧃', category: 'food', healAmount: 25 },
  { id: 'chair',  name: '椅子', icon: '🪑', category: 'furniture', restDuration: 3, speedBuff: 0.3, buffDuration: 8 },
  { id: 'sofa',   name: '沙发', icon: '🛋️', category: 'furniture', restDuration: 4, speedBuff: 0.5, buffDuration: 10 },
  { id: 'bed',    name: '床',   icon: '🛏️', category: 'furniture', restDuration: 5, speedBuff: 0.8, buffDuration: 12 },
  { id: 'table',  name: '桌子', icon: 'TABLE', category: 'furniture', restDuration: 0, speedBuff: 0, buffDuration: 0 },
];

export class ItemManager {
  constructor() {
    this.placedItems = [];
  }

  place(def, x, y) {
    this.placedItems.push({ def, x, y, consumed: false, placeTime: Date.now() });
  }

  getItems() {
    return this.placedItems;
  }

  draw(ctx, gameTime) {
    for (const item of this.placedItems) {
      if (item.consumed) continue;

      ctx.save();

      if (item.def.category === 'food') {
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pulse = 1 + Math.sin(gameTime * 4 + item.placeTime) * 0.08;
        ctx.translate(item.x, item.y);
        ctx.scale(pulse, pulse);
        ctx.fillText(item.def.icon, 0, 0);

        ctx.globalAlpha = 0.2 + Math.sin(gameTime * 3 + item.placeTime) * 0.1;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.fillText(item.def.icon, 0, 0);
      } else if (item.def.id === 'table') {
        this._drawTable(ctx, item.x, item.y);
      } else {
        ctx.font = '42px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.def.icon, item.x, item.y);
      }

      ctx.restore();
    }
  }

  _drawTable(ctx, x, y) {
    const tw = 44, th = 8, legH = 24;

    // shadow
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + legH + 4, tw * 0.6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // legs
    ctx.strokeStyle = '#8B5E3C';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - tw / 2 + 5, y + 2); ctx.lineTo(x - tw / 2 + 2, y + legH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + tw / 2 - 5, y + 2); ctx.lineTo(x + tw / 2 - 2, y + legH); ctx.stroke();

    // tabletop
    ctx.fillStyle = '#A0724A';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - th / 2, tw, th, 3);
    ctx.fill();

    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - tw / 2 + 3, y - th / 2 + 1, tw - 6, 3);

    // edge shadow
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(x - tw / 2, y + th / 2 - 2, tw, 2);
  }

  cleanup() {
    this.placedItems = this.placedItems.filter(i => !i.consumed || i.def.category === 'furniture');
  }

  clear() {
    this.placedItems = [];
  }
}
