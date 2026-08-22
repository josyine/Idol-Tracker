// ==========================================
// 1. INITIALISATION DE LA CARTE
// ==========================================
let map = null;
let markerGroup = null;

if (document.getElementById('map') && typeof L !== 'undefined') {
    map = L.map('map', { zoomControl: false }).setView([37.541, 127.025], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap contributors', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    markerGroup = L.layerGroup().addTo(map);
    
    // Assurer que la carte se redimensionne bien quand le navigateur est en plein écran
    setTimeout(() => { map.invalidateSize(); }, 200);
}

window.toggleMobileMenu = function() {
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) sidebar.classList.toggle('open');
};

// ==========================================
// 2. DONNÉES (ICONES, COULEURS & LIEUX)
// ==========================================
const iconsSVG = {
    "Run BTS": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5h18"/><path d="M4 8.5 5.5 4h3L7 8.5"/><path d="M9.3 8.5 10.8 4h3l-1.5 4.5"/><path d="M14.7 8.5 16.2 4h3l-1.5 4.5"/><rect x="3" y="8.5" width="18" height="11.5" rx="1.5"/></svg>`,
    "Restaurants": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    "Cafe": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
    "Default": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
};

const groupColors = {
    "BTS": "#8b5cf6", "Blackpink": "#ec4899", "Twice": "#f43f5e", "Seventeen": "#3b82f6", "Katseye": "#10b981", "TXT": "#f59e0b"        
};

const filterData = {
    "BTS": { members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"], categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks"] },
    "Blackpink": { members: ["Jisoo", "Jennie", "Rosé", "Lisa"], categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"] },
    "General": { categories: ["Cafe", "Concerts", "Fashion", "Landmarks", "Museums", "Restaurants", "Pop-up Store"] }
};

let celebLocations = [
    {
        id: 1, name: "Cafe Camptong", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2020",
        episode: "Episodes 118 & 119", episodeLink: "https://weverse.io/bts/media/3-104694116",
        context: { en: "The boys played an energetic game searching for hidden sticky notes in this massive cafe.", fr: "Le groupe a joué à un jeu plein d'énergie en cherchant des post-it cachés dans cet immense café." },
        address: "27 Apgujeong-ro 42-gil, Gangnam-gu", lat: 37.5255, lng: 127.0375, img: "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg", 
        videoEmbeds: ["https://www.youtube.com/embed/yiqe-aegVk0", "https://www.youtube.com/embed/wlHS-fpJrm0"], gallery: ["images/Camptong1.jpg", "images/Camptong2.jpg"],
        fullDescription: { en: "Located in the trendy Apgujeong neighborhood, Cafe Camptong was a massive, multi-level establishment.", fr: "Situé dans le quartier branché d'Apgujeong, le Cafe Camptong était un immense établissement sur plusieurs niveaux." },
        directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 5). Walk for about 10 minutes.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo (Sortie 5)." }
    },
    {
        id: 2, name: "Ossu Seiromushi", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018",
        context: { en: "A premium Japanese steamed cuisine restaurant famously co-owned by Jin.", fr: "Un restaurant japonais haut de gamme co-détenu par Jin." },
        address: "30 Baekjegobun-ro 45-gil, Songpa-gu", lat: 37.5105, lng: 127.1085, img: "images/Otsu1.jpg",
        fullDescription: { en: "Opened in 2018, Ossu Seiromushi is a popular dining establishment near Seokchon Lake.", fr: "Ouvert en 2018, Ossu Seiromushi est un restaurant populaire près du lac Seokchon." },
        directions: { en: "Take Line 8 or Line 9 to Songpanaru Station (Exit 1).", fr: "Prenez la ligne 8 ou 9 jusqu'à la station Songpanaru (Sortie 1)." }
    },
    {
        id: 3, name: "Lotte World Adventure", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2018", episode: "Episode 51",
        context: { en: "The members went on the pirate ship.", fr: "Les membres sont montés sur le bateau pirate." },
        address: "240 Olympic-ro, Songpa-gu", lat: 37.5113, lng: 127.0980, img: "https://img.youtube.com/vi/d--MDCCJ3jg/hqdefault.jpg",
        fullDescription: { en: "Opened in 1989 in the Jamsil neighborhood, Lotte World is a must-visit entertainment complex.", fr: "Ouvert en 1989, Lotte World est un complexe incontournable." },
        directions: { en: "Take Line 2 or Line 8 directly to Jamsil Station.", fr: "Prenez la ligne 2 ou 8 directement jusqu'à la station Jamsil." }
    },
    {
        id: 17, name: "Museu de Marinha", group: "BTS", member: "All", country: "Portugal", city: "Lisbon", category: "Default", year: "2026",
        context: { en: "The historic naval museum serving as the grandiose backdrop.", fr: "Le musée naval historique servant de décor." },
        address: "Praça do Império, 1400-206 Lisboa", lat: 38.6976, lng: -9.2082, img: "https://img.youtube.com/vi/b4iVv91Z6lY/hqdefault.jpg",
        fullDescription: { en: "Housed in the Jerónimos Monastery, the Navy Museum displays over 17,000 historical items.", fr: "Situé dans le monastère des Hiéronymites." },
        directions: { en: "Take Tram 15E or Bus 728 from Praça do Comércio.", fr: "Prenez le tram 15E ou le bus 728." }
    }
];

