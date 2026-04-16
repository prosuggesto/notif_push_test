const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/lampe/.gemini/antigravity/scratch/video/notif-push-test';
const frFile = path.join(dir, 'locales', 'fr.json');
const enFile = path.join(dir, 'locales', 'en.json');
const esFile = path.join(dir, 'locales', 'es.json');
const authFile = path.join(dir, 'auth.html');
const entFile = path.join(dir, 'entreprise.html');

let fr = JSON.parse(fs.readFileSync(frFile, 'utf8'));
let en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
let es = JSON.parse(fs.readFileSync(esFile, 'utf8'));

// Update JSONs with missing placeholders
if (!fr.auth.password_placeholder) {
    fr.common.password_placeholder = "Entrez votre mot de passe";
    en.common.password_placeholder = "Enter your password";
    es.common.password_placeholder = "Introduce tu contraseña";
    
    fr.auth.fullname_placeholder = "Ex: Jean Dupont";
    en.auth.fullname_placeholder = "Ex: John Doe";
    es.auth.fullname_placeholder = "Ej: Juan Pérez";
    
    fr.auth.age_placeholder = "Votre âge";
    en.auth.age_placeholder = "Your age";
    es.auth.age_placeholder = "Tu edad";
    
    fr.auth.city_placeholder = "Votre ville";
    en.auth.city_placeholder = "Your city";
    es.auth.city_placeholder = "Tu ciudad";
    
    fr.auth.password_signup_placeholder = "Choisissez un mot de passe";
    en.auth.password_signup_placeholder = "Choose a password";
    es.auth.password_signup_placeholder = "Elige una contraseña";
    
    fr.auth.biz_name_placeholder = "Ex: Le Macumba";
    en.auth.biz_name_placeholder = "Ex: The Club";
    es.auth.biz_name_placeholder = "Ej: El Club";
    
    fr.auth.biz_city_placeholder = "Ville de l'établissement";
    en.auth.biz_city_placeholder = "City of the establishment";
    es.auth.biz_city_placeholder = "Ciudad del establecimiento";
    
    fr.auth.biz_password_placeholder = "Définissez votre mot de passe";
    en.auth.biz_password_placeholder = "Set your password";
    es.auth.biz_password_placeholder = "Establece tu contraseña";
    
    fr.auth.biz_login_password = "Votre mot de passe club";
    en.auth.biz_login_password = "Your club password";
    es.auth.biz_login_password = "La contraseña de tu club";
    
    fs.writeFileSync(frFile, JSON.stringify(fr, null, 2));
    fs.writeFileSync(enFile, JSON.stringify(en, null, 2));
    fs.writeFileSync(esFile, JSON.stringify(es, null, 2));
}

const selectorHTML = `
    <div style="position: absolute; top: 20px; right: 20px; z-index: 1000;">
        <select class="language-selector" onchange="changeLanguage(this.value)" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 8px 12px; outline: none; cursor: pointer; backdrop-filter: blur(10px);">
            <option value="fr" style="color: black;">FR</option>
            <option value="en" style="color: black;">EN</option>
            <option value="es" style="color: black;">ES</option>
        </select>
    </div>
`;

