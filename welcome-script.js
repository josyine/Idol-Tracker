const PRICE_PER_GROUP = 14.99;
let currentLang = localStorage.getItem('lang') || 'en';

const dict = {
    en: {
        navDest: "Destinations", navArtists: "Artists", navLogin: "Log in", 
        heroTitle: "You have a destination.<br>We have the guide.", 
        heroSubtitle: "Create custom routes instantly, with tools designed to follow your favorite artists.", 
        heroCta: "Generate my guide", heroDemo: "See Demo",
        authTitle: "Log in or sign up", authDesc: "Use your email or another service to continue with Screen To Street.",
        authGoogle: "Continue with Google", authFacebook: "Continue with Facebook", authEmail: "Continue with email",
        authTerms: "By continuing, you agree to Screen To Street's", linkTerms: "Terms of Use", 
        authPrivacy: "Read our", linkPrivacy: "Privacy Policy",
        
        step1Title: "Account", emailCheck: "Enter your email and password to continue.",
        emailLabel: "Email address", password: "Password", btnContinue: "Continue",
        
        step2Title: "Profile", step2Desc: "Tell us a bit about yourself.",
        fname: "First Name", lname: "Last Name",
        reasonLabel: "Why are you using Screen To Street?", reasonPlaceholder: "Select an option (optional)",
        reason1: "To discover new places", reason2: "To plan a trip", reason3: "To get good addresses", reason4: "To follow my idol's footsteps", reason5: "Other",
        
        step3Title: "Choose Your Passes", passDesc: "Select the groups you want to unlock. (14.99€ per group)",
        subtotalLabel: "Subtotal:", payBtnEmpty: "Select a group", btnToPayment: "Continue to Payment",
        
        step4Title: "Payment", step4Desc: "Complete your purchase to unlock the guides.",
        summaryPasses: "Selected Passes:", summaryTotal: "Total Due:",
        cardNum: "Card Number", expiry: "Expiry Date", cvc: "CVC", paySecurely: "Pay securely",
        
        processing: "Processing securely...", authRightTitle: "Unlock the world of your idols.",
        cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", 
        cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept"
    },
    fr: {
        navDest: "Destinations", navArtists: "Artistes", navLogin: "Se connecter", 
        heroTitle: "Vous avez une destination.<br>Nous avons le guide.", 
        heroSubtitle: "Créez des itinéraires sur mesure instantanément, avec des outils conçus pour suivre vos idoles.", 
        heroCta: "Générer mon guide", heroDemo: "Voir la démo",
        authTitle: "Connectez-vous ou créez un compte", authDesc: "Utilisez votre e-mail ou un autre service pour continuer.",
        authGoogle: "Continuer avec Google", authFacebook: "Continuer avec Facebook", authEmail: "Continuer avec un e-mail",
        authTerms: "En continuant, vous acceptez les", linkTerms: "Conditions d'utilisation", 
        authPrivacy: "Consultez notre", linkPrivacy: "Politique de confidentialité",
        
        step1Title: "Compte", emailCheck: "Entrez votre e-mail et votre mot de passe pour continuer.",
        emailLabel: "Adresse e-mail", password: "Mot de passe", btnContinue: "Continuer",
        
        step2Title: "Profil", step2Desc: "Parlez-nous un peu de vous.",
        fname: "Prénom", lname: "Nom",
        reasonLabel: "Pourquoi utilisez-vous Screen To Street ?", reasonPlaceholder: "Sélectionnez une option (facultatif)",
        reason1: "Pour découvrir de nouveaux lieux", reason2: "Pour préparer un voyage", reason3: "Pour avoir de bonnes adresses", reason4: "Pour suivre la trace de mon idole", reason5: "Autre",
        
        step3Title: "Vos Pass", passDesc: "Sélectionnez les groupes à débloquer. (14.99€ par groupe)",
        subtotalLabel: "Sous-total :", payBtnEmpty: "Sélectionnez un groupe", btnToPayment: "Passer au paiement",
        
        step4Title: "Paiement", step4Desc: "Finalisez votre achat pour débloquer les guides.",
        summaryPasses: "Pass sélectionnés :", summaryTotal: "Total à payer :",
        cardNum: "Numéro de carte", expiry: "Date d'expiration", cvc: "CVC", paySecurely: "Payer en toute sécurité",
        
        processing: "Traitement sécurisé...", authRightTitle: "Débloquez le monde de vos idoles.",
        cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", 
        cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter"
    }
};

