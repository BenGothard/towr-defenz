const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const instructions = document.getElementById('instructions');
const storeDiv = document.getElementById('store');
const towersData = [
  { emoji: '🏰', name: 'Basic Tower', damage: 1, cost: 5 }
];

function showStore() {
  storeDiv.innerHTML = towersData
    .map(t => `${t.emoji} ${t.name} - Damage ${t.damage} - Cost ${t.cost}`)
    .join('<br>');
}
showStore();

let pathY;

function resizeCanvas() {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.75;
  canvas.width = size;
  canvas.height = size;
  pathY = canvas.height / 2 + 12;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let currency = 0;
let started = false;
let running = false;
let animationId;

class Enemy {
  constructor() {
    this.x = 0;
    this.y = canvas.height / 2;
    this.speed = 40; // pixels per second
    this.health = 3;
  }
  update(dt) {
    this.x += this.speed * dt;
  }
  draw() {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('👾', this.x, this.y);
  }
}

class Projectile {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 200;
  }
  update(dt) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) {
      this.target.health -= 1;
      return true; // hit
    }
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
    return false;
  }
  draw() {
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('✨', this.x, this.y);
  }
}

class Tower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.range = 80;
    this.cooldown = 0;
  }
  update(dt, enemies) {
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      const target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
      if (target) {
        projectiles.push(new Projectile(this.x, this.y, target));
        this.cooldown = 0.5; // fire every half second
      }
    }
  }
  draw() {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('🏰', this.x - 12, this.y);
  }
}

const enemies = [];
const towers = [];
const projectiles = [];
const pathHeight = 20;
let spawnTimer = 0;

function startGame() {
  if (!started) {
    started = true;
    towers.push(new Tower(canvas.width / 2, canvas.height / 2 - 50));
  }
  if (!running) {
    running = true;
    instructions.style.display = 'none';
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
  hud.textContent = '💰0';
  started = false;
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
  const cost = towersData[0].cost;
  if (currency >= cost) {
    towers.push(new Tower(e.offsetX, e.offsetY));
    currency -= cost;
  }
});

let last = 0;
function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    enemies.push(new Enemy());
    spawnTimer = 2; // spawn every 2 seconds
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height); // build area
  ctx.fillStyle = '#555';
  ctx.fillRect(0, pathY - pathHeight / 2, canvas.width, pathHeight); // path

  for (const enemy of enemies) {
    enemy.update(dt);
  }
  for (const tower of towers) {
    tower.update(dt, enemies);
  }
  for (const projectile of projectiles) {
    if (projectile.update(dt)) {
      projectiles.splice(projectiles.indexOf(projectile), 1);
    }
  }
  enemies.filter(e => e.health <= 0).forEach(() => {
    currency += 1;
  });
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].health <= 0 || enemies[i].x > canvas.width) {
      enemies.splice(i, 1);
    }
  }

  for (const enemy of enemies) enemy.draw();
  for (const tower of towers) tower.draw();
  for (const projectile of projectiles) projectile.draw();

  hud.textContent = `💰${currency}`;

  animationId = requestAnimationFrame(loop);
}

// initial pause until the start button is pressed
