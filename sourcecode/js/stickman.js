import { Particle } from './particles.js';

const STATES = {
  WALKING: 'walking',
  HIT: 'hit',
  POISONED: 'poisoned',
  SEEKING_FOOD: 'seeking_food',
  SEEKING_FURNITURE: 'seeking_furniture',
  RESTING: 'resting',
  FLEEING: 'fleeing',
  CHASING: 'chasing',
  ATTACKING: 'attacking',
  DYING: 'dying',
  CONVERTING: 'converting',
  SOUL_ASCENDING: 'soul_ascending',
  DESPAWN: 'despawn',
};

export class Stickman {
  constructor(canvasW, canvasH, typeConfig) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.type = typeConfig;
    this.id = Math.random().toString(36).slice(2, 8);

    this.maxHp = typeConfig.hp;
    this.hp = this.maxHp;
    this.state = STATES.WALKING;

    this.x = canvasW / 2;
    this.y = this._randomY();
    this.baseSpeed = typeConfig.speed;
    this.speed = this.baseSpeed;
    this.dirX = Math.random() > 0.5 ? 1 : -1;
    this.dirY = (Math.random() - 0.5) * 0.4;
    this.dirChangeTimer = 1 + Math.random() * 2;
    this.facingRight = this.dirX > 0;

    this.walkCycle = 0;
    this.bodyHeight = 50;
    this.headRadius = 12;
    this.limbLength = 22;

    this.hitTimer = 0;
    this.hitDuration = 0.2;
    this.flashRed = false;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    this.poisoned = false;
    this.poisonTimer = 0;
    this.poisonTickTimer = 0;
    this.poisonStacks = 0;
    this.poisonBaseDmg = 5;

    this.dyingTimer = 0;
    this.dyingDuration = 0.5;
    this.collapseAngle = 0;

    this.soulY = 0;
    this.soulAlpha = 1;
    this.soulTimer = 0;
    this.soulDuration = 2.0;
    this.soulCloudSpawned = false;
    this.corpseAlpha = 1;

    this.screenShake = 0;
    this.shakeIntensity = 0;

    this.hitboxW = 40;
    this.hitboxH = 80;

    // buff system
    this.speedBuff = 0;
    this.speedBuffTimer = 0;
    this.restingTimer = 0;
    this.restingDuration = 0;
    this.restTarget = null;

    // food seeking
    this.seekTarget = null;

    // combat system
    this.combatTarget = null;
    this.attackCooldown = 0;
    this.fleeTimer = 0;
    this.attackSwing = 0;

    // conversion animation
    this.convertTimer = 0;
    this.convertDuration = 1.8;
    this.convertFlashTimer = 0;
    this.convertShakeTimer = 0;
    this.killedByZombie = false;

