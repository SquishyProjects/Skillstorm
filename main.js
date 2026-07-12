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

// --- Iluminação Melhorada ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Luz ambiente mais clara
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x00ffff, 2.5);
directionalLight.position.set(0, 10, -10); // Posicionada ligeiramente à frente
scene.add(directionalLight);

// --- Variáveis de Controle do Jogo ---
let ballCount = 25;
const speed = 0.12; 
const spheres = []; 
const glasses = []; 

// --- Criação do Túnel ---
const tunnelGeometry = new THREE.BoxGeometry(20, 10, 500);
tunnelGeometry.scale(-1, 1, 1); 
const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: 0x222244,
    wireframe: true
});
const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
tunnel.position.z = -200;
scene.add(tunnel);

// Câmera começa em Z = 0
camera.position.set(0, 2, 0);

// --- Função para Criar Obstáculos de Vidro ---
// Mudamos para um material ligeiramente menos transparente para garantir que você veja
// --- Função para Criar Obstáculos de Vidro Corrigida ---
const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.7, 
    roughness: 0.1,
    metalness: 0.5,
    side: THREE.DoubleSide
});

function spawnGlass(zPos) {
    // Dimensões fixas do vidro
    const width = 4;  
    const height = 5; 
    const depth = 0.3;                    

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);

    // Posiciona o obstáculo na pista
    const xPos = (Math.random() - 0.5) * 4; 
    const yPos = height / 2; // Apoiado no chão do túnel (Y=0)

    glassMesh.position.set(xPos, yPos, zPos);
    scene.add(glassMesh);

    // FIX: Criando a caixa de colisão manualmente com valores fixos
    // Isso evita que o Three.js zere o tamanho do vidro por falta de processamento
    const boundingBox = new THREE.Box3();
    boundingBox.setFromCenterAndSize(
        new THREE.Vector3(xPos, yPos, zPos),
        new THREE.Vector3(width, height, depth)
    );

    glasses.push({
        mesh: glassMesh,
        box: boundingBox
    });
}

// Garanta que esse loop rode DEPOIS de definir a função spawnGlass acima
// Vamos resetar a fila inicial de vidros bem na sua frente
glasses.length = 0; // Limpa qualquer lixo anterior
for (let i = 0; i < 6; i++) {
    spawnGlass(-25 - (i * 35)); // Primeiro vidro a 25 metros de distância, depois a cada 35m
}

// ATENÇÃO: Gerando os primeiros vidros bem mais perto da câmera inicial (Z = 0)
// Eles vão aparecer em Z = -20, -45, -70, -95...
for (let i = 0; i < 6; i++) {
    spawnGlass(-20 - (i * 25)); 
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

    const ballGeo = new THREE.SphereGeometry(0.2, 16, 16); 
    const ballMat = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc, 
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

    // 1. Avança a câmera pelo corredor (Z fica cada vez mais negativo)
    camera.position.z -= speed;

    // 2. Atualiza as esferas e checa colisões
    for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];
        
        s.mesh.position.add(s.velocity);
        s.velocity.y += s.gravity; 

        s.box.setFromObject(s.mesh);

        for (let j = glasses.length - 1; j >= 0; j--) {
            const g = glasses[j];

            if (s.box.intersectsBox(g.box)) {
                // Colisão detectada!
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                glasses.splice(j, 1);

                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
                spheres.splice(i, 1);

                // Spawna o próximo lá na frente
                const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
                spawnGlass(lastZ - 30);
                break; 
            }
        }

        // Limpa esferas que sumiram do mapa
        if (spheres[i] && (s.mesh.position.z < camera.position.z - 80 || s.mesh.position.y < -10)) {
            scene.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
            spheres.splice(i, 1);
        }
    }

    // 3. Remover vidros que ficaram para trás da câmera
    for (let j = glasses.length - 1; j >= 0; j--) {
        // Como a câmera se move para o Z negativo, se o vidro tiver um Z MAIOR que o da câmera, ele ficou para trás
        if (glasses[j].mesh.position.z > camera.position.z) {
            scene.remove(glasses[j].mesh);
            glasses[j].mesh.geometry.dispose();
            glasses.splice(j, 1);

            // Cria um novo obstáculo adiante
            const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
            spawnGlass(lastZ - 30);
        }
    }

    // Move o túnel infinito
    if (camera.position.z < tunnel.position.z - 100) {
        tunnel.position.z -= 200;
    }

    renderer.render(scene, camera);
}

animate();
