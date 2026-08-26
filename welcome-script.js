// ==========================================
// FIREBASE : INITIALISATION
// ==========================================
// Toute la logique Firebase vit ici (dans ce module), et non plus dans une balise
// <script> séparée dans index.html, pour que les imports fonctionnent proprement.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    getAdditionalUserInfo,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBa1e1JhWCxYI3fSWtVN6TsFiOnvxH7i5I",
    authDomain: "screen-to-street-e29ff.firebaseapp.com",
    projectId: "screen-to-street-e29ff",
    storageBucket: "screen-to-street-e29ff.firebasestorage.app",
    messagingSenderId: "48854939735",
    appId: "1:48854939735:web:4f6264a5589ebbf5a70b12"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// On garde une trace de l'état de connexion, utile pour éviter de rouvrir la modale
// de connexion à quelqu'un qui est déjà connecté.
let firebaseCurrentUser = null;
onAuthStateChanged(auth, (user) => { firebaseCurrentUser = user || null; });

// ==========================================
// TRADUCTIONS ET LOGIQUE DE PAGE (inchangé)
// ==========================================
const PRICE_PER_GROUP = 14.99;
let currentLang = localStorage.getItem('lang') || 'en';

const dict = {
    en: {
        navDest: "Destinations", navArtists: "Artists", navLogin: "Log in", 
        heroTitle: "You have a destination.<br>We have the guide.", 
        heroSubtitle: "Create custom routes instantly, with tools designed to follow your favorite artists.", 
        heroCta: "Generate my guide", heroDemo: "See Demo",
        authTitle: "Log in or sign up", authDesc: "Use your email or another service to continue with Screen To Street.",
        authGoogle: "Continue with Google", authEmail: "Continue with email",
        authTerms: "By continuing, you agree to Screen To Street's", linkTerms: "Terms of Use", 
        authPrivacy: "Read our", linkPrivacy: "Privacy Policy",
        
        step1Title: "Account", emailCheck: "Enter your email and password to continue.",
        emailLabel: "Email address", password: "Password", btnContinue: "Continue",
        
        step2Title: "Profile", step2Desc: "Tell us a bit about yourself.",
        usernameLabel: "Username", fname: "First Name", lname: "Last Name",
        reasonLabel: "Why are you using Screen To Street?", reasonPlaceholder: "Select an option (optional)",
        reason1: "To discover new places", reason2: "To plan a trip", reason3: "To get good addresses", reason4: "To follow my idol's footsteps", reason5: "Other",
        
        step3Title: "Choose Your Passes", passDesc: "Select the groups you want to unlock. (14.99€ per group)",
        subtotalLabel: "Subtotal:", payBtnEmpty: "Select a group", btnToPayment: "Continue to Payment",
        
        step4Title: "Payment", step4Desc: "Complete your purchase to unlock the guides.",
        summaryPasses: "Selected Passes:", summaryTotal: "Total Due:",
        cardNum: "Card Number", expiry: "Expiry Date", cvc: "CVC", paySecurely: "Pay securely",
        
        processing: "Processing securely...", authRightTitle: "Unlock the world of your idols.",
        cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", 
        cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept",

        errInvalidEmail: "Invalid email address.",
        errWeakPassword: "Password must be at least 6 characters.",
        errTooManyRequests: "Too many attempts. Try again in a few minutes.",
        errNetwork: "Network connection issue. Check your internet connection.",
        errWrongPassword: "Incorrect password for this email address.",
        errDefault: "Something went wrong. Please try again."
    },
    fr: {
        navDest: "Destinations", navArtists: "Artistes", navLogin: "Se connecter", 
        heroTitle: "Vous avez une destination.<br>Nous avons le guide.", 
        heroSubtitle: "Créez des itinéraires sur mesure instantanément, avec des outils conçus pour suivre vos idoles.", 
        heroCta: "Générer mon guide", heroDemo: "Voir la démo",
        authTitle: "Connectez-vous ou créez un compte", authDesc: "Utilisez votre e-mail ou un autre service pour continuer.",
        authGoogle: "Continuer avec Google", authEmail: "Continuer avec un e-mail",
        authTerms: "En continuant, vous acceptez les", linkTerms: "Conditions d'utilisation", 
        authPrivacy: "Consultez notre", linkPrivacy: "Politique de confidentialité",
        
        step1Title: "Compte", emailCheck: "Entrez votre e-mail et votre mot de passe pour continuer.",
        emailLabel: "Adresse e-mail", password: "Mot de passe", btnContinue: "Continuer",
        
        step2Title: "Profil", step2Desc: "Parlez-nous un peu de vous.",
        usernameLabel: "Nom d'utilisateur", fname: "Prénom", lname: "Nom",
        reasonLabel: "Pourquoi utilisez-vous Screen To Street ?", reasonPlaceholder: "Sélectionnez une option (facultatif)",
        reason1: "Pour découvrir de nouveaux lieux", reason2: "Pour préparer un voyage", reason3: "Pour avoir de bonnes adresses", reason4: "Pour suivre la trace de mon idole", reason5: "Autre",
        
        step3Title: "Vos Pass", passDesc: "Sélectionnez les groupes à débloquer. (14.99€ par groupe)",
        subtotalLabel: "Sous-total :", payBtnEmpty: "Sélectionnez un groupe", btnToPayment: "Passer au paiement",
        
        step4Title: "Paiement", step4Desc: "Finalisez votre achat pour débloquer les guides.",
        summaryPasses: "Pass sélectionnés :", summaryTotal: "Total à payer :",
        cardNum: "Numéro de carte", expiry: "Date d'expiration", cvc: "CVC", paySecurely: "Payer en toute sécurité",
        
        processing: "Traitement sécurisé...", authRightTitle: "Débloquez le monde de vos idoles.",
        cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", 
        cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter",

        errInvalidEmail: "Adresse e-mail invalide.",
        errWeakPassword: "Le mot de passe doit contenir au moins 6 caractères.",
        errTooManyRequests: "Trop de tentatives. Réessayez dans quelques minutes.",
        errNetwork: "Problème de connexion internet.",
        errWrongPassword: "Mot de passe incorrect pour cette adresse e-mail.",
        errDefault: "Une erreur est survenue. Réessayez."
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
                if(i < currentActiveStep) { // On ne peut que reculer
                    showStep(i);
                }
            });
        }
    }
});

