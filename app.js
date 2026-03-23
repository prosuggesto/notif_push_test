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

function generateUserCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
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
            const userCode = data.user_code || data.code || generateUserCode();
            
            // Identify user in OneSignal if we have an ID
            if (window.OneSignal && userId) {
                console.log("Identifying OneSignal user with ID:", userId);
                OneSignal.login(userId);
            }

            const userData = { 
                name: data.nom || 'Utilisateur', 
                uuid: userId,
                code: userCode,
                age: data.age,
                sexe: data.sexe,
                city: data.ville
            };
            localStorage.setItem('user', JSON.stringify(userData));
            setTimeout(() => { showDashboard(userData.name); }, 800);
        }
    } catch (err) {
        console.error('Login webhook error:', err);
        showMessage('login-message', 'Erreur de connexion au serveur.', 'error');
    } finally {
        setLoading('login-btn', false);
    }
}

function selectGender(value) {
    document.getElementById('signup-sexe').value = value;
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
    });
}

// ===== SIGNUP HANDLER =====
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const age = document.getElementById('signup-age').value.trim();
    const sexe = document.getElementById('signup-sexe').value;
    const city = document.getElementById('signup-city').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    if (!name || !password || !age || !sexe || !city) {
        showMessage('signup-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    setLoading('signup-btn', true);
    showMessage('signup-message', '', '');

    const uuid = generateUUID();
    const userCode = generateUserCode();

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
                uuid: uuid,
                user_code: userCode,
                age: age,
                sexe: sexe,
                ville: city
            })
        });

        const raw = await response.json().catch(() => null);
        const data = Array.isArray(raw) ? raw[0] : raw;

        if (!data) {
            showMessage('signup-message', 'Erreur: impossible de lire la réponse du serveur.', 'error');
        } else if (data.statut === 'invalid') {
            showMessage('signup-message', data.phrase || 'Inscription refusée.', 'error');
        } else {
            showMessage('signup-message', 'Inscription réussie ! Redirection...', 'success');
            
            if (window.OneSignal) {
                OneSignal.login(uuid);
            }

            const userData = { 
                name: name, 
                uuid: uuid, 
                code: userCode,
                age: age,
                sexe: sexe,
                city: city
            };
            localStorage.setItem('user', JSON.stringify(userData));
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
    localStorage.removeItem('user');
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
    // Initialize filters data
    initFilters();

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
        const stored = localStorage.getItem('user');
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
        menRatio: 45,
        womenRatio: 50,
        nbRatio: 5,
        price: '25€ (avec conso)',
        theme: 'Années 80 Full Red',
        nightDesc: 'Soirée spéciale revival avec DJ Guest de Londres. Spectacle pyrotechnique à minuit.',
        generalDesc: 'La plus grande boîte de nuit de la région avec 3 salles, 5 bars et un carré VIP exclusif.',
        instagram: '@macumba_officiel',
        city: 'Genève',
        region: 'Grand Genève',
        country: 'Suisse'
    },
    {
        id: 'club-2',
        name: 'L\'Atrium',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
        status: 'closed',
        count: 0,
        vibe: '💤 Calme',
        menRatio: 55,
        womenRatio: 40,
        nbRatio: 5,
        price: '15€',
        theme: 'Deep Into Detroit',
        nightDesc: 'Pas d\'événements prévus ce soir. Ouverture demain 23h.',
        generalDesc: 'Club intimiste spécialisé dans la musique électronique underground et techno mélodique.',
        instagram: '@atrium_club',
        city: 'Lyon',
        region: 'Rhône-Alpes',
        country: 'France'
    },
    {
        id: 'club-3',
        name: 'Le Palace',
        image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=500&q=80',
        status: 'open',
        count: 850,
        vibe: '🎉 Plein à craquer',
        menRatio: 48,
        womenRatio: 48,
        nbRatio: 4,
        price: '30€',
        theme: 'Gala de Printemps',
        nightDesc: 'Dress code élégant exigé. Champagne offert aux groupes de 5 femmes avant minuit.',
        generalDesc: 'Lieu historique de la nuit parisienne, réputé pour son acoustique et ses soirées mondaines.',
        instagram: '@palace_paris',
        city: 'Paris',
        region: 'Île-de-France',
        country: 'France'
    }
];

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

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
    const link = document.getElementById(`link-${viewId}`);
    if (link) link.classList.add('active');
    
    let title = 'Boîtes Partenaires';
    if (viewId === 'qr') title = 'Générateur QR';
    if (viewId === 'code') title = 'Profil Client';
    if (viewId === 'verify') title = 'Vérification';
    
    document.getElementById('header-title').textContent = title;
    
    if (viewId === 'code') {
        renderProfile();
    }
    
    // Fermer le menu si ouvert
    const menu = document.getElementById('side-menu');
    if (menu.classList.contains('open')) {
        toggleMenu();
    }
}

