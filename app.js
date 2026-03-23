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
    const stored = sessionStorage.getItem('user');
    if (stored) {
        const user = JSON.parse(stored);
        showDashboard(user.name || 'Utilisateur');
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
    
    const title = viewId === 'home' ? 'Boîtes Partenaires' : 'Scanner';
    document.getElementById('header-title').textContent = title;
    
    toggleMenu();
    
    if (viewId === 'scan') {
        startScanner();
    } else {
        stopScanner();
    }
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

// Global variables for QR instances
let qrEntree = null;
let qrBarre = null;

function openClubModal(clubId) {
    const club = nightclubs.find(c => c.id === clubId);
    if (!club) return;
    
    document.getElementById('modal-club-name').textContent = club.name;
    document.getElementById('modal-club-desc').textContent = club.desc;
    
    document.getElementById('club-modal').classList.add('active');
    switchQRTab('entree');
    
    // Generate QR Codes
    const userStr = sessionStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { name: 'Client', uuid: 'uuid-123' };
    
    const dataEntree = { type: 'entree', userId: user.uuid, userName: user.name, clubName: club.name };
    const dataBarre = { type: 'barre', userId: user.uuid, userName: user.name, clubName: club.name };
    
    const qrBoxEntree = document.getElementById('qr-code-entree');
    const qrBoxBarre = document.getElementById('qr-code-barre');
    
    qrBoxEntree.innerHTML = '';
    qrBoxBarre.innerHTML = '';
    
    qrEntree = new QRCode(qrBoxEntree, {
        text: JSON.stringify(dataEntree),
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
    
    qrBarre = new QRCode(qrBoxBarre, {
        text: JSON.stringify(dataBarre),
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
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

// ===== SCANNER LOGIC =====
// ===== SCANNER LOGIC =====
let html5QrCode = null;
let currentFacingMode = "environment";
let isProcessing = false;

function startScanner() {
    if (!document.getElementById('qr-reader')) return;
    
    document.getElementById('scan-status').textContent = "Ouverture de la caméra...";
    document.getElementById('restart-scan-btn').style.display = 'none';
    isProcessing = false;
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }
    
    if (html5QrCode.isScanning) {
        return;
    }
    
    // Configuration optimisée pour une détection plus rapide
    const config = { 
        fps: 15, 
        qrbox: function(viewfinderWidth, viewfinderHeight) {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
        }
    };
    
    html5QrCode.start(
        { facingMode: currentFacingMode },
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        document.getElementById('scan-status').textContent = "Prêt à scanner ! Approchez le QR Code.";
        document.getElementById('flip-camera-btn').style.display = 'inline-flex';
    }).catch(err => {
        console.error("Scanner init error", err);
        // Fallback sans imposer la caméra arrière
        html5QrCode.start(
            { facingMode: "user" },
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            currentFacingMode = "user";
            document.getElementById('scan-status').textContent = "Caméra frontale (arrière non trouvée). Prêt !";
            document.getElementById('flip-camera-btn').style.display = 'inline-flex';
        }).catch(e => {
            document.getElementById('scan-status').textContent = "Erreur d'accès à la caméra. Vérifiez les permissions.";
        });
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('flip-camera-btn').style.display = 'none';
        }).catch(err => console.error(err));
    }
}

function flipCamera() {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            startScanner();
        }).catch(err => {
            console.error("Failed to stop and flip camera", err);
        });
    }
}

function restartScanning() {
    isProcessing = false;
    document.getElementById('restart-scan-btn').style.display = 'none';
    document.getElementById('scan-status').textContent = "Prêt à scanner !";
    
    try {
        html5QrCode.resume();
    } catch(e) {
        startScanner();
    }
}

let pendingPayload = null;
let pendingData = null;

async function onScanSuccess(decodedText, decodedResult) {
    if (isProcessing) return;
    
    let data = null;
    try {
        data = JSON.parse(decodedText);
    } catch(e) {
        return; 
    }

    if (!data || !data.type || !data.userId) {
        return;
    }

    isProcessing = true;
    
    try {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.pause(true); 
        }
    } catch(e) { console.warn(e); }
    
    const readerEl = document.getElementById('qr-reader');
    readerEl.style.transition = "opacity 0.1s";
    readerEl.style.opacity = "0.5";
    setTimeout(() => { readerEl.style.opacity = "1"; }, 100);
    
    pendingPayload = {
        name: "entree_barre",
        value: "entree_barre.01",
        scan_type: data.type,
        user_id: data.userId,
        user_name: data.userName,
        club_name: data.clubName
    };
    pendingData = data;
    
    document.getElementById('scan-status').innerHTML = `
        <div style="margin-top: 8px;"><strong>QR ${data.type === 'barre' ? 'Bar' : 'Entrée'}</strong> détecté pour <strong>${data.userName}</strong></div>
        <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
            <button class="btn-primary" style="background-color: var(--success); width: auto; padding: 10px 20px;" onclick="sendWebhook()">Valider</button>
            <button class="btn-secondary" style="background-color: rgba(255,255,255,0.1); color: white; border: 1px solid var(--border); border-radius: 8px; width: auto; padding: 10px 20px; cursor: pointer;" onclick="restartScanning()">Annuler</button>
        </div>
    `;
    document.getElementById('restart-scan-btn').style.display = 'none';
}

async function sendWebhook() {
    if (!pendingPayload) return;
    
    document.getElementById('scan-status').innerHTML = "Envoi au serveur en cours...";
    
    await fetch('https://n8n.srv862127.hstgr.cloud/webhook/entree_barre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPayload)
    }).catch(e => console.error('Webhook error', e));
    
    let isBarre = (pendingData.type === 'barre');
    
    if (isBarre) {
        document.getElementById('result-user-name').textContent = pendingData.userName;
        document.getElementById('result-drinks').textContent = Math.floor(Math.random() * 5) + 1;
        document.getElementById('result-points').textContent = Math.floor(Math.random() * 100) + 20;
        document.getElementById('scan-result-modal').classList.add('active');
        document.getElementById('scan-status').textContent = "Validation réussie, bilan affiché.";
    } else {
        document.getElementById('scan-status').textContent = `Entrée validée et envoyée pour ${pendingData.userName} (+1)`;
    }
    
    document.getElementById('restart-scan-btn').style.display = 'inline-block';
    
    pendingPayload = null;
    pendingData = null;
}

function onScanFailure(error) {
    // Ignore les erreurs de frames vides
}