const modal = document.getElementById('auth-modal');

function showStep(step) {
    currentActiveStep = step;
    clearAuthError();
    
    for(let i=0; i<=4; i++) {
        let s = document.getElementById('auth-step-' + i);
        if(s) s.classList.add('hidden');
    }
    
    const targetStep = document.getElementById('auth-step-' + step);
    if(targetStep) targetStep.classList.remove('hidden');

    const stepper = document.getElementById('auth-stepper');
    if(step === 0) {
        if(stepper) stepper.classList.add('hidden');
    } else {
        if(stepper) stepper.classList.remove('hidden');
        
        for(let i=1; i<=4; i++) {
            let st = document.getElementById('step-dot-' + i);
            let lbl = document.getElementById('step-label-' + i);
            let line = document.getElementById('line-' + (i-1));
            
            if(i < step) {
                if(st) { st.style.background = '#e2e8f0'; st.style.color = '#64748b'; st.innerHTML = '✓'; }
                if(lbl) lbl.style.color = '#94a3b8';
                if(line) line.style.background = '#D42759';
            } else if(i === step) {
                if(st) { st.style.background = '#D42759'; st.style.color = '#fff'; st.innerHTML = i; }
                if(lbl) lbl.style.color = '#D42759';
                if(line) line.style.background = '#D42759';
            } else {
                if(st) { st.style.background = '#e2e8f0'; st.style.color = '#94a3b8'; st.innerHTML = i; }
                if(lbl) lbl.style.color = '#cbd5e1';
                if(line) line.style.background = '#e2e8f0';
            }
        }
    }
}

