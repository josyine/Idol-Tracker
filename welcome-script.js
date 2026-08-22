const PRICE_PER_GROUP = 14.99;
let currentLang = localStorage.getItem('lang') || 'en';

const dict = {
    en: {
        navDest: "Destinations", 
        navArtists: "Artists", 
        navLogin: "Log in", 
        heroTitle: "You have a destination.<br>We have the guide.", 
        heroSubtitle: "Create custom routes instantly, with tools designed to follow your favorite artists.", 
        heroCta: "Generate my guide", 
        heroDemo: "See Demo",
        authTitle: "Log in or sign up", 
        authDesc: "Use your email or another service to continue with Screen To Street.",
        authGoogle: "Continue with Google", 
        authFacebook: "Continue with Facebook", 
        authEmail: "Continue with email",
        authTerms: "By continuing, you agree to Screen To Street's", 
        linkTerms: "Terms of Use", 
        authPrivacy: "Read our", 
        linkPrivacy: "Privacy Policy",
        emailCheck: "We will check if you have an account, and if not, we will help you create one.", 
        emailLabel: "Email address", 
        btnContinue: "Continue",
        stepBackAccount: "Account Details", 
        fname: "First Name", 
        lname: "Last Name", 
        password: "Password",
        step2: "2. Choose Your Passes", 
        passDesc: "Select the groups you want to unlock. (14.99€ per group)",
        totalDue: "Total Due:", 
        payBtnEmpty: "Select a group", 
        payBtnActive: "Proceed to payment ({price} €)", 
        processing: "Processing securely...",
        authRightTitle: "Unlock the world of your idols.",
        cookieText: "We use cookies to enhance your experience.", 
        cookiePolicy: "Cookie Policy", 
        cookieManage: "Manage", 
        cookieReject: "Reject", 
        cookieAccept: "Accept"
    },
    fr: {
        navDest: "Destinations", 
        navArtists: "Artistes", 
        navLogin: "Se connecter", 
        heroTitle: "Vous avez une destination.<br>Nous avons le guide.", 
        heroSubtitle: "Créez des itinéraires sur mesure instantanément, avec des outils conçus pour suivre vos idoles.", 
        heroCta: "Générer mon guide", 
        heroDemo: "Voir la démo",
        authTitle: "Connectez-vous ou créez un compte", 
        authDesc: "Utilisez votre e-mail ou un autre service pour continuer avec Screen To Street.",
        authGoogle: "Continuer avec Google", 
        authFacebook: "Continuer avec Facebook", 
        authEmail: "Continuer avec un e-mail",
        authTerms: "En continuant, vous acceptez les", 
        linkTerms: "Conditions d'utilisation", 
        authPrivacy: "Consultez notre", 
        linkPrivacy: "Politique de confidentialité",
        emailCheck: "Nous vérifierons que vous avez déjà un compte, et dans le cas contraire, nous vous aiderons à en créer un.", 
        emailLabel: "Adresse e-mail", 
        btnContinue: "Continuer",
        stepBackAccount: "Détails du compte", 
        fname: "Prénom", 
        lname: "Nom", 
        password: "Mot de passe",
        step2: "2. Choisissez vos Pass", 
        passDesc: "Sélectionnez les groupes à débloquer. (14.99€ par groupe)",
        totalDue: "Total à payer :", 
        payBtnEmpty: "Sélectionnez un groupe", 
        payBtnActive: "Passer au paiement ({price} €)", 
        processing: "Traitement sécurisé...",
        authRightTitle: "Débloquez le monde de vos idoles.",
        cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", 
        cookiePolicy: "Politique de cookies", 
        cookieManage: "Gérer", 
        cookieReject: "Refuser", 
        cookieAccept: "Accepter"
    }
};

// ==========================================
// 1. TRADUCTIONS ET UI
// ==========================================
function updateLangUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(dict[currentLang][key]) {
            el.innerHTML = dict[currentLang][key]; 
        }
    });
    updatePrice(); // Met à jour la devise/le texte du bouton payer
}

document.addEventListener('DOMContentLoaded', () => {
    // Menu des langues
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            const lMenu = document.getElementById('lang-menu');
            if(lMenu) lMenu.classList.toggle('hidden');
            e.stopPropagation();
        });
    }

    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.preventDefault();
            currentLang = this.getAttribute('data-lang');
            localStorage.setItem('lang', currentLang);
            updateLangUI();
        });
    });

    document.addEventListener('click', () => { 
        const langMenu = document.getElementById('lang-menu');
        if (langMenu) langMenu.classList.add('hidden'); 
    });

    updateLangUI();
});

// ==========================================
// 2. GESTION DE LA MODALE D'AUTHENTIFICATION
// ==========================================
const modal = document.getElementById('auth-modal');
const step1 = document.getElementById('auth-step-1');
const step2 = document.getElementById('auth-step-2');
const step3 = document.getElementById('auth-step-3');