// ==========================================
// 3. LOGIQUE UI ET LANGUES
// ==========================================
let currentLang = localStorage.getItem('lang') || 'en';
const translations = {
    en: { btnGenerateIti: "Auto-Itinerary Generator", filterGroup: "GROUP", filterMember: "MEMBER", filterArea: "AREA", filterYear: "YEAR", filterCategories: "CATEGORIES", locationsCount: "LOCATIONS" },
    fr: { btnGenerateIti: "Générateur Itinéraire", filterGroup: "GROUPE", filterMember: "MEMBRE", filterArea: "RÉGION", filterYear: "ANNÉE", filterCategories: "CATÉGORIES", locationsCount: "LIEUX" }
};
function t(key) { return translations[currentLang] ? (translations[currentLang][key] || key) : key; }
function getLocText(field) { return field ? (field[currentLang] || field.en || "") : ""; }

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(translations[currentLang] && translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
    initializeFilters();
    renderLocations();
}

document.addEventListener('DOMContentLoaded', () => {
    ['lang-btn', 'profile-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', (e) => {
            const menuId = id.replace('-btn', '-menu');
            document.querySelectorAll('.dropdown-menu').forEach(m => { if(m.id !== menuId) m.classList.add('hidden'); });
            document.getElementById(menuId).classList.toggle('hidden');
            e.stopPropagation();
        });
    });
    document.addEventListener('click', () => { 
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden')); 
    });
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', function() { currentLang = this.getAttribute('data-lang'); localStorage.setItem('lang', currentLang); updateUI(); });
    });
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        const savedName = localStorage.getItem('userName') || 'U';
        profileBtn.textContent = savedName.charAt(0).toUpperCase();
    }
});

// ==========================================
// 4. FILTRES
// ==========================================
const groupSelect = document.getElementById('group-select');
const memberSelect = document.getElementById('member-select');
const yearSelect = document.getElementById('year-select');
const countrySelect = document.getElementById('country-select');
const searchInput = document.getElementById('search-input');
const categoryButtonsContainer = document.getElementById('category-buttons');
let activeCategory = "All"; 

function initializeFilters() {
    if(!groupSelect) return;
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
    if(unlockedGroups.length === 0) availableLocs = celebLocations; // Mode demo

    const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
    if(groupSelect.options.length === 0) {
        groupSelect.innerHTML = `<option value="All">All Groups</option>`;
        availableGroups.forEach(g => groupSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }

    const selectedGroup = groupSelect.value;
    memberSelect.innerHTML = `<option value="All">All Members</option>`;
    countrySelect.innerHTML = `<option value="All">All Areas</option>`;
    categoryButtonsContainer.innerHTML = `<div class="cat-card active" data-cat="All">All Categories</div>`;
    activeCategory = "All";
    
    const filteredByGroup = selectedGroup === "All" ? availableLocs : availableLocs.filter(l => l.group === selectedGroup);
    [...new Set(filteredByGroup.map(loc => loc.country))].sort().forEach(c => countrySelect.innerHTML += `<option value="${c}">${c}</option>`);

    let catsToShow = (selectedGroup !== "All" && filterData[selectedGroup]) ? filterData[selectedGroup].categories : filterData["General"].categories;
    if(selectedGroup !== "All" && filterData[selectedGroup]) filterData[selectedGroup].members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    
    catsToShow.forEach(cat => categoryButtonsContainer.innerHTML += `<div class="cat-card" data-cat="${cat}">${cat}</div>`);

    document.querySelectorAll('.cat-card').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.cat-card').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.getAttribute('data-cat');
            renderLocations();
        });
    });
}

