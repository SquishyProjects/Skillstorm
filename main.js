import * as THREE from 'three';

// --- Configuração do Cenário ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a18);
scene.fog = new THREE.FogExp2(0x0a0a18, 0.015);

// --- Câmera e Renderizador ---
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Iluminação Forte para Teste ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
scene.add(ambientLight);

// --- Variáveis de Controle ---
let ballCount = 25;
const speed = 0.1; 
const spheres = []; 
const glasses = []; 

// --- Túnel ---
const tunnelGeometry = new THREE.BoxGeometry(20, 10, 1000); // Túnel maior
tunnelGeometry.scale(-1, 1, 1); 
const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: 0x444466,
    wireframe: true
});
const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
tunnel.position.set(0, 5, -500); // Centralizado verticalmente e estendido para a frente
scene.add(tunnel);

camera.position.set(0, 2, 0);

// --- Material do Vidro Totalmente Opaco para Teste Visual ---
const glassMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000, // Vermelho sólido para ser impossível não ver
    side: THREE.DoubleSide
});

function spawnGlass(zPos) {
    const width = 6;  
    const height = 6; 
    const depth = 0.5;                    

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);

    // Coloca exatamente no centro do túnel para bloquear a câmera
    glassMesh.position.set(0, 3, zPos);
    scene.add(glassMesh);

    const boundingBox = new THREE.Box3();
    boundingBox.setFromCenterAndSize(
        new THREE.Vector3(0, 3, zPos),
        new THREE.Vector3(width, height, depth)
    );

    glasses.push({
        mesh: glassMesh,
        box: boundingBox
    });
}

// Criando barreiras vermelhas gigantes logo na largada!
spawnGlass(-15);
spawnGlass(-40);
spawnGlass(-65);
spawnGlass(-90);

// --- Sistema de Tiro ---
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

    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16), 
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    ball.position.copy(camera.position).z -= 0.5;

    const direction = new THREE.Vector3();
    raycaster.ray.direction.normalize();
    direction.copy(raycaster.ray.direction).multiplyScalar(0.5);

    spheres.push({
        mesh: ball,
        velocity: direction,
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

// --- Loop Principal ---
function animate() {
    requestAnimationFrame(animate);

    // Avança a câmera
    camera.position.z -= speed;

    // Atualiza as esferas e checa colisões
    for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];
        s.mesh.position.add(s.velocity);
        s.box.setFromObject(s.mesh);

        for (let j = glasses.length - 1; j >= 0; j--) {
            if (s.box.intersectsBox(glasses[j].box)) {
                // Remove o vidro atingido
                scene.remove(glasses[j].mesh);
                glasses.splice(j, 1);

                // Remove a bola
                scene.remove(s.mesh);
                spheres.splice(i, 1);
                break; 
            }
        }
    }

    renderer.render(scene, camera);
}

animate();
