// Tela inicial
// Controle da tela inicial
const startScreen = document.getElementById("start-screen");
const playButton = document.getElementById("play-button");

playButton.onclick = () => {
  startScreen.style.display = "none";
  startGame();
};

function startGame() {
  nextWave();
  update();
  setInterval(() => {
    if (gameRunning) shootAtNearestEnemy();
  }, 500);
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let lightningLevel = 0;
let lightningCooldown = 0;
let lightnings = [];


let boss = null;
let bossProjectiles = [];


let bulletSpeed = 6;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  color: "white",
  speed: 3,
  health: 100,
  damage: 10,
  bulletSpeed: 3 // velocidade base
};

let fragmentationLevel = 0;
let enemies = [];
let bullets = [];
let particles = [];
let wave = 0;
let keys = {};
let gameRunning = true;

const upgrades = [
  { name: "+10 Damage", apply: () => player.damage += 10 },
  { name: "+20% Speed", apply: () => player.speed *= 1.2 },
  { name: "+30 HP", apply: () => player.health += 30 },
  { name: "+20% Bullet Speed", apply: () => {
      bullets.forEach(b => b.speed *= 1.2); // errado, pois isso só afeta balas existentes
      player.bulletSpeed *= 1.2; // use isso!
    } 
  },
  { name: "Fragmentation", apply: () => fragmentationLevel += 1 }
];



const strongerUpgrades = [
  { name: "+25 Damage", apply: () => player.damage += 25 },
  { name: "+50% Speed", apply: () => player.speed *= 1.5 },
  { name: "+100 HP", apply: () => player.health += 100 }
];

function spawnEnemies(num) {
  for (let i = 0; i < num; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;

    let type = "normal";
    let color = "red";
    let size = 15;
    let speed = 1 + Math.random();
    let health = 20 + wave * 5;

    if (wave >= 10 && wave < 15) {
      if (Math.random() < 0.3) {
        type = "triangle";
        color = "#00ffaa"; // ciano esverdeado
        size = 22;
        speed = 0.9;
        health = 100 + wave * 10;
      } else if (Math.random() < 0.5) {
        color = "purple";
      }
    }

    if (wave >= 16) {
      if (Math.random() < 0.25) {
        type = "triangle";
        color = "#00ffaa";
        size = 22;
        speed = 0.9;
        health = 120 + wave * 10;
      } else if (Math.random() < 0.5) {
        color = "purple";
      }
    }

    enemies.push({ x, y, size, speed, color, health, type });
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

    if (enemy.type === "triangle") {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      const side = enemy.size * 2;
      for (let i = 0; i < 3; i++) {
        const theta = angle + i * (2 * Math.PI / 3);
        const x = enemy.x + Math.cos(theta) * side / 2;
        const y = enemy.y + Math.sin(theta) * side / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    }

    ctx.fill();
  });
}

function drawBoss() {
  if (!boss) return;

  // Boss shape (triângulo)
  ctx.fillStyle = boss.color;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = i * (2 * Math.PI / 3) - Math.PI / 2;
    const x = boss.x + Math.cos(angle) * boss.size;
    const y = boss.y + Math.sin(angle) * boss.size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Barra de HP
  ctx.fillStyle = "red";
  ctx.fillRect(boss.x - 50, boss.y - boss.size - 20, 100, 10);
  ctx.fillStyle = "lime";
  ctx.fillRect(boss.x - 50, boss.y - boss.size - 20, 100 * (boss.health / boss.maxHealth), 10);
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

function spawnFragments(x, y) {
  const total = fragmentationLevel * 2;
  for (let i = 0; i < total; i++) {
    const angle = Math.random() * Math.PI * 2;
    bullets.push({
      x: x,
      y: y,
      radius: 4,
      speed: 4,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      damage: 5
    });
  }
}


function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx * b.speed;
    b.y += b.dy * b.speed;

    // Verifica colisão com inimigos normais
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dx = b.x - enemy.x;
      const dy = b.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < enemy.size) {
        enemy.health -= b.damage;
        bullets.splice(i, 1);
        break;
      }
    }

    // Verifica colisão com o boss
    if (boss) {
      const dx = b.x - boss.x;
      const dy = b.y - boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < boss.size) {
        boss.health -= b.damage;
        bullets.splice(i, 1);
        continue;
      }
    }

    // Remover projétil se sair da tela
    if (
      b.x < 0 || b.x > canvas.width ||
      b.y < 0 || b.y > canvas.height
    ) {
      bullets.splice(i, 1);
    }
  }

  // Desenhar projéteis do jogador
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}






