// i18n Core System for Suggesto WebApp

const SUPPORTED_LANGS = ['fr', 'en', 'es'];
const DEFAULT_LANG = 'fr';

let currentLang = DEFAULT_LANG;
let translations = {};

// 1. Detect language
function detectLanguage() {
    const storedLang = localStorage.getItem('app_lang');
    if (storedLang && SUPPORTED_LANGS.includes(storedLang)) {
        return storedLang;
    }
    
    // Fallback to browser lang
    const browserLang = (navigator.language || navigator.userLanguage).slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.includes(browserLang)) {
        return browserLang;
    }
    
    return DEFAULT_LANG;
}

// 2. Load translations
async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) throw new Error('Failed to load translations');
        translations = await response.json();
    } catch (error) {
        console.error('i18n error:', error);
        // Fallback to default FR if loading fails
        if (lang !== DEFAULT_LANG) {
            await loadTranslations(DEFAULT_LANG);
        }
    }
}

// 3. Translate the DOM
function translateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (translation !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                // Only update text nodes to preserve SVG/HTML children
                const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
                if (textNode) {
                    textNode.textContent = translation;
                } else if (!el.children.length) {
                    el.textContent = translation;
                } else {
                    // Element has children but no direct text node - append one
                    el.appendChild(document.createTextNode(translation));
                }
            }
        }
    });
}

// 4. Translate a specific key dynamically (used by app.js)
window.t = function(key) {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            return key; // Fallback to the key itself if not found
        }
    }
    return value;
};

// 5. Change language manually
window.changeLanguage = async function(lang) {
    if (SUPPORTED_LANGS.includes(lang)) {
        currentLang = lang;
        localStorage.setItem('app_lang', lang);
        await loadTranslations(lang);
        translateDOM();
        updateLanguageSelectorUI(lang);
        // Re-render active biz section to update dynamic JS content
        if (typeof refreshActiveBizSection === 'function') {
            refreshActiveBizSection();
        }
        // Re-render active fêtard view
        if (typeof refreshActiveFetardView === 'function') {
            refreshActiveFetardView();
        }
    }
};

function updateLanguageSelectorUI(lang) {
    const selectors = document.querySelectorAll('.language-selector');
    selectors.forEach(select => {
        if (select.value !== lang) {
            select.value = lang;
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    currentLang = detectLanguage();
    await loadTranslations(currentLang);
    translateDOM();
    updateLanguageSelectorUI(currentLang);
    // Re-render dynamic content after a short delay to not block the main thread
    // This fixes the raw translation keys (nav.annonces) without causing mobile lag
    setTimeout(() => {
        if (typeof refreshActiveBizSection === 'function') {
            refreshActiveBizSection();
        }
        if (typeof refreshActiveFetardView === 'function') {
            refreshActiveFetardView();
        }
    }, 50);
});
