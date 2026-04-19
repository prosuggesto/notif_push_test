let currentBusiness = JSON.parse(localStorage.getItem('businessUser')) || null;

// ===== GLOBAL TOAST NOTIFICATION =====
function showGlassToast(message, type = 'error', duration = 4000) {
    let toast = document.getElementById('glass-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'glass-toast';
        toast.className = 'glass-toast';
        toast.innerHTML = '<div class="toast-icon"></div><span class="toast-msg"></span>';
        document.body.appendChild(toast);
    }
    toast.className = `glass-toast ${type}`;
    toast.querySelector('.toast-icon').textContent = type === 'error' ? '!' : '\u2713';
    toast.querySelector('.toast-msg').textContent = message;
    requestAnimationFrame(() => toast.classList.add('active'));
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('active'), duration);
}

// Initialize View on Load
document.addEventListener('DOMContentLoaded', async () => {
    const isBusinessView = document.body.classList.contains('view-entreprise');
    const fetarsEl = document.getElementById('fetars-view');
    const entrepriseEl = document.getElementById('entreprise-view');
    const bizAuthScreen = document.getElementById('business-auth-screen');

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    console.log('App Init - isBusinessView:', isBusinessView, 'Action:', action);

    // Handle OAuth callback (Google login redirect)
    const oauthSession = supabase.auth.getSessionFromUrl();
    if (oauthSession) {
        await handleOAuthCallback(isBusinessView);
        return;
    }

    if (isBusinessView) {
        // Mode Entreprise
        if (fetarsEl) fetarsEl.style.display = 'none';
        if (entrepriseEl) entrepriseEl.style.display = 'block';

        // Guard: verify stored businessUser matches the currently authenticated JWT.
        // This prevents cross-account session leakage (e.g. logged in as client Diego,
        // then re-opened as business le joselina — old businessUser remained in LS).
        const validToken = await supabase.auth.getValidToken();
        if (currentBusiness) {
            if (!validToken) {
                console.warn('businessUser present but no valid auth token — forcing re-login');
                localStorage.removeItem('businessUser');
                currentBusiness = null;
            } else {
                const authUser = await supabase.auth.getUser();
                if (!authUser || !authUser.id || authUser.id !== currentBusiness.uuid) {
                    console.warn('businessUser UUID does not match authenticated user — forcing re-login', {
                        expected: currentBusiness.uuid,
                        actual: authUser && authUser.id
                    });
                    localStorage.removeItem('businessUser');
                    // Also clear any stale client session to avoid cross-contamination
                    localStorage.removeItem('user');
                    await supabase.auth.signOut();
                    currentBusiness = null;
                }
            }
        }

        // Use the globally defined currentBusiness
        if (currentBusiness) {
            showBusinessDashboard();
        } else {
            if (bizAuthScreen) {
                bizAuthScreen.classList.add('active');
                bizAuthScreen.style.display = 'flex';
            }
        }
    } else {
        // Mode Client (Fetars)
        if (fetarsEl) fetarsEl.style.display = 'block';
        if (entrepriseEl) entrepriseEl.style.display = 'none';

        // Same guard pattern for client localStorage: ensure stored `user.uuid`
        // matches the authenticated JWT, otherwise clear it.
        const stored = localStorage.getItem('user');
        if (stored) {
            const storedUser = JSON.parse(stored);
            const validToken = await supabase.auth.getValidToken();
            if (!validToken) {
                console.warn('user present but no valid auth token — clearing');
                localStorage.removeItem('user');
            } else {
                const authUser = await supabase.auth.getUser();
                if (!authUser || !authUser.id || (storedUser.uuid && authUser.id !== storedUser.uuid)) {
                    console.warn('user UUID does not match authenticated user — clearing', {
                        expected: storedUser.uuid,
                        actual: authUser && authUser.id
                    });
                    localStorage.removeItem('user');
                    localStorage.removeItem('businessUser');
                    await supabase.auth.signOut();
                }
            }
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'scan' || params.get('clubId')) {
            handleNativeScan();
        } else {
            const freshStored = localStorage.getItem('user');
            if (freshStored) {
                const user = JSON.parse(freshStored);
                showDashboard(user.name || 'Utilisateur');
            }
        }
    }

    // Handle ?action=signup
    if (action === 'signup') {
        if (isBusinessView) {
            switchBizTab('signup');
        } else {
            switchTab('signup');
        }
    }

    // Remove loading state
    document.body.classList.remove('view-loading');
});

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
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        showMessage('login-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    setLoading('login-btn', true);
    showMessage('login-message', '', '');

    try {
        const authData = await supabase.auth.signIn(email, password);
        supabase.auth._saveSession(authData);

        const userId = authData.user.id;

        // Fetch profile from profiles_users
        const profiles = await supabase.select('profiles_users', `id=eq.${userId}`);
        const profile = profiles[0] || {};

        if (window.OneSignal && userId) {
            OneSignal.login(userId);
        }

        const userData = {
            name: profile.nom || authData.user.email,
            uuid: userId,
            age: profile.age,
            sexe: profile.sexe,
            city: profile.ville,
            country: profile.pays
        };
        localStorage.setItem('user', JSON.stringify(userData));
        showMessage('login-message', 'Connexion validée !', 'success');
        setTimeout(() => { showDashboard(userData.name); }, 300);
    } catch (err) {
        console.error('Login error:', err);
        showMessage('login-message', err.message || 'Erreur de connexion.', 'error');
    } finally {
        setLoading('login-btn', false);
    }
}

// ===== OAUTH CALLBACK HANDLER =====
// Pending OAuth user while the enrichment form is shown (so handlers can access it
// without re-fetching from the auth endpoint).
let pendingOAuthUser = null;

async function handleOAuthCallback(isBusinessView) {
    try {
        const user = await supabase.auth.getUser();
        if (!user) return;

        const userId = user.id;
        const fullName = user.user_metadata?.full_name || user.email;

        if (isBusinessView) {
            let profiles = [];
            try { profiles = await supabase.select('profiles_business', `id=eq.${userId}`); } catch(e) {}

            if (profiles.length === 0) {
                // No profile = show enrichment form instead of signing out.
                // The auth.users row created by Google stays — we'll attach a
                // profile to it once the user fills the missing fields.
                showOAuthEnrichScreen(user, true);
                return;
            }
            const profile = profiles[0];
            currentBusiness = {
                name: profile.nom_boite || fullName,
                uuid: userId,
                city: profile.ville,
                country: profile.pays
            };
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            showBusinessDashboard();
        } else {
            let profiles = [];
            try { profiles = await supabase.select('profiles_users', `id=eq.${userId}`); } catch(e) {}

            if (profiles.length === 0) {
                // No profile = show enrichment form instead of signing out.
                showOAuthEnrichScreen(user, false);
                return;
            }
            const profile = profiles[0];
            const userData = {
                name: profile.nom || fullName,
                uuid: userId,
                age: profile.age,
                sexe: profile.sexe,
                city: profile.ville,
                country: profile.pays
            };
            localStorage.setItem('user', JSON.stringify(userData));
            showDashboard(userData.name);
        }
    } catch (err) {
        console.error('OAuth callback error:', err);
    }
}

// Display the enrichment form pre-filled with the data Google provided.
function showOAuthEnrichScreen(user, isBusinessView) {
    pendingOAuthUser = user;
    const fullName = user.user_metadata?.full_name || '';
    const email = user.email || '';

    if (isBusinessView) {
        const bizAuthScreen = document.getElementById('business-auth-screen');
        if (bizAuthScreen) {
            bizAuthScreen.classList.add('active');
            bizAuthScreen.style.display = 'flex';
        }
        // Hide login + signup + tabs, show enrichment
        const loginForm = document.getElementById('business-login-form');
        const signupForm = document.getElementById('business-signup-form');
        const enrichForm = document.getElementById('biz-oauth-enrich-form');
        const tabs = document.querySelector('#business-auth-screen .auth-tabs');
        if (loginForm) { loginForm.classList.remove('active'); loginForm.style.display = 'none'; }
        if (signupForm) { signupForm.classList.remove('active'); signupForm.style.display = 'none'; }
        if (tabs) tabs.style.display = 'none';
        if (enrichForm) {
            enrichForm.classList.add('active');
            enrichForm.style.display = 'flex';
        }
        const emailEl = document.getElementById('biz-oauth-enrich-email');
        const nameEl = document.getElementById('biz-oauth-enrich-name');
        if (emailEl) emailEl.value = email;
        if (nameEl && fullName && !nameEl.value) nameEl.value = fullName;
    } else {
        const authScreen = document.getElementById('auth-screen');
        if (authScreen) {
            authScreen.classList.add('active');
            authScreen.style.display = 'flex';
        }
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const enrichForm = document.getElementById('oauth-enrich-form');
        const tabs = document.querySelector('#auth-screen .tab-switcher');
        if (loginForm) { loginForm.classList.remove('active'); loginForm.style.display = 'none'; }
        if (signupForm) { signupForm.classList.remove('active'); signupForm.style.display = 'none'; }
        if (tabs) tabs.style.display = 'none';
        if (enrichForm) {
            enrichForm.classList.add('active');
            enrichForm.style.display = 'flex';
        }
        const emailEl = document.getElementById('oauth-enrich-email');
        const nameEl = document.getElementById('oauth-enrich-name');
        if (emailEl) emailEl.value = email;
        if (nameEl && fullName) nameEl.value = fullName;
    }
    // Clear loading overlay if any
    document.body.classList.remove('view-loading');
}

function selectOAuthEnrichGender(value) {
    const hidden = document.getElementById('oauth-enrich-sexe');
    const label = document.getElementById('oauth-enrich-selected-gender');
    const dropdown = document.getElementById('oauth-enrich-gender-dropdown');
    if (hidden) hidden.value = value;
    if (label) label.textContent = value;
    if (dropdown) dropdown.classList.remove('active');
}

// Finalize client (fêtard) signup after OAuth: INSERT into profiles_users with
// the existing auth UUID. No signUp call → no "compte existe déjà" error.
async function handleOAuthEnrichClient(e) {
    e.preventDefault();
    if (!pendingOAuthUser) {
        showMessage('oauth-enrich-message', 'Session expirée, recommencez.', 'error');
        return;
    }
    const name = document.getElementById('oauth-enrich-name').value.trim();
    const age = document.getElementById('oauth-enrich-age').value.trim();
    const sexe = document.getElementById('oauth-enrich-sexe').value;
    const city = document.getElementById('oauth-enrich-city').value.trim();
    const country = document.getElementById('oauth-enrich-country').value.trim();

    if (!name || !age || !sexe || !city || !country) {
        showMessage('oauth-enrich-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    setLoading('oauth-enrich-btn', true);
    showMessage('oauth-enrich-message', '', '');

    try {
        const userId = pendingOAuthUser.id;
        await supabase.insert('profiles_users', {
            id: userId,
            nom: name,
            age: parseInt(age),
            sexe: sexe,
            ville: city,
            pays: country
        });

        if (window.OneSignal) {
            OneSignal.login(userId);
        }

        const userData = {
            name: name,
            uuid: userId,
            age: age,
            sexe: sexe,
            city: city,
            country: country
        };
        localStorage.setItem('user', JSON.stringify(userData));
        pendingOAuthUser = null;
        showMessage('oauth-enrich-message', 'Inscription réussie ! Redirection...', 'success');
        setTimeout(() => { showDashboard(name); }, 600);
    } catch (err) {
        console.error('OAuth enrich client error:', err);
        showMessage('oauth-enrich-message', err.message || 'Erreur lors de la finalisation.', 'error');
    } finally {
        setLoading('oauth-enrich-btn', false);
    }
}

// Finalize business signup after OAuth.
async function handleOAuthEnrichBusiness(e) {
    e.preventDefault();
    if (!pendingOAuthUser) {
        const msg = document.getElementById('biz-oauth-enrich-message');
        if (msg) { msg.textContent = 'Session expirée, recommencez.'; msg.className = 'form-message error'; }
        return;
    }
    const name = document.getElementById('biz-oauth-enrich-name').value.trim();
    const bizCity = document.getElementById('biz-oauth-enrich-city').value.trim();
    const bizCountry = document.getElementById('biz-oauth-enrich-country').value.trim();
    const btn = document.getElementById('biz-oauth-enrich-btn');
    const msg = document.getElementById('biz-oauth-enrich-message');

    if (!name || !bizCity || !bizCountry) {
        if (msg) { msg.textContent = 'Veuillez remplir tous les champs.'; msg.className = 'form-message error'; }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Création en cours...';

    try {
        const userId = pendingOAuthUser.id;
        await supabase.insert('profiles_business', {
            id: userId,
            nom_boite: name,
            ville: bizCity,
            pays: bizCountry
        });

        currentBusiness = {
            name: name,
            uuid: userId,
            city: bizCity,
            country: bizCountry
        };
        localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
        pendingOAuthUser = null;
        if (msg) { msg.textContent = 'Inscription réussie ! Redirection...'; msg.className = 'form-message success'; }
        setTimeout(() => showBusinessDashboard(), 300);
    } catch (error) {
        if (msg) { msg.textContent = 'Erreur: ' + error.message; msg.className = 'form-message error'; }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Finaliser mon inscription';
    }
}

// Cancel enrichment: delete the dangling auth.users row via self-service RPC,
// sign out, and return to the login view. Requires the SQL function
// public.delete_my_auth_user() to be installed in Supabase.
async function cancelOAuthEnrich(isBusinessView) {
    try {
        try { await supabase.rpc('delete_my_auth_user'); } catch (e) { console.warn('delete_my_auth_user failed:', e); }
        await supabase.auth.signOut();
    } finally {
        pendingOAuthUser = null;
        // Reload the page to cleanly return to the login view
        window.location.href = window.location.pathname;
    }
}

function toggleDropdown(id) {
    document.getElementById(id).classList.toggle('active');
}

function selectGenderOption(value) {
    document.getElementById('signup-sexe').value = value;
    document.getElementById('selected-gender').textContent = value;
    document.getElementById('gender-dropdown').classList.remove('active');
}

// Global listener to close dropdowns when clicking outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper').forEach(d => d.classList.remove('active'));
    }
});

// ===== BUSINESS LOGIC =====
function switchBizTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('business-login-form').classList.toggle('active', isLogin);
    document.getElementById('business-signup-form').classList.toggle('active', !isLogin);
    
    const tabs = document.querySelectorAll('#business-auth-screen .tab-btn');
    tabs[0].classList.toggle('active', isLogin);
    tabs[1].classList.toggle('active', !isLogin);
    
    document.getElementById('biz-tab-indicator').style.transform = isLogin ? 'translateX(0)' : 'translateX(100%)';
}

// Sidebar Toggle for Universal Burger Menu
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const burger = document.getElementById('sidebar-toggle');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && burger) {
        sidebar.classList.toggle('active');
        burger.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }
}

function handleBusinessLogout() {
    supabase.auth.signOut();
    localStorage.removeItem('businessUser');
    document.body.classList.remove('logged-in-biz');
    location.reload();
}

