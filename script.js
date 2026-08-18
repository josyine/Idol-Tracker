// 1. Initialisation de la carte
const map = L.map('map', { zoomControl: false }).setView([37.5255, 127.0375], 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Fond de carte clair
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// 2. Base de données des lieux
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
        img: "images/Camptong1.jpg", // L'image qui s'affiche dans la petite bulle sur la carte
        gallery: [
            "images/Camptong1.jpg", 
            "images/Camptong2.jpg", 
            "images/Camptong3.jpg",
            "images/Camptong4.jpg",
            "images/Camptong5.jpg",
            "images/Camptong6.jpg",
            "images/Camptong7.jpg",
            "images/Camptong8.jpg",
            "images/Camptong9.jpg",
            "images/Camptong10.jpg",
            "images/Camptong11.jpg",
            "images/Camptong12.jpg",
            "images/Camptong13.jpg"
        ],
        fullDescription: "Ce grand café de plusieurs étages a été privatisé pour le tournage de l'émission Run BTS! Les membres ont joué à chercher des post-it cachés dans tout le bâtiment pour marquer des points. Le lieu est immense, avec une architecture industrielle très photogénique.",
        directions: "Prenez la ligne Suin-Bundang (jaune) jusqu'à la station Apgujeongrodeo. Sortez par la sortie 5 et marchez environ 10 minutes en direction de la rue commerçante."
    }
    // Tu peux copier/coller ce bloc et modifier l'ID, le nom et les coordonnées pour ajouter d'autres lieux
];

// 3. Configuration du marqueur graphique
const magentaIcon = L.divIcon({
    className: 'custom-magenta-marker',
    html: `<div></div>`, 
    iconSize: [20, 20], 
    iconAnchor: [10, 10], 
    popupAnchor: [0, -10]
});

// 4. Boucle pour injecter les points et générer le menu latéral
const locationListElement = document.getElementById('location-list');

celebLocations.forEach(loc => {
    // A. Placer le point sur la carte
    const marker = L.marker([loc.lat, loc.lng], { icon: magentaIcon }).addTo(map);

    // Contenu HTML de la petite bulle (Popup)
    const popupContent = `
        <div class="popup-title" onclick="openModal(${loc.id})">${loc.name} ↗️</div>
        <span class="popup-tag">${loc.category}</span>
        <img src="${loc.img}" alt="${loc.name}" class="popup-img" onerror="this.src='https://via.placeholder.com/400x200?text=Image+introuvable'">
        <p style="margin-bottom: 5px;"><strong>Concerne :</strong> ${loc.member}</p>
        <p style="color: #4b5563; font-size: 0.9rem; margin-bottom: 10px;"><em>"${loc.context}"</em></p>
        <button onclick="openModal(${loc.id})" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
            ➕ Plus de détails
        </button>
    `;
    marker.bindPopup(popupContent);

    // B. Créer la carte cliquable dans le panneau latéral gauche
    const card = document.createElement('div');
    card.className = 'location-card';
    card.innerHTML = `
        <div class="card-title">${loc.name}</div>
        <div class="card-desc">📍 ${loc.address.split(',').pop().trim()}</div>
        <div class="card-desc" style="margin-top: 6px; font-weight: 600; color: #D94680;">${loc.category}</div>
    `;

    // Action : Clic sur la carte latérale = zoom + ouverture de la petite bulle
    card.addEventListener('click', () => {
        document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#F5D0DF');
        card.style.borderColor = '#D94680';

        map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
        setTimeout(() => marker.openPopup(), 1500);
    });

    locationListElement.appendChild(card);
});

// 5. Fonctions pour la gestion de la Fenêtre Modale (Détails)

window.openModal = function(id) {
    // Retrouver le lieu dans la base de données via son ID
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;

    // Remplir les textes de la modale
    document.getElementById('modal-title').textContent = loc.name;
    document.getElementById('modal-desc').textContent = loc.fullDescription;
    document.getElementById('modal-directions').textContent = loc.directions;
    document.getElementById('modal-address').textContent = `📍 ${loc.address}`;
    
    // Générer le lien Google Maps
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    document.getElementById('modal-map-link').href = mapLink;

    // Injecter les images dans la galerie défilante
    const galleryContainer = document.getElementById('modal-gallery');
    galleryContainer.innerHTML = ""; // Vide la galerie précédente
    if(loc.gallery && loc.gallery.length > 0) {
        loc.gallery.forEach(imagePath => {
            const img = document.createElement('img');
            img.src = imagePath;
            // Fallback au cas où l'image n'est pas trouvée
            img.onerror = function() { this.src = 'https://via.placeholder.com/300x250?text=Image+en+attente'; };
            galleryContainer.appendChild(img);
        });
    }

    // Afficher la modale en retirant la classe 'hidden'
    document.getElementById('details-modal').classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('details-modal').classList.add('hidden');
};

// Fermer la modale si l'utilisateur clique en dehors de la boîte blanche
window.onclick = function(event) {
    const modal = document.getElementById('details-modal');
    if (event.target === modal) {
        window.closeModal();
    }
};
