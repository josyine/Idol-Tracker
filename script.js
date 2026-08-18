// 1. Map Initialization
const map = L.map('map', { zoomControl: false }).setView([37.5255, 127.0375], 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Light map tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// 2. Locations Database
const celebLocations = [
    {
        id: 1,
        name: "Cafe Camptong",
        member: "BTS (Group)",
        country: "South Korea",
        city: "Seoul",
        category: "Run BTS",
        year: "2020",
        episode: "Episodes 118-119",
        context: "Run BTS! filming location for Episodes 118-119.",
        address: "40 Apgujeong-ro 42-gil, Gangnam-gu",
        lat: 37.5255,
        lng: 127.0375,
        img: "images/Camptong1.jpg", 
        gallery: [
            "images/Camptong1.jpg", "images/Camptong2.jpg", "images/Camptong3.jpg",
            "images/Camptong4.jpg", "images/Camptong5.jpg", "images/Camptong6.jpg",
            "images/Camptong7.jpg", "images/Camptong8.jpg", "images/Camptong9.jpg",
            "images/Camptong10.jpg", "images/Camptong11.jpg", "images/Camptong12.jpg",
            "images/Camptong13.jpg"
        ],
        fullDescription: "This large, multi-story cafe was rented out for the filming of the Run BTS! show. The members played a game searching for hidden sticky notes throughout the building to score points. It has become a must-visit spot for fans.",
        directions: "Take the Suin-Bundang Line (Yellow) to Apgujeongrodeo Station. Take Exit 5 and walk for about 10 minutes. The building is easily recognizable by its modern architecture."
    }
    // You can copy/paste this block to add other locations
];

// 3. Graphic Marker Configuration
const magentaIcon = L.divIcon({
    className: 'custom-magenta-marker',
    html: `<div></div>`, 
    iconSize: [20, 20], 
    iconAnchor: [10, 10], 
    popupAnchor: [0, -10]
});

// 4. Loop to inject points and generate the side menu
const locationListElement = document.getElementById('location-list');

celebLocations.forEach(loc => {
    // A. Place point on the map
    const marker = L.marker([loc.lat, loc.lng], { icon: magentaIcon }).addTo(map);

    // HTML Content for the map popup
    const popupContent = `
        <div class="popup-title" onclick="openModal(${loc.id})">${loc.name} ↗️</div>
        <span class="popup-tag">${loc.category}</span>
        <img src="${loc.img}" alt="${loc.name}" class="popup-img" onerror="this.src='https://via.placeholder.com/400x200?text=Image+not+found'">
        <p style="margin-bottom: 5px;"><strong>Related to:</strong> ${loc.member}</p>
        <p style="color: #4b5563; font-size: 0.9rem; margin-bottom: 10px;"><em>"${loc.context}"</em></p>
        <button onclick="openModal(${loc.id})" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
            ➕ More details
        </button>
    `;
    marker.bindPopup(popupContent);

    // B. Create the clickable card in the left sidebar
    const card = document.createElement('div');
    card.className = 'location-card';
    card.innerHTML = `
        <div class="card-title">${loc.name}</div>
        <div class="card-desc">📍 ${loc.address.split(',').pop().trim()}</div>
        <div class="card-desc" style="margin-top: 6px; font-weight: 600; color: #D94680;">${loc.category}</div>
    `;

    // Action: Click on sidebar card = zoom + open popup
    card.addEventListener('click', () => {
        document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#F5D0DF');
        card.style.borderColor = '#D94680';

        map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
        setTimeout(() => marker.openPopup(), 1500);
    });

    locationListElement.appendChild(card);
});

// 5. Functions for the Details Modal Window

window.openModal = function(id) {
    // Find the location in the database via its ID
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;

    // Fill in the basic text fields
    document.getElementById('modal-title').textContent = loc.name;
    document.getElementById('modal-desc').textContent = loc.fullDescription;
    document.getElementById('modal-directions').textContent = loc.directions;
    
    // Fill in the details list
    document.getElementById('modal-member').textContent = loc.member;
    document.getElementById('modal-country').textContent = loc.country;
    document.getElementById('modal-city').textContent = loc.city;
    document.getElementById('modal-full-address').textContent = loc.address;
    document.getElementById('modal-date').textContent = loc.year;

    // Manage episode display (hide it if there isn't one for another location)
    const epContainer = document.getElementById('modal-episode-container');
    if (loc.episode) {
        document.getElementById('modal-episode').textContent = loc.episode;
        epContainer.style.display = 'block'; 
    } else {
        epContainer.style.display = 'none';  
    }

    // Address marker at the bottom
    document.getElementById('modal-address').textContent = `📍 ${loc.address}, ${loc.city}`;
    
    // Generate Google Maps link
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    document.getElementById('modal-map-link').href = mapLink;

    // Inject images into the scrolling gallery
    const galleryContainer = document.getElementById('modal-gallery');
    galleryContainer.innerHTML = ""; // Clear previous gallery
    if(loc.gallery && loc.gallery.length > 0) {
        loc.gallery.forEach(imagePath => {
            const img = document.createElement('img');
            img.src = imagePath;
            // Fallback just in case the image is not found
            img.onerror = function() { this.src = 'https://via.placeholder.com/300x250?text=Pending+Image'; };
            galleryContainer.appendChild(img);
        });
    }

    // Display the modal by removing the 'hidden' class
    document.getElementById('details-modal').classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('details-modal').classList.add('hidden');
};

// Close modal if user clicks outside the white box
window.onclick = function(event) {
    const modal = document.getElementById('details-modal');
    if (event.target === modal) {
        window.closeModal();
    }
};
