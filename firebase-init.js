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
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, deleteField, increment, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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
// (mesure de sécurité pour les actions sensibles) : pour un compte email/mot de passe,
// on demande le mot de passe avant de réessayer. `password` est optionnel : fourni
// seulement lors d'une deuxième tentative, une fois que la personne l'a saisi suite à
// l'erreur 'needs-password'.
//
// Pour un compte Google, on NE tente PAS reauthenticateWithPopup ici : ce code
// s'exécute après un premier `await doDelete()` qui a échoué, donc plusieurs ticks
// après le clic d'origine — la plupart des navigateurs ne considèrent alors plus
// l'ouverture d'une popup comme un geste utilisateur direct et la bloquent
// silencieusement (l'erreur qui en résulte, ex. 'auth/popup-blocked', ne correspond à
// aucun cas géré par l'appelant, d'où le message générique "Something went wrong"
// observé). On renvoie donc 'needs-google-reauth' pour que l'UI propose un bouton
// dédié : reauthenticateWithPopup sera alors appelée en tout premier, directement
// depuis le gestionnaire de clic de CE bouton (voir firebaseReauthenticateGoogleAndDelete
// ci-dessous), ce qui reste un geste utilisateur direct aux yeux du navigateur.
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
                throw Object.assign(new Error('needs-google-reauth'), { code: 'needs-google-reauth' });
            } else if (password) {
                const cred = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, cred);
                await doDelete();
            } else {
                throw Object.assign(new Error('needs-password'), { code: 'needs-password' });
            }
        } else {
            throw err;
        }
    }
};

