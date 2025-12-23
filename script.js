document.addEventListener('DOMContentLoaded', () => {

    // --- 1. VISUAL EFFECTS ---

    // Custom Cursor (Desktop Only)
    const cursorDot = document.querySelector('.custom-cursor-dot');
    const cursorOutline = document.querySelector('.custom-cursor-outline');
    
    if (cursorDot && cursorOutline && window.matchMedia("(min-width: 768px)").matches) {
        window.addEventListener('mousemove', e => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;
            cursorOutline.animate({ left: `${e.clientX}px`, top: `${e.clientY}px` }, { duration: 500, fill: "forwards" });
        });
    }

    // Floating Background Elements
    const floatingContainer = document.getElementById('floating-container');
    if (floatingContainer) {
        const elements = ['💖', '🎁', '✨', '🌸', '🎀', '🧸', '🍬', '🦄'];
        const count = window.innerWidth < 768 ? 12 : 25;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'floating-element';
            el.innerText = elements[Math.floor(Math.random() * elements.length)];
            el.style.left = `${Math.random() * 100}vw`;
            el.style.animationDuration = `${Math.random() * 15 + 15}s`;
            el.style.animationDelay = `${Math.random() * 10}s`;
            el.style.fontSize = `${Math.random() * 20 + 10}px`;
            el.style.opacity = Math.random() * 0.4 + 0.1;
            floatingContainer.appendChild(el);
        }
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


    // --- 2. E-COMMERCE LOGIC ---

    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk6U3tVlnehAHt_pXJz7-HHbgGyzeFwrHOui0PYCVQY3ubNBjGsU1qH8YVtfOTs3wxSv_YqE-qN5Se/pub?output=csv';

    let products = [];
    let cart = JSON.parse(localStorage.getItem('TreviaCart')) || [];

    // Elements
    const productListEl = document.getElementById('product-list');
    const cartCountEl = document.getElementById('cart-count');
    const cartTotalEl = document.getElementById('cart-total');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const productModal = document.getElementById('product-detail-modal');
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    
    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

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
            productListEl.innerHTML = `<p class="col-span-full text-center text-red-500 font-bold">Could not load treasures. Please refresh! 🦄</p>`;
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
            <div class="glass-card flex flex-col h-full overflow-hidden relative group clickable open-product-modal cursor-pointer" data-id="${p.id}">
                <div class="h-48 md:h-60 overflow-hidden relative m-2 md:m-3 rounded-[1.2rem] shadow-inner bg-white">
                    <img src="${p.images[0]}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                    <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span class="bg-white text-pink-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm transform translate-y-4 group-hover:translate-y-0 transition-transform">Quick View</span>
                    </div>
                </div>
                <div class="px-4 pb-4 flex-grow flex flex-col">
                    <h3 class="font-bold text-base md:text-lg text-gray-800 leading-tight mb-1 font-chunky line-clamp-1">${p.name}</h3>
                    <p class="text-xs md:text-sm text-gray-600 line-clamp-2 mb-3 font-medium">${p.description}</p>
                    <div class="mt-auto flex justify-between items-center">
                        <span class="text-lg md:text-xl font-bold text-pink-500 font-pacifico">₹${p.price}</span>
                        <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                            <i class="fa-solid fa-plus text-xs"></i>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.clickable').forEach(el => observer.observe(el));
    }

    // Modal Logic (With Slider)
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
            // Generate Slides
            const slidesHtml = product.images.map(img => `
                <div class="slide w-full h-full flex-shrink-0 snap-center relative">
                    <img src="${img}" class="w-full h-full object-cover cursor-zoom-in lightbox-trigger" data-src="${img}">
                    <div class="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-gray-600 pointer-events-none shadow-sm">
                        <i class="fa-solid fa-magnifying-glass-plus mr-1"></i> Zoom
                    </div>
                </div>
            `).join('');

            // Generate Indicators if multiple images
            let navHtml = '';
            if (product.images.length > 1) {
                navHtml = `
                    <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        ${product.images.map((_, i) => `<div class="w-2 h-2 rounded-full bg-white/50 border border-white"></div>`).join('')}
                    </div>
                    <button class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center text-gray-700 shadow-sm clickable" onclick="document.querySelector('.slider-snap').scrollBy({left: -200, behavior: 'smooth'})">‹</button>
                    <button class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center text-gray-700 shadow-sm clickable" onclick="document.querySelector('.slider-snap').scrollBy({left: 200, behavior: 'smooth'})">›</button>
                `;
            }

            sliderContainer.innerHTML = `
                <div class="slider-snap w-full h-full flex overflow-x-auto snap-x snap-mandatory relative scroll-smooth">
                    ${slidesHtml}
                </div>
                ${navHtml}
            `;
        }

        productModal.classList.add('active');
    }

    // Cart Actions
    function addToCart(productId, message) {
        const product = products.find(p => p.id === productId);
        const cartItem = { ...product, uniqueId: Date.now() + Math.random().toString(36), message: message || "" };
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
        if (item) { item.message = newMessage; saveCart(); }
    }

    function saveCart() {
        localStorage.setItem('TreviaCart', JSON.stringify(cart));
        updateCartUI();
    }

    function updateCartUI() {
        if (!cartCountEl || !cartTotalEl || !cartItemsContainer) return;
        cartCountEl.innerText = cart.length;
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartTotalEl.innerText = total.toFixed(2);

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<div class="text-center py-10 opacity-60 flex flex-col items-center"><i class="fa-solid fa-basket-shopping text-4xl mb-3 text-pink-300"></i><p class="font-bold text-gray-400">Basket is empty!</p></div>`;
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) checkoutBtn.classList.add('opacity-50', 'pointer-events-none');
        } else {
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) checkoutBtn.classList.remove('opacity-50', 'pointer-events-none');
            
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 relative group">
                    <button class="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-md flex items-center justify-center clickable transition-all remove-item-btn z-10" data-unique-id="${item.uniqueId}"><i class="fa-solid fa-times text-xs pointer-events-none"></i></button>
                    <div class="flex gap-3">
                        <img src="${item.images[0]}" class="w-16 h-16 rounded-xl object-cover border border-pink-50 shrink-0">
                        <div class="flex-1 flex flex-col justify-center min-w-0">
                            <h4 class="font-bold text-gray-800 text-sm leading-tight mb-1 font-chunky truncate">${item.name}</h4>
                            <span class="font-bold text-pink-500 text-sm">₹${item.price}</span>
                            <div id="view-mode-${item.uniqueId}" class="mt-2 text-xs flex justify-between items-center bg-gray-50 rounded-lg p-1.5 border border-gray-100">
                                <p class="text-gray-600 italic truncate pr-2 w-full font-medium">${item.message ? `<i class="fa-solid fa-pen-nib text-pink-300 mr-1"></i>${item.message}` : 'Add note...'}</p>
                                <button class="edit-note-btn text-pink-400 hover:text-pink-600 px-2 font-bold whitespace-nowrap" data-unique-id="${item.uniqueId}">Edit</button>
                            </div>
                            <div id="edit-mode-${item.uniqueId}" class="hidden flex items-center gap-1 mt-2">
                                <input type="text" class="cart-note-input text-xs py-1.5 px-2 bg-white rounded-lg w-full focus:outline-none border-2 border-pink-100 focus:border-pink-300 text-gray-700 font-bold" placeholder="Note..." value="${item.message}" id="input-${item.uniqueId}">
                                <button class="save-note-btn bg-pink-500 hover:bg-pink-600 text-white w-7 h-7 shrink-0 rounded-lg flex items-center justify-center shadow-sm transition-colors" data-unique-id="${item.uniqueId}"><i class="fa-solid fa-check text-xs pointer-events-none"></i></button>
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

        if (target.closest('.open-product-modal')) openProductModal(parseInt(target.closest('.open-product-modal').dataset.id));
        if (target.classList.contains('close-modal') || target.classList.contains('modal')) document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        if (target.id === 'modal-add-btn') addToCart(parseInt(target.dataset.id), document.getElementById('modal-custom-note').value);
        if (target.classList.contains('remove-item-btn')) removeFromCart(target.dataset.uniqueId);

        // Edit/Save Note Logic
        if (target.closest('.edit-note-btn')) {
            const uid = target.closest('.edit-note-btn').dataset.uniqueId;
            document.getElementById(`view-mode-${uid}`).classList.add('hidden');
            document.getElementById(`edit-mode-${uid}`).classList.remove('hidden');
        }
        if (target.closest('.save-note-btn')) {
            const uid = target.closest('.save-note-btn').dataset.uniqueId;
            updateCartMessage(uid, document.getElementById(`input-${uid}`).value);
        }

        if (target.closest('#cart-icon')) cartModal.classList.add('active');
        if (target.id === 'checkout-btn') { cartModal.classList.remove('active'); checkoutModal.classList.add('active'); }

        // Lightbox Logic
        if (target.classList.contains('lightbox-trigger')) {
            lightboxImg.src = target.dataset.src;
            lightbox.classList.add('active');
        }
        if (target.id === 'lightbox-close' || target === lightbox) {
            lightbox.classList.remove('active');
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
            
            btn.disabled = true; btnText.textContent = "Packing..."; btnLoader.classList.remove('hidden');

            let orderSummary = "--- TREVIA ORDER ---\n\n";
            cart.forEach((item, index) => { orderSummary += `${index + 1}. ${item.name} (₹${item.price})\n   Note: ${item.message || "None"}\n`; });
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            orderSummary += `\nTOTAL: ₹${total.toFixed(2)}`;
            
            // Using Uphar key to match success.html logic
            localStorage.setItem('UpharOrderSummary', orderSummary);
            localStorage.setItem('UpharOrderTotal', total.toFixed(2));
            
            document.getElementById('hidden-order-details').value = orderSummary;

            const formData = new FormData(form);
            try {
                const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
                if (response.ok) {
                    cart = []; saveCart(); window.location.href = 'success.html';
                } else { throw new Error('API Error'); }
            } catch (error) {
                alert("The magic connection failed. Please try again! ✨");
                btn.disabled = false; btnText.textContent = "Confirm Order ✨"; btnLoader.classList.add('hidden');
            }
        });
    }

    loadProducts();
});