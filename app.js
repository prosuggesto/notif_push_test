let currentBusiness = JSON.parse(localStorage.getItem('businessUser')) || null;

// Initialize View on Load
document.addEventListener('DOMContentLoaded', () => {
    const isBusinessView = document.body.classList.contains('view-entreprise');
    const fetarsEl = document.getElementById('fetars-view');
    const entrepriseEl = document.getElementById('entreprise-view');
    const bizAuthScreen = document.getElementById('business-auth-screen');

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    console.log('App Init - isBusinessView:', isBusinessView, 'Action:', action);

    if (isBusinessView) {
        // Mode Entreprise
        if (fetarsEl) fetarsEl.style.display = 'none';
        if (entrepriseEl) entrepriseEl.style.display = 'block';

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

        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'scan' || params.get('clubId')) {
            handleNativeScan();
        } else {
            const stored = localStorage.getItem('user');
            if (stored) {
                const user = JSON.parse(stored);
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
    localStorage.removeItem('businessUser');
    document.body.classList.remove('logged-in-biz');
    location.reload();
}

async function handleBusinessSignup(e) {
    e.preventDefault();
    const name = document.getElementById('biz-signup-name').value.trim();
    const password = document.getElementById('biz-signup-password').value.trim();
    const email = name.toLowerCase().replace(/\s+/g, '') + '@suggesto.biz'; // Fallback for backend requirement
    const btn = document.getElementById('biz-signup-btn');
    const msg = document.getElementById('biz-signup-message');

    if (!name || !password) {
        showMessage('biz-signup-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Création en cours...';

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
                email: email, 
                password: password,
                uuid: uuid,
                user_code: userCode,
                role: 'business',
                age: 'N/A',
                sexe: 'Autre',
                ville: 'N/A'
            })
        });

        const raw = await response.json().catch(() => null);
        const data = Array.isArray(raw) ? raw[0] : raw;

        if (response.ok && data && data.statut !== 'invalid') {
            currentBusiness = {
                name: name,
                uuid: uuid,
                user_code: userCode,
                ...data
            };
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            msg.textContent = 'Inscription réussie ! Redirection...';
            msg.className = 'form-message success';
            setTimeout(() => showBusinessDashboard(), 500);
        } else {
            throw new Error(data?.phrase || 'Erreur lors de l\'inscription');
        }
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
    const password = document.getElementById('biz-login-password').value.trim();
    const btn = document.getElementById('biz-login-btn');
    const msg = document.getElementById('biz-login-message');

    if (!password) {
        showMessage('biz-login-message', 'Veuillez entrer un mot de passe.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Connexion...';

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

        if (response.ok && data && data.statut !== 'invalid') {
            currentBusiness = { 
                name: data.nom || 'Club Partenaire', 
                uuid: data.userid || data.uuid,
                ...data 
            };
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            showBusinessDashboard();
        } else {
            throw new Error(data?.phrase || 'Identifiants incorrects');
        }
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

function searchClientForCommande() {
    const code = document.getElementById('biz-client-code-search').value.trim();
    if (!code) return;

    // Reuse search logic but with commande UI
    searchClientForReward(true); // Flag to indicate commande mode
}

// Note: searchClientForReward will be updated later to handle both modes

function updateAnnoncesPreview() {
    const previewContainer = document.getElementById('annonces-preview-card');
    if (!previewContainer) return;

    // Get current values
    const clubName = document.getElementById('biz-club-name-hidden')?.value || (currentBusiness ? currentBusiness.name : 'Mon Club');
    const image = document.getElementById('biz-club-image').value || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=2070&auto=format&fit=crop';
    const insta = document.getElementById('biz-club-insta').value || '@votreclub';
    const desc = document.getElementById('biz-club-desc').value || 'Aucune description fournie.';
    const price = document.getElementById('biz-club-price')?.value || '20€';
    const partyName = document.getElementById('biz-party-name').value || 'Soirée Spéciale';
    const partyTheme = document.getElementById('biz-party-theme').value || 'Ambiance & Cocktails';

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
                <div class="hero-edit-hint">📷 Changer l'image</div>
            </div>
            <div class="editable-text club-hero-name" contenteditable="true" data-field="biz-club-name-hidden">
                ${clubName}
            </div>
        </div>
        
        <div class="modal-content-inner">
            <div class="detail-section">
                <h4>À propos de l'établissement</h4>
                <p class="text-dim editable-text" contenteditable="true" data-field="biz-club-desc" data-multi="true">${desc}</p>
                <div class="insta-link-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    <span class="editable-text" contenteditable="true" data-field="biz-club-insta">${insta}</span>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Entrée</span>
                    <span class="detail-val editable-text" contenteditable="true" data-field="biz-club-price">${price}</span>
                </div>
                <div class="detail-item read-only biz-anchor-public">
                    <span class="detail-label">Public (Live)</span>
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
                    <span class="theme-tag">SOIRÉE ACTUELLE</span>
                    <h4 class="editable-text" contenteditable="true" data-field="biz-party-name">${partyName}</h4>
                </div>
                <p class="text-small editable-text" contenteditable="true" data-field="biz-party-theme">${partyTheme}</p>
            </div>
        </div>
    `;

    const defaultTexts = [
        (currentBusiness ? currentBusiness.name : 'Mon Club'),
        'Mon Club',
        '@votreclub',
        'Aucune description fournie.',
        '20€',
        'Soirée Spéciale',
        'Ambiance & Cocktails'
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
        partyName: templateName || document.getElementById('biz-party-name').value,
        partyTheme: document.getElementById('biz-party-theme').value,
        timestamp: new Date().toISOString()
    };

    if (editingTemplateId) {
        // Update existing template in place
        const idx = announcementTemplates.findIndex(t => t.id === editingTemplateId);
        if (idx > -1) {
            announcementTemplates[idx] = { ...announcementTemplates[idx], ...templateData };
        }
        editingTemplateId = null;
    } else {
        // Create new template
        templateData.id = 'ann_' + Date.now();

        const previewCard = document.getElementById('annonces-preview-card');
        if (previewCard) {
            animateCardToGrid(previewCard);
        }

        announcementTemplates.unshift(templateData);
    }

    if (currentBusiness) {
        currentBusiness.announcementTemplates = announcementTemplates;
        localStorage.setItem('businessUser', JSON.stringify(currentBusiness));

        try {
            await handleSaveAnnonces();
        } catch (err) {
            console.error('Error saving announcement:', err);
        }
    }

    renderTemplatesGrid();
    btn.classList.remove('loading');
    showSaveToast();
}

function animateCardToGrid(card) {
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
    showConfirmModal(
        'Supprimer la sélection ?',
        `Êtes-vous sûr de vouloir supprimer ces ${selectedTemplateIds.size} templates ?`,
        async () => {
            announcementTemplates = announcementTemplates.filter(t => !selectedTemplateIds.has(t.id));
            selectedTemplateIds.clear();
            
            if (currentBusiness) {
                currentBusiness.announcementTemplates = announcementTemplates;
                localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
                await handleSaveAnnonces();
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
        (t.partyName || '').toLowerCase().includes(templateSearchQuery) ||
        (t.partyTheme || '').toLowerCase().includes(templateSearchQuery)
    );

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            ${templateSearchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucun template pour le moment.'}
        </p>`;
        return;
    }

    grid.innerHTML = filtered.map(t => `
        <div class="template-card ${selectedTemplateIds.has(t.id) ? 'selected' : ''}" 
             id="tpl-${t.id}" 
             onclick="toggleTemplateSelection('${t.id}', event)">
            <div class="template-card-hero" style="background-image: url('${t.image || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=2070&auto=format&fit=crop'}')"></div>
            <div class="template-card-content">
                <div class="template-card-title">${t.partyName || 'Sans nom'}</div>
                <div class="template-card-desc">${t.partyTheme || 'Aucun thème'}</div>
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

function deleteAdminTemplate(id) {
    showConfirmModal(
        'Supprimer ce template ?', 
        'Cette action est irréversible et supprimera le template de votre bibliothèque.',
        () => {
            announcementTemplates = announcementTemplates.filter(t => t.id !== id);
            if (currentBusiness) {
                currentBusiness.announcementTemplates = announcementTemplates;
                localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            }
            renderTemplatesGrid();
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

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        // Update hidden input
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

// ----- Rewards Logic -----
function handleCreateReward(e) {
    e.preventDefault();
    const name = document.getElementById('rew-name').value;
    const points = parseInt(document.getElementById('rew-points').value);
    const image = document.getElementById('rew-image').value;
    const basePrice = document.getElementById('rew-base-price')?.value || '';
    const code = document.getElementById('rew-code')?.value || '';
    
    const newRew = {
        id: 'rew_' + Date.now(),
        name: name,
        points: points,
        image: image,
        basePrice: basePrice,
        secretCode: code
    };
    
    bizRewards.push(newRew);
    currentBusiness.rewards = bizRewards;
    
    renderRewardsList();
    e.target.reset();
    
    // Reset image preview
    const preview = document.getElementById('rew-image-preview');
    if (preview) {
        preview.className = 'rew-image-placeholder';
        preview.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Ajouter une image</span>
        `;
    }
    
    saveBusinessData();
    showSaveToast();
}

function handleRewardImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('rew-image').value = e.target.result;
        const preview = document.getElementById('rew-image-preview');
        preview.className = 'rew-image-placeholder has-image';
        preview.innerHTML = `<img src="${e.target.result}" alt="Reward preview">`;
    };
    reader.readAsDataURL(file);
}

function renderRewardsList() {
    const grid = document.getElementById('biz-rewards-grid');
    if (!grid) return;
    
    if (bizRewards.length === 0) {
        grid.innerHTML = `<p class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            Aucune récompense créée pour le moment.
        </p>`;
        return;
    }

    grid.innerHTML = bizRewards.map(r => `
        <div class="reward-card">
            <div class="reward-card-image" style="${r.image ? `background-image: url('${r.image}')` : ''}">
                ${!r.image ? '<svg class="no-img-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' : ''}
            </div>
            <div class="reward-card-body">
                <div class="reward-card-name">${r.name}</div>
                <div class="reward-card-meta">
                    <span class="badge badge-points">⭐ ${r.points} pts</span>
                    ${r.basePrice ? `<span class="badge badge-price">💰 ${r.basePrice}</span>` : ''}
                </div>
                <div class="reward-card-actions">
                    <button class="btn-rew-delete" onclick="deleteReward('${r.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteReward(id) {
    showConfirmModal(
        'Supprimer cette récompense ?',
        'Cette action est irréversible.',
        () => {
            bizRewards = bizRewards.filter(r => r.id !== id);
            currentBusiness.rewards = bizRewards;
            renderRewardsList();
            saveBusinessData();
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
    
    if (bizRewards.length === 0) {
        list.innerHTML = '<p style="font-size:12px; color:var(--text-dim); grid-column: 1/-1;">Aucun reward.</p>';
        return;
    }

    bizRewards.forEach(r => {
        const canAfford = points >= r.points;
        const isSelected = selectedCommandeRewards.find(sr => sr.id === r.id);
        
        const item = document.createElement('div');
        item.className = `reward-item-sel ${isSelected ? 'active' : ''}`;
        item.style = `background: ${canAfford ? 'var(--surface)' : 'rgba(255,255,255,0.02)'}; padding: 12px; border-radius: 12px; border: 1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; text-align: center; opacity: ${canAfford ? '1' : '0.5'}; cursor: ${canAfford ? 'pointer' : 'default'}; transition: all 0.2s;`;
        
        item.innerHTML = `
            <h5 style="font-size: 13px; margin-bottom: 2px;">${r.name}</h5>
            <p style="font-size: 11px; color: var(--primary-light); font-weight: bold;">${r.points} pts</p>
        `;
        
        if (canAfford) {
            item.onclick = () => {
                const idx = selectedCommandeRewards.findIndex(sr => sr.id === r.id);
                if (idx > -1) {
                    selectedCommandeRewards.splice(idx, 1);
                } else {
                    selectedCommandeRewards.push(r);
                }
                renderCommandeRewards(points);
                updateCommandeRecap();
            };
        }
        list.appendChild(item);
    });
}

function updateCommandeRecap() {
    const recap = document.getElementById('biz-commande-recap');
    const totalPtsEl = document.getElementById('biz-commande-total-pts');
    if (!recap) return;

    let html = '';
    let totalPoints = 0;

    selectedCommandeRewards.forEach(r => {
        html += `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                    <span>🎁 ${r.name}</span>
                    <span style="color:#ef4444;">-${r.points} pts</span>
                 </div>`;
        totalPoints += r.points;
    });

    if (html === '') {
        html = '<p style="font-size: 13px; color: var(--text-dim);">Aucune sélection.</p>';
    }

    recap.innerHTML = html;
    totalPtsEl.textContent = `${totalPoints} pts`;
}

async function validateCommande() {
    if (!lastFoundClient) return;
    
    const totalPointsToDeduct = selectedCommandeRewards.reduce((sum, r) => sum + r.points, 0);
    
    if (!confirm(`Valider la commande pour ${lastFoundClient.name} ? (+1 point de visite, -${totalPointsToDeduct} points rewards)`)) return;

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'validate_commande',
                clientCode: lastFoundClient.code,
                clubName: currentBusiness.name || currentBusiness.nom,
                deductPoints: totalPointsToDeduct,
                incrementVisit: 1,
                items: selectedCommandeRewards.map(r => r.name)
            })
        });

        if (response.ok) {
            alert('Commande validée !');
            document.getElementById('biz-client-result').style.display = 'none';
            document.getElementById('biz-client-code-search').value = '';
            updateStatsUI();
        } else {
            alert('Erreur lors de la validation');
        }
    } catch (error) {
        console.error('Validation error:', error);
    }
}

// ===== QR CODES MODULE =====
function generateBusinessQRCodes() {
    const entryDiv = document.getElementById('qr-code-entry');
    const barDiv = document.getElementById('qr-code-bar');
    if (!entryDiv || !barDiv || !currentBusiness) return;

    entryDiv.innerHTML = '';
    barDiv.innerHTML = '';

    const clubName = currentBusiness.name || currentBusiness.nom;
    const baseUrl = window.location.origin + window.location.pathname.replace('entreprise.html', 'auth.html');
    
    const entryUrl = `${baseUrl}?action=scan&type=entry&club=${encodeURIComponent(clubName)}`;
    const barUrl = `${baseUrl}?action=scan&type=bar&club=${encodeURIComponent(clubName)}`;

    new QRCode(entryDiv, { text: entryUrl, width: 200, height: 200 });
    new QRCode(barDiv, { text: barUrl, width: 200, height: 200 });
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
    
    monthLabel.textContent = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
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
        
        // Single click = toggle selection, Double click = preview or picker
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            if (calClickTimeout) {
                clearTimeout(calClickTimeout);
                calClickTimeout = null;
                // Double click
                if (bizSchedule[dateStr]) {
                    openCalPreview(dateStr);
                } else {
                    handleCalendarDblClick(dateStr);
                }
                return;
            }
            calClickTimeout = setTimeout(() => {
                calClickTimeout = null;
                toggleDateSelection(dateStr);
            }, 250);
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
    const desc = template.description || 'Aucune description fournie.';
    const insta = template.insta || '@votreclub';
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
                <h4>À propos de l'établissement</h4>
                <p class="text-dim">${desc}</p>
                <div class="insta-link-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    <span>${insta}</span>
                </div>
            </div>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Entrée</span>
                    <span class="detail-val">${price}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Public (Live)</span>
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
                    <span class="theme-tag">SOIRÉE ACTUELLE</span>
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
        html += `<div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">Aucun template trouvé pour "${query}"</div>`;
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
    if (isBusinessView && currentBusiness) {
        showBusinessDashboard();
    }
});

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
        country: 'Suisse',
        rewards: [
            { id: 'r1', name: 'Shot Offert', points: 10, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200' },
            { id: 'r2', name: 'Coupe Champagne', points: 30, image: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=200' }
        ],
        products: [
            { id: 'p1', name: 'Vodka Redbull', price: '15€', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200' },
            { id: 'p2', name: 'Bière Pression', price: '8€', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=200' }
        ]
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
        country: 'France',
        rewards: [
            { id: 'r3', name: 'Entrée Gratuite', points: 50, image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=200' }
        ],
        products: [
            { id: 'p3', name: 'Gin Tonic', price: '12€', image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=200' }
        ]
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
        country: 'France',
        rewards: [
            { id: 'r4', name: 'Accès VIP', points: 100, image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=200' }
        ],
        products: [
            { id: 'p4', name: 'Cocktail Signature', price: '18€', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200' }
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

// ----- Client QR Scan Flow (Native Camera Redirect) -----
let barSelection = { rewards: [], products: [] };

async function handleNativeScan() {
    const params = new URLSearchParams(window.location.search);
    const clubName = params.get('club');
    const type = params.get('type') || 'entry'; // entry or bar
    
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
            // Fetch club data (rewards/products) via webhook or use global clubs if available
            fetchClubDataForBar(clubName);
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

// ----- Bar Flow Logic -----
async function fetchClubDataForBar(clubName) {
    // Ideally fetch from webhook, here we simulate with nightclubs data
    const club = nightclubs.find(c => c.name === clubName);
    const rewards = club?.rewards || [];
    const products = club?.products || []; // Assumes products are also in nightclub data

    renderBarGrids(rewards, products);
}

function renderBarGrids(rewards, products) {
    const rGrid = document.getElementById('bar-rewards-grid');
    const pGrid = document.getElementById('bar-products-grid');
    if (!rGrid || !pGrid) return;

    rGrid.innerHTML = '';
    pGrid.innerHTML = '';

    rewards.forEach(r => {
        const item = document.createElement('div');
        item.className = 'bar-item';
        item.innerHTML = `
            ${r.image ? `<img src="${r.image}" class="bar-item-img">` : '<div class="bar-item-img"></div>'}
            <div class="bar-item-name">${r.name}</div>
            <div class="bar-item-cost">${r.points} pts</div>
        `;
        item.onclick = () => toggleBarSelection(r, 'reward', item);
        rGrid.appendChild(item);
    });

    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'bar-item';
        item.innerHTML = `
            ${p.image ? `<img src="${p.image}" class="bar-item-img">` : '<div class="bar-item-img"></div>'}
            <div class="bar-item-name">${p.name}</div>
            <div class="bar-item-cost">Produit</div>
        `;
        item.onclick = () => toggleBarSelection(p, 'product', item);
        pGrid.appendChild(item);
    });
}

function toggleBarSelection(item, type, element) {
    const list = type === 'reward' ? barSelection.rewards : barSelection.products;
    const idx = list.findIndex(i => i.id === item.id);
    
    if (idx > -1) {
        list.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        list.push(item);
        element.classList.add('selected');
    }
    
    updateBarTotal();
}

function updateBarTotal() {
    const total = barSelection.rewards.reduce((sum, r) => sum + r.points, 0);
    document.getElementById('bar-total-points-cost').textContent = `${total} pts`;
}

function generateBarmanCode() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    document.getElementById('bar-order-area').style.display = 'none';
    document.getElementById('bar-order-footer').style.display = 'none';
    document.querySelector('#verify-bar-container .verify-club-header p').textContent = 'Code Commande';
    
    const displayCode = document.getElementById('display-barman-code');
    displayCode.textContent = user.code;
    
    document.getElementById('barman-code-display').style.display = 'block';
    
    // Optionally pre-send order to webhook so barman sees it instantly
    sendBarOrderDraft(user.code);
}

async function sendBarOrderDraft(userCode) {
    try {
        await fetch('https://n8n.srv862127.hstgr.cloud/webhook/bar_order_draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'draft_order',
                club_name: currentScanData.clubName,
                clientCode: userCode,
                rewards: barSelection.rewards.map(r => r.name),
                products: barSelection.products.map(p => p.name)
            })
        });
    } catch(e) {}
}
// ----- Section Switching -----
function switchBizSection(sectionId) {
    console.log('Switching to biz section:', sectionId);
    
    // Close sidebar on mobile
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        toggleSidebar();
    }

    // Update active states
    document.querySelectorAll('.biz-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));

    const section = document.getElementById(`biz-section-${sectionId}`);
    if (section) {
        section.classList.add('active');
        
        // Find corresponding nav item
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('onclick')?.includes(sectionId)) {
                item.classList.add('active');
            }
        });

        // Initialize section data if needed
        if (sectionId === 'annonces') initAnnouncementEditor();
        if (sectionId === 'calendrier') renderCalendar();
        if (sectionId === 'stats') updateStats();
        if (sectionId === 'qrcodes') generateBusinessQRCodes();
        if (sectionId === 'produits') renderProductsList();
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// ----- Business Dashboard Management -----
function showBusinessDashboard() {
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
        document.getElementById('biz-club-name').textContent = currentBusiness.name || currentBusiness.nom || 'Club';
        
        // Sync local arrays with currentBusiness data
        bizTemplates = currentBusiness.bizTemplates || [];
        announcementTemplates = currentBusiness.announcementTemplates || [];
        bizRewards = currentBusiness.rewards || [];
        bizProducts = currentBusiness.products || [];
        bizSchedule = currentBusiness.schedule || {};
    }

    // Default view
    switchBizSection('annonces');
}

// ----- Products Management -----
let bizProducts = [];

function handleCreateProduct() {
    const name = document.getElementById('product-name').value;
    const price = document.getElementById('product-price').value;
    const desc = document.getElementById('product-desc').value;
    const image = document.getElementById('product-image-input-hidden')?.value || '';

    if (!name || !price) {
        alert('Veuillez remplir au moins le nom et le prix.');
        return;
    }

    const product = {
        id: 'prod_' + Date.now(),
        name,
        price,
        desc,
        image
    };

    bizProducts.push(product);
    if (currentBusiness) {
        currentBusiness.products = bizProducts;
        saveBusinessData();
    }

    renderProductsList();
    
    // Reset form
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-desc').value = '';
    const placeholder = document.getElementById('product-image-placeholder');
    if (placeholder) {
        placeholder.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Ajouter une image</span>`;
        placeholder.classList.remove('has-image');
    }
    
    showSaveToast();
}

function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        // We need a hidden input for the product image too, or just store it in a variable
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
            placeholder.innerHTML = `<img src="${e.target.result}" style="width:100%; height:160px; object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(file);
}

function renderProductsList() {
    const grid = document.getElementById('biz-products-grid');
    if (!grid) return;

    if (bizProducts.length === 0) {
        grid.innerHTML = '<p class="text-dim" style="grid-column: 1/-1; text-align: center; padding: 40px;">Aucun produit créé.</p>';
        return;
    }

    grid.innerHTML = bizProducts.map(p => `
        <div class="product-card">
            <div class="product-card-image" style="background-image: url('${p.image || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300'}')"></div>
            <div class="product-card-body">
                <div class="product-card-name">${p.name}</div>
                <div class="product-card-price">${p.price}</div>
                <div class="product-card-desc">${p.desc || ''}</div>
                <div class="product-card-actions">
                    <button class="btn-mini btn-delete" style="width: 100%;" onclick="deleteProduct('${p.id}')">Supprimer</button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteProduct(id) {
    if (!confirm('Supprimer ce produit ?')) return;
    bizProducts = bizProducts.filter(p => p.id !== id);
    if (currentBusiness) currentBusiness.products = bizProducts;
    saveBusinessData();
    renderProductsList();
}
