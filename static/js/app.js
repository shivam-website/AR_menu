// ═══════════════════════════════════════
// NAMASTE KITCHEN - AR MENU
// Premium Edition
// ═══════════════════════════════════════

const restaurantId = new URLSearchParams(window.location.search).get('restaurant') || '123';

// State
let currentDish = null;
let currentQty = 1;
let cart = [];
let scene, camera, renderer;
let xrSession = null;
let hitTestSource = null;
let localRefSpace = null;
let placed = false;
let model3D = null;
let reticle = null;
let cameraStream = null;
let wasSurfaceFound = false;

// ═══════════════════════════════════════
// SPLASH & INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('splash').classList.add('hide');
        document.getElementById('app').classList.add('visible');
    }, 2200);

    initApp();
});

async function initApp() {
    await loadMenu();
    setupNav();
    setupDetail();
    setupCart();
    setupAR();
    setupExplore();
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function setupNav() {
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    });

    document.getElementById('cartToggle').addEventListener('click', openCart);
}

// ═══════════════════════════════════════
// EXPLORE BUTTON
// ═══════════════════════════════════════
function setupExplore() {
    document.getElementById('exploreBtn').addEventListener('click', () => {
        document.getElementById('menuSection').scrollIntoView({ behavior: 'smooth' });
    });
}

// ═══════════════════════════════════════
// MENU
// ═══════════════════════════════════════
async function loadMenu() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = Array(3).fill('<div class="dish-card"><div class="skeleton" style="width:80px;height:80px;flex-shrink:0"></div><div class="dish-info" style="flex:1"><div class="skeleton" style="height:16px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:80%;margin-bottom:8px"></div><div class="skeleton" style="height:14px;width:30%"></div></div></div>').join('');

    try {
        const response = await fetch(`/api/menu/${restaurantId}`);
        if (!response.ok) throw new Error('Failed to fetch menu');
        const dishes = await response.json();
        renderMenu(dishes);
    } catch (error) {
        console.error('Error loading menu:', error);
        grid.innerHTML = '<p style="text-align:center;padding:3rem;color:var(--cream-dim)">Failed to load menu</p>';
    }
}

function renderMenu(dishes) {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';

    dishes.forEach((dish, i) => {
        const card = document.createElement('div');
        card.className = 'dish-card';
        card.innerHTML = `
            <img class="dish-thumb" src="${dish.image}" alt="${dish.name}"
                 onerror="this.style.background='var(--black-card)';this.alt='${dish.name}'">
            <div class="dish-info">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-desc">${dish.description}</div>
                <div class="dish-bottom">
                    <div class="dish-price">रु ${dish.price}</div>
                    <div class="dish-ar-tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 1h6v6H1z"/><path d="M17 1h6v6h-6z"/><path d="M1 17h6v6H1z"/>
                        </svg>
                        AR
                    </div>
                </div>
            </div>
        `;
        card.addEventListener('click', () => openDetail(dish));
        grid.appendChild(card);

        setTimeout(() => card.classList.add('visible'), 100 + i * 120);
    });
}

// ═══════════════════════════════════════
// DISH DETAIL
// ═══════════════════════════════════════
function setupDetail() {
    document.getElementById('detailClose').addEventListener('click', closeDetail);
    document.getElementById('detailBackdrop').addEventListener('click', closeDetail);

    document.getElementById('qtyMinus').addEventListener('click', () => {
        if (currentQty > 1) {
            currentQty--;
            document.getElementById('qtyValue').textContent = currentQty;
            updateDetailPrice();
        }
    });

    document.getElementById('qtyPlus').addEventListener('click', () => {
        if (currentQty < 20) {
            currentQty++;
            document.getElementById('qtyValue').textContent = currentQty;
            updateDetailPrice();
        }
    });

    document.getElementById('viewARBtn').addEventListener('click', () => {
        closeDetail();
        setTimeout(() => initARView(), 400);
    });

    document.getElementById('addCartBtn').addEventListener('click', () => {
        addToCart(currentDish, currentQty);
        closeDetail();
    });
}

