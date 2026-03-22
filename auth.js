/* ============================================
   LUXEART — Auth Page Logic
   Login / Signup Client-Side
   ============================================ */

(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    const loginPanel = $('#loginPanel');
    const signupPanel = $('#signupPanel');
    const loginForm = $('#loginForm');
    const signupForm = $('#signupForm');

    // ============================================
    // PANEL SWITCHING
    // ============================================

    $$('.auth-switch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target === 'signup') {
                loginPanel.style.display = 'none';
                signupPanel.style.display = '';
                signupPanel.style.animation = 'none';
                signupPanel.offsetHeight; // reflow
                signupPanel.style.animation = '';
            } else {
                signupPanel.style.display = 'none';
                loginPanel.style.display = '';
                loginPanel.style.animation = 'none';
                loginPanel.offsetHeight;
                loginPanel.style.animation = '';
            }
            clearAlerts();
            clearErrors();
        });
    });

    // ============================================
    // PASSWORD TOGGLE
    // ============================================

    $$('.auth-form__toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetInput = $('#' + btn.dataset.target);
            const eyeOpen = $('.eye-open', btn);
            const eyeClosed = $('.eye-closed', btn);

            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = '';
            } else {
                targetInput.type = 'password';
                eyeOpen.style.display = '';
                eyeClosed.style.display = 'none';
            }
        });
    });

    // ============================================
    // FORM HELPERS
    // ============================================

    function clearErrors() {
        $$('.auth-form__error').forEach(el => { el.textContent = ''; });
        $$('.auth-form__input').forEach(el => { el.classList.remove('error'); });
    }

    function clearAlerts() {
        $$('.auth-form__alert').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
            el.className = 'auth-form__alert';
        });
    }

    function showFieldError(groupId, errorId, message) {
        const input = $(`#${groupId} .auth-form__input`) || $(`#${groupId.replace('Group', '')}`);
        if (input) input.classList.add('error');
        const errorEl = $(`#${errorId}`);
        if (errorEl) errorEl.textContent = message;
    }

    function showAlert(alertId, message, type = 'error') {
        const alert = $(`#${alertId}`);
        if (!alert) return;
        alert.textContent = message;
        alert.className = `auth-form__alert alert--${type}`;
        alert.style.display = '';
    }

    function setLoading(btn, loading) {
        const text = $('.auth-form__submit-text', btn);
        const loader = $('.auth-form__submit-loader', btn);
        if (loading) {
            btn.disabled = true;
            text.style.display = 'none';
            loader.style.display = '';
        } else {
            btn.disabled = false;
            text.style.display = '';
            loader.style.display = 'none';
        }
    }

    // ============================================
    // LOGIN
    // ============================================

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        clearAlerts();

        const email = $('#loginEmail').value.trim();
        const password = $('#loginPassword').value;

        // Validate
        let valid = true;
        if (!email) {
            showFieldError('loginEmailGroup', 'loginEmailError', 'Email is required');
            valid = false;
        }
        if (!password) {
            showFieldError('loginPasswordGroup', 'loginPasswordError', 'Password is required');
            valid = false;
        }
        if (!valid) return;

        const submitBtn = $('#loginSubmitBtn');
        setLoading(submitBtn, true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showAlert('loginAlert', data.error || 'Login failed', 'error');
                setLoading(submitBtn, false);
                return;
            }

            // Save token & user
            localStorage.setItem('ag_token', data.token);
            localStorage.setItem('ag_user', JSON.stringify(data.user));

            showAlert('loginAlert', 'Welcome back! Redirecting...', 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } catch (err) {
            showAlert('loginAlert', 'Network error. Please try again.', 'error');
            setLoading(submitBtn, false);
        }
    });

    // ============================================
    // SIGNUP
    // ============================================

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        clearAlerts();

        const name = $('#signupName').value.trim();
        const email = $('#signupEmail').value.trim();
        const password = $('#signupPassword').value;

        // Validate
        let valid = true;
        if (!name) {
            showFieldError('signupNameGroup', 'signupNameError', 'Name is required');
            valid = false;
        }
        if (!email) {
            showFieldError('signupEmailGroup', 'signupEmailError', 'Email is required');
            valid = false;
        }
        if (!password || password.length < 6) {
            showFieldError('signupPasswordGroup', 'signupPasswordError', 'Password must be at least 6 characters');
            valid = false;
        }
        if (!valid) return;

        const submitBtn = $('#signupSubmitBtn');
        setLoading(submitBtn, true);

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showAlert('signupAlert', data.error || 'Registration failed', 'error');
                setLoading(submitBtn, false);
                return;
            }

            // Save token & user
            localStorage.setItem('ag_token', data.token);
            localStorage.setItem('ag_user', JSON.stringify(data.user));

            showAlert('signupAlert', 'Account created! Redirecting...', 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } catch (err) {
            showAlert('signupAlert', 'Network error. Please try again.', 'error');
            setLoading(submitBtn, false);
        }
    });

    // ============================================
    // AUTO-REDIRECT IF ALREADY LOGGED IN
    // ============================================

    const token = localStorage.getItem('ag_token');
    if (token) {
        fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.ok) {
                    window.location.href = '/';
                } else {
                    localStorage.removeItem('ag_token');
                    localStorage.removeItem('ag_user');
                }
            })
            .catch(() => { /* ignore, show login */ });
    }

})();
