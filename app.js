let currentBusiness = JSON.parse(localStorage.getItem('businessUser')) || null;

// Initialize View on Load
document.addEventListener('DOMContentLoaded', () => {
    const isBusinessView = document.body.classList.contains('view-entreprise');
    const fetarsEl = document.getElementById('fetars-view');
    const entrepriseEl = document.getElementById('entreprise-view');
    const bizAuthScreen = document.getElementById('business-auth-screen');
    
    console.log('App Init - isBusinessView:', isBusinessView);

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

function switchBizSection(sectionId) {
    document.querySelectorAll('.biz-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`biz-section-${sectionId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(sectionId));
    });
}

function handleBusinessLogout() {
    localStorage.removeItem('businessUser');
    location.reload();
}

async function handleBusinessSignup(e) {
    e.preventDefault();
    const name = document.getElementById('biz-signup-name').value;
    const password = document.getElementById('biz-signup-password').value;
    const btn = document.getElementById('biz-signup-btn');
    const msg = document.getElementById('biz-signup-message');

    btn.disabled = true;
    btn.textContent = 'Création...';

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'business_signup',
                clubName: name, 
                password: password,
                role: 'owner'
            })
        });

        if (response.ok) {
            msg.textContent = 'Inscription réussie ! Vous pouvez vous connecter.';
            msg.style.color = 'var(--success)';
            setTimeout(() => switchBizTab('login'), 2000);
        } else {
            throw new Error('Erreur lors de l\'inscription');
        }
    } catch (error) {
        msg.textContent = 'Erreur: ' + error.message;
        msg.style.color = 'var(--danger)';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Créer mon espace';
    }
}

async function handleBusinessLogin(e) {
    e.preventDefault();
    const password = document.getElementById('biz-login-password').value;
    const btn = document.getElementById('biz-login-btn');
    const msg = document.getElementById('biz-login-message');

    btn.disabled = true;
    btn.textContent = 'Connexion...';

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'business_login',
                password: password 
            })
        });

        if (response.ok) {
            const data = await response.json();
            currentBusiness = { name: name, ...data };
            localStorage.setItem('businessUser', JSON.stringify(currentBusiness));
            showBusinessDashboard();
        } else {
            throw new Error('Identifiants incorrects');
        }
    } catch (error) {
        msg.textContent = 'Erreur: ' + error.message;
        msg.style.color = 'var(--danger)';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Se connecter';
    }
}

let bizTemplates = currentBusiness?.templates || [];
let bizSchedule = currentBusiness?.schedule || {};
let calendarDate = new Date();
let selectedDates = new Set();

let bizRewards = currentBusiness?.rewards || [];
let lastFoundClient = null;

function showBusinessDashboard() {
    const authScreen = document.getElementById('business-auth-screen');
    const dashScreen = document.getElementById('business-dashboard-screen');
    const clubNameEl = document.getElementById('biz-club-name');

    if (authScreen) authScreen.style.display = 'none';
    if (dashScreen) dashScreen.style.display = 'flex';
    if (clubNameEl && currentBusiness) clubNameEl.textContent = currentBusiness.name;
    
    // Re-initialize lists/stats if elements exist
    if (document.getElementById('biz-calendar-grid')) renderCalendar();
    if (document.getElementById('biz-template-list')) renderTemplateList();
    if (document.getElementById('biz-rewards-list')) renderRewardsList();
    if (document.getElementById('stats-total-scans')) updateStatsUI();
    
    loadBusinessData();
}

// ----- Rewards Logic -----
function handleCreateReward(e) {
    e.preventDefault();
    const name = document.getElementById('rew-name').value;
    const points = parseInt(document.getElementById('rew-points').value);
    const image = document.getElementById('rew-image').value;
    const code = document.getElementById('rew-code').value;
    
    const newRew = {
        id: 'rew_' + Date.now(),
        name: name,
        points: points,
        image: image,
        secretCode: code
    };
    
    bizRewards.push(newRew);
    currentBusiness.rewards = bizRewards;
    
    renderRewardsList();
    e.target.reset();
    saveBusinessData();
}

