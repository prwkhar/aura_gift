document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION & STATE ---
    const googleSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk6U3tVlnehAHt_pXJz7-HHbgGyzeFwrHOui0PYCVQY3ubNBjGsU1qH8YVtfOTs3wxSv_YqE-qN5Se/pub?output=csv';
    let products = [];
    let cart = JSON.parse(localStorage.getItem('auraCart')) || [];

    // --- DOM ELEMENTS ---
    const productList = document.getElementById('product-list');
    const cartIcon = document.getElementById('cart-icon');
    const cartCount = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const productDetailModal = document.getElementById('product-detail-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutForm = document.getElementById('checkout-form');

    // --- DATA FETCHING & INITIALIZATION ---
    async function loadProducts() {
        if (!productList) return;
        productList.innerHTML = `<p>Loading our collection...</p>`;
        try {
            const response = await fetch(googleSheetURL);
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            const csvText = await response.text();
            
            const data = parseCSV(csvText);
            products = data.map(row => ({
                id: parseInt(row.id),
                name: row.name,
                price: parseFloat(row.price),
                description: row.description,
                images: row.image_urls.split(' ').filter(url => url)
            }));
            
            renderProducts();
            updateCartUI();
        } catch (error) {
            console.error("Error loading products:", error);
            productList.innerHTML = `<p>Sorry, we couldn't load products. Please try again later.</p>`;
        }
    }

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            return headers.reduce((obj, header, i) => {
                obj[header] = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
                return obj;
            }, {});
        });
    }

    // --- RENDERING FUNCTIONS ---
    function renderProducts() {
        if (!productList) return;
        productList.innerHTML = products.map(product => {
            const cartItem = cart.find(item => item.id === product.id);
            const buttonHTML = cartItem
                ? getQuantityControlHTML(product.id, cartItem.quantity)
                : `<button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>`;

            return `
                <div class="product-card" data-id="${product.id}">
                    <div class="product-image-container">
                        <img src="${product.images[0]}" alt="${product.name}">
                    </div>
                    <div class="product-card-info">
                        <h3>${product.name}</h3>
                        <p>₹${product.price.toFixed(2)}</p>
                        <div class="add-to-cart-btn-container" data-id="${product.id}">
                           ${buttonHTML}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    function renderProductDetail(product) {
        const sliderHTML = product.images.length > 1 ? `
            <div class="slider-container">
                <div class="slider-wrapper">
                    ${product.images.map(img => `<img src="${img}" class="slider-image" alt="${product.name}">`).join('')}
                </div>
                <button class="slider-btn prev"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-btn next"><i class="fas fa-chevron-right"></i></button>
            </div>` : `<img src="${product.images[0]}" alt="${product.name}" style="width:100%; border-radius: 8px;">`;

        document.getElementById('product-detail-content').innerHTML = `
            <span class="close-button">&times;</span>
            ${sliderHTML}
            <h3>${product.name}</h3>
            <p class="price">₹${product.price.toFixed(2)}</p>
            <p class="description">${product.description}</p>
            <button class="cta-button add-to-cart-from-modal-btn" data-id="${product.id}">Add to Cart</button>`;
        
        productDetailModal.style.display = 'block';
        if (product.images.length > 1) setupSlider();
    }
    
    // --- CART LOGIC ---
    function addToCart(productId) {
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            cartItem.quantity++;
        } else {
            const product = products.find(p => p.id === productId);
            cart.push({ ...product, quantity: 1 });
        }
        updateCart();
    }

    function updateQuantity(productId, newQuantity) {
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            if (newQuantity > 0) {
                cartItem.quantity = newQuantity;
            } else {
                cart = cart.filter(item => item.id !== productId);
            }
        }
        updateCart();
    }
    
    function updateCart() {
        updateCartUI();
        updateProductGridUI();
        localStorage.setItem('auraCart', JSON.stringify(cart));
    }

    // --- UI UPDATES ---
    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is beautifully empty.</p>';
            cartTotal.textContent = '0.00';
            checkoutBtn.disabled = true;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.images[0]}" alt="${item.name}" width="60" style="border-radius: 4px;">
                    <div class="cart-item-info">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    ${getQuantityControlHTML(item.id, item.quantity, 'cart')}
                </div>
            `).join('');
            
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            cartTotal.textContent = total.toFixed(2);
            checkoutBtn.disabled = false;
        }
    }
    
    function updateProductGridUI() {
        const allButtons = document.querySelectorAll('.add-to-cart-btn-container');
        allButtons.forEach(container => {
            const productId = parseInt(container.dataset.id);
            const cartItem = cart.find(item => item.id === productId);
            if (cartItem) {
                container.innerHTML = getQuantityControlHTML(productId, cartItem.quantity);
            } else {
                container.innerHTML = `<button class="add-to-cart-btn" data-id="${productId}">Add to Cart</button>`;
            }
        });
    }

    function getQuantityControlHTML(productId, quantity, context = 'grid') {
        return `
            <div class="quantity-control" data-context="${context}">
                <button class="quantity-btn decrease" data-id="${productId}">-</button>
                <span>${quantity}</span>
                <button class="quantity-btn increase" data-id="${productId}">+</button>
            </div>`;
    }

    // --- EVENT LISTENERS ---
    document.body.addEventListener('click', (e) => {
        const productId = parseInt(e.target.dataset.id);

        if (e.target.classList.contains('add-to-cart-btn')) {
            addToCart(productId);
        }
        
        if (e.target.classList.contains('add-to-cart-from-modal-btn')) {
            addToCart(productId);
            productDetailModal.style.display = 'none';
        }

        if (e.target.classList.contains('quantity-btn')) {
            const cartItem = cart.find(item => item.id === productId);
            if (e.target.classList.contains('increase')) {
                updateQuantity(productId, cartItem.quantity + 1);
            }
            if (e.target.classList.contains('decrease')) {
                updateQuantity(productId, cartItem.quantity - 1);
            }
        }

        const cardImage = e.target.closest('.product-image-container');
        if (cardImage) {
            const card = cardImage.closest('.product-card');
            const detailProductId = parseInt(card.dataset.id);
            const product = products.find(p => p.id === detailProductId);
            renderProductDetail(product);
        }

        if (e.target.classList.contains('modal') || e.target.closest('.close-button')) {
            e.target.closest('.modal').style.display = 'none';
        }
    });

    cartIcon.addEventListener('click', () => cartModal.style.display = 'block');

    checkoutBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
        checkoutModal.style.display = 'block';
        let orderSummary = "Items Ordered:\n";
        cart.forEach(item => {
            orderSummary += `- (ID: ${item.id}) ${item.name} (x${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}\n`;
        });
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        orderSummary += `\nTotal: ₹${total.toFixed(2)}`;
        document.getElementById('order-details').value = orderSummary;
    });
    
    checkoutForm.addEventListener('submit', (e) => {
        const submitBtn = e.target.querySelector('.submit-order-btn');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loader').style.display = 'inline';

        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        localStorage.setItem('auraOrderSummary', document.getElementById('order-details').value);
        // **NEW**: Save the order total for the success page
        localStorage.setItem('auraOrderTotal', total.toFixed(2));

        setTimeout(() => {
            cart = [];
            localStorage.removeItem('auraCart');
            updateCart(); 
        }, 500);
    });
    
    // --- SLIDER LOGIC (FIXED) ---
    function setupSlider() {
        const modalContent = document.getElementById('product-detail-content');
        const wrapper = modalContent.querySelector('.slider-wrapper');
        const prevBtn = modalContent.querySelector('.slider-btn.prev');
        const nextBtn = modalContent.querySelector('.slider-btn.next');
        let currentIndex = 0;
        const totalSlides = wrapper.children.length;

        function updateSlider() {
            wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSlider();
        });

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSlider();
        });
    }

    // --- INITIALIZE ---
    loadProducts();
});
