const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  color: "white",
  speed: 3,
  health: 100,
  damage: 10
};

let bulletSpeed = 6;
let enemies = [];
let bullets = [];
let wave = 0;
let keys = {};
let gameRunning = true;

const upgrades = [
  { name: "+10 Damage", apply: () => player.damage += 10 },
  { name: "+20% Speed", apply: () => player.speed *= 1.2 },
  { name: "+30 HP", apply: () => player.health += 30 },
  { name: "+30% Bullet Speed", apply: () => bulletSpeed *= 1.3 }
];

const strongerUpgrades = [
  { name: "+25 Damage", apply: () => player.damage += 25 },
  { name: "+50% Speed", apply: () => player.speed *= 1.5 },
  { name: "+100 HP", apply: () => player.health += 100 }
];

function spawnEnemies(num) {
  for (let i = 0; i < num; i++) {
    const isStrong = Math.random() < 0.2; // 20% chance de ser forte
    if (isStrong) {
      enemies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 25,
        speed: 0.8,
        color: "purple",
        health: 100 + wave * 10
      });
    } else {
      enemies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 15,
        speed: 1 + Math.random(),
        color: "red",
        health: 20 + wave * 5
      });
    }
  }
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function movePlayer() {
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Limites da tela
  if (player.x < player.size) player.x = player.size;
  if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;
  if (player.y < player.size) player.y = player.size;
  if (player.y > canvas.height - player.size) player.y = canvas.height - player.size;
}

function moveEnemies() {
  enemies.forEach(enemy => {
    let dx = player.x - enemy.x;
    let dy = player.y - enemy.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;

    if (dist < player.size + enemy.size) {
      player.health -= 0.2;
    }
  });
}

function updateBullets() {
  bullets.forEach((b, index) => {
    b.x += b.dx * b.speed;
    b.y += b.dy * b.speed;

    enemies.forEach(enemy => {
      const dx = b.x - enemy.x;
      const dy = b.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < enemy.size) {
        enemy.health -= b.damage;
        bullets.splice(index, 1);
      }
    });
  });

  // Desenhar as balas com rastro
  bullets.forEach(b => {
    let grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
    grad.addColorStop(0, "yellow");
    grad.addColorStop(1, "rgba(255, 255, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function shootAtNearestEnemy() {
  if (enemies.length === 0) return;

  let nearest = enemies[0];
  let minDist = Infinity;

  enemies.forEach(e => {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  });

  const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
  bullets.push({
    x: player.x,
    y: player.y,
    radius: 5,
    speed: bulletSpeed,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    damage: player.damage
  });
}

function nextWave() {
  wave++;
  spawnEnemies(5 + wave * 2);
  showUpgrade();
}

function showUpgrade() {
  gameRunning = false;
  const screen = document.getElementById("upgrade-screen");
  screen.innerHTML = `<h2>Wave ${wave} complete! Choose an upgrade:</h2>`;
  const upgradeSet = wave % 5 === 0 ? strongerUpgrades : upgrades;
  let options = [];
  while (options.length < 3) {
    const pick = upgradeSet[Math.floor(Math.random() * upgradeSet.length)];
    if (!options.some(o => o.name === pick.name)) options.push(pick);
  }
  options.forEach(upg => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerText = upg.name;
    card.onclick = () => {
      upg.apply();
      screen.style.display = "none";
      screen.innerHTML = "";
      gameRunning = true;
    };
    screen.appendChild(card);
  });
  screen.style.display = "flex";
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`HP: ${Math.floor(player.health)}`, 10, 20);
  ctx.fillText(`Wave: ${wave}`, 10, 40);
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gameRunning) {
    movePlayer();
    moveEnemies();
    drawPlayer();
    drawEnemies();
    updateBullets();

    enemies = enemies.filter(e => e.health > 0);

    if (enemies.length === 0) {
      nextWave();
    }

    if (player.health <= 0) {
      alert("Game Over! Refresh to restart.");
      gameRunning = false;
    }
  }

  drawHUD();
  requestAnimationFrame(update);
}

window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

window.onload = () => {
  nextWave();
  update();
  setInterval(() => {
    if (gameRunning) shootAtNearestEnemy();
  }, 500);
};
