// Landing Page JavaScript
let currentMode = 'fetard'; // Default mode

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set initial mode
    setMode('fetard');

    // Add smooth animations on scroll
    observeElements();
});

// Switch between Fetard and Entreprise modes
function switchMode(mode) {
    if (mode === currentMode) return;

    currentMode = mode;
    setMode(mode);
}

// Toggle switch (when clicking the switch itself)
function toggleSwitch() {
    const newMode = currentMode === 'fetard' ? 'entreprise' : 'fetard';
    switchMode(newMode);
}

// Set the active mode
function setMode(mode) {
    const body = document.body;
    const fetardLabel = document.getElementById('fetard-label');
    const entrepriseLabel = document.getElementById('entreprise-label');
    const fetardContent = document.getElementById('fetard-content');
    const entrepriseContent = document.getElementById('entreprise-content');

    // Remove all mode classes
    body.className = '';

    // Set new mode class
    body.classList.add(`mode-${mode}`);

    // Update labels
    if (mode === 'fetard') {
        fetardLabel.classList.add('active');
        entrepriseLabel.classList.remove('active');
        fetardContent.classList.add('active');
        entrepriseContent.classList.remove('active');
    } else {
        fetardLabel.classList.remove('active');
        entrepriseLabel.classList.add('active');
        fetardContent.classList.remove('active');
        entrepriseContent.classList.add('active');
    }

    // Animate content change
    animateContentChange();
}

// Animate content transition
function animateContentChange() {
    const activeContent = document.querySelector('.mode-content.active');

    // Reset animations
    const elements = activeContent.querySelectorAll('.hero-section, .feature-card, .cta-button');
    elements.forEach((el, index) => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = '';
        }, 10);
    });
}

// Navigation functions
function goToFetard() {
    // Redirect to the existing fetard interface
    window.location.href = 'auth.html';
}

function goToEntreprise() {
    // Redirect to the entreprise signup/login
    window.location.href = 'entreprise.html?action=signup';
}

// Intersection Observer for scroll animations
function observeElements() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Add ripple effect on button click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('cta-button')) {
        const button = e.target;
        const ripple = document.createElement('span');

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
});

// Parallax effect for orbs
document.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.gradient-orb');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 10;
        const xOffset = (x - 0.5) * speed;
        const yOffset = (y - 0.5) * speed;

        orb.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    });
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        toggleSwitch();
    } else if (e.key === 'Enter') {
        const button = document.querySelector('.mode-content.active .cta-button');
        if (button) button.click();
    }
});