if(groupSelect) {
    [groupSelect, memberSelect, yearSelect, countrySelect].forEach(el => el.addEventListener('change', () => { if(el===groupSelect) initializeFilters(); renderLocations(); }));
    searchInput.addEventListener('input', renderLocations);
}

// ==========================================
// 5. AFFICHAGE DES LIEUX (LISTE + CARTE)
// ==========================================
function renderLocations() {
    if(!groupSelect || !map) return; 
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    locationListElement.innerHTML = '';

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

    const fGroup = groupSelect.value, fMember = memberSelect.value, fYear = yearSelect.value, fCountry = countrySelect.value, searchTerm = searchInput.value.toLowerCase();

    const filteredLocations = availableLocs.filter(loc => {
        return (fGroup === "All" || loc.group === fGroup) && (fMember === "All" || loc.member === fMember || loc.member === "All") && 
               (activeCategory === "All" || loc.category === activeCategory) && (fYear === "All" || loc.year === fYear) &&
               (fCountry === "All" || loc.country === fCountry) && (loc.name.toLowerCase().includes(searchTerm) || (loc.city && loc.city.toLowerCase().includes(searchTerm)));
    });

    const cSidebar = document.getElementById('location-count-sidebar');
    if(cSidebar) cSidebar.textContent = filteredLocations.length;
    
    const sLocations = document.getElementById('stat-locations');
    if(sLocations) sLocations.textContent = filteredLocations.length;
    
    const sCountries = document.getElementById('stat-countries');
    if(sCountries) sCountries.textContent = new Set(filteredLocations.map(l => l.country)).size;

    const mapMarkers = [];
    let visitedData = JSON.parse(localStorage.getItem('visitedLocs') || '[]');

    filteredLocations.forEach(loc => {
        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        const isVisited = visitedData.some(v => v.id === loc.id || v === loc.id);
        const baseColor = groupColors[loc.group] || '#334e68';
        
        let inlineStyle = `border-color: ${baseColor}; --marker-color: ${baseColor};`;
        inlineStyle += isVisited ? ` background-color: ${baseColor}; color: white;` : ` background-color: white; color: ${baseColor};`;
        
        const customIcon = L.divIcon({ className: 'custom-category-marker', html: `<div style="${inlineStyle}">${catIconSvg}</div>`, iconSize: [32,32], iconAnchor: [16,16] });
        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markerGroup);
        mapMarkers.push(marker);

        marker.on('click', () => window.openDetailsPanel(loc.id));

        const cardBgColor = isVisited ? `${baseColor}15` : '#faf9fc';
        const card = document.createElement('div');
        card.className = 'loc-item';
        card.style.background = cardBgColor;
        card.innerHTML = `
            <div class="loc-icon-box" style="color:${baseColor}; background:${baseColor}1A;">${catIconSvg}</div>
            <div class="loc-info">
                <div class="loc-cat">${loc.category} &middot; ${loc.city || ''}</div>
                <div class="loc-name">${loc.name}</div>
            </div>
        `;
        card.addEventListener('click', () => { map.flyTo([loc.lat, loc.lng], 16); window.openDetailsPanel(loc.id); });
        locationListElement.appendChild(card);
    });

    if (mapMarkers.length > 0) map.fitBounds(new L.featureGroup(mapMarkers).getBounds(), { padding: [50, 50], maxZoom: 16 });
}