function renderRewardsList() {
    const list = document.getElementById('biz-rewards-list');
    list.innerHTML = bizRewards.length ? '' : '<p style="font-size:12px; color:var(--text-dim);">Aucune récompense créée.</p>';
    
    bizRewards.forEach(r => {
        const item = document.createElement('div');
        item.className = 'reward-item-card';
        item.style = "background: var(--surface); padding: 12px; border-radius: 12px; border: 1px solid var(--border); display: flex; gap: 12px; align-items: center; margin-bottom: 8px;";
        item.innerHTML = `
            ${r.image ? `<img src="${r.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` : '<div style="width: 40px; height: 40px; background: var(--surface-hover); border-radius: 8px;"></div>'}
            <div style="flex: 1;">
                <h5 style="margin: 0; font-size: 14px;">${r.name}</h5>
                <p style="margin: 2px 0 0; font-size: 12px; color: var(--primary-light);">${r.points} Pts • Code: ${r.secretCode}</p>
            </div>
        `;
        list.appendChild(item);
    });
}

// ----- Redemption Logic -----
async function searchClientForReward() {
    const code = document.getElementById('biz-client-code-search').value;
    if (!code) return;

    const resultDiv = document.getElementById('biz-client-result');
    const nameEl = document.getElementById('res-client-name');
    const pointsEl = document.getElementById('res-client-points');
    const rewardsEl = document.getElementById('biz-available-rewards');

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
            
            nameEl.textContent = client.name;
            pointsEl.textContent = `${client.points} Points`;
            resultDiv.style.display = 'block';
            
            renderAvailableRewardsForClient(client.points);
        } else {
            alert('Client non trouvé');
            resultDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function renderAvailableRewardsForClient(points) {
    const list = document.getElementById('biz-available-rewards');
    list.innerHTML = '';
    
    if (bizRewards.length === 0) {
        list.innerHTML = '<p style="font-size:12px; color:var(--text-dim);">Aucune récompense configurée par le club.</p>';
        return;
    }

    bizRewards.forEach(r => {
        const canAfford = points >= r.points;
        const item = document.createElement('div');
        item.style = `background: ${canAfford ? 'var(--surface-hover)' : 'rgba(255,255,255,0.02)'}; padding: 16px; border-radius: 16px; border: 1px solid ${canAfford ? 'var(--primary-glow)' : 'var(--border)'}; text-align: center; opacity: ${canAfford ? '1' : '0.5'}`;
        item.innerHTML = `
            ${r.image ? `<img src="${r.image}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover; margin-bottom: 12px;">` : '<div style="width: 60px; height: 60px; background: var(--surface); border-radius: 12px; margin: 0 auto 12px;"></div>'}
            <h5 style="font-size: 14px; margin-bottom: 4px;">${r.name}</h5>
            <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 12px;">${r.points} pts</p>
            <button class="btn-primary" style="height: 36px; font-size: 12px; width: 100%;" ${canAfford ? '' : 'disabled'} onclick="redeemReward('${r.id}')">
                ${canAfford ? 'Valider' : 'Points insuffisants'}
            </button>
        `;
        list.appendChild(item);
    });
}

async function redeemReward(rewardId) {
    const reward = bizRewards.find(r => r.id === rewardId);
    if (!reward || !lastFoundClient) return;

    if (!confirm(`Confirmer la distribution de "${reward.name}" à ${lastFoundClient.name} ?`)) return;

    try {
        const response = await fetch('https://n8n.srv862127.hstgr.cloud/webhook/0778847c-7164-42b7-873d-4c340d859d9c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'redeem_reward',
                clientCode: lastFoundClient.code,
                clubName: currentBusiness.name,
                rewardId: reward.id,
                pointsToDeduct: reward.points
            })
        });

        if (response.ok) {
            alert(`Récompense attribuée ! \n\nCODE À ENTRER EN CAISSE : ${reward.secretCode}`);
            searchClientForReward(); // Refresh client view
        } else {
            alert('Erreur lors de la distribution');
        }
    } catch (error) {
        console.error('Redeem error:', error);
    }
}

function updateStatsUI() {
    const filter = document.getElementById('stats-party-filter').value;
    
    // Mocking data based on filter
    const data = {
        all: { scans: 1280, rewards: 450, avg: 680, m: 45, f: 40, nb: 10, unk: 5 },
        soirée: { scans: 320, rewards: 110, avg: 320, m: 50, f: 35, nb: 10, unk: 5 }
    };
    
    const s = data[filter === 'all' ? 'all' : 'soirée'];
    
    document.getElementById('stats-total-scans').textContent = s.scans.toLocaleString();
    document.getElementById('stats-rewards-given').textContent = s.rewards.toLocaleString();
    document.getElementById('stats-avg-attendance').textContent = s.avg.toLocaleString();
    
    // Update Bars
    updateBar('m', s.m);
    updateBar('f', s.f);
    updateBar('nb', s.nb);
    updateBar('unk', s.unk);
    
    // Update Rewards List
    const rewList = document.getElementById('stats-rewards-list');
    rewList.innerHTML = '';
    
    if (bizRewards.length) {
        bizRewards.forEach(r => {
            const usage = Math.floor(Math.random() * 50) + 10; // Mock usage
            const row = document.createElement('div');
            row.style = "display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03);";
            row.innerHTML = `<span style="font-size: 13px;">${r.name}</span><span style="font-weight: 700; color: var(--primary-light);">${usage}</span>`;
            rewList.appendChild(row);
        });
    } else {
        rewList.innerHTML = '<p style="font-size: 12px; color: var(--text-dim);">Aucune récompense configurée.</p>';
    }
}

function updateBar(id, percent) {
    const bar = document.getElementById(`bar-${id}`);
    const val = document.getElementById(`val-${id}`);
    if (bar && val) {
        bar.style.height = percent + '%';
        val.textContent = percent + '%';
    }
}

// ----- Calendar Logic -----
function renderCalendar() {
    const grid = document.getElementById('biz-calendar-grid');
    const monthLabel = document.getElementById('calendar-month-year');
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjust for Monday start (0=Sun, 1=Mon... 6=Sat)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset === -1) startOffset = 6;
    
    monthLabel.textContent = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';
    
    // Fill empty slots
    for (let i = 0; i < startOffset; i++) {
        const d = document.createElement('div');
        d.className = 'calendar-day not-current';
        grid.appendChild(d);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const d = document.createElement('div');
        d.className = 'calendar-day';
        if (selectedDates.has(dateStr)) d.classList.add('selected');
        
        const scheduleItem = bizSchedule[dateStr];
        if (scheduleItem && scheduleItem !== 'closed') {
            const template = bizTemplates.find(t => t.id === scheduleItem);
            d.classList.add('has-event');
            d.innerHTML = `<span>${day}</span><span class="event-label">${template ? template.name : 'Soirée'}</span>`;
        } else {
            d.classList.add('closed');
            d.innerHTML = `<span>${day}</span><span class="closed-indicator">Fermé</span>`;
        }
        
        d.onclick = () => toggleDateSelection(dateStr);
        grid.appendChild(d);
    }
}

function changeMonth(dir) {
    calendarDate.setMonth(calendarDate.getMonth() + dir);
    renderCalendar();
}

function toggleDateSelection(dateStr) {
    if (selectedDates.has(dateStr)) {
        selectedDates.delete(dateStr);
    } else {
        selectedDates.add(dateStr);
    }
    
    const actions = document.getElementById('biz-calendar-actions');
    const count = document.getElementById('selected-days-count');
    
    actions.style.display = selectedDates.size > 0 ? 'block' : 'none';
    count.textContent = `${selectedDates.size} jour(s) sélectionné(s)`;
    
    renderCalendar();
}

function renderTemplateList() {
    const list = document.getElementById('biz-template-list');
    const select = document.getElementById('biz-apply-template');
    
    list.innerHTML = bizTemplates.length ? '' : '<p style="font-size:12px; color:var(--text-dim);">Aucun template créé.</p>';
    
    // Reset select options (keep static ones)
    const options = select.querySelectorAll('option');
    options.forEach((opt, index) => { if(index > 1) opt.remove(); });

    bizTemplates.forEach(t => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.innerHTML = `<h5>${t.name}</h5><p>${t.theme || 'Sans thème'}</p>`;
        list.appendChild(item);
        
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        select.appendChild(opt);
    });
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
    e.preventDefault();
    const btn = document.getElementById('btn-save-annonces');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';

    const data = {
        action: 'update_club_annonces',
        clubName: currentBusiness.name,
        image: document.getElementById('biz-club-image').value,
        insta: document.getElementById('biz-club-insta').value,
        description: document.getElementById('biz-club-desc').value,
        partyName: document.getElementById('biz-party-name').value,
        partyTheme: document.getElementById('biz-party-theme').value
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
            alert('Annonces enregistrées avec succès !');
        } else {
            throw new Error('Erreur lors de la sauvegarde');
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
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