function shootAtNearestEnemy() {
  // Encerra se não há nenhum inimigo nem boss
  if (enemies.length === 0 && !boss) return;

  // Prioriza inimigos comuns; se não tiver, atira no boss
  let nearest = null;
  let minDist = Infinity;

  [...enemies, boss].forEach(e => {
    if (!e) return;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  });

  if (!nearest) return;

  const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
  bullets.push({
    x: player.x,
    y: player.y,
    radius: 5,
    speed: player.bulletSpeed || 6,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    damage: player.damage
  });
}


function nextWave() {
  wave++;

  if (wave === 15) {
    enemies = []; // remove inimigos normais
    spawnBoss();
  } else {
    spawnEnemies(5 + wave * 2);
  }

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
    if (!options.includes(pick)) options.push(pick);
  }

  options.forEach(upg => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerText = upg.name;
    card.onclick = () => {
      upg.apply();

      const cardName = getCardKeyByName(upg.name);
      if (cardName) {
        if (!collectedCards.includes(cardName)) {
          collectedCards.push(cardName);
          cardStacks[cardName] = 1;
        } else {
          cardStacks[cardName] = (cardStacks[cardName] || 1) + 1;
        }
        updateCardIcons();
      }

      screen.style.display = "none";
      gameRunning = true;
    };
    screen.appendChild(card);
  });

  screen.style.display = "flex";
}

function getCardKeyByName(name) {
  if (name.toLowerCase().includes("fragmentation")) return "fragmentation";
  if (name.toLowerCase().includes("bullet")) return "bulletSpeed";
  if (name.toLowerCase().includes("damage")) return "damageBoost";
  if (name.toLowerCase().includes("hp")) return "maxHP";
  if (name.toLowerCase().includes("speed")) return "playerSpeed";
  return null;
}

function updateCardIcons() {
  const container = document.getElementById("card-icons");
  if (!container) return;
  container.innerHTML = "";

  collectedCards.forEach(card => {
    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.style.backgroundImage = `url('${cardImages[card]}')`;

    const count = document.createElement("div");
    count.className = "card-count";
    count.innerText = cardStacks[card] || 1;
    icon.appendChild(count);

    icon.addEventListener("mouseenter", (e) => showTooltip(e, card));
    icon.addEventListener("mousemove", (e) => moveTooltip(e));
    icon.addEventListener("mouseleave", hideTooltip);

    container.appendChild(icon);
  });
}


function showTooltip(e, cardKey) {
  const tooltip = document.createElement("div");
  tooltip.id = "card-tooltip";
  tooltip.className = "card-tooltip";
  tooltip.innerHTML = `<strong>${cardKey}</strong><br>${cardDescriptions[cardKey] || "No description."}`;
  document.body.appendChild(tooltip);
  moveTooltip(e);
}

function moveTooltip(e) {
  const tooltip = document.getElementById("card-tooltip");
  if (tooltip) {
    tooltip.style.left = `${e.pageX + 10}px`;
    tooltip.style.top = `${e.pageY + 10}px`;
  }
}

function hideTooltip() {
  const tooltip = document.getElementById("card-tooltip");
  if (tooltip) tooltip.remove();
}

// Mapas auxiliares
let collectedCards = [];
let cardStacks = {};

const cardImages = {
  fragmentation: "https://iili.io/FXY4ae9.png",
  bulletSpeed: "https://iili.io/FXYBJte.png",
  damageBoost: "https://iili.io/FXYkG8g.png",
  maxHP: "https://iili.io/FXY1l5P.png",
  playerSpeed: "https://iili.io/FXWOVLX.png",
  Lightning: "https://iili.io/FhJWdQ9.png" // substitua com o link real
};