function showStep(step) {
    if(step1) step1.classList.add('hidden'); 
    if(step2) step2.classList.add('hidden'); 
    if(step3) step3.classList.add('hidden');
    
    if(step === 1 && step1) step1.classList.remove('hidden');
    if(step === 2 && step2) step2.classList.remove('hidden');
    if(step === 3 && step3) {
        step3.classList.remove('hidden');
        // Optionnel : Scroll tout en haut du formulaire de paiement
        document.querySelector('.auth-left').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Ouvrir la modale
document.querySelectorAll('.open-auth-btn').forEach(btn => {
    btn.addEventListener('click', () => { 
        if(modal) modal.classList.remove('hidden'); 
        showStep(1); 
    });
});

// Fermer la modale
const closeAuth = document.getElementById('close-auth');
if(closeAuth) {
    closeAuth.addEventListener('click', () => { 
        if(modal) modal.classList.add('hidden'); 
    });
}

// Naviguer entre les étapes
const btnToEmail = document.getElementById('btn-to-email');
if(btnToEmail) {
    btnToEmail.addEventListener('click', () => { showStep(2); });
}

const btnBack1 = document.getElementById('btn-back-1');
if(btnBack1) {
    btnBack1.addEventListener('click', () => { showStep(1); });
}

const btnBack2 = document.getElementById('btn-back-2');
if(btnBack2) {
    btnBack2.addEventListener('click', () => { showStep(2); });
}

// ==========================================
// 3. LOGIQUE DE CONNEXION INTELLIGENTE (ÉTAPE 2 -> 3)
// ==========================================
const btnToDetails = document.getElementById('btn-to-details');
if(btnToDetails) {
    btnToDetails.addEventListener('click', () => { 
        const emailInput = document.getElementById('user-email');
        if(!emailInput) return;
        
        const emailVal = emailInput.value.trim().toLowerCase();
        
        if(emailInput.checkValidity()) {
            const savedEmail = localStorage.getItem('userEmail');
            
            // L'utilisateur existe déjà
            if (savedEmail && emailVal === savedEmail.toLowerCase() && localStorage.getItem('unlockedGroups')) {
                btnToDetails.textContent = "Logging in...";
                setTimeout(() => {
                    window.location.href = 'map.html';
                }, 800);
            } else {
                // Nouvel utilisateur : Passe à l'étape 3 (Paiement)
                localStorage.removeItem('userProfilePic'); 
                localStorage.setItem('userEmail', emailVal);
                showStep(3);
            }
        } else {
            emailInput.reportValidity();
        }
    });
}

// ==========================================
// 4. POPUP GOOGLE ET FACEBOOK
// ==========================================
window.openGooglePopup = function() {
    const popup = document.getElementById('google-auth-popup');
    if(popup) popup.classList.remove('hidden');
};

window.completeGoogleLogin = function() {
    const popup = document.getElementById('google-auth-popup');
    if(popup) popup.classList.add('hidden');
    
    if(localStorage.getItem('userEmail') === 'jane.doe@gmail.com' && localStorage.getItem('unlockedGroups')) {
        window.location.href = 'map.html';
    } else {
        localStorage.setItem('userEmail', 'jane.doe@gmail.com');
        localStorage.setItem('userName', 'Jane Doe');
        
        // On pré-remplit les champs de l'étape 3 si on vient de Google
        const fnameInput = document.getElementById('fname');
        const lnameInput = document.getElementById('lname');
        if(fnameInput) fnameInput.value = "Jane";
        if(lnameInput) lnameInput.value = "Doe";
        
        if(modal) modal.classList.remove('hidden');
        showStep(3);
    }
};

window.simulateFacebookLogin = function() {
    localStorage.setItem('userEmail', 'user.facebook@fb.com');
    localStorage.setItem('userName', 'User Facebook');
    showStep(3);
};


// ==========================================
// 5. GESTION DU PAIEMENT ET DES CHECKBOXES (ÉTAPE 3)
// ==========================================
const checkboxes = document.querySelectorAll('.group-checkbox');
const priceDisplay = document.getElementById('price-display');
const payBtn = document.getElementById('pay-btn');

function updatePrice() {
    if(!priceDisplay || !payBtn) return;
    
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

checkboxes.forEach(cb => {
    cb.addEventListener('change', updatePrice);
});

const checkoutForm = document.getElementById('checkout-form');
if(checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const checkedBoxes = document.querySelectorAll('.group-checkbox:checked');
        if(checkedBoxes.length === 0) return;

        // Enregistrement du nom
        const fname = document.getElementById('fname').value;
        const lname = document.getElementById('lname').value;
        if(fname) localStorage.setItem('userName', `${fname} ${lname}`);

        // Déblocage des groupes
        let existingGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
        checkedBoxes.forEach(cb => {
            if(!existingGroups.includes(cb.value)) existingGroups.push(cb.value);
        });
        localStorage.setItem('unlockedGroups', JSON.stringify(existingGroups));

        // Animation de paiement
        payBtn.style.display = 'none';
        const paymentLoader = document.getElementById('payment-loader');
        if(paymentLoader) paymentLoader.classList.remove('hidden');
        
        setTimeout(() => { window.location.href = 'map.html'; }, 2000);
    });
}

// ==========================================
// 6. BANNIÈRE DES COOKIES
// ==========================================
if(!localStorage.getItem('cookiesAccepted')) { 
    const cBanner = document.getElementById('cookie-banner');
    if(cBanner) cBanner.classList.remove('hidden'); 
}
function closeCookies() { 
    localStorage.setItem('cookiesAccepted', 'true'); 
    const cBanner = document.getElementById('cookie-banner');
    if(cBanner) cBanner.classList.add('hidden'); 
}

const cookieAccept = document.getElementById('cookie-accept');
const cookieReject = document.getElementById('cookie-reject');
const cookieManage = document.getElementById('cookie-manage');

if(cookieAccept) cookieAccept.addEventListener('click', closeCookies);
if(cookieReject) cookieReject.addEventListener('click', closeCookies);
if(cookieManage) cookieManage.addEventListener('click', () => { window.location.href = 'legal.html#confidentialite'; });
