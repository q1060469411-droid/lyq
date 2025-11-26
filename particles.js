// 3D 粒子互动系统
// 依赖：Three.js、MediaPipe Hands（通过 CDN 在 particles.html 中引入）

(function () {
    const canvasContainer = document.getElementById('particleCanvas');
    const videoElement = document.getElementById('handVideo');
    const statusEl = document.getElementById('particleStatus');
    const gestureStateEl = document.getElementById('gestureState');
    const modelSelect = document.getElementById('modelSelect');
    const colorPicker = document.getElementById('colorPicker');

    if (!canvasContainer || !videoElement) return;

    let renderer, scene, camera;
    let particles;
    let particleMaterial;
    let basePositions = null;
    let spreadFactor = 1.0;
    let targetSpreadFactor = 1.0;
    let swayOffset = 0;

    const particleCount = 2000;

    function initThree() {
        scene = new THREE.Scene();
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight || 500;

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 80;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        canvasContainer.appendChild(renderer.domElement);

        createParticleSystem('heart', colorPicker.value);

        window.addEventListener('resize', onWindowResize);
        animate();
    }

    function onWindowResize() {
        if (!renderer || !camera) return;
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight || 500;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function createParticleSystem(model, color) {
        if (particles) {
            scene.remove(particles);
            particles.geometry.dispose();
            particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        basePositions = new Float32Array(particleCount * 3);

        const generators = {
            heart: generateHeartPoint,
            flower: generateFlowerPoint,
            saturn: generateSaturnPoint,
            fireworks: generateFireworksPoint
        };

        const gen = generators[model] || generators.heart;

        for (let i = 0; i < particleCount; i++) {
            const p = gen();
            basePositions[i * 3] = p.x;
            basePositions[i * 3 + 1] = p.y;
            basePositions[i * 3 + 2] = p.z;

            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        particleMaterial = new THREE.PointsMaterial({
            color: new THREE.Color(color),
            size: 0.7,
            transparent: true,
            opacity: 0.9
        });

        particles = new THREE.Points(geometry, particleMaterial);
        scene.add(particles);
    }

    // 生成爱心形状
    function generateHeartPoint() {
        const t = Math.random() * Math.PI * 2;
        const r = (0.8 + Math.random() * 0.2);
        const x = 16 * Math.pow(Math.sin(t), 3) / 16;
        const y =
            (13 * Math.cos(t) -
                5 * Math.cos(2 * t) -
                2 * Math.cos(3 * t) -
                Math.cos(4 * t)) / 16;
        const jitter = 0.4;
        return {
            x: x * r + (Math.random() - 0.5) * jitter,
            y: y * r + (Math.random() - 0.5) * jitter,
            z: (Math.random() - 0.5) * 4
        };
    }

    // 生成花朵形状（多瓣极坐标）
    function generateFlowerPoint() {
        const petals = 6;
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + 2 * Math.cos(petals * angle);
        const r = radius * (0.4 + Math.random() * 0.6) / 10;
        return {
            x: r * Math.cos(angle) * 10,
            y: r * Math.sin(angle) * 10,
            z: (Math.random() - 0.5) * 6
        };
    }

    // 生成土星形状（中心行星 + 环）
    function generateSaturnPoint() {
        const isRing = Math.random() > 0.3;
        if (isRing) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 4;
            const tilt = 0.35;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            const y = Math.sin(angle) * tilt * 4 + (Math.random() - 0.5) * 0.8;
            return { x, y, z };
        } else {
            const r = 5 * Math.cbrt(Math.random());
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            return { x, y, z };
        }
    }

    // 生成烟花形状（球形爆炸）
    function generateFireworksPoint() {
        const r = 5 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const base = 0.6 + Math.random() * 0.4;
        const x = r * Math.sin(phi) * Math.cos(theta) * base;
        const y = r * Math.sin(phi) * Math.sin(theta) * base;
        const z = r * Math.cos(phi) * base;
        return { x, y, z };
    }

    // 根据 spreadFactor 和轻微左右摆动更新粒子位置
    function updateParticlePositions(deltaTime) {
        if (!particles || !basePositions) return;
        const positions = particles.geometry.attributes.position.array;
        swayOffset += deltaTime * 0.3;
        const sway = Math.sin(swayOffset) * 2.0;

        for (let i = 0; i < particleCount; i++) {
            const bx = basePositions[i * 3];
            const by = basePositions[i * 3 + 1];
            const bz = basePositions[i * 3 + 2];

            positions[i * 3] = bx * spreadFactor + sway * (bz / 20);
            positions[i * 3 + 1] = by * spreadFactor;
            positions[i * 3 + 2] = bz * spreadFactor;
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }

    // 手势 → spreadFactor 的映射
    let lastGestureUpdate = 0;

    function updateSpreadFromHands(results) {
        const now = performance.now();
        if (now - lastGestureUpdate < 40) return;
        lastGestureUpdate = now;

        if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length < 2) {
            gestureStateEl.textContent = '未检测到双手';
            targetSpreadFactor = 1.0;
            return;
        }

        const hand1 = results.multiHandLandmarks[0];
        const hand2 = results.multiHandLandmarks[1];

        const p1 = hand1[8];
        const p2 = hand2[8];

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const minD = 0.05;
        const maxD = 0.45;
        const t = Math.min(1, Math.max(0, (dist - minD) / (maxD - minD)));
        const minSpread = 0.6;
        const maxSpread = 2.0;
        targetSpreadFactor = minSpread + t * (maxSpread - minSpread);

        if (t < 0.2) {
            gestureStateEl.textContent = '双手靠近：粒子收缩中';
        } else if (t > 0.8) {
            gestureStateEl.textContent = '双手张开：粒子扩散中';
        } else {
            gestureStateEl.textContent = '检测到双手：轻轻移动感受粒子律动';
        }
    }

    // MediaPipe Hands 初始化
    function initHands() {
        if (!window.Hands || !window.Camera) {
            statusEl.textContent = 'MediaPipe 加载失败，请检查网络后刷新页面';
            return;
        }

        const hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        hands.onResults((results) => {
            statusEl.textContent = '摄像头已开启，尝试双手张合控制粒子吧～';
            updateSpreadFromHands(results);
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        camera.start().catch(() => {
            statusEl.textContent = '无法访问摄像头，请检查权限设置';
        });
    }

    // 动画循环
    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        if (!renderer || !scene || !camera) return;

        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        const lerpSpeed = 4.0;
        spreadFactor += (targetSpreadFactor - spreadFactor) * Math.min(1, delta * lerpSpeed);

        updateParticlePositions(delta);
        renderer.render(scene, camera);
    }

    // 事件绑定
    function bindUI() {
        modelSelect.addEventListener('change', () => {
            createParticleSystem(modelSelect.value, colorPicker.value);
        });

        colorPicker.addEventListener('input', () => {
            if (particleMaterial) {
                particleMaterial.color.set(colorPicker.value);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initThree();
        bindUI();
        initHands();
    });
})();


