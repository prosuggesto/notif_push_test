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
    
    // Render clubs
    renderClubs();
}

// ===== LOGOUT =====
function handleLogout() {
    sessionStorage.removeItem('user');
    document.getElementById('dashboard-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
    
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');

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
    // Populate club selector for QR Boîtes View
    const selector = document.getElementById('club-selector');
    if (selector) {
        nightclubs.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            selector.appendChild(opt);
        });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'scan') {
        handleNativeScan();
    } else {
        const stored = sessionStorage.getItem('user');
        if (stored) {
            const user = JSON.parse(stored);
            showDashboard(user.name || 'Utilisateur');
        }
    }
});

// ===== NIGHTCLUB LOGIC =====
const nightclubs = [
    {
        id: 'club-1',
        name: 'Le Macumba',
        image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=500&q=80',
        status: 'open',
        count: 450,
        vibe: '🔥 Incroyable',
        desc: 'La plus grande boîte de nuit de la région avec 3 salles et une ambiance de folie.'
    },
    {
        id: 'club-2',
        name: 'L\'Atrium',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
        status: 'closed',
        count: 0,
        vibe: '💤 Calme',
        desc: 'Club intimiste spécialisé dans la musique électronique.'
    },
    {
        id: 'club-3',
        name: 'Le Palace',
        image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=500&q=80',
        status: 'open',
        count: 850,
        vibe: '🎉 Plein à craquer',
        desc: 'Lieu historique de la nuit parisienne, toujours au top.'
    }
];

function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    menu.classList.toggle('open');
    overlay.classList.toggle('open');
}

function switchMainView(viewId) {
    document.querySelectorAll('.main-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`${viewId}-view`).classList.add('active');
    document.getElementById(`link-${viewId}`).classList.add('active');
    
    const title = viewId === 'home' ? 'Boîtes Partenaires' : 'QR Boîtes';
    document.getElementById('header-title').textContent = title;
    
    toggleMenu();
}

function renderClubs() {
    const container = document.getElementById('clubs-container');
    container.innerHTML = '';
    
    nightclubs.forEach(club => {
        const statusText = club.status === 'open' ? 'Ouvert' : 'Fermé';
        
        container.innerHTML += `
            <div class="club-card" onclick="openClubModal('${club.id}')">
                <img src="${club.image}" class="club-img" alt="${club.name}">
                <div class="club-info">
                    <div class="club-header">
                        <h3 class="club-name">${club.name}</h3>
                        <div class="club-status status-${club.status}">
                            <div class="status-dot"></div>
                            ${statusText}
                        </div>
                    </div>
                    <div class="club-stats">
                        <div class="stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                            ${club.count} pers.
                        </div>
                        <div class="stat-item">
                            ${club.vibe}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function openClubModal(clubId) {
    const club = nightclubs.find(c => c.id === clubId);
    if (!club) return;
    
    document.getElementById('modal-club-name').textContent = club.name;
    document.getElementById('modal-club-desc').textContent = club.desc;
    
    const userStr = sessionStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { name: 'Client', uuid: 'Aucun compte' };
    
    document.getElementById('modal-user-code').textContent = user.uuid;
    
    document.getElementById('club-modal').classList.add('active');
}

function closeModal(event, modalId) {
    if (event && event.target.id !== modalId) return;
    document.getElementById(modalId).classList.remove('active');
}

function switchQRTab(tab) {
    document.querySelectorAll('.qr-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.qr-content').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`qr-${tab}-content`).classList.add('active');
}

// ===== NATIVE QR LOGIC =====

function generateClubQRs() {
    const clubId = document.getElementById('club-selector').value;
    const wrapper = document.getElementById('club-qrs-wrapper');
    
    if (!clubId) {
        wrapper.style.display = 'none';
        return;
    }
    
    wrapper.style.display = 'block';
    
    const club = nightclubs.find(c => c.id === clubId);
    
    const baseUrl = window.location.origin + window.location.pathname;
    const urlEntree = `${baseUrl}?action=scan&clubId=${club.id}&type=entree`;
    const urlBarre = `${baseUrl}?action=scan&clubId=${club.id}&type=barre`;
    
    const qrBoxEntree = document.getElementById('qr-code-gen-entree');
    const qrBoxBarre = document.getElementById('qr-code-gen-barre');
    
    qrBoxEntree.innerHTML = '';
    qrBoxBarre.innerHTML = '';
    
    new QRCode(qrBoxEntree, {
        text: urlEntree,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
    
    new QRCode(qrBoxBarre, {
        text: urlBarre,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
    
    switchGenQRTab('entree');
}

function switchGenQRTab(tab) {
    document.querySelectorAll('#club-qrs-wrapper .qr-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#club-qrs-wrapper .qr-content').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`tab-gen-${tab}`).classList.add('active');
    document.getElementById(`qr-gen-${tab}-content`).classList.add('active');
}

function downloadQR(containerId) {
    const container = document.getElementById(containerId);
    const img = container.querySelector('img');
    if (!img) return;
    
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `QR_${containerId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Intercept Scans on Load
async function handleNativeScan() {
    const params = new URLSearchParams(window.location.search);
    const clubId = params.get('clubId');
    const type = params.get('type') || 'entree';
    const club = nightclubs.find(c => c.id === clubId);
    
    if (!club) return;
    
    const stored = sessionStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    
    const payload = {
        name: "entree_barre",
        value: "entree_barre.01",
        scan_type: type,
        club_name: club.name
    };
    
    if (user) {
        payload.user_id = user.uuid;
        payload.user_name = user.name;
    }
    
    // Send webhook transparently
    fetch('https://n8n.srv862127.hstgr.cloud/webhook/entree_barre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.error('Webhook error', e));
    
    // Clean URL to prevent refresh loops
    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (user) {
        showDashboard(user.name);
        setTimeout(() => alert(`✅ Validé : ${type === 'entree' ? 'Entrée' : 'Bar'} chez ${club.name} !`), 500);
    } else {
        // Redirige sur auth screen -> onglet signup
        document.getElementById('dashboard-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('active');
        switchTab('signup');
        setTimeout(() => alert(`✅ Validé chez ${club.name} !\\n👉 Créez vite un compte pour accumuler vos points !`), 500);
    }
}
