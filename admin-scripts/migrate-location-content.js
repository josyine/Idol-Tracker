// ==========================================
// MIGRATION UNIQUE — copie le contenu riche des lieux (Story, infos pratiques,
// conseils, lien vidéo) depuis locationContent.seed.json vers la collection
// Firestore `locationContent`. Étape 1 de la migration décrite dans script.js
// (voir renderLocationRichContent() / window.fetchLocationContent()).
//
// À exécuter UNE SEULE FOIS, localement sur votre machine (jamais depuis le site :
// la règle Firestore de `locationContent` interdit volontairement toute écriture
// depuis le navigateur — seul ce script, avec les droits d'administration, peut
// écrire dans cette collection).
//
// Marche à suivre :
//   1. npm install firebase-admin   (une seule fois, dans ce dossier)
//   2. Générez une clé de compte de service :
//      Console Firebase > Paramètres du projet > Comptes de service >
//      "Générer une nouvelle clé privée" — un fichier JSON se télécharge.
//   3. Placez ce fichier ici sous le nom serviceAccountKey.json
//      (déjà ignoré par .gitignore si vous en ajoutez un — NE JAMAIS committer ce
//      fichier, il donne un accès administrateur complet à votre projet Firebase).
//   4. node migrate-location-content.js
//
// Le script écrit un document par lieu (locationContent/{id}), avec `{merge:true}`
// : le relancer plus tard (après une mise à jour de locationContent.seed.json) est
// donc sans danger, il ne fait que rafraîchir les champs présents dans le JSON.
// ==========================================

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Fichier introuvable : ' + serviceAccountPath);
    console.error('Téléchargez une clé de compte de service depuis la console Firebase (voir le commentaire en haut de ce fichier) et placez-la ici sous ce nom.');
    process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

async function main() {
    const seedPath = path.join(__dirname, 'locationContent.seed.json');
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const ids = Object.keys(data);
    console.log(`Écriture de ${ids.length} documents dans locationContent...`);

    // Par lots de 400 (marge sous la limite de 500 écritures par batch Firestore).
    const BATCH_SIZE = 400;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = ids.slice(i, i + BATCH_SIZE);
        chunk.forEach(id => {
            batch.set(db.collection('locationContent').doc(id), data[id], { merge: true });
        });
        await batch.commit();
        console.log(`  ${Math.min(i + BATCH_SIZE, ids.length)} / ${ids.length}`);
    }

    console.log('Terminé.');
}

main().catch(err => { console.error(err); process.exit(1); });