let currentActiveStep = 0; // 0 = social, 1 = account, 2 = profile, 3 = passes, 4 = payment

function updateLangUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(dict[currentLang][key]) el.innerHTML = dict[currentLang][key]; 
    });
    updatePrice();
}

document.addEventListener('DOMContentLoaded', () => {
    // Menu des langues
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.addEventListener('click', (e) => {
        const lMenu = document.getElementById('lang-menu');
        if(lMenu) lMenu.classList.toggle('hidden');
        e.stopPropagation();
    });

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

    // Rendre la timeline (stepper) cliquable pour revenir en arrière
    for(let i=1; i<=4; i++) {
        const stepBtn = document.getElementById('step-btn-' + i);
        if(stepBtn) {
            stepBtn.addEventListener('click', () => {
                if(i < currentActiveStep) { // On ne peut que reculer, pas avancer dans le vide
                    showStep(i);
                }
            });
        }
    }
});

const modal = document.getElementById('auth-modal');

// Afficher une étape spécifique et mettre à jour la barre de progression
function showStep(step) {
    currentActiveStep = step;
    
    // Cacher toutes les étapes
    for(let i=0; i<=4; i++) {
        let s = document.getElementById('auth-step-' + i);
        if(s) s.classList.add('hidden');
    }
    
    // Afficher l'étape demandée
    const targetStep = document.getElementById('auth-step-' + step);
    if(targetStep) targetStep.classList.remove('hidden');

    const stepper = document.getElementById('auth-stepper');
    if(step === 0) {
        if(stepper) stepper.classList.add('hidden');
    } else {
        if(stepper) stepper.classList.remove('hidden');
        
        // Mettre à jour l'apparence des points (1, 2, 3, 4) et des lignes
        for(let i=1; i<=4; i++) {
            let st = document.getElementById('step-dot-' + i);
            let lbl = document.getElementById('step-label-' + i);
            let line = document.getElementById('line-' + (i-1));
            
            if(i < step) {
                // Étape terminée (coche)
                if(st) { st.style.background = '#e2e8f0'; st.style.color = '#64748b'; st.innerHTML = '✓'; }
                if(lbl) lbl.style.color = '#94a3b8';
                if(line) line.style.background = '#D42759';
            } else if(i === step) {
                // Étape active
                if(st) { st.style.background = '#D42759'; st.style.color = '#fff'; st.innerHTML = i; }
                if(lbl) lbl.style.color = '#D42759';
                if(line) line.style.background = '#D42759';
            } else {
                // Étape future
                if(st) { st.style.background = '#e2e8f0'; st.style.color = '#94a3b8'; st.innerHTML = i; }
                if(lbl) lbl.style.color = '#cbd5e1';
                if(line) line.style.background = '#e2e8f0';
            }
        }
    }
}

// Boutons d'ouverture/fermeture
document.querySelectorAll('.open-auth-btn').forEach(btn => {
    btn.addEventListener('click', () => { 
        if(modal) modal.classList.remove('hidden'); 
        showStep(0); 
    });
});

const closeAuth = document.getElementById('close-auth');
if(closeAuth) closeAuth.addEventListener('click', () => { if(modal) modal.classList.add('hidden'); });

// --- GESTION DE LA NAVIGATION --- //

// Step 0 -> Step 1 (Email)
const btnToEmail = document.getElementById('btn-to-email');
if(btnToEmail) btnToEmail.addEventListener('click', () => { showStep(1); });