async function handleBusinessSignup(e) {
    e.preventDefault();
    const name = document.getElementById('biz-signup-name').value.trim();
    const email = document.getElementById('biz-signup-email').value.trim();
    const bizCity = document.getElementById('biz-signup-city')?.value.trim() || '';
    const bizCountry = document.getElementById('biz-signup-country')?.value.trim() || '';
    const password = document.getElementById('biz-signup-password').value.trim();
    const btn = document.getElementById('biz-signup-btn');
    const msg = document.getElementById('biz-signup-message');

    if (!name || !email || !password || !bizCity || !bizCountry) {
        showMessage('biz-signup-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Création en cours...';

    try {
        // 1. Create auth user in Supabase Auth
        const authData = await supabase.auth.signUp(email, password, {
            full_name: name,
            role: 'business'
        });
        supabase.auth._saveSession(authData);

        const userId = authData.user.id;

        // 2. Insert profile in profiles_business
        await supabase.insert('profiles_business', {
            id: userId,
            nom_boite: name,
            ville: bizCity,
            pays: bizCountry
        });

        currentBusiness = {
            name: name,
            uuid: userId,
            city: bizCity,
            country: bizCountry
        };
        localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
        msg.textContent = 'Inscription réussie ! Redirection...';
        msg.className = 'form-message success';
        setTimeout(() => showBusinessDashboard(), 200);
    } catch (error) {
        msg.textContent = 'Erreur: ' + error.message;
        msg.className = 'form-message error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Créer mon compte entreprise';
    }
}

async function handleBusinessLogin(e) {
    e.preventDefault();
    const email = document.getElementById('biz-login-email').value.trim();
    const password = document.getElementById('biz-login-password').value.trim();
    const btn = document.getElementById('biz-login-btn');
    const msg = document.getElementById('biz-login-message');

    if (!email || !password) {
        showMessage('biz-login-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Connexion...';

    try {
        const authData = await supabase.auth.signIn(email, password);
        supabase.auth._saveSession(authData);

        const userId = authData.user.id;

        // Fetch business profile
        const profiles = await supabase.select('profiles_business', `id=eq.${userId}`);
        const profile = profiles[0] || {};

        currentBusiness = {
            name: profile.nom_boite || 'Club Partenaire',
            uuid: userId,
            city: profile.ville,
            country: profile.pays
        };
        localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
        showBusinessDashboard();
    } catch (error) {
        msg.textContent = 'Erreur: ' + error.message;
        msg.className = 'form-message error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Se connecter';
    }
}

let selectedDates = new Set();
let lastFoundClient = null;



// ===== COMMANDE MODULE =====
let selectedCommandeRewards = [];
let selectedCommandeProducts = [];
let bizRewards = [];
let pendingRewardImageFile = null;
let pendingAnnonceImageFile = null;

// searchClientForCommande replaced by QR scanner (startClientScanner)

function updateAnnoncesPreview() {
    const previewContainer = document.getElementById('annonces-preview-card');
    if (!previewContainer) return;

    // Get current values
    const clubName = document.getElementById('biz-club-name-hidden')?.value || (currentBusiness ? currentBusiness.name : 'Mon Club');
    const image = document.getElementById('biz-club-image').value || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=2070&auto=format&fit=crop';
    const insta = document.getElementById('biz-club-insta').value || t('biz.default_insta');
    const desc = document.getElementById('biz-club-desc').value || t('biz.no_description');
    const price = document.getElementById('biz-club-price')?.value || '20€';
    const partyName = document.getElementById('biz-party-name').value || t('biz.default_party_name');
    const partyTheme = document.getElementById('biz-party-theme').value || t('biz.default_party_theme');

    // Mock stats (ReadOnly)
    const stats = {
        vibe: 'TRENDY',
        count: 110,
        men: 45,
        women: 40,
        nb: 15
    };

    previewContainer.innerHTML = `
        <div class="modal-club-hero editable-hero" style="background-image: url('${image}')">
            <div class="hero-overlay" onclick="document.getElementById('biz-club-image-input').click()">
                <span class="vibe-badge">${stats.vibe}</span>
                <div class="hero-edit-hint">📷 ${t('biz.change_image')}</div>
            </div>
            <div class="editable-text club-hero-name" contenteditable="true" data-field="biz-club-name-hidden">
                ${clubName}
            </div>
        </div>
        
        <div class="modal-content-inner">
            <div class="detail-section">
                <h4>${t('biz.about_venue')}</h4>
                <p class="text-dim editable-text" contenteditable="true" data-field="biz-club-desc" data-multi="true">${desc}</p>
                <div class="insta-link-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    <span class="editable-text" contenteditable="true" data-field="biz-club-insta">${insta}</span>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">${t('biz.entry_price')}</span>
                    <span class="detail-val editable-text" contenteditable="true" data-field="biz-club-price">${price}</span>
                </div>
                <div class="detail-item read-only biz-anchor-public">
                    <span class="detail-label">${t('biz.public_live')}</span>
                    <span class="detail-val">${stats.count} pers.</span>
                </div>
            </div>

            <div class="gender-breakdown" style="padding: 0;">
                <div class="gender-bar">
                    <div class="bar-segment men" style="width: ${stats.men}%"></div>
                    <div class="bar-segment women" style="width: ${stats.women}%"></div>
                    <div class="bar-segment nb" style="width: ${stats.nb}%"></div>
                </div>
                <div class="gender-labels">
                    <span>♂ ${stats.men}%</span>
                    <span>♀ ${stats.women}%</span>
                    <span>⚧ ${stats.nb}%</span>
                </div>
            </div>

            <hr class="modal-hr">

            <div class="detail-section">
                <div class="theme-header">
                    <span class="theme-tag">${t('biz.current_party')}</span>
                    <h4 class="editable-text" contenteditable="true" data-field="biz-party-name">${partyName}</h4>
                </div>
                <p class="text-small editable-text" contenteditable="true" data-field="biz-party-theme">${partyTheme}</p>
            </div>
        </div>
    `;

    const defaultTexts = [
        (currentBusiness ? currentBusiness.name : 'Mon Club'),
        'Mon Club',
        t('biz.default_insta'),
        t('biz.no_description'),
        '20€',
        t('biz.default_party_name'),
        t('biz.default_party_theme')
    ];

    // Add event listeners to sync and clear contenteditable fields
    previewContainer.querySelectorAll('.editable-text').forEach(el => {
        // Clear on focus ONLY if it's default/placeholder text
        el.onfocus = (e) => {
            const currentText = e.target.innerText.trim();
            e.target.setAttribute('data-before', currentText);
            
            if (defaultTexts.includes(currentText)) {
                e.target.innerText = '';
                // For Instagram, if it was default, maybe leave the @? 
                // User said "le @ doit rester".
                if (e.target.getAttribute('data-field') === 'biz-club-insta') {
                    e.target.innerText = '@';
                }
            }
        };

        el.onblur = (e) => {
            const fieldId = e.target.getAttribute('data-field');
            const hiddenInput = document.getElementById(fieldId);
            let newText = e.target.innerText.trim();
            const oldText = e.target.getAttribute('data-before');

            // Instagram @ protection
            if (fieldId === 'biz-club-insta') {
                if (!newText.startsWith('@')) {
                    newText = '@' + newText;
                    e.target.innerText = newText;
                }
                if (newText === '@') {
                    newText = oldText;
                    e.target.innerText = oldText;
                }
            }

            if (newText === '' || newText === '@') {
                // Restore if empty
                e.target.innerText = oldText;
            } else if (hiddenInput) {
                // Sync to hidden input
                hiddenInput.value = newText;
                
                // Special case for club name
                if (fieldId === 'biz-club-name-hidden' && currentBusiness) {
                    currentBusiness.name = newText;
                }

                // Save draft for persistence
                saveAnnouncementDraft();
            }
        };

        // Prevent enter key from creating new lines in single-line fields
        el.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.target.getAttribute('data-multi')) {
                e.preventDefault();
                e.target.blur();
            }
        };
    });
}

// ----- Announcement Template Management -----
let announcementTemplates = [];

function initAnnouncementEditor() {
    // Load templates from current business profile
    if (currentBusiness && currentBusiness.announcementTemplates) {
        announcementTemplates = currentBusiness.announcementTemplates;
    } else {
        announcementTemplates = [];
    }

    // Load Draft if exists
    loadAnnouncementDraft();

    // Bind bulk delete button via JS (onclick attribute can be unreliable)
    const bulkBtn = document.getElementById('bulk-delete-btn');
    if (bulkBtn) {
        bulkBtn.onclick = function(e) {
            e.stopPropagation();
            e.preventDefault();
            handleBulkDelete();
        };
    }

    renderTemplatesGrid();
    updateAnnoncesPreview();
}

// ----- Draft Persistence -----
function saveAnnouncementDraft() {
    const draft = {
        image: document.getElementById('biz-club-image').value,
        name: document.getElementById('biz-club-name-hidden').value,
        insta: document.getElementById('biz-club-insta').value,
        description: document.getElementById('biz-club-desc').value,
        price: document.getElementById('biz-club-price').value,
        partyName: document.getElementById('biz-party-name').value,
        partyTheme: document.getElementById('biz-party-theme').value,
        timestamp: Date.now()
    };
    localStorage.setItem('announcementDraft', JSON.stringify(draft));
}

function loadAnnouncementDraft() {
    const stored = localStorage.getItem('announcementDraft');
    if (!stored) return;
    
    const draft = JSON.parse(stored);
    // Only load if it's less than 24h old (optional safety)
    if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) return;

    document.getElementById('biz-club-image').value = draft.image || '';
    document.getElementById('biz-club-name-hidden').value = draft.name || '';
    document.getElementById('biz-club-insta').value = draft.insta || '';
    document.getElementById('biz-club-desc').value = draft.description || '';
    document.getElementById('biz-club-price').value = draft.price || '';
    document.getElementById('biz-party-name').value = draft.partyName || '';
    document.getElementById('biz-party-theme').value = draft.partyTheme || '';
}

async function handleSaveTemplate(e) {
    if (e) e.preventDefault();
    const btn = e.target;
    
    // Show Prompt Modal for name
    showPromptModal('Nom du Template', 'Comment souhaitez-vous appeler ce template ?', (templateName) => {
        proceedWithSave(btn, templateName);
    });
}

async function proceedWithSave(btn, templateName) {
    btn.classList.add('loading');

    const templateData = {
        image: document.getElementById('biz-club-image').value,
        name: document.getElementById('biz-club-name-hidden').value,
        insta: document.getElementById('biz-club-insta').value,
        description: document.getElementById('biz-club-desc').value,
        price: document.getElementById('biz-club-price').value,
        title: templateName || '',
        partyName: document.getElementById('biz-party-name').value,
        partyTheme: document.getElementById('biz-party-theme').value,
        timestamp: new Date().toISOString()
    };

    if (editingTemplateId) {
        // Update existing template in place (local only — DB insert is for new
        // templates; edits stay in the existing row via Supabase policies if needed)
        const idx = announcementTemplates.findIndex(t => t.id === editingTemplateId);
        if (idx > -1) {
            announcementTemplates[idx] = { ...announcementTemplates[idx], ...templateData };
        }
        editingTemplateId = null;

        if (currentBusiness) {
            currentBusiness.announcementTemplates = announcementTemplates;
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
        }

        renderTemplatesGrid();
        btn.classList.remove('loading');
        showSaveToast();
        return;
    }

    // --- Create new template ---
    const previewCard = document.getElementById('annonces-preview-card');
    if (previewCard) {
        animateCardToGrid(previewCard);
    }

    if (!currentBusiness || !currentBusiness.uuid) {
        showGlassToast('Session entreprise invalide', 'error');
        btn.classList.remove('loading');
        return;
    }

    try {
        // 1. Upload image to Supabase Storage (bucket: annonces) if a file is pending
        let imageLink = '';
        if (pendingAnnonceImageFile) {
            const ext = (pendingAnnonceImageFile.name.split('.').pop() || 'jpg').toLowerCase();
            const safeTitle = (templateName || 'template').replace(/[^a-zA-Z0-9_-]/g, '_');
            const path = `${currentBusiness.uuid}/${safeTitle}-${Date.now()}.${ext}`;
            await supabase.storage.upload('annonces', path, pendingAnnonceImageFile);
            imageLink = supabase.storage.getPublicUrl('annonces', path);
        } else if (templateData.image && !templateData.image.startsWith('data:')) {
            // If no new file uploaded but an existing (non-base64) URL is in the form,
            // keep it as-is (e.g. when reusing an already-uploaded image).
            imageLink = templateData.image;
        }

        // 2. Insert row into annonces_templates
        const row = {
            nom_boite: currentBusiness.name,
            boite_id: currentBusiness.uuid,
            link: imageLink,
            titre_template: templateName || templateData.partyName || '',
            description: templateData.description || '',
            instagram: templateData.insta || '',
            prix_entree: templateData.price || '',
            fete_actuelle_nom: templateData.partyName || '',
            fete_actuelle_description: templateData.partyTheme || ''
        };
        const inserted = await supabase.insert('annonces_templates', row);

        // 3. Update local state using the real DB id + the uploaded image URL
        if (inserted && inserted.id != null) {
            templateData.id = String(inserted.id);
            templateData.dbId = inserted.id;
        } else {
            templateData.id = 'ann_' + Date.now();
        }
        templateData.image = imageLink || templateData.image;
        announcementTemplates.unshift(templateData);

        currentBusiness.announcementTemplates = announcementTemplates;
        localStorage.setItem('businessUser', JSON.stringify(currentBusiness));

        // Reset pending file (image has been persisted to storage)
        pendingAnnonceImageFile = null;

        renderTemplatesGrid();
        showSaveToast();
    } catch (err) {
        console.error('proceedWithSave error:', err);
        showGlassToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

function animateCardToGrid(card) {
    // Skip heavy animation on mobile for performance
    if (window.innerWidth <= 768) return;
    const rect = card.getBoundingClientRect();
    // Look for the "Public (Live)" anchor inside
    const anchor = card.querySelector('.biz-anchor-public')?.getBoundingClientRect() || rect;
    const clone = card.cloneNode(true);
    
    // Position it at 0,0 initially but with fixed layout
    clone.className = 'fly-card-clone';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.position = 'fixed';
    clone.style.zIndex = '1000000';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.transition = 'none'; // Disable transition for initial snap
    clone.style.opacity = '0';

    // Start coordinates: Centered on the "Public" anchor
    // We want the card's visual center to match anchor's center
    const startX = (anchor.left + anchor.width / 2) - (rect.width / 2);
    const startY = (anchor.top + anchor.height / 2) - (rect.height / 2);
    
    clone.style.left = startX + 'px';
    clone.style.top = startY + 'px';
    
    document.body.appendChild(clone);

    // Force reflow to snap it into position without animation
    void clone.offsetHeight;

    // Target position: The first template card slot
    const grid = document.getElementById('biz-templates-grid');
    const firstTpl = grid?.querySelector('.template-card') || grid;
    const targetRect = firstTpl?.getBoundingClientRect() || { left: window.innerWidth - 300, top: 200, width: 240, height: 180 };

    // Step 1: Fly to Center (Mode Preview)
    requestAnimationFrame(() => {
        const centerX = (window.innerWidth / 2) - (rect.width / 2);
        const centerY = (window.innerHeight / 2) - (rect.height / 2);
        
        // Slightly smaller scale on narrow mobiles to ensure visibility
        const previewScale = window.innerWidth < 480 ? 1.05 : 1.15;
        
        clone.style.transition = 'all 0.8s cubic-bezier(0.19, 1, 0.22, 1)';
        clone.style.opacity = '1';
        clone.style.left = centerX + 'px';
        clone.style.top = centerY + 'px';
        clone.style.transform = `scale(${previewScale})`;
        clone.style.boxShadow = '0 0 120px rgba(99, 102, 241, 0.8)';

        setTimeout(() => {
            // Step 2: Slide to the Right (Grid)
            clone.style.transition = 'all 0.9s cubic-bezier(0.19, 1, 0.22, 1)';
            
            const scaleX = (targetRect.width || 240) / rect.width;
            const scaleY = (targetRect.height || 180) / rect.height;
            const translateX = (targetRect.left) - centerX;
            const translateY = (targetRect.top) - centerY;

            clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX*0.85}, ${scaleY*0.85})`;
            clone.style.opacity = '0';
            
            setTimeout(() => {
                clone.remove();
            }, 900);
        }, 1600); 
    });
}

// ----- Custom Confirm Modal -----
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('biz-confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    titleEl.innerText = title;
    msgEl.innerText = message;
    modal.classList.add('active');

    // Use direct assignment to ensure no listener stacking
    okBtn.onclick = () => {
        onConfirm();
        closeConfirm();
    };
    
    cancelBtn.onclick = () => {
        closeConfirm();
    };

    const closeConfirm = () => {
        modal.classList.remove('active');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
    };
}

function showPromptModal(title, message, onConfirm) {
    const modal = document.getElementById('biz-prompt-modal');
    const titleEl = document.getElementById('prompt-title');
    const msgEl = document.getElementById('prompt-message');
    const input = document.getElementById('prompt-input');
    const okBtn = document.getElementById('prompt-ok');
    const cancelBtn = document.getElementById('prompt-cancel');

    titleEl.innerText = title;
    msgEl.innerText = message;
    input.value = '';
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);

    const handleOk = () => {
        const val = input.value.trim();
        if (val) {
            onConfirm(val);
            closePrompt();
        } else {
            input.style.borderColor = '#ef4444';
        }
    };

    okBtn.onclick = handleOk;
    cancelBtn.onclick = () => closePrompt();

    const closePrompt = () => {
        modal.classList.remove('active');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
    };
    
    // Allow Enter key
    input.onkeydown = (e) => {
        if (e.key === 'Enter') handleOk();
        if (e.key === 'Escape') closePrompt();
    };
}

function showSaveToast() {
    const toast = document.getElementById('save-toast');
    if (toast) {
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 3000);
    }
}

let templateSearchQuery = '';
let selectedTemplateIds = new Set();

function handleTemplateSearch(e) {
    templateSearchQuery = e.target.value.toLowerCase().trim();
    renderTemplatesGrid();
}

function toggleTemplateSelection(id, e) {
    // If clicking a button, don't toggle selection unless it's the card itself
    if (e.target.tagName === 'BUTTON') return;
    
    if (selectedTemplateIds.has(id)) {
        selectedTemplateIds.delete(id);
    } else {
        selectedTemplateIds.add(id);
    }
    
    updateBulkActionsUI();
    renderTemplatesGrid();
}

function updateBulkActionsUI() {
    const bar = document.getElementById('bulk-actions');
    const countEl = document.getElementById('selected-count');
    
    if (selectedTemplateIds.size > 0) {
        bar.style.display = 'flex';
        countEl.textContent = `${selectedTemplateIds.size} sélectionné${selectedTemplateIds.size > 1 ? 's' : ''}`;
    } else {
        bar.style.display = 'none';
    }
}

async function handleBulkDelete() {
    console.log('[handleBulkDelete] called, selected:', selectedTemplateIds.size);
    if (selectedTemplateIds.size === 0) {
        showGlassToast('Aucun template sélectionné', 'error');
        return;
    }
    showConfirmModal(
        'Supprimer la sélection ?',
        `Êtes-vous sûr de vouloir supprimer ces ${selectedTemplateIds.size} templates ?`,
        async () => {
            const toDelete = announcementTemplates.filter(t => selectedTemplateIds.has(t.id));
            for (const tpl of toDelete) {
                try {
                    if (tpl.dbId != null) {
                        await supabase.delete('annonces_templates', `id=eq.${tpl.dbId}`);
                    }
                } catch (err) {
                    console.error('handleBulkDelete DB error for', tpl.id, err);
                    showGlassToast(err.message || 'Erreur suppression', 'error');
                    continue;
                }
                // Storage cleanup (best-effort)
                if (tpl.image) {
                    deleteStorageImage('annonces', tpl.image);
                }
            }

            announcementTemplates = announcementTemplates.filter(t => !selectedTemplateIds.has(t.id));
            selectedTemplateIds.clear();

            if (currentBusiness) {
                currentBusiness.announcementTemplates = announcementTemplates;
                localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            }

            updateBulkActionsUI();
            renderTemplatesGrid();
        }
    );
}

function renderTemplatesGrid() {
    const grid = document.getElementById('biz-templates-grid');
    if (!grid) return;

    const filtered = announcementTemplates.filter(t =>
        (t.title || '').toLowerCase().includes(templateSearchQuery) ||
        (t.partyName || '').toLowerCase().includes(templateSearchQuery) ||
        (t.partyTheme || '').toLowerCase().includes(templateSearchQuery)
    );

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            ${templateSearchQuery ? t('biz.search_template_no_result') : t('biz.no_template')}
        </p>`;
        return;
    }

    grid.innerHTML = filtered.map(t => `
        <div class="template-card ${selectedTemplateIds.has(t.id) ? 'selected' : ''}" 
             id="tpl-${t.id}" 
             onclick="toggleTemplateSelection('${t.id}', event)">
            <div class="template-card-hero" style="background-image: url('${t.image || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=2070&auto=format&fit=crop'}')"></div>
            <div class="template-card-content">
                <div class="template-card-title">${t.title || t.partyName || 'Sans nom'}</div>
                <div class="template-card-desc">${t.partyTheme || window.t('biz.no_theme')}</div>
            </div>
            <div class="template-actions">
                <button class="btn-mini btn-edit" onclick="loadAdminTemplate('${t.id}')">Modifier</button>
                <button class="btn-mini btn-inspire" onclick="inspireAdminTemplate('${t.id}')">S'inspirer</button>
                <button class="btn-mini btn-delete" onclick="deleteAdminTemplate('${t.id}')">Supprimer</button>
            </div>
        </div>
    `).join('');
}

let editingTemplateId = null;

function loadAdminTemplate(id) {
    const tpl = announcementTemplates.find(t => t.id === id);
    if (!tpl) return;

    editingTemplateId = id;

    // Fill the hidden inputs
    document.getElementById('biz-club-image').value = tpl.image || '';
    document.getElementById('biz-club-name-hidden').value = tpl.name || '';
    document.getElementById('biz-club-insta').value = tpl.insta || '';
    document.getElementById('biz-club-desc').value = tpl.description || '';
    document.getElementById('biz-club-price').value = tpl.price || '';
    document.getElementById('biz-party-name').value = tpl.partyName || '';
    document.getElementById('biz-party-theme').value = tpl.partyTheme || '';

    // Refresh preview
    updateAnnoncesPreview();

    // Save as draft to persist across refreshes
    saveAnnouncementDraft();

    // Scroll to editor
    document.querySelector('.editor-section')?.scrollIntoView({ behavior: 'smooth' });
}

function deleteStorageImage(bucket, imageUrl) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(imageUrl.substring(idx + marker.length));
    supabase.storage.remove(bucket, path).catch(err => {
        console.warn('[deleteStorageImage] cleanup failed:', err.message);
    });
}

function deleteAdminTemplate(id) {
    showConfirmModal(
        'Supprimer ce template ?',
        'Cette action est irréversible et supprimera le template de votre bibliothèque.',
        async () => {
            const tpl = announcementTemplates.find(t => t.id === id);

            if (tpl) {
                try {
                    if (tpl.dbId != null) {
                        await supabase.delete('annonces_templates', `id=eq.${tpl.dbId}`);
                    }
                } catch (err) {
                    console.error('deleteAdminTemplate DB error:', err);
                    showGlassToast(err.message || 'Erreur suppression', 'error');
                    return;
                }
                // Storage cleanup (best-effort, ne bloque pas la suppression)
                if (tpl.image) {
                    deleteStorageImage('annonces', tpl.image);
                }
            }

            announcementTemplates = announcementTemplates.filter(t => t.id !== id);
            if (currentBusiness) {
                currentBusiness.announcementTemplates = announcementTemplates;
                localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            }
            renderTemplatesGrid();
            showGlassToast('Template supprimé', 'success');
        }
    );
}

function inspireAdminTemplate(id) {
    const tpl = announcementTemplates.find(t => t.id === id);
    if (!tpl) return;

    loadAdminTemplate(id);
    editingTemplateId = null; // Clear so save creates a new template
    showSaveToast();
}

function handleClubImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Keep the File so we can upload to Supabase Storage on template save
    pendingAnnonceImageFile = file;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        // Update hidden input (used only for live preview while editing)
        document.getElementById('biz-club-image').value = base64Data;
        // Refresh preview
        updateAnnoncesPreview();
    };
    reader.readAsDataURL(file);
}

function handleSaveAnnonces(e) {
    e.preventDefault();
    const profile = {
        image: document.getElementById('biz-club-image').value,
        insta: document.getElementById('biz-club-insta').value,
        desc: document.getElementById('biz-club-desc').value,
        partyName: document.getElementById('biz-party-name').value,
        partyTheme: document.getElementById('biz-party-theme').value
    };
    
    currentBusiness.profile = profile;
    saveBusinessData();
    alert('Annonces mises à jour avec succès !');
}

function saveBusinessData() {
    localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
    // Optional: push to server
}

// ----- Rewards Logic (Supabase) -----
function handleRewardImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    pendingRewardImageFile = file;
    // Local preview only (not persisted until form submit)
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('rew-image-preview');
        if (preview) {
            preview.className = 'rew-image-placeholder has-image';
            preview.innerHTML = `<img src="${e.target.result}" alt="Reward preview">`;
        }
    };
    reader.readAsDataURL(file);
}