function openDetail(dish) {
    currentDish = dish;
    currentQty = 1;

    document.getElementById('detailImage').src = dish.image;
    document.getElementById('detailImage').onerror = function() {
        this.style.background = 'var(--black-card)';
    };
    document.getElementById('detailCategory').textContent = 'Signature Dish';
    document.getElementById('detailName').textContent = dish.name;
    document.getElementById('detailDesc').textContent = dish.description;
    document.getElementById('detailPrice').textContent = `रु ${dish.price}`;
    document.getElementById('qtyValue').textContent = '1';
    document.getElementById('btnPrice').textContent = `रु ${dish.price}`;

    document.getElementById('detailView').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    document.getElementById('detailView').classList.remove('active');
    document.body.style.overflow = '';
}

function updateDetailPrice() {
    if (currentDish) {
        document.getElementById('btnPrice').textContent = `रु ${currentDish.price * currentQty}`;
    }
}

// ═══════════════════════════════════════
// CART
// ═══════════════════════════════════════
function setupCart() {
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartBackdrop').addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    document.getElementById('confirmOk').addEventListener('click', () => {
        document.getElementById('orderConfirm').classList.remove('active');
    });
}

function addToCart(dish, qty) {
    const existing = cart.find(c => c.id === dish.id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ ...dish, qty });
    }
    updateCartUI();
    showToast(`Added <span class="toast-gold">${dish.name}</span> × ${qty} to order`);
}

function removeFromCart(dishId) {
    cart = cart.filter(c => c.id !== dishId);
    updateCartUI();
}

function updateCartUI() {
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

    const countEl = document.getElementById('cartCount');
    countEl.textContent = count;
    countEl.classList.toggle('visible', count > 0);

    const itemsEl = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footerEl = document.getElementById('cartFooter');

    if (cart.length === 0) {
        emptyEl.style.display = '';
        footerEl.style.display = 'none';
        itemsEl.innerHTML = '';
        itemsEl.appendChild(emptyEl);
        return;
    }

    emptyEl.style.display = 'none';
    footerEl.style.display = '';

    itemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img class="cart-item-img" src="${item.image}" alt="${item.name}"
                 onerror="this.style.background='var(--black-card)'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">Qty: ${item.qty} × रु ${item.price}</div>
            </div>
            <div class="cart-item-price">रु ${item.price * item.qty}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');

    document.getElementById('totalAmount').textContent = `रु ${total}`;
}

function openCart() {
    updateCartUI();
    document.getElementById('cartDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartDrawer').classList.remove('active');
    document.body.style.overflow = '';
}

async function checkout() {
    if (cart.length === 0) return;

    try {
        await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurant_id: parseInt(restaurantId), items: cart })
        });
    } catch (e) { /* proceed anyway for demo */ }

    cart = [];
    updateCartUI();
    closeCart();
    document.getElementById('orderConfirm').classList.add('active');
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function showToast(html) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = html;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

// ═══════════════════════════════════════
// AR VIEW
// ═══════════════════════════════════════
function setupAR() {
    document.getElementById('closeARButton').addEventListener('click', closeARView);
    document.getElementById('arPlaceBtn').addEventListener('click', placeModel);
}

async function initARView() {
    if (!currentDish) return;

    document.getElementById('arView').classList.add('active');
    document.getElementById('arPlaceBtn').style.display = 'none';
    document.getElementById('arInstructions').textContent = 'Initializing AR...';
    placed = false;

    document.getElementById('arDishName').textContent = currentDish.name;
    document.getElementById('arQuantity').textContent = `Qty: ${currentQty}`;

    const canvas = document.getElementById('arCanvas');

    if (navigator.xr) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) {
                await startWebXRSession(canvas);
                return;
            }
        } catch (e) {
            console.warn('WebXR check failed:', e);
        }
    }

    await startCameraFallback(canvas);
}

