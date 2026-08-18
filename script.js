// 1. Map Initialization
const map = L.map('map', { zoomControl: false }).setView([37.541, 127.025], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors', subdomains: 'abcd', maxZoom: 19
}).addTo(map);

const markerGroup = L.layerGroup().addTo(map);

// 2. Filter Configuration Data (No "Group" inside members anymore)
const filterData = {
    "BTS": {
        members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"],
        categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts"]
    },
    "Blackpink": {
        members: ["Jisoo", "Jennie", "Rosé", "Lisa"],
        categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"]
    }
};

let activeCategory = "All"; 

// 3. Locations Database
const celebLocations = [
    {
        id: 1,
        name: "Cafe Camptong",
        group: "BTS",
        member: "All", 
        country: "South Korea",
        city: "Seoul",
        category: "Run BTS",
        year: "2020",
        episode: "Episodes 118-119",
        episodeLink: "https://weverse.io/bts/media/3-104694116",
        context: "The boys played a game searching for hidden sticky notes.",
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
        name: "Otsu Seiromushi",
        group: "BTS",
        member: "Jin", 
        country: "South Korea",
        city: "Seoul",
        category: "Restaurants",
        year: "2018",
        episode: "",
        episodeLink: "",
        context: "A Japanese steamed cuisine restaurant opened by Jin's brother.",
        address: "30 Baekjegobun-ro 45-gil, Songpa-gu",
        lat: 37.5105,
        lng: 127.1085,
        img: "images/Otsu1.jpg", 
        gallery: ["images/Otsu1.jpg"],
        fullDescription: "Opened in 2018 by Jin's older brother, Jin is a co-director. The restaurant specializes in traditional Japanese wooden steamer dishes featuring sliced beef, pork, and fresh vegetables.",
        directions: "Take Line 8 to Seokchon Station or Line 9 to Songpanaru Station. It's a short 5-minute walk from Songpanaru Exit 1."
    },
    {
        id: 3,
        name: "Lotte World Adventure",
        group: "BTS",
        member: "All",
        country: "South Korea",
        city: "Seoul",
        category: "Run BTS",
        year: "2018",
        episode: "Episode 51",
        episodeLink: "",
        context: "The members went on the pirate ship and other rides for a special amusement park episode.",
        address: "240 Olympic-ro, Songpa-gu",
        lat: 37.5113,
        lng: 127.0980,
        img: "images/Lotte1.jpg",
        gallery: ["images/Lotte1.jpg"],
        fullDescription: "The group rented out Lotte World after hours to film Run BTS! They wore cute headbands and played games while riding the famous Viking ship and French Revolution rollercoaster.",
        directions: "Take Line 2 or Line 8 directly to Jamsil Station. The park is connected underground to the station."
    },
    {
        id: 4,
        name: "Ahwon Museum & Hotel",
        group: "BTS",
        member: "All",
        country: "South Korea",
        city: "Wanju",
        category: "Museums",
        year: "2019",
        episode: "Summer Package 2019",
        episodeLink: "",
        context: "Filming location for the beautiful traditional concepts of the 2019 Summer Package.",
        address: "113-40 Jongnam-gil, Soyang-myeon, Wanju-gun",
        lat: 35.8455,
        lng: 127.1895,
        img: "images/Ahwon1.jpg",
        gallery: ["images/Ahwon1.jpg"],
        fullDescription: "A gorgeous Hanok (traditional Korean house) turned into a modern art museum and boutique hotel. BTS shot the breathtaking photos for their 2019 Summer Package here, surrounded by mountains.",
        directions: "Located in Wanju-gun, Jeollabuk-do. Best accessed by car or taxi from Jeonju city center (about 30 mins)."
    },
    {
        id: 5,
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
        directions: "Take Line 3 (Orange) to Sinsa Station. Exit 8 and walk about 8 minutes."
    }
];

// Icons Mapping
function getCategoryIcon(category) {
    const icons = { "Run BTS": "🎬", "Bon Voyage": "🧳", "Restaurants": "🍽️", "Cafe": "☕", "Museums": "🏛️", "MV Location": "🎥", "Concerts": "🎤", "Fashion": "👗", "Pop-up Store": "🛍️" };
    return icons[category] || "📍";
}

const magentaIcon = L.divIcon({ className: 'custom-magenta-marker', html: `<div></div>`, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10] });

// DOM Elements
const groupSelect = document.getElementById('group-select');
const memberSelect = document.getElementById('member-select');
const yearSelect = document.getElementById('year-select');
const searchInput = document.getElementById('search-input');
const categoryButtonsContainer = document.getElementById('category-buttons');