// Déclenchée directement par le clic sur le bouton "Confirm with Google" (geste
// utilisateur direct requis pour que la popup Google ne soit pas bloquée par le
// navigateur) : ré-authentifie puis relance la suppression, sans repasser par
// firebaseDeleteAccount ni par un quelconque await intermédiaire avant l'appel popup.
window.firebaseReauthenticateGoogleAndDelete = async function () {
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' });

    await reauthenticateWithPopup(user, googleProvider);
    try { await deleteDoc(doc(db, 'users', user.uid)); } catch (e) { /* on continue même si le document n'existe pas/plus */ }
    await deleteUser(user);
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

// Note communautaire (/5) d'un lieu : moyenne partagée entre TOUS les utilisateurs, pas
// la moyenne des visites d'une seule personne. Stockée dans une collection PUBLIQUE
// séparée des documents utilisateur privés (`users/{uid}`) : chaque document ne contient
// que sum+count agrégés, jamais les notes individuelles ni qui a noté quoi.
//
// IMPORTANT — nécessite une règle Firestore dédiée que ce fichier ne peut pas déployer
// lui-même (à ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /locationRatings/{locationId} {
//     allow read: if true;
//     allow write: if request.auth != null
//       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['sum', 'count']);
//   }
// Limite connue : un client malveillant authentifié pourrait tout de même écrire un
// incrément arbitraire (ex: +1000) puisque les règles Firestore seules ne peuvent pas
// vérifier qu'un increment() correspond à "une vraie note entre 1 et 5" sans passer par
// une Cloud Function — hors de portée d'un site 100% statique sans backend comme celui-ci.
window.updateLocationRatingAggregate = async function (locationId, sumDelta, countDelta) {
    if (!sumDelta && !countDelta) return;
    try {
        await setDoc(doc(db, 'locationRatings', String(locationId)), {
            sum: increment(sumDelta),
            count: increment(countDelta)
        }, { merge: true });
    } catch (e) {
        console.warn('Mise à jour de la note communautaire échouée :', e);
    }
};

// Récupère la collection entière des notes communautaires en un seul aller-retour
// (plutôt qu'une lecture par lieu) — appelée une fois au chargement de map.html.
window.loadAllLocationRatings = async function () {
    try {
        const snap = await getDocs(collection(db, 'locationRatings'));
        const result = {};
        snap.forEach(d => { result[d.id] = d.data(); });
        return result;
    } catch (e) {
        console.warn('Lecture des notes communautaires échouée :', e);
        return {};
    }
};

// Avis publics ("Reviews") sur un lieu : une personne peut rendre publique sa fiche
// "J'ai visité ce lieu" (note + notes + photo) pour que les autres utilisateurs la
// voient dans le nouvel onglet "Reviews" du détail d'un lieu. Un avis par personne et
// par lieu (écrase le précédent s'il republie), stocké dans une sous-collection dédiée
// pour pouvoir lire tous les avis d'UN SEUL lieu sans lire toute la collection (pas de
// requête where() disponible ici, seulement collection()+getDocs()).
//
// IMPORTANT — nécessite une règle Firestore dédiée que ce fichier ne peut pas déployer
// lui-même (à ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /locationReviews/{locationId}/items/{uid} {
//     allow read: if true;
//     allow write: if request.auth != null && request.auth.uid == uid;
//   }
// Renvoie {success:true} ou {success:false, code} (jamais une exception) pour que
// l'appelant (script.js) puisse prévenir la personne si la publication a échoué —
// notamment si les règles Firestore ci-dessus n'ont pas encore été ajoutées côté
// console (code 'permission-denied'), auquel cas la publication échouait jusqu'ici
// TOUJOURS en silence : la case restait cochée dans l'interface, mais rien n'était
// réellement publié, donnant l'impression trompeuse que ça avait marché.
window.setLocationReview = async function (locationId, reviewData) {
    const user = auth.currentUser;
    if (!user) return { success: false, code: 'not-authenticated' };
    try {
        await setDoc(doc(db, 'locationReviews', String(locationId), 'items', user.uid), Object.assign({
            uid: user.uid,
            updatedAt: serverTimestamp()
        }, reviewData));
        return { success: true };
    } catch (e) {
        console.warn('Publication de l\'avis échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.deleteLocationReview = async function (locationId) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'locationReviews', String(locationId), 'items', user.uid));
    } catch (e) {
        console.warn('Suppression de l\'avis échouée :', e);
    }
};

window.fetchLocationReviews = async function (locationId) {
    try {
        const snap = await getDocs(collection(db, 'locationReviews', String(locationId), 'items'));
        const result = [];
        snap.forEach(d => result.push(d.data()));
        return result;
    } catch (e) {
        console.warn('Lecture des avis échouée :', e);
        return [];
    }
};

// ==========================================
// PARTAGE DE VOYAGES ENTRE UTILISATEURS ("travel buddies", trips.html)
// ==========================================
// Un voyage privé vit dans users/{uid}.myTrips (voir plus haut) — invisible aux autres
// comptes par construction. Le partager nécessite donc une VRAIE collection séparée
// trips/{tripId}, lisible/modifiable par le propriétaire ET chaque collaborateur ajouté
// (members: {uid: 'edit'|'view'}). Retrouver un compte à partir du pseudo tapé dans la
// case "Their username or email" nécessite à son tour un index public séparé
// (usernames/{pseudo} -> uid) : sans lui, impossible de résoudre un pseudo en uid sans
// élargir dangereusement les droits de lecture sur la collection privée users/.
// Limite connue : la recherche ne fonctionne que par PSEUDO exact (pas par email — cela
// nécessiterait une Cloud Function avec les droits admin, hors de portée d'un site 100%
// statique comme celui-ci).
//
// IMPORTANT — nécessite ces règles Firestore (non déployables depuis ce fichier, à
// ajouter dans la console Firebase, onglet Firestore > Rules) :
//   match /usernames/{username} {
//     allow read: if true;
//     allow write: if request.auth != null && request.resource.data.uid == request.auth.uid;
//   }
//   match /trips/{tripId} {
//     allow read: if request.auth != null
//       && (resource.data.ownerUid == request.auth.uid || request.auth.uid in resource.data.members);
//     allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
//     allow update: if request.auth != null
//       && (resource.data.ownerUid == request.auth.uid || resource.data.members[request.auth.uid] == 'edit');
//     allow delete: if request.auth != null && resource.data.ownerUid == request.auth.uid;
//   }
// Réserve un pseudo dans l'index public usernames/{pseudo} -> uid. Vérifie D'ABORD que
// le pseudo n'appartient pas déjà à un AUTRE compte avant d'écrire — sans ça, deux
// comptes choisissant le même pseudo pouvaient silencieusement se voler l'index l'un
// l'autre (le dernier à sauvegarder "gagnait"), rendant les invitations "travel buddy"
// imprévisibles. Renvoie {success, code} comme setLocationReview()/setDoc() plus haut,
// pour que l'appelant (account.html) puisse bloquer et prévenir la personne si le
// pseudo est déjà pris ailleurs.
window.claimUsername = async function (username) {
    const user = auth.currentUser;
    if (!user || !username) return { success: false, code: 'invalid' };
    const key = username.toLowerCase().trim();
    try {
        const existing = await getDoc(doc(db, 'usernames', key));
        if (existing.exists() && existing.data().uid !== user.uid) {
            return { success: false, code: 'taken' };
        }
        await setDoc(doc(db, 'usernames', key), { uid: user.uid }, { merge: true });
        return { success: true };
    } catch (e) {
        console.warn('Réservation du pseudo échouée :', e);
        return { success: false, code: e && e.code || 'unknown' };
    }
};

window.lookupUserByUsername = async function (username) {
    if (!username) return null;
    try {
        const snap = await getDoc(doc(db, 'usernames', username.toLowerCase().trim()));
        return snap.exists() ? snap.data().uid : null;
    } catch (e) {
        console.warn('Recherche du pseudo échouée :', e);
        return null;
    }
};

window.createSharedTrip = async function (trip) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'trips', trip.id), Object.assign({}, trip, {
            ownerUid: user.uid,
            ownerName: (localStorage.getItem('userFirstName') || localStorage.getItem('userName') || 'ARMY').trim(),
            members: {},
            memberNames: {}
        }));
    } catch (e) {
        console.warn('Création du voyage partagé échouée :', e);
    }
};

