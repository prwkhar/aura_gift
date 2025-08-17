document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION & STATE ---
    const googleSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk6U3tVlnehAHt_pXJz7-HHbgGyzeFwrHOui0PYCVQY3ubNBjGsU1qH8YVtfOTs3wxSv_YqE-qN5Se/pub?output=csv';
    let products = []; // Store all products globally
    let cart = [];

    // --- DOM ELEMENTS ---
    const productList = document.getElementById('product-list');
    const cartIcon = document.getElementById('cart-icon');
    const cartCount = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const productDetailModal = document.getElementById('product-detail-modal');
    const closeButtons = document.querySelectorAll('.close-button');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutForm = document.getElementById('checkout-form');

    // --- DATA FETCHING & PARSING ---

    /**
     * A more robust CSV parser that handles commas inside quoted fields.
     */
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = [];
            let current = '';
            let inQuote = false;
            for (let char of line) {
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            const rowObject = {};
            headers.forEach((header, i) => {
                rowObject[header] = values[i] ? values[i].replace(/^"|"$/g, '') : '';
            });
            return rowObject;
        });
        return rows;
    }

    async function loadProducts() {
        if (!productList) return;
        productList.innerHTML = `<p>Loading products...</p>`;
        try {
            const response = await fetch(googleSheetURL);
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            const csvText = await response.text();
            
            // Use the robust parser
            const parsedData = parseCSV(csvText);

            products = parsedData.map(row => ({
                id: parseInt(row.id),
                name: row.name,
                price: parseFloat(row.price),
                description: row.description,
                // Split URLs by space and filter out any empty strings
                images: row.image_urls.split(' ').filter(url => url) 
            }));
            
            renderProducts();
        } catch (error) {
            console.error("Error loading products:", error);
            productList.innerHTML = `<p>Sorry, we couldn't load products. Please try again later.</p>`;
        }
    }

    // --- RENDERING ---

    function renderProducts() {
        if (!productList) return;
        productList.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product.id}">
                <img src="${product.images[0]}" alt="${product.name}">
                <div class="product-card-info">
                    <h3>${product.name}</h3>
                    <p>₹${product.price.toFixed(2)}</p>
                    <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');
    }

    function renderProductDetail(product) {
        const hasSlider = product.images.length > 1;
        const sliderHTML = hasSlider ? `
            <div class="slider-container">
                <div class="slider-wrapper">
                    ${product.images.map(img => `<img src="${img}" class="slider-image" alt="${product.name}">`).join('')}
                </div>
                <button class="slider-btn prev"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-btn next"><i class="fas fa-chevron-right"></i></button>
            </div>
        ` : `<img src="${product.images[0]}" alt="${product.name}" style="width:100%; border-radius: 5px;">`;

        const content = `
            <span class="close-button">&times;</span>
            ${sliderHTML}
            <h3>${product.name}</h3>
            <p class="price">₹${product.price.toFixed(2)}</p>
            <p class="description">${product.description}</p>
            <button class="cta-button add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
        `;
        document.getElementById('product-detail-content').innerHTML = content;
        productDetailModal.style.display = 'block';

        if (hasSlider) {
            setupSlider();
        }
    }
    
    // --- SLIDER LOGIC ---
    function setupSlider() {
        const wrapper = document.querySelector('.slider-wrapper');
        const prevBtn = document.querySelector('.slider-btn.prev');
        const nextBtn = document.querySelector('.slider-btn.next');
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

    // --- CART LOGIC ---
    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        const cartItem = cart.find(item => item.id === productId);

        if (cartItem) {
            cartItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCartUI();
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        updateCartUI();
    }

    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            cartTotal.textContent = '0.00';
            checkoutBtn.disabled = true;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="remove-item-btn" data-id="${item.id}">&times;</button>
                </div>
            `).join('');
            
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            cartTotal.textContent = total.toFixed(2);
            checkoutBtn.disabled = false;
        }
    }

    // --- EVENT LISTENERS ---
    productList.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = parseInt(e.target.dataset.id);
            addToCart(productId);
        } else if (card) {
            const productId = parseInt(card.dataset.id);
            const product = products.find(p => p.id === productId);
            renderProductDetail(product);
        }
    });

    document.body.addEventListener('click', (e) => {
        // Event delegation for dynamically added elements
        if (e.target.matches('.modal .add-to-cart-btn')) {
            const productId = parseInt(e.target.dataset.id);
            addToCart(productId);
            productDetailModal.style.display = 'none'; // Close detail view after adding
        }
    });

    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const productId = parseInt(e.target.dataset.id);
            removeFromCart(productId);
        }
    });

    cartIcon.addEventListener('click', () => cartModal.style.display = 'block');

    closeButtons.forEach(btn => btn.addEventListener('click', () => {
        btn.closest('.modal').style.display = 'none';
    }));

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    checkoutBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
        checkoutModal.style.display = 'block';

        let orderSummary = "Items Ordered:\n";
        cart.forEach(item => {
            orderSummary += `- ${item.name} (x${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}\n`;
        });
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        orderSummary += `\nTotal: ₹${total.toFixed(2)}`;
        
        document.getElementById('order-details').value = orderSummary;
    });

    // --- INITIALIZATION ---
    loadProducts();
    updateCartUI();
});