// Initialization function for dynamic filters
function initializeFilters() {
    const selectedGroup = groupSelect.value;
    memberSelect.innerHTML = '<option value="All">All Members</option>';
    categoryButtonsContainer.innerHTML = '<button class="filter-btn active" data-cat="All">All Categories</button>';
    activeCategory = "All";
    
    if (selectedGroup !== "All" && filterData[selectedGroup]) {
        filterData[selectedGroup].members.forEach(member => {
            memberSelect.innerHTML += `<option value="${member}">${member}</option>`;
        });
        
        filterData[selectedGroup].categories.forEach(cat => {
            categoryButtonsContainer.innerHTML += `<button class="filter-btn" data-cat="${cat}">${cat}</button>`;
        });
    }

    // Attach click events to category buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.getAttribute('data-cat');
            renderLocations();
        });
    });
}

// Event Listeners
groupSelect.addEventListener('change', () => { initializeFilters(); renderLocations(); });
memberSelect.addEventListener('change', renderLocations);
yearSelect.addEventListener('change', renderLocations);
searchInput.addEventListener('input', renderLocations);

// Main Render Function
function renderLocations() {
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    locationListElement.innerHTML = '';

    const fGroup = groupSelect.value;
    const fMember = memberSelect.value;
    const fYear = yearSelect.value;
    const searchTerm = searchInput.value.toLowerCase();

    const filteredLocations = celebLocations.filter(loc => {
        const matchGroup = (fGroup === "All" || loc.group === fGroup);
        // Important: If a specific member is selected, show their solo spots OR spots where "All" members were present
        const matchMember = (fMember === "All" || loc.member === fMember || loc.member === "All");
        const matchCategory = (activeCategory === "All" || loc.category === activeCategory);
        const matchYear = (fYear === "All" || loc.year === fYear);
        
        // Search logic (checks name, city, and context)
        const matchSearch = loc.name.toLowerCase().includes(searchTerm) || 
                            loc.city.toLowerCase().includes(searchTerm) || 
                            loc.context.toLowerCase().includes(searchTerm);
                            
        return matchGroup && matchMember && matchCategory && matchYear && matchSearch;
    });

    // Update Stats on UI
    document.getElementById('location-count-sidebar').textContent = filteredLocations.length;
    document.getElementById('stat-locations').textContent = filteredLocations.length;
    const uniqueCountries = new Set(filteredLocations.map(l => l.country)).size;
    document.getElementById('stat-countries').textContent = uniqueCountries;

    filteredLocations.forEach(loc => {
        // 1. Map Marker
        const marker = L.marker([loc.lat, loc.lng], { icon: magentaIcon }).addTo(markerGroup);

        // Build Extra Meta HTML for Popup
        let metaHtml = `<strong>Year:</strong> ${loc.year}`;
        if(loc.episode) { metaHtml += ` <br><strong>Ep:</strong> ${loc.episode}`; }

        const popupContent = `
            <div class="popup-title" onclick="openModal(${loc.id})">${loc.name} ↗️</div>
            <span class="popup-tag">${getCategoryIcon(loc.category)} ${loc.category}</span>
            <img src="${loc.img}" alt="${loc.name}" class="popup-img" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <div class="popup-context">"${loc.context}"</div>
            <div class="popup-meta">${metaHtml}</div>
            <button onclick="openModal(${loc.id})" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
                ➕ More details
            </button>
        `;
        marker.bindPopup(popupContent);

        // 2. Sidebar Card
        const card = document.createElement('div');
        card.className = 'location-card';
        let membersDisplay = loc.member === "All" ? `All Members` : loc.member;

        card.innerHTML = `
            <div class="card-title-row">
                <span class="card-icon">${getCategoryIcon(loc.category)}</span>
                <span class="card-title">${loc.name}</span>
            </div>
            <div class="card-desc">📍 ${loc.address.split(',').pop().trim()}</div>
            <div class="card-desc" style="margin-top: 6px; font-weight: 600; color: #D94680;">${loc.group} • ${membersDisplay}</div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#F5D0DF');
            card.style.borderColor = '#D94680';
            map.flyTo([loc.lat, loc.lng], 15, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1500);
        });

        locationListElement.appendChild(card);
    });
}

// Initial Load
initializeFilters();
renderLocations();

// Modal Functions
window.openModal = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;

    document.getElementById('modal-title').textContent = loc.name;
    document.getElementById('modal-desc').textContent = loc.fullDescription;
    document.getElementById('modal-directions').textContent = loc.directions;
    
    document.getElementById('modal-group').textContent = loc.group;
    document.getElementById('modal-member').textContent = loc.member === "All" ? `All Members` : loc.member;
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