if(groupSelect) { initializeFilters(); renderLocations(); }

// ==========================================
// 6. PANNEAU DE DÉTAILS
// ==========================================
window.openDetailsPanel = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;
    
    const dTitle = document.getElementById('details-title');
    if(dTitle) dTitle.textContent = loc.name;
    
    const dDesc = document.getElementById('details-desc');
    if(dDesc) dDesc.innerHTML = getLocText(loc.fullDescription); 
    
    const dDir = document.getElementById('details-directions');
    if(dDir) dDir.textContent = getLocText(loc.directions);
    
    const dGroup = document.getElementById('details-group');
    if(dGroup) dGroup.textContent = loc.group;
    
    const dMember = document.getElementById('details-member');
    if(dMember) dMember.textContent = loc.member === "All" ? "All" : loc.member;
    
    const dCountry = document.getElementById('details-country');
    if(dCountry) dCountry.textContent = loc.country;
    
    const dCity = document.getElementById('details-city');
    if(dCity) dCity.textContent = loc.city;
    
    const dAddr = document.getElementById('details-full-address');
    if(dAddr) dAddr.textContent = loc.address;
    
    const dDate = document.getElementById('details-date');
    if(dDate) dDate.textContent = loc.year;

    const dEpi = document.getElementById('details-episode');
    const dEpiCont = document.getElementById('details-episode-container');
    if (dEpi && dEpiCont) { if(loc.episode) { dEpi.textContent = loc.episode; dEpiCont.style.display = 'block'; } else { dEpiCont.style.display = 'none'; } }
    
    const dLink = document.getElementById('details-episode-link');
    const dLinkCont = document.getElementById('details-link-container');
    if (dLink && dLinkCont) { if(loc.episodeLink) { dLink.href = loc.episodeLink; dLinkCont.style.display = 'block'; } else { dLinkCont.style.display = 'none'; } }
    
    const mapLink = document.getElementById('details-map-link');
    if(mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    const galleryContainer = document.getElementById('details-gallery');
    const gallerySection = document.getElementById('details-gallery-section');
    if (galleryContainer && gallerySection) {
        galleryContainer.innerHTML = ""; 
        if(loc.gallery && loc.gallery.length > 0) {
            loc.gallery.forEach(p => { galleryContainer.innerHTML += `<img src="${p}" onerror="this.src='https://via.placeholder.com/300x250'">`; });
            gallerySection.classList.remove('hidden');
        } else { gallerySection.classList.add('hidden'); }
    }

    const vCheck = document.getElementById('details-visited');
    if(vCheck) {
        let vList = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        vCheck.checked = vList.some(v => v.id === loc.id || v === loc.id);
        vCheck.onchange = function() {
            let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
            if(this.checked) list.push({id: loc.id, date: new Date().toLocaleDateString()});
            else list = list.filter(v => v.id !== loc.id && v !== loc.id);
            localStorage.setItem('visitedLocs', JSON.stringify(list));
            renderLocations(); 
        };
    }

    const wCheck = document.getElementById('details-wishlist');
    if(wCheck) {
        let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
        wCheck.checked = wList.some(w => w.id === loc.id || w === loc.id);
        wCheck.onchange = function() {
            let list = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
            if(this.checked) list.push({id: loc.id, date: new Date().toLocaleDateString()});
            else list = list.filter(w => w.id !== loc.id && w !== loc.id);
            localStorage.setItem('wishlistLocs', JSON.stringify(list));
            renderLocations();
        };
    }

    document.getElementById('sidebar-main').classList.add('hidden');
    document.getElementById('sidebar-details').classList.remove('hidden');
    
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) { sidebar.classList.add('open'); sidebar.classList.add('expanded'); }
    
    // Forcer le redimensionnement de la carte après expansion de la barre
    setTimeout(() => { if(map) map.invalidateSize(); }, 450);
};

window.closeDetailsPanel = function() {
    const dDetails = document.getElementById('sidebar-details');
    if(dDetails) dDetails.classList.add('hidden');
    const dMain = document.getElementById('sidebar-main');
    if(dMain) dMain.classList.remove('hidden');
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) sidebar.classList.remove('expanded'); 
    
    setTimeout(() => { if(map) map.invalidateSize(); }, 450);
}

