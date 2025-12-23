document.addEventListener('DOMContentLoaded', () => {

    // --- 1. VISUAL EFFECTS (Three.js, Cursor, Floating) ---

    // Custom Cursor
    const cursorDot = document.querySelector('.custom-cursor-dot');
    const cursorOutline = document.querySelector('.custom-cursor-outline');
    
    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', e => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;
            cursorOutline.animate({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`
            }, { duration: 500, fill: "forwards" });
        });
    }

    // Floating Background Elements
    const floatingContainer = document.getElementById('floating-container');
    if (floatingContainer) {
        const elements = ['💖', '🎁', '✨', '🌸', '🎀', '🧸'];
        for (let i = 0; i < 20; i++) {
            const el = document.createElement('div');
            el.className = 'floating-element';
            el.innerText = elements[Math.floor(Math.random() * elements.length)];
            el.style.left = `${Math.random() * 100}vw`;
            el.style.animationDuration = `${Math.random() * 10 + 15}s`;
            el.style.animationDelay = `${Math.random() * 10}s`;
            el.style.fontSize = `${Math.random() * 15 + 15}px`;
            floatingContainer.appendChild(el);
        }
    }

    // Scroll Reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Three.js 3D Gift Box
    const canvasContainer = document.getElementById('hero-3d-canvas');
    if (canvasContainer && typeof THREE !== 'undefined') {
        let scene, camera, renderer, giftBox, pivot;
        let isLidOpening = false;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        canvasContainer.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(5, 10, 7.5);
        scene.add(dirLight);

        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xFDE2E4 }); 
        const ribbonMaterial = new THREE.MeshStandardMaterial({ color: 0xF7A8B8 }); 

        const boxBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), boxMaterial);
        boxBase.position.y = -0.75;

        const hRibbon = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.55, 0.3), ribbonMaterial);
        const vRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.55, 2.55), ribbonMaterial);
        boxBase.add(hRibbon);
        boxBase.add(vRibbon);

        const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 2.6), boxMaterial);
        lidMesh.position.y = 0.25;

        const lidHRibbon = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.55, 0.3), ribbonMaterial);
        const lidVRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 2.65), ribbonMaterial);
        lidMesh.add(lidHRibbon);
        lidMesh.add(lidVRibbon);

        pivot = new THREE.Object3D();
        pivot.add(lidMesh);
        pivot.position.y = 0; 

        giftBox = new THREE.Group();
        giftBox.add(boxBase);
        giftBox.add(pivot);
        scene.add(giftBox);

        function animate3D() {
            requestAnimationFrame(animate3D);
            if (giftBox && !isLidOpening) {
                giftBox.rotation.y += 0.005;
                giftBox.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
            }
            if (isLidOpening && pivot.rotation.z > -Math.PI / 2) {
                pivot.rotation.z -= 0.05;
                pivot.position.x -= 0.03;
                pivot.position.y += 0.01;
            }
            renderer.render(scene, camera);
        }
        animate3D();

        canvasContainer.addEventListener('click', () => { isLidOpening = true; });
        window.addEventListener('resize', () => {
            camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        });
    }


    // --- 2. E-COMMERCE LOGIC ---

    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk6U3tVlnehAHt_pXJz7-HHbgGyzeFwrHOui0PYCVQY3ubNBjGsU1qH8YVtfOTs3wxSv_YqE-qN5Se/pub?output=csv';

    let products = [];
    let cart = JSON.parse(localStorage.getItem('UpharCart')) || [];

    // Elements
    const productListEl = document.getElementById('product-list');
    const cartCountEl = document.getElementById('cart-count');
    const cartTotalEl = document.getElementById('cart-total');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const productModal = document.getElementById('product-detail-modal');
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');

    // Fetch Products
    async function loadProducts() {
        if (!productListEl) return;
        try {
            const res = await fetch(GOOGLE_SHEET_URL);
            const text = await res.text();
            products = parseCSV(text);
            renderProductGrid();
            updateCartUI();
        } catch (err) {
            console.error(err);
            productListEl.innerHTML = `<p class="col-span-full text-center text-red-400">Could not load treasures. Please refresh!</p>`;
        }
    }

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const obj = headers.reduce((acc, header, i) => {
                acc[header] = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
                return acc;
            }, {});
            return {
                id: parseInt(obj.id),
                name: obj.name,
                price: parseFloat(obj.price),
                description: obj.description,
                images: obj.image_urls ? obj.image_urls.split(' ').filter(u => u) : []
            };
        });
    }

    // Render Grid
    function renderProductGrid() {
        if (!productListEl) return;
        productListEl.innerHTML = products.map(p => `
            <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:rotate-6  border border-pink-100 hover:border-black  clickable open-product-modal group" data-id="${p.id}">
                <div class="h-56 overflow-hidden relative">
                    <img src="${p.images[0]}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                </div>
                <div class="p-6">
                    <h3 class="font-bold text-lg text-gray-800">${p.name}</h3>
                    <p class="text-sm text-gray-400 mt-1 truncate">${p.description}</p>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-xl font-bold text-pink-500 font-pacifico">₹${p.price}</span>
                        <button class="bg-pink-100 text-pink-500 hover:bg-pink-500 hover:text-white px-3 py-1 rounded-full text-sm font-bold transition-colors">
                            View
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.clickable').forEach(el => observer.observe(el));
    }

    // Modal Logic
    function openProductModal(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('modal-title').innerText = product.name;
        document.getElementById('modal-price').innerText = `₹${product.price}`;
        document.getElementById('modal-desc').innerText = product.description;
        document.getElementById('modal-custom-note').value = ''; 

        const btn = document.getElementById('modal-add-btn');
        btn.dataset.id = product.id;

        const sliderContainer = document.getElementById('modal-slider-container');
        if (product.images.length > 0) {
            sliderContainer.innerHTML = `<img src="${product.images[0]}" class="w-full h-full object-cover">`;
        }

        productModal.classList.add('active');
    }

    // Cart Actions
    function addToCart(productId, message) {
        const product = products.find(p => p.id === productId);
        const cartItem = {
            ...product,
            uniqueId: Date.now() + Math.random().toString(36),
            message: message || ""
        };
        cart.push(cartItem);
        saveCart();
        productModal.classList.remove('active');
        cartModal.classList.add('active');
    }

    function removeFromCart(uniqueId) {
        cart = cart.filter(item => item.uniqueId !== uniqueId);
        saveCart();
    }

    function updateCartMessage(uniqueId, newMessage) {
        const item = cart.find(i => i.uniqueId === uniqueId);
        if (item) {
            item.message = newMessage;
            saveCart(); // This calls updateCartUI(), which re-renders the list in "View" mode
        }
    }

    function saveCart() {
        localStorage.setItem('UpharCart', JSON.stringify(cart));
        updateCartUI();
    }

    function updateCartUI() {
        if (!cartCountEl || !cartTotalEl || !cartItemsContainer) return;

        cartCountEl.innerText = cart.length;
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartTotalEl.innerText = total.toFixed(2);

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<div class="text-center py-10 opacity-60"><p>Your basket is empty!</p></div>`;
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) checkoutBtn.classList.add('opacity-50', 'pointer-events-none');
        } else {
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) checkoutBtn.classList.remove('opacity-50', 'pointer-events-none');
            
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="gap-4 border-b border-pink-300 pb-4 last:border-0 relative mt-2">
                    <div>
                        <button class="absolute top-0 -right-2 text-gray-400 hover:text-red-500 remove-item-btn w-6 h-6 flex items-center justify-center clickable" data-unique-id="${item.uniqueId}">×</button>
                    </div>
                    
                    <div class="flex gap-3">
                        <img src="${item.images[0]}" class="w-16 h-16 rounded-xl object-cover border border-pink-100">
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <h4 class="font-bold text-gray-800 text-sm w-2/3 leading-tight">${item.name}</h4>
                                <span class="font-bold text-pink-500 text-sm">₹${item.price}</span>
                            </div>
                            
                            <div id="view-mode-${item.uniqueId}" class="mt-2 text-xs flex justify-between items-center group">
                                <p class="text-gray-500 italic truncate pr-2">
                                    ${item.message ? `Note: "${item.message}"` : 'No note added'}
                                </p>
                                <button class="edit-note-btn text-pink-500 underline hover:text-pink-700 text-xs font-bold whitespace-nowrap" 
                                        data-unique-id="${item.uniqueId}">
                                    Edit
                                </button>
                            </div>

                            <div id="edit-mode-${item.uniqueId}" class="hidden flex items-center gap-2 mt-2">
                                <input type="text" 
                                    class="cart-note-input text-xs py-1 px-2 bg-pink-50 rounded-lg w-full focus:outline-none border border-transparent focus:border-pink-300" 
                                    placeholder="Add note..." 
                                    value="${item.message}" 
                                    id="input-${item.uniqueId}">
                                
                                <button class="save-note-btn bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                    data-unique-id="${item.uniqueId}">
                                    Save
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Event Listeners
    document.body.addEventListener('click', (e) => {
        const target = e.target;

        // Open Product Modal
        if (target.closest('.open-product-modal')) {
            const id = parseInt(target.closest('.open-product-modal').dataset.id);
            openProductModal(id);
        }

        // Close Modals
        if (target.classList.contains('close-modal') || target.classList.contains('modal')) {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        }

        // Add to Cart from Modal
        if (target.id === 'modal-add-btn') {
            const id = parseInt(target.dataset.id);
            const msg = document.getElementById('modal-custom-note').value;
            addToCart(id, msg);
        }

        // Remove Item from Cart
        if (target.classList.contains('remove-item-btn')) {
            const uid = target.dataset.uniqueId;
            removeFromCart(uid);
        }

        // --- EDIT BUTTON LOGIC (Switch to Edit Mode) ---
        if (target.classList.contains('edit-note-btn')) {
            const uid = target.dataset.uniqueId;
            const viewMode = document.getElementById(`view-mode-${uid}`);
            const editMode = document.getElementById(`edit-mode-${uid}`);
            
            // Toggle visibility
            if(viewMode && editMode) {
                viewMode.classList.add('hidden');
                editMode.classList.remove('hidden');
            }
        }

        // --- SAVE BUTTON LOGIC (Save & Switch back to View Mode) ---
        if (target.classList.contains('save-note-btn')) {
            const uid = target.dataset.uniqueId;
            const inputField = document.getElementById(`input-${uid}`);
            
            if (inputField) {
                // Update data and refresh UI (which resets to view mode with new text)
                updateCartMessage(uid, inputField.value);
            }
        }

        // Open Cart
        if (target.closest('#cart-icon')) {
            cartModal.classList.add('active');
        }

        // Proceed to Checkout
        if (target.id === 'checkout-btn') {
            cartModal.classList.remove('active');
            checkoutModal.classList.add('active');
        }
    });

    // Checkout Form
    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.submit-btn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');
            
            btn.disabled = true;
            btnText.textContent = "Processing...";
            if (btnLoader) btnLoader.classList.remove('hidden');

            let orderSummary = "--- ORDER SUMMARY ---\n\n";
            cart.forEach((item, index) => {
                orderSummary += `${index + 1}. ${item.name} (₹${item.price})\n   Note: ${item.message || "None"}\n`;
            });
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            orderSummary += `\nTOTAL: ₹${total.toFixed(2)}`;
            
            localStorage.setItem('UpharOrderSummary', orderSummary);
            localStorage.setItem('UpharOrderTotal', total.toFixed(2));
            
            const hiddenOrderInput = document.getElementById('hidden-order-details');
            if(hiddenOrderInput) hiddenOrderInput.value = orderSummary;

            const formData = new FormData(form);
            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    cart = [];
                    saveCart();
                    window.location.href = 'success.html';
                } else {
                    throw new Error('API Error');
                }
            } catch (error) {
                console.error(error);
                alert("Connection error. Please try again.");
                btn.disabled = false;
                btnText.textContent = "Confirm Order ✨";
                if (btnLoader) btnLoader.classList.add('hidden');
            }
        });
    }

    loadProducts();
});