const restaurantId = new URLSearchParams(window.location.search).get('restaurant') || '123';

let currentDish = null;
let scene, camera, renderer;
let xrSession = null;
let hitTestSource = null;
let localRefSpace = null;
let placed = false;
let model3D = null;
let reticle = null;
let cameraStream = null;

async function initApp() {
    await loadMenu();
    setupEventListeners();
}

async function loadMenu() {
    try {
        const response = await fetch(`/api/menu/${restaurantId}`);
        if (!response.ok) throw new Error('Failed to fetch menu');
        const dishes = await response.json();
        renderMenu(dishes);
    } catch (error) {
        console.error('Error loading menu:', error);
        document.getElementById('menuGrid').innerHTML = '<p style="text-align: center; padding: 32px;">Failed to load menu</p>';
    }
}

function renderMenu(dishes) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';

    dishes.forEach(dish => {
        const card = document.createElement('div');
        card.className = 'dish-card';
        card.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}" class="dish-image" onerror="this.src='https://via.placeholder.com/80x80?text=${dish.name}'">
            <div class="dish-info">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-description">${dish.description}</div>
                <div class="dish-price">रु ${dish.price}</div>
            </div>
        `;
        card.addEventListener('click', () => selectDish(dish));
        menuGrid.appendChild(card);
    });
}

function selectDish(dish) {
    currentDish = dish;
    
    document.querySelector('.menu-view').classList.remove('active');
    document.querySelector('.dish-detail').classList.add('active');
    
    document.getElementById('detailImage').src = dish.image;
    document.getElementById('detailImage').onerror = function() {
        this.src = 'https://via.placeholder.com/300x300?text=' + dish.name;
    };
    document.getElementById('detailName').textContent = dish.name;
    document.getElementById('detailDescription').textContent = dish.description;
    document.getElementById('detailPrice').textContent = `रु ${dish.price}`;
    document.getElementById('quantitySlider').value = 1;
    document.getElementById('quantityDisplay').textContent = '1';
}

function setupEventListeners() {
    document.getElementById('quantitySlider').addEventListener('input', (e) => {
        document.getElementById('quantityDisplay').textContent = e.target.value;
    });

    document.getElementById('detailBack').addEventListener('click', () => {
        document.querySelector('.dish-detail').classList.remove('active');
        document.querySelector('.menu-view').classList.add('active');
    });

    document.getElementById('viewARButton').addEventListener('click', () => {
        initARView();
    });

    document.getElementById('closeARButton').addEventListener('click', () => {
        closeARView();
    });

    document.getElementById('arPlaceBtn').addEventListener('click', () => {
        placeModel();
    });
}

async function initARView() {
    if (!currentDish) return;

    document.querySelector('.dish-detail').classList.remove('active');
    document.getElementById('arView').classList.add('active');
    document.getElementById('arPlaceBtn').style.display = 'none';
    document.getElementById('arInstructions').textContent = 'Starting AR...';
    placed = false;

    const quantity = parseInt(document.getElementById('quantitySlider').value);
    document.getElementById('arDishName').textContent = currentDish.name;
    document.getElementById('arQuantity').textContent = `Qty: ${quantity}`;

    const canvas = document.getElementById('arCanvas');

    if (navigator.xr) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) {
                await startWebXRSession(canvas, quantity);
                return;
            }
        } catch (e) {
            console.warn('WebXR check failed:', e);
        }
    }

    await startCameraFallback(canvas, quantity);
}

async function startWebXRSession(canvas, quantity) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.xr.enabled = true;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0, 5, 3);
    scene.add(dir);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    scene.add(hemi);

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 })
    );
    reticle.visible = false;
    scene.add(reticle);

    model3D = await loadGLTFModel(currentDish.model, quantity);
    if (model3D) {
        model3D.visible = false;
        scene.add(model3D);
    }

    xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation'],
        domOverlay: { root: document.getElementById('arOverlay') }
    });

    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(xrSession);

    document.getElementById('arInstructions').textContent = 'Move phone to detect surface';
    document.getElementById('arPlaceBtn').style.display = 'none';

    localRefSpace = await xrSession.requestReferenceSpace('local');
    const viewerSpace = await xrSession.requestReferenceSpace('viewer');

    hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    xrSession.addEventListener('select', onSelect);
    xrSession.addEventListener('end', onSessionEnd);

    renderer.setAnimationLoop(onXRFrame);
}

function onXRFrame(timestamp, frame) {
    if (!frame || !hitTestSource || placed) {
        renderer.render(scene, camera);
        return;
    }

    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(localRefSpace);
        if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
            reticle.matrix.decompose(reticle.position, reticle.quaternion, reticle.scale);

            if (!placed) {
                document.getElementById('arInstructions').textContent = 'Tap screen or press button to place';
                document.getElementById('arPlaceBtn').style.display = 'block';
            }
        }
    } else {
        reticle.visible = false;
        if (!placed) {
            document.getElementById('arInstructions').textContent = 'Move phone to detect surface';
            document.getElementById('arPlaceBtn').style.display = 'none';
        }
    }

    renderer.render(scene, camera);
}

function onSelect() {
    placeModel();
}

function placeModel() {
    if (placed || !reticle || !reticle.visible || !model3D) return;

    model3D.position.copy(reticle.position);
    model3D.quaternion.copy(reticle.quaternion);
    model3D.visible = true;
    placed = true;
    reticle.visible = false;

    document.getElementById('arInstructions').textContent = 'Placed! Drag to reposition';
    document.getElementById('arPlaceBtn').style.display = 'none';

    enableTouchDrag(model3D);
}

function enableTouchDrag(obj) {
    const canvas = document.getElementById('arCanvas');
    let dragging = false;
    let prevX = 0, prevY = 0;

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const intersection = new THREE.Vector3();

    canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
        prevX = e.clientX;
        prevY = e.clientY;

        const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        plane.setFromNormalAndCoplanarPoint(camDir, obj.position);
        raycaster.ray.intersectPlane(plane, intersection);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        plane.setFromNormalAndCoplanarPoint(camDir, obj.position);
        if (raycaster.ray.intersectPlane(plane, intersection)) {
            obj.position.copy(intersection);
        }
    });

    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
}

function onSessionEnd() {
    hitTestSource = null;
    xrSession = null;
}

async function startCameraFallback(canvas, quantity) {
    const instructions = document.getElementById('arInstructions');
    const placeBtn = document.getElementById('arPlaceBtn');
    instructions.textContent = 'Camera mode - no AR surface detection';

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const video = document.getElementById('arCameraFeed');
        video.srcObject = cameraStream;
        video.classList.add('active');
    } catch (e) {
        console.warn('Camera access denied:', e);
        instructions.textContent = 'Camera not available';
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 0.8, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 3);
    scene.add(dir);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    scene.add(hemi);

    const groundGeo = new THREE.PlaneGeometry(10, 10);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    model3D = await loadGLTFModel(currentDish.model, quantity);
    if (model3D) {
        model3D.position.set(0, 0.8, 0);
        model3D.castShadow = true;
        scene.add(model3D);
    }

    const tableGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.03, 32);
    const tableMat = new THREE.MeshPhongMaterial({ color: 0x8B6914 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.78, 0);
    table.receiveShadow = true;
    scene.add(table);

    document.getElementById('arPlaceBtn').style.display = 'none';
    instructions.textContent = 'Drag to move, pinch to scale';

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.8, 0);
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 1;
    controls.maxDistance = 8;
    controls.update();

    function animate() {
        renderer.setAnimationLoop(null);
        requestAnimationFrame(animate);
        controls.update();
        if (model3D) {
            model3D.rotation.y += 0.003;
        }
        renderer.render(scene, camera);
    }
    animate();
}

async function loadGLTFModel(modelPath, quantity) {
    if (!modelPath) return null;

    return new Promise((resolve) => {
        const loader = new THREE.GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => {
                const model = gltf.scene;
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetSize = 0.25;
                const scale = targetSize / maxDim;
                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.envMapIntensity = 1.0;
                        }
                    }
                });

                resolve(model);
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                resolve(createFallbackModel(quantity));
            }
        );
    });
}

function createFallbackModel(quantity) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.15, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(currentDish.color || '#D4A574'),
        shininess: 80
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.y = 0.15;
    group.add(sphere);

    const canvas2D = document.createElement('canvas');
    const ctx = canvas2D.getContext('2d');
    canvas2D.width = 256;
    canvas2D.height = 128;
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(currentDish.name, 128, 40);
    ctx.font = '28px Arial';
    ctx.fillText(`× ${quantity}`, 128, 90);

    const texture = new THREE.CanvasTexture(canvas2D);
    const labelGeo = new THREE.PlaneGeometry(0.4, 0.2);
    const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.35, 0.16);
    group.add(label);

    return group;
}

function closeARView() {
    if (xrSession) {
        xrSession.end().catch(() => {});
    }
    if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        renderer = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        const video = document.getElementById('arCameraFeed');
        video.srcObject = null;
        video.classList.remove('active');
    }
    scene = null;
    camera = null;
    model3D = null;
    reticle = null;
    hitTestSource = null;
    localRefSpace = null;
    xrSession = null;
    placed = false;

    document.getElementById('arView').classList.remove('active');
    document.querySelector('.dish-detail').classList.add('active');
}

initApp();
