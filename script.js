import * as THREE from 'three';

// --- Configuração do Cenário ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a18);
scene.fog = new THREE.FogExp2(0x0a0a18, 0.015);

// --- Câmera e Renderizador ---
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Iluminação ---
const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
scene.add(ambientLight);

// Luz direcional simulando o brilho dos vidros/neon
const directionalLight = new THREE.DirectionalLight(0x00ffff, 2);
directionalLight.position.set(5, 10, 2);
scene.add(directionalLight);

// --- Variáveis de Controle do Jogo ---
let ballCount = 25;
const speed = 0.15; // Aumentei um pouquinho a velocidade para dar mais emoção
const spheres = []; 
const glasses = []; // Array que vai guardar os obstáculos de vidro ativos

// --- Criação do Túnel (Cenário de Teste) ---
const tunnelGeometry = new THREE.BoxGeometry(20, 10, 500);
tunnelGeometry.scale(-1, 1, 1); 
const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111125,
    wireframe: true
});
const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
tunnel.position.z = -200;
scene.add(tunnel);

camera.position.set(0, 2, 0);

// --- Função para Criar Obstáculos de Vidro ---
// Material do vidro: semi-transparente, azulado e bem brilhante
const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide
});

function spawnGlass(zPos) {
    // Dimensões aleatórias para os painéis de vidro
    const width = Math.random() * 4 + 2;  // largura entre 2 e 6
    const height = Math.random() * 5 + 3; // altura entre 3 e 8
    const depth = 0.2;                    // espessura fina como vidro

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);

    // Posiciona em X (esquerda/direita aleatória) e Y (altura do chão)
    const xPos = (Math.random() - 0.5) * 8; // variação entre -4 e 4
    const yPos = height / 2;                // apoiado no chão do túnel

    glassMesh.position.set(xPos, yPos, zPos);
    
    scene.add(glassMesh);

    // Criamos uma caixa de colisão invisível para este vidro
    const boundingBox = new THREE.Box3().setFromObject(glassMesh);

    glasses.push({
        mesh: glassMesh,
        box: boundingBox
    });
}

// Inicializa os primeiros vidros no caminho do jogador
for (let i = 1; i <= 5; i++) {
    spawnGlass(-50 * i); // Spawna vidros a cada 50 unidades de distância
}

// --- Sistema de Tiro (Raycasting) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
    if (ballCount <= 0) return;

    ballCount--;
    document.getElementById('ball-count').innerText = ballCount;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const ballGeo = new THREE.SphereGeometry(0.2, 16, 16); // Reduzi os segmentos para melhorar performance
    const ballMat = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa, 
        metalness: 0.9, 
        roughness: 0.1 
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);

    ball.position.copy(camera.position);
    ball.position.z -= 0.5;

    const force = 0.6;
    const direction = new THREE.Vector3();
    raycaster.ray.direction.normalize();
    direction.copy(raycaster.ray.direction).multiplyScalar(force);

    spheres.push({
        mesh: ball,
        velocity: direction,
        gravity: -0.004,
        box: new THREE.Box3() // Cada bola ganha sua própria caixa de colisão
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

    // 1. Avança a câmera pelo corredor
    camera.position.z -= speed;

    // 2. Atualiza a trajetória e colisão das esferas
    for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];
        
        s.mesh.position.add(s.velocity);
        s.velocity.y += s.gravity; 

        // Atualiza a caixa de colisão matemática da bola na nova posição
        s.box.setFromObject(s.mesh);

        // Checar colisão da bola com cada vidro existente
        for (let j = glasses.length - 1; j >= 0; j--) {
            const g = glasses[j];

            if (s.box.intersectsBox(g.box)) {
                // HOUVE COLISÃO! 💥
                
                // Remove o vidro da cena
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                glasses.splice(j, 1);

                // Remove a bola que bateu
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
                spheres.splice(i, 1);

                // Spawna um novo vidro lá na frente para o jogo continuar infinito
                // Pega a posição do último vidro gerado e joga 50 unidades para frente
                const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
                spawnGlass(lastZ - 50);

                break; // Sai do loop de vidros já que esta bola sumiu
            }
        }

        // Limpeza de memória: remove esferas antigas que sumiram no mapa
        if (spheres[i] && (s.mesh.position.z < camera.position.z - 100 || s.mesh.position.y < -10)) {
            scene.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
            spheres.splice(i, 1);
        }
    }

    // 3. Remover vidros que o jogador já passou sem quebrar (Otimização)
    for (let j = glasses.length - 1; j >= 0; j--) {
        if (glasses[j].mesh.position.z > camera.position.z + 5) {
            scene.remove(glasses[j].mesh);
            glasses[j].mesh.geometry.dispose();
            glasses.splice(j, 1);

            // Spawna um novo vidro na frente para manter o fluxo
            const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
            spawnGlass(lastZ - 50);
        }
    }

    // Move o túnel para frente para simular um caminho infinito
    if (camera.position.z < tunnel.position.z - 100) {
        tunnel.position.z -= 200;
    }

    renderer.render(scene, camera);
}

animate();