function renderProfile() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    document.getElementById('profile-initials').textContent = initials;
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-city').textContent = user.city || 'Ville non renseignée';
    document.getElementById('display-user-code').textContent = user.code || '------';

    // Mock points per club for demonstration
    const clubPointsContainer = document.getElementById('per-club-points');
    clubPointsContainer.innerHTML = '';
    
    // In a real app, this would come from the user's data in the backend
    const mockPoints = [
        { name: 'Le Macumba', points: 150 },
        { name: 'Le Palace', points: 45 }
    ];

    if (mockPoints.length === 0) {
        clubPointsContainer.innerHTML = '<p class="text-dim">Aucun point cumulé pour le moment.</p>';
    } else {
        mockPoints.forEach(cp => {
            clubPointsContainer.innerHTML += `
                <div class="club-point-item">
                    <span>${cp.name}</span>
                    <strong>${cp.points} pts</strong>
                </div>
            `;
        });
    }
}

function renderClubs(filteredList = null) {
    const list = filteredList || nightclubs;
    const container = document.getElementById('clubs-container');
    container.innerHTML = '';
    
    list.forEach(club => {
        const isFav = favorites.includes(club.id);
        const statusText = club.status === 'open' ? 'Ouvert' : 'Fermé';
        
        container.innerHTML += `
            <div class="club-card" onclick="openClubModal('${club.id}')">
                <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${club.id}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                </button>
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
                    <div class="club-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${club.city}, ${club.country}
                    </div>
                </div>
            </div>
        `;
    });

    renderFavorites();
}

function renderFavorites() {
    const section = document.getElementById('favorites-section');
    const container = document.getElementById('favorites-container');
    
    if (favorites.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = '';
    
    favorites.forEach(id => {
        const club = nightclubs.find(c => c.id === id);
        if (!club) return;
        
        container.innerHTML += `
            <div class="fav-mini-card" onclick="openClubModal('${club.id}')">
                <img src="${club.image}" alt="${club.name}">
                <div class="fav-mini-info">
                    <h4>${club.name}</h4>
                    <span>${club.vibe}</span>
                </div>
            </div>
        `;
    });
}

function toggleFavorite(clubId) {
    if (favorites.includes(clubId)) {
        favorites = favorites.filter(id => id !== clubId);
    } else {
        favorites.push(clubId);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    filterClubs(); // Re-render everything
}

function filterClubs() {
    const search = document.getElementById('club-search').value.toLowerCase();
    const city = document.getElementById('filter-city').value;
    const region = document.getElementById('filter-region').value;
    const country = document.getElementById('filter-country').value;
    
    const filtered = nightclubs.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search) || c.generalDesc.toLowerCase().includes(search);
        const matchesCity = !city || c.city === city;
        const matchesRegion = !region || c.region === region;
        const matchesCountry = !country || c.country === country;
        return matchesSearch && matchesCity && matchesRegion && matchesCountry;
    });
    
    renderClubs(filtered);
}

function initFilters() {
    const cities = [...new Set(nightclubs.map(c => c.city))];
    const regions = [...new Set(nightclubs.map(c => c.region))];
    const countries = [...new Set(nightclubs.map(c => c.country))];
    
    const populate = (id, items) => {
        const el = document.getElementById(id);
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            el.appendChild(opt);
        });
    };
    
    populate('filter-city', cities);
    populate('filter-region', regions);
    populate('filter-country', countries);
}

