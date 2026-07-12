import * as THREE from 'three';

// --- Configuração do Cenário (Estética Smash Hit) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a18);
scene.fog = new THREE.FogExp2(0x0a0a18, 0.018); // Nevoeiro denso para o visual clean

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Iluminação Neon ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

const lightLeft = new THREE.DirectionalLight(0x00ffff, 1.5); // Brilho azul/ciano
lightLeft.position.set(-5, 5, -10);
scene.add(lightLeft);

const lightRight = new THREE.DirectionalLight(0xff00ff, 0.5); // Brilho sutil magenta para contraste
lightRight.position.set(5, 5, -10);
scene.add(lightRight);

// --- Variáveis de Controle ---
let ballCount = 25;
const speed = 0.12; 
const spheres = []; 
const glasses = []; 
const shards = []; // Array para guardar os pedacinhos de vidro quebrando

// --- Túnel ---
const tunnelGeometry = new THREE.BoxGeometry(20, 10, 500);
tunnelGeometry.scale(-1, 1, 1); 
const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: 0x151530,
    wireframe: true
});
const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
tunnel.position.set(0, 5, -200);
scene.add(tunnel);

camera.position.set(0, 2, 0);

// --- Material de Vidro Realista (Semi-transparente e reflexivo) ---
const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,       // Ciano brilhante estilo Smash Hit
    transparent: true,
    opacity: 0.5,          // Translúcido
    roughness: 0.05,       // Muito polido, gera reflexos bonitos
    metalness: 0.1,
    side: THREE.DoubleSide
});

// --- Função para Criar Obstáculos de Vidro ---
function spawnGlass(zPos) {
    const width = 4;  
    const height = 5; 
    const depth = 0.2; // Vidro bem fininho                    

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);

    // Posiciona em X de forma semi-aleatória para interceptar o jogador
    const xPos = (Math.random() - 0.5) * 3; 
    const yPos = height / 2; // Apoiado no chão

    glassMesh.position.set(xPos, yPos, zPos);
    scene.add(glassMesh);

    // Cria a caixa de colisão precisa
    const boundingBox = new THREE.Box3();
    boundingBox.setFromCenterAndSize(
        new THREE.Vector3(xPos, yPos, zPos),
        new THREE.Vector3(width, height, depth)
    );

    glasses.push({
        mesh: glassMesh,
        box: boundingBox,
        width: width,
        height: height
    });
}

// Inicializa a pista com vidros na frente
for (let i = 0; i < 6; i++) {
    spawnGlass(-30 - (i * 40)); 
}

// --- Função para Efeito de Vidro Quebrando (Estilhaços) ---
function shatterGlass(x, y, z, width, height) {
    // Vamos criar uma grade de 4x4 pedacinhos de vidro por painel
    const cols = 4;
    const rows = 4;
    const shardW = width / cols;
    const shardH = height / rows;
    const shardGeo = new THREE.BoxGeometry(shardW, shardH, 0.15);

    // O centro do painel original serve como base
    const startX = x - width / 2 + shardW / 2;
    const startY = y - height / 2 + shardH / 2;

    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const shardMesh = new THREE.Mesh(shardGeo, glassMaterial);
            
            // Posiciona o estilhaço na grade correspondente do painel original
            const pX = startX + c * shardW;
            const pY = startY + r * shardH;
            shardMesh.position.set(pX, pY, z);
            
            // Rotação aleatória inicial para parecer dinâmico
            shardMesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
            scene.add(shardMesh);

            // Adiciona forças físicas individuais para cada pedaço voar
            shards.push({
                mesh: shardMesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.15,          // Voa um pouco pros lados
                    (Math.random() * 0.1) + 0.05,          // Dá um leve pulinho para cima no impacto
                    -speed - (Math.random() * 0.1)         // É empurrado para frente pelo impacto da bola
                ),
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1
                ),
                gravity: -0.005, // Gravidade puxando o caco para o chão
                life: 1.0        // Tempo de vida do estilhaço (fade-out)
            });
        }
    }
}

