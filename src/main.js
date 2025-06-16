const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
canvas.width = 400;
canvas.height = 400;

let currency = 0;

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
        target.health -= 1;
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
let spawnTimer = 0;

canvas.addEventListener('click', e => {
  if (currency >= 5) {
    towers.push(new Tower(e.offsetX, e.offsetY));
    currency -= 5;
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
  ctx.fillStyle = '#ccc';
  ctx.fillRect(0, canvas.height / 2 + 12, canvas.width, 20); // path

  for (const enemy of enemies) {
    enemy.update(dt);
  }
  for (const tower of towers) {
    tower.update(dt, enemies);
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

  hud.textContent = `💰${currency}`;

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
