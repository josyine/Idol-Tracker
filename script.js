// 1. Initialisation de la carte (Vue globale par défaut)
const map = L.map('map', {
    zoomControl: false // On retire le zoom par défaut pour le mettre où l'on veut
}).setView([30, 0], 2);

// Ajout des contrôles de zoom en bas à droite (plus esthétique)
L.control.zoom({ position: 'bottomright' }).addTo(map);

// 2. Ajout du fond de carte (Style "Positron" clair et minimaliste)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// 3. Jeu de données test (Tes premiers lieux avec coordonnées GPS)
const celebLocations = [
    {
        id: 1,
        name: "Cafe Camptong",
        member: "BTS (Groupe)",
        category: "Run BTS",
        year: 2020,
        context: "Tournage Run BTS! Épisodes 118-119 (Photo Exhibition).",
        address: "40 Apgujeong-ro 42-gil, Gangnam-gu, Séoul",
        lat: 37.5255,
        lng: 127.0375,
        img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 2,
        name: "Stade de France",
        member: "BTS (Groupe)",
        category: "Concert",
        year: 2019,
        context: "Tournée mondiale Love Yourself: Speak Yourself.",
        address: "93200 Saint-Denis, France",
        lat: 48.9244,
        lng: 2.3601,
        img: "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 3,
        name: "Dia Beacon",
        member: "RM",
        category: "Musée / Art",
        year: 2021,
        context: "Visite des installations d'art minimaliste et contemporain.",
        address: "3 Beekman St, Beacon, NY",
        lat: 41.5008,
        lng: -73.9820,
        img: "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=400&q=80"
    },
    {
        id: 4,
        name: "Lake Pukaki",
        member: "BTS (Groupe)",
        category: "Voyage",
        year: 2019,
        context: "Road trip en camping-car pour Bon Voyage Saison 4.",
        address: "Canterbury, Nouvelle-Zélande",
        lat: -44.0200,
        lng: 170.1500,
        img: "https://images.unsplash.com/photo-1506822452331-50e502c38dce?auto=format&fit=crop&w=400&q=80"
    }
];

// 4. Création d'un marqueur personnalisé Magenta HTML
const magentaIcon = L.divIcon({
    className: 'custom-magenta-marker',
    html: `<div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Centre l'icône sur le point GPS
    popupAnchor: [0, -10]  // Ouvre la popup juste au-dessus
});

// 5. Boucle pour injecter les données dans la carte ET dans la barre latérale
const locationListElement = document.getElementById('location-list');

celebLocations.forEach(loc => {
    // ---- A. Placer le point sur la carte ----
    const marker = L.marker([loc.lat, loc.lng], { icon: magentaIcon }).addTo(map);

    // Contenu HTML de la fenêtre contextuelle (Popup)
    const popupContent = `
        <div class="popup-title">${loc.name}</div>
        <span class="popup-tag">${loc.category}</span>
        <img src="${loc.img}" alt="${loc.name}" class="popup-img">
        <p style="margin-bottom: 5px;"><strong>Concerne :</strong> ${loc.member}</p>
        <p style="margin-bottom: 5px;"><strong>Année :</strong> ${loc.year}</p>
        <p style="color: #4b5563; font-size: 0.9rem; margin-bottom: 10px;"><em>"${loc.context}"</em></p>
        <p style="font-size: 0.8rem; color: #9ca3af;">📍 ${loc.address}</p>
    `;
    marker.bindPopup(popupContent);

    // ---- B. Créer la carte cliquable dans la barre latérale ----
    const card = document.createElement('div');
    card.className = 'location-card';
    card.innerHTML = `
        <div class="card-title">${loc.name}</div>
        <div class="card-desc">📍 ${loc.address.split(',').pop().trim()}</div>
        <div class="card-desc" style="margin-top: 6px; font-weight: 600; color: #D94680;">${loc.category}</div>
    `;

    // Action au clic sur la liste : Zoomer sur la carte et ouvrir la popup
    card.addEventListener('click', () => {
        // Enlève l'effet "sélectionné" des autres cartes (optionnel)
        document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#F5D0DF');
        card.style.borderColor = '#D94680';

        // Zoom fluide vers le lieu
        map.flyTo([loc.lat, loc.lng], 15, {
            duration: 1.5 // Durée de l'animation en secondes
        });
        
        // Ouvre la popup après la fin du zoom
        setTimeout(() => {
            marker.openPopup();
        }, 1500);
    });

    // Ajouter la carte générée dans le HTML
    locationListElement.appendChild(card);
});