function processFile(filePath) {
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Add Script link
    if (!html.includes('i18n.js')) {
        html = html.replace('</body>', '    <script src="i18n.js"></script>\n</body>');
    }
    
    // Add selector
    if (!html.includes('language-selector')) {
        let viewClass = filePath.includes('auth.html') ? 'view-fetars' : 'view-entreprise';
        html = html.replace(\`<body class="\${viewClass}">\`, \`<body class="\${viewClass}">\${selectorHTML}\`);
    }

    // AUTH.HTML specific replacements
    html = html.replace(/>Connexion<\/button>/g, ' data-i18n="common.login">Connexion</button>');
    html = html.replace(/>Inscription<\/button>/g, ' data-i18n="common.signup">Inscription</button>');
    html = html.replace(/Plateforme de gestion de leads/g, '<span data-i18n="auth.platform">Plateforme de gestion de leads</span>');
    html = html.replace(/<label>Mot de passe<\/label>/g, '<label data-i18n="common.password">Mot de passe</label>');
    html = html.replace(/placeholder="Entrez votre mot de passe"/g, 'placeholder="Entrez votre mot de passe" data-i18n="common.password_placeholder"');
    html = html.replace(/<button type="submit" class="btn-primary" id="login-btn">Se connecter<\/button>/g, '<button type="submit" class="btn-primary" id="login-btn" data-i18n="common.connect">Se connecter</button>');
    html = html.replace(/>Créer votre compte de fêtard/g, ' data-i18n="auth.signup_title">Créer votre compte de fêtard');
    
    html = html.replace(/<label for="signup-name">Nom complet<\/label>/g, '<label for="signup-name" data-i18n="auth.fullname">Nom complet</label>');
    html = html.replace(/placeholder="Ex: Jean Dupont"/g, 'placeholder="Ex: Jean Dupont" data-i18n="auth.fullname_placeholder"');
    
    html = html.replace(/<label for="signup-age">Âge<\/label>/g, '<label for="signup-age" data-i18n="auth.age">Âge</label>');
    html = html.replace(/placeholder="Votre âge"/g, 'placeholder="Votre âge" data-i18n="auth.age_placeholder"');
    
    html = html.replace(/<label for="signup-gender">Sexe<\/label>/g, '<label for="signup-gender" data-i18n="auth.gender">Sexe</label>');
    html = html.replace(/<label for="signup-city" data-i18n="auth.city">Ville<\/label>/g, '<label for="signup-city" data-i18n="auth.city">Ville</label>'); // ensure no double tag
    html = html.replace(/<label for="signup-city">Ville<\/label>/g, '<label for="signup-city" data-i18n="auth.city">Ville</label>');
    html = html.replace(/placeholder="Votre ville"/g, 'placeholder="Votre ville" data-i18n="auth.city_placeholder"');
    html = html.replace(/<label for="signup-password">Mot de passe<\/label>/g, '<label for="signup-password" data-i18n="common.password">Mot de passe</label>');
    html = html.replace(/placeholder="Choisissez un mot de passe"/g, 'placeholder="Choisissez un mot de passe" data-i18n="auth.password_signup_placeholder"');
    html = html.replace(/id="signup-btn">S'inscrire<\/button>/g, 'id="signup-btn" data-i18n="auth.signup_btn">S\'inscrire</button>');

    // ENTREPRISE.HTML specific replacements
    html = html.replace(/<p>Développez votre visibilité et gérez vos rewards\.<\/p>/g, '<p data-i18n="auth.biz_desc">Développez votre visibilité et gérez vos rewards.</p>');
    html = html.replace(/placeholder="Votre mot de passe club"/g, 'placeholder="Votre mot de passe club" data-i18n="auth.biz_login_password"');
    html = html.replace(/id="biz-login-btn">Se connecter<\/button>/g, 'id="biz-login-btn" data-i18n="auth.biz_login">Se connecter</button>');
    html = html.replace(/Inscrivez votre établissement sur Suggesto\./g, '<span data-i18n="auth.biz_signup_title">Inscrivez votre établissement sur Suggesto.</span>');
    html = html.replace(/<label>Nom de la boîte de nuit<\/label>/g, '<label data-i18n="auth.biz_name">Nom de la boîte de nuit</label>');
    html = html.replace(/placeholder="Ex: Le Macumba"/g, 'placeholder="Ex: Le Macumba" data-i18n="auth.biz_name_placeholder"');
    html = html.replace(/<label for="biz-signup-city">Ville<\/label>/g, '<label for="biz-signup-city" data-i18n="auth.city">Ville</label>');
    html = html.replace(/placeholder="Ville de l'établissement"/g, 'placeholder="Ville de l\'établissement" data-i18n="auth.biz_city_placeholder"');
    html = html.replace(/placeholder="Définissez votre mot de passe"/g, 'placeholder="Définissez votre mot de passe" data-i18n="auth.biz_password_placeholder"');
    html = html.replace(/id="biz-signup-btn">Créer mon compte<\/button>/g, 'id="biz-signup-btn" data-i18n="auth.biz_signup">Créer mon compte</button>');
    html = html.replace(/<h1>Espace Entreprise<\/h1>/g, '<h1 data-i18n="auth.biz_title">Espace Entreprise</h1>');

    fs.writeFileSync(filePath, html);
    console.log("Processed " + filePath);
}

processFile(authFile);
processFile(entFile);