document.querySelectorAll('.open-auth-btn').forEach(btn => {
    btn.addEventListener('click', () => { 
        // Si la personne est déjà connectée, inutile de lui redemander de se connecter.
        if (firebaseCurrentUser) {
            window.location.href = 'map.html';
            return;
        }
        if(modal) modal.classList.remove('hidden'); 
        showStep(0); 
    });
});

const closeAuth = document.getElementById('close-auth');
if(closeAuth) closeAuth.addEventListener('click', () => { if(modal) modal.classList.add('hidden'); });

// ==========================================
// GESTION DES ERREURS D'AUTHENTIFICATION
// ==========================================
function showAuthError(message) {
    const el = document.getElementById('auth-error');
    if(el) { el.textContent = message; el.classList.remove('hidden'); }
}
function clearAuthError() {
    const el = document.getElementById('auth-error');
    if(el) { el.classList.add('hidden'); el.textContent = ''; }
}
function friendlyAuthError(code) {
    const t = dict[currentLang];
    const table = {
        'auth/invalid-email': t.errInvalidEmail,
        'auth/weak-password': t.errWeakPassword,
        'auth/too-many-requests': t.errTooManyRequests,
        'auth/network-request-failed': t.errNetwork,
        'auth/wrong-password': t.errWrongPassword
    };
    return table[code] || t.errDefault;
}

// ==========================================
// CHARGEMENT DU PROFIL D'UN UTILISATEUR EXISTANT
// ==========================================
// Appelé quand quelqu'un se reconnecte (email ou Google) à un compte déjà créé :
// on récupère son profil Firestore, on le recopie dans localStorage pour que le
// reste du site (encore basé sur localStorage) fonctionne sans changement, puis
// on l'envoie directement sur la carte.
async function loadExistingProfileAndRedirect(user) {
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
            const data = snap.data();
            if (data.username) localStorage.setItem('userName', data.username);
            if (Array.isArray(data.unlockedGroups)) localStorage.setItem('unlockedGroups', JSON.stringify(data.unlockedGroups));
        }
    } catch (e) {
        // Si la lecture échoue (règles de sécurité en cours d'ajustement, etc.),
        // on laisse quand même la personne accéder à la carte.
    }
    localStorage.setItem('userEmail', user.email || '');
    window.location.href = 'map.html';
}

// ==========================================
// CONNEXION GOOGLE (vrai popup Firebase, plus de simulation)
// ==========================================
window.openGooglePopup = async function() {
    clearAuthError();
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const info = getAdditionalUserInfo(result);
        const user = result.user;

        if (info && info.isNewUser) {
            // Première connexion Google : on pré-remplit le pseudo suggéré et on
            // continue l'inscription (profil, pass, paiement) comme pour un nouvel utilisateur.
            localStorage.setItem('userEmail', user.email || '');
            const unameInput = document.getElementById('uname');
            if (unameInput && user.displayName) unameInput.value = user.displayName.replace(/\s+/g, '');
            showStep(2);
        } else {
            // Compte Google déjà existant : on récupère son profil et on file sur la carte.
            await loadExistingProfileAndRedirect(user);
        }
    } catch (err) {
        // L'utilisateur a fermé la fenêtre Google lui-même : ce n'est pas une vraie erreur.
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
        showAuthError(friendlyAuthError(err.code));
    }
};

// --- NAVIGATION --- //

// Step 0 -> Step 1 (Email)
const btnToEmail = document.getElementById('btn-to-email');
if(btnToEmail) btnToEmail.addEventListener('click', () => { showStep(1); });

