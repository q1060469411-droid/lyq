// 3D 粒子互动系统
// 依赖：Three.js（通过 CDN 在 particles.html 中引入）

(function () {
    const canvasContainer = document.getElementById('particleCanvas');
    const statusEl = document.getElementById('particleStatus');
    const gestureStateEl = document.getElementById('gestureState');
    const modelSelect = document.getElementById('modelSelect');
    const colorPicker = document.getElementById('colorPicker');

    if (!canvasContainer) return;

    let renderer, scene, camera;
    let particles;
    let particleMaterial;
    let basePositions = null;
    let spreadFactor = 1.0;
    let targetSpreadFactor = 1.0;
    let manualSway = 0; // 由拖拽控制的轻微摆动

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
        // 拖拽产生的轻微左右偏移，随时间慢慢衰减
        const sway = manualSway;

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

        // 手指拖动产生的摆动缓慢衰减
        manualSway += (0 - manualSway) * Math.min(1, delta * 1.5);

        updateParticlePositions(delta);
        renderer.render(scene, camera);
    }

    // 事件绑定（UI + 鼠标 / 触摸交互）
    function bindUI() {
        modelSelect.addEventListener('change', () => {
            createParticleSystem(modelSelect.value, colorPicker.value);
        });

        colorPicker.addEventListener('input', () => {
            if (particleMaterial) {
                particleMaterial.color.set(colorPicker.value);
            }
        });

        // 交互：单击收缩、双击扩散、拖动轻轻摆动
        const canvasEl = renderer ? renderer.domElement : canvasContainer;
        if (!canvasEl) return;

        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let lastX = 0;
        let lastClickTime = 0;
        let clickTimer = null;

        function handlePointerDown(e) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            lastX = e.clientX;
            canvasEl.setPointerCapture && canvasEl.setPointerCapture(e.pointerId);
        }

        function handlePointerMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - lastX;
            lastX = e.clientX;
            manualSway += dx * 0.05;
            manualSway = Math.max(-4, Math.min(4, manualSway));
            gestureStateEl.textContent = '拖动中：粒子轻轻摆动';
        }

        function handlePointerUp(e) {
            if (!isDragging) return;
            isDragging = false;
            canvasEl.releasePointerCapture && canvasEl.releasePointerCapture(e.pointerId);

            const moveDx = e.clientX - dragStartX;
            const moveDy = e.clientY - dragStartY;
            const moved = Math.hypot(moveDx, moveDy);

            // 认为移动很小才算点击
            if (moved < 5) {
                const now = performance.now();
                if (now - lastClickTime < 260) {
                    // 双击
                    clearTimeout(clickTimer);
                    lastClickTime = 0;
                    onDoubleClick();
                } else {
                    lastClickTime = now;
                    clickTimer = setTimeout(() => {
                        onSingleClick();
                    }, 260);
                }
            }
        }

        function handlePointerLeave() {
            isDragging = false;
        }

        function onSingleClick() {
            // 收缩集中
            targetSpreadFactor = 0.6;
            gestureStateEl.textContent = '单击：粒子收缩集中';
        }

        function onDoubleClick() {
            // 向外扩散
            targetSpreadFactor = 2.0;
            gestureStateEl.textContent = '双击：粒子向外扩散';
        }

        canvasEl.addEventListener('pointerdown', handlePointerDown);
        canvasEl.addEventListener('pointermove', handlePointerMove);
        canvasEl.addEventListener('pointerup', handlePointerUp);
        canvasEl.addEventListener('pointercancel', handlePointerLeave);
        canvasEl.addEventListener('pointerleave', handlePointerLeave);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initThree();
        bindUI();
    });
})();