async function loadBizRewards() {
    if (!currentBusiness || !currentBusiness.uuid) {
        bizRewards = [];
        return;
    }
    try {
        const rows = await supabase.select('rewards', `boite_id=eq.${currentBusiness.uuid}&order=created_at.desc`);
        bizRewards = Array.isArray(rows) ? rows : [];
    } catch (err) {
        console.error('loadBizRewards error:', err);
        bizRewards = [];
    }
}

// Load announcement templates from Supabase (source of truth) and map DB
// columns back to the client-side shape expected by the UI.
async function loadAnnouncementTemplates() {
    if (!currentBusiness || !currentBusiness.uuid) {
        announcementTemplates = [];
        return;
    }
    try {
        const rows = await supabase.select(
            'annonces_templates',
            `boite_id=eq.${currentBusiness.uuid}&order=created_at.desc`
        );
        announcementTemplates = (Array.isArray(rows) ? rows : []).map(r => ({
            // Keep id as string so onclick="func('${t.id}')" comparisons stay consistent
            // with locally-created 'ann_xxx' ids. dbId keeps the numeric row id for deletes.
            id: String(r.id),
            dbId: r.id,
            image: r.link || '',
            name: r.nom_boite || '',
            insta: r.instagram || '',
            description: r.description || '',
            price: r.prix_entree || '',
            title: r.titre_template || '',
            partyName: r.fete_actuelle_nom || '',
            partyTheme: r.fete_actuelle_description || '',
            timestamp: r.created_at || ''
        }));
        if (currentBusiness) {
            currentBusiness.announcementTemplates = announcementTemplates;
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
        }
    } catch (err) {
        console.error('loadAnnouncementTemplates error:', err);
        announcementTemplates = [];
    }
}

async function handleCreateReward(e) {
    e.preventDefault();
    if (!currentBusiness || !currentBusiness.uuid) {
        showGlassToast('Session entreprise invalide', 'error');
        return;
    }

    const nomRecompense = document.getElementById('rew-name').value.trim();
    const pointsNecessaires = parseInt(document.getElementById('rew-points').value);
    const prixBase = document.getElementById('rew-base-price')?.value.trim() || '';
    const prixApresReduction = document.getElementById('rew-discounted-price')?.value.trim() || '';
    const codeId = document.getElementById('rew-code')?.value.trim() || '';

    if (!nomRecompense || isNaN(pointsNecessaires)) {
        showGlassToast('Nom et points requis', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.classList.add('loading');

    // Capture the current image data-URL for the fly animation (before reset)
    const previewImg = document.getElementById('rew-image-preview')?.querySelector('img');
    const imageDataUrl = previewImg?.src || '';

    try {
        // 1. Upload image to Supabase Storage (if provided)
        let imageLink = '';
        if (pendingRewardImageFile) {
            const ext = (pendingRewardImageFile.name.split('.').pop() || 'jpg').toLowerCase();
            const safeTitle = nomRecompense.replace(/[^a-zA-Z0-9_-]/g, '_');
            const path = `${currentBusiness.uuid}/${safeTitle}-${Date.now()}.${ext}`;
            await supabase.storage.upload('rewards', path, pendingRewardImageFile);
            imageLink = supabase.storage.getPublicUrl('rewards', path);
        }

        // 2. Insert reward row (titre_reward = nom_recompense, auto)
        const row = {
            id: Math.floor(Math.random() * 2147483647),
            nom_boite: currentBusiness.name,
            boite_id: currentBusiness.uuid,
            titre_reward: nomRecompense,
            nom_recompense: nomRecompense,
            points_necessaires: String(pointsNecessaires),
            prix_base: prixBase,
            prix_apres_reduction: prixApresReduction,
            code_id: codeId,
            link: imageLink
        };
        const inserted = await supabase.insert('rewards', row);

        // 3. Update local state + fly animation
        bizRewards.unshift(inserted || row);
        animateRewardToGrid(nomRecompense, pointsNecessaires, prixBase, imageLink || imageDataUrl);
        renderRewardsList();

        // 4. Reset form
        e.target.reset();
        pendingRewardImageFile = null;
        const preview = document.getElementById('rew-image-preview');
        if (preview) {
            preview.className = 'rew-image-placeholder';
            preview.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Ajouter une image</span>
            `;
        }

        showSaveToast();
    } catch (err) {
        console.error('handleCreateReward error:', err);
        showGlassToast(err.message || 'Erreur création reward', 'error');
    } finally {
        if (submitBtn) submitBtn.classList.remove('loading');
    }
}

// ----- Reward fly-to-grid animation (mirrors annonces template animation) -----
function animateRewardToGrid(nom, points, prix, imageSrc) {
    if (window.innerWidth <= 768) return;
    const form = document.getElementById('biz-reward-form');
    if (!form) return;

    const CARD_W = 220;
    const CARD_H = 260;

    const clone = document.createElement('div');
    clone.className = 'reward-card fly-card-clone';
    clone.style.cssText = `
        position: fixed;
        width: ${CARD_W}px;
        height: ${CARD_H}px;
        z-index: 1000000;
        margin: 0;
        pointer-events: none;
        transition: none;
        opacity: 0;
    `;
    clone.innerHTML = `
        <div class="reward-card-image" style="${imageSrc ? `background-image: url('${imageSrc}')` : ''}">
            ${!imageSrc ? '<svg class="no-img-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' : ''}
        </div>
        <div class="reward-card-body">
            <div class="reward-card-name">${nom}</div>
            <div class="reward-card-meta">
                <span class="badge badge-points">⭐ ${points} pts</span>
                ${prix ? `<span class="badge badge-price">💰 ${prix}</span>` : ''}
            </div>
        </div>
    `;

    // Start position: centered on the form card
    const formRect = form.getBoundingClientRect();
    const startX = formRect.left + formRect.width / 2 - CARD_W / 2;
    const startY = formRect.top + formRect.height / 2 - CARD_H / 2;
    clone.style.left = startX + 'px';
    clone.style.top = startY + 'px';

    document.body.appendChild(clone);
    void clone.offsetHeight;

    // Step 1: fly to center of screen, scale up
    requestAnimationFrame(() => {
        const centerX = (window.innerWidth / 2) - CARD_W / 2;
        const centerY = (window.innerHeight / 2) - CARD_H / 2;
        const previewScale = window.innerWidth < 480 ? 1.05 : 1.15;

        clone.style.transition = 'all 0.8s cubic-bezier(0.19, 1, 0.22, 1)';
        clone.style.opacity = '1';
        clone.style.left = centerX + 'px';
        clone.style.top = centerY + 'px';
        clone.style.transform = `scale(${previewScale})`;
        clone.style.boxShadow = '0 0 120px rgba(99, 102, 241, 0.8)';

        setTimeout(() => {
            // Step 2: slide to first reward card slot in the grid
            const grid = document.getElementById('biz-rewards-grid');
            const firstCard = grid?.querySelector('.reward-card');
            const targetRect = firstCard?.getBoundingClientRect()
                || grid?.getBoundingClientRect()
                || { left: window.innerWidth - 280, top: 200, width: CARD_W, height: CARD_H };

            const scaleX = (targetRect.width || CARD_W) / CARD_W;
            const scaleY = (targetRect.height || CARD_H) / CARD_H;
            const translateX = targetRect.left - centerX;
            const translateY = targetRect.top - centerY;

            clone.style.transition = 'all 0.9s cubic-bezier(0.19, 1, 0.22, 1)';
            clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX * 0.9}, ${scaleY * 0.9})`;
            clone.style.opacity = '0';

            setTimeout(() => clone.remove(), 900);
        }, 1200);
    });
}

