document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop();
    let settings, dairyProducts, cowboyProducts, additions;

    async function loadJSON(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`فشل تحميل ${url}: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(error);
            showToast(`خطأ في تحميل البيانات: ${error.message}`);
            return null;
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.animation = 'fadeInOut 1s ease forwards';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 1000);
    }

    async function init() {
        settings = await loadJSON('settings.json');
        if (!settings) return;

        document.querySelectorAll('#logo-img').forEach(img => img.src = settings.logo);
        document.querySelectorAll('#footer-logo').forEach(img => img.src = settings.logo);
        document.querySelectorAll('#footer-address').forEach(p => p.textContent = settings.address);
        document.querySelectorAll('#footer-facebook').forEach(a => a.href = settings.facebook);
        document.querySelectorAll('#footer-instagram').forEach(a => a.href = settings.instagram);
        document.querySelectorAll('#footer-whatsapp').forEach(a => a.href = `https://wa.me/${settings.whatsapp}`);
        if (page === 'contact.html') {
            document.getElementById('facebook').href = settings.facebook;
            document.getElementById('instagram').href = settings.instagram;
            document.getElementById('whatsapp').href = `https://wa.me/${settings.whatsapp}`;
            document.getElementById('phone-number').textContent = settings.phone;
            document.getElementById('address').textContent = settings.address;
        }

        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        loadPage(page);
    }

    async function loadPage(page) {
        if (page === 'index.html' || page === '') {
            loadBanner();
            await loadOffers('dairy');
            await loadOffers('cowboy');
        } else if (page === 'dairy-menu.html') {
            dairyProducts = await loadJSON('dairy-products.json');
            if (dairyProducts) {
                dairyProducts = dairyProducts.filter(p => p && p.id && p.name && p.price && p.image);
                loadCategories('dairy');
                loadProducts(dairyProducts, 'dairy');
                setupSearchFilter(dairyProducts, 'dairy');
            }
        } else if (page === 'cowboy-menu.html') {
            cowboyProducts = await loadJSON('cowboy-products.json');
            additions = await loadJSON('additions.json');
            if (cowboyProducts && additions) {
                cowboyProducts = cowboyProducts.filter(p => p && p.id && p.name && p.price && p.image);
                loadCategories('cowboy');
                loadProducts(cowboyProducts, 'cowboy');
                setupSearchFilter(cowboyProducts, 'cowboy');
            }
        } else if (page === 'favorites.html') {
            dairyProducts = await loadJSON('dairy-products.json');
            cowboyProducts = await loadJSON('cowboy-products.json');
            loadFavorites();
        } else if (page === 'cart.html') {
            loadCart();
            document.getElementById('submit-order').addEventListener('click', submitOrder);
        } else if (page === 'product-detail-dairy.html' || page === 'product-detail-cowboy.html') {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            const type = page === 'product-detail-dairy.html' ? 'dairy' : 'cowboy';
            if (type === 'cowboy') {
                additions = await loadJSON('additions.json');
                if (additions) {
                    const products = await loadJSON('cowboy-products.json');
                    if (products) {
                        const product = products.find(p => p.id === id);
                        if (product && product.name && product.price && product.image) {
                            cowboyProducts = [product]; // ✅ نخزن المنتج
                            showProductDetail(product, type);
                        } else showToast('خطأ: بيانات المنتج غير صالحة');
                    }
                }
            } else {
                const products = await loadJSON('dairy-products.json');
                if (products) {
                    const product = products.find(p => p.id === id);
                    if (product && product.name && product.price && product.image) {
                        dairyProducts = [product]; // ✅ نخزن المنتج
                        showProductDetail(product, type);
                    } else showToast('خطأ: بيانات المنتج غير صالحة');
                }
            }
        }
    }

    function loadBanner() {
        const banner = document.getElementById('banner');
        const bannerText = document.querySelector('.banner-text');
        const images = settings.banners;
        const texts = settings.bannerTexts || ['عروض حصرية!', 'تذوق الطعم الأصلي', 'ألبان طازجة يوميًا', 'Cowboy حياة أحلى'];
        let index = 0;

        function changeBanner() {
            banner.style.animation = 'fadeIn 1s ease-in-out';
            banner.style.backgroundImage = `url(${images[index]})`;
            bannerText.textContent = texts[index];
            index = (index + 1) % images.length;
        }
        changeBanner();
        setInterval(changeBanner, 5000);
    }

    async function loadOffers(type) {
        const products = await loadJSON(type === 'dairy' ? 'dairy-products.json' : 'cowboy-products.json');
        if (products) {
            const validProducts = products.filter(p => p && p.isOffer && p.id && p.name && p.price && p.image);
            if (validProducts.length > 0) {
                renderOffers(validProducts, type);
                startAutoScroll(type);
            } else {
                showToast(`لا توجد عروض مميزة لـ ${type === 'dairy' ? 'الألبان' : 'Cowboy'}`);
            }
        }
    }

    function renderOffers(products, type) {
        const container = document.getElementById(`${type}-offers-container`);
        if (!container) return;
        container.innerHTML = '';
        products.forEach((product, i) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.animationDelay = `${i * 0.2}s`;
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price} جنيه ${product.oldPrice ? `<span class="old-price">${product.oldPrice}</span>` : ''}</p>
                <div class="card-buttons">
                    <button class="cart-btn" onclick="goToProductDetail('${product.id}', '${type}')">إضافة للسلة</button>
                    <button class="fav-btn" onclick="addToFavorites('${product.id}', '${type}')">إضافة للمفضلة</button>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.location.href = `product-detail-${type}.html?id=${product.id}`;
                }
            });
            container.appendChild(card);
        });
    }

    function startAutoScroll(type) {
        const container = document.getElementById(`${type}-offers-container`);
        if (!container || container.children.length === 0) return;
        let scrollPosition = 0;
        const scrollAmount = 170;
        const scrollSpeed = 3500;

        function scrollStep() {
            const maxScroll = container.scrollWidth - container.clientWidth;
            if (type === 'dairy') {
                scrollPosition += scrollAmount;
                if (scrollPosition >= maxScroll) scrollPosition = 0;
            } else {
                scrollPosition -= scrollAmount;
                if (scrollPosition <= 0) scrollPosition = maxScroll;
            }
            container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
            requestAnimationFrame(() => setTimeout(scrollStep, scrollSpeed));
        }
        scrollStep();
    }

    window.toggleAutoScroll = (type) => {
        const container = document.getElementById(`${type}-offers-container`);
        if (!container) return;
        if (container.dataset.scrolling === 'true') {
            container.dataset.scrolling = 'false';
        } else {
            container.dataset.scrolling = 'true';
            startAutoScroll(type);
        }
    };

    function loadCategories(type) {
        const select = document.getElementById('category');
        if (type === 'cowboy' && cowboyProducts) {
            const categories = [...new Set(cowboyProducts.map(p => p.category))];
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        }
    }

    function loadProducts(products, type) {
        const container = document.getElementById('products');
        if (!container) return;
        container.innerHTML = '';
        products.forEach((product, i) => {
            if (!product || !product.id || !product.name || !product.price || !product.image) return;
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.animationDelay = `${i * 0.1}s`;
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price} جنيه</p>
                <div class="card-buttons">
                    <button class="cart-btn" onclick="goToProductDetail('${product.id}', '${type}')">إضافة للسلة</button>
                    <button class="fav-btn" onclick="addToFavorites('${product.id}', '${type}')">إضافة للمفضلة</button>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.location.href = `product-detail-${type}.html?id=${product.id}`;
                }
            });
            container.appendChild(card);
        });
    }

    function setupSearchFilter(products, type) {
        const search = document.getElementById('search');
        const category = document.getElementById('category');
        if (!search || !category) return;
        search.addEventListener('input', filterProducts);
        category.addEventListener('change', filterProducts);

        function filterProducts() {
            let filtered = products.filter(p => p.name && p.name.includes(search.value));
            if (category.value) filtered = filtered.filter(p => p.category === category.value);
            loadProducts(filtered, type);
        }
    }

    function showProductDetail(product, type) {
        const container = document.getElementById('products');
        if (!container) return;
        container.innerHTML = '';
        let optionsHtml = '';
        if (type === 'dairy' && product.options) {
            optionsHtml = `
                <div class="options">
                    <button onclick="updatePrice(${product.price * 1}, this)">ربع كيلو (${product.price})</button>
                    <button onclick="updatePrice(${product.price * 2}, this)">نصف كيلو (${product.price * 2})</button>
                    <button onclick="updatePrice(${product.price * 3}, this)">ثلاثة أرباع الكيلو (${product.price * 3})</button>
                    <button onclick="updatePrice(${product.price * 4}, this)">كيلو إلا ربع (${product.price * 4})</button>
                </div>
            `;
        } else if (type === 'cowboy' && product.additions) {
            optionsHtml = '<div class="additions">';
            product.additionIds.forEach(id => {
                const add = additions.find(a => a.id === id);
                if (add) {
                    optionsHtml += `<button onclick="addAddition(${add.price}, this)">${add.name} (${add.price})</button>`;
                }
            });
            optionsHtml += '</div>';
        }
        const detail = document.createElement('div');
        detail.classList.add('product-detail');
        detail.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <p id="detail-price">${product.price} جنيه</p>
            ${optionsHtml}
            <div class="card-buttons">
                <button class="cart-btn" onclick="addToCart('${product.id}', '${type}')">إضافة للسلة</button>
                <button class="fav-btn" onclick="addToFavorites('${product.id}', '${type}')">إضافة للمفضلة</button>
            </div>
        `;
        container.appendChild(detail);
    }

    window.updatePrice = (price, btn) => {
        document.getElementById('detail-price').textContent = `${price} جنيه`;
        Array.from(btn.parentElement.children).forEach(b => b.style.background = '#F8FAFC');
        btn.style.background = '#3B82F6';
    };

    window.addAddition = (price, btn) => {
        const currentPrice = parseInt(document.getElementById('detail-price').textContent);
        document.getElementById('detail-price').textContent = `${currentPrice + price} جنيه`;
        btn.style.background = '#3B82F6';
    };

    window.goToProductDetail = (id, type) => {
        window.location.href = `product-detail-${type}.html?id=${id}`;
    };

    window.addToFavorites = (id, type) => {
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        let products = type === 'dairy' ? dairyProducts : cowboyProducts;
        if (!products) {
            showToast('خطأ: لم يتم تحميل المنتجات');
            return;
        }
        const product = products.find(p => p.id === id);
        if (!product || !product.name || !product.price || !product.image) {
            showToast('خطأ: بيانات المنتج غير صالحة');
            return;
        }
        if (!favorites.find(f => f.id === id && f.type === type)) {
            favorites.push({...product, type});
            localStorage.setItem('favorites', JSON.stringify(favorites));
            showToast('تم الإضافة للمفضلة');
        } else {
            showToast('المنتج موجود بالفعل في المفضلة');
        }
    };

    window.addToCart = (id, type) => {
        if (page !== 'product-detail-dairy.html' && page !== 'product-detail-cowboy.html') {
            goToProductDetail(id, type);
            return;
        }
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let products = type === 'dairy' ? dairyProducts : cowboyProducts;
        if (!products) {
            showToast('خطأ: لم يتم تحميل المنتجات');
            return;
        }
        const product = products.find(p => p.id === id);
        if (!product || !product.name || !product.price || !product.image) {
            showToast('خطأ: بيانات المنتج غير صالحة');
            return;
        }
        const price = parseInt(document.getElementById('detail-price')?.textContent || product.price);
        const existing = cart.find(c => c.id === id && c.price === price && c.type === type);
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({...product, price, quantity: 1, type});
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        showToast('تم الإضافة للسلة');
    };

    function loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        const container = document.getElementById('favorites');
        if (!container) return;
        container.innerHTML = '';
        favorites.forEach((product, i) => {
            if (!product || !product.id || !product.name || !product.price || !product.image) return;
            const card = document.createElement('div');
            card.classList.add('fav-card');
            card.style.animationDelay = `${i * 0.1}s`;
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name} - ${product.price} جنيه</h3>
                <div class="card-buttons">
                    <button onclick="removeFromFavorites('${product.id}', '${product.type}')">حذف</button>
                    <button class="cart-btn" onclick="addToCart('${product.id}', '${product.type}')">إضافة للسلة</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.removeFromFavorites = (id, type) => {
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        favorites = favorites.filter(f => f.id !== id || f.type !== type);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
        showToast('تم الحذف من المفضلة');
    };

    function loadCart() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const container = document.getElementById('cart-items');
        if (!container) return;
        container.innerHTML = '';
        let total = 0;
        cart.forEach((product, i) => {
            if (!product || !product.id || !product.name || !product.price || !product.image) return;
            const card = document.createElement('div');
            card.classList.add('cart-card');
            card.style.animationDelay = `${i * 0.1}s`;
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name} - ${product.price} جنيه</h3>
                <div class="card-buttons">
                    <button onclick="changeQuantity('${product.id}', -1, ${product.price}, '${product.type}')">-</button>
                    <span>${product.quantity}</span>
                    <button onclick="changeQuantity('${product.id}', 1, ${product.price}, '${product.type}')">+</button>
                    <button onclick="removeFromCart('${product.id}', ${product.price}, '${product.type}')">حذف</button>
                </div>
            `;
            container.appendChild(card);
            total += product.price * product.quantity;
        });
        document.getElementById('total-price').textContent = total.toFixed(2);
    }

    window.changeQuantity = (id, change, price, type) => {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const item = cart.find(c => c.id === id && c.price === price && c.type === type);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                cart = cart.filter(c => c.id !== id || c.price !== price || c.type !== type);
                showToast('تم الحذف من السلة');
            } else {
                showToast('تم تحديث الكمية');
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            loadCart();
        }
    };

    window.removeFromCart = (id, price, type) => {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.filter(c => c.id !== id || c.price !== price || c.type !== type);
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
        showToast('تم الحذف من السلة');
    };

    function submitOrder() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) {
            showToast('السلة فارغة');
            return;
        }
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const address = document.getElementById('address').value;
        const notes = document.getElementById('notes').value;
        const payment = document.getElementById('payment').value;

        let message = 'طلب جديد:\n';
        cart.forEach(item => {
            if (item && item.name && item.price) {
                message += `عدد (${item.quantity}) ${item.name} - ${item.price * item.quantity} جنيه\n`;
            }
        });
        message += `الإجمالي: ${document.getElementById('total-price').textContent} جنيه\n`;
        message += `الاسم: ${name}\nرقم: ${phone}\nعنوان: ${address}\nملاحظات: ${notes}\nدفع: ${payment}`;

        const whatsappUrl = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        localStorage.removeItem('cart');
        loadCart();
        showToast('تم إرسال الطلب بنجاح');
    }

    init();
});