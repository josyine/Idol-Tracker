// 1. Map Initialization
const map = L.map('map', { zoomControl: false }).setView([37.541, 127.025], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors', subdomains: 'abcd', maxZoom: 19
}).addTo(map);

const markerGroup = L.layerGroup().addTo(map);

// 2. Elegant SVG Icons Library
const iconsSVG = {
    "Run BTS": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
    "Bon Voyage": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    "Restaurants": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    "Cafe": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
    "Museums": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
    "MV Location": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
    "Concerts": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "Fashion": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a8.59 8.59 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    "Pop-up Store": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    "Landmarks": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="4" y="8" rx="2" ry="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    "Default": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
};

const mapPinSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

// 3. Filter Configuration Data
const filterData = {
    "BTS": {
        members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"],
        categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks"]
    },
    "Blackpink": {
        members: ["Jisoo", "Jennie", "Rosé", "Lisa"],
        categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"]
    }
};

let activeCategory = "All"; 

// 4. Locations Database
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
        context: "The boys played an energetic game searching for hidden sticky notes in this massive cafe.",
        address: "40 Apgujeong-ro 42-gil, Gangnam-gu",
        lat: 37.5255,
        lng: 127.0375,
        img: "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg", 
        videoEmbeds: [
            "https://www.youtube.com/embed/yiqe-aegVk0",
            "https://www.youtube.com/embed/wlHS-fpJrm0"
        ],
        gallery: [
            "images/Camptong1.jpg", "images/Camptong2.jpg", "images/Camptong3.jpg",
            "images/Camptong4.jpg", "images/Camptong5.jpg", "images/Camptong6.jpg",
            "images/Camptong7.jpg", "images/Camptong8.jpg", "images/Camptong9.jpg",
            "images/Camptong10.jpg", "images/Camptong11.jpg", "images/Camptong12.jpg",
            "images/Camptong13.jpg"
        ],
        fullDescription: "Cafe Camptong is a massive, multi-story industrial-chic cafe located in the bustling streets of Gangnam. It gained legendary status among ARMYs when it was entirely rented out for Episodes 118 and 119 of Run BTS! Beyond its pop-culture fame, the cafe is an architectural marvel featuring high ceilings, exposed concrete walls, and large windows that bathe the interior in natural light. Visitors can enjoy a wide selection of artisanal pastries, freshly roasted coffee, and unique seasonal beverages.<br><br>Inside this huge space, the members ran around wildly, playing an intense game of finding hidden sticky notes to score points. The cafe has lovingly kept many traces of BTS's visit, making it a perfect pilgrimage spot. You can see the actual spots where the members hid, strategized, and playfully betrayed each other! Whether you are here to retrace your favorite idols' footsteps or simply to enjoy a quiet afternoon with a delicious dessert, Cafe Camptong offers an unforgettable Seoul cafe experience.",
        tip: "", // Pas de tip pour l'instant
        directions: "Take the Suin-Bundang Line (Yellow) to Apgujeongrodeo Station. Take Exit 5 and walk for about 10 minutes through the upscale neighborhood."
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
        videoEmbeds: [],
        gallery: ["images/Otsu1.jpg"],
        fullDescription: "Opened in 2018 by Jin's older brother, Jin is a co-director. The restaurant specializes in traditional Japanese wooden steamer dishes featuring sliced beef, pork, and fresh vegetables.",
        tip: "",
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
        episodeLink: "https://www.youtube.com/watch?v=d--MDCCJ3jg",
        context: "The members went on the pirate ship and other rides for a special amusement park episode.",
        address: "240 Olympic-ro, Songpa-gu",
        lat: 37.5113,
        lng: 127.0980,
        img: "https://img.youtube.com/vi/d--MDCCJ3jg/hqdefault.jpg",
        videoEmbeds: ["https://www.youtube.com/embed/d--MDCCJ3jg"],
        gallery: ["images/RunLotte1.jpg", "images/RunLotte2.png", "images/RunLotte3.jpg", "images/RunLotte4.jpg","images/RunLotte5.jpg", "images/RunLotte6.jpg", "images/RunLotte7.jpg", "images/RunLotte8.jpg", "images/RunLotte9.jpg", "images/RunLotte10.png"], 
        fullDescription: "Opened in 1989 in the Jamsil neighborhood, Lotte World is a must-visit entertainment complex in Seoul. Its layout is divided into two distinct areas. On one side, <strong>\"Adventure\"</strong> houses the world's largest indoor theme park, allowing year-round operation under a massive glass dome. On the other, <strong>\"Magic Island\"</strong> features outdoor rides on an artificial peninsula built in the middle of Seokchon Lake.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (Run BTS! - Episode 51)</h3>The group rented out the amusement park after hours to film their nighttime challenges. Wearing cute animal headbands, they turned the park into a giant playground, competing on three major attractions:<ul style='margin-top:10px; margin-left:20px; line-height:1.6;'><li><strong>The Pirate Ship (Viking):</strong> The location of the first challenge, showcasing how some members handled their fear of heights.</li><li><strong>The Flume Ride:</strong> The classic water attraction where the group had to keep a bubblegum bubble intact during the final drop.</li><li><strong>French Revolution:</strong> The famous indoor roller coaster, setting the stage for a high-speed memorization challenge.</li></ul>",
        tip: "The animal headbands worn by the BTS members aren't just for the show; it's a real tradition in South Korean amusement parks. You will see visitors of all ages wearing them. Souvenir shops are scattered everywhere, allowing you to easily pick out your own before hitting the rides.",
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
        videoEmbeds: [],
        gallery: ["images/Ahwon1.jpg"],
        fullDescription: "A gorgeous Hanok (traditional Korean house) turned into a modern art museum and boutique hotel. BTS shot the breathtaking photos for their 2019 Summer Package here, surrounded by mountains.",
        tip: "",
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
        videoEmbeds: [],
        gallery: ["images/Kitsune1.jpg"],
        fullDescription: "A chic French-Japanese aesthetic cafe located in the trendy Garosu-gil area. Jennie was spotted here enjoying a drink and taking pictures by the famous bamboo entrance.",
        tip: "",
        directions: "Take Line 3 (Orange) to Sinsa Station. Exit 8 and walk about 8 minutes."
    },
    {
        id: 6,
        name: "Pozzetto",
        group: "BTS",
        member: "Jimin", 
        country: "France",
        city: "Paris",
        category: "Cafe",
        year: "2019",
        episode: "",
        episodeLink: "",
        context: "Jimin was spotted enjoying artisanal gelato here.",
        address: "39 Rue du Roi de Sicile, 75004 Paris",
        lat: 48.8569,
        lng: 2.3572,
        img: "images/Pozzetto1.jpg", 
        videoEmbeds: [],
        gallery: ["images/Pozzetto1.jpg"],
        fullDescription: "During BTS's time in Paris in 2019, Jimin visited Pozzetto, a highly rated artisanal Italian gelato and espresso shop located in the historic Marais district.",
        tip: "",
        directions: "Take Metro Line 1 or 11 to Hôtel de Ville, then walk about 5 minutes into the Le Marais neighborhood."
    },
    {
        id: 7,
        name: "Musée Nissim de Camondo",
        group: "BTS",
        member: "Jimin",
        country: "France",
        city: "Paris",
        category: "Fashion",
        year: "2023",
        episode: "",
        episodeLink: "",
        context: "Jimin posed here for his stunning Dior Men Spring 2024 campaign.",
        address: "63 Rue de Monceau, 75008 Paris",
        lat: 48.8795,
        lng: 2.3117,
        img: "images/Nissim1.jpg",
        videoEmbeds: [],
        gallery: ["images/Nissim1.jpg"],
        fullDescription: "This elegant museum, a fully preserved 20th-century aristocratic mansion, served as the breathtaking backdrop for Jimin's Dior Men Spring 2024 global campaign. Its opulent interiors perfectly matched his sophisticated look.",
        tip: "",
        directions: "Take Metro Line 2 to Villiers or Monceau station. The museum is a short walk from Parc Monceau."
    },
    {
        id: 8,
        name: "Montmartre Stairs",
        group: "BTS",
        member: "Jimin",
        country: "France",
        city: "Paris",
        category: "Landmarks",
        year: "2019",
        episode: "",
        episodeLink: "",
        context: "Jimin took iconic photos on these famous steps during his trip.",
        address: "Rue Foyatier, 75018 Paris",
        lat: 48.8856,
        lng: 2.3432,
        img: "images/MontmartreStairs1.jpg",
        videoEmbeds: [],
        gallery: ["images/MontmartreStairs1.jpg"],
        fullDescription: "During his free time in Paris, Jimin wandered around the historic Montmartre neighborhood. He shared photos posing gracefully on these steep, picturesque stairs leading up to the Sacré-Cœur basilica, capturing the authentic Parisian vibe.",
        tip: "",
        directions: "Take Metro Line 2 to Anvers. Walk up the hill towards the Sacré-Cœur; the famous stairs run right alongside the funicular."
    },
    {
        id: 9,
        name: "Wall of Love",
        group: "BTS",
        member: "Jimin",
        country: "France",
        city: "Paris",
        category: "Landmarks",
        year: "2019",
        episode: "",
        episodeLink: "",
        context: "Jimin was spotted exploring this famous romantic art installation.",
        address: "Square Jehan Rictus, Place des Abbesses, 75018 Paris",
        lat: 48.8848,
        lng: 2.3386,
        img: "images/WallOfLove1.jpg",
        videoEmbeds: [],
        gallery: ["images/WallOfLove1.jpg"],
        fullDescription: "Located in the heart of Montmartre, this beautiful art installation features the phrase 'I love you' in 250 languages. Jimin visited this romantic spot during his personal vacation in Paris.",
        tip: "",
        directions: "Take Metro Line 12 and get off at Abbesses station. The wall is located in the small park right outside the metro exit."
    },
    {
        id: 10,
        name: "Palais de Tokyo",
        group: "BTS",
        member: "Jimin",
        country: "France",
        city: "Paris",
        category: "Museums",
        year: "2023",
        episode: "",
        episodeLink: "",
        context: "Jimin attended a prestigious Dior fashion event here.",
        address: "13 Avenue du Président Wilson, 75116 Paris",
        lat: 48.8643,
        lng: 2.2965,
        img: "images/PalaisTokyo1.jpg",
        videoEmbeds: [],
        gallery: ["images/PalaisTokyo1.jpg"],
        fullDescription: "This contemporary art museum frequently hosts major Paris Fashion Week events. Jimin, as a global ambassador for Dior, made a highly anticipated appearance here, drawing thousands of fans to the museum's striking brutalist exterior.",
        tip: "",
        directions: "Take Metro Line 9 to Iéna or Alma-Marceau station. The museum is directly facing the Eiffel Tower across the river."
    }
];