window.saveSharedTrip = async function (tripId, fields) {
    try {
        await setDoc(doc(db, 'trips', tripId), fields, { merge: true });
    } catch (e) {
        console.warn('Sauvegarde du voyage partagé échouée :', e);
    }
};

window.loadSharedTrip = async function (tripId) {
    try {
        const snap = await getDoc(doc(db, 'trips', tripId));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.warn('Lecture du voyage partagé échouée :', e);
        return null;
    }
};

window.inviteTripCollaborator = async function (tripId, username, role) {
    const uid = await window.lookupUserByUsername(username);
    if (!uid) return { error: 'not-found' };
    try {
        await setDoc(doc(db, 'trips', tripId), {
            members: { [uid]: role },
            memberNames: { [uid]: username.trim() }
        }, { merge: true });
        return { uid, username: username.trim(), role };
    } catch (e) {
        console.warn('Invitation échouée :', e);
        return { error: 'failed' };
    }
};

window.setTripCollaboratorRole = async function (tripId, uid, role) {
    try {
        await setDoc(doc(db, 'trips', tripId), { members: { [uid]: role } }, { merge: true });
    } catch (e) {
        console.warn('Changement de permission échoué :', e);
    }
};

window.removeTripCollaborator = async function (tripId, uid) {
    try {
        await setDoc(doc(db, 'trips', tripId), {
            members: { [uid]: deleteField() },
            memberNames: { [uid]: deleteField() }
        }, { merge: true });
    } catch (e) {
        console.warn('Retrait du collaborateur échoué :', e);
    }
};

window.listSharedTripsForMe = async function () {
    const user = auth.currentUser;
    if (!user) return [];
    try {
        const q = query(collection(db, 'trips'), where(`members.${user.uid}`, 'in', ['edit', 'view']));
        const snap = await getDocs(q);
        const result = [];
        snap.forEach(d => result.push(Object.assign({ _sharedTripId: d.id, _myRole: d.data().members[user.uid] }, d.data())));
        return result;
    } catch (e) {
        console.warn('Lecture des voyages partagés échouée :', e);
        return [];
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
