// ===== TAB SWITCHING =====
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const indicator = document.getElementById('tab-indicator');

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        indicator.style.transform = 'translateX(0)';
    } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        indicator.style.transform = 'translateX(100%)';
    }

    // Clear messages
    document.getElementById('login-message').textContent = '';
    document.getElementById('login-message').className = 'form-message';
    document.getElementById('signup-message').textContent = '';
    document.getElementById('signup-message').className = 'form-message';
}

// ===== TOGGLE PASSWORD VISIBILITY =====
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

// ===== UUID GENERATOR =====
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===== SET LOADING STATE =====
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline';
    loader.style.display = loading ? 'inline-flex' : 'none';
}

// ===== SHOW MESSAGE =====
function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'form-message ' + type;
}

// ===== LOGIN HANDLER =====
async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('login-password').value.trim();

    if (!password) {
        showMessage('login-message', 'Veuillez entrer un mot de passe.', 'error');
        return;
    }

    setLoading('login-btn', true);
    showMessage('login-message', '', '');

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/valide_mdp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'valid.mdp': 'valid.mdp.01'
            },
            body: JSON.stringify({ password: password })
        });

        const raw = await response.json().catch(() => null);
        const data = Array.isArray(raw) ? raw[0] : raw;
        console.log('Login response:', response.status, data);

        if (!data) {
            showMessage('login-message', 'Erreur: impossible de lire la réponse du serveur.', 'error');
        } else if (data.statut === 'invalid') {
            showMessage('login-message', data.phrase || 'Connexion refusée.', 'error');
        } else {
            showMessage('login-message', 'Connexion validée !', 'success');
            
            // On récupère le userid renvoyé par le webhook n8n
            const userId = data.userid || data.uuid; 
            
            // Identify user in OneSignal if we have an ID
            if (window.OneSignal && userId) {
                console.log("Identifying OneSignal user with ID:", userId);
                OneSignal.login(userId);
            }

            sessionStorage.setItem('user', JSON.stringify({ name: 'Utilisateur', uuid: userId }));
            setTimeout(() => { showDashboard('Utilisateur'); }, 800);
        }
    } catch (err) {
        console.error('Login webhook error:', err);
        showMessage('login-message', 'Erreur de connexion au serveur.', 'error');
    } finally {
        setLoading('login-btn', false);
    }
}

// ===== SIGNUP HANDLER =====
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    if (!name || !password) {
        showMessage('signup-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    setLoading('signup-btn', true);
    showMessage('signup-message', '', '');

    const uuid = generateUUID();

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/inscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'inscription.setter': 'inscription.setter.01'
            },
            body: JSON.stringify({
                nom: name,
                password: password,
                uuid: uuid
            })
        });

        const raw = await response.json().catch(() => null);
        const data = Array.isArray(raw) ? raw[0] : raw;
        console.log('Signup response:', response.status, data);

        if (!data) {
            showMessage('signup-message', 'Erreur: impossible de lire la réponse du serveur.', 'error');
        } else if (data.statut === 'invalid') {
            showMessage('signup-message', data.phrase || 'Inscription refusée.', 'error');
        } else {
            showMessage('signup-message', 'Inscription réussie ! Redirection...', 'success');
            
            // Identify user in OneSignal
            if (window.OneSignal) {
                OneSignal.login(uuid);
            }

            sessionStorage.setItem('user', JSON.stringify({ name: name, uuid: uuid }));
            setTimeout(() => { showDashboard(name); }, 800);
        }
    } catch (err) {
        console.error('Signup webhook error:', err);
        showMessage('signup-message', 'Erreur de connexion au serveur.', 'error');
    } finally {
        setLoading('signup-btn', false);
    }
}

// ===== SHOW DASHBOARD =====
function showDashboard(username) {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
    document.getElementById('user-display').textContent = username;
}

// ===== LOGOUT =====
function handleLogout() {
    sessionStorage.removeItem('user');
    document.getElementById('dashboard-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');

    // Reset forms
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    document.getElementById('login-message').textContent = '';
    document.getElementById('login-message').className = 'form-message';
    document.getElementById('signup-message').textContent = '';
    document.getElementById('signup-message').className = 'form-message';
    switchTab('login');
}

// ===== CHECK SESSION ON LOAD =====
window.addEventListener('DOMContentLoaded', () => {
    const stored = sessionStorage.getItem('user');
    if (stored) {
        const user = JSON.parse(stored);
        showDashboard(user.name || 'Utilisateur');
    }
});