// ==========================================
// 7. ITINERARY & CART MODALS
// ==========================================
let itiLeafletMap = null;
let itiLayerGroup = null;

const btnOpenIti = document.getElementById('open-itinerary-btn');
if(btnOpenIti) {
    btnOpenIti.addEventListener('click', () => {
        const itiGroup = document.getElementById('iti-group');
        const itiCountry = document.getElementById('iti-country');
        if(!itiGroup || !itiCountry) return;

        const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
        let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
        if(unlockedGroups.length === 0) availableLocs = celebLocations;
        
        itiGroup.innerHTML = ''; [...new Set(availableLocs.map(l => l.group))].sort().forEach(g => itiGroup.innerHTML += `<option value="${g}">${g}</option>`);
        itiCountry.innerHTML = ''; [...new Set(availableLocs.map(l => l.country))].sort().forEach(c => itiCountry.innerHTML += `<option value="${c}">${c}</option>`);
        
        document.getElementById('iti-result').classList.add('hidden');
        document.getElementById('iti-form').classList.remove('hidden');
        document.getElementById('itinerary-modal').classList.remove('hidden');
    });
}

window.generateItinerary = function() {
    const group = document.getElementById('iti-group').value;
    const country = document.getElementById('iti-country').value;
    const days = parseInt(document.getElementById('iti-days').value);
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

    let validLocs = availableLocs.filter(l => l.group === group && l.country === country);
    if(validLocs.length === 0) { alert('No locations found.'); return; }

    let route = [validLocs.shift()]; 
    while(validLocs.length > 0) {
        let lastLoc = route[route.length - 1], nearestIdx = 0, minDist = Infinity;
        for(let i=0; i<validLocs.length; i++) {
            let d = Math.hypot(lastLoc.lat - validLocs[i].lat, lastLoc.lng - validLocs[i].lng);
            if(d < minDist) { minDist = d; nearestIdx = i; }
        }
        route.push(validLocs.splice(nearestIdx, 1)[0]);
    }
    validLocs = route;

    const resultDiv = document.getElementById('iti-days-list');
    resultDiv.innerHTML = "";
    const locsPerDay = Math.ceil(validLocs.length / days);
    let coordsForMap = [];
    
    for(let i = 0; i < days; i++) {
        const dayLocs = validLocs.slice(i * locsPerDay, (i + 1) * locsPerDay);
        if(dayLocs.length === 0) continue;
        
        let mapLink = "";
        if(dayLocs.length === 1) {
            mapLink = `https://www.google.com/maps/search/?api=1&query=${dayLocs[0].lat},${dayLocs[0].lng}`;
            coordsForMap.push([dayLocs[0].lat, dayLocs[0].lng]);
        } else {
            let waypoints = dayLocs.map(l => `${l.lat},${l.lng}`).join('|');
            mapLink = `https://www.google.com/maps/dir/?api=1&origin=${dayLocs[0].lat},${dayLocs[0].lng}&destination=${dayLocs[dayLocs.length-1].lat},${dayLocs[dayLocs.length-1].lng}&waypoints=${waypoints}&travelmode=driving`;
            dayLocs.forEach(l => coordsForMap.push([l.lat, l.lng]));
        }
        
        let html = `<div class="iti-day-card"><div class="iti-day-title">Day ${i + 1}</div>`;
        dayLocs.forEach((l, idx) => html += `<div class="iti-loc" style="font-size:12px; margin-bottom:5px;"><strong>${idx+1}. ${l.name}</strong></div>`);
        html += `<a href="${mapLink}" target="_blank" style="display:inline-block; padding:8px 12px; margin-top:10px; font-size:11.5px; color:#34414C; border:1px solid #cbd5e1; border-radius:6px; background:white;">Open in Google Maps</a></div>`;
        resultDiv.innerHTML += html;
    }
    
    document.getElementById('iti-result').classList.remove('hidden');

    const modalContent = document.querySelector('#itinerary-modal .modal-content');
    if(modalContent) modalContent.scrollTo({ top: modalContent.scrollHeight, behavior: 'smooth' });

    setTimeout(() => {
        if(!itiLeafletMap) {
            itiLeafletMap = L.map('iti-map-container', { zoomControl: false }).setView([0,0], 2);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(itiLeafletMap);
            itiLayerGroup = L.featureGroup().addTo(itiLeafletMap);
        } else {
            itiLayerGroup.clearLayers();
        }

        coordsForMap.forEach((c, idx) => {
            L.circleMarker(c, { color: '#D42759', radius: 6, fillOpacity: 1 }).addTo(itiLayerGroup)
             .bindTooltip((idx+1).toString(), {permanent: true, direction: 'center', className: 'iti-map-label'});
        });
        L.polyline(coordsForMap, { color: '#D42759', weight: 3, dashArray: '5, 5' }).addTo(itiLayerGroup);

        itiLeafletMap.invalidateSize();
        if(coordsForMap.length > 0) itiLeafletMap.fitBounds(itiLayerGroup.getBounds(), { padding: [20, 20], maxZoom: 15 });
    }, 250);
}

