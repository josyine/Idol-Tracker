// 1. Initialisation de la carte
const map = L.map('map', { zoomControl: false }).setView([37.5255, 127.0375], 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// 2. Ton jeu de données MIS À JOUR avec tes images locales
const celebLocations = [
    {
        id: 1,
        name: "Cafe Camptong",
        member: "BTS (Groupe)",
        category: "Run BTS",
        year: 2020,
        context: "Tournage Run BTS! Épisodes 118-119.",
        address: "40 Apgujeong-ro 42-gil, Gangnam-gu, Séoul",
        lat: 37.5255,
        lng: 127.0375,
        // Image principale pour la carte et la popup
        img: "images/Camptong1.jpg", 
        // Toutes tes images pour la galerie détaillée
        gallery: [
            "images/Camptong1.jpg", "images/Camptong2.jpg", "images/Camptong3.jpg",
            "images/Camptong4.jpg", "images/Camptong5.jpg" // Ajoute jusqu'à 13 si tu veux
        ],
        fullDescription: "Ce grand café de plusieurs étages a été privatisé pour le tournage de l'émission Run BTS! Les membres ont joué à chercher des post-it cachés dans tout le bâtiment pour marquer des points. C'est un lieu devenu incontournable pour les fans.",
        directions: "Prenez la ligne Suin-Bundang (jaune) jusqu'à la station Apgujeongrodeo. Sortez par la sortie 5 et marchez environ 10 minutes. Le bâtiment est reconnaissable à son architecture moderne."
    }
    // Tu pourras ajouter les autres lieux ici plus tard...
];

const magentaIcon = L.divIcon({
    className: 'custom-magenta-marker',
    html: `<div></div>`, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
});

const locationListElement = document.getElementById('location-list');

celebLocations.forEach(loc => {
    const marker = L.marker([loc.lat, loc.lng], { icon: magentaIcon }).addTo(map);

    // --- NOUVEAU CONTENU DE LA POPUP : Titre cliquable + Bouton ---
    const popupContent = `
        <div class="popup-title" onclick="openModal(${loc.id})">${loc.name} ↗️</div>
        <span class="popup-tag">${loc.category}</span>
        <img src="${loc.img}" alt="${loc.name}" class="popup-img">
        <p style="margin-bottom: 5px;"><strong>Concerne :</strong> ${loc.member}</p>
        <p style="color: #4b5563; font-size: 0.9rem; margin-bottom: 10px;"><em>"${loc.context}"</em></p>
        <button onclick="openModal(${loc.id})" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer;">
            ➕ Plus de détails & photos
        </button>
    `;
    marker.bindPopup(popupContent);

    // Carte dans la barre latérale
    const card = document.createElement('div');
    card.className = 'location-card';
    card.innerHTML = `
        <div class="card-title">${loc.name}</div>
        <div class="card-desc">📍 ${loc.address.split(',').pop().trim()}</div>
        <div class="card-desc" style="margin-top: 6px; font-weight: 600; color: #D94680;">${loc.category}</div>
    `;

    card.addEventListener('click', () => {
        map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
        setTimeout(() => marker.openPopup(), 1500);
    });

    locationListElement.appendChild(card);
});

// --- NOUVELLES FONCTIONS POUR LA FENÊTRE MODALE ---

function openModal(id) {
    // 1. Trouver le bon lieu dans le tableau
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;

    // 2. Remplir le titre, la description et l'adresse
    document.getElementById('modal-title').textContent = loc.name;
    document.getElementById('modal-desc').textContent = loc.fullDescription;
    document.getElementById('modal-directions').textContent = loc.directions;
    document.getElementById('modal-address').textContent = `📍 ${loc.address}`;
    
    // 3. Lien Google Maps dynamique
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    document.getElementById('modal-map-link').href = mapLink;

    // 4. Générer la galerie de photos locales
    const galleryContainer = document.getElementById('modal-gallery');
    galleryContainer.innerHTML = ""; // On vide l'ancienne galerie
    if(loc.gallery && loc.gallery.length > 0) {
        loc.gallery.forEach(imagePath => {
            const img = document.createElement('img');
            img.src = imagePath; // Ex: "images/Camptong1.jpg"
            galleryContainer.appendChild(img);
        });
    }

    // 5. Afficher la modale
    document.getElementById('details-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('details-modal').classList.add('hidden');
}

// Fermer la modale si on clique en dehors du cadre blanc
window.onclick = function(event) {
    const modal = document.getElementById('details-modal');
    if (event.target === modal) {
        closeModal();
    }
}