// DOM Elements
const groupSelect = document.getElementById('group-select');
const memberSelect = document.getElementById('member-select');
const yearSelect = document.getElementById('year-select');
const countrySelect = document.getElementById('country-select');
const searchInput = document.getElementById('search-input');
const categoryButtonsContainer = document.getElementById('category-buttons');

// Initialization function for dynamic filters
function initializeFilters() {
    const selectedGroup = groupSelect.value;
    memberSelect.innerHTML = '<option value="All">All Members</option>';
    countrySelect.innerHTML = '<option value="All">All Areas</option>';
    categoryButtonsContainer.innerHTML = '<button class="filter-btn active" data-cat="All">All Categories</button>';
    activeCategory = "All";
    
    const uniqueCountries = [...new Set(celebLocations.map(loc => loc.country))].sort();
    uniqueCountries.forEach(country => {
        countrySelect.innerHTML += `<option value="${country}">${country}</option>`;
    });

    if (selectedGroup !== "All" && filterData[selectedGroup]) {
        filterData[selectedGroup].members.forEach(member => {
            memberSelect.innerHTML += `<option value="${member}">${member}</option>`;
        });
        
        filterData[selectedGroup].categories.forEach(cat => {
            categoryButtonsContainer.innerHTML += `<button class="filter-btn" data-cat="${cat}">${cat}</button>`;
        });
    }

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
countrySelect.addEventListener('change', renderLocations);
searchInput.addEventListener('input', renderLocations);

// Main Render Function
function renderLocations() {
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    locationListElement.innerHTML = '';

    const fGroup = groupSelect.value;
    const fMember = memberSelect.value;
    const fYear = yearSelect.value;
    const fCountry = countrySelect.value;
    const searchTerm = searchInput.value.toLowerCase();

    const filteredLocations = celebLocations.filter(loc => {
        const matchGroup = (fGroup === "All" || loc.group === fGroup);
        const matchMember = (fMember === "All" || loc.member === fMember || loc.member === "All");
        const matchCategory = (activeCategory === "All" || loc.category === activeCategory);
        const matchYear = (fYear === "All" || loc.year === fYear);
        const matchCountry = (fCountry === "All" || loc.country === fCountry);
        
        const matchSearch = loc.name.toLowerCase().includes(searchTerm) || 
                            loc.city.toLowerCase().includes(searchTerm) || 
                            loc.context.toLowerCase().includes(searchTerm);
                            
        return matchGroup && matchMember && matchCategory && matchYear && matchCountry && matchSearch;
    });

    // Update Stats on UI
    document.getElementById('location-count-sidebar').textContent = filteredLocations.length;
    document.getElementById('stat-locations').textContent = filteredLocations.length;
    const uniqueCountriesCount = new Set(filteredLocations.map(l => l.country)).size;
    document.getElementById('stat-countries').textContent = uniqueCountriesCount;

    const mapMarkers = [];

    filteredLocations.forEach(loc => {
        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        
        const customIcon = L.divIcon({ 
            className: 'custom-category-marker', 
            html: `<div>${catIconSvg}</div>`, 
            iconSize: [32, 32], 
            iconAnchor: [16, 16], 
            popupAnchor: [0, -16] 
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markerGroup);
        mapMarkers.push(marker);

        let metaHtml = `<strong>Year:</strong> ${loc.year}`;
        if(loc.episode) { metaHtml += ` <br><strong>Ep:</strong> ${loc.episode}`; }

        const popupContent = `
            <div class="popup-title" onclick="window.openModal(${loc.id}); event.stopPropagation();">${loc.name} ↗️</div>
            <span class="popup-tag">${catIconSvg} ${loc.category}</span>
            <img src="${loc.img}" alt="${loc.name}" class="popup-img" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <div class="popup-context">"${loc.context}"</div>
            <div class="popup-meta">${metaHtml}</div>
            <button type="button" onclick="window.openModal(${loc.id}); event.stopPropagation();" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
                More details
            </button>
        `;
        marker.bindPopup(popupContent);

        const card = document.createElement('div');
        card.className = 'location-card';
        
        let countryCode = loc.country;
        if (loc.country === "South Korea") countryCode = "KR";
        if (loc.country === "France") countryCode = "FR";

        card.innerHTML = `
            <div class="card-icon-box">
                ${catIconSvg}
            </div>
            <div class="card-content">
                <div class="card-meta-top">${loc.category} • ${loc.city}, ${countryCode}</div>
                <div class="card-title">${loc.name}</div>
                <div class="card-address">${mapPinSvg} ${loc.city}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#F5D0DF');
            card.style.borderColor = '#D94680';
            map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1500);
        });

        locationListElement.appendChild(card);
    });

    if (mapMarkers.length > 0) {
        const group = new L.featureGroup(mapMarkers);
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
    }
}

// Initial Load
initializeFilters();
renderLocations();

// Modal Functions
window.openModal = function(id) {
    try {
        const loc = celebLocations.find(l => l.id === id);
        if(!loc) return;

        document.getElementById('modal-title').textContent = loc.name;
        // On utilise direct l'HTML défini dans la base de données
        document.getElementById('modal-desc').innerHTML = loc.fullDescription; 
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

        document.getElementById('modal-address').textContent = `${loc.address}, ${loc.city}`;
        document.getElementById('modal-map-link').href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

        // THE TIP
        const tipSection = document.getElementById('modal-tip-section');
        const tipText = document.getElementById('modal-tip');
        if (loc.tip) {
            tipText.textContent = loc.tip;
            tipSection.classList.remove('hidden');
        } else {
            tipSection.classList.add('hidden');
        }

        // GALLERY (Avant les vidéos)
        const gallerySection = document.getElementById('modal-gallery-section');
        const galleryContainer = document.getElementById('modal-gallery');
        if (galleryContainer) {
            galleryContainer.innerHTML = ""; 
            if(loc.gallery && loc.gallery.length > 0) {
                galleryContainer.style.display = 'flex';
                loc.gallery.forEach(imagePath => {
                    const img = document.createElement('img');
                    img.src = imagePath;
                    img.onerror = function() { this.src = 'https://via.placeholder.com/300x250?text=Pending+Image'; };
                    galleryContainer.appendChild(img);
                });
                gallerySection.classList.remove('hidden');
            } else {
                galleryContainer.style.display = 'none';
                gallerySection.classList.add('hidden');
            }
        }

        // VIDEOS
        const videoSection = document.getElementById('modal-video-section');
        const videoContainer = document.getElementById('modal-video-container');
        if (videoContainer) {
            videoContainer.innerHTML = ""; 
            if (loc.videoEmbeds && loc.videoEmbeds.length > 0) {
                loc.videoEmbeds.forEach(vidSrc => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'video-wrapper';
                    wrapper.innerHTML = `<iframe src="${vidSrc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                    videoContainer.appendChild(wrapper);
                });
                videoContainer.style.display = 'flex'; 
                videoSection.classList.remove('hidden');
            } else {
                videoContainer.style.display = 'none'; 
                videoSection.classList.add('hidden');
            }
        }

        document.getElementById('details-modal').classList.remove('hidden');
    } catch (error) {
        console.error("Error opening modal:", error);
    }
};

window.closeModal = function() { 
    document.getElementById('details-modal').classList.add('hidden'); 
    
    // Stop YouTube videos playing when closing the modal
    const videoContainer = document.getElementById('modal-video-container');
    if(videoContainer) videoContainer.innerHTML = ""; 
};

window.onclick = function(event) { 
    if (event.target === document.getElementById('details-modal')) window.closeModal(); 
};