window.exportItineraryPDF = function() {
    const el = document.getElementById('iti-result');
    const btn = document.getElementById('export-pdf-btn');
    if(!el || !btn) return;
    btn.style.display = 'none';
    html2pdf().set({ margin: 10, filename: 'ScreenToStreet_Guide.pdf', jsPDF: { format: 'a4' } }).from(el).save().then(() => btn.style.display = 'block');
};

window.openCartModal = function() {
    const modal = document.getElementById('cart-modal');
    if(!modal) return;
    modal.classList.remove('hidden');
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    document.querySelectorAll('.cart-checkbox').forEach(cb => {
        cb.checked = false; 
        const span = cb.nextElementSibling;
        if(unlockedGroups.includes(cb.value)) { cb.disabled = true; span.style.background = "#f1f5f9"; span.style.color = "#94a3b8"; span.textContent = `${cb.value} (Purchased)`; }
        else { cb.disabled = false; span.style.background = "white"; span.style.color = "#64748b"; span.textContent = cb.value; }
    });
    updateCartPrice();
}

function updateCartPrice() {
    const selected = document.querySelectorAll('.cart-checkbox:not(:disabled):checked').length;
    const priceDisplay = document.getElementById('cart-price');
    if(priceDisplay) priceDisplay.textContent = `${(selected * 14.99).toFixed(2)} €`;
    const btn = document.getElementById('cart-pay-btn');
    if(btn) {
        if (selected > 0) { btn.disabled = false; btn.textContent = `Pay ${(selected * 14.99).toFixed(2)} €`; } 
        else { btn.disabled = true; btn.textContent = `Select a group`; }
    }
}

document.querySelectorAll('.cart-checkbox').forEach(cb => {
    cb.addEventListener('change', function() {
        this.nextElementSibling.style.borderColor = this.checked ? "#D42759" : "#cbd5e1";
        this.nextElementSibling.style.color = this.checked ? "#D42759" : "#64748b";
        this.nextElementSibling.style.background = this.checked ? "#FCE7F0" : "white";
        updateCartPrice();
    });
});

const cartForm = document.getElementById('cart-form');
if(cartForm) {
    cartForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let existingGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
        document.querySelectorAll('.cart-checkbox:not(:disabled):checked').forEach(cb => { if(!existingGroups.includes(cb.value)) existingGroups.push(cb.value); });
        localStorage.setItem('unlockedGroups', JSON.stringify(existingGroups));
        setTimeout(() => window.location.reload(), 1000);
    });
}

window.closeModal = function(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden'); 
};
window.onclick = function(e) { 
    if (e.target.classList.contains('modal')) e.target.classList.add('hidden'); 
};

// ==========================================
// 8. REDIRECTION DEPUIS VISITED / WISHLIST
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const locId = urlParams.get('locId');
    if (locId && document.getElementById('map')) {
        setTimeout(() => {
            window.openDetailsPanel(parseInt(locId));
            const loc = celebLocations.find(l => l.id === parseInt(locId));
            if(loc && map) map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
        }, 800); 
    }
});
