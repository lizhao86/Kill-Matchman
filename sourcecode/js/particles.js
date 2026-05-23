export class Particle {
  constructor(x, y, vx, vy, color, size, life, gravity = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class DamageNumber {
  constructor(x, y, text, color = '#fff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.vy = -100;
    this.scale = 1.6;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.y += this.vy * dt;
    this.vy *= 0.96;
    this.scale = Math.max(1, this.scale - dt * 2);
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.font = '28px Bangers, cursive';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.damageNumbers = [];
  }

  spawnHitSparks(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() > 0.5 ? '#ff6b35' : '#ff3333',
        2 + Math.random() * 3,
        0.3 + Math.random() * 0.2,
        200
      ));
    }
  }

  spawnBlood(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 60 + Math.random() * 100;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#cc0000',
        2 + Math.random() * 2,
        0.5 + Math.random() * 0.3,
        400
      ));
    }
  }

  spawnExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const colors = ['#ff6600', '#ffaa00', '#ff3300', '#ffcc00'];
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        colors[Math.floor(Math.random() * colors.length)],
        3 + Math.random() * 5,
        0.4 + Math.random() * 0.3,
        150
      ));
    }
    // shockwave ring particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * 180,
        Math.sin(angle) * 180,
        'rgba(255, 200, 50, 0.8)',
        6,
        0.25,
        0
      ));
    }
  }

  spawnPoisonBubble(x, y) {
    this.particles.push(new Particle(
      x + (Math.random() - 0.5) * 20,
      y,
      (Math.random() - 0.5) * 15,
      -30 - Math.random() * 20,
      '#44cc44',
      3 + Math.random() * 3,
      0.8 + Math.random() * 0.4,
      -10
    ));
  }

  spawnDamage(x, y, amount) {
    const text = typeof amount === 'string' ? amount : `-${amount}`;
    const color = (typeof amount === 'number' && amount >= 25) ? '#ff3333' : '#fff';
    this.damageNumbers.push(new DamageNumber(
      x + (Math.random() - 0.5) * 20,
      y - 20,
      text,
      color
    ));
  }

  spawnHeal(x, y, amount) {
    this.damageNumbers.push(new DamageNumber(
      x + (Math.random() - 0.5) * 10,
      y - 10,
      `+${amount}`,
      '#44dd44'
    ));
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 15,
        y,
        (Math.random() - 0.5) * 20,
        -40 - Math.random() * 30,
        '#66ff66',
        2 + Math.random() * 2,
        0.6 + Math.random() * 0.3,
        -20
      ));
    }
  }

  spawnConvertBurst(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      const color = Math.random() > 0.5 ? '#7b2d8b' : '#33aa33';
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        3 + Math.random() * 4,
        0.6 + Math.random() * 0.4,
        100
      ));
    }
    this.damageNumbers.push(new DamageNumber(x, y - 30, '感染!', '#7b2d8b'));
  }

  // cloud puff for soul exit
  spawnCloudPuff(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 30,
        y + (Math.random() - 0.5) * 15,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        'rgba(255, 255, 255, 0.8)',
        5 + Math.random() * 8,
        0.6 + Math.random() * 0.4,
        -5
      ));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].update(dt);
      if (this.damageNumbers[i].dead) this.damageNumbers.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
    for (const d of this.damageNumbers) d.draw(ctx);
  }

  clear() {
    this.particles.length = 0;
    this.damageNumbers.length = 0;
  }
}
