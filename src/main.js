const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const instructions = document.getElementById('instructions');
const storeDiv = document.getElementById('store');
const towersData = [
  { emoji: '🏰', name: 'Basic Tower', damage: 1, cost: 5, projectile: '✨', slow: 1 },
  { emoji: '❄️', name: 'Frost Tower', damage: 1, cost: 8, projectile: '❄️', slow: 0.5 }
];
let selectedTowerIndex = 0;
const enemyTypes = [
  { emoji: '👾', health: 3, speed: 40 },
  { emoji: '🤖', health: 6, speed: 35 },
  { emoji: '🦹', health: 10, speed: 30 },
  { emoji: '👹', health: 20, speed: 25 },
  { emoji: '🐉', health: 50, speed: 15, boss: true }
];

function showStore() {
  storeDiv.innerHTML = towersData.map((t, i) =>
    `<label><input type="radio" name="towerType" value="${i}" ${i === selectedTowerIndex ? 'checked' : ''}> ${t.emoji} ${t.name} - Cost ${t.cost}</label>`
  ).join('<br>') +
  '<div>Click tower to upgrade (cost 5×level)</div>';
  const radios = storeDiv.querySelectorAll('input[name="towerType"]');
  radios.forEach(r => r.addEventListener('change', e => {
    selectedTowerIndex = Number(e.target.value);
  }));
}
showStore();

let path = [];

function resizeCanvas() {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.75;
  canvas.width = size;
  canvas.height = size;
  const w = canvas.width;
  const h = canvas.height;
  path = [
    { x: 0, y: h * 0.25 },
    { x: w * 0.25, y: h * 0.25 },
    { x: w * 0.25, y: h * 0.75 },
    { x: w * 0.5, y: h * 0.75 },
    { x: w * 0.5, y: h * 0.25 },
    { x: w * 0.75, y: h * 0.25 },
    { x: w * 0.75, y: h * 0.75 },
    { x: w, y: h * 0.75 }
  ];
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let currency = 0;
let lives = 10;
let started = false;
let running = false;
let animationId;
let spawnCount = 0;

class Enemy {
  constructor(type, level) {
    this.type = type;
    this.x = path[0].x;
    this.y = path[0].y;
    this.speed = type.speed * level;
    this.health = Math.ceil(type.health * level);
    this.emoji = type.emoji;
    this.pathIndex = 0;
    this.reward = Math.ceil(this.health / 3);
    this.slowFactor = 1;
    this.slowDuration = 0;
  }
  update(dt) {
    const target = path[this.pathIndex + 1];
    if (!target) return true;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const currentSpeed = this.speed * this.slowFactor;
    if (dist < currentSpeed * dt) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
    }
    if (this.slowDuration > 0) {
      this.slowDuration -= dt;
      if (this.slowDuration <= 0) {
        this.slowFactor = 1;
      }
    }
    return this.pathIndex >= path.length - 1;
  }

  applySlow(factor, duration) {
    this.slowFactor = factor;
    this.slowDuration = duration;
  }
  draw() {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.emoji, this.x - 12, this.y + 8);
  }
}

class Projectile {
  constructor(x, y, target, emoji, damage, slow) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.emoji = emoji;
    this.damage = damage;
    this.slow = slow;
    // Ensure the projectile is always faster than its target
    this.speed = Math.max(250, this.target.speed * 1.5);
  }
  update(dt) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) {
      this.target.health -= this.damage;
      if (this.slow < 1) {
        this.target.applySlow(this.slow, 2);
      }
      return true; // hit
    }
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
    return false;
  }
  draw() {
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

class Tower {
  constructor(x, y, data) {
    this.x = x;
    this.y = y;
    this.data = data;
    this.range = 80;
    this.cooldown = 0;
    this.level = 1;
  }
  upgrade() {
    if (this.level < 3) {
      this.level += 1;
      return true;
    }
    return false;
  }
  update(dt, enemies) {
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      const target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
      if (target) {
        const damage = this.level * this.data.damage;
        projectiles.push(new Projectile(this.x, this.y, target, this.data.projectile, damage, this.data.slow));
        this.cooldown = 0.5; // fire every half second
      }
    }
  }
  draw() {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.data.emoji, this.x - 12, this.y);
  }
}

