const PRICE_PER_GROUP = 14.99;
let currentLang = localStorage.getItem('lang') || 'en';

const dict = {
    en: {
        navLogin: "Log in", heroTitle: "You have a destination. We have the guide.", heroSubtitle: "Create custom routes instantly, with tools designed to follow your favorite artists.", heroCta: "Generate my guide",
        authTitle: "Log in or sign up", authDesc: "Use your email or another service to continue with Screen To Street.",
        authGoogle: "Continue with Google", authFacebook: "Continue with Facebook", authEmail: "Continue with email",
        authTerms: "By continuing, you agree to Screen To Street's", linkTerms: "Terms of Use", authPrivacy: "Read our", linkPrivacy: "Privacy Policy",
        emailCheck: "We will check if you have an account, and if not, we will help you create one.", emailLabel: "Email address", btnContinue: "Continue",
        stepBackAccount: "Account Details", fname: "First Name", lname: "Last Name", password: "Password",
        step2: "2. Choose Your Passes", passDesc: "Select the groups you want to unlock. (14.99€ per group)",
        totalDue: "Total Due:", payBtnEmpty: "Select a group", payBtnActive: "Pay {price} € & Unlock", processing: "Processing securely...",
        authRightTitle: "Unlock the world of your idols.",
        cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept"
    },
    fr: {
        navLogin: "Se connecter", heroTitle: "Vous avez une destination. Nous avons le guide.", heroSubtitle: "Créez des itinéraires sur mesure instantanément, avec des outils conçus pour suivre vos idoles.", heroCta: "Générer mon guide",
        authTitle: "Connectez-vous ou créez un compte", authDesc: "Utilisez votre e-mail ou un autre service pour continuer avec Screen To Street.",
        authGoogle: "Continuer avec Google", authFacebook: "Continuer avec Facebook", authEmail: "Continuer avec un e-mail",
        authTerms: "En continuant, vous acceptez les", linkTerms: "Conditions d'utilisation", authPrivacy: "Consultez notre", linkPrivacy: "Politique de confidentialité",
        emailCheck: "Nous vérifierons que vous avez déjà un compte, et dans le cas contraire, nous vous aiderons à en créer un.", emailLabel: "Adresse e-mail", btnContinue: "Continuer",
        stepBackAccount: "Détails du compte", fname: "Prénom", lname: "Nom", password: "Mot de passe",
        step2: "2. Choisissez vos Pass", passDesc: "Sélectionnez les groupes à débloquer. (14.99€ par groupe)",
        totalDue: "Total à payer :", payBtnEmpty: "Sélectionnez un groupe", payBtnActive: "Payer {price} €", processing: "Traitement sécurisé...",
        authRightTitle: "Débloquez le monde de vos idoles.",
        cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter"
    }
};

function updateLangUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(dict[currentLang][key]) el.textContent = dict[currentLang][key];
    });
    updatePrice();
}

// Lang Dropdown
document.getElementById('lang-btn').addEventListener('click', (e) => {
    document.getElementById('lang-menu').classList.toggle('hidden');
    e.stopPropagation();
});
document.addEventListener('click', () => { document.getElementById('lang-menu').classList.add('hidden'); });

document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', function() {
        currentLang = this.getAttribute('data-lang');
        localStorage.setItem('lang', currentLang);
        updateLangUI();
    });
});

// Modal Logic
const modal = document.getElementById('auth-modal');
const step1 = document.getElementById('auth-step-1');
const step2 = document.getElementById('auth-step-2');
const step3 = document.getElementById('auth-step-3');

document.querySelectorAll('.open-auth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        showStep(1);
    });
});
document.getElementById('close-auth').addEventListener('click', () => { modal.classList.add('hidden'); });

function showStep(step) {
    step1.classList.add('hidden'); step2.classList.add('hidden'); step3.classList.add('hidden');
    if(step === 1) step1.classList.remove('hidden');
    if(step === 2) step2.classList.remove('hidden');
    if(step === 3) step3.classList.remove('hidden');
}

document.getElementById('btn-to-email').addEventListener('click', () => { showStep(2); });
document.getElementById('btn-back-1').addEventListener('click', () => { showStep(1); });
document.getElementById('btn-to-details').addEventListener('click', () => { 
    if(document.getElementById('user-email').checkValidity()) showStep(3); 
    else document.getElementById('user-email').reportValidity();
});
document.getElementById('btn-back-2').addEventListener('click', () => { showStep(2); });

// Mock Social Logins
window.simulateGoogleLogin = function() {
    alert("Simulation: Google Login Popup opens here.");
    showStep(3); // On skip l'email et on va direct au paiement
};
window.simulateFacebookLogin = function() {
    alert("Simulation: Facebook Login Popup opens here.");
    showStep(3);
};

// Price & Payment Logic
const checkboxes = document.querySelectorAll('.group-checkbox');
const priceDisplay = document.getElementById('price-display');
const payBtn = document.getElementById('pay-btn');

function updatePrice() {
    const selectedCount = document.querySelectorAll('.group-checkbox:checked').length;
    const totalPrice = selectedCount * PRICE_PER_GROUP;
    priceDisplay.textContent = `${totalPrice.toFixed(2)} €`;
    if (selectedCount > 0) {
        payBtn.disabled = false;
        payBtn.textContent = dict[currentLang].payBtnActive.replace('{price}', totalPrice.toFixed(2));
    } else {
        payBtn.disabled = true;
        payBtn.textContent = dict[currentLang].payBtnEmpty;
    }
}
checkboxes.forEach(cb => cb.addEventListener('change', updatePrice));

document.getElementById('checkout-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const checkedBoxes = document.querySelectorAll('.group-checkbox:checked');
    if(checkedBoxes.length === 0) return;

    const selectedGroups = Array.from(checkedBoxes).map(cb => cb.value);
    localStorage.setItem('unlockedGroups', JSON.stringify(selectedGroups));

    payBtn.style.display = 'none';
    document.getElementById('payment-loader').classList.remove('hidden');
    
    setTimeout(() => { window.location.href = 'map.html'; }, 2000);
});

// Cookies
if(!localStorage.getItem('cookiesAccepted')) { document.getElementById('cookie-banner').classList.remove('hidden'); }
function closeCookies() { localStorage.setItem('cookiesAccepted', 'true'); document.getElementById('cookie-banner').classList.add('hidden'); }
document.getElementById('cookie-accept').addEventListener('click', closeCookies);
document.getElementById('cookie-reject').addEventListener('click', closeCookies);
document.getElementById('cookie-manage').addEventListener('click', () => { window.location.href = 'settings.html'; });

updateLangUI();
