// ==========================================
// FIREBASE : INITIALISATION PARTAGÉE (toutes les pages de l'app)
// ==========================================
// Ce fichier est chargé en tant que <script type="module"> sur chaque page qui a
// besoin de lire/écrire des données de compte (map.html, trips.html, wishlist.html,
// et bientôt visited.html, account.html...). Il expose sur `window` tout ce dont
// script.js (un script classique, pas un module) a besoin pour parler à Firestore,
// via un pont simple : des fonctions globales + un événement "firebase-ready".
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    deleteUser,
    reauthenticateWithPopup,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseCurrentUser = null;

// Fonctions de connexion exposées globalement, pour que des pages qui n'ont pas
// leur propre module (map.html, legal.html...) puissent proposer un formulaire de
// connexion sans dupliquer toute la logique Firebase.
window.firebaseSignInEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
window.firebaseSignInGoogle = () => signInWithPopup(auth, googleProvider);
window.firebaseSendPasswordReset = (email) => sendPasswordResetEmail(auth, email);
// Vraie déconnexion Firebase (ferme la session), pas juste un nettoyage du localStorage.
window.firebaseSignOut = () => signOut(auth);

// Suppression définitive du compte : le document Firestore ET le compte
// d'authentification Firebase lui-même. Si Firebase exige une reconnexion récente
// (mesure de sécurité pour les actions sensibles), on tente une ré-authentification
// automatique (Google) ou on demande le mot de passe (email) avant de réessayer.
// `password` est optionnel : fourni seulement lors d'une deuxième tentative, une
// fois que la personne l'a saisi suite à l'erreur 'needs-password'.
window.firebaseDeleteAccount = async function (password) {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    const doDelete = async () => {
        try { await deleteDoc(doc(db, 'users', user.uid)); } catch (e) { /* on continue même si le document n'existe pas/plus */ }
        await deleteUser(user);
    };

    try {
        await doDelete();
    } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
            const providerId = user.providerData[0] && user.providerData[0].providerId;
            if (providerId === 'google.com') {
                await reauthenticateWithPopup(user, googleProvider);
            } else if (password) {
                const cred = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, cred);
            } else {
                throw Object.assign(new Error('needs-password'), { code: 'needs-password' });
            }
            await doDelete();
        } else {
            throw err;
        }
    }
};

// Changement de mot de passe (settings.html) : ne s'applique qu'aux comptes
// email/mot de passe — un compte connecté uniquement via Google n'a pas de mot de
// passe Firebase à changer (settings.html détecte ce cas et n'appelle pas cette
// fonction). On ré-authentifie toujours avec le mot de passe actuel avant de définir
// le nouveau, ce qui satisfait au passage l'exigence Firebase de connexion récente
// pour cette action sensible et vérifie naturellement que l'ancien mot de passe est
// correct (sinon reauthenticateWithCredential rejette avec auth/wrong-password).
window.firebaseChangePassword = async function (currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
};

// Écrit (fusionne, sans écraser le reste du document) les champs donnés dans le
// document Firestore de l'utilisateur actuellement connecté. Ne fait rien si
// personne n'est connecté (visiteur non authentifié → wishlist locale uniquement,
// comme avant).
window.syncUserData = async function (fields) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), fields, { merge: true });
    } catch (e) {
        console.warn('Synchronisation Firestore échouée :', e);
    }
};

// Récupère le document complet de l'utilisateur connecté (ou null si personne
// n'est connecté, ou si le document n'existe pas encore).
window.loadUserCloudData = async function () {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.warn('Lecture Firestore échouée :', e);
        return null;
    }
};

// Dès que l'état de connexion est connu (au chargement de la page, et à chaque
// connexion/déconnexion), on prévient le reste du site via un évènement custom —
// c'est le pont qui permet à script.js (non-module) de réagir sans avoir besoin
// d'imports ES.
onAuthStateChanged(auth, (user) => {
    window.firebaseCurrentUser = user || null;
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { user: user || null } }));
});