const enemies = [];
const towers = [];
const projectiles = [];
const pathHeight = 20;
let spawnTimer = 0;

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const cx = x1 + clamped * dx;
  const cy = y1 + clamped * dy;
  return Math.hypot(px - cx, py - cy);
}

function isPointOnPath(x, y) {
  for (let i = 0; i < path.length - 1; i++) {
    if (distanceToSegment(x, y, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y) <= pathHeight / 2) {
      return true;
    }
  }
  return false;
}

function startGame() {
  if (!started) {
    started = true;
    currency += towersData[0].cost; // starting gold for first tower
  }
  if (!running) {
    running = true;
    instructions.style.display = 'none';
    hud.textContent = `💰${currency} ❤️${lives}`;
    last = performance.now();
    animationId = requestAnimationFrame(loop);
  }
}

function pauseGame() {
  if (running) {
    running = false;
    cancelAnimationFrame(animationId);
  }
}

function restartGame() {
  pauseGame();
  enemies.length = 0;
  towers.length = 0;
  projectiles.length = 0;
  currency = 0;
  lives = 10;
  spawnCount = 0;
  hud.textContent = `💰${currency} ❤️${lives}`;
  started = false;
  instructions.textContent = 'Click anywhere on the board to build towers. You start with enough gold for one tower.';
  instructions.style.display = 'block';
}

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', restartGame);
canvas.addEventListener('click', e => {
  if (!running) {
    startGame();
    return;
  }
  const { offsetX, offsetY } = e;
  const tower = towers.find(t => Math.hypot(t.x - offsetX, t.y - offsetY) < 20);
  if (tower) {
    const cost = tower.level * 5;
    if (currency >= cost && tower.upgrade()) {
      currency -= cost;
    }
  } else {
    const data = towersData[selectedTowerIndex];
    const cost = data.cost;
    if (currency >= cost && !isPointOnPath(offsetX, offsetY)) {
      towers.push(new Tower(offsetX, offsetY, data));
      currency -= cost;
    }
  }
});

let last = 0;
function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnCount++;
    const level = 1 + spawnCount * 0.03;
    let type;
    if (spawnCount % 50 === 0) {
      // spawn a boss enemy occasionally
      type = enemyTypes[enemyTypes.length - 1];
    } else {
      // regular enemies scale up to the second last entry
      type = enemyTypes[
        Math.min(enemyTypes.length - 2, Math.floor(spawnCount / 20))
      ];
    }
    enemies.push(new Enemy(type, level));
    // decrease spawn interval but cap at 0.3 seconds
    spawnTimer = Math.max(0.3, 2 - spawnCount * 0.03);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height); // build area
  ctx.strokeStyle = '#555';
  ctx.lineWidth = pathHeight;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (const p of path.slice(1)) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  for (const enemy of enemies) {
    if (enemy.update(dt)) {
      lives -= 1;
    }
  }
  for (const tower of towers) {
    tower.update(dt, enemies);
  }
  for (const projectile of projectiles) {
    if (projectile.update(dt)) {
      projectiles.splice(projectiles.indexOf(projectile), 1);
    }
  }
  enemies.filter(e => e.health <= 0).forEach(e => {
    currency += e.reward;
  });
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].health <= 0 || enemies[i].pathIndex >= path.length - 1) {
      enemies.splice(i, 1);
    }
  }

  for (const enemy of enemies) enemy.draw();
  for (const tower of towers) tower.draw();
  for (const projectile of projectiles) projectile.draw();

  hud.textContent = `💰${currency} ❤️${lives}`;

  if (lives <= 0) {
    pauseGame();
    instructions.textContent = 'Game Over';
    instructions.style.display = 'block';
  }

  animationId = requestAnimationFrame(loop);
}

// initial pause until the start button is pressed