// Step 1 -> Step 2 (Account -> Profile)
const btnToStep2 = document.getElementById('btn-to-step2');
if(btnToStep2) {
    btnToStep2.addEventListener('click', () => { 
        const emailInput = document.getElementById('user-email');
        if(!emailInput.checkValidity()) { emailInput.reportValidity(); return; }
        
        const emailVal = emailInput.value.trim().toLowerCase();
        const savedEmail = localStorage.getItem('userEmail');
        
        // Connexion intelligente si l'utilisateur existe déjà (saut à la carte)
        if (savedEmail && emailVal === savedEmail.toLowerCase() && localStorage.getItem('unlockedGroups')) {
            btnToStep2.textContent = "Logging in...";
            setTimeout(() => { window.location.href = 'map.html'; }, 800);
        } else {
            localStorage.setItem('userEmail', emailVal);
            showStep(2);
        }
    });
}

// Step 2 -> Step 3 (Profile -> Passes)
const btnToStep3 = document.getElementById('btn-to-step3');
if(btnToStep3) {
    btnToStep3.addEventListener('click', () => {
        const fname = document.getElementById('fname');
        if(!fname.checkValidity()) { fname.reportValidity(); return; }
        localStorage.setItem('userName', fname.value.trim());
        showStep(3);
    });
}

// Step 3 -> Step 4 (Passes -> Payment Summary)
const btnToStep4 = document.getElementById('btn-to-step4');
if(btnToStep4) {
    btnToStep4.addEventListener('click', () => {
        // Préparer le résumé sur l'étape de paiement
        const checkedBoxes = document.querySelectorAll('.group-checkbox:checked');
        let selectedNames = [];
        checkedBoxes.forEach(cb => selectedNames.push(cb.value));
        
        const sumPasses = document.getElementById('summary-passes');
        const sumPrice = document.getElementById('summary-price');
        const subtotal = document.getElementById('subtotal-display');
        
        if(sumPasses) sumPasses.textContent = selectedNames.join(', ');
        if(sumPrice && subtotal) sumPrice.textContent = subtotal.textContent;

        showStep(4);
    });
}

// Popups Google/Facebook (Passent direct au Profil)
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
        document.getElementById('fname').value = "Jane";
        document.getElementById('lname').value = "Doe";
        showStep(2);
    }
};

window.simulateFacebookLogin = function() {
    localStorage.setItem('userEmail', 'user.facebook@fb.com');
    showStep(2);
};

// --- LOGIQUE PRIX ET PAIEMENT --- //
const checkboxes = document.querySelectorAll('.group-checkbox');
const subtotalDisplay = document.getElementById('subtotal-display');

function updatePrice() {
    if(!subtotalDisplay || !btnToStep4) return;
    const selectedCount = document.querySelectorAll('.group-checkbox:checked').length;
    const totalPrice = selectedCount * PRICE_PER_GROUP;
    subtotalDisplay.textContent = `${totalPrice.toFixed(2)} €`;
    
    if (selectedCount > 0) {
        btnToStep4.disabled = false;
        btnToStep4.textContent = dict[currentLang].btnToPayment;
    } else {
        btnToStep4.disabled = true;
        btnToStep4.textContent = dict[currentLang].payBtnEmpty;
    }
}
checkboxes.forEach(cb => { cb.addEventListener('change', updatePrice); });

const checkoutForm = document.getElementById('checkout-form');
if(checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const checkedBoxes = document.querySelectorAll('.group-checkbox:checked');
        if(checkedBoxes.length === 0) return;

        let existingGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
        checkedBoxes.forEach(cb => { if(!existingGroups.includes(cb.value)) existingGroups.push(cb.value); });
        localStorage.setItem('unlockedGroups', JSON.stringify(existingGroups));

        document.getElementById('btn-submit-payment').style.display = 'none';
        const paymentLoader = document.getElementById('payment-loader');
        if(paymentLoader) paymentLoader.classList.remove('hidden');
        
        setTimeout(() => { window.location.href = 'map.html'; }, 2000);
    });
}

// Cookies Bannière
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
if(cookieAccept) cookieAccept.addEventListener('click', closeCookies);
if(cookieReject) cookieReject.addEventListener('click', closeCookies);