function openClubModal(clubId) {
    const club = nightclubs.find(c => c.id === clubId);
    if (!club) return;
    
    const thresholds = JSON.parse(localStorage.getItem('notificationThresholds')) || {};
    const currentThreshold = thresholds[clubId] || 50;

    document.getElementById('modal-club-name').textContent = club.name;
    
    const body = document.querySelector('#club-modal .modal-body');
    body.innerHTML = `
        <div class="modal-club-hero" style="background-image: url('${club.image}')">
            <div class="hero-overlay">
                <span class="vibe-badge">${club.vibe}</span>
            </div>
        </div>
        
        <div class="modal-content-inner">
            <div class="detail-section">
                <h4>À propos de l'établissement</h4>
                <p class="text-dim">${club.generalDesc}</p>
                <a href="https://instagram.com/${club.instagram.replace('@','')}" target="_blank" class="insta-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    ${club.instagram}
                </a>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Entrée</span>
                    <span class="detail-val">${club.price}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Public</span>
                    <span class="detail-val">${club.count} pers.</span>
                </div>
            </div>

            <div class="gender-breakdown">
                <div class="gender-bar">
                    <div class="bar-segment men" style="width: ${club.menRatio}%" title="Hommes"></div>
                    <div class="bar-segment women" style="width: ${club.womenRatio}%" title="Femmes"></div>
                    <div class="bar-segment nb" style="width: ${club.nbRatio}%" title="Non-binaires"></div>
                </div>
                <div class="gender-labels">
                    <span>♂ ${club.menRatio}%</span>
                    <span>♀ ${club.womenRatio}%</span>
                    <span>⚧ ${club.nbRatio}%</span>
                </div>
            </div>

            <hr class="modal-hr">

            <div class="detail-section">
                <div class="theme-header">
                    <span class="theme-tag">SOIRÉE ACTUELLE</span>
                    <h4>${club.theme}</h4>
                </div>
                <p class="text-small">${club.nightDesc}</p>
            </div>
            
            <div class="affluence-threshold">
                <div class="threshold-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span>Seuil d'alerte d'affluence</span>
                </div>
                <div class="threshold-input-group">
                    <p>M'envoyer une notification quand l'affluence dépasse :</p>
                    <div class="t-wrapper">
                        <input type="number" id="threshold-${club.id}" value="${currentThreshold}" min="1" max="5000" onchange="saveThreshold('${club.id}', this.value)">
                        <span>personnes</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('club-modal').classList.add('active');
}

function saveThreshold(clubId, value) {
    const thresholds = JSON.parse(localStorage.getItem('notificationThresholds')) || {};
    thresholds[clubId] = parseInt(value);
    localStorage.setItem('notificationThresholds', JSON.stringify(thresholds));
    console.log(`Threshold for ${clubId} set to ${value}`);
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
    
    // Forcer l'URL de production (Vercel) pour éviter que l'appareil photo ne lance une recherche Google
    // si l'application est ouverte localement (file://).
    const baseUrl = 'https://notif-push-test.vercel.app/';
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
let currentScanData = null;

async function handleNativeScan() {
    const params = new URLSearchParams(window.location.search);
    const clubId = params.get('clubId');
    const type = params.get('type') || 'entree';
    const club = nightclubs.find(c => c.id === clubId);
    
    if (!club) return;
    
    currentScanData = { club, type };
    
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    const stored = localStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    
    switchMainView('verify');
    document.getElementById('verify-club-name').textContent = club.name;
    document.getElementById('verify-scan-type').textContent = `Validation ${type === 'entree' ? 'Entrée' : 'Bar'}`;
    
    if (user) {
        document.getElementById('logged-flow').style.display = 'block';
        document.getElementById('guest-flow').style.display = 'none';
        // Auto-fill code if possible for convenience but let them click submit
        document.getElementById('verification-code-input').value = ''; 
    } else {
        document.getElementById('logged-flow').style.display = 'none';
        document.getElementById('guest-flow').style.display = 'block';
    }
}

async function submitVerificationCode() {
    const codeInput = document.getElementById('verification-code-input').value.trim().toUpperCase();
    const userStr = localStorage.getItem('user');
    const user = JSON.parse(userStr);
    
    if (codeInput !== user.code) {
        alert("Code incorrect. Veuillez vérifier votre code dans la rubrique 'Mon Code'.");
        return;
    }
    
    const payload = {
        name: "entree_barre",
        value: "entree_barre.01",
        scan_type: currentScanData.type,
        club_name: currentScanData.club.name,
        user_id: user.uuid,
        user_name: user.name,
        user_code: codeInput,
        action: "add 1"
    };
    
    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/entree_barre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        alert(`✅ Validé : Passage enregistré chez ${currentScanData.club.name} !`);
        switchMainView('home');
    } catch(e) {
        console.error('Webhook error', e);
        alert("Erreur lors de la validation. Réessayez.");
    }
}

async function handleNoCode() {
    const payload = {
        name: "entree_barre",
        value: "entree_barre.01",
        scan_type: currentScanData.type,
        club_name: currentScanData.club.name,
        action: "add 1"
    };
    
    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/entree_barre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        alert(`✅ +1 Validé chez ${currentScanData.club.name} !\n\n👉 Créez un compte pour profiter de vos avantages.`);
        switchMainView('home');
        switchTab('signup');
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('dashboard-screen').classList.remove('active');
    } catch(e) {
        console.error('Webhook error', e);
        switchMainView('home');
    }
}
