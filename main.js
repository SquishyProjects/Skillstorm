import * as THREE from 'three';

console.log("=== INICIANDO DEBUG DO SMASH HIT ===");

// --- Configuração do Cenário ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a18);
scene.fog = new THREE.FogExp2(0x0a0a18, 0.015);
console.log("1. Cena e Fog criados com sucesso.");

// --- Câmera e Renderizador ---
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
console.log("2. Renderizador acoplado ao DOM.");

// --- Iluminação ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
scene.add(ambientLight);

// --- Variáveis de Controle ---
let ballCount = 25;
const speed = 0.05; // Velocidade reduzida para debug para você conseguir ler os dados com calma
const spheres = []; 
const glasses = []; 

// --- Túnel ---
const tunnelGeometry = new THREE.BoxGeometry(20, 10, 1000);
tunnelGeometry.scale(-1, 1, 1); 
const tunnelMaterial = new THREE.MeshStandardMaterial({ color: 0x444466, wireframe: true });
const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
tunnel.position.set(0, 5, -500);
scene.add(tunnel);
console.log("3. Túnel instanciado na posição:", tunnel.position);

camera.position.set(0, 2, 0);

// --- Material do Vidro (Vermelho Sólido) ---
const glassMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });

function spawnGlass(zPos, id) {
    console.log(`[SPAWN] Tentando criar vidro #${id} em Z: ${zPos}`);
    
    const width = 4;  
    const height = 4; 
    const depth = 0.5;                    

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);

    // Posiciona fixo no meio do túnel
    glassMesh.position.set(0, 3, zPos);
    scene.add(glassMesh);

    // DEBUG VISUAL: Adiciona uma caixa de arame amarela brilhante ao redor do vidro
    const helper = new THREE.BoxHelper(glassMesh, 0xffff00);
    scene.add(helper);

    const boundingBox = new THREE.Box3();
    boundingBox.setFromCenterAndSize(
        new THREE.Vector3(0, 3, zPos),
        new THREE.Vector3(width, height, depth)
    );

    glasses.push({
        id: id,
        mesh: glassMesh,
        helper: helper,
        box: boundingBox
    });
    
    console.log(`[SPAWN] Vidro #${id} adicionado à lista. Posição real na cena:`, glassMesh.position);
}

// Criando 3 barreiras de teste com IDs para rastreamento
spawnGlass(-10, 1);
spawnGlass(-25, 2);
spawnGlass(-40, 3);

console.log("4. Lista inicial de vidros gerada. Tamanho do array:", glasses.length);

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
    raycaster.ray.direction.normalize().multiplyScalar(0.4);
    direction.copy(raycaster.ray.direction);

    spheres.push({ mesh: ball, velocity: direction, box: new THREE.Box3() });
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

    // Avança a câmera lentamente para o Z negativo
    camera.position.z -= speed;

    // Atualiza o painel de debug na tela
    const debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.innerHTML = `
            <b>=== DEBUG INFO ===</b><br>
            Cam Z: ${camera.position.z.toFixed(2)}<br>
            Vidros ativos: ${glasses.length}<br>
            ${glasses.map(g => `• V${g.id} Z: ${g.mesh.position.z}`).join('<br>')}
        `;
    }

    // Atualiza as esferas e checa colisões
    for (let i = spheres.length - 1; i >= 0; i--) {
        const s = spheres[i];
        s.mesh.position.add(s.velocity);
        s.box.setFromObject(s.mesh);

        for (let j = glasses.length - 1; j >= 0; j--) {
            if (s.box.intersectsBox(glasses[j].box)) {
                console.log(`[COLISÃO] Bola atingiu o Vidro #${glasses[j].id}`);
                scene.remove(glasses[j].mesh);
                scene.remove(glasses[j].helper); // Remove o aramado de debug
                glasses.splice(j, 1);

                scene.remove(s.mesh);
                spheres.splice(i, 1);
                break; 
            }
        }
    }

    renderer.render(scene, camera);
}

animate();