    this.onDeath = null;
    this.onConvert = null;
    this.dead = false;
  }

  _getMinY() {
    return this.canvasH * 0.5 + this.bodyHeight + this.headRadius * 2;
  }

  _getMaxY() {
    return this.canvasH - 110;
  }

  _randomY() {
    const min = this.canvasH * 0.55;
    const max = this.canvasH - 120;
    return min + Math.random() * (max - min);
  }

  resize(w, h) {
    const ratioX = w / this.canvasW;
    const ratioY = h / this.canvasH;
    this.x *= ratioX;
    this.y *= ratioY;
    this.canvasW = w;
    this.canvasH = h;
    this.y = Math.max(this._getMinY(), Math.min(this._getMaxY(), this.y));
  }

  getBounds() {
    return {
      x: this.x - this.hitboxW / 2,
      y: this.y - this.headRadius * 2 - this.bodyHeight,
      w: this.hitboxW,
      h: this.hitboxH,
    };
  }

  isAlive() {
    return this.state === STATES.WALKING || this.state === STATES.HIT ||
           this.state === STATES.POISONED || this.state === STATES.SEEKING_FOOD ||
           this.state === STATES.SEEKING_FURNITURE || this.state === STATES.RESTING ||
           this.state === STATES.FLEEING || this.state === STATES.CHASING ||
           this.state === STATES.ATTACKING;
  }

  isDone() {
    return this.dead;
  }

  _getEffectiveSpeed() {
    let s = this.speed;
    if (this.speedBuffTimer > 0) s *= (1 + this.speedBuff);
    return s;
  }

  takeDamage(amount, fromX, fromY, weaponType, particleSystem) {
    if (!this.isAlive()) return;

    if (this.state === STATES.RESTING) {
      this.state = STATES.WALKING;
      this.restTarget = null;
    }

    if (weaponType === 'poison') {
      this.poisoned = true;
      this.poisonStacks++;
      this.poisonTimer += 6;
      this.poisonTickTimer = Math.min(this.poisonTickTimer, 0.5);
      this.speed = this.baseSpeed * Math.max(0.2, 0.5 - (this.poisonStacks - 1) * 0.1);
      particleSystem.spawnDamage(this.x, this.y - this.bodyHeight - 20, `毒x${this.poisonStacks}`);
      return;
    }

    const effectiveDmg = Math.ceil(amount * this.type.dmgMultiplier);
    this.hp = Math.max(0, this.hp - effectiveDmg);
    this.state = STATES.HIT;
    this.hitTimer = this.hitDuration;
    this.flashRed = true;

    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const knockStr = weaponType === 'greatsword' ? 150 : weaponType === 'bomb' ? 200 : weaponType === 'whip' ? 120 : weaponType === 'zombie_attack' ? 80 : weaponType === 'hunter_attack' ? 60 : 60;
    this.knockbackVx = (dx / dist) * knockStr;
    this.knockbackVy = (dy / dist) * knockStr * 0.3;

    if (weaponType === 'greatsword' || weaponType === 'bomb') {
      this.screenShake = 0.3;
      this.shakeIntensity = weaponType === 'bomb' ? 12 : 7;
    }

    particleSystem.spawnHitSparks(this.x, this.y - this.bodyHeight / 2);
    particleSystem.spawnBlood(this.x, this.y - this.bodyHeight / 2);
    particleSystem.spawnDamage(this.x, this.y - this.bodyHeight - 20, effectiveDmg);

    if (weaponType === 'bomb') {
      particleSystem.spawnExplosion(this.x, this.y - this.bodyHeight / 2);
    }

    if (this.hp <= 0) {
      if (weaponType === 'zombie_attack') {
        this.killedByZombie = true;
      }
      this._startDying();
    }
  }

  takeCombatDamage(amount, attacker, particleSystem) {
    const weaponType = attacker.type.id === 'zombie' ? 'zombie_attack' : 'hunter_attack';
    this.takeDamage(amount, attacker.x, attacker.y, weaponType, particleSystem);
  }

  heal(amount, particleSystem) {
    if (!this.isAlive()) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    particleSystem.spawnHeal(this.x, this.y - this.bodyHeight - 10, amount);
  }

  startResting(duration, buffAmount, buffDuration, target) {
    this.state = STATES.RESTING;
    this.restingTimer = duration;
    this.restingDuration = duration;
    this.speedBuff = buffAmount;
    this.restTarget = target;
    this._speedBuffDurationPending = buffDuration;
  }

  convertToZombie(zombieType) {
    this.type = zombieType;
    this.maxHp = zombieType.hp;
    this.hp = this.maxHp;
    this.baseSpeed = zombieType.speed;
    this.speed = this.baseSpeed;
    this.poisoned = false;
    this.poisonStacks = 0;
    this.poisonTimer = 0;
    this.seekTarget = null;
    this.combatTarget = null;
    this.state = STATES.WALKING;
    this.dead = false;
    this.killedByZombie = false;
  }

  _startDying() {
    if (this.killedByZombie && this.type.id !== 'zombie') {
      this.state = STATES.CONVERTING;
      this.convertTimer = 0;
      this.convertFlashTimer = 0;
      this.convertShakeTimer = 0;
      this.poisoned = false;
      this.poisonStacks = 0;
      this.poisonTimer = 0;
      this.seekTarget = null;
      this.combatTarget = null;
      return;
    }

    this.state = STATES.DYING;
    this.dyingTimer = this.dyingDuration;
    this.collapseAngle = 0;
    this.poisoned = false;
    this.poisonStacks = 0;
    this.poisonTimer = 0;
    this.seekTarget = null;
    this.combatTarget = null;
    if (this.onDeath) this.onDeath(this);
  }

  tryDodge(weaponX, weaponY) {
    if (!this.isAlive() || this.state === STATES.RESTING) return;
    const dodgeChance = this.hp < (this.maxHp * 0.3) ? this.type.dodgeChanceLow : this.type.dodgeChance;
    if (Math.random() > dodgeChance) return;

    const dx = this.x - weaponX;
    const dy = this.y - weaponY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.dirX = dx / dist;
    this.dirY = dy / dist * 0.3;
    this.facingRight = this.dirX > 0;
    this.speed = this.hp < (this.maxHp * 0.3) ? this.baseSpeed * 2 : this.baseSpeed * 1.3;
    this.dirChangeTimer = 0.8;
    this.seekTarget = null;
    this.combatTarget = null;
    if (this.state === STATES.SEEKING_FOOD || this.state === STATES.SEEKING_FURNITURE ||
        this.state === STATES.CHASING || this.state === STATES.FLEEING) {
      this.state = STATES.WALKING;
    }
  }

  update(dt, particleSystem, items, allStickmen) {
    if (this.screenShake > 0) {
      this.screenShake -= dt;
      if (this.screenShake < 0) this.screenShake = 0;
    }

    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer -= dt;
      if (this.speedBuffTimer <= 0) {
        this.speedBuff = 0;
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    switch (this.state) {
      case STATES.WALKING:
      case STATES.POISONED:
        this._updateWalking(dt, particleSystem, items, allStickmen);
        break;
      case STATES.HIT:
        this._updateHit(dt);
        break;
      case STATES.SEEKING_FOOD:
      case STATES.SEEKING_FURNITURE:
        this._updateSeeking(dt, particleSystem, items);
        break;
      case STATES.RESTING:
        this._updateResting(dt, particleSystem);
        break;
      case STATES.FLEEING:
        this._updateFleeing(dt, particleSystem, allStickmen);
        break;
      case STATES.CHASING:
        this._updateChasing(dt, particleSystem, allStickmen);
        break;
      case STATES.ATTACKING:
        this._updateAttacking(dt, particleSystem);
        break;
      case STATES.CONVERTING:
        this._updateConverting(dt, particleSystem);
        break;
      case STATES.DYING:
        this._updateDying(dt);
        break;
      case STATES.SOUL_ASCENDING:
        this._updateSoul(dt, particleSystem);
        break;
      case STATES.DESPAWN:
        this.dead = true;
        break;
    }
  }

  _updateWalking(dt, particleSystem, items, allStickmen) {
    this.walkCycle += dt * (this.type.id === 'zombie' ? 4 : 6);

    // poison
    if (this.poisoned) {
      this.state = STATES.POISONED;
      this.poisonTimer -= dt;
      this.poisonTickTimer += dt;
      if (this.poisonTickTimer >= 1) {
        this.poisonTickTimer -= 1;
        const dmg = this.poisonBaseDmg + (this.poisonStacks - 1) * 3;
        this.hp = Math.max(0, this.hp - dmg);
        particleSystem.spawnDamage(this.x, this.y - this.bodyHeight - 20, dmg);
        if (this.hp <= 0) { this._startDying(); return; }
      }
      particleSystem.spawnPoisonBubble(this.x, this.y - this.bodyHeight / 2);
      if (this.poisonTimer <= 0) {
        this.poisoned = false;
        this.poisonStacks = 0;
        this.speed = this.baseSpeed;
        this.state = STATES.WALKING;
      }
    }

    // Combat AI
    if (allStickmen && this._tryCombatAI(allStickmen, items, particleSystem)) return;

    // AI: seek items
    if (items) {
      const foodUrgency = this.hp < this.maxHp && this.type.canEat;
      const seekChance = foodUrgency ? 0.15 : 0.02;
      if (Math.random() < seekChance) {
        if (foodUrgency) {
          const food = this._findNearestItem(items, 'food');
          if (food) {
            this.seekTarget = food;
            this.state = STATES.SEEKING_FOOD;
            return;
          }
        } else if (this.type.canRest && this.speedBuffTimer <= 0 && Math.random() < 0.3) {
          const furn = this._findNearestItem(items, 'furniture');
          if (furn && furn.def.restDuration) {
            this.seekTarget = furn;
            this.state = STATES.SEEKING_FURNITURE;
            return;
          }
        }
      }
    }

    // direction change
    this.dirChangeTimer -= dt;
    if (this.dirChangeTimer <= 0) {
      this.dirX = (Math.random() - 0.5) * 2;
      this.dirY = (Math.random() - 0.5) * 0.6;
      this.facingRight = this.dirX > 0;
      this.dirChangeTimer = 1 + Math.random() * 2;
      if (!this.poisoned) this.speed = this.baseSpeed;
    }

    const spd = this._getEffectiveSpeed();
    this.x += this.dirX * spd * dt;
    this.y += this.dirY * spd * dt * 0.3;
    this._clampPosition();

    // table collision
    if (items) this._avoidTables(items);
  }

  _tryCombatAI(allStickmen, items, particleSystem) {
    const role = this.type.combatRole;

    if (role === 'flee') {
      const zombie = this._findNearestEnemy(allStickmen, 'zombie');
      if (zombie) {
        const dist = this._distTo(zombie);
        if (dist < this.type.detectRange) {
          this.combatTarget = zombie;
          this.state = STATES.FLEEING;
          this.fleeTimer = 1.5 + Math.random();
          return true;
        }
      }
    } else if (role === 'aggressor') {
      const target = this._findNearestNonZombie(allStickmen);
      if (target) {
        const dist = this._distTo(target);
        if (dist < this.type.detectRange) {
          this.combatTarget = target;
          this.state = STATES.CHASING;
          return true;
        }
      }
    } else if (role === 'hunter') {
      // hunters prioritize food if hurt, then hunt zombies
      if (this.hp < this.maxHp && this.type.canEat && items) {
        const food = this._findNearestItem(items, 'food');
        if (food) {
          this.seekTarget = food;
          this.state = STATES.SEEKING_FOOD;
          return true;
        }
      }
      const zombie = this._findNearestEnemy(allStickmen, 'zombie');
      if (zombie) {
        const dist = this._distTo(zombie);
        if (dist < this.type.detectRange) {
          this.combatTarget = zombie;
          this.state = STATES.CHASING;
          return true;
        }
      }
    }

    return false;
  }

  _updateFleeing(dt, particleSystem, allStickmen) {
    this.walkCycle += dt * 8;
    this.fleeTimer -= dt;

    this._updatePoison(dt, particleSystem);
    if (this.state === STATES.DYING || this.state === STATES.CONVERTING) return;

    if (this.fleeTimer <= 0 || !this.combatTarget || !this.combatTarget.isAlive()) {
      this.combatTarget = null;
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      this.speed = this.baseSpeed;
      return;
    }

    // check if zombie is still close
    const dist = this._distTo(this.combatTarget);
    if (dist > this.type.detectRange * 1.5) {
      this.combatTarget = null;
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      this.speed = this.baseSpeed;
      return;
    }

    // run away from zombie
    const dx = this.x - this.combatTarget.x;
    const dy = this.y - this.combatTarget.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.dirX = dx / d;
    this.dirY = dy / d * 0.5;
    this.facingRight = this.dirX > 0;

    const spd = this._getEffectiveSpeed() * 1.5;
    this.x += this.dirX * spd * dt;
    this.y += this.dirY * spd * dt;
    this._clampPosition();
  }

  _updateChasing(dt, particleSystem, allStickmen) {
    this.walkCycle += dt * (this.type.id === 'zombie' ? 5 : 7);

    this._updatePoison(dt, particleSystem);
    if (this.state === STATES.DYING || this.state === STATES.CONVERTING) return;

    if (!this.combatTarget || !this.combatTarget.isAlive()) {
      this.combatTarget = null;
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      return;
    }

    const dx = this.combatTarget.x - this.x;
    const dy = this.combatTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 30) {
      this.state = STATES.ATTACKING;
      this.attackSwing = 0;
      return;
    }

    const spd = this._getEffectiveSpeed() * (this.type.id === 'zombie' ? 1.3 : 1.1);
    this.dirX = dx / dist;
    this.dirY = dy / dist;
    this.facingRight = this.dirX > 0;
    this.x += this.dirX * spd * dt;
    this.y += this.dirY * spd * dt;
    this._clampPosition();
  }

  _updateAttacking(dt, particleSystem) {
    this.attackSwing += dt * 8;

    if (!this.combatTarget || !this.combatTarget.isAlive()) {
      this.combatTarget = null;
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      return;
    }

    const dist = this._distTo(this.combatTarget);
    if (dist > 50) {
      this.state = STATES.CHASING;
      return;
    }

    if (this.attackCooldown <= 0) {
      this.combatTarget.takeCombatDamage(this.type.attackDamage, this, particleSystem);
      this.attackCooldown = this.type.attackInterval;
      this.attackSwing = 0;
    }
  }

  _updateConverting(dt, particleSystem) {
    this.convertTimer += dt;
    this.convertFlashTimer += dt;
    this.convertShakeTimer += dt;

    // spawn purple-green particles during conversion
    if (Math.random() < 0.3) {
      const color = Math.random() > 0.5 ? '#7b2d8b' : '#33aa33';
      particleSystem.particles.push(new Particle(
        this.x + (Math.random() - 0.5) * 30,
        this.y - this.bodyHeight / 2,
        (Math.random() - 0.5) * 40,
        -50 - Math.random() * 30,
        color,
        3 + Math.random() * 3,
        0.6 + Math.random() * 0.3,
        -10
      ));
    }

    if (this.convertTimer >= this.convertDuration) {
      if (this.onConvert) this.onConvert(this);
    }
  }

  _updatePoison(dt, particleSystem) {
    if (!this.poisoned) return;
    this.poisonTimer -= dt;
    this.poisonTickTimer += dt;
    if (this.poisonTickTimer >= 1) {
      this.poisonTickTimer -= 1;
      const dmg = this.poisonBaseDmg + (this.poisonStacks - 1) * 3;
      this.hp = Math.max(0, this.hp - dmg);
      particleSystem.spawnDamage(this.x, this.y - this.bodyHeight - 20, dmg);
      if (this.hp <= 0) { this._startDying(); return; }
    }
    particleSystem.spawnPoisonBubble(this.x, this.y - this.bodyHeight / 2);
    if (this.poisonTimer <= 0) {
      this.poisoned = false;
      this.poisonStacks = 0;
      this.speed = this.baseSpeed;
    }
  }

  _updateSeeking(dt, particleSystem, items) {
    this.walkCycle += dt * (this.type.id === 'zombie' ? 4 : 6);

    this._updatePoison(dt, particleSystem);
    if (this.state === STATES.DYING || this.state === STATES.CONVERTING) return;

    if (!this.seekTarget || this.seekTarget.consumed) {
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      this.seekTarget = null;
      return;
    }

    const dx = this.seekTarget.x - this.x;
    const dy = this.seekTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 20) {
      if (this.state === STATES.SEEKING_FOOD) {
        this.heal(this.seekTarget.def.healAmount, particleSystem);
        this.seekTarget.consumed = true;
        this.seekTarget = null;
        if (this.hp < this.maxHp) {
          const nextFood = this._findNearestItem(items, 'food');
          if (nextFood) {
            this.seekTarget = nextFood;
            return;
          }
        }
        this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      } else if (this.state === STATES.SEEKING_FURNITURE) {
        const def = this.seekTarget.def;
        this.startResting(def.restDuration, def.speedBuff, def.buffDuration, this.seekTarget);
        this.seekTarget = null;
      }
      return;
    }

    const spd = this._getEffectiveSpeed() * 0.8;
    this.dirX = dx / dist;
    this.dirY = dy / dist;
    this.facingRight = this.dirX > 0;
    this.x += this.dirX * spd * dt;
    this.y += this.dirY * spd * dt;
    this._clampPosition();
    if (items) this._avoidTables(items);
  }

  _updateResting(dt, particleSystem) {
    this.walkCycle = 0;
    this.restingTimer -= dt;

    this._updatePoison(dt, particleSystem);
    if (this.state === STATES.DYING || this.state === STATES.CONVERTING) return;

    if (this.restingTimer <= 0) {
      this.speedBuffTimer = this._speedBuffDurationPending || 8;
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
      this.restTarget = null;
      this.dirChangeTimer = 0;
    }
  }

  _updateHit(dt) {
    this.hitTimer -= dt;
    this.x += this.knockbackVx * dt;
    this.y += this.knockbackVy * dt;
    this.knockbackVx *= 0.9;
    this.knockbackVy *= 0.9;
    this._clampPosition();

    if (this.hitTimer <= 0) {
      this.flashRed = false;
      this.state = this.poisoned ? STATES.POISONED : STATES.WALKING;
    }
  }

  _updateDying(dt) {
    this.dyingTimer -= dt;
    this.collapseAngle = Math.min(Math.PI / 2, (1 - this.dyingTimer / this.dyingDuration) * Math.PI / 2);
    if (this.dyingTimer <= 0) {
      this.state = STATES.SOUL_ASCENDING;
      this.soulY = this.y - this.bodyHeight;
      this.soulAlpha = 1;
      this.soulTimer = 0;
      this.corpseAlpha = 1;
      this.soulCloudSpawned = false;
    }
  }

  _updateSoul(dt, particleSystem) {
    this.soulTimer += dt;
    const progress = this.soulTimer / this.soulDuration;
    this.soulY -= 80 * dt;
    this.soulAlpha = Math.max(0, 1 - progress);
    this.corpseAlpha = Math.max(0, 1 - progress * 1.5);

    if (!this.soulCloudSpawned && this.soulY < 40) {
      this.soulCloudSpawned = true;
      particleSystem.spawnCloudPuff(this.x, this.soulY);
    }

    if (this.soulTimer >= this.soulDuration) {
      this.state = STATES.DESPAWN;
      this.dead = true;
    }
  }

  _clampPosition() {
    const margin = 30;
    const minY = this._getMinY();
    const maxY = this._getMaxY();
    if (this.x < margin) { this.x = margin; this.dirX = Math.abs(this.dirX); this.facingRight = true; }
    if (this.x > this.canvasW - margin) { this.x = this.canvasW - margin; this.dirX = -Math.abs(this.dirX); this.facingRight = false; }
    if (this.y < minY) { this.y = minY; this.dirY = Math.abs(this.dirY); }
    if (this.y > maxY) { this.y = maxY; this.dirY = -Math.abs(this.dirY); }
  }

  _distTo(other) {
    return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2);
  }

  _findNearestEnemy(allStickmen, typeId) {
    let best = null;
    let bestDist = Infinity;
    for (const sm of allStickmen) {
      if (sm === this || !sm.isAlive() || sm.type.id !== typeId) continue;
      const d = this._distTo(sm);
      if (d < bestDist) { bestDist = d; best = sm; }
    }
    return best;
  }

  _findNearestNonZombie(allStickmen) {
    let best = null;
    let bestDist = Infinity;
    for (const sm of allStickmen) {
      if (sm === this || !sm.isAlive() || sm.type.id === 'zombie') continue;
      const d = this._distTo(sm);
      if (d < bestDist) { bestDist = d; best = sm; }
    }
    return best;
  }

  _findNearestItem(items, category) {
    let best = null;
    let bestDist = Infinity;
    for (const item of items) {
      if (item.consumed || item.def.category !== category) continue;
      if (category === 'furniture' && !item.def.restDuration) continue;
      const d = Math.sqrt((item.x - this.x) ** 2 + (item.y - this.y) ** 2);
      if (d < bestDist) { bestDist = d; best = item; }
    }
    return best;
  }

  _avoidTables(items) {
    for (const item of items) {
      if (item.consumed || item.def.id !== 'table') continue;
      const dx = this.x - item.x;
      const dy = this.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 35) {
        this.x += (dx / dist) * 3;
        this.y += (dy / dist) * 3;
        if (this.state === STATES.WALKING || this.state === STATES.POISONED) {
          this.dirX = dx / dist;
          this.dirY = dy / dist * 0.3;
          this.facingRight = this.dirX > 0;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shakeIntensity * 2, (Math.random() - 0.5) * this.shakeIntensity * 2);
    }

    switch (this.state) {
      case STATES.WALKING: case STATES.POISONED:
      case STATES.HIT: case STATES.SEEKING_FOOD:
      case STATES.SEEKING_FURNITURE: case STATES.FLEEING:
      case STATES.CHASING:
        this._drawAlive(ctx);
        break;
      case STATES.ATTACKING:
        this._drawAttacking(ctx);
        break;
      case STATES.RESTING:
        this._drawResting(ctx);
        break;
      case STATES.CONVERTING:
        this._drawConverting(ctx);
        break;
      case STATES.DYING:
        this._drawDying(ctx);
        break;
      case STATES.SOUL_ASCENDING:
        this._drawCorpse(ctx);
        this._drawSoul(ctx);
        break;
    }

    if (this.isAlive() && this.hp < this.maxHp) {
      this._drawHeadHpBar(ctx);
    }

    if (this.isAlive() && this.speedBuffTimer > 0) {
      this._drawBuffIndicator(ctx);
    }

    ctx.restore();
  }

  _drawHeadHpBar(ctx) {
    const barW = 32;
    const barH = 4;
    const bx = this.x - barW / 2;
    const by = this.y - this.bodyHeight - this.headRadius * 2 - 14;
    const pct = this.hp / this.maxHp;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

    let color = '#4CAF50';
    if (pct <= 0.25) color = '#f44336';
    else if (pct <= 0.5) color = '#FFC107';

    ctx.fillStyle = color;
    ctx.fillRect(bx, by, barW * pct, barH);
  }

  _drawBuffIndicator(ctx) {
    const t = Date.now() / 200;
    ctx.fillStyle = `rgba(100, 200, 255, ${0.3 + Math.sin(t) * 0.15})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y - this.bodyHeight - this.headRadius - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _getBodyColor() {
    if (this.flashRed) return this.type.hitColor;
    if (this.poisoned) return this.type.poisonColor;
    if (this.type.id === 'zombie') {
      const t = Date.now() / 400;
      const blend = (Math.sin(t) + 1) / 2;
      return blend > 0.5 ? this.type.color : this.type.altColor;
    }
    return this.type.color;
  }

  _drawAlive(ctx) {
    const x = this.x, y = this.y;
    const walk = this.walkCycle;
    const wobble = this.type.id === 'zombie' ? Math.sin(walk * 0.7) * 0.15 : 0;
    const swing = Math.sin(walk) * 0.4;

    const bodyColor = this._getBodyColor();
    ctx.strokeStyle = bodyColor;
    ctx.fillStyle = bodyColor;
    ctx.lineWidth = this.type.lineWidth;
    ctx.lineCap = 'round';

    const headY = y - this.bodyHeight - this.headRadius;
    const neckY = y - this.bodyHeight;
    const hipY = y;
    const flip = this.facingRight ? 1 : -1;

    ctx.save();
    if (wobble) {
      ctx.translate(x, y);
      ctx.rotate(wobble);
      ctx.translate(-x, -y);
    }

    // head
    ctx.beginPath(); ctx.arc(x, headY, this.headRadius, 0, Math.PI * 2); ctx.stroke();

    // type-specific head decoration
    if (this.type.id === 'armored') this._drawHelmet(ctx, x, headY);
    else if (this.type.id === 'soldier') this._drawBeret(ctx, x, headY);

    // eyes
    ctx.fillStyle = bodyColor;
    if (this.type.id === 'zombie') {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(x + flip * 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + flip * 8, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x + flip * 3, headY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + flip * 8, headY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // body
    ctx.strokeStyle = bodyColor;
    ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, hipY); ctx.stroke();

    // arms
    const shY = neckY + 8;
    ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x + Math.cos(swing + 0.5) * this.limbLength * flip, shY + Math.abs(Math.sin(swing)) * this.limbLength * 0.6 + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x + Math.cos(-swing + 0.5) * this.limbLength * (-flip), shY + Math.abs(Math.sin(-swing)) * this.limbLength * 0.6 + 10); ctx.stroke();

    // legs
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + Math.sin(swing) * this.limbLength * 0.8, hipY + this.limbLength); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + Math.sin(-swing) * this.limbLength * 0.8, hipY + this.limbLength); ctx.stroke();

    ctx.restore();
  }

  _drawAttacking(ctx) {
    const x = this.x, y = this.y;
    const bodyColor = this._getBodyColor();
    ctx.strokeStyle = bodyColor;
    ctx.fillStyle = bodyColor;
    ctx.lineWidth = this.type.lineWidth;
    ctx.lineCap = 'round';

    const headY = y - this.bodyHeight - this.headRadius;
    const neckY = y - this.bodyHeight;
    const hipY = y;
    const flip = this.facingRight ? 1 : -1;

    // head
    ctx.beginPath(); ctx.arc(x, headY, this.headRadius, 0, Math.PI * 2); ctx.stroke();
    if (this.type.id === 'armored') this._drawHelmet(ctx, x, headY);
    else if (this.type.id === 'soldier') this._drawBeret(ctx, x, headY);

    // angry eyes
    if (this.type.id === 'zombie') {
      ctx.fillStyle = '#ff0000';
    }
    ctx.beginPath(); ctx.arc(x + flip * 3, headY - 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + flip * 8, headY - 2, 2, 0, Math.PI * 2); ctx.fill();

    // body
    ctx.strokeStyle = bodyColor;
    ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, hipY); ctx.stroke();

    // attacking arm - swinging punch
    const shY = neckY + 8;
    const punchExtend = Math.sin(this.attackSwing) * this.limbLength * 1.3;
    ctx.lineWidth = this.type.lineWidth + 1;
    ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x + punchExtend * flip, shY + 5); ctx.stroke();
    // other arm
    ctx.lineWidth = this.type.lineWidth;
    ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x - 10 * flip, shY + 18); ctx.stroke();

    // legs (stable stance)
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + 12 * flip, hipY + this.limbLength); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x - 8 * flip, hipY + this.limbLength); ctx.stroke();
  }

  _drawConverting(ctx) {
    const x = this.x, y = this.y;
    const progress = this.convertTimer / this.convertDuration;

    // shake
    const shakeAmt = Math.sin(this.convertShakeTimer * 30) * (3 + progress * 8);
    ctx.save();
    ctx.translate(shakeAmt, 0);

    // flash between original color and zombie colors
    const flashRate = 4 + progress * 12;
    const flash = Math.sin(this.convertFlashTimer * flashRate);
    let bodyColor;
    if (flash > 0.3) bodyColor = '#7b2d8b';
    else if (flash < -0.3) bodyColor = '#33aa33';
    else bodyColor = this.type.color;

    ctx.strokeStyle = bodyColor;
    ctx.fillStyle = bodyColor;
    ctx.lineWidth = this.type.lineWidth;
    ctx.lineCap = 'round';

    const headY = y - this.bodyHeight - this.headRadius;
    const neckY = y - this.bodyHeight;
    const hipY = y;

    // convulsing body
    const convulse = Math.sin(this.convertTimer * 15) * 0.2 * progress;
    ctx.translate(x, y);
    ctx.rotate(convulse);
    ctx.translate(-x, -y);

    // head
    ctx.beginPath(); ctx.arc(x, headY, this.headRadius, 0, Math.PI * 2); ctx.stroke();

    // X eyes as it transforms
    ctx.lineWidth = 2;
    const ex1 = x - 4, ex2 = x + 4, eyeY = headY - 2;
    if (progress < 0.5) {
      ctx.beginPath(); ctx.moveTo(ex1 - 2, eyeY - 2); ctx.lineTo(ex1 + 2, eyeY + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex1 + 2, eyeY - 2); ctx.lineTo(ex1 - 2, eyeY + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex2 - 2, eyeY - 2); ctx.lineTo(ex2 + 2, eyeY + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex2 + 2, eyeY - 2); ctx.lineTo(ex2 - 2, eyeY + 2); ctx.stroke();
    } else {
      // red glowing eyes emerging
      ctx.fillStyle = `rgba(255, 0, 0, ${(progress - 0.5) * 2})`;
      ctx.beginPath(); ctx.arc(x - 4, eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.lineWidth = this.type.lineWidth;
    ctx.strokeStyle = bodyColor;

    // body + limbs convulsing
    const limbJitter = Math.sin(this.convertTimer * 20) * 8 * progress;
    ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, hipY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 8); ctx.lineTo(x + 15 + limbJitter, neckY + 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 8); ctx.lineTo(x - 15 - limbJitter, neckY + 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + 10 + limbJitter * 0.5, hipY + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x - 10 - limbJitter * 0.5, hipY + 20); ctx.stroke();

    // purple-green aura growing with progress
    ctx.globalAlpha = progress * 0.4;
    const auraGrad = ctx.createRadialGradient(x, y - this.bodyHeight / 2, 5, x, y - this.bodyHeight / 2, 40 + progress * 20);
    auraGrad.addColorStop(0, 'rgba(123, 45, 139, 0.6)');
    auraGrad.addColorStop(0.5, 'rgba(51, 170, 51, 0.3)');
    auraGrad.addColorStop(1, 'rgba(123, 45, 139, 0)');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(x - 60, y - this.bodyHeight - 30, 120, this.bodyHeight + 60);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  _drawResting(ctx) {
    const x = this.x, y = this.y;
    const bodyColor = this._getBodyColor();
    ctx.strokeStyle = bodyColor;
    ctx.fillStyle = bodyColor;
    ctx.lineWidth = this.type.lineWidth;
    ctx.lineCap = 'round';

    const headY = y - this.bodyHeight * 0.6 - this.headRadius;
    const neckY = y - this.bodyHeight * 0.6;

    ctx.beginPath(); ctx.arc(x, headY, this.headRadius, 0, Math.PI * 2); ctx.stroke();
    if (this.type.id === 'armored') this._drawHelmet(ctx, x, headY);
    else if (this.type.id === 'soldier') this._drawBeret(ctx, x, headY);

    // closed eyes (sleeping)
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 6, headY - 1); ctx.lineTo(x - 2, headY - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 2, headY - 1); ctx.lineTo(x + 6, headY - 1); ctx.stroke();
    ctx.lineWidth = this.type.lineWidth;

    // body (sitting)
    ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, y - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 6); ctx.lineTo(x - 12, neckY + 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 6); ctx.lineTo(x + 12, neckY + 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x - 10, y + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 10, y + 10); ctx.stroke();

    // zzz
    const t = Date.now() / 600;
    ctx.font = '12px Bangers, cursive';
    ctx.fillStyle = 'rgba(100, 150, 255, 0.7)';
    ctx.fillText('z', x + 15 + Math.sin(t) * 3, headY - 10 - Math.abs(Math.sin(t * 1.5)) * 8);
    ctx.fillText('z', x + 22 + Math.sin(t + 1) * 2, headY - 20 - Math.abs(Math.sin(t * 1.5 + 0.5)) * 6);
  }

  _drawHelmet(ctx, x, headY) {
    ctx.save();
    ctx.strokeStyle = '#888';
    ctx.fillStyle = '#999';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, headY - 3, this.headRadius + 3, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    // visor
    ctx.fillStyle = '#777';
    ctx.fillRect(x - this.headRadius - 2, headY - 3, this.headRadius * 2 + 4, 4);
    ctx.restore();
  }

  _drawBeret(ctx, x, headY) {
    ctx.save();
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(x + 3, headY - this.headRadius + 1, this.headRadius + 4, 6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6B3410';
    ctx.beginPath();
    ctx.arc(x + this.headRadius + 2, headY - this.headRadius + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawDying(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.collapseAngle);
    ctx.translate(-this.x, -this.y);

    ctx.strokeStyle = '#555';
    ctx.fillStyle = '#555';
    ctx.lineWidth = this.type.lineWidth;
    ctx.lineCap = 'round';

    const x = this.x, y = this.y;
    const headY = y - this.bodyHeight - this.headRadius;
    const neckY = y - this.bodyHeight;

    ctx.beginPath(); ctx.arc(x, headY, this.headRadius, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 2;
    const ex1 = x - 4, ex2 = x + 4, eyeY = headY - 2;
    ctx.beginPath(); ctx.moveTo(ex1 - 2, eyeY - 2); ctx.lineTo(ex1 + 2, eyeY + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex1 + 2, eyeY - 2); ctx.lineTo(ex1 - 2, eyeY + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex2 - 2, eyeY - 2); ctx.lineTo(ex2 + 2, eyeY + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex2 + 2, eyeY - 2); ctx.lineTo(ex2 - 2, eyeY + 2); ctx.stroke();
    ctx.lineWidth = this.type.lineWidth;

    ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 8); ctx.lineTo(x + 15, neckY + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 8); ctx.lineTo(x - 15, neckY + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 20); ctx.stroke();
    ctx.restore();
  }

  _drawCorpse(ctx) {
    ctx.save();
    ctx.globalAlpha = this.corpseAlpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-this.x, -this.y);

    ctx.strokeStyle = '#888';
    ctx.lineWidth = this.type.lineWidth;
    ctx.lineCap = 'round';
    const x = this.x, y = this.y;
    const headY = y - this.bodyHeight - this.headRadius;
    const neckY = y - this.bodyHeight;

    ctx.beginPath(); ctx.arc(x, headY, this.headRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 8); ctx.lineTo(x + 15, neckY + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, neckY + 8); ctx.lineTo(x - 15, neckY + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 20); ctx.stroke();
    ctx.restore();
  }

  _drawSoul(ctx) {
    ctx.save();
    ctx.globalAlpha = this.soulAlpha * 0.85;
    const x = this.x, y = this.soulY;
    const bobble = Math.sin(Date.now() / 200) * 3;
    const t = Date.now() / 300;

    const glow = ctx.createRadialGradient(x, y - 10 + bobble, 5, x, y - 10 + bobble, 40);
    glow.addColorStop(0, 'rgba(255, 200, 50, 0.35)');
    glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 40, y - 50 + bobble, 80, 90);

    const soulColor = '#ffcc00';
    ctx.strokeStyle = soulColor;
    ctx.fillStyle = soulColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 12;

    const headY = y - 30 + bobble;
    const bodyTop = y - 18 + bobble;
    const bodyBot = y + 15 + bobble;

    ctx.beginPath(); ctx.arc(x, headY, 8, 0, Math.PI * 2); ctx.stroke(); ctx.fill();

    ctx.shadowBlur = 8; ctx.shadowColor = '#ffe066';
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, headY - 13, 11, 3.5, Math.sin(t * 0.5) * 0.15, 0, Math.PI * 2); ctx.stroke();

    ctx.shadowBlur = 6; ctx.shadowColor = '#ffaa00';
    ctx.strokeStyle = soulColor; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, bodyTop); ctx.lineTo(x, bodyBot); ctx.stroke();

    const wingFlap = Math.sin(t * 4) * 5;
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, bodyTop + 4); ctx.quadraticCurveTo(x - 24 - wingFlap, bodyTop - 14, x - 18, bodyTop + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, bodyTop + 4); ctx.quadraticCurveTo(x + 24 + wingFlap, bodyTop - 14, x + 18, bodyTop + 12); ctx.stroke();

    ctx.strokeStyle = soulColor;
    ctx.beginPath(); ctx.moveTo(x, bodyTop + 5); ctx.lineTo(x - 12, bodyTop - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, bodyTop + 5); ctx.lineTo(x + 12, bodyTop - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, bodyBot); ctx.lineTo(x - 4, bodyBot + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, bodyBot); ctx.lineTo(x + 4, bodyBot + 14); ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
