// 1. Map Initialization
const map = L.map('map', { zoomControl: false }).setView([37.541, 127.025], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors', subdomains: 'abcd', maxZoom: 19
}).addTo(map);

// Layer group for markers (so we can easily clear them when filtering)
const markerGroup = L.layerGroup().addTo(map);

// 2. Filter Configuration Data
const filterData = {
    "BTS": {
        members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook", "BTS (Group)"],
        categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts"]
    },
    "Blackpink": {
        members: ["Jisoo", "Jennie", "Rosé", "Lisa", "Blackpink (Group)"],
        categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"]
    },
    // You can add data for Twice, Seventeen, etc. here
};

// 3. Locations Database
const celebLocations = [
    {
        id: 1,
        name: "Cafe Camptong",
        group: "BTS",
        member: "BTS (Group)",
        country: "South Korea",
        city: "Seoul",
        category: "Run BTS",
        year: "2020",
        episode: "Episodes 118-119",
        episodeLink: "https://weverse.io/bts/media/3-104694116",
        context: "Run BTS! filming location for Episodes 118-119.",
        address: "40 Apgujeong-ro 42-gil, Gangnam-gu",
        lat: 37.5255,
        lng: 127.0375,
        img: "images/Camptong1.jpg", 
        gallery: ["images/Camptong1.jpg", "images/Camptong2.jpg"],
        fullDescription: "This large, multi-story cafe was rented out for the filming of the Run BTS! show. The members played a game searching for hidden sticky notes throughout the building to score points.",
        directions: "Take the Suin-Bundang Line (Yellow) to Apgujeongrodeo Station. Take Exit 5 and walk for about 10 minutes."
    },
    {
        id: 2,
        name: "Cafe Kitsuné Seoul",
        group: "Blackpink",
        member: "Jennie",
        country: "South Korea",
        city: "Seoul",
        category: "Cafe",
        year: "2021",
        episode: "",
        episodeLink: "",
        context: "Jennie visited this popular cafe and posted photos on her Instagram.",
        address: "23 Dosan-daero 13-gil, Gangnam-gu",
        lat: 37.5197,
        lng: 127.0229,
        img: "images/Kitsune1.jpg", 
        gallery: ["images/Kitsune1.jpg"],
        fullDescription: "A chic French-Japanese aesthetic cafe located in the trendy Garosu-gil area. Jennie was spotted here enjoying a drink and taking pictures by the famous bamboo entrance.",
        directions: "Take Line 3 (Orange) to Sinsa Station. Exit 8 and walk about 8 minutes to the Garosu-gil main street."
    }
];

// 4. Graphic Marker Configuration
const magentaIcon = L.divIcon({
    className: 'custom-magenta-marker',
    html: `<div></div>`, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
});

// 5. Dynamic Filtering Logic
const groupSelect = document.getElementById('group-select');
const memberSelect = document.getElementById('member-select');
const categorySelect = document.getElementById('category-select');
const yearSelect = document.getElementById('year-select');