function renderRewardsList() {
    const grid = document.getElementById('biz-rewards-grid');
    if (!grid) return;

    if (!bizRewards || bizRewards.length === 0) {
        grid.innerHTML = `<p class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            ${t('biz.no_reward_created')}
        </p>`;
        return;
    }

    grid.innerHTML = bizRewards.map(r => {
        const img = r.link || '';
        const nom = r.nom_recompense || '';
        const pts = parseInt(r.points_necessaires) || 0;
        const prix = r.prix_base || '';
        const titre = (r.titre_reward || '').replace(/'/g, "\\'");
        return `
        <div class="reward-card">
            <div class="reward-card-image" style="${img ? `background-image: url('${img}')` : ''}">
                ${!img ? '<svg class="no-img-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' : ''}
            </div>
            <div class="reward-card-body">
                <div class="reward-card-name">${nom}</div>
                <div class="reward-card-meta">
                    <span class="badge badge-points">⭐ ${pts} pts</span>
                    ${prix ? `<span class="badge badge-price">💰 ${prix}</span>` : ''}
                </div>
                <div class="reward-card-actions">
                    <button class="btn-rew-delete" onclick="deleteReward('${titre}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function deleteReward(titre) {
    showConfirmModal(
        'Supprimer cette récompense ?',
        'Cette action est irréversible.',
        async () => {
            try {
                const reward = bizRewards.find(r => r.titre_reward === titre);
                if (!reward) return;

                // Delete from Supabase rewards table (filter by boite_id + titre_reward)
                await supabase.delete('rewards', `boite_id=eq.${currentBusiness.uuid}&titre_reward=eq.${encodeURIComponent(titre)}`);

                if (reward.link) {
                    deleteStorageImage('rewards', reward.link);
                }

                bizRewards = bizRewards.filter(r => r.titre_reward !== titre);
                renderRewardsList();
                showGlassToast('Récompense supprimée', 'success');
            } catch (err) {
                console.error('deleteReward error:', err);
                showGlassToast(err.message || 'Erreur suppression', 'error');
            }
        }
    );
}


// ----- Redemption Logic -----
// ----- Redemption & Commande Logic -----
async function searchClientForReward(isCommandeMode = false) {
    const code = document.getElementById('biz-client-code-search').value.trim();
    if (!code) return;

    const resultDiv = document.getElementById('biz-client-result');
    const nameEl = document.getElementById('res-client-name');
    const pointsEl = document.getElementById('res-client-points');

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'search_client',
                clientCode: code
            })
        });

        if (response.ok) {
            const client = await response.json();
            lastFoundClient = client;
            
            if (nameEl) nameEl.textContent = client.name;
            if (pointsEl) pointsEl.textContent = isCommandeMode ? client.points : `${client.points} Points`;
            resultDiv.style.display = 'block';
            
            if (isCommandeMode) {
                selectedCommandeRewards = [];
                selectedCommandeProducts = [];
                
                // If the webhook returns a draft order, auto-apply it
                if (client.draftOrder) {
                    selectedCommandeRewards = client.draftOrder.rewards || [];
                    selectedCommandeProducts = client.draftOrder.products || [];
                }

                renderCommandeRewards(client.points);
                updateCommandeRecap();
            } else {
                renderAvailableRewardsForClient(client.points);
            }
        } else {
            alert('Client non trouvé');
            resultDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function renderCommandeRewards(points) {
    const list = document.getElementById('biz-commande-rewards');
    if (!list) return;
    list.innerHTML = '';
    list.dataset.clientPoints = String(points);

    // Only show rewards the client can afford (points_necessaires is TEXT in DB)
    // Sort ascending: cheapest first
    const affordableRewards = bizRewards
        .filter(r => points >= (parseInt(r.points_necessaires) || 0))
        .slice()
        .sort((a, b) => (parseInt(a.points_necessaires) || 0) - (parseInt(b.points_necessaires) || 0));

    if (affordableRewards.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:24px 12px; font-size:13px; color:var(--text-dim);">Pas assez de points pour un reward.</p>';
        return;
    }

    let html = '';
    affordableRewards.forEach(r => {
        const bizIdx = bizRewards.indexOf(r);
        const isSelected = selectedCommandeRewards.indexOf(r) > -1;
        const img = r.link || '';
        const nom = (r.nom_recompense || '').replace(/"/g, '&quot;');
        const pts = parseInt(r.points_necessaires) || 0;
        const prix = r.prix_apres_reduction || r.prix_base || '';

        const imgStyle = img
            ? `background: url(&quot;${img}&quot;) center/cover no-repeat;`
            : 'background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2));';

        const bg = isSelected ? 'rgba(99,102,241,0.18)' : 'var(--surface)';
        const borderColor = isSelected ? 'var(--primary)' : 'var(--border)';
        const badgeBg = isSelected ? '#10b981' : 'var(--primary)';
        const badgeChar = isSelected ? '&#10003;' : '+';

        // <div role="button"> with cursor:pointer + explicit ontouchend/onclick — the
        // most reliable combo on iOS Safari. No pointer-events:none on children
        // (can break tap detection in some iOS versions).
        html += `
            <div role="button" tabindex="0" onclick="toggleBizReward(${bizIdx})" ontouchend="event.preventDefault(); toggleBizReward(${bizIdx})" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: ${bg}; border: 2px solid ${borderColor}; border-radius: 14px; cursor: pointer; -webkit-tap-highlight-color: rgba(99,102,241,0.2); touch-action: manipulation; user-select: none;">
                <div style="width: 52px; height: 52px; border-radius: 10px; ${imgStyle} flex-shrink: 0;"></div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nom}</div>
                    <div style="font-size: 13px; color: var(--primary-light); font-weight: 600; margin-top: 2px;">${pts} pts${prix ? ' &middot; <span style="color:var(--text-dim); font-weight:500;">' + prix + '</span>' : ''}</div>
                </div>
                <div style="flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; background: ${badgeBg}; color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; line-height: 1;">${badgeChar}</div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// Global so inline onclick="toggleBizReward(..)" works
function toggleBizReward(bizIdx) {
    try {
        const target = bizRewards[bizIdx];
        if (!target) {
            showGlassToast('Reward introuvable (idx=' + bizIdx + ')', 'error');
            return;
        }
        const idx = selectedCommandeRewards.indexOf(target);
        if (idx > -1) {
            selectedCommandeRewards.splice(idx, 1);
        } else {
            selectedCommandeRewards.push(target);
        }
        const list = document.getElementById('biz-commande-rewards');
        const currentPts = parseInt(list && list.dataset.clientPoints) || 0;
        renderCommandeRewards(currentPts);
        updateCommandeRecap();
    } catch (err) {
        showGlassToast('Erreur click: ' + err.message, 'error');
        console.error('toggleBizReward error:', err);
    }
}
window.toggleBizReward = toggleBizReward;

function updateCommandeRecap() {
    const recap = document.getElementById('biz-commande-recap');
    const totalPtsEl = document.getElementById('biz-commande-total-pts');
    if (!recap) return;

    let html = '';
    let totalPoints = 0;

    selectedCommandeRewards.forEach(r => {
        const pts = parseInt(r.points_necessaires) || 0;
        html += `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                    <span>🎁 ${r.nom_recompense || ''}</span>
                    <span style="color:#ef4444;">-${pts} pts</span>
                 </div>`;
        totalPoints += pts;
    });

    if (html === '') {
        html = '<p style="font-size: 13px; color: var(--text-dim);">' + t('biz.no_selection') + '</p>';
    }

    recap.innerHTML = html;
    if (totalPtsEl) totalPtsEl.textContent = String(totalPoints);
}

// ===== HELPERS: Calendrier & Stats =====
function getTodayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getOrCreateTodayCalendrier() {
    const today = getTodayDateStr();
    const boiteId = currentBusiness.uuid;
    const nomBoite = currentBusiness.name;

    const rows = await supabase.select('calendrier', `boite_id=eq.${boiteId}&date_soiree=eq.${today}`);
    if (rows && rows.length > 0) return rows[0];

    return await supabase.insert('calendrier', {
        nom_boite: nomBoite,
        boite_id: boiteId,
        nom_template: 'Soirée',
        date_soiree: today
    });
}

function getGenderField(sexe) {
    const s = (sexe || '').toString().trim().toLowerCase();
    if (s === 'homme' || s === 'h' || s === 'male' || s === 'm') return 'homme';
    if (s === 'femme' || s === 'f' || s === 'female' || s === 'w') return 'femme';
    return 'non_binaire';
}

async function recalculateCalendrierStats(calendrierId) {
    const today = getTodayDateStr();
    const boiteId = currentBusiness.uuid;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const stats = await supabase.select('dynamicstats',
        `boite_id=eq.${boiteId}&created_at=gte.${today}T00:00:00&created_at=lt.${tomorrowStr}T00:00:00&statut=eq.entrée`
    );

    if (!stats || stats.length === 0) return;

    const paysCount = {};
    const villeCount = {};
    let totalAge = 0;
    let ageCount = 0;

    stats.forEach(s => {
        if (s.pays) paysCount[s.pays] = (paysCount[s.pays] || 0) + 1;
        if (s.ville) villeCount[s.ville] = (villeCount[s.ville] || 0) + 1;
        if (s.age) { totalAge += s.age; ageCount++; }
    });

    const topPays = Object.entries(paysCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topVille = Object.entries(villeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topAge = ageCount > 0 ? Math.ceil(totalAge / ageCount) : null;

    await supabase.update('calendrier', `id=eq.${calendrierId}`, {
        top_pays: topPays,
        top_ville: topVille,
        top_age: topAge
    });
}

// ===== VALIDATE ENTRY (Entrée — with rewards) =====
let isProcessingEntry = false;
async function validateCommande() {
    if (isProcessingEntry || !lastFoundClient) return;

    const totalPointsToDeduct = selectedCommandeRewards.reduce((sum, r) => sum + (parseInt(r.points_necessaires) || 0), 0);
    const currentPoints = parseInt(lastFoundClient.points) || 0;

    if (totalPointsToDeduct > currentPoints) {
        const excess = totalPointsToDeduct - currentPoints;
        showGlassToast(`Pas assez de points ! Enlève ${excess} pts de rewards.`, 'error');
        return;
    }

    isProcessingEntry = true;
    // Immediately hide the result and disable buttons to prevent double-submit
    document.getElementById('scan-entry-result').style.display = 'none';
    const vBtn = document.getElementById('btn-commande-validate');
    const cBtn = document.getElementById('btn-commande-cancel');
    if (vBtn) vBtn.disabled = true;
    if (cBtn) cBtn.disabled = true;

    try {
        // 1. +1 point for the entry, minus any rewards redeemed
        const newPoints = currentPoints + 1 - totalPointsToDeduct;
        await supabase.update('profiles_users', `id=eq.${lastFoundClient.uuid}`, {
            points: String(newPoints) // column is TEXT
        });

        // 2. Log to dynamicstats (entrée)
        await supabase.insert('dynamicstats', {
            nom_boite: currentBusiness.name,
            boite_id: currentBusiness.uuid,
            age: lastFoundClient.age,
            ville: lastFoundClient.ville,
            pays: lastFoundClient.pays,
            statut: 'entrée'
        });

        // 3. Get or create today's calendrier entry
        const cal = await getOrCreateTodayCalendrier();

        // 4. Update calendrier: +1 affluence, +1 gender
        const genderField = getGenderField(lastFoundClient.sexe);
        await supabase.update('calendrier', `id=eq.${cal.id}`, {
            affluence: (parseInt(cal.affluence) || 0) + 1,
            [genderField]: (parseInt(cal[genderField]) || 0) + 1
        });

        // 5. Recalculate top_pays, top_ville, top_age (entrée only, today)
        await recalculateCalendrierStats(cal.id);

        const msg = totalPointsToDeduct > 0
            ? `Entrée validée — ${totalPointsToDeduct} pts déduits, +1 pt entrée`
            : 'Entrée validée (+1 pt)';
        showGlassToast(msg, 'success');
    } catch (error) {
        console.error('Entry validation error:', error);
        showGlassToast('Erreur lors de la validation', 'error');
    } finally {
        document.getElementById('scan-entry-result').style.display = 'none';
        const vBtn2 = document.getElementById('btn-commande-validate');
        const cBtn2 = document.getElementById('btn-commande-cancel');
        if (vBtn2) vBtn2.disabled = false;
        if (cBtn2) cBtn2.disabled = false;
        lastFoundClient = null;
        scannedClientId = null;
        selectedCommandeRewards = [];
        isProcessingEntry = false;
        startClientScanner();
    }
}

// ===== QR CODES MODULE =====
function generateBusinessQRCodes() {
    const entryDiv = document.getElementById('qr-code-entry');
    if (!entryDiv || !currentBusiness) return;

    entryDiv.innerHTML = '';

    const clubName = currentBusiness.name || currentBusiness.nom;
    const baseUrl = window.location.origin + window.location.pathname.replace('entreprise.html', 'scan.html');
    const entryUrl = `${baseUrl}?club=${encodeURIComponent(clubName)}`;

    new QRCode(entryDiv, { text: entryUrl, width: 200, height: 200 });
}

// ===== QR SCANNER MODULE (Entreprise — Entrée / Bar / Sortie) =====
let html5QrScanner = null;
let scannedClientId = null;
let currentScanMode = 'entree'; // 'entree', 'bar', or 'sortie'

// Bind scan tab buttons via addEventListener (inline onclick can be blocked)
(function initScanTabs() {
    function bind() {
        const entreeBtn = document.getElementById('scan-tab-entree');
        const barBtn = document.getElementById('scan-tab-bar');
        const sortieBtn = document.getElementById('scan-tab-sortie');
        if (entreeBtn) entreeBtn.addEventListener('click', function(e) { e.stopPropagation(); switchScanTab('entree'); });
        if (barBtn) barBtn.addEventListener('click', function(e) { e.stopPropagation(); switchScanTab('bar'); });
        if (sortieBtn) sortieBtn.addEventListener('click', function(e) { e.stopPropagation(); switchScanTab('sortie'); });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();

function switchScanTab(tab) {
    currentScanMode = tab;
    const entreeTab = document.getElementById('scan-tab-entree');
    const barTab = document.getElementById('scan-tab-bar');
    const sortieTab = document.getElementById('scan-tab-sortie');

    // Reset all tabs
    [entreeTab, barTab, sortieTab].forEach(t => {
        if (t) { t.style.background = 'transparent'; t.style.color = 'var(--text-dim)'; }
    });

    // Activate selected tab
    if (tab === 'entree' && entreeTab) {
        entreeTab.style.background = 'var(--primary)'; entreeTab.style.color = 'white';
    } else if (tab === 'bar' && barTab) {
        barTab.style.background = '#059669'; barTab.style.color = 'white';
    } else if (tab === 'sortie' && sortieTab) {
        sortieTab.style.background = '#ef4444'; sortieTab.style.color = 'white';
    }

    // Hide all results, show camera
    const entryResult = document.getElementById('scan-entry-result');
    const barResult = document.getElementById('scan-bar-result');
    const sortieResult = document.getElementById('scan-sortie-result');
    if (entryResult) entryResult.style.display = 'none';
    if (barResult) barResult.style.display = 'none';
    if (sortieResult) sortieResult.style.display = 'none';
    document.getElementById('scan-camera-zone').style.display = 'block';

    // Only start scanner if it's not already running
    if (!html5QrScanner) {
        startClientScanner();
    }
}

async function startClientScanner() {
    const readerEl = document.getElementById('biz-qr-reader');
    if (!readerEl) return;

    // Stop previous scanner and wait for it to fully stop
    if (html5QrScanner) {
        try { await html5QrScanner.stop(); } catch (e) { /* ignore */ }
        html5QrScanner = null;
    }

    // Clear leftover DOM from previous scanner instance
    readerEl.innerHTML = '';

    document.getElementById('scan-camera-zone').style.display = 'block';

    try {
        html5QrScanner = new Html5Qrcode('biz-qr-reader');
        await html5QrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onClientQRScanned,
            () => {}
        );
    } catch (err) {
        console.error('Scanner error:', err);
        showGlassToast("Impossible d'accéder à la caméra", 'error');
    }
}

async function stopClientScanner() {
    if (html5QrScanner) {
        try { await html5QrScanner.stop(); } catch (e) { /* ignore */ }
        try { await html5QrScanner.clear(); } catch (e) { /* ignore */ }
        html5QrScanner = null;
    }
    // Defensive: wipe any leftover video/canvas elements from the reader
    // (html5-qrcode sometimes leaves them behind, which can overlay the page)
    const reader = document.getElementById('biz-qr-reader');
    if (reader) reader.innerHTML = '';
}

async function onClientQRScanned(decodedText) {
    await stopClientScanner();
    document.getElementById('scan-camera-zone').style.display = 'none';

    let clientId = null;
    if (decodedText.startsWith('suggesto_client:')) {
        clientId = decodedText.replace('suggesto_client:', '');
    } else {
        showGlassToast('QR code non reconnu', 'error');
        startClientScanner();
        return;
    }

    scannedClientId = clientId;

    try {
        const profiles = await supabase.select('profiles_users', `id=eq.${clientId}`);
        if (!profiles || profiles.length === 0) {
            showGlassToast('Client non trouvé', 'error');
            startClientScanner();
            return;
        }

        const client = profiles[0];
        lastFoundClient = {
            uuid: client.id,
            name: client.nom,
            points: parseInt(client.points) || 0,
            total_commande: parseInt(client.total_commande) || 0,
            age: parseInt(client.age) || null,
            sexe: client.sexe || null,
            ville: client.ville || null,
            pays: client.pays || null
        };

        if (currentScanMode === 'entree') {
            showEntryResult(lastFoundClient);
        } else if (currentScanMode === 'bar') {
            // Auto-validate immediately on scan (no confirmation screen)
            await validateBarScan();
        } else if (currentScanMode === 'sortie') {
            // Auto-validate immediately on scan (no confirmation screen)
            await validateSortie();
        }
    } catch (error) {
        console.error('Client search error:', error);
        showGlassToast('Erreur de connexion', 'error');
        startClientScanner();
    }
}

function showEntryResult(client) {
    const initials = client.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    document.getElementById('entry-client-initials').textContent = initials;
    document.getElementById('entry-client-name').textContent = client.name;
    document.getElementById('entry-client-points').textContent = client.points;
    document.getElementById('scan-entry-result').style.display = 'block';

    selectedCommandeRewards = [];
    renderCommandeRewards(client.points);
    updateCommandeRecap();
}

function showBarResult(client) {
    const initials = client.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    document.getElementById('bar-client-initials').textContent = initials;
    document.getElementById('bar-client-name').textContent = client.name;
    document.getElementById('bar-client-points').textContent = client.points;
    document.getElementById('bar-client-commandes').textContent = client.total_commande;
    document.getElementById('scan-bar-result').style.display = 'block';
}

function showSortieResult(client) {
    const initials = client.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    document.getElementById('sortie-client-initials').textContent = initials;
    document.getElementById('sortie-client-name').textContent = client.name;
    document.getElementById('scan-sortie-result').style.display = 'block';
}

// ===== VALIDATE BAR =====
let isProcessingBar = false;
async function validateBarScan() {
    if (isProcessingBar || !lastFoundClient) return;
    isProcessingBar = true;

    try {
        // +1 points and +1 total_commande for user
        await supabase.update('profiles_users', `id=eq.${lastFoundClient.uuid}`, {
            points: lastFoundClient.points + 1,
            total_commande: lastFoundClient.total_commande + 1
        });

        // +1 total_commande in today's calendrier
        const cal = await getOrCreateTodayCalendrier();
        await supabase.update('calendrier', `id=eq.${cal.id}`, {
            total_commande: (parseInt(cal.total_commande) || 0) + 1
        });

        showGlassToast('Scan validé ! +1 point', 'success');
        document.getElementById('scan-bar-result').style.display = 'none';
        lastFoundClient = null;
        scannedClientId = null;
        isProcessingBar = false;
        startClientScanner();
    } catch (error) {
        console.error('Bar validation error:', error);
        showGlassToast('Erreur lors de la validation', 'error');
        isProcessingBar = false;
        lastFoundClient = null;
        scannedClientId = null;
        startClientScanner();
    }
}

// ===== VALIDATE SORTIE =====
let isProcessingSortie = false;
async function validateSortie() {
    if (isProcessingSortie || !lastFoundClient) return;
    isProcessingSortie = true;

    try {
        // 1. Update calendrier: -1 affluence, -1 gender
        const cal = await getOrCreateTodayCalendrier();
        const genderField = getGenderField(lastFoundClient.sexe);

        await supabase.update('calendrier', `id=eq.${cal.id}`, {
            affluence: Math.max(0, (parseInt(cal.affluence) || 0) - 1),
            [genderField]: Math.max(0, (parseInt(cal[genderField]) || 0) - 1)
        });

        // 2. +1 point on user profile (reward for scanning at exit)
        const currentPoints = parseInt(lastFoundClient.points) || 0;
        await supabase.update('profiles_users', `id=eq.${lastFoundClient.uuid}`, {
            points: String(currentPoints + 1) // column is TEXT
        });

        // 3. Log to dynamicstats with statut='sortie'
        await supabase.insert('dynamicstats', {
            nom_boite: currentBusiness.name,
            boite_id: currentBusiness.uuid,
            age: lastFoundClient.age,
            ville: lastFoundClient.ville,
            pays: lastFoundClient.pays,
            statut: 'sortie'
        });

        showGlassToast('Sortie validée ! +1 point', 'success');
        const sortieRes = document.getElementById('scan-sortie-result');
        if (sortieRes) sortieRes.style.display = 'none';
        lastFoundClient = null;
        scannedClientId = null;
        isProcessingSortie = false;
        startClientScanner();
    } catch (error) {
        console.error('Sortie validation error:', error);
        showGlassToast('Erreur lors de la validation', 'error');
        isProcessingSortie = false;
        lastFoundClient = null;
        scannedClientId = null;
        startClientScanner();
    }
}

// ===== CANCEL ACTIONS =====
// "J'utilise pas" = valider l'entrée sans déduire de points (client entre mais n'utilise pas ses rewards)
async function cancelCommande() {
    if (isProcessingEntry) return;
    if (!lastFoundClient) {
        document.getElementById('scan-entry-result').style.display = 'none';
        startClientScanner();
        return;
    }

    isProcessingEntry = true;
    // Immediately hide result and disable buttons to prevent double-submit
    document.getElementById('scan-entry-result').style.display = 'none';
    const vBtn = document.getElementById('btn-commande-validate');
    const cBtn = document.getElementById('btn-commande-cancel');
    if (vBtn) vBtn.disabled = true;
    if (cBtn) cBtn.disabled = true;

    try {
        // 1. +1 point for the entry
        const currentPoints = parseInt(lastFoundClient.points) || 0;
        await supabase.update('profiles_users', `id=eq.${lastFoundClient.uuid}`, {
            points: String(currentPoints + 1) // column is TEXT
        });

        // 2. Log to dynamicstats (entrée)
        await supabase.insert('dynamicstats', {
            nom_boite: currentBusiness.name,
            boite_id: currentBusiness.uuid,
            age: lastFoundClient.age,
            ville: lastFoundClient.ville,
            pays: lastFoundClient.pays,
            statut: 'entrée'
        });

        // 3. Get or create today's calendrier entry
        const cal = await getOrCreateTodayCalendrier();

        // 4. Update calendrier: +1 affluence, +1 gender
        const genderField = getGenderField(lastFoundClient.sexe);
        await supabase.update('calendrier', `id=eq.${cal.id}`, {
            affluence: (parseInt(cal.affluence) || 0) + 1,
            [genderField]: (parseInt(cal[genderField]) || 0) + 1
        });

        // 5. Recalculate stats (entrée only, today)
        await recalculateCalendrierStats(cal.id);

        showGlassToast('Entrée validée (+1 pt)', 'success');
    } catch (error) {
        console.error('Entry (no rewards) validation error:', error);
        showGlassToast('Erreur lors de la validation', 'error');
    } finally {
        document.getElementById('scan-entry-result').style.display = 'none';
        const vBtn2 = document.getElementById('btn-commande-validate');
        const cBtn2 = document.getElementById('btn-commande-cancel');
        if (vBtn2) vBtn2.disabled = false;
        if (cBtn2) cBtn2.disabled = false;
        lastFoundClient = null;
        scannedClientId = null;
        selectedCommandeRewards = [];
        isProcessingEntry = false;
        startClientScanner();
    }
}

function cancelBarScan() {
    document.getElementById('scan-bar-result').style.display = 'none';
    lastFoundClient = null;
    scannedClientId = null;
    startClientScanner();
}

function cancelSortie() {
    document.getElementById('scan-sortie-result').style.display = 'none';
    lastFoundClient = null;
    scannedClientId = null;
    startClientScanner();
}

function downloadBusinessQR(containerId, filename) {
    const container = document.getElementById(containerId);
    const img = container.querySelector('img');
    if (!img) return;

    const link = document.createElement('a');
    link.href = img.src;
    link.download = `${filename}-${currentBusiness.name || 'Club'}.png`;
    link.click();
}

function updateStats() {
    const filter = document.getElementById('stats-date-filter').value;
    
    // Mock data logic based on filter
    const statsData = {
        always: { clients: 12540, earnings: 42500, cost: 8500, m: 45, f: 42, nb: 8, unk: 5 },
        year: { clients: 3420, earnings: 12100, cost: 2100, m: 48, f: 40, nb: 7, unk: 5 },
        quarter: { clients: 850, earnings: 2800, cost: 450, m: 44, f: 44, nb: 8, unk: 4 },
        month: { clients: 245, earnings: 820, cost: 120, m: 46, f: 43, nb: 6, unk: 5 },
        week: { clients: 68, earnings: 210, cost: 35, m: 45, f: 45, nb: 5, unk: 5 },
        today: { clients: 12, earnings: 45, cost: 8, m: 50, f: 40, nb: 5, unk: 5 }
    };

    const s = statsData[filter] || statsData.month;

    // Update Bubble values
    animateValue('stat-total-clients', s.clients);
    animateValue('stat-total-earnings', s.earnings, '€');
    animateValue('stat-rewards-cost', s.cost);

    // Update Gender Bars
    updateBar('m', s.m);
    updateBar('f', s.f);
    updateBar('nb', s.nb);

    // Render Pie Chart (Simple SVG approach)
    renderStatsPieChart(s);

    // Update Rewards List (Randomized for demo)
    const rewList = document.getElementById('stats-rewards-list');
    if (rewList) {
        rewList.innerHTML = '';
        const mockRewards = [
            { name: 'Shot de bienvenue', use: Math.floor(s.clients * 0.4) },
            { name: 'Coupe de Bulles', use: Math.floor(s.clients * 0.25) },
            { name: 'Entrée Gratuite', use: Math.floor(s.clients * 0.1) }
        ];
        mockRewards.forEach(r => {
            const row = document.createElement('div');
            row.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03);";
            row.innerHTML = `<span style="font-size: 13px;">${r.name}</span><span style="font-weight: 700; color: var(--primary-light);">${r.use}</span>`;
            rewList.appendChild(row);
        });
    }
}

function animateValue(id, value, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value.toLocaleString() + suffix;
}

function renderStatsPieChart(s) {
    const container = document.querySelector('.pie-chart-container');
    if (!container) return;
    
    // Simple SVG Pie Chart with 3 segments (H/F/NB)
    const total = s.m + s.f + s.nb;
    const pM = (s.m / total) * 100;
    const pF = (s.f / total) * 100;
    
    container.innerHTML = `
        <svg viewBox="0 0 32 32" style="transform: rotate(-90deg); border-radius: 50%;">
            <circle r="16" cx="16" cy="16" fill="#a855f7" /> <!-- NB (Purple) -->
            <circle r="16" cx="16" cy="16" fill="transparent"
                    stroke="#ec4899" 
                    stroke-width="32" 
                    stroke-dasharray="${pF} 100" /> <!-- F (Pink) -->
            <circle r="16" cx="16" cy="16" fill="transparent"
                    stroke="#3b82f6" 
                    stroke-width="32" 
                    stroke-dasharray="${pM} 100"
                    style="stroke-dashoffset: -${pF}" /> <!-- M (Blue) -->
        </svg>
    `;
}

function updateBar(id, percent) {
    const bar = document.getElementById(`bar-${id}`);
    const val = document.getElementById(`val-${id}`);
    if (bar && val) {
        bar.style.height = percent + '%';
        val.textContent = percent + '%';
    }
}

let calendarDate = new Date();
let calClickTimeout = null;

function renderCalendar() {
    const grid = document.getElementById('biz-calendar-grid');
    const monthLabel = document.getElementById('calendar-month-year');
    if (!grid || !monthLabel) return;
    
    // Safety check for global date
    if (!(calendarDate instanceof Date) || isNaN(calendarDate)) {
        calendarDate = new Date();
    }
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Monday start offset
    let startOffset = firstDay.getDay() - 1;
    if (startOffset === -1) startOffset = 6;
    
    const calLocale = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'fr';
    const localeMap = { fr: 'fr-FR', es: 'es-ES', en: 'en-US' };
    monthLabel.textContent = firstDay.toLocaleDateString(localeMap[calLocale] || 'fr-FR', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';
    
    // Empty leading cells
    for (let i = 0; i < startOffset; i++) {
        const cell = document.createElement('div');
        cell.className = 'gcal-cell not-current';
        grid.appendChild(cell);
    }
    
    // Day cells
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'gcal-cell';
        
        if (dateStr === todayStr) cell.classList.add('today');
        if (selectedDates.has(dateStr)) cell.classList.add('selected');
        
        // Day number
        const dayNum = document.createElement('div');
        dayNum.className = 'gcal-day-num';
        dayNum.textContent = day;
        cell.appendChild(dayNum);
        
        // Event label
        const scheduleItem = bizSchedule[dateStr];
        if (scheduleItem) {
            const eventEl = document.createElement('span');
            eventEl.className = 'gcal-event';
            if (scheduleItem === 'closed') {
                eventEl.classList.add('closed');
                eventEl.textContent = 'Fermé';
            } else {
                // Look in both announcementTemplates and bizTemplates
                const template = announcementTemplates.find(t => t.id === scheduleItem) || bizTemplates.find(t => t.id === scheduleItem);
                eventEl.textContent = template ? (template.partyName || template.name) : 'Soirée';
            }
            cell.appendChild(eventEl);
        }
        
        // Single click = instant selection (no delay)
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDateSelection(dateStr);
        });
        // Double click = preview or template picker (native browser event)
        cell.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (bizSchedule[dateStr]) {
                openCalPreview(dateStr);
            } else {
                handleCalendarDblClick(dateStr);
            }
        });
        
        grid.appendChild(cell);
    }
    
    // Trailing empty cells to complete last row
    const totalCells = startOffset + lastDay.getDate();
    const trailingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < trailingCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'gcal-cell not-current';
        grid.appendChild(cell);
    }
    
    // Update selection badge
    updateCalendarSelectionBadge();
}

function updateCalendarSelectionBadge() {
    const badge = document.getElementById('gcal-selected-count');
    const deleteBtn = document.getElementById('gcal-delete-selected');
    if (!badge) return;
    if (selectedDates.size > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = `${selectedDates.size} sélectionné${selectedDates.size > 1 ? 's' : ''}`;
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
}

function changeMonth(dir) {
    calendarDate.setMonth(calendarDate.getMonth() + dir);
    renderCalendar();
}

function goToToday() {
    calendarDate = new Date();
    renderCalendar();
}

function toggleDateSelection(dateStr) {
    if (selectedDates.has(dateStr)) {
        selectedDates.delete(dateStr);
    } else {
        selectedDates.add(dateStr);
    }
    renderCalendar();
}

// ----- Calendar Template Preview & Deletion -----
let calPreviewDate = null;

function openCalPreview(dateStr) {
    const scheduleItem = bizSchedule[dateStr];
    if (!scheduleItem) return;

    calPreviewDate = dateStr;
    const template = announcementTemplates.find(t => t.id === scheduleItem) || bizTemplates.find(t => t.id === scheduleItem);
    if (!template) return;

    const clubName = template.name || (currentBusiness ? currentBusiness.name : 'Mon Club');
    const image = template.image || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=2070&auto=format&fit=crop';
    const desc = template.description || t('biz.no_description');
    const insta = template.insta || t('biz.default_insta');
    const price = template.price || '20€';
    const partyName = template.partyName || template.name || 'Soirée Spéciale';
    const partyTheme = template.partyTheme || template.theme || 'Ambiance & Cocktails';
    const dateLabel = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const stats = { vibe: 'TRENDY', count: 110, men: 45, women: 40, nb: 15 };

    const cardContainer = document.getElementById('cal-preview-card');
    cardContainer.innerHTML = `
        <div class="modal-club-hero" style="background-image: url('${image}')">
            <div class="hero-overlay">
                <span class="vibe-badge">${stats.vibe}</span>
            </div>
            <div class="club-hero-name">${clubName}</div>
        </div>
        <div class="modal-content-inner">
            <div class="detail-section">
                <h4>${t('biz.about_venue')}</h4>
                <p class="text-dim">${desc}</p>
                <div class="insta-link-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    <span>${insta}</span>
                </div>
            </div>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">${t('biz.entry_price')}</span>
                    <span class="detail-val">${price}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">${t('biz.public_live')}</span>
                    <span class="detail-val">${stats.count} pers.</span>
                </div>
            </div>
            <div class="gender-breakdown" style="padding: 0;">
                <div class="gender-bar">
                    <div class="bar-segment men" style="width: ${stats.men}%"></div>
                    <div class="bar-segment women" style="width: ${stats.women}%"></div>
                    <div class="bar-segment nb" style="width: ${stats.nb}%"></div>
                </div>
                <div class="gender-labels">
                    <span>♂ ${stats.men}%</span>
                    <span>♀ ${stats.women}%</span>
                    <span>⚧ ${stats.nb}%</span>
                </div>
            </div>
            <hr class="modal-hr">
            <div class="detail-section">
                <div class="theme-header">
                    <span class="theme-tag">${t('biz.current_party')}</span>
                    <h4>${partyName}</h4>
                </div>
                <p class="text-small">${partyTheme}</p>
            </div>
        </div>
    `;

    document.getElementById('cal-preview-date-label').textContent = dateLabel;
    document.getElementById('cal-preview-modal').classList.add('active');
}

function closeCalPreview() {
    document.getElementById('cal-preview-modal').classList.remove('active');
    calPreviewDate = null;
}

function deleteCalendarTemplate() {
    if (!calPreviewDate) return;
    delete bizSchedule[calPreviewDate];
    saveBusinessData();
    closeCalPreview();
    renderCalendar();
}

function deleteSelectedTemplates() {
    if (selectedDates.size === 0) return;
    showConfirmModal(
        'Supprimer la sélection ?',
        `Supprimer les templates pour les ${selectedDates.size} jour${selectedDates.size > 1 ? 's' : ''} sélectionné${selectedDates.size > 1 ? 's' : ''} ?`,
        () => {
            selectedDates.forEach(dateStr => {
                delete bizSchedule[dateStr];
            });
            selectedDates.clear();
            saveBusinessData();
            renderCalendar();
        }
    );
}

// ----- Calendar Template Picker (Double-click popup) -----
let calPickerSelectedTemplate = null;
let calPickerTargetDates = [];

function handleCalendarDblClick(dateStr) {
    // Add the date to selection if not already
    if (!selectedDates.has(dateStr)) {
        selectedDates.add(dateStr);
    }
    calPickerTargetDates = Array.from(selectedDates);
    
    const subtitle = document.getElementById('cal-picker-subtitle');
    if (selectedDates.size === 1) {
        subtitle.textContent = `Appliquer un template au ${dateStr.split('-').reverse().join('/')}`;
    } else {
        subtitle.textContent = `Appliquer un template à ${selectedDates.size} jours sélectionnés`;
    }
    
    calPickerSelectedTemplate = null;
    document.getElementById('cal-picker-search').value = '';
    renderCalendarPickerList('');
    document.getElementById('cal-template-picker').classList.add('active');
    setTimeout(() => document.getElementById('cal-picker-search').focus(), 100);
}

function filterCalendarTemplates() {
    const query = document.getElementById('cal-picker-search').value.trim().toLowerCase();
    renderCalendarPickerList(query);
}

function renderCalendarPickerList(query) {
    const list = document.getElementById('cal-picker-list');
    if (!list) return;
    
    // Combine all available templates (announcement templates + biz templates)
    let allTemplates = [];
    
    if (announcementTemplates && announcementTemplates.length > 0) {
        announcementTemplates.forEach(t => {
            allTemplates.push({ id: t.id, name: t.partyName || t.name || 'Sans nom', theme: t.partyTheme || '' });
        });
    }
    
    if (bizTemplates && bizTemplates.length > 0) {
        bizTemplates.forEach(t => {
            if (!allTemplates.find(at => at.id === t.id)) {
                allTemplates.push({ id: t.id, name: t.name || 'Sans nom', theme: t.theme || '' });
            }
        });
    }
    
    // Filter: prefix match first, then includes match
    let filtered;
    if (query) {
        // Sort by prefix match first
        filtered = allTemplates.filter(t => t.name.toLowerCase().includes(query));
        filtered.sort((a, b) => {
            const aStart = a.name.toLowerCase().startsWith(query) ? 0 : 1;
            const bStart = b.name.toLowerCase().startsWith(query) ? 0 : 1;
            return aStart - bStart;
        });
    } else {
        filtered = allTemplates;
    }
    
    // Always add "Fermé" option
    let html = `
        <div class="cal-picker-item closed-opt ${calPickerSelectedTemplate === 'closed' ? 'selected' : ''}" onclick="selectCalPickerItem('closed')">
            <span class="tpl-dot"></span>
            🚩 Fermé
        </div>
    `;
    
    if (filtered.length === 0 && query) {
        html += `<div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">${t('biz.search_template_no_result')}</div>`;
    }
    
    filtered.forEach(t => {
        html += `
            <div class="cal-picker-item ${calPickerSelectedTemplate === t.id ? 'selected' : ''}" onclick="selectCalPickerItem('${t.id}')">
                <span class="tpl-dot"></span>
                <div>
                    <div style="font-weight: 600;">${t.name}</div>
                    ${t.theme ? `<div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${t.theme}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

function selectCalPickerItem(id) {
    calPickerSelectedTemplate = id;
    // Re-render to update selected state
    const query = document.getElementById('cal-picker-search').value.trim().toLowerCase();
    renderCalendarPickerList(query);
}

function closeCalendarPicker() {
    document.getElementById('cal-template-picker').classList.remove('active');
    calPickerSelectedTemplate = null;
}

async function applyCalendarPickerTemplate() {
    if (!calPickerSelectedTemplate) return;
    
    calPickerTargetDates.forEach(dateStr => {
        bizSchedule[dateStr] = calPickerSelectedTemplate;
    });
    
    currentBusiness.schedule = bizSchedule;
    selectedDates.clear();
    
    closeCalendarPicker();
    renderCalendar();
    showSaveToast();
    
    await saveBusinessData();
}

function renderTemplateList() {
    // No longer uses old sidebar template list — just render calendar
    renderCalendar();
}


// ----- Template CRUD -----
function openNewTemplateModal() {
    document.getElementById('biz-template-modal').classList.add('active');
}

async function handleCreateTemplate(e) {
    e.preventDefault();
    const name = document.getElementById('tpl-name').value;
    const theme = document.getElementById('tpl-theme').value;
    
    const newTpl = {
        id: 'tpl_' + Date.now(),
        name: name,
        theme: theme
    };
    
    bizTemplates.push(newTpl);
    currentBusiness.templates = bizTemplates;
    
    renderTemplateList();
    closeModal(null, 'biz-template-modal');
    e.target.reset();
    
    await saveBusinessData();
}

async function applyTemplateToSelection() {
    const templateId = document.getElementById('biz-apply-template').value;
    if (!templateId) return;
    
    selectedDates.forEach(dateStr => {
        bizSchedule[dateStr] = templateId;
    });
    
    currentBusiness.schedule = bizSchedule;
    selectedDates.clear();
    
    document.getElementById('biz-calendar-actions').style.display = 'none';
    renderCalendar();
    
    await saveBusinessData();
}

async function saveBusinessData() {
    localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
    
    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_business_data',
                clubName: currentBusiness.name,
                templates: bizTemplates,
                schedule: bizSchedule
            })
        });
    } catch (error) {
        console.error('Persistence error:', error);
    }
}