async function startWebXRSession(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.xr.enabled = true;
    if (renderer.xr.setFoveation) renderer.xr.setFoveation(0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0, 5, 3);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.5));

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.08, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xc9a96e, transparent: true, opacity: 0.9 })
    );
    reticle.visible = false;
    scene.add(reticle);

    xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('arOverlay') }
    });

    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(xrSession);

    document.getElementById('arInstructions').textContent = 'Move phone to detect surface';

    localRefSpace = await xrSession.requestReferenceSpace('local');
    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    xrSession.addEventListener('select', () => placeModel());
    xrSession.addEventListener('end', () => { hitTestSource = null; xrSession = null; });

    loadGLTFModel(currentDish.model).then(model => {
        model3D = model;
        if (model3D) {
            model3D.visible = false;
            scene.add(model3D);
        }
    });

    renderer.setAnimationLoop(onXRFrame);
}

let lastUIUpdate = 0;

function onXRFrame(timestamp, frame) {
    if (!frame || !hitTestSource || placed) {
        renderer.render(scene, camera);
        return;
    }

    const results = frame.getHitTestResults(hitTestSource);
    const found = results.length > 0;

    if (found) {
        const pose = results[0].getPose(localRefSpace);
        if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
            reticle.matrix.decompose(reticle.position, reticle.quaternion, reticle.scale);
            reticle.material.opacity = 0.6 + 0.3 * Math.sin(timestamp * 0.004);
        }
    } else {
        reticle.visible = false;
    }

    if (found !== wasSurfaceFound && !placed) {
        wasSurfaceFound = found;
        document.getElementById('arInstructions').textContent = found
            ? 'Tap to place on surface' : 'Move phone to detect surface';
        document.getElementById('arPlaceBtn').style.display = found ? 'block' : 'none';
    }

    renderer.render(scene, camera);
}

function placeModel() {
    if (placed || !reticle || !reticle.visible || !model3D) return;

    model3D.position.copy(reticle.position);
    model3D.quaternion.copy(reticle.quaternion);
    model3D.visible = true;
    placed = true;
    reticle.visible = false;

    document.getElementById('arInstructions').textContent = 'Drag to reposition';
    document.getElementById('arPlaceBtn').style.display = 'none';

    enableTouchDrag(model3D);
}

function enableTouchDrag(obj) {
    const canvas = document.getElementById('arCanvas');
    let dragging = false;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const intersection = new THREE.Vector3();

    canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
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

    canvas.addEventListener('pointerup', () => dragging = false);
    canvas.addEventListener('pointercancel', () => dragging = false);
}

async function startCameraFallback(canvas) {
    document.getElementById('arInstructions').textContent = 'Camera mode';

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const video = document.getElementById('arCameraFeed');
        video.srcObject = cameraStream;
        video.classList.add('active');
    } catch (e) {
        console.warn('Camera access denied:', e);
        document.getElementById('arInstructions').textContent = 'Camera not available';
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 0.8, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 3);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.5));

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const table = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.03, 32),
        new THREE.MeshPhongMaterial({ color: 0x2a1f14, shininess: 60 })
    );
    table.position.set(0, 0.78, 0);
    table.receiveShadow = true;
    scene.add(table);

    model3D = await loadGLTFModel(currentDish.model);
    if (model3D) {
        model3D.position.set(0, 0.82, 0);
        model3D.castShadow = true;
        scene.add(model3D);
    }

    document.getElementById('arPlaceBtn').style.display = 'none';
    document.getElementById('arInstructions').textContent = 'Drag to rotate, pinch to zoom';

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.85, 0);
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 1.2;
    controls.maxDistance = 6;
    controls.update();

    (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        if (model3D) model3D.rotation.y += 0.004;
        renderer.render(scene, camera);
    })();
}

async function loadGLTFModel(modelPath) {
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
                const scale = 0.25 / maxDim;
                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                resolve(model);
            },
            undefined,
            () => resolve(null)
        );
    });
}

function closeARView() {
    if (xrSession) xrSession.end().catch(() => {});
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
}