// Update Member and Category dropdowns based on selected Group
groupSelect.addEventListener('change', function() {
    const selectedGroup = this.value;
    
    // Reset dropdowns
    memberSelect.innerHTML = '<option value="All">All Members</option>';
    categorySelect.innerHTML = '<option value="All">All Categories</option>';
    
    if (selectedGroup !== "All" && filterData[selectedGroup]) {
        // Populate Members
        filterData[selectedGroup].members.forEach(member => {
            memberSelect.innerHTML += `<option value="${member}">${member}</option>`;
        });
        // Populate Categories
        filterData[selectedGroup].categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
    renderLocations();
});

// Trigger rendering when any other filter changes
memberSelect.addEventListener('change', renderLocations);
categorySelect.addEventListener('change', renderLocations);
yearSelect.addEventListener('change', renderLocations);

// 6. Function to Render Map Markers and Sidebar List
function renderLocations() {
    // Clear existing markers and list
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    locationListElement.innerHTML = '';

    // Get current filter values
    const fGroup = groupSelect.value;
    const fMember = memberSelect.value;
    const fCategory = categorySelect.value;
    const fYear = yearSelect.value;

    // Filter the database
    const filteredLocations = celebLocations.filter(loc => {
        const matchGroup = (fGroup === "All" || loc.group === fGroup);
        const matchMember = (fMember === "All" || loc.member === fMember);
        const matchCategory = (fCategory === "All" || loc.category === fCategory);
        const matchYear = (fYear === "All" || loc.year === fYear);
        return matchGroup && matchMember && matchCategory && matchYear;
    });

    // Generate new markers and cards
    filteredLocations.forEach(loc => {
        // Create Marker
        const marker = L.marker([loc.lat, loc.lng], { icon: magentaIcon }).addTo(markerGroup);

        const popupContent = `
            <div class="popup-title" onclick="openModal(${loc.id})">${loc.name} ↗️</div>
            <span class="popup-tag">${loc.category}</span>
            <img src="${loc.img}" alt="${loc.name}" class="popup-img" onerror="this.src='https://via.placeholder.com/400x200?text=Image+not+found'">
            <p style="margin-bottom: 5px;"><strong>${loc.group} :</strong> ${loc.member}</p>
            <button onclick="openModal(${loc.id})" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
                ➕ More details
            </button>
        `;
        marker.bindPopup(popupContent);

        // Create Sidebar Card
        const card = document.createElement('div');
        card.className = 'location-card';
        card.innerHTML = `
            <div class="card-title">${loc.name}</div>
            <div class="card-desc">📍 ${loc.address.split(',').pop().trim()}</div>
            <div class="card-desc" style="margin-top: 6px; font-weight: 600; color: #D94680;">${loc.group} • ${loc.category}</div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#F5D0DF');
            card.style.borderColor = '#D94680';
            map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1500);
        });

        locationListElement.appendChild(card);
    });
}

// Initial render when the page loads
renderLocations();

// 7. Modal Functions
window.openModal = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;

    document.getElementById('modal-title').textContent = loc.name;
    document.getElementById('modal-desc').textContent = loc.fullDescription;
    document.getElementById('modal-directions').textContent = loc.directions;
    
    document.getElementById('modal-group').textContent = loc.group;
    document.getElementById('modal-member').textContent = loc.member;
    document.getElementById('modal-country').textContent = loc.country;
    document.getElementById('modal-city').textContent = loc.city;
    document.getElementById('modal-full-address').textContent = loc.address;
    document.getElementById('modal-date').textContent = loc.year;

    const epContainer = document.getElementById('modal-episode-container');
    if (loc.episode) { document.getElementById('modal-episode').textContent = loc.episode; epContainer.style.display = 'block'; } 
    else { epContainer.style.display = 'none'; }

    const linkContainer = document.getElementById('modal-link-container');
    if (loc.episodeLink) { document.getElementById('modal-episode-link').href = loc.episodeLink; linkContainer.style.display = 'block'; } 
    else { linkContainer.style.display = 'none'; }

    document.getElementById('modal-address').textContent = `📍 ${loc.address}, ${loc.city}`;
    document.getElementById('modal-map-link').href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    const galleryContainer = document.getElementById('modal-gallery');
    galleryContainer.innerHTML = ""; 
    if(loc.gallery && loc.gallery.length > 0) {
        loc.gallery.forEach(imagePath => {
            const img = document.createElement('img');
            img.src = imagePath;
            img.onerror = function() { this.src = 'https://via.placeholder.com/300x250?text=Pending+Image'; };
            galleryContainer.appendChild(img);
        });
    }

    document.getElementById('details-modal').classList.remove('hidden');
};

window.closeModal = function() { document.getElementById('details-modal').classList.add('hidden'); };
window.onclick = function(event) { if (event.target === document.getElementById('details-modal')) window.closeModal(); };
