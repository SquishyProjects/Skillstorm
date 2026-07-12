import * as THREE from 'three';

// --- Configuração do Cenário (Estética Smash Hit Atualizada) ---
const scene = new THREE.Scene();

// Cor de fundo mais viva (Azul Índigo Profundo) em vez de preto absoluto
scene.background = new THREE.Color(0x0e0e26); 

// Neblina volumétrica colorida (Roxa/Magenta) que esconde o fim do cenário de forma elegante
scene.fog = new THREE.FogExp2(0x1a0b2e, 0.025); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Iluminação Turbinada (Tirando o jogo do Void) ---
// Luz geral bem mais forte para clarear tudo
const ambientLight = new THREE.AmbientLight(0xffffff, 1.8); 
scene.add(ambientLight);

// Luz direcional simulando um "sol neon" vindo de cima/frente
const sunLight = new THREE.DirectionalLight(0x00ffff, 2.0); // Luz Ciano
sunLight.position.set(0, 15, -20);
scene.add(sunLight);

// Luz de preenchimento vinda de trás para destacar as bordas
const backLight = new THREE.DirectionalLight(0xff00ff, 1.2); // Luz Magenta
backLight.position.set(0, -5, -10);
scene.add(backLight);

// --- Variáveis de Controle ---
let ballCount = 25;
const speed = 0.12; 
const spheres = []; 
const glasses = []; 
const shards = []; 

// --- Criação do Chão e Teto Sólidos (Preenchendo o Vazio) ---
const floorGroup = new THREE.Group();

// Chão Sólido
const floorGeo = new THREE.PlaneGeometry(30, 1000);
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x121232, 
    roughness: 0.2, 
    metalness: 0.5 
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; // Deita o plano para virar chão
floor.position.y = 0;
floorGroup.add(floor);

// Teto Sólido
const ceiling = new THREE.Mesh(floorGeo, floorMat);
ceiling.rotation.x = Math.PI / 2; // Deita o plano para virar teto
ceiling.position.y = 10;
floorGroup.add(ceiling);

// Grid Visual para dar noção de movimento (Linhas brilhantes no chão)
const gridHelperFloor = new THREE.GridHelper(1000, 100, 0x00ffff, 0x442266);
gridHelperFloor.position.y = 0.01; // Um milímetro acima do chão para não dar bug visual
gridHelperFloor.rotation.x = 0;
floorGroup.add(gridHelperFloor);

floorGroup.position.z = -500;
scene.add(floorGroup);

camera.position.set(0, 3, 0); // Câmera um pouco mais alta para ver melhor o chão

// --- Material de Vidro Realista (Translúcido e Brilhante) ---
const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,       
    transparent: true,
    opacity: 0.6,          
    roughness: 0.01,       // Extremamente polido para refletir as novas luzes
    metalness: 0.2,
    side: THREE.DoubleSide
});

// --- Função para Criar Obstáculos de Vidro ---
function spawnGlass(zPos) {
    const width = 4;  
    const height = 5; 
    const depth = 0.2;                     

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);

    const xPos = (Math.random() - 0.5) * 6; // Espalha um pouco mais para as laterais
    const yPos = height / 2; 

    glassMesh.position.set(xPos, yPos, zPos);
    scene.add(glassMesh);

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

// Inicializa a pista com vidros
for (let i = 0; i < 6; i++) {
    spawnGlass(-30 - (i * 40)); 
}

// --- Efeito de Vidro Quebrando (Estilhaços) ---
function shatterGlass(x, y, z, width, height) {
    const cols = 4;
    const rows = 4;
    const shardW = width / cols;
    const shardH = height / rows;
    const shardGeo = new THREE.BoxGeometry(shardW, shardH, 0.15);

    const startX = x - width / 2 + shardW / 2;
    const startY = y - height / 2 + shardH / 2;

    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const shardMesh = new THREE.Mesh(shardGeo, glassMaterial);
            const pX = startX + c * shardW;
            const pY = startY + r * shardH;
            shardMesh.position.set(pX, pY, z);
            
            shardMesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
            scene.add(shardMesh);

            shards.push({
                mesh: shardMesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,          
                    (Math.random() * 0.15) + 0.05,          
                    -speed - (Math.random() * 0.1)         
                ),
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2
                ),
                gravity: -0.008, // Gravidade atuando nos cacos
                life: 1.0        
            });
        }
    }
}

// --- Sistema de Disparo ---
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

    // Esfera Cromada Refletiva
    const ballMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        metalness: 0.95, 
        roughness: 0.05 
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), ballMat);
    ball.position.copy(camera.position).z -= 0.5;

    const force = 0.8; 
    const direction = new THREE.Vector3();
    raycaster.ray.direction.normalize();
    direction.copy(raycaster.ray.direction).multiplyScalar(force);

    spheres.push({ 
        mesh: ball, 
        velocity: direction, 
        gravity: -0.006, 
        box: new THREE.Box3() 
    });
    
    scene.add(ball);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Loop Principal ---
function animate() {
    requestAnimationFrame(animate);

    // Movimento para frente
    camera.position.z -= speed;

    // Atualiza o painel de texto simples de Debug
    const debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.innerHTML = `Progresso Z: ${Math.abs(camera.position.z).toFixed(0)}m | Vidros: ${glasses.length}`;
    }

    // 1. Atualiza Esferas
    for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];
        s.mesh.position.add(s.velocity);
        s.velocity.y += s.gravity; 
        s.box.setFromObject(s.mesh);

        // Colisões
        for (let j = glasses.length - 1; j >= 0; j--) {
            const g = glasses[j];
            if (s.box.intersectsBox(g.box)) {
                shatterGlass(g.mesh.position.x, g.mesh.position.y, g.mesh.position.z, g.width, g.height);
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                glasses.splice(j, 1);

                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
                spheres.splice(i, 1);

                const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
                spawnGlass(lastZ - 40);
                break; 
            }
        }

        if (spheres[i] && (s.mesh.position.z < camera.position.z - 80 || s.mesh.position.y < 0)) {
            scene.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
            spheres.splice(i, 1);
        }
    }

    // 2. Atualiza Cacos de Vidro
    for (let k = shards.length - 1; k >= 0; k--) {
        const shard = shards[k];
        shard.mesh.position.add(shard.velocity);
        shard.velocity.y += shard.gravity; 
        
        shard.mesh.rotation.x += shard.rotationSpeed.x;
        shard.mesh.rotation.y += shard.rotationSpeed.y;
        shard.mesh.rotation.z += shard.rotationSpeed.z;

        shard.life -= 0.02;
        if (shard.life <= 0 || shard.mesh.position.y <= 0) {
            scene.remove(shard.mesh);
            shard.mesh.geometry.dispose();
            shards.splice(k, 1);
        }
    }

    // 3. Limpa Vidros Passados
    for (let j = glasses.length - 1; j >= 0; j--) {
        if (glasses[j].mesh.position.z > camera.position.z + 2) {
            scene.remove(glasses[j].mesh);
            glasses[j].mesh.geometry.dispose();
            glasses.splice(j, 1);

            const lastZ = glasses.length > 0 ? glasses[glasses.length - 1].mesh.position.z : camera.position.z;
            spawnGlass(lastZ - 40);
        }
    }

    // Move a estrutura do chão/grid infinitamente para acompanhar o jogador
    if (camera.position.z < floorGroup.position.z + 300) {
        floorGroup.position.z -= 200;
    }

    renderer.render(scene, camera);
}

animate();