// Step 1 -> Step 2 (Account -> Profile) : connexion OU création de compte Firebase
const btnToStep2 = document.getElementById('btn-to-step2');
if(btnToStep2) {
    btnToStep2.addEventListener('click', async () => { 
        const emailInput = document.getElementById('user-email');
        const passInput = document.getElementById('user-password');
        if(!emailInput.checkValidity()) { emailInput.reportValidity(); return; }
        if(!passInput.checkValidity()) { passInput.reportValidity(); return; }
        clearAuthError();

        const emailVal = emailInput.value.trim();
        const passVal = passInput.value;
        const originalLabel = btnToStep2.textContent;
        btnToStep2.disabled = true;
        btnToStep2.textContent = '...';

        try {
            // 1) On essaie d'abord de connecter un compte existant avec cet e-mail/mot de passe.
            const cred = await signInWithEmailAndPassword(auth, emailVal, passVal);
            await loadExistingProfileAndRedirect(cred.user);
            return; // on quitte la page, pas besoin de réactiver le bouton
        } catch (signInErr) {
            if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
                // 2) Aucun compte ne correspond : soit l'e-mail n'existe pas encore, soit le mot
                //    de passe est faux pour un compte existant. On tente une création de compte.
                try {
                    await createUserWithEmailAndPassword(auth, emailVal, passVal);
                    localStorage.setItem('userEmail', emailVal);
                    btnToStep2.disabled = false;
                    btnToStep2.textContent = originalLabel;
                    showStep(2);
                } catch (createErr) {
                    btnToStep2.disabled = false;
                    btnToStep2.textContent = originalLabel;
                    if (createErr.code === 'auth/email-already-in-use') {
                        // La création échoue car le compte existe déjà : le mot de passe entré était donc faux.
                        showAuthError(friendlyAuthError('auth/wrong-password'));
                    } else {
                        showAuthError(friendlyAuthError(createErr.code));
                    }
                }
            } else {
                btnToStep2.disabled = false;
                btnToStep2.textContent = originalLabel;
                showAuthError(friendlyAuthError(signInErr.code));
            }
        }
    });
}

// Step 2 -> Step 3 (Profile -> Passes) : on écrit le profil dans Firestore
const btnToStep3 = document.getElementById('btn-to-step3');
if(btnToStep3) {
    btnToStep3.addEventListener('click', async () => {
        const uname = document.getElementById('uname');
        // SEUL le nom d'utilisateur est obligatoire
        if(!uname.checkValidity()) { uname.reportValidity(); return; }

        const usernameVal = uname.value.trim();
        const fnameVal = document.getElementById('fname').value.trim();
        const lnameVal = document.getElementById('lname').value.trim();
        const reasonVal = document.getElementById('user-reason').value;

        localStorage.setItem('userName', usernameVal);

        const user = auth.currentUser;
        if (user) {
            btnToStep3.disabled = true;
            try {
                await updateProfile(user, { displayName: usernameVal });
                await setDoc(doc(db, 'users', user.uid), {
                    username: usernameVal,
                    firstName: fnameVal,
                    lastName: lnameVal,
                    email: user.email,
                    reason: reasonVal,
                    unlockedGroups: [],
                    wishlistLocs: [],
                    visitedLocs: [],
                    myTrips: [],
                    createdAt: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                // On laisse la personne avancer même si l'écriture échoue pour l'instant ;
                // les règles de sécurité Firestore seront ajustées dans une étape suivante.
            }
            btnToStep3.disabled = false;
        }
        
        showStep(3);
    });
}

// Step 3 -> Step 4 (Passes -> Payment)
const btnToStep4 = document.getElementById('btn-to-step4');
if(btnToStep4) {
    btnToStep4.addEventListener('click', () => {
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

// Paiement (toujours simulé pour l'instant — aucun vrai système de paiement n'est branché) :
// on enregistre les pass choisis dans Firestore et dans localStorage, puis on redirige.
const checkoutForm = document.getElementById('checkout-form');
if(checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const checkedBoxes = document.querySelectorAll('.group-checkbox:checked');
        if(checkedBoxes.length === 0) return;

        let selectedGroups = [];
        checkedBoxes.forEach(cb => selectedGroups.push(cb.value));
        localStorage.setItem('unlockedGroups', JSON.stringify(selectedGroups));

        document.getElementById('btn-submit-payment').style.display = 'none';
        const paymentLoader = document.getElementById('payment-loader');
        if(paymentLoader) paymentLoader.classList.remove('hidden');

        const user = auth.currentUser;
        if (user) {
            try {
                await setDoc(doc(db, 'users', user.uid), { unlockedGroups: selectedGroups }, { merge: true });
            } catch (e) {
                // Silencieux : le paiement reste simulé, on ne bloque pas la personne pour ça.
            }
        }
        
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