const cardDescriptions = {
  fragmentation: "When enemies die, they release weaker projectiles.",
  bulletSpeed: "Increases projectile speed.",
  damageBoost: "Increases your projectile damage.",
  maxHP: "Increases your current HP.",
  playerSpeed: "Increases your movement speed.",
  Lightning: "Calls 2 Bolts from the skies every few seconds. Instantly kills enemies on hit."
};


function getCardKeyByName(name) {
  if (name.toLowerCase().includes("fragmentation")) return "fragmentation";
  if (name.toLowerCase().includes("bullet")) return "bulletSpeed";
  if (name.toLowerCase().includes("damage")) return "damageBoost";
  if (name.toLowerCase().includes("hp")) return "maxHP";
  return null;
}


function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`HP: ${Math.floor(player.health)}`, 10, 20);
  ctx.fillText(`Wave: ${wave}`, 10, 40);
}

function spawnBoss() {
  boss = {
    x: canvas.width / 2,
    y: 100,
    size: 60,
    speed: 0.5,
    color: "#ccc",
    health: 1000,
    maxHealth: 1000
  };
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameRunning) {
    movePlayer();
    moveEnemies();
    drawPlayer();
    drawEnemies();
    updateBullets();
    

    // ⬇️ Atualiza e desenha projéteis do boss
    bossProjectiles.forEach((p, i) => {
      p.x += p.dx * p.speed;
      p.y += p.dy * p.speed;

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Colisão com o jogador
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.radius + player.size) {
        player.health -= 5;
        bossProjectiles.splice(i, 1);
      }
    });

    // ⬇️ Lógica do boss
    if (boss) {
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      boss.x += (dx / dist) * boss.speed;
      boss.y += (dy / dist) * boss.speed;

      // Atira a cada 1000ms
      if (performance.now() % 1000 < 16) {
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        bossProjectiles.push({
          x: boss.x,
          y: boss.y,
          dx: Math.cos(angle),
          dy: Math.sin(angle),
          speed: 9,
          radius: 6
        });
      }

      drawBoss();

      if (boss.health <= 0) {
        boss = null;
        spawnEnemies(5 + wave * 2); // volta os inimigos
      }
    }

    // ⬇️ Verifica mortes de inimigos comuns
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        const ex = enemies[i].x;
        const ey = enemies[i].y;
        enemies.splice(i, 1);

        if (fragmentationLevel > 0) {
          spawnFragments(ex, ey);
        }
      }
    }

    // ⬇️ Avança wave se não há inimigos nem boss
    if (enemies.length === 0 && !boss) {
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




// === FUNÇÃO PARA ATUALIZAR OS ÍCONES NA TELA ===
function getCardKeyByName(name) {
  if (name.includes("Fragmentation")) return "fragmentation";
  if (name.includes("Bullet")) return "bulletSpeed";
  if (name.includes("Damage")) return "damageBoost";
  if (name.includes("HP")) return "maxHP";
  return null;
}



// === EXEMPLO DE ADIÇÃO DE UMA CARTA (chame isso ao aplicar upgrade) ===
function applyUpgrade(name) {
  if (!collectedCards.includes(name)) {
    collectedCards.push(name);
    updateCardIcons();
  }

  if (name === "Bullet Speed") {
    bulletSpeed += 2;
  } else if (name === "Fragmentation") {
    fragmentationLevel++;
  } else if (name === "Damage Boost") {
    player.damage += 1;
  } else if (name === "Max HP") {
    player.maxHealth += 2;
    player.health = player.maxHealth;
  } else if (name === "Lightning") {
    lightningLevel++;
  }
}


function spawnLightning() {
  if (lightningLevel === 0) return;

  if (lightningCooldown <= 0) {
    for (let i = 0; i < lightningLevel * 2; i++) {
      let x = Math.random() * canvas.width;
      lightnings.push({ x, y: 0, height: 0 });
    }
    lightningCooldown = 180; // ~3 segundos (60 = 1s)
  } else {
    lightningCooldown--;
  }
}

// Exemplo: applyUpgrade("fragmentation");
document.getElementById("cheat-button").onclick = () => {
  const menu = document.getElementById("cheat-menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
};

window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

window.onload = () => {
  nextWave();
  update();
  setInterval(() => {
    if (gameRunning) shootAtNearestEnemy();
  }, 500);
};