// --- Sistema de Disparo com Gravidade ---
window.addEventListener('pointerdown', (event) => {
    if (ballCount <= 0) return;
    ballCount--;
    document.getElementById('ball-count').innerText = ballCount;

    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Bolinha de metal cromada
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), ballMat);
    ball.position.copy(camera.position).z -= 0.5;

    // Força e direção calculadas em 3D
    const force = 0.7; // Velocidade do tiro
    const direction = new THREE.Vector3();
    raycaster.ray.direction.normalize();
    direction.copy(raycaster.ray.direction).multiplyScalar(force);

    // Salvando a bolinha com propriedade física de gravidade (Eixo Y caindo)
    spheres.push({ 
        mesh: ball, 
        velocity: direction, 
        gravity: -0.005, // Força que puxa a bola para baixo a cada frame!
        box: new THREE.Box3() 
    });
    
    scene.add(ball);
});

// --- Janela Redimensionável ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Loop Principal de Animação ---
function animate() {
    requestAnimationFrame(animate);

    // Avança a câmera continuamente (Z negativo)
    camera.position.z -= speed;

    // Atualiza o painel de texto simples de Debug com dados novos
    const debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.innerHTML = `Cam Z: ${camera.position.z.toFixed(1)} | Vidros: ${glasses.length} | Cacos: ${shards.length}`;
    }

    // 1. Atualiza as Esferas de Metal (Trajetória Parabólica em 3D)
    for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];
        
        // Aplica velocidade nos 3 eixos (X, Y, Z)
        s.mesh.position.add(s.velocity);
        // Aplica o efeito físico de queda na velocidade vertical (Y)
        s.velocity.y += s.gravity; 
        
        s.box.setFromObject(s.mesh);

        // Checa colisão com os Vidros
        for (let j = glasses.length - 1; j >= 0; j--) {
            const g = glasses[j];

            if (s.box.intersectsBox(g.box)) {
                // INSTANTE DO IMPACTO 💥
                // Aciona o efeito de quebra passando a posição e dimensões do vidro atingido
                shatterGlass(g.mesh.position.x, g.mesh.position.y, g.mesh.position.z, g.width, g.height);

                // Deleta o vidro da cena
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                glasses.splice(j, 1);

                // Deleta a bolinha que bateu
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
                spheres.splice(i, 1);

                // Spawna um novo obstáculo lá na frente mantendo o fluxo infinito
                const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
                spawnGlass(lastZ - 40);
                break; 
            }
        }

        // Limpeza de bolinhas antigas que caíram ou sumiram no horizonte
        if (spheres[i] && (s.mesh.position.z < camera.position.z - 80 || s.mesh.position.y < -5)) {
            scene.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
            spheres.splice(i, 1);
        }
    }

    // 2. Atualiza e Anima os Estilhaços de Vidro Quebrados
    for (let k = shards.length - 1; k >= 0; k--) {
        const shard = shards[k];
        
        // Move o pedaço baseado em sua direção física individual
        shard.mesh.position.add(shard.velocity);
        shard.velocity.y += shard.gravity; // Gravidade agindo no vidro caindo
        
        // Faz o pedacinho girar no ar enquanto cai
        shard.mesh.rotation.x += shard.rotationSpeed.x;
        shard.mesh.rotation.y += shard.rotationSpeed.y;
        shard.mesh.rotation.z += shard.rotationSpeed.z;

        // Desbota o vidro devagar antes de apagar da memória
        shard.life -= 0.015;
        // Se mudarmos o material principal pode dar erro de opacidade por pedaço, então controlamos a escala ou sumiço
        if (shard.life <= 0 || shard.mesh.position.y < -1) {
            scene.remove(shard.mesh);
            shard.mesh.geometry.dispose();
            shards.splice(k, 1);
        }
    }

    // 3. Remover vidros que o jogador ignorou e passaram batidos pela câmera
    for (let j = glasses.length - 1; j >= 0; j--) {
        if (glasses[j].mesh.position.z > camera.position.z + 2) {
            scene.remove(glasses[j].mesh);
            glasses[j].mesh.geometry.dispose();
            glasses.splice(j, 1);

            const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
            spawnGlass(lastZ - 40);
        }
    }

    // Reposiciona o túnel infinito
    if (camera.position.z < tunnel.position.z - 100) {
        tunnel.position.z -= 200;
    }

    renderer.render(scene, camera);
}

animate();
