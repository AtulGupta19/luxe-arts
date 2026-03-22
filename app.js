/* ============================================
   LUXEART — Luxury Art Ecommerce
   App Logic & Interactions
   ============================================ */

(function () {
    'use strict';

    // ---- DOM Cache ----
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    const nav = $('#mainNav');
    const navLinks = $('#navLinks');
    const menuToggle = $('#menuToggle');
    const cartToggle = $('#cartToggle');
    const cartDrawer = $('#cartDrawer');
    const cartOverlay = $('#cartOverlay');
    const cartClose = $('#cartClose');
    const cartItemsEl = $('#cartItems');
    const cartEmpty = $('#cartEmpty');
    const cartFooter = $('#cartFooter');
    const cartCountBadge = $('#cartCount');
    const cartSubtotal = $('#cartSubtotal');
    const cartTotal = $('#cartTotal');
    const toast = $('#toast');
    const toastText = $('#toastText');
    const pageTransition = $('#pageTransition');
    const testimonialsTrack = $('#testimonialsTrack');
    const testimonialsDots = $$('.testimonials__dot');
    const newsletterForm = $('#newsletterForm');

    // ---- State ----
    let cart = [];
    let toastTimeout = null;
    let currentTestimonial = 0;
    let testimonialInterval = null;

    // ============================================
    // NAVIGATION
    // ============================================

    // Sticky nav on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        lastScroll = scrollY;
    }, { passive: true });

    // Mobile menu toggle
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    $$('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Smooth scroll for anchor links  
    $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = $(targetId);
            if (target) {
                e.preventDefault();
                const offset = nav.offsetHeight;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ============================================
    // SCROLL REVEAL ANIMATIONS
    // ============================================

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, parseInt(delay));
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    $$('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        revealObserver.observe(el);
    });

    // ============================================
    // CART SYSTEM
    // ============================================

    function openCart() {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        cartDrawer.classList.remove('active');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    cartToggle.addEventListener('click', openCart);
    cartClose.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Close cart on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
            if (navLinks.classList.contains('active')) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });

    // Add to cart
    $$('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { id, name, price, image } = btn.dataset;
            addToCart(id, name, parseFloat(price), image);
        });
    });

    function addToCart(id, name, price, image) {
        const existing = cart.find(item => item.id === id);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ id, name, price, image, qty: 1 });
        }
        updateCartUI();
        showToast(`${name} added to cart`);

        // Quick flash animation on the cart icon
        cartCountBadge.style.transform = 'scale(1.4)';
        setTimeout(() => { cartCountBadge.style.transform = 'scale(1)'; }, 200);
    }

    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    }

    function updateQty(id, delta) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                removeFromCart(id);
                return;
            }
        }
        updateCartUI();
    }

    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

        // Badge
        cartCountBadge.textContent = totalItems;
        if (totalItems > 0) {
            cartCountBadge.classList.add('active');
        } else {
            cartCountBadge.classList.remove('active');
        }

        // Cart items
        if (cart.length === 0) {
            cartEmpty.style.display = '';
            cartFooter.style.display = 'none';
            // Remove item elements only
            $$('.cart-item', cartItemsEl).forEach(el => el.remove());
            return;
        }

        cartEmpty.style.display = 'none';
        cartFooter.style.display = '';

        // Rebuild items
        $$('.cart-item', cartItemsEl).forEach(el => el.remove());

        cart.forEach(item => {
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
        <div class="cart-item__image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item__details">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">$${item.price.toLocaleString()}</div>
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
            <span class="cart-item__qty-count">${item.qty}</span>
            <button class="cart-item__qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="cart-item__remove" data-id="${item.id}" aria-label="Remove ${item.name}">Remove</button>
      `;
            cartItemsEl.appendChild(el);
        });

        // Bind events
        $$('.cart-item__qty-btn', cartItemsEl).forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const delta = btn.dataset.action === 'increase' ? 1 : -1;
                updateQty(id, delta);
            });
        });

        $$('.cart-item__remove', cartItemsEl).forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
        });

        cartSubtotal.textContent = `$${totalPrice.toLocaleString()}`;
        cartTotal.textContent = `$${totalPrice.toLocaleString()}`;
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================

    function showToast(text) {
        if (toastTimeout) clearTimeout(toastTimeout);
        toastText.textContent = text;
        toast.classList.add('active');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('active');
        }, 2500);
    }

    // ============================================
    // COUNTDOWN TIMER
    // ============================================

    function initCountdown() {
        // Set drop date to 14 days from now
        const dropDate = new Date();
        dropDate.setDate(dropDate.getDate() + 14);
        dropDate.setHours(20, 0, 0, 0);

        function updateCountdown() {
            const now = new Date();
            const diff = dropDate - now;

            if (diff <= 0) {
                $('#countDays').textContent = '00';
                $('#countHours').textContent = '00';
                $('#countMins').textContent = '00';
                $('#countSecs').textContent = '00';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const mins = Math.floor((diff / (1000 * 60)) % 60);
            const secs = Math.floor((diff / 1000) % 60);

            $('#countDays').textContent = String(days).padStart(2, '0');
            $('#countHours').textContent = String(hours).padStart(2, '0');
            $('#countMins').textContent = String(mins).padStart(2, '0');
            $('#countSecs').textContent = String(secs).padStart(2, '0');
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    initCountdown();

    // ============================================
    // TESTIMONIALS SLIDER
    // ============================================

    function goToTestimonial(index) {
        currentTestimonial = index;
        testimonialsTrack.style.transform = `translateX(-${index * 100}%)`;
        testimonialsDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    testimonialsDots.forEach(dot => {
        dot.addEventListener('click', () => {
            goToTestimonial(parseInt(dot.dataset.index));
            resetTestimonialAutoplay();
        });
    });

    function startTestimonialAutoplay() {
        testimonialInterval = setInterval(() => {
            const next = (currentTestimonial + 1) % testimonialsDots.length;
            goToTestimonial(next);
        }, 5000);
    }

    function resetTestimonialAutoplay() {
        clearInterval(testimonialInterval);
        startTestimonialAutoplay();
    }

    startTestimonialAutoplay();

    // Touch/swipe for testimonials
    let touchStartX = 0;
    let touchEndX = 0;

    testimonialsTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    testimonialsTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentTestimonial < testimonialsDots.length - 1) {
                goToTestimonial(currentTestimonial + 1);
            } else if (diff < 0 && currentTestimonial > 0) {
                goToTestimonial(currentTestimonial - 1);
            }
            resetTestimonialAutoplay();
        }
    }, { passive: true });

    // ============================================
    // NEWSLETTER FORM
    // ============================================

    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('input', newsletterForm).value;
        if (email) {
            showToast('Welcome to the Inner Circle ✦');
            newsletterForm.reset();
        }
    });

    // ============================================
    // CHECKOUT BUTTON
    // ============================================

    $('#checkoutBtn').addEventListener('click', () => {
        if (cart.length === 0) return;

        // Require login for checkout
        const token = localStorage.getItem('ag_token');
        if (!token) {
            showToast('Please sign in to checkout');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
            return;
        }

        // Show page transition effect
        pageTransition.classList.add('active');
        setTimeout(() => {
            showToast('Checkout experience coming soon');
            pageTransition.classList.remove('active');
        }, 800);
    });

    // ============================================
    // AUTH STATE MANAGEMENT
    // ============================================

    const authBtn = $('#authBtn');
    const authText = $('#authText');

    function initAuthState() {
        const token = localStorage.getItem('ag_token');
        const userStr = localStorage.getItem('ag_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                // Update navbar to show user
                authBtn.href = '#';
                authBtn.classList.add('logged-in');
                authText.textContent = user.name.split(' ')[0]; // First name
                authBtn.style.position = 'relative';

                // Create dropdown menu
                const menu = document.createElement('div');
                menu.className = 'nav__user-menu';
                menu.id = 'userMenu';
                menu.innerHTML = `
                    <button class="nav__user-menu-item" id="signOutBtn">Sign Out</button>
                `;
                authBtn.appendChild(menu);

                // Toggle menu on click
                authBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    menu.classList.toggle('active');
                });

                // Close menu on outside click
                document.addEventListener('click', (e) => {
                    if (!authBtn.contains(e.target)) {
                        menu.classList.remove('active');
                    }
                });

                // Sign out
                $('#signOutBtn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    localStorage.removeItem('ag_token');
                    localStorage.removeItem('ag_user');
                    showToast('Signed out successfully');
                    setTimeout(() => {
                        window.location.reload();
                    }, 600);
                });

                // Verify token is still valid
                fetch('/api/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => {
                    if (!res.ok) {
                        localStorage.removeItem('ag_token');
                        localStorage.removeItem('ag_user');
                        window.location.reload();
                    }
                }).catch(() => { /* offline, keep session */ });

            } catch (e) {
                localStorage.removeItem('ag_token');
                localStorage.removeItem('ag_user');
            }
        }
    }

    initAuthState();

    // ============================================
    // PAGE LOAD TRANSITION
    // ============================================

    window.addEventListener('load', () => {
        // Remove any initial loading state
        document.body.style.opacity = '1';

        // Trigger hero animations are handled by CSS
    });

    // ============================================
    // COUNTER ANIMATION (About section stats)
    // ============================================

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const aboutStats = $('.about__stats');
    if (aboutStats) statsObserver.observe(aboutStats);

    function animateCounters() {
        $$('.about__stat-number').forEach(el => {
            const text = el.textContent;
            const suffix = text.replace(/[\d,]/g, '');
            const target = parseInt(text.replace(/[^\d]/g, ''));
            let current = 0;
            const increment = target / 60;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                el.textContent = Math.floor(current).toLocaleString() + suffix;
            }, 25);
        });
    }

})();