async function handleSaveAnnonces(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btn-save-annonces');
    const originalText = btn ? btn.textContent : '';
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enregistrement...';
    }

    const data = {
        action: 'update_club_annonces',
        clubName: currentBusiness.name,
        image: document.getElementById('biz-club-image').value,
        insta: document.getElementById('biz-club-insta').value,
        description: document.getElementById('biz-club-desc').value,
        partyName: document.getElementById('biz-party-name').value,
        partyTheme: document.getElementById('biz-party-theme').value,
        price: document.getElementById('biz-club-price')?.value || ''
    };

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            currentBusiness.annonces = data;
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            // Only show toast if triggered manually (not via handleSaveTemplate which has its own animation/toast)
            if (e) showSaveToast();
        } else {
            throw new Error('Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('Save error:', error);
        if (e) alert('Erreur: ' + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

function loadBusinessData() {
    if (!currentBusiness.annonces) return;
    const a = currentBusiness.annonces;
    document.getElementById('biz-club-image').value = a.image || '';
    document.getElementById('biz-club-insta').value = a.insta || '';
    document.getElementById('biz-club-desc').value = a.description || '';
    document.getElementById('biz-party-name').value = a.partyName || '';
    document.getElementById('biz-party-theme').value = a.partyTheme || '';
}

// Check business session on load
window.addEventListener('load', () => {
    if (document.body.classList.contains('view-entreprise') && currentBusiness) {
        showBusinessDashboard();
    }
});

// ===== SIGNUP HANDLER =====
async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const name = document.getElementById('signup-name').value.trim();
    const age = document.getElementById('signup-age').value.trim();
    const sexe = document.getElementById('signup-sexe').value;
    const city = document.getElementById('signup-city').value.trim();
    const country = document.getElementById('signup-country')?.value.trim() || '';
    const password = document.getElementById('signup-password').value.trim();

    if (!email || !name || !password || !age || !sexe || !city || !country) {
        showMessage('signup-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    setLoading('signup-btn', true);
    showMessage('signup-message', '', '');

    try {
        // 1. Create auth user in Supabase Auth
        const authData = await supabase.auth.signUp(email, password, {
            full_name: name,
            role: 'client'
        });
        supabase.auth._saveSession(authData);

        const userId = authData.user.id;

        // 2. Insert profile in profiles_users
        await supabase.insert('profiles_users', {
            id: userId,
            nom: name,
            age: parseInt(age),
            sexe: sexe,
            ville: city,
            pays: country
        });

        if (window.OneSignal) {
            OneSignal.login(userId);
        }

        const userData = {
            name: name,
            uuid: userId,
            age: age,
            sexe: sexe,
            city: city,
            country: country
        };
        localStorage.setItem('user', JSON.stringify(userData));
        showMessage('signup-message', 'Inscription réussie ! Redirection...', 'success');
        setTimeout(() => { showDashboard(name); }, 800);
    } catch (err) {
        console.error('Signup error:', err);
        showMessage('signup-message', err.message || 'Erreur lors de l\'inscription.', 'error');
    } finally {
        setLoading('signup-btn', false);
    }
}

// ===== SHOW DASHBOARD =====
function showDashboard(username) {
    try {
        console.log('--- SHOW DASHBOARD START ---', username);
        const authScreen = document.getElementById('auth-screen');
        const dashScreen = document.getElementById('dashboard-screen');
        
        if (authScreen) {
            authScreen.classList.remove('active');
            authScreen.style.display = 'none';
        }
        const authLangSel = document.getElementById('auth-lang-selector');
        if (authLangSel) authLangSel.style.display = 'none';
        
        if (dashScreen) {
            dashScreen.classList.add('active');
            dashScreen.style.setProperty('display', 'flex', 'important');
            dashScreen.style.opacity = '1';
            dashScreen.style.visibility = 'visible';
            console.log('Dashboard screen activated');
        } else {
            console.error('CRITICAL: dashboard-screen element not found!');
        }
        
        const userDisp = document.getElementById('user-display');
        if (userDisp) userDisp.textContent = username;

        // Render local clubs for home view
        console.log('Calling renderLocalClubs...');
        renderLocalClubs();
        
        // Ensure the new view is translated
        if (typeof translateDOM === 'function') {
            translateDOM();
        }
        console.log('--- SHOW DASHBOARD COMPLETE ---');
    } catch (err) {
        console.error('showDashboard CRITICAL error:', err);
    }
}

// ===== LOGOUT =====
function handleLogout() {
    supabase.auth.signOut();
    localStorage.removeItem('user');
    const dashScreen = document.getElementById('dashboard-screen');
    const authScreen = document.getElementById('auth-screen');

    if (dashScreen) {
        dashScreen.classList.remove('active');
        dashScreen.style.display = 'none';
    }
    if (authScreen) {
        authScreen.classList.add('active');
        authScreen.style.display = '';
    }

    const authLangSel = document.getElementById('auth-lang-selector');
    if (authLangSel) authLangSel.style.display = '';

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
    // Only run fetard-specific init on fetard view
    const isBusinessView = document.body.classList.contains('view-entreprise');
    if (isBusinessView) return;

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
        vibe: '\uD83D\uDD25 Incroyable',
        menRatio: 45,
        womenRatio: 50,
        nbRatio: 5,
        price: '25\u20AC (avec conso)',
        theme: 'Ann\u00e9es 80 Full Red',
        nightDesc: 'Soir\u00e9e sp\u00e9ciale revival avec DJ Guest de Londres. Spectacle pyrotechnique \u00e0 minuit.',
        generalDesc: 'La plus grande bo\u00eete de nuit de la r\u00e9gion avec 3 salles, 5 bars et un carr\u00e9 VIP exclusif.',
        instagram: '@macumba_officiel',
        city: 'Gen\u00e8ve',
        region: 'Grand Gen\u00e8ve',
        country: 'Suisse',
        rewards: [
            { id: 'r1', name: 'Shot Offert', points: 10, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200' },
            { id: 'r2', name: 'Coupe Champagne', points: 30, image: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=200' },
            { id: 'r5', name: 'Cocktail Maison Offert', points: 20, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200' },
            { id: 'r6', name: 'Acc\u00e8s Carr\u00e9 VIP 1h', points: 50, image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=200' }
        ],
        products: [
            { id: 'p1', name: 'Vodka Redbull', price: '15\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200' },
            { id: 'p2', name: 'Bi\u00e8re Pression', price: '8\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=200' },
            { id: 'p5', name: 'Mojito', price: '14\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=200' },
            { id: 'p6', name: 'Gin Tonic', price: '13\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=200' },
            { id: 'p7', name: 'Whisky Coca', price: '12\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
            { id: 'p8', name: 'Coca-Cola', price: '5\u20AC', category: 'Soft', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200' },
            { id: 'p9', name: 'Red Bull', price: '6\u20AC', category: 'Soft', image: 'https://images.unsplash.com/photo-1613225755222-3552bcd2cece?w=200' },
            { id: 'p10', name: 'Eau Min\u00e9rale', price: '3\u20AC', category: 'Soft', image: 'https://images.unsplash.com/photo-1564419320461-6262a0d4ceec?w=200' },
            { id: 'p11', name: 'Nachos & Salsa', price: '9\u20AC', category: 'Snacks', image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=200' },
            { id: 'p12', name: 'Planche Mixte', price: '16\u20AC', category: 'Snacks', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=200' }
        ]
    },
    {
        id: 'club-2',
        name: 'L\'Atrium',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
        status: 'closed',
        count: 0,
        vibe: '\uD83D\uDCA4 Calme',
        menRatio: 55,
        womenRatio: 40,
        nbRatio: 5,
        price: '15\u20AC',
        theme: 'Deep Into Detroit',
        nightDesc: 'Pas d\'\u00e9v\u00e9nements pr\u00e9vus ce soir. Ouverture demain 23h.',
        generalDesc: 'Club intimiste sp\u00e9cialis\u00e9 dans la musique \u00e9lectronique underground et techno m\u00e9lodique.',
        instagram: '@atrium_club',
        city: 'Lyon',
        region: 'Rh\u00f4ne-Alpes',
        country: 'France',
        rewards: [
            { id: 'r3', name: 'Entr\u00e9e Gratuite', points: 50, image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=200' },
            { id: 'r7', name: 'Shot Tequila', points: 15, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200' }
        ],
        products: [
            { id: 'p3', name: 'Gin Tonic', price: '12\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=200' },
            { id: 'p13', name: 'Margarita', price: '14\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=200' },
            { id: 'p14', name: 'Jus d\'Orange', price: '5\u20AC', category: 'Soft', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200' }
        ]
    },
    {
        id: 'club-3',
        name: 'Le Palace',
        image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=500&q=80',
        status: 'open',
        count: 850,
        vibe: '\uD83C\uDF89 Plein \u00e0 craquer',
        menRatio: 48,
        womenRatio: 48,
        nbRatio: 4,
        price: '30\u20AC',
        theme: 'Gala de Printemps',
        nightDesc: 'Dress code \u00e9l\u00e9gant exig\u00e9. Champagne offert aux groupes de 5 femmes avant minuit.',
        generalDesc: 'Lieu historique de la nuit parisienne, r\u00e9put\u00e9 pour son acoustique et ses soir\u00e9es mondaines.',
        instagram: '@palace_paris',
        city: 'Paris',
        region: '\u00cele-de-France',
        country: 'France',
        rewards: [
            { id: 'r4', name: 'Acc\u00e8s VIP', points: 100, image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=200' },
            { id: 'r8', name: 'Bouteille Champagne', points: 80, image: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=200' },
            { id: 'r9', name: 'Cocktail Signature', points: 25, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200' }
        ],
        products: [
            { id: 'p4', name: 'Cocktail Signature', price: '18\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200' },
            { id: 'p15', name: 'Champagne Coupe', price: '22\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=200' },
            { id: 'p16', name: 'Espresso Martini', price: '16\u20AC', category: 'Alcool', image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
            { id: 'p17', name: 'Perrier', price: '4\u20AC', category: 'Soft', image: 'https://images.unsplash.com/photo-1564419320461-6262a0d4ceec?w=200' },
            { id: 'p18', name: 'Virgin Mojito', price: '10\u20AC', category: 'Soft', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=200' },
            { id: 'p19', name: 'Bruschetta', price: '11\u20AC', category: 'Snacks', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=200' }
        ]
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
    
    let title = t('nav.home');
    if (viewId === 'search') title = t('nav.search');
    if (viewId === 'favorites') title = t('nav.favorites');
    if (viewId === 'qr') title = t('nav.qr');
    if (viewId === 'code') title = t('nav.code');
    if (viewId === 'verify') title = t('verify.entry_validation');

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = title;

    if (viewId === 'code') renderProfile();
    if (viewId === 'home') renderLocalClubs();
    if (viewId === 'search') { renderClubs(); initFilters(); }
    if (viewId === 'favorites') renderFavoritesView();
    
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

    // Generate personal QR code
    const qrContainer = document.getElementById('personal-qr-code');
    if (qrContainer && user.uuid) {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: 'suggesto_client:' + user.uuid,
            width: 200,
            height: 200,
            colorDark: '#0a0a1a',
            colorLight: '#ffffff'
        });
    }

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
    if (!container) return;
    container.innerHTML = '';
    list.forEach(club => {
        container.innerHTML += buildClubCard(club);
    });
}

function renderFavorites() {
    // No longer shows in home view - favorites have their own view now
}

function toggleFavorite(clubId) {
    if (favorites.includes(clubId)) {
        favorites = favorites.filter(id => id !== clubId);
    } else {
        favorites.push(clubId);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));

    // Re-render the current active view
    const favView = document.getElementById('favorites-view');
    if (favView && favView.classList.contains('active')) {
        renderFavoritesView();
    }
    const homeView = document.getElementById('home-view');
    if (homeView && homeView.classList.contains('active')) {
        renderLocalClubs();
    }
    const searchView = document.getElementById('search-view');
    if (searchView && searchView.classList.contains('active')) {
        filterClubs();
    }
}

function filterClubs() {
    const searchEl = document.getElementById('club-search');
    const search = searchEl ? searchEl.value.toLowerCase() : '';

    const filtered = nightclubs.filter(c => {
        const text = (c.name + ' ' + c.city + ' ' + c.country + ' ' + c.region).toLowerCase();
        return text.includes(search);
    });

    renderClubs(filtered);
}

function initFilters() {
    // No longer needed for separate filter dropdowns - search does it all
}

function renderLocalClubs() {
    const container = document.getElementById('local-clubs-container');
    const noLocal = document.getElementById('no-local-clubs');
    const titleEl = document.getElementById('header-title');
    if (!container) return;

    try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userCity = user?.city || '';

        if (titleEl && userCity) {
            titleEl.textContent = t('dashboard.clubs_in') + ' ' + userCity;
        }

        const local = userCity ? nightclubs.filter(c => c.city.toLowerCase() === userCity.toLowerCase()) : [];

        if (local.length === 0) {
            container.innerHTML = '';
            if (noLocal) noLocal.style.display = 'block';
            return;
        }

        if (noLocal) noLocal.style.display = 'none';
        container.innerHTML = '';
        local.forEach(club => {
            container.innerHTML += buildClubCard(club);
        });
    } catch (e) {
        console.error('renderLocalClubs error:', e);
    }
}

function renderFavoritesView() {
    const container = document.getElementById('favorites-grid-container');
    const noFavs = document.getElementById('no-favorites');
    if (!container) return;

    const favClubs = nightclubs.filter(c => favorites.includes(c.id));

    if (favClubs.length === 0) {
        container.innerHTML = '';
        if (noFavs) noFavs.style.display = 'block';
        return;
    }

    if (noFavs) noFavs.style.display = 'none';
    container.innerHTML = '';
    favClubs.forEach(club => {
        container.innerHTML += buildClubCard(club);
    });
}

function buildClubCard(club) {
    const isFav = favorites.includes(club.id);
    const statusText = club.status === 'open' ? t('dashboard.open') : t('dashboard.closed');
    return '<div class="club-card" onclick="openClubModal(\'' + club.id + '\')">'
        + '<button class="btn-fav ' + (isFav ? 'active' : '') + '" onclick="event.stopPropagation(); toggleFavorite(\'' + club.id + '\')">'
        + '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
        + '</button>'
        + '<img src="' + club.image + '" class="club-img" alt="' + club.name + '">'
        + '<div class="club-info">'
        + '<div class="club-header"><h3 class="club-name">' + club.name + '</h3>'
        + '<div class="club-status status-' + club.status + '"><div class="status-dot"></div>' + statusText + '</div></div>'
        + '<div class="club-stats">'
        + '<div class="stat-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> ' + club.count + ' pers.</div>'
        + '<div class="stat-item">' + club.vibe + '</div>'
        + '</div>'
        + '<div class="club-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + club.city + ', ' + club.country + '</div>'
        + '</div></div>';
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
                <h4>${t('biz.about_venue')}</h4>
                <p class="text-dim">${club.generalDesc}</p>
                <a href="https://instagram.com/${club.instagram.replace('@','')}" target="_blank" class="insta-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    ${club.instagram}
                </a>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">${t('biz.entry_price')}</span>
                    <span class="detail-val">${club.price}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">${t('biz.public_live')}</span>
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
                    <span class="theme-tag">${t('biz.current_party')}</span>
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

            <button class="btn-primary btn-rewards-modal" onclick="openRewardsPopup('${club.id}')" style="width:100%; margin-top:20px;">
                \u{1F381} ${t('rewards.see_rewards')}
            </button>
        </div>
    `;

    document.getElementById('club-modal').classList.add('active');
}

function openRewardsPopup(clubId) {
    const club = nightclubs.find(c => c.id === clubId);
    if (!club) return;

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userPoints = user?.points || 0;

    const rewards = club.rewards || [];
    const affordable = rewards.filter(r => userPoints >= r.points);

    let html = '<div class="rewards-popup-header"><div class="rewards-popup-points">'
        + '<span>\u{1F48E}</span><strong>' + userPoints + '</strong><span>points</span>'
        + '</div></div>';

    if (affordable.length > 0) {
        html += '<h4 class="rewards-popup-subtitle">' + t('rewards.you_can_get') + '</h4>';
        html += '<div class="rewards-popup-grid">';
        affordable.forEach(function(r) {
            html += '<div class="rewards-popup-item affordable">'
                + '<div class="rewards-popup-img" style="background-image: url(\'' + (r.image || '') + '\')"></div>'
                + '<div class="rewards-popup-info"><span class="rewards-popup-name">' + r.name + '</span>'
                + '<span class="rewards-popup-cost">' + r.points + ' pts</span></div>'
                + '<span class="rewards-popup-check">\u2705</span></div>';
        });
        html += '</div>';
    }

    const notAffordable = rewards.filter(r => userPoints < r.points);
    if (notAffordable.length > 0) {
        html += '<h4 class="rewards-popup-subtitle" style="margin-top:16px;">' + t('rewards.all_rewards') + '</h4>';
        html += '<div class="rewards-popup-grid">';
        notAffordable.forEach(function(r) {
            html += '<div class="rewards-popup-item locked">'
                + '<div class="rewards-popup-img" style="background-image: url(\'' + (r.image || '') + '\')"></div>'
                + '<div class="rewards-popup-info"><span class="rewards-popup-name">' + r.name + '</span>'
                + '<span class="rewards-popup-cost">' + r.points + ' pts</span></div>'
                + '<span class="rewards-popup-lock">\u{1F512} ' + t('rewards.not_enough') + '</span></div>';
        });
        html += '</div>';
    }

    if (rewards.length === 0) {
        html += '<p style="text-align:center; color:var(--text-dim); padding:20px;">' + t('rewards.no_rewards') + '</p>';
    }

    var rewardsBody = document.querySelector('#rewards-popup-modal .modal-body');
    rewardsBody.innerHTML = html;
    document.getElementById('rewards-popup-modal').classList.add('active');
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

// ----- Client QR Scan Flow (Native Camera Redirect) -----

async function handleNativeScan() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') || 'entry';

    // Handle barman order scan (QR from customer)
    if (type === 'barman_order') {
        const dataStr = params.get('data');
        window.history.replaceState({}, document.title, window.location.pathname);
        if (dataStr) {
            try {
                const orderData = JSON.parse(decodeURIComponent(dataStr));
                showBarmanOrderReview(orderData);
            } catch(e) { console.error('Invalid order QR data', e); }
        }
        return;
    }

    const clubName = params.get('club');
    if (!clubName) return;

    currentScanData = { clubName, type };

    // Purge URL params
    window.history.replaceState({}, document.title, window.location.pathname);
    
    const stored = localStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    
    switchMainView('verify');
    
    if (type === 'entry') {
        document.getElementById('verify-entry-container').style.display = 'block';
        document.getElementById('verify-bar-container').style.display = 'none';
        document.getElementById('verify-entry-club-name').textContent = clubName;
        
        if (user) {
            // AUTO-DETECT FLOW
            document.getElementById('entry-auto-success').style.display = 'block';
            document.getElementById('entry-manual-code').style.display = 'none';
            
            // Automated Webhook Call
            sendEntryWebhook(user.uuid, user.name, user.code);
        } else {
            // MANUAL FLOW
            document.getElementById('entry-auto-success').style.display = 'none';
            document.getElementById('entry-manual-code').style.display = 'block';
        }
    } else if (type === 'bar') {
        document.getElementById('verify-entry-container').style.display = 'none';
        document.getElementById('verify-bar-container').style.display = 'block';
        document.getElementById('verify-bar-club-name').textContent = clubName;

        if (user) {
            document.getElementById('bar-user-points-val').textContent = user.points || 0;
            initKiosk(clubName);
        } else {
            alert("Connectez-vous pour profiter de vos points au bar !");
            switchMainView('home');
        }
    }
}

async function sendEntryWebhook(userId, userName, userCode) {
    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/entree_barre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'entry_validation',
                club_name: currentScanData.clubName,
                user_id: userId,
                user_name: userName,
                user_code: userCode,
                increment: 1
            })
        });
    } catch (e) {
        console.error('Entry Webhook Error', e);
    }
}

async function submitEntryCode() {
    const code = document.getElementById('entry-code-input').value.trim().toUpperCase();
    if (!code) return;
    
    // In this demo, we assume code is valid if it exists, 
    // real app would check against user.code if logged in
    document.getElementById('entry-manual-code').style.display = 'none';
    document.getElementById('entry-auto-success').style.display = 'block';
    
    sendEntryWebhook(null, "Guest", code);
}

async function handleEntryNoAccount() {
    sendEntryWebhook(null, "Guest", "NOCODE");
    alert("Passage validé (+1 point) ! Inscris-toi pour ne rien rater.");
    switchMainView('home');
    switchTab('signup');
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('dashboard-screen').classList.remove('active');
}

// ----- Bar Flow Logic (Kiosk E-Commerce) -----
let barCart = { rewards: [], products: [] }; // products: [{...item, qty: N}]

function initKiosk(clubName) {
    barCart = { rewards: [], products: [] };
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const avatar = document.getElementById('kiosk-avatar');
        if (avatar) avatar.textContent = (user.name || '?')[0].toUpperCase();
        const nameEl = document.getElementById('kiosk-user-name');
        if (nameEl) nameEl.textContent = user.name || 'Utilisateur';
    }
    // Show order page, hide others
    showKioskPage('order');
    fetchClubDataForBar(clubName);
}

function showKioskPage(page) {
    const pages = { order: 'kiosk-order-page', summary: 'kiosk-summary-page', qr: 'kiosk-qr-page' };
    Object.values(pages).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(pages[page]);
    if (target) target.style.display = 'block';
}

async function fetchClubDataForBar(clubName) {
    const club = nightclubs.find(c => c.name === clubName);
    const rewards = club?.rewards || [];
    const products = club?.products || [];
    renderKioskGrids(rewards, products);
}

function renderKioskGrids(rewards, products) {
    const rGrid = document.getElementById('bar-rewards-grid');
    const pGrid = document.getElementById('bar-products-grid');
    if (!rGrid || !pGrid) return;

    const userPts = parseInt(document.getElementById('bar-user-points-val')?.textContent) || 0;

    rGrid.innerHTML = rewards.length === 0
        ? '<p class="text-dim" style="grid-column:1/-1; text-align:center; padding:20px;">' + t('kiosk.no_rewards_available') + '</p>'
        : '';

    rewards.forEach(r => {
        const affordable = userPts >= (r.points || 0);
        const div = document.createElement('div');
        div.className = 'kiosk-item' + (affordable ? '' : ' kiosk-item-disabled');
        div.innerHTML = `
            <div class="kiosk-item-img" style="background-image: url('${r.image || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200'}')"></div>
            <div class="kiosk-item-body">
                <div class="kiosk-item-name">${r.name}</div>
                <div class="kiosk-item-price">${r.points} pts</div>
            </div>
            <div class="kiosk-item-action">${affordable ? '<button class="kiosk-add-btn" data-id="' + r.id + '">+</button>' : '<span class="kiosk-locked">Pas assez de pts</span>'}</div>
        `;
        if (affordable) {
            div.querySelector('.kiosk-add-btn').onclick = (e) => { e.stopPropagation(); toggleRewardInCart(r, div); };
        }
        rGrid.appendChild(div);
    });

    pGrid.innerHTML = products.length === 0
        ? '<p class="text-dim" style="grid-column:1/-1; text-align:center; padding:20px;">' + t('kiosk.no_products_available') + '</p>'
        : '';

    products.forEach(p => {
        const priceNum = parseFloat(String(p.price).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        const div = document.createElement('div');
        div.className = 'kiosk-item';
        div.dataset.productId = p.id;
        div.innerHTML = `
            <div class="kiosk-item-img" style="background-image: url('${p.image || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200'}')"></div>
            <div class="kiosk-item-body">
                <div class="kiosk-item-name">${p.name}</div>
                ${p.category ? '<span class="kiosk-item-cat">' + p.category + '</span>' : ''}
                <div class="kiosk-item-price">${priceNum.toFixed(2)} &euro;</div>
            </div>
            <div class="kiosk-item-action">
                <div class="kiosk-qty-ctrl" style="display:none;">
                    <button class="kiosk-qty-btn" onclick="event.stopPropagation(); changeProductQty('${p.id}', -1)">-</button>
                    <span class="kiosk-qty-val" id="qty-${p.id}">0</span>
                    <button class="kiosk-qty-btn" onclick="event.stopPropagation(); changeProductQty('${p.id}', 1)">+</button>
                </div>
                <button class="kiosk-add-btn kiosk-add-product" onclick="event.stopPropagation(); changeProductQty('${p.id}', 1)" data-price="${priceNum}" data-name="${p.name}">+</button>
            </div>
        `;
        pGrid.appendChild(div);
    });
}

function toggleRewardInCart(reward, element) {
    const idx = barCart.rewards.findIndex(r => r.id === reward.id);
    if (idx > -1) {
        barCart.rewards.splice(idx, 1);
        element.classList.remove('kiosk-item-selected');
    } else {
        barCart.rewards.push(reward);
        element.classList.add('kiosk-item-selected');
    }
    updateKioskCart();
}

function changeProductQty(productId, delta) {
    const existing = barCart.products.find(p => p.id === productId);
    const itemEl = document.querySelector(`.kiosk-item[data-product-id="${productId}"]`);
    if (!itemEl) return;

    if (existing) {
        existing.qty += delta;
        if (existing.qty <= 0) {
            barCart.products = barCart.products.filter(p => p.id !== productId);
            itemEl.classList.remove('kiosk-item-selected');
            itemEl.querySelector('.kiosk-qty-ctrl').style.display = 'none';
            itemEl.querySelector('.kiosk-add-product').style.display = '';
        }
    } else if (delta > 0) {
        // Get info from the button
        const btn = itemEl.querySelector('.kiosk-add-product');
        const price = parseFloat(btn.dataset.price) || 0;
        const name = btn.dataset.name || '';
        // Get product from nightclubs data
        const club = nightclubs.find(c => c.name === currentScanData?.clubName);
        const prod = club?.products?.find(p => p.id === productId) || { id: productId, name, price };
        barCart.products.push({ ...prod, priceNum: price, qty: 1 });
        itemEl.classList.add('kiosk-item-selected');
    }

    // Update qty display
    const qtyEl = document.getElementById('qty-' + productId);
    const cartItem = barCart.products.find(p => p.id === productId);
    if (qtyEl) qtyEl.textContent = cartItem ? cartItem.qty : 0;

    // Show/hide qty controls
    if (cartItem && cartItem.qty > 0) {
        itemEl.querySelector('.kiosk-qty-ctrl').style.display = 'flex';
        itemEl.querySelector('.kiosk-add-product').style.display = 'none';
    }

    updateKioskCart();
}

function updateKioskCart() {
    const totalProducts = barCart.products.reduce((s, p) => s + (p.priceNum * p.qty), 0);
    const totalItems = barCart.rewards.length + barCart.products.reduce((s, p) => s + p.qty, 0);
    const totalPts = barCart.rewards.reduce((s, r) => s + (r.points || 0), 0);

    document.getElementById('kiosk-cart-count').textContent = totalItems;
    document.getElementById('kiosk-cart-total').textContent = totalProducts.toFixed(2);

    const footer = document.getElementById('kiosk-cart-footer');
    if (footer) footer.style.display = totalItems > 0 ? 'flex' : 'none';
}

function showOrderSummary() {
    showKioskPage('summary');

    // Rewards
    const rSection = document.getElementById('summary-rewards-section');
    const rList = document.getElementById('summary-rewards-list');
    if (barCart.rewards.length > 0) {
        rSection.style.display = 'block';
        rList.innerHTML = barCart.rewards.map(r => `
            <div class="kiosk-summary-item">
                <span>${r.name}</span>
                <span class="kiosk-summary-item-cost">-${r.points} pts</span>
            </div>
        `).join('');
        const totalPts = barCart.rewards.reduce((s, r) => s + (r.points || 0), 0);
        document.getElementById('summary-rewards-pts').textContent = '-' + totalPts + ' pts';
    } else {
        rSection.style.display = 'none';
    }

    // Products
    const pSection = document.getElementById('summary-products-section');
    const pList = document.getElementById('summary-products-list');
    if (barCart.products.length > 0) {
        pSection.style.display = 'block';
        pList.innerHTML = barCart.products.map(p => `
            <div class="kiosk-summary-item">
                <span>${p.name} x${p.qty}</span>
                <span class="kiosk-summary-item-cost">${(p.priceNum * p.qty).toFixed(2)} &euro;</span>
            </div>
        `).join('');
        const totalProd = barCart.products.reduce((s, p) => s + (p.priceNum * p.qty), 0);
        document.getElementById('summary-products-total').textContent = totalProd.toFixed(2) + ' \u20AC';
    } else {
        pSection.style.display = 'none';
    }

    // Totals
    const totalProducts = barCart.products.reduce((s, p) => s + (p.priceNum * p.qty), 0);
    const totalPts = barCart.rewards.reduce((s, r) => s + (r.points || 0), 0);
    document.getElementById('summary-total-no-rewards').textContent = totalProducts.toFixed(2) + ' \u20AC';
    document.getElementById('summary-total-final').textContent = totalProducts.toFixed(2) + ' \u20AC';
    document.getElementById('summary-pts-used').textContent = totalPts + ' pts';
}

function backToKiosk() {
    showKioskPage('order');
}

function generateOrderQR() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const totalProducts = barCart.products.reduce((s, p) => s + (p.priceNum * p.qty), 0);
    const totalPts = barCart.rewards.reduce((s, r) => s + (r.points || 0), 0);

    // Build order payload
    const orderData = {
        action: 'bar_order',
        clientCode: user.code,
        clientName: user.name,
        clubName: currentScanData?.clubName || '',
        rewards: barCart.rewards.map(r => ({ name: r.name, points: r.points })),
        products: barCart.products.map(p => ({ name: p.name, qty: p.qty, unitPrice: p.priceNum, total: p.priceNum * p.qty })),
        totalWithoutRewards: totalProducts,
        totalWithRewards: totalProducts,
        pointsUsed: totalPts
    };

    // Encode as URL for barman to scan
    const baseUrl = window.location.origin + window.location.pathname;
    const qrUrl = baseUrl + '?action=scan&type=barman_order&data=' + encodeURIComponent(JSON.stringify(orderData));

    showKioskPage('qr');

    // Generate QR
    const qrBox = document.getElementById('kiosk-qr-code');
    qrBox.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrBox, { text: qrUrl, width: 220, height: 220, colorDark: '#ffffff', colorLight: 'transparent' });
    } else {
        qrBox.innerHTML = '<p style="color: var(--text-dim);">QR Code generation unavailable</p>';
    }

    document.getElementById('qr-recap-total').textContent = totalProducts.toFixed(2) + ' \u20AC';
    document.getElementById('qr-recap-pts').textContent = totalPts + ' pts';

    // Send draft to webhook
    sendBarOrderDraft(user.code, JSON.stringify(orderData));
}

async function sendBarOrderDraft(userCode, payload) {
    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/bar_order_draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload || JSON.stringify({
                action: 'draft_order',
                club_name: currentScanData?.clubName,
                clientCode: userCode,
                rewards: barCart.rewards.map(r => r.name),
                products: barCart.products.map(p => ({ name: p.name, qty: p.qty }))
            })
        });
    } catch(e) {}
}

// ----- Barman Order Validation -----
let currentBarmanOrder = null;

function showBarmanOrderReview(orderData) {
    currentBarmanOrder = orderData;

    // Ensure dashboard is visible (barman may not be logged in as fétard)
    const authScreen = document.getElementById('auth-screen');
    const dashScreen = document.getElementById('dashboard-screen');
    if (authScreen) authScreen.classList.remove('active');
    if (dashScreen) dashScreen.classList.add('active');

    // Hide all other containers, show barman container
    document.querySelectorAll('.verify-card').forEach(c => c.style.display = 'none');
    const barmanContainer = document.getElementById('verify-barman-container');
    barmanContainer.style.display = 'block';

    // Switch to verify view
    switchMainView('verify');

    // Fill in data
    document.getElementById('barman-club-name').textContent = orderData.clubName || '';
    document.getElementById('barman-client-name').textContent = orderData.clientName || '-';
    document.getElementById('barman-client-code').textContent = orderData.clientCode || '-';

    // Show review, hide success
    document.getElementById('barman-review-page').style.display = 'block';
    document.getElementById('barman-success-page').style.display = 'none';

    // Rewards
    const rSection = document.getElementById('barman-rewards-section');
    const rList = document.getElementById('barman-rewards-list');
    if (orderData.rewards && orderData.rewards.length > 0) {
        rSection.style.display = 'block';
        rList.innerHTML = orderData.rewards.map(r => `
            <div class="kiosk-summary-item">
                <span>${r.name}</span>
                <span class="kiosk-summary-item-cost">-${r.points} pts</span>
            </div>
        `).join('');
        document.getElementById('barman-rewards-pts').textContent = '-' + orderData.pointsUsed + ' pts';
    } else {
        rSection.style.display = 'none';
    }

    // Products
    const pSection = document.getElementById('barman-products-section');
    const pList = document.getElementById('barman-products-list');
    if (orderData.products && orderData.products.length > 0) {
        pSection.style.display = 'block';
        pList.innerHTML = orderData.products.map(p => `
            <div class="kiosk-summary-item">
                <span>${p.name} x${p.qty}</span>
                <span class="kiosk-summary-item-cost">${p.total.toFixed(2)} \u20AC</span>
            </div>
        `).join('');
        const prodTotal = orderData.products.reduce((s, p) => s + p.total, 0);
        document.getElementById('barman-products-total').textContent = prodTotal.toFixed(2) + ' \u20AC';
    } else {
        pSection.style.display = 'none';
    }

    // Totals
    document.getElementById('barman-total-no-rewards').textContent = (orderData.totalWithoutRewards || 0).toFixed(2) + ' \u20AC';
    document.getElementById('barman-total-final').textContent = (orderData.totalWithRewards || 0).toFixed(2) + ' \u20AC';
    document.getElementById('barman-pts-used').textContent = (orderData.pointsUsed || 0) + ' pts';
}

async function validateBarmanOrder() {
    if (!currentBarmanOrder) return;

    const btn = document.querySelector('.barman-validate-btn');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';

    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'validate_bar_order',
                clientCode: currentBarmanOrder.clientCode,
                clientName: currentBarmanOrder.clientName,
                clubName: currentBarmanOrder.clubName,
                totalWithoutRewards: currentBarmanOrder.totalWithoutRewards,
                totalWithRewards: currentBarmanOrder.totalWithRewards,
                pointsUsed: currentBarmanOrder.pointsUsed,
                products: currentBarmanOrder.products,
                rewards: currentBarmanOrder.rewards
            })
        });
    } catch(e) {
        console.error('Barman validation webhook error', e);
    }

    // Show success
    document.getElementById('barman-review-page').style.display = 'none';
    document.getElementById('barman-success-page').style.display = 'block';
}

// ----- Section Switching -----
let _bizSwitchTimer = null;
function switchBizSection(sectionId) {
    // Debounce rapid switching to avoid lag on mobile
    if (_bizSwitchTimer) clearTimeout(_bizSwitchTimer);

    // Close biz menu if open
    const bizMenu = document.getElementById('biz-side-menu');
    if (bizMenu && bizMenu.classList.contains('open')) {
        toggleBizMenu();
    }

    // Stop scanner if leaving scan section
    if (html5QrScanner) stopClientScanner();

    // Update active states immediately (lightweight DOM ops)
    document.querySelectorAll('.biz-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#biz-side-menu .menu-link').forEach(l => l.classList.remove('active'));

    const section = document.getElementById(`biz-section-${sectionId}`);
    if (section) {
        section.classList.add('active');
        const link = document.getElementById(`biz-link-${sectionId}`);
        if (link) link.classList.add('active');

        // Update header title immediately
        const titleMap = {
            annonces: t('nav.annonces'),
            calendrier: t('nav.calendar'),
            rewards: t('nav.rewards'),
            produits: t('nav.products'),
            commandes: 'Scan',
            stats: t('nav.stats'),
            qrcodes: t('nav.my_qr')
        };
        const headerTitle = document.getElementById('biz-header-title');
        if (headerTitle) headerTitle.textContent = titleMap[sectionId] || sectionId;

        // Defer heavy rendering to next frame so the UI switch feels instant
        _bizSwitchTimer = setTimeout(() => {
            _bizSwitchTimer = null;
            if (sectionId === 'annonces') initAnnouncementEditor();
            if (sectionId === 'calendrier') renderCalendar();
            if (sectionId === 'stats') updateStats();
            if (sectionId === 'qrcodes') generateBusinessQRCodes();
            if (sectionId === 'produits') renderProductsList();
            if (sectionId === 'commandes') startClientScanner();
        }, 30);
    }
}

function toggleBizMenu() {
    const menu = document.getElementById('biz-side-menu');
    const overlay = document.getElementById('biz-menu-overlay');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
}

// Keep toggleSidebar for backward compat (in case other code references it)
function toggleSidebar() {
    toggleBizMenu();
}

// Re-render active biz section (called on language change)
function refreshActiveBizSection() {
    const activeSection = document.querySelector('.biz-section.active');
    if (!activeSection) return;
    const id = activeSection.id.replace('biz-section-', '');
    if (id === 'annonces') { renderTemplatesGrid(); initAnnouncementEditor(); }
    if (id === 'rewards') { renderRewardsList(); }
    if (id === 'produits') { renderProductsList(); }
    if (id === 'calendrier') { renderCalendar(); }
    if (id === 'stats') { updateStats(); }
    if (id === 'qrcodes') { generateBusinessQRCodes(); }
    // Update header title
    const titleMap = {
        annonces: t('nav.annonces'),
        calendrier: t('nav.calendar'),
        rewards: t('nav.rewards'),
        produits: t('nav.products'),
        commandes: t('nav.orders'),
        stats: t('nav.stats'),
        qrcodes: t('nav.my_qr')
    };
    const headerTitle = document.getElementById('biz-header-title');
    if (headerTitle) headerTitle.textContent = titleMap[id] || id;
}

// Re-render active fêtard view (called on language change)
function refreshActiveFetardView() {
    const activeView = document.querySelector('.main-view.active');
    if (!activeView) return;
    const id = activeView.id.replace('-view', '');
    if (id === 'home') renderLocalClubs();
    if (id === 'search') { renderClubs(); }
    if (id === 'favorites') renderFavoritesView();
    if (id === 'code') renderProfile();
    // Update header title
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        const titleMap = { home: t('nav.home'), search: t('nav.search'), favorites: t('nav.favorites'), code: t('nav.code'), qr: t('nav.qr') };
        headerTitle.textContent = titleMap[id] || headerTitle.textContent;
    }
}

// ----- Business Dashboard Management -----
async function showBusinessDashboard() {
    const authScreen = document.getElementById('business-auth-screen');
    const dashboardScreen = document.getElementById('business-dashboard-screen');

    if (authScreen) {
        authScreen.classList.remove('active');
        authScreen.style.display = 'none';
    }
    if (dashboardScreen) {
        dashboardScreen.classList.add('active');
        dashboardScreen.style.display = 'block';
    }

    if (currentBusiness) {
        const bizName = currentBusiness.name || currentBusiness.nom || 'Club';
        const bizClubName = document.getElementById('biz-club-name');
        if (bizClubName) bizClubName.textContent = bizName;
        const bizDisplayName = document.getElementById('biz-display-name');
        if (bizDisplayName) bizDisplayName.textContent = bizName;

        // Sync local arrays with currentBusiness data
        bizTemplates = currentBusiness.bizTemplates || [];
        announcementTemplates = currentBusiness.announcementTemplates || [];
        bizProducts = currentBusiness.products || [];
        bizSchedule = currentBusiness.schedule || {};

        // Load rewards + announcement templates from Supabase (source of truth)
        await loadBizRewards();
        renderRewardsList();
        await loadAnnouncementTemplates();
        renderTemplatesGrid();
    }

    // Default view
    switchBizSection('annonces');
}

// ----- Products Management -----
let bizProducts = [];
let editingProductId = null;
let productFilterCategory = 'all';
let selectedProductCategory = 'Soft';

// Custom select toggle
function toggleCustomSelect(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    // Close all other open selects
    document.querySelectorAll('.custom-select-wrapper.active').forEach(w => {
        if (w.id !== wrapperId) w.classList.remove('active');
    });
    wrapper.classList.toggle('active');
}

// Close custom selects on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper.active').forEach(w => w.classList.remove('active'));
    }
});

function selectProductCategory(val) {
    selectedProductCategory = val;
    const valueEl = document.getElementById('product-category-value');
    if (valueEl) valueEl.textContent = val;
    const wrapper = document.getElementById('product-category-wrapper');
    if (wrapper) {
        wrapper.classList.remove('active');
        wrapper.querySelectorAll('.select-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.value === val);
        });
    }
}

function selectProductFilter(val) {
    const valueEl = document.getElementById('product-filter-value');
    if (valueEl) valueEl.textContent = val === 'all' ? 'Toutes les catégories' : val;
    const wrapper = document.getElementById('product-filter-wrapper');
    if (wrapper) {
        wrapper.classList.remove('active');
        wrapper.querySelectorAll('.select-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.value === val);
        });
    }
    filterProducts(val);
}

function handleCreateProduct() {
    const name = document.getElementById('product-name').value;
    const price = document.getElementById('product-price').value;
    const desc = document.getElementById('product-desc').value;
    const category = selectedProductCategory;
    const image = document.getElementById('product-image-input-hidden')?.value || '';

    if (!name || !price) {
        showConfirmModal('Champs requis', 'Veuillez remplir au moins le nom et le prix.', () => {});
        return;
    }

    if (editingProductId) {
        const idx = bizProducts.findIndex(p => p.id === editingProductId);
        if (idx > -1) {
            bizProducts[idx] = { ...bizProducts[idx], name, price, desc, category, image: image || bizProducts[idx].image };
        }
        editingProductId = null;
    } else {
        const product = { id: 'prod_' + Date.now(), name, price, desc, category, image };
        bizProducts.push(product);
    }

    if (currentBusiness) {
        currentBusiness.products = bizProducts;
        saveBusinessData();
    }

    renderProductsList();
    resetProductForm();
    showSaveToast();
}

function resetProductForm() {
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-desc').value = '';
    selectProductCategory('Soft');
    editingProductId = null;
    const hiddenInput = document.getElementById('product-image-input-hidden');
    if (hiddenInput) hiddenInput.value = '';
    const placeholder = document.getElementById('product-image-placeholder');
    if (placeholder) {
        placeholder.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Ajouter une image</span>`;
        placeholder.classList.remove('has-image');
    }
}

function loadProductForEdit(id) {
    const p = bizProducts.find(x => x.id === id);
    if (!p) return;
    editingProductId = id;
    document.getElementById('product-name').value = p.name || '';
    document.getElementById('product-price').value = p.price || '';
    document.getElementById('product-desc').value = p.desc || '';
    selectProductCategory(p.category || 'Soft');
    if (p.image) {
        let hiddenInput = document.getElementById('product-image-input-hidden');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'product-image-input-hidden';
            document.body.appendChild(hiddenInput);
        }
        hiddenInput.value = p.image;
        const placeholder = document.getElementById('product-image-placeholder');
        if (placeholder) {
            placeholder.classList.add('has-image');
            placeholder.innerHTML = `<img src="${p.image}" style="width:100%; height:120px; object-fit:cover;">`;
        }
    }
    document.querySelector('.products-create-panel')?.scrollIntoView({ behavior: 'smooth' });
}

function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        let hiddenInput = document.getElementById('product-image-input-hidden');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'product-image-input-hidden';
            document.body.appendChild(hiddenInput);
        }
        hiddenInput.value = e.target.result;
        const placeholder = document.getElementById('product-image-placeholder');
        if (placeholder) {
            placeholder.classList.add('has-image');
            placeholder.innerHTML = `<img src="${e.target.result}" style="width:100%; height:120px; object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(file);
}

function addNewProductCategory() {
    showPromptModal('Nouvelle catégorie', 'Entrez le nom de la nouvelle catégorie :', (catName) => {
        const optionsContainer = document.getElementById('product-category-options');
        if (!optionsContainer) return;
        const exists = Array.from(optionsContainer.querySelectorAll('.select-option')).some(o => o.dataset.value.toLowerCase() === catName.toLowerCase());
        if (!exists) {
            const opt = document.createElement('div');
            opt.className = 'select-option';
            opt.dataset.value = catName;
            opt.textContent = catName;
            opt.onclick = () => selectProductCategory(catName);
            optionsContainer.appendChild(opt);
        }
        selectProductCategory(catName);
        renderProductCategoryFilters();
    });
}

function filterProducts(category) {
    productFilterCategory = category;
    renderProductsList();
}

function renderProductCategoryFilters() {
    const filterOptions = document.getElementById('product-filter-options');
    const createOptions = document.getElementById('product-category-options');
    if (!filterOptions) return;

    // Collect all categories from products + create dropdown
    const categories = [...new Set(bizProducts.map(p => p.category).filter(Boolean))];
    if (createOptions) {
        createOptions.querySelectorAll('.select-option').forEach(o => {
            if (o.dataset.value && !categories.includes(o.dataset.value)) categories.push(o.dataset.value);
        });
    }

    // Rebuild filter dropdown
    const currentVal = productFilterCategory;
    filterOptions.innerHTML = '<div class="select-option' + (currentVal === 'all' ? ' selected' : '') + '" data-value="all" onclick="selectProductFilter(\'all\')">Toutes les catégories</div>';
    categories.forEach(c => {
        const opt = document.createElement('div');
        opt.className = 'select-option' + (currentVal === c ? ' selected' : '');
        opt.dataset.value = c;
        opt.textContent = c;
        opt.onclick = () => selectProductFilter(c);
        filterOptions.appendChild(opt);
    });
}

function renderProductsList() {
    const grid = document.getElementById('biz-products-grid');
    if (!grid) return;

    renderProductCategoryFilters();

    let filtered = bizProducts;
    if (productFilterCategory !== 'all') {
        filtered = bizProducts.filter(p => p.category === productFilterCategory);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 40px;">${productFilterCategory !== 'all' ? t('biz.no_product_category') : t('biz.no_product')}</p>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="product-card">
            <div class="product-card-image" style="background-image: url('${p.image || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300'}')"></div>
            <div class="product-card-body">
                <div class="product-card-name-row">
                    <span class="product-card-name">${p.name}</span>
                    ${p.category ? `<span class="product-card-category">${p.category}</span>` : ''}
                </div>
                <div class="product-card-price">${p.price}</div>
                <div class="product-card-desc">${p.desc || ''}</div>
                <div class="product-card-actions">
                    <button class="btn-mini btn-edit" onclick="loadProductForEdit('${p.id}')">Modifier</button>
                    <button class="btn-mini btn-delete" onclick="deleteProduct('${p.id}')">Supprimer</button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteProduct(id) {
    showConfirmModal('Supprimer ce produit ?', 'Cette action est irréversible.', () => {
        bizProducts = bizProducts.filter(p => p.id !== id);
        if (currentBusiness) currentBusiness.products = bizProducts;
        saveBusinessData();
        renderProductsList();
    });
}
