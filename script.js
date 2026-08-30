// ==========================================
// 0. CONFIGURATION DU FOND DE CARTE (OpenStreetMap standard)
// ==========================================
// On utilise directement les tuiles publiques d'OpenStreetMap : entièrement gratuites,
// sans inscription et sans clé API — contrairement à CARTO, qui a changé sa politique
// en août 2026 et impose désormais une clé. OSM ne demandera jamais de clé.
// (Seule condition d'usage : garder l'attribution "OpenStreetMap contributors" visible,
// déjà incluse ci-dessous, et rester dans un usage raisonnable — largement le cas ici.)
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ==========================================
// 1. INITIALISATION ROBUSTE DE L'APPLICATION
// ==========================================
let map = null;
let markerGroup = null;
let currentFilteredLocations = []; 
let currentLocationIdForMemory = null; 
let currentGeneratedItinerary = [];
let currentLang = localStorage.getItem('lang') || 'en';

let currentTrip = null;
let draggedEl = null;
let dragType = null; 
let tripIdToDelete = null;
let locToRemoveData = null; 
let dayToRemoveBtn = null; 
let tripPageMap = null;
let tripPageLayer = null;
let tripMainLayerGroup = null;
let dayMiniMaps = []; // instances Leaflet des mini-cartes par jour (une par .day-card), à détruire avant chaque re-render puisque box.innerHTML='' supprime leur conteneur DOM sans les libérer
let itiSelectedCategories = []; // catégories cochées dans le multi-select de l'Auto-Itinerary Generator ; tableau vide = toutes les catégories

// ==========================================
// 0bis. SYNCHRONISATION CLOUD DE LA WISHLIST (Firestore)
// ==========================================
// Petite fonction centrale appelée juste après chaque écriture locale de la
// wishlist : si un compte est connecté (window.syncUserData vient de
// firebase-init.js), on répercute aussi le changement dans Firestore. Si
// firebase-init.js n'est pas chargé sur la page (ex: map-destinations.html) ou si
// personne n'est connecté, cette fonction ne fait rien de plus — la wishlist reste
// purement locale, exactement comme avant.
function syncWishlist(wList) {
    if (typeof window.syncUserData === 'function') {
        window.syncUserData({ wishlistLocs: wList });
    }
}

// Une entrée "visited" peut être soit l'ancien format ({id, date, rating, notes}),
// soit le nouveau format à plusieurs visites ({id, visits: [{date, rating, notes}, ...]}).
// Cette fonction met toujours à niveau vers le nouveau format, pour que le reste du
// code n'ait jamais à se soucier de la version des données.
function normalizeVisitEntry(entry) {
    if (typeof entry !== 'object' || entry === null) entry = { id: entry };
    if (Array.isArray(entry.visits)) return entry;
    if (entry.date || entry.rating || entry.notes) {
        return { id: entry.id, visits: [{ date: entry.date || '', rating: entry.rating || 0, notes: entry.notes || '' }] };
    }
    return { id: entry.id, visits: [] };
}
window.normalizeVisitEntry = normalizeVisitEntry;

function syncVisited(vList) {
    if (typeof window.syncUserData === 'function') {
        window.syncUserData({ visitedLocs: vList });
    }
}
window.syncVisited = syncVisited;

function syncTrips(trips) {
    if (typeof window.syncUserData === 'function') {
        window.syncUserData({ myTrips: trips });
    }
}
window.syncTrips = syncTrips;

// Au chargement de la page, une fois que Firebase a déterminé si quelqu'un est
// connecté (ou non) : si oui, on va chercher sa wishlist et ses pass réels dans
// Firestore pour remplacer les valeurs locales (qui pourraient être vides, ou celles
// d'un autre compte testé plus tôt sur ce même appareil). NOTE : le voile de
// connexion et la fenêtre "aucun pass débloqué" de map.html sont gérés entièrement
// par le script inline de map.html lui-même (voir ce fichier) — pas ici, pour éviter
// tout doublon ou conflit entre les deux.
window.addEventListener('firebase-ready', async (e) => {
    const user = e.detail && e.detail.user;
    if (!user) return; // visiteur non connecté : on garde les données locales telles quelles

    const cloudData = await window.loadUserCloudData();
    if (cloudData) {
        if (Array.isArray(cloudData.wishlistLocs)) {
            localStorage.setItem('wishlistLocs', JSON.stringify(cloudData.wishlistLocs));

            // Rafraîchit les affichages déjà construits qui dépendent de la wishlist.
            if (document.getElementById('map') && typeof renderLocations === 'function') renderLocations();
            if (document.getElementById('edit-trip-name') && typeof window.renderTrip === 'function' && currentTrip) window.renderTrip();
            if (typeof window.refreshWishlistFromCloud === 'function') window.refreshWishlistFromCloud();
        }
        if (Array.isArray(cloudData.visitedLocs)) {
            localStorage.setItem('visitedLocs', JSON.stringify(cloudData.visitedLocs));
            if (document.getElementById('map') && typeof renderLocations === 'function') renderLocations();
            if (typeof window.refreshVisitedFromCloud === 'function') window.refreshVisitedFromCloud();
        }
        if (Array.isArray(cloudData.myTrips)) {
            localStorage.setItem('myTrips', JSON.stringify(cloudData.myTrips));
            if (document.getElementById('edit-trip-name') && typeof window.initTrips === 'function') window.initTrips();
            if (typeof window.loadItineraryTabOptions === 'function' && document.getElementById('tab-itinerary-btn')) window.loadItineraryTabOptions();
        }
        if (Array.isArray(cloudData.unlockedGroups)) {
            localStorage.setItem('unlockedGroups', JSON.stringify(cloudData.unlockedGroups));
        }
        // `interestCountry` (le pays qu'on veut visiter) a remplacé `residenceCountry`
        // (le pays où l'on habite) — repli sur l'ancien champ pour les comptes créés
        // avant ce changement, qui n'ont que residenceCountry en base.
        const interestCountry = cloudData.interestCountry || cloudData.residenceCountry;
        if (interestCountry) {
            const prevCountry = localStorage.getItem('userCountry');
            localStorage.setItem('userCountry', interestCountry);
            // Recentre seulement si la carte est déjà affichée et que la valeur cloud
            // diffère de celle déjà utilisée pour le centrage initial (nouvel appareil,
            // ou pays changé depuis account.html).
            if (map && interestCountry !== prevCountry && typeof window.getMapCenterForCountry === 'function') {
                const c = window.getMapCenterForCountry(interestCountry);
                map.setView([c[0], c[1]], c[2]);
            }
        }
    }
});

// Bouton "Log out" de la fenêtre de précaution "aucun pass débloqué" (map.html).
document.addEventListener('DOMContentLoaded', () => {
    const gateLogoutLink = document.getElementById('gate-logout-link');
    if (gateLogoutLink) {
        gateLogoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            const finish = () => { localStorage.clear(); window.location.href = 'index.html'; };
            if (typeof window.firebaseSignOut === 'function') window.firebaseSignOut().then(finish).catch(finish);
            else finish();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userAvatarEls = document.querySelectorAll('.user-avatar-btn');
    if (userAvatarEls.length > 0) {
        const savedPhoto = localStorage.getItem('userPhoto');
        // Initiale de l'avatar : prénom en priorité (comme Google), sinon pseudo.
        const firstName = (localStorage.getItem('userFirstName') || '').trim();
        const userName = (localStorage.getItem('userName') || 'U').trim();
        const avatarInitial = (firstName || userName || 'U').charAt(0).toUpperCase();
        
        userAvatarEls.forEach(avatarEl => {
            if (savedPhoto && savedPhoto.trim() !== '') {
                avatarEl.innerHTML = `<img src="${savedPhoto}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;border:none;">`;
                avatarEl.style.color = 'transparent'; 
            } else {
                avatarEl.innerHTML = '';
                avatarEl.textContent = avatarInitial;
            }
        });
    }

    if (document.getElementById('map') && typeof L !== 'undefined' && !map) {
        // Centré par défaut sur le pays de résidence renseigné à l'inscription (lu en
        // local pour éviter tout clignotement le temps que Firebase confirme la session ;
        // voir le listener "firebase-ready" plus bas pour la mise à jour si le compte
        // cloud a une valeur différente/plus fraîche).
        const initialCenter = window.getMapCenterForCountry ? window.getMapCenterForCountry(localStorage.getItem('userCountry')) : [37.541, 127.025, 6];
        map = L.map('map', { zoomControl: false }).setView([initialCenter[0], initialCenter[1]], initialCenter[2]);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer(OSM_TILE_URL, { 
            attribution: OSM_ATTRIBUTION, subdomains: 'abc', maxZoom: 19 
        }).addTo(map);
        markerGroup = L.layerGroup().addTo(map);
        setTimeout(() => { map.invalidateSize(); }, 200);

        // Sur mobile, plusieurs choses peuvent faire que la taille réelle du conteneur
        // #map ne corresponde plus à ce que Leaflet a mesuré en dernier — la barre
        // d'adresse du navigateur qui apparaît/disparaît au scroll (Safari iOS en
        // particulier), le clavier virtuel, une police qui finit de charger après coup...
        // — sans que "resize" ou même "visualViewport.resize" ne se déclenchent de façon
        // fiable dans tous les cas. Plutôt que d'écouter des évènements qui peuvent
        // manquer certains de ces cas, un ResizeObserver posé directement sur le
        // conteneur de la carte réagit à TOUT changement de sa taille réellement rendue,
        // quelle qu'en soit la cause — c'est la source la plus fiable possible. On garde
        // en plus les écouteurs resize/orientationchange en repli pour les navigateurs
        // sans ResizeObserver (très rare aujourd'hui).
        const refreshMapSize = () => { if (map) map.invalidateSize(); };
        const mapContainerEl = document.querySelector('.map-container');
        if (typeof ResizeObserver !== 'undefined' && mapContainerEl) {
            new ResizeObserver(refreshMapSize).observe(mapContainerEl);
        } else {
            window.addEventListener('resize', refreshMapSize);
            if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshMapSize);
            window.addEventListener('orientationchange', () => setTimeout(refreshMapSize, 300));
        }

        map.on('zoomend', function() {
            const zoom = map.getZoom();
            let markerSize = 32; let iconSize = 16;
            // Avec des lieux répartis sur plusieurs continents, la carte doit parfois
            // dézoomer beaucoup pour tous les faire tenir : les marqueurs restent donc
            // visibles (avec une icône, même petite) au lieu de devenir de simples
            // anneaux à peine perceptibles.
            if (zoom < 4) { markerSize = 16; iconSize = 8; }
            else if (zoom < 6) { markerSize = 22; iconSize = 11; }
            else if (zoom < 9) { markerSize = 26; iconSize = 13; }
            else { markerSize = 32; iconSize = 16; }
            document.documentElement.style.setProperty('--marker-size', `${markerSize}px`);
            document.documentElement.style.setProperty('--icon-size', `${iconSize}px`);

            // Recalcule le regroupement des marqueurs proches pour le nouveau zoom (des
            // lieux fusionnés en un seul cluster peuvent redevenir individuels en
            // zoomant, et l'inverse en dézoomant) — sans reconstruire la liste latérale
            // ni relancer un fitBounds, seulement pour ce zoom-ci.
            if (typeof renderMapMarkers === 'function' && Array.isArray(currentFilteredLocations)) {
                renderMapMarkers(currentFilteredLocations, { fitBounds: false });
            }
        });
    }

    window.toggleMobileMenu = function() {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (!sidebar.classList.contains('open')) sidebar.classList.remove('expanded');
        }
    };

    ['lang-btn', 'profile-btn', 'cart-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', (e) => {
            if(id === 'cart-btn') return; 
            const menuId = id.replace('-btn', '-menu');
            document.querySelectorAll('.dropdown-menu').forEach(m => { if(m.id !== menuId) m.classList.add('hidden'); });
            const targetMenu = document.getElementById(menuId);
            if(targetMenu) targetMenu.classList.toggle('hidden');
            e.stopPropagation();
        });
    });

    // Clic sur "English" / "Français" dans le menu de langue (map.html / trips.html) :
    // ce gestionnaire manquait, ce qui faisait que la traduction ne se déclenchait jamais.
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const lang = opt.getAttribute('data-lang');
            if(lang) window.changeLang(lang);
            const menu = opt.closest('.dropdown-menu');
            if(menu) menu.classList.add('hidden');
        });
    });

    document.addEventListener('click', () => { 
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden')); 
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById('tab-' + btn.dataset.tab);
            if(target) target.classList.add('active');
        });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const finishLogout = () => {
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('userFirstName');
                localStorage.removeItem('unlockedGroups');
                localStorage.removeItem('wishlistLocs');
                localStorage.removeItem('visitedLocs');
                localStorage.removeItem('myTrips');
                localStorage.removeItem('activeTripId');
                window.location.href = 'index.html';
            };
            // Ferme réellement la session Firebase (avant, ce bouton ne faisait que
            // vider le localStorage : la session restait active côté Firebase, donc
            // la personne restait connectée malgré elle en revenant sur le site).
            if (typeof window.firebaseSignOut === 'function') {
                window.firebaseSignOut().then(finishLogout).catch(finishLogout);
            } else {
                finishLogout();
            }
        });
    }

    updateUI();

    // Si on arrive sur map.html avec ?loc=ID (depuis le bouton "More details" de
    // visited.html / wishlist.html), on ouvre directement la fiche du lieu concerné.
    if(document.getElementById('map')) {
        const params = new URLSearchParams(window.location.search);
        const locParam = params.get('loc');
        if(locParam) {
            setTimeout(() => {
                if(typeof window.switchMainTab === 'function') window.switchMainTab('explore');
                window.openDetailsPanel(Number(locParam));
            }, 700);
        }
    }
});

// ==========================================
// 2. DONNÉES (ICONES ET FILTRES)
// ==========================================
const iconsSVG = {
    "Run BTS": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5h18"/><path d="M4 8.5 5.5 4h3L7 8.5"/><path d="M9.3 8.5 10.8 4h3l-1.5 4.5"/><path d="M14.7 8.5 16.2 4h3l-1.5 4.5"/><rect x="3" y="8.5" width="18" height="11.5" rx="1.5"/></svg>`,
    "Bon Voyage": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    "Restaurants": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    "Cafe": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
    "Museums": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
    "MV Location": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
    "Concerts": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "Fashion": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a8.59 8.59 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    "Pop-up Store": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    "Landmarks": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="4" y="8" rx="2" ry="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    "Default": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
};

// Icône générique utilisée pour un marqueur de cluster (plusieurs lieux regroupés) —
// volontairement neutre plutôt qu'une icône de catégorie précise, puisqu'un cluster
// mélange souvent plusieurs catégories/groupes différents.
const CLUSTER_ICON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;

const groupColors = { "BTS": "#8b5cf6", "Blackpink": "#ec4899", "Twice": "#f43f5e", "Seventeen": "#3b82f6", "Katseye": "#10b981", "TXT": "#f59e0b" };

const filterData = {
    "BTS": { members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"], categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks"] },
    "Blackpink": { members: ["Jisoo", "Jennie", "Rosé", "Lisa"], categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"] },
    "General": { categories: ["Cafe", "Concerts", "Fashion", "Landmarks", "Museums", "Restaurants", "Pop-up Store"] }
};

let celebLocations = [
    { id: 1, name: "Cafe Camptong", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2020", episode: "Episodes 118 & 119", episodeLink: "https://weverse.io/bts/media/3-104694116", ytId: "yiqe-aegVk0", address: "27 Apgujeong-ro 42-gil, Gangnam-gu", lat: 37.5255, lng: 127.0375, img: "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg",
      fullDescription: { en: `<p>Tucked away in the trendy Apgujeong district of Gangnam, Cafe Camptong is a sprawling, multi-level indoor camping-themed café — complete with faux tents, string lights and a woodsy interior — that became the stage for one of the most chaotic scavenger hunts in Run BTS history.</p><p>The seven members were split into teams and sent racing through the venue's maze-like floors searching for hidden clues, and the footage remains a fan favourite for the sheer amount of screaming, tripping over tent poles and last-minute betrayals it produced.</p>`,
        fr: `<p>Niché dans le quartier branché d'Apgujeong à Gangnam, le Cafe Camptong est un immense café à thème "camping intérieur" sur plusieurs étages — tentes factices, guirlandes lumineuses et décor boisé inclus — qui est devenu le théâtre de l'une des chasses au trésor les plus chaotiques de l'histoire de Run BTS.</p><p>Les sept membres, répartis en équipes, ont dû courir à travers les étages labyrinthiques du lieu à la recherche d'indices cachés, et cet épisode reste un favori des fans pour la quantité impressionnante de cris, de chutes sur les piquets de tente et de trahisons de dernière minute qu'il a provoquées.</p>` },
      tip: { en: "Order at the counter before picking a table — the camping 'pods' upstairs fill up fast on weekends.", fr: "Commandez au comptoir avant de choisir une table — les « alcôves » de camping à l'étage se remplissent vite le week-end." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 5), then walk roughly 8 minutes north through the Rodeo shopping streets.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo (sortie 5), puis marchez environ 8 minutes vers le nord à travers les rues commerçantes de Rodeo." } },

    { id: 2, name: "Ossu Seiromushi", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018", ytId: "Otsu1", address: "30 Baekjegobun-ro 45-gil, Songpa-gu", lat: 37.5105, lng: 127.1085, img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
      fullDescription: { en: `<p>Set on a quiet street a short walk from Seokchon Lake, Ossu Seiromushi is a steamed-dish specialty restaurant known for its clean, minimalist dining room and its signature bamboo steamer baskets piled high with pork, vegetables and rice cake.</p><p>The restaurant is closely associated with Jin, who has spoken publicly about his appreciation for its cooking style, and it has since become something of a pilgrimage stop for fans exploring the Songpa-gu area near Lotte World.</p>`,
        fr: `<p>Installé dans une rue tranquille à quelques minutes à pied du lac Seokchon, Ossu Seiromushi est un restaurant spécialisé dans les plats vapeur, reconnaissable à sa salle épurée et minimaliste et à ses célèbres paniers en bambou débordant de porc, de légumes et de gâteau de riz.</p><p>Ce restaurant est étroitement associé à Jin, qui a publiquement exprimé son appréciation pour ce style de cuisine, et il est depuis devenu une étape incontournable pour les fans qui explorent le quartier de Songpa-gu, non loin de Lotte World.</p>` },
      tip: { en: "Reservations aren't accepted — arrive right at opening time on weekdays to avoid the longest waits.", fr: "Les réservations ne sont pas acceptées — arrivez pile à l'ouverture en semaine pour éviter les plus longues attentes." },
      directions: { en: "Take Line 8 or the Bundang Line to Songpanaru Station (Exit 2) and walk about 10 minutes east.", fr: "Prenez la ligne 8 ou la ligne Bundang jusqu'à la station Songpanaru (sortie 2) et marchez environ 10 minutes vers l'est." } },

    { id: 3, name: "Lotte World Adventure", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2018", episode: "Episode 51", ytId: "d--MDCCJ3jg", address: "240 Olympic-ro, Songpa-gu", lat: 37.5113, lng: 127.0980, img: "https://img.youtube.com/vi/d--MDCCJ3jg/hqdefault.jpg",
      fullDescription: { en: `<p>One of the largest indoor theme parks in the world, Lotte World Adventure combines a fully enclosed amusement park with an artificial lake, an ice rink and a folk museum all under one roof in the heart of Jamsil.</p><p>BTS took over the park for a full day of rides, games and costumed challenges, and the giant indoor atrium — with its glass dome ceiling and parade route — instantly became recognisable to fans worldwide as the backdrop for some of Run BTS's most joyfully unhinged moments.</p>`,
        fr: `<p>L'un des plus grands parcs à thème intérieurs au monde, Lotte World Adventure réunit sous un même toit, en plein cœur de Jamsil, un parc d'attractions entièrement couvert, un lac artificiel, une patinoire et un musée du folklore.</p><p>BTS a investi le parc le temps d'une journée entière de manèges, de jeux et de défis costumés, et le gigantesque atrium intérieur — avec son toit en verre en forme de dôme et son parcours de parade — est instantanément devenu reconnaissable par les fans du monde entier comme le décor de certains des moments les plus joyeusement chaotiques de Run BTS.</p>` },
      tip: { en: "Head straight for the French Revolution rollercoaster area first — it's exactly where the members raced during the episode.", fr: "Foncez directement vers la zone du grand huit French Revolution — c'est précisément là que les membres ont couru durant l'épisode." },
      directions: { en: "Take Line 2 or 8 to Jamsil Station and use Exit 3 or 4, which lead directly into the Lotte World complex.", fr: "Prenez la ligne 2 ou 8 jusqu'à la station Jamsil et empruntez la sortie 3 ou 4, qui mènent directement au complexe Lotte World." } },

    { id: 4, name: "Ahwon Museum & Hotel", group: "BTS", member: "All", country: "South Korea", city: "Wanju", category: "Museums", year: "2019", ytId: "h1jUtpEzxxA", address: "516-7 Songgwangsuman-ro", lat: 35.8455, lng: 127.1895, img: "https://img.youtube.com/vi/h1jUtpEzxxA/hqdefault.jpg",
      fullDescription: { en: `<p>Hidden in the forested hills of Wanju in North Jeolla Province, Ahwon Museum & Hotel is a boutique art museum and stay built around an extensive private collection of contemporary Korean sculpture and installation art, spread across quiet outdoor gardens and minimalist gallery halls.</p><p>Its remote, tranquil setting made it a natural choice for a slower, more introspective filming segment, letting the members wander the grounds and galleries far from the usual city noise.</p>`,
        fr: `<p>Caché dans les collines boisées de Wanju, dans la province du Jeolla du Nord, Ahwon Museum & Hotel est un musée d'art-boutique bâti autour d'une vaste collection privée de sculptures et d'installations d'art contemporain coréen, répartie entre jardins extérieurs paisibles et salles d'exposition minimalistes.</p><p>Son cadre isolé et tranquille en a fait un choix naturel pour un tournage plus lent et introspectif, laissant les membres flâner dans les jardins et les galeries loin du bruit habituel de la ville.</p>` },
      tip: { en: "Book the gallery tour slot in advance — access to certain wings is limited to a handful of visitors per day.", fr: "Réservez le créneau de visite guidée à l'avance — l'accès à certaines ailes est limité à une poignée de visiteurs par jour." },
      directions: { en: "The museum is best reached by car from Jeonju (around 40 minutes); public transit options in the area are limited.", fr: "Le musée se rejoint le plus facilement en voiture depuis Jeonju (environ 40 minutes) ; les options de transport en commun sont limitées dans ce secteur." } },

    { id: 5, name: "Cafe Kitsuné Seoul", group: "Blackpink", member: "Jennie", country: "South Korea", city: "Seoul", category: "Cafe", year: "2021", ytId: "Kitsune1", address: "23 Dosan-daero 13-gil", lat: 37.5197, lng: 127.0229, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
      fullDescription: { en: `<p>The Seoul outpost of the French fashion-and-coffee brand Maison Kitsuné sits on a stylish backstreet of Apgujeong Rodeo, blending its signature fox-logo streetwear boutique with a sleek, sun-lit café counter.</p><p>Jennie has been photographed here on several occasions, and the location quickly became a favourite stop for fans chasing both a good flat white and a slice of Blackpink-adjacent Seoul fashion culture.</p>`,
        fr: `<p>L'antenne séoulite de la marque française de mode et de café Maison Kitsuné occupe une rue élégante d'Apgujeong Rodeo, mêlant sa boutique de streetwear au logo renard emblématique à un comptoir de café épuré et baigné de lumière.</p><p>Jennie y a été photographiée à plusieurs reprises, et le lieu est rapidement devenu un arrêt incontournable pour les fans en quête à la fois d'un bon flat white et d'un aperçu de la culture mode séoulite proche de Blackpink.</p>` },
      tip: { en: "The boutique and café share the same entrance — browse the clothing rack first, the coffee counter is tucked in the back.", fr: "La boutique et le café partagent la même entrée — parcourez d'abord le portant de vêtements, le comptoir à café est niché au fond." },
      directions: { en: "From Apgujeong Rodeo Station (Suin-Bundang Line), walk about 10 minutes through the Dosan-daero side streets.", fr: "Depuis la station Apgujeong Rodeo (ligne Suin-Bundang), marchez environ 10 minutes à travers les rues secondaires de Dosan-daero." } },

    { id: 6, name: "Pozzetto", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Cafe", year: "2019", ytId: "Pozzetto1", address: "39 Rue du Roi de Sicile, Paris", lat: 48.8569, lng: 2.3572, img: "https://images.unsplash.com/photo-1557142046-c704a3adf365?w=600",
      fullDescription: { en: `<p>A small, unassuming gelateria in the heart of Le Marais, Pozzetto is beloved by Parisians for its authentically Italian, slow-churned gelato served in the traditional "pozzetto" wells rather than piled-high mounds.</p><p>Jimin was spotted stopping by during a visit to Paris, and the narrow cobblestone street outside — lined with old stone façades — has since become a quiet but well-loved detour for fans wandering the Marais.</p>`,
        fr: `<p>Petite gelateria discrète au cœur du Marais, Pozzetto est appréciée des Parisiens pour ses glaces italiennes authentiques, turbinées lentement et servies dans les traditionnels "pozzetti" plutôt qu'en boules empilées.</p><p>Jimin y a été aperçu lors d'un passage à Paris, et la ruelle pavée à l'extérieur — bordée de vieilles façades en pierre — est depuis devenue un détour discret mais très apprécié pour les fans qui flânent dans le Marais.</p>` },
      tip: { en: "Try the pistachio or the tiramisu flavour — both are the shop's most requested and tend to sell out on warm afternoons.", fr: "Essayez le parfum pistache ou tiramisu — ce sont les plus demandés de la boutique et ils partent vite les après-midis ensoleillés." },
      directions: { en: "Take Metro Line 1 to Saint-Paul or Line 11 to Hôtel de Ville, then walk 5–7 minutes into the Marais.", fr: "Prenez la ligne 1 du métro jusqu'à Saint-Paul ou la ligne 11 jusqu'à Hôtel de Ville, puis marchez 5 à 7 minutes dans le Marais." } },

    { id: 7, name: "Musée Nissim de Camondo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Fashion", year: "2026", ytId: "1TdxCtgX53w", address: "63 Rue de Monceau, Paris", lat: 48.8795, lng: 2.3117, img: "https://img.youtube.com/vi/1TdxCtgX53w/hqdefault.jpg",
      fullDescription: { en: `<p>Overlooking Parc Monceau, this preserved early-20th-century private mansion houses an extraordinary collection of 18th-century French decorative arts, its rooms kept exactly as they were when the Camondo family lived there.</p><p>The museum's opulent, perfectly preserved interiors made it a striking setting for a high-fashion appearance tied to Jimin, and the location has since drawn fans interested in both music and fine French heritage architecture.</p>`,
        fr: `<p>Donnant sur le Parc Monceau, cet hôtel particulier du début du XXe siècle parfaitement préservé abrite une collection exceptionnelle d'arts décoratifs français du XVIIIe siècle, ses pièces étant conservées telles qu'elles étaient du vivant de la famille Camondo.</p><p>Les intérieurs somptueux et intacts du musée en ont fait un décor saisissant pour une apparition mode haut de gamme liée à Jimin, et le lieu attire depuis des fans intéressés à la fois par la musique et par le patrimoine architectural français.</p>` },
      tip: { en: "The museum limits daily visitor numbers to protect the period rooms — buying a timed ticket online in advance is strongly recommended.", fr: "Le musée limite le nombre de visiteurs quotidiens pour protéger ses pièces d'époque — il est vivement recommandé d'acheter un billet horodaté en ligne à l'avance." },
      directions: { en: "Take Metro Line 2 or 3 to Villiers or Monceau, then walk 3–5 minutes to the park entrance on Rue de Monceau.", fr: "Prenez la ligne 2 ou 3 du métro jusqu'à Villiers ou Monceau, puis marchez 3 à 5 minutes jusqu'à l'entrée du parc, Rue de Monceau." } },

    { id: 8, name: "Montmartre Stairs", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", ytId: "Montmartre1", address: "Rue Foyatier, Paris", lat: 48.8856, lng: 2.3432, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
      fullDescription: { en: `<p>The steep, iconic staircase of Rue Foyatier climbs the Montmartre hill toward the Sacré-Cœur basilica, its central funicular track flanked by nearly 300 steps that have appeared in countless films and photographs.</p><p>Jimin was photographed here during a quiet stroll through the neighbourhood, adding one more layer to the staircase's already legendary status among visitors chasing the perfect Parisian panorama.</p>`,
        fr: `<p>L'escalier abrupt et emblématique de la rue Foyatier grimpe la butte Montmartre en direction de la basilique du Sacré-Cœur, sa voie centrale de funiculaire encadrée par près de 300 marches qui ont figuré dans d'innombrables films et photographies.</p><p>Jimin y a été photographié lors d'une promenade tranquille dans le quartier, ajoutant une couche supplémentaire au statut déjà légendaire de cet escalier auprès des visiteurs en quête du panorama parisien parfait.</p>` },
      tip: { en: "Climb up early in the morning for soft light and far fewer tourists on the steps.", fr: "Montez tôt le matin pour profiter d'une lumière douce et de bien moins de touristes sur les marches." },
      directions: { en: "Take Metro Line 12 to Abbesses and follow signs for the funicular; the staircase runs directly alongside it.", fr: "Prenez la ligne 12 du métro jusqu'à Abbesses et suivez les panneaux vers le funiculaire ; l'escalier longe directement celui-ci." } },

    { id: 9, name: "Wall of Love", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", ytId: "WallOfLove1", address: "Square Jehan Rictus, Paris", lat: 48.8848, lng: 2.3386, img: "https://images.unsplash.com/photo-1522093005080-d132e14a2e6f?w=600",
      fullDescription: { en: `<p>Tucked inside a small park at the foot of Montmartre, the Wall of Love ("Le Mur des Je t'aime") is a striking 40-square-metre mural where the phrase "I love you" is painted in over 250 languages and dialects across deep blue enamel tiles.</p><p>Jimin's visit to this quiet, romantic corner of Paris turned it into an unofficial pilgrimage spot for fans, many of whom now search the tiles for their own native language before taking a photo.</p>`,
        fr: `<p>Niché dans un petit parc au pied de Montmartre, le Mur des Je t'aime est une saisissante fresque de 40 mètres carrés où la phrase "je t'aime" est peinte en plus de 250 langues et dialectes sur des carreaux d'émail bleu profond.</p><p>La visite de Jimin dans ce coin romantique et paisible de Paris en a fait un lieu de pèlerinage officieux pour les fans, dont beaucoup cherchent désormais leur propre langue maternelle sur les carreaux avant de prendre une photo.</p>` },
      tip: { en: "Look for 'Je t'aime' in Korean near the lower-left section of the wall — it's the tile most fans photograph first.", fr: "Cherchez « je t'aime » en coréen près de la partie inférieure gauche du mur — c'est le carreau que la plupart des fans photographient en premier." },
      directions: { en: "Take Metro Line 12 to Abbesses; the square is a 2-minute walk from the station, right next to the metro entrance.", fr: "Prenez la ligne 12 du métro jusqu'à Abbesses ; le square se trouve à 2 minutes à pied de la station, juste à côté de l'entrée du métro." } },

    { id: 10, name: "Palais de Tokyo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Museums", year: "2023", ytId: "PalaisTokyo1", address: "13 Av. du Président Wilson, Paris", lat: 48.8643, lng: 2.2965, img: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600",
      fullDescription: { en: `<p>One of Europe's largest spaces dedicated to contemporary art, Palais de Tokyo occupies a monumental 1937 Art Deco building facing the Seine, known for its raw concrete interiors and constantly rotating, boundary-pushing exhibitions.</p><p>Jimin's appearance here tied into a fashion and art moment that fit the venue's avant-garde identity perfectly, and its industrial-chic architecture has since become a favourite backdrop for fans' own photos.</p>`,
        fr: `<p>L'un des plus grands espaces d'Europe dédiés à l'art contemporain, le Palais de Tokyo occupe un bâtiment monumental de style Art déco datant de 1937, face à la Seine, reconnu pour ses intérieurs en béton brut et ses expositions sans cesse renouvelées et avant-gardistes.</p><p>L'apparition de Jimin ici s'inscrivait dans un moment mode et art parfaitement en phase avec l'identité avant-gardiste du lieu, et son architecture industrielle-chic est depuis devenue un décor de prédilection pour les photos des fans.</p>` },
      tip: { en: "The building stays open late most evenings — an evening visit avoids the daytime museum crowds entirely.", fr: "Le bâtiment reste ouvert tard la plupart des soirs — une visite en soirée permet d'éviter complètement l'affluence diurne du musée." },
      directions: { en: "Take Metro Line 9 to Alma-Marceau or Iéna, both a 5-minute walk from the entrance on Avenue du Président Wilson.", fr: "Prenez la ligne 9 du métro jusqu'à Alma-Marceau ou Iéna, toutes deux à 5 minutes à pied de l'entrée, avenue du Président Wilson." } },

    { id: 11, name: "Cheonggu Building", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2017", ytId: "vJwHIpEogEY", address: "16 Hakdong-ro 30-gil", lat: 37.5144, lng: 127.0315, img: "https://img.youtube.com/vi/vJwHIpEogEY/hqdefault.jpg",
      fullDescription: { en: `<p>A modest, unassuming office building in Cheongdam-dong, this address served as Big Hit Entertainment's original headquarters during BTS's earliest, scrappiest years, well before the company grew into the global powerhouse HYBE.</p><p>It's here that early practice sessions, meetings and countless behind-the-scenes moments took place, making the building a quietly significant landmark for long-time fans tracing the group's origin story.</p>`,
        fr: `<p>Immeuble de bureaux modeste et discret situé à Cheongdam-dong, cette adresse a hébergé le tout premier siège de Big Hit Entertainment durant les années les plus modestes et les plus intenses des débuts de BTS, bien avant que l'entreprise ne devienne le géant mondial HYBE.</p><p>C'est ici qu'ont eu lieu les premières sessions de répétition, les réunions et d'innombrables moments en coulisses, faisant de ce bâtiment un lieu discrètement significatif pour les fans de longue date retraçant les origines du groupe.</p>` },
      tip: { en: "The building is a private office space today — admire the exterior from the street rather than trying to enter.", fr: "Le bâtiment est aujourd'hui un espace de bureaux privé — admirez l'extérieur depuis la rue plutôt que de tenter d'y entrer." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 12 minutes southeast into Cheongdam-dong.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 12 minutes vers le sud-est jusqu'à Cheongdam-dong." } },

    { id: 12, name: "The First BTS Dorm", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", ytId: "RhJqNFQCU_Q", address: "29 Nonhyeon-ro 119-gil", lat: 37.5133, lng: 127.0321, img: "https://img.youtube.com/vi/RhJqNFQCU_Q/hqdefault.jpg",
      fullDescription: { en: `<p>Long before their sprawling, more comfortable later dorms, all seven members of BTS lived together in a compact, two-room apartment on this residential street — a living arrangement famously chronicled in early vlogs and reality segments for its cramped bunk beds and shared everything.</p><p>The building itself is unremarkable from the outside, but its role in shaping the group's early bond and work ethic has made it one of the most sentimental stops on any BTS-focused itinerary.</p>`,
        fr: `<p>Bien avant leurs dortoirs plus vastes et confortables des années suivantes, les sept membres de BTS ont vécu ensemble dans un appartement compact de deux pièces sur cette rue résidentielle — un cadre de vie rendu célèbre par les premiers vlogs et segments de télé-réalité pour ses lits superposés exigus et tout ce qui s'y partageait.</p><p>Le bâtiment lui-même n'a rien de remarquable vu de l'extérieur, mais son rôle dans la formation des liens et de l'éthique de travail du groupe à ses débuts en fait l'une des étapes les plus chargées d'émotion de tout itinéraire consacré à BTS.</p>` },
      tip: { en: "This is a private residential building — please stay on the public street and keep noise to a minimum out of respect for current residents.", fr: "Il s'agit d'un immeuble résidentiel privé — merci de rester sur la voie publique et de limiter le bruit par respect pour les résidents actuels." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk roughly 10 minutes south through the Nonhyeon-dong side streets.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 10 minutes vers le sud à travers les rues de Nonhyeon-dong." } },

    { id: 13, name: "Hyangho Beach Bus Stop", group: "BTS", member: "All", country: "South Korea", city: "Gangneung", category: "Landmarks", year: "2017", ytId: "46qWWmnK4F0", address: "8-55 Hyangho-ri", lat: 37.9048, lng: 128.8266, img: "https://img.youtube.com/vi/46qWWmnK4F0/hqdefault.jpg",
      fullDescription: { en: `<p>A modest little bus shelter facing the sea along the East Coast, this stop near Hyangho Beach became instantly iconic after appearing as a key emotional backdrop in one of BTS's most beloved music videos.</p><p>With the wide, quiet beach stretching out just beyond the road and the pale blue shelter almost unchanged since filming, fans regularly make the trip out from Gangneung just to sit on the same bench and watch the same waves.</p>`,
        fr: `<p>Modeste petit abribus face à la mer, sur la côte est du pays, cet arrêt près de la plage de Hyangho est devenu instantanément culte après avoir servi de décor émotionnel clé dans l'un des clips les plus aimés de BTS.</p><p>Avec la plage large et paisible qui s'étend juste après la route et l'abri bleu pâle resté quasiment identique depuis le tournage, les fans font régulièrement le déplacement depuis Gangneung pour s'asseoir sur le même banc et regarder les mêmes vagues.</p>` },
      tip: { en: "Sunrise here is spectacular and the beach is almost empty that early — worth setting an alarm for.", fr: "Le lever de soleil y est spectaculaire et la plage est quasiment vide à cette heure — cela vaut le coup de régler un réveil." },
      directions: { en: "From Gangneung Station, a taxi takes about 20 minutes; there is also a local bus that stops within walking distance.", fr: "Depuis la gare de Gangneung, comptez environ 20 minutes en taxi ; un bus local dessert également un arrêt à quelques minutes à pied." } },

    { id: 14, name: "Iryeong Station", group: "BTS", member: "All", country: "South Korea", city: "Yangju", category: "MV Location", year: "2017", ytId: "xEeFrLSkMm8", address: "327 Samsang-ri", lat: 37.7135, lng: 126.9329, img: "https://img.youtube.com/vi/xEeFrLSkMm8/hqdefault.jpg",
      fullDescription: { en: `<p>A small, largely disused regional train station north of Seoul, Iryeong Station's weathered platform and rusting rail cars gave it exactly the melancholic, nostalgic atmosphere needed for a pivotal scene in one of BTS's most narratively rich music videos.</p><p>Because the station sees very little regular traffic, its quiet platforms have remained remarkably close to how they appeared on screen, letting visiting fans recreate shots almost frame for frame.</p>`,
        fr: `<p>Petite gare régionale largement désaffectée au nord de Séoul, le quai usé et les wagons rouillés d'Iryeong offraient exactement l'atmosphère mélancolique et nostalgique nécessaire à une scène charnière de l'un des clips les plus riches narrativement de BTS.</p><p>La gare étant très peu fréquentée au quotidien, ses quais silencieux sont restés remarquablement fidèles à leur apparition à l'écran, permettant aux fans en visite de recréer les plans presque à l'identique.</p>` },
      tip: { en: "Trains still run infrequently through the station — always check the platform edge and stay well behind the yellow line.", fr: "Des trains circulent encore occasionnellement dans la gare — vérifiez toujours le bord du quai et restez bien derrière la ligne jaune." },
      directions: { en: "Best reached by car or taxi from central Seoul (around 1 hour); regional trains to Iryeong are infrequent.", fr: "Se rejoint le plus facilement en voiture ou en taxi depuis le centre de Séoul (environ 1 heure) ; les trains régionaux vers Iryeong sont peu fréquents." } },

    { id: 15, name: "Quinta da Francelha de Cima", group: "BTS", member: "All", country: "Portugal", city: "Prior Velho", category: "MV Location", year: "2026", ytId: "GEk4jHwfFTA", address: "R. da Francelha de Cima", lat: 38.7844, lng: -9.1238, img: "https://img.youtube.com/vi/GEk4jHwfFTA/hqdefault.jpg",
      fullDescription: { en: `<p>A rustic countryside estate just outside Lisbon, Quinta da Francelha de Cima blends traditional Portuguese stonework with sprawling gardens, olive trees and weathered farm buildings that lend it a timeless, cinematic quality.</p><p>Its earthy, sun-bleached aesthetic made it a striking choice of filming location, offering a very different visual mood from BTS's usual urban settings.</p>`,
        fr: `<p>Domaine rural rustique situé juste aux portes de Lisbonne, la Quinta da Francelha de Cima marie une architecture en pierre traditionnelle portugaise à de vastes jardins, des oliviers et des bâtiments agricoles patinés par le temps, lui conférant une qualité cinématographique intemporelle.</p><p>Son esthétique brute et délavée par le soleil en a fait un choix de tournage saisissant, offrant une ambiance visuelle très différente des décors urbains habituels de BTS.</p>` },
      tip: { en: "The estate is largely private property — respectful viewing from the road is recommended unless a public event is scheduled.", fr: "Le domaine est en grande partie une propriété privée — il est recommandé de l'observer respectueusement depuis la route, sauf événement public programmé." },
      directions: { en: "Best reached by car from central Lisbon (around 20–25 minutes); limited public transit serves this rural area.", fr: "Se rejoint le plus facilement en voiture depuis le centre de Lisbonne (environ 20 à 25 minutes) ; les transports en commun sont limités dans cette zone rurale." } },

    { id: 16, name: "Sunhyewon", group: "BTS", member: "All", country: "South Korea", city: "Seoul Area", category: "MV Location", year: "2026", ytId: "Hb06Iem3FWg", address: "Sunhyewon Estate", lat: 37.5826, lng: 126.9856, img: "https://img.youtube.com/vi/Hb06Iem3FWg/hqdefault.jpg",
      fullDescription: { en: `<p>Sunhyewon is a beautifully landscaped traditional-style estate on the outskirts of Seoul, blending hanok-inspired architecture with manicured gardens, ponds and stone pathways that evoke a sense of classical Korean elegance.</p><p>Its serene, meticulously maintained grounds provided a striking visual contrast for filming, standing apart from the group's more commonly seen city locations.</p>`,
        fr: `<p>Sunhyewon est un domaine de style traditionnel magnifiquement paysager, en périphérie de Séoul, alliant une architecture inspirée des hanoks à des jardins soignés, des bassins et des allées de pierre qui évoquent une élégance coréenne classique.</p><p>Son terrain serein et méticuleusement entretenu a offert un contraste visuel saisissant pour le tournage, se démarquant nettement des décors urbains plus habituels du groupe.</p>` },
      tip: { en: "Certain garden areas open to visitors only on specific days — check ahead before planning a visit around them.", fr: "Certaines zones du jardin ne sont ouvertes aux visiteurs que certains jours précis — vérifiez au préalable avant d'organiser votre visite autour d'elles." },
      directions: { en: "Best reached by car or taxi from central Seoul; the estate sits roughly 45 minutes from downtown depending on traffic.", fr: "Se rejoint le plus facilement en voiture ou en taxi depuis le centre de Séoul ; le domaine se trouve à environ 45 minutes du centre-ville selon la circulation." } },

    { id: 17, name: "Museu de Marinha", group: "BTS", member: "All", country: "Portugal", city: "Lisbon", category: "MV Location", year: "2026", ytId: "b4iVv91Z6lY", address: "Praça do Império, Lisboa", lat: 38.6976, lng: -9.2082, img: "https://img.youtube.com/vi/b4iVv91Z6lY/hqdefault.jpg",
      fullDescription: { en: `<p>Housed in a wing of the monumental Jerónimos Monastery complex in Belém, the Museu de Marinha traces Portugal's rich maritime and naval history through ship models, royal barges and navigational instruments spanning centuries of exploration.</p><p>Its grand, echoing halls and nautical exhibits gave a distinctly regal, historic texture to the footage filmed here, tying BTS's Portugal chapter to the country's Age of Discovery heritage.</p>`,
        fr: `<p>Installé dans une aile du monumental complexe du monastère des Jerónimos, à Belém, le Museu de Marinha retrace la riche histoire maritime et navale du Portugal à travers des maquettes de navires, des barques royales et des instruments de navigation couvrant plusieurs siècles d'exploration.</p><p>Ses grandes salles résonnantes et ses collections nautiques ont conféré une texture nettement royale et historique aux images tournées ici, rattachant le chapitre portugais de BTS à l'héritage des Grandes Découvertes du pays.</p>` },
      tip: { en: "Combine your visit with the neighbouring Jerónimos Monastery and Belém Tower — all three sit within a short walk of each other.", fr: "Combinez votre visite avec le monastère des Jerónimos et la tour de Belém, juste à côté — les trois sites se trouvent à quelques minutes de marche les uns des autres." },
      directions: { en: "Take Tram 15E or bus 728/729 from central Lisbon to Belém, then walk about 5 minutes to Praça do Império.", fr: "Prenez le tram 15E ou le bus 728/729 depuis le centre de Lisbonne jusqu'à Belém, puis marchez environ 5 minutes jusqu'à la Praça do Império." } },

    { id: 18, name: "In the SOOP Estate", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2021", episode: "In the SOOP BTS ver. Season 2", ytId: "6qB8Nb_WO_Y", address: "Domaine privé en montagne, Chuncheon (Accès restreint via le Phoenix Pyeongchang Resort)", lat: 37.8813, lng: 127.7298, img: "https://img.youtube.com/vi/6qB8Nb_WO_Y/hqdefault.jpg",
      fullDescription: { en: `<p>Nestled deep in the lush mountains and dense forests of Chuncheon, this sprawling estate is far more than a simple vacation rental. HYBE acquired, redesigned and fully renovated the vast property specifically to create the perfect setting for the show.</p><p>The location seamlessly blends untouched wilderness with ultra-modern architecture: a sumptuous main house, private guest villas, an outdoor pool, a tennis court, and even a dedicated RV area. It's a true sanctuary of tranquility, custom-built to offer quiet luxury and a total disconnect from the outside world.</p><p><b>Following in BTS's Footsteps (In the SOOP Season 2)</b><br>It was in this idyllic setting that the members of BTS settled in 2021 for a well-deserved break. Walking the grounds today, the immersion is total: the sets remain faithful to the show. You can walk exactly where RM once read peacefully, see the RV where SUGA retreated to play guitar, and visit the kitchen that was the backdrop for Jin and Jung Kook's late-night meals. The outdoor sports field still seems to echo with their laughter from legendary games of foot-volley in the rain. Visiting this place means feeling the magic and serenity of the simple moments the group shared together.</p>`,
        fr: `<p>Niché au cœur des montagnes luxuriantes et des forêts denses de Chuncheon, ce vaste domaine n'est pas une simple location de vacances. L'agence HYBE a acquis, repensé et entièrement rénové cette immense propriété spécifiquement pour créer le cadre parfait de l'émission.</p><p>Le lieu allie harmonieusement nature sauvage et architecture ultra-moderne : il comprend une somptueuse maison principale, des villas d'invités privées, une piscine extérieure, un court de tennis, et même une zone dédiée aux camping-cars. C'est un véritable sanctuaire de tranquillité, conçu sur mesure pour offrir un luxe discret et une déconnexion totale du monde extérieur.</p><p><b>Following in BTS's Footsteps (In the SOOP Season 2)</b><br>C'est dans cet environnement idyllique que les membres de BTS ont posé leurs valises en 2021 pour s'accorder une pause bien méritée. En visitant le domaine, l'immersion est totale : les décors sont restés fidèles à l'émission. Vous pourrez marcher exactement là où RM lisait paisiblement, voir le camping-car où SUGA s'isolait pour jouer de la guitare, et visiter la cuisine qui a été le théâtre des repas nocturnes de Jin et Jung Kook. Le terrain de sport extérieur résonne encore de leurs rires lors de leurs mythiques parties de foot-volley sous la pluie. Visiter ce lieu, c'est ressentir la magie et la sérénité des moments simples partagés par le groupe.</p>` },
      tip: { en: "Wear comfortable shoes to explore the whole property. Don't miss the hidden gift shop on-site, which sells exclusive merchandise you won't find anywhere else!", fr: "Prévoyez des chaussures confortables pour explorer l'ensemble de la propriété. Ne manquez surtout pas la boutique de souvenirs cachée sur le site, qui vend des produits dérivés exclusifs que vous ne trouverez nulle part ailleurs !" },
      directions: { en: "Access to this estate is strictly regulated to preserve the grounds. You cannot arrive by personal vehicle or taxi. Entry requires booking the official 'In the SOOP Stay' package in partnership with the Phoenix Pyeongchang Resort. The recommended route is to take the KTX high-speed train from Seoul Station to Pyeongchang Station, then board the resort's private shuttle, which takes you directly to the estate.",
        fr: "L'accès à ce domaine est strictement réglementé pour préserver les lieux. Vous ne pouvez pas vous y rendre avec un véhicule personnel ou un taxi. Pour y accéder, vous devez obligatoirement réserver le package officiel « In the SOOP Stay » en partenariat avec le Phoenix Pyeongchang Resort. Le trajet recommandé est de prendre le train à grande vitesse (KTX) depuis la gare de Séoul jusqu'à la gare de Pyeongchang, puis de monter à bord de la navette privée du complexe hôtelier qui vous conduira directement au domaine." } },

    { id: 19, name: "Happy Meadow Ranch", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2020", ytId: "F14vk9qPRM0", address: "330-48 Chunhwa-ro", lat: 37.9547, lng: 127.6975, img: "https://img.youtube.com/vi/F14vk9qPRM0/hqdefault.jpg",
      fullDescription: { en: `<p>A working horse ranch set against the rolling green hills of Chuncheon, Happy Meadow Ranch offers wide-open pastures, stables and riding trails that feel a world away from Seoul, just an hour or so outside the capital.</p><p>The members visited during a Bon Voyage travel segment to try horseback riding for the first time, and the ranch's laid-back, countryside charm made for one of the show's most relaxed and good-humoured episodes.</p>`,
        fr: `<p>Ranch équestre en activité niché au milieu des collines verdoyantes de Chuncheon, Happy Meadow Ranch offre de vastes pâturages, des écuries et des sentiers de randonnée à cheval qui semblent à des lieues de Séoul, à seulement une heure environ de la capitale.</p><p>Les membres l'ont visité lors d'un segment de voyage de Bon Voyage pour s'essayer à l'équitation pour la première fois, et le charme décontracté et champêtre du ranch a donné lieu à l'un des épisodes les plus détendus et les plus drôles de l'émission.</p>` },
      tip: { en: "Riding lessons for beginners are available on-site and can be booked the same day if it isn't too busy.", fr: "Des cours d'équitation pour débutants sont proposés sur place et peuvent être réservés le jour même si l'affluence le permet." },
      directions: { en: "Best reached by car from Chuncheon city center (around 20 minutes); a taxi is the easiest option for visitors without a vehicle.", fr: "Se rejoint le plus facilement en voiture depuis le centre-ville de Chuncheon (environ 20 minutes) ; le taxi reste l'option la plus simple pour les visiteurs sans véhicule." } },

    // ===== BON VOYAGE SAISON 1 — SCANDINAVIE, 2016 =====
    { id: 20, name: "Bryggen", group: "BTS", member: "All", country: "Norway", city: "Bergen", category: "Bon Voyage", year: "2016", address: "Bryggen", lat: 60.3979, lng: 5.3245, img: "https://images.unsplash.com/photo-1601439678777-b2b3c56fa72e?w=600",
      fullDescription: { en: `<p>Bryggen is the old wharf of Bergen, a row of narrow wooden merchant houses leaning into each other in shades of ochre, red and mustard, left over from the city's Hanseatic trading days. It's the kind of place that photographs itself, and it's exactly where the seven members wandered on the very first stop of the very first Bon Voyage, cameras and disbelief in equal measure.</p><p>There's something fitting about a group known for tight harmonies starting their first real off-the-clock trip in a neighbourhood built by merchants who once lived, worked and argued shoulder to shoulder in these same alleys. Season 1 of Bon Voyage still gets talked about as the rawest, least polished version of the show, and Bryggen's crooked rooftops are the first thing viewers see of it.</p>`,
        fr: `<p>Bryggen, c'est le vieux quai marchand de Bergen : une rangée de maisons en bois qui penchent légèrement les unes contre les autres, dans des tons ocre, rouge et moutarde, vestiges de l'époque hanséatique de la ville. C'est le genre d'endroit qui se photographie tout seul, et c'est précisément là que les sept membres ont posé leurs valises lors de la toute première étape du tout premier Bon Voyage.</p><p>Il y a quelque chose d'assez juste à voir un groupe connu pour ses harmonies vocales débuter son premier vrai voyage hors caméra dans un quartier bâti par des marchands qui vivaient et travaillaient coude à coude dans ces mêmes ruelles. La saison 1 de Bon Voyage reste connue pour être la version la plus brute et la moins scénarisée du programme, et les toits de guingois de Bryggen sont la toute première image que les spectateurs en gardent.</p>` },
      tip: { en: "Duck into the narrow passageways between the buildings — most of the charm (and the tiny artisan shops) is hidden just off the main waterfront row.", fr: "Faufilez-vous dans les passages étroits entre les bâtiments — l'essentiel du charme (et les petites boutiques d'artisans) se cache juste derrière la rangée principale sur les quais." },
      directions: { en: "Bryggen sits right on Bergen's harbour, a 10–15 minute walk from the train and bus station.", fr: "Bryggen se trouve directement sur le port de Bergen, à 10–15 minutes à pied de la gare et de la gare routière." } },

    { id: 21, name: "Fløyen", group: "BTS", member: "All", country: "Norway", city: "Bergen", category: "Bon Voyage", year: "2016", address: "Fløyfjellet", lat: 60.3969, lng: 5.3341, img: "https://images.unsplash.com/photo-1601439678777-b2b3c56fa72e?w=600",
      fullDescription: { en: `<p>A short, steep funicular ride above Bergen sits Fløyen, one of the seven mountains that surround the city, and the members rode it up for a proper look at the fjords and rooftops they'd just been wandering through at ground level.</p><p>It's less a single filmed spot than a vantage point — the kind of stop that exists in the itinerary mostly so everyone can catch their breath and take in how small the harbour looks from up there. Fans still trade screenshots of the group lined up along the railing, wind-blown and squinting into the light, as one of the more candid, unguarded moments of the whole season.</p>`,
        fr: `<p>Au sommet d'un court et raide trajet en funiculaire au-dessus de Bergen se trouve Fløyen, l'une des sept montagnes qui encerclent la ville. Les membres y sont montés pour admirer les fjords et les toits qu'ils venaient tout juste d'arpenter au niveau de la rue.</p><p>C'est moins un lieu de tournage à proprement parler qu'un point de vue — le genre d'étape qui existe surtout pour laisser tout le monde souffler et mesurer à quel point le port paraît minuscule vu d'en haut. Les fans continuent de s'échanger des captures d'écran du groupe aligné le long de la rambarde, décoiffé par le vent et plissant les yeux dans la lumière, comme l'un des moments les plus spontanés de toute la saison.</p>` },
      tip: { en: "Buy the funicular ticket as a round trip — the walking path down is beautiful but takes over an hour.", fr: "Prenez le billet de funiculaire en aller-retour — le sentier de descente à pied est magnifique mais prend plus d'une heure." },
      directions: { en: "The Fløibanen funicular station is a 5-minute walk from Bryggen; the ride to the top takes about 8 minutes.", fr: "La station du funiculaire Fløibanen se trouve à 5 minutes à pied de Bryggen ; la montée dure environ 8 minutes." } },

    { id: 22, name: "Gamla Stan", group: "BTS", member: "All", country: "Sweden", city: "Stockholm", category: "Bon Voyage", year: "2016", address: "Gamla Stan", lat: 59.3251, lng: 18.0711, img: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=600",
      fullDescription: { en: `<p>Stockholm's old town is a tangle of cobbled lanes so narrow that two people can barely walk side by side, lined with pastel-coloured buildings that have barely changed since the 17th century. It's here that the group spent an afternoon just walking, no real agenda beyond getting a little lost.</p><p>What made this stop memorable wasn't a landmark so much as the pace of it — Bon Voyage at its best has always been about watching seven exhausted idols be allowed to do absolutely nothing in particular, and Gamla Stan's maze of alleys gave them exactly that kind of aimless afternoon.</p>`,
        fr: `<p>La vieille ville de Stockholm est un enchevêtrement de ruelles pavées si étroites que deux personnes peuvent à peine y marcher côte à côte, bordées de façades pastel qui n'ont presque pas changé depuis le XVIIe siècle. C'est ici que le groupe a passé un après-midi à simplement marcher, sans autre objectif que de se perdre un peu.</p><p>Ce qui rend cette étape mémorable, ce n'est pas un monument en particulier, mais le rythme de la scène — Bon Voyage est toujours à son meilleur lorsqu'il laisse sept idoles épuisées ne rien faire de précis, et le dédale de ruelles de Gamla Stan leur a offert exactement ce genre d'après-midi sans but.</p>` },
      tip: { en: "Stortorget, the small square at the heart of Gamla Stan, is the easiest landmark to use as a starting point before wandering off.", fr: "Stortorget, la petite place au cœur de Gamla Stan, est le repère le plus simple pour démarrer la balade avant de se perdre dans les ruelles." },
      directions: { en: "Gamla Stan has its own metro station (T-Gamla stan) on the red and green lines, right in the middle of the old town.", fr: "Gamla Stan dispose de sa propre station de métro (T-Gamla stan), sur les lignes rouge et verte, en plein cœur de la vieille ville." } },

    { id: 23, name: "Suomenlinna", group: "BTS", member: "All", country: "Finland", city: "Helsinki", category: "Bon Voyage", year: "2016", address: "Suomenlinna", lat: 60.1454, lng: 24.9880, img: "https://images.unsplash.com/photo-1508189860359-777d945909ef?w=600",
      fullDescription: { en: `<p>A short ferry ride from central Helsinki, Suomenlinna is a sea fortress spread across six connected islands, its grassy ramparts and tunnels built in the 18th century to guard the approach to the city. The group crossed over for an afternoon of exploring cannons, courtyards and the odd sense of standing in the middle of the sea.</p><p>It closed out the Nordic leg of Bon Voyage on a quieter note than Bryggen or Gamla Stan — fewer people around, more open sky, and a lot of walking with nowhere in particular to be, which by that point in the trip had become the whole point.</p>`,
        fr: `<p>À quelques minutes de ferry du centre d'Helsinki, Suomenlinna est une forteresse maritime répartie sur six îles reliées entre elles, avec ses remparts herbeux et ses tunnels construits au XVIIIe siècle pour protéger l'accès à la ville. Le groupe y a traversé pour un après-midi à explorer canons, cours intérieures et cette sensation étrange de se trouver en plein milieu de la mer.</p><p>Cette étape a clos le passage nordique de Bon Voyage sur une note plus calme que Bryggen ou Gamla Stan — moins de monde, un ciel plus ouvert, et beaucoup de marche sans destination précise, ce qui à ce stade du voyage était devenu tout l'intérêt de l'exercice.</p>` },
      tip: { en: "The ferry to Suomenlinna runs year-round and is covered by a standard Helsinki public transport ticket.", fr: "Le ferry vers Suomenlinna fonctionne toute l'année et est inclus dans un billet standard des transports en commun d'Helsinki." },
      directions: { en: "Ferries leave from the Market Square (Kauppatori) in central Helsinki roughly every 20–40 minutes; the crossing takes about 15 minutes.", fr: "Les ferries partent de la place du marché (Kauppatori), au centre d'Helsinki, environ toutes les 20 à 40 minutes ; la traversée dure environ 15 minutes." } },

    // ===== BON VOYAGE SAISON 2 — HAWAÏ, 2017 =====
    { id: 24, name: "Aha'oulu (Bon Voyage 2)", group: "BTS", member: "All", country: "USA", city: "Oahu, Hawaii", category: "Bon Voyage", year: "2017", address: "Haleiwa, North Shore", lat: 21.5928, lng: -158.1044, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
      fullDescription: { en: `<p>Haleiwa sits on Oahu's North Shore, a stretch of coastline better known to surfers than tourists, all low wooden storefronts and the kind of waves that draw professionals from around the world. Season 2 of Bon Voyage planted the group here for a stretch of surfing lessons, beach days and considerably more wipeouts than any of them expected.</p><p>It's a rare Bon Voyage location built almost entirely around failure in the funniest sense — nobody involved was a natural on a board, and the show leaned hard into that, turning Haleiwa's gentle beginner breaks into some of the most rewatched, most gif-able footage the group has ever produced.</p>`,
        fr: `<p>Haleiwa se trouve sur la côte nord d'Oahu, un littoral plus connu des surfeurs que des touristes, fait de façades en bois basses et de vagues qui attirent des professionnels venus du monde entier. La saison 2 de Bon Voyage y a installé le groupe pour une série de cours de surf, de journées à la plage et de bien plus de chutes que prévu.</p><p>C'est un lieu Bon Voyage assez rare, construit presque entièrement autour de l'échec dans son sens le plus drôle — personne dans le groupe n'était naturellement doué en surf, et l'émission a pleinement joué cette carte, transformant les vagues débutantes de Haleiwa en certaines des images les plus revisionnées et les plus détournées jamais produites par le groupe.</p>` },
      tip: { en: "Haleiwa's surf shops still rent boards by the hour if you want to try the same beginner breaks the members struggled with.", fr: "Les boutiques de surf de Haleiwa louent encore des planches à l'heure si vous voulez tenter les mêmes vagues débutantes sur lesquelles les membres ont galéré." },
      directions: { en: "Best reached by rental car from Honolulu (around 45 minutes); there is no direct rail or metro link to the North Shore.", fr: "Se rejoint le plus facilement en voiture de location depuis Honolulu (environ 45 minutes) ; il n'existe pas de liaison directe en train ou en métro vers la côte nord." } },

    // ===== BON VOYAGE SAISON 3 — MALTE, 2018 =====
    { id: 25, name: "Triton Fountain", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "Vjal Nelson", lat: 35.8968, lng: 14.5125, img: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=600",
      fullDescription: { en: `<p>Three bronze mermen kneel around a wide basin just outside Valletta's City Gate, holding up a giant metal disc — the Triton Fountain has been the unofficial front door to Malta's capital since the 1950s, and it's the first thing the group saw stepping into the city for Bon Voyage Season 3.</p><p>It's a brief moment in the show, more transition than destination, but it marks the start of what became one of the most visually striking legs of the whole series — golden limestone, baroque churches and Mediterranean light replacing the wood and water of the earlier Nordic seasons.</p>`,
        fr: `<p>Trois tritons de bronze agenouillés autour d'un large bassin, juste devant la porte de La Valette : la fontaine de Triton sert de porte d'entrée officieuse à la capitale maltaise depuis les années 1950, et c'est la première chose que le groupe a vue en arrivant en ville pour la saison 3 de Bon Voyage.</p><p>C'est un passage bref dans l'émission, davantage une transition qu'une destination en soi, mais il marque le début de l'un des segments les plus visuellement marquants de toute la série — la pierre calcaire dorée, les églises baroques et la lumière méditerranéenne remplaçant le bois et l'eau des saisons nordiques précédentes.</p>` },
      tip: { en: "The fountain is best photographed from across the bus terminus square in the early evening, when the limestone catches the golden light.", fr: "La fontaine se photographie le mieux depuis l'autre bout de la place du terminus de bus, en fin d'après-midi, quand la pierre calcaire capte la lumière dorée." },
      directions: { en: "The Triton Fountain sits directly outside Valletta's City Gate, at the main bus terminus — impossible to miss arriving into the city.", fr: "La fontaine de Triton se trouve juste devant la porte de La Valette, au niveau du terminus de bus principal — impossible de la manquer en arrivant en ville." } },

    { id: 26, name: "Upper Barrakka Gardens", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "292 Triq Sant' Orsla", lat: 35.8964, lng: 14.5155, img: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=600",
      fullDescription: { en: `<p>Perched on Valletta's highest bastion, Upper Barrakka Gardens looks straight out over the Grand Harbour toward the Three Cities, arches and statues framing a view that's been drawing visitors since the gardens opened to the public in the 19th century. The group stopped here to take it all in, cameras aimed less at each other than at the water below.</p><p>It's the kind of location Bon Voyage returns to again and again — not a set piece, just somewhere genuinely beautiful that the members were allowed to stand in and be quiet for a minute, which by Season 3 had become as much a part of the show's appeal as anything scripted.</p>`,
        fr: `<p>Perché sur le plus haut bastion de La Valette, le jardin d'Upper Barrakka domine le Grand Port et offre une vue directe sur les Trois Cités, entre arcades et statues qui attirent les visiteurs depuis l'ouverture du jardin au public au XIXe siècle. Le groupe s'y est arrêté pour contempler le paysage, les caméras davantage tournées vers l'eau en contrebas que les uns vers les autres.</p><p>C'est le genre de lieu vers lequel Bon Voyage revient sans cesse — pas un décor à proprement parler, juste un endroit sincèrement beau où les membres ont pu simplement s'arrêter et se taire un instant, ce qui, dès la saison 3, était devenu une part de l'attrait de l'émission au même titre que les séquences plus construites.</p>` },
      tip: { en: "Time your visit around noon or 4pm to catch the small ceremonial cannon firing from the Saluting Battery just below the gardens.", fr: "Prévoyez votre visite vers midi ou 16h pour assister au petit tir de canon cérémoniel depuis la Saluting Battery, juste en contrebas du jardin." },
      directions: { en: "A short walk uphill from the Triton Fountain and City Gate, or reachable by the Barrakka Lift directly from the waterfront below.", fr: "Une courte montée à pied depuis la fontaine de Triton et la porte de la ville, ou accessible directement depuis le front de mer par l'ascenseur Barrakka." } },

    { id: 27, name: "Cafe del Mar Malta", group: "BTS", member: "All", country: "Malta", city: "St Paul's Bay", category: "Bon Voyage", year: "2018", address: "Triq it-Turisti", lat: 35.9522, lng: 14.3986, img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
      fullDescription: { en: `<p>A seafront terrace built into the rocks of St Paul's Bay, Cafe del Mar is the kind of spot where the sun setting over the water does most of the work — string lights, low lounge seating, and the Mediterranean stretching out in front of you. The group came here to unwind after a day of sightseeing, dinner blurring into conversation as the sky went orange.</p><p>Bon Voyage rarely lingers on meals for long, but this stop got more breathing room than most — less an event than a genuine wind-down, the kind of evening that made this season feel, for a moment, like an actual holiday rather than a shoot.</p>`,
        fr: `<p>Terrasse en bord de mer construite à même les rochers de St Paul's Bay, Cafe del Mar est le genre d'endroit où le coucher de soleil sur l'eau fait déjà l'essentiel du travail — guirlandes lumineuses, assises basses façon lounge, et la Méditerranée qui s'étend juste devant. Le groupe y est venu se détendre après une journée de visites, le dîner se prolongeant en conversation tandis que le ciel virait à l'orange.</p><p>Bon Voyage s'attarde rarement longtemps sur les repas, mais cette étape a eu droit à plus de temps que la plupart — moins un événement filmé qu'un véritable moment de détente, le genre de soirée qui, l'espace d'un instant, a donné à cette saison des airs de vraies vacances plutôt que de tournage.</p>` },
      tip: { en: "Book a table facing the water well ahead for sunset — the terrace fills up fast on clear evenings.", fr: "Réservez une table côté mer bien à l'avance pour le coucher de soleil — la terrasse se remplit vite les soirs de beau temps." },
      directions: { en: "Located along the seafront promenade of St Paul's Bay, about a 25-minute drive or bus ride north of Valletta.", fr: "Situé sur la promenade du front de mer de St Paul's Bay, à environ 25 minutes en voiture ou en bus au nord de La Valette." } },

    { id: 28, name: "Mdina Old City", group: "BTS", member: "All", country: "Malta", city: "Mdina", category: "Bon Voyage", year: "2018", address: "Mdina", lat: 35.8872, lng: 14.4034, img: "https://images.unsplash.com/photo-1543832923-44667a44c804?w=600",
      fullDescription: { en: `<p>Malta's former capital earned its nickname, the Silent City, from the near-total quiet inside its honey-coloured walls — cars are barely allowed in, and the population within the fortifications numbers only a few hundred. The group wandered its narrow, curving streets in the late afternoon light, the kind of setting that barely needs a filter.</p><p>Fans of a certain other fantasy series will recognise these same streets from screen appearances of their own, but for BTS, Mdina's medieval alleys became the backdrop for some of the quietest, most unhurried footage of the whole Malta leg — no crowds to manage, just old stone and long shadows.</p>`,
        fr: `<p>L'ancienne capitale de Malte doit son surnom de « Cité du Silence » au calme quasi total qui règne à l'intérieur de ses remparts couleur miel — les voitures y sont presque totalement interdites, et la population à l'intérieur des fortifications ne compte que quelques centaines d'habitants. Le groupe a arpenté ses ruelles étroites et sinueuses dans la lumière de fin d'après-midi, un décor qui n'a presque pas besoin de filtre.</p><p>Les amateurs d'une certaine autre série fantastique reconnaîtront peut-être ces mêmes rues pour y avoir vu d'autres tournages, mais pour BTS, les ruelles médiévales de Mdina sont devenues le décor de certaines des images les plus calmes et les moins pressées de tout le passage à Malte — aucune foule à gérer, juste de la vieille pierre et de longues ombres.</p>` },
      tip: { en: "Visit in late afternoon once the day-trip crowds thin out — Mdina genuinely earns its name after about 5pm.", fr: "Visitez en fin d'après-midi une fois les groupes de touristes de passage repartis — Mdina mérite vraiment son nom après 17h environ." },
      directions: { en: "Buses run regularly from Valletta (around 40 minutes); cars must be left outside the city walls in the car park near the main gate.", fr: "Des bus circulent régulièrement depuis La Valette (environ 40 minutes) ; les voitures doivent être laissées à l'extérieur des remparts, sur le parking près de la porte principale." } },

    { id: 29, name: "St. John's Co-Cathedral", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "Triq San Gwann", lat: 35.8977, lng: 14.5136, img: "https://images.unsplash.com/photo-1543832923-44667a44c804?w=600",
      fullDescription: { en: `<p>From the outside, St. John's Co-Cathedral looks almost austere — a plain limestone façade typical of Valletta's defensive architecture. Step inside, and it's one of the most ornate baroque interiors in Europe, every inch of the ceiling gilded, the floor made entirely of inlaid marble tombstones. The group's visit here was one of the more solemn, wide-eyed stops of the season.</p><p>It's not a place built for a camera crew's convenience — quiet, dim, genuinely sacred — and the footage reflects that restraint, the members speaking in something closer to a whisper as they took in a building that took Baroque excess about as far as it can go.</p>`,
        fr: `<p>Vue de l'extérieur, la co-cathédrale Saint-Jean paraît presque austère — une façade de pierre calcaire sobre, typique de l'architecture défensive de La Valette. Une fois à l'intérieur, c'est l'un des intérieurs baroques les plus richement ornés d'Europe : chaque centimètre du plafond est doré, et le sol est entièrement composé de dalles funéraires incrustées de marbre. La visite du groupe ici a été l'une des étapes les plus solennelles et les plus impressionnées de la saison.</p><p>Ce n'est pas un lieu pensé pour le confort d'une équipe de tournage — silencieux, sombre, réellement sacré — et les images en gardent cette retenue, les membres s'exprimant presque à voix basse en découvrant un édifice qui pousse l'excès baroque aussi loin que possible.</p>` },
      tip: { en: "Photography is allowed but flash is strictly forbidden — bring a steady hand or a small tripod for the dim interior.", fr: "La photographie est autorisée mais le flash est strictement interdit — prévoyez un pouls stable ou un petit trépied pour l'intérieur peu éclairé." },
      directions: { en: "In the heart of Valletta, a short walk from the Triton Fountain and City Gate; modest dress covering shoulders and knees is required.", fr: "En plein cœur de La Valette, à quelques pas de la fontaine de Triton et de la porte de la ville ; une tenue couvrant épaules et genoux est exigée." } },

    { id: 30, name: "Valletta", group: "BTS", member: "All", country: "Malta", city: "Valletta", category: "Bon Voyage", year: "2018", address: "Valletta City Center", lat: 35.8989, lng: 14.5146, img: "https://images.unsplash.com/photo-1595776613215-fe04b78de7fc?w=600",
      fullDescription: { en: `<p>Beyond any single landmark, a good stretch of Bon Voyage Season 3 is really just the group loose in Valletta itself — a compact grid of grid-planned streets packed onto a peninsula, balconies painted in faded greens and blues, and the whole city small enough to properly explore on foot in a single afternoon.</p><p>It's this general wandering, more than any one filmed stop, that fans point to when they talk about Malta as one of the show's most rewatchable legs: no itinerary pressure, just seven people getting genuinely lost in a small European capital together.</p>`,
        fr: `<p>Au-delà de n'importe quel monument précis, une bonne partie de la saison 3 de Bon Voyage, c'est surtout le groupe livré à lui-même dans La Valette — un quadrillage compact de rues tracées au cordeau sur une péninsule, des balcons peints dans des verts et des bleus passés, et une ville assez petite pour être vraiment explorée à pied en un seul après-midi.</p><p>C'est cette flânerie générale, plus qu'un lieu de tournage précis, que les fans citent en premier lorsqu'ils évoquent Malte comme l'un des segments les plus revisionnés de l'émission : aucune pression d'itinéraire, juste sept personnes qui se perdent, ensemble, dans une petite capitale européenne.</p>` },
      tip: { en: "Republic Street runs the length of the peninsula and is the easiest spine to navigate from before ducking into side streets.", fr: "La Republic Street traverse toute la péninsule et constitue le repère le plus simple pour s'orienter avant de bifurquer dans les petites rues adjacentes." },
      directions: { en: "Valletta is fully walkable and largely pedestrianised; ferries also connect it directly to Sliema across the harbour.", fr: "La Valette se visite entièrement à pied et est en grande partie piétonne ; des ferries la relient aussi directement à Sliema, de l'autre côté du port." } },

    // ===== BON VOYAGE SAISON 4 — NOUVELLE-ZÉLANDE, 2019 =====
    { id: 31, name: "Lake Pukaki", group: "BTS", member: "All", country: "New Zealand", city: "Canterbury", category: "Bon Voyage", year: "2019", address: "Lake Pukaki", lat: -44.1667, lng: 170.1333, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>Lake Pukaki's turquoise water — coloured by fine glacial rock flour suspended in the melt — sits beneath Aoraki/Mount Cook in one of the emptiest, most dramatic stretches of New Zealand's South Island. The group camped near its shores for a night under a sky so clear and dark that the stars alone became the whole point of the stop.</p><p>Season 4 leaned hard into this kind of stillness — no cities, barely any people, just seven idols lying on their backs in the middle of nowhere trying to spot the Milky Way, which for a group whose entire life runs on schedules and stages, reads as close to a genuine holiday as the show ever got.</p>`,
        fr: `<p>Les eaux turquoise du lac Pukaki — teintées par une fine farine de roche glaciaire en suspension dans l'eau de fonte — s'étendent au pied du mont Aoraki/Cook, dans l'un des paysages les plus vastes et les plus spectaculaires de l'île du Sud néo-zélandaise. Le groupe a campé près de ses rives pour une nuit sous un ciel si clair et si sombre que les étoiles à elles seules justifiaient l'étape.</p><p>La saison 4 a pleinement assumé ce genre de calme — pas de ville, presque personne, juste sept idoles allongées sur le dos au milieu de nulle part, essayant de repérer la Voie lactée. Pour un groupe dont toute la vie tourne autour des plannings et des scènes, c'est sans doute ce que l'émission a produit de plus proche de vraies vacances.</p>` },
      tip: { en: "New Zealand's Mackenzie Basin around Lake Pukaki is an official Dark Sky Reserve — go on a moonless night for the best stargazing.", fr: "Le bassin de Mackenzie autour du lac Pukaki est une réserve de ciel étoilé officielle — privilégiez une nuit sans lune pour la meilleure observation." },
      directions: { en: "Best reached by rental car; the lake sits along State Highway 8, about a 3-hour drive from Christchurch.", fr: "Se rejoint le plus facilement en voiture de location ; le lac longe la route nationale 8, à environ 3 heures de route de Christchurch." } },

    { id: 32, name: "Mount Cook National Park", group: "BTS", member: "All", country: "New Zealand", city: "Canterbury", category: "Bon Voyage", year: "2019", address: "Aoraki / Mount Cook", lat: -43.7340, lng: 170.0963, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>Aoraki/Mount Cook is New Zealand's tallest peak, and the national park built around it is all glaciers, alpine lakes and hiking trails that end in views most people only see in wallpaper photos. The group set out on a guided walk and glacier tour here, a rare stretch of genuine physical effort on a show usually more about food and conversation.</p><p>It's one of the more logistically demanding stops the show has ever filmed, and it shows in the footage — real exhaustion, real awe, and a landscape too big for any of the usual Bon Voyage banter to compete with.</p>`,
        fr: `<p>L'Aoraki/mont Cook est le plus haut sommet de Nouvelle-Zélande, et le parc national qui l'entoure n'est que glaciers, lacs alpins et sentiers de randonnée qui débouchent sur des panoramas que la plupart des gens ne voient que sur des fonds d'écran. Le groupe y a enchaîné une randonnée guidée et une visite de glacier, un rare passage d'effort physique réel dans une émission d'habitude plus centrée sur la nourriture et la conversation.</p><p>C'est l'une des étapes les plus exigeantes logistiquement jamais filmées pour le programme, et ça se ressent à l'écran — une vraie fatigue, un vrai émerveillement, et un paysage trop immense pour que les habituelles plaisanteries de Bon Voyage puissent rivaliser.</p>` },
      tip: { en: "The Hooker Valley Track is the most accessible glacier-lake hike in the park and needs no technical gear, just sturdy shoes.", fr: "Le Hooker Valley Track est la randonnée vers un lac glaciaire la plus accessible du parc, sans matériel technique nécessaire, juste de bonnes chaussures." },
      directions: { en: "Mount Cook Village, the park's base, is about a 40-minute drive from Lake Pukaki along State Highway 80.", fr: "Le village de Mount Cook, point de départ du parc, se trouve à environ 40 minutes de route du lac Pukaki, sur la route 80." } },

    { id: 33, name: "Queenstown Skyline", group: "BTS", member: "All", country: "New Zealand", city: "Queenstown", category: "Bon Voyage", year: "2019", address: "Brecon Street", lat: -45.0343, lng: 168.6611, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>A gondola climbs steeply out of Queenstown to the Skyline complex, perched high above Lake Wakatipu with the Remarkables mountain range filling the horizon. The group rode up for the view, and stayed for the luge track — a set of small go-kart-like sleds that let you race down the mountain on a purpose-built concrete course.</p><p>The luge runs turned into one of the funniest, most competitive segments of the whole New Zealand leg, seven idols suddenly deadly serious about beating each other down a hill on what is essentially an adult go-kart for tourists.</p>`,
        fr: `<p>Un téléphérique grimpe abruptement au-dessus de Queenstown jusqu'au complexe Skyline, perché haut au-dessus du lac Wakatipu, avec la chaîne des Remarkables qui occupe tout l'horizon. Le groupe y est monté pour la vue, et y est resté pour la piste de luge — de petits chariots façon karting qui permettent de dévaler la montagne sur un circuit en béton conçu pour ça.</p><p>Les descentes en luge sont devenues l'un des passages les plus drôles et les plus compétitifs de tout le segment néo-zélandais, sept idoles soudain d'un sérieux absolu à l'idée de se battre les unes contre les autres sur ce qui n'est, au fond, qu'un karting pour touristes.</p>` },
      tip: { en: "Buy the gondola-plus-luge combo ticket — multiple luge rides are included and it's noticeably cheaper than paying separately.", fr: "Prenez le billet combiné téléphérique + luge — plusieurs descentes sont incluses et c'est nettement moins cher qu'en payant séparément." },
      directions: { en: "The Skyline gondola base station is a short walk from central Queenstown, right at the bottom of Brecon Street.", fr: "La station de départ du téléphérique Skyline se trouve à quelques pas du centre de Queenstown, tout en bas de Brecon Street." } },

    { id: 34, name: "Nevis Swing", group: "BTS", member: "All", country: "New Zealand", city: "Queenstown", category: "Bon Voyage", year: "2019", address: "Queenstown 9300", lat: -45.1685, lng: 168.7593, img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600",
      fullDescription: { en: `<p>Suspended over a remote canyon outside Queenstown, the Nevis Swing sends riders into a 300-metre freefall arc at speeds well over 100 km/h before the giant swing catches and carries them out over the gorge. Queenstown built its whole identity around this kind of thing, and Bon Voyage Season 4 wasn't going to pass through without making at least a few members do it.</p><p>What followed is some of the most purely reactive footage the show has ever captured — genuine screaming, genuine regret mid-fall, and genuine relief on landing, none of it remotely staged. It's the extreme-sports counterpoint to the quiet nights spent stargazing at Lake Pukaki, and together they sum up what made this season feel so different from the rest.</p>`,
        fr: `<p>Suspendu au-dessus d'un canyon isolé près de Queenstown, le Nevis Swing envoie ceux qui osent monter dans une chute libre en arc de 300 mètres à plus de 100 km/h, avant que la balançoire géante ne les rattrape et les emporte au-dessus des gorges. Queenstown a bâti toute son identité autour de ce genre d'activité, et la saison 4 de Bon Voyage n'allait pas passer par là sans y pousser au moins quelques membres.</p><p>Ce qui a suivi figure parmi les images les plus spontanément réactives jamais filmées pour l'émission — des cris authentiques, des regrets bien réels en plein vol, et un vrai soulagement à l'atterrissage, rien de tout ça n'étant le moins du monde mis en scène. C'est le pendant sports extrêmes des nuits calmes passées à observer les étoiles au lac Pukaki, et à eux deux, ces moments résument ce qui a rendu cette saison si différente des autres.</p>` },
      tip: { en: "Book well in advance during peak summer season (December–February) — the Nevis site has limited daily capacity.", fr: "Réservez bien à l'avance pendant la haute saison estivale (décembre–février) — le site du Nevis a une capacité journalière limitée." },
      directions: { en: "Reached by a dedicated shuttle from the AJ Hackett booking office in central Queenstown; the site itself is not accessible by private car.", fr: "Se rejoint par une navette dédiée depuis le bureau de réservation AJ Hackett au centre de Queenstown ; le site n'est pas accessible en voiture personnelle." } },

    // ===== LIEUX PERSONNELS =====
    { id: 35, name: "Cafe Magnate", group: "BTS", member: "Jimin", country: "South Korea", city: "Busan", category: "Cafe", year: "2019", address: "135 Jinnam-ro, Nam-gu", lat: 35.1379, lng: 129.1074, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
      fullDescription: { en: `<p>Cafe Magnate is owned and run by Jimin's father, tucked into a quiet stretch of Busan's Nam-gu district, well outside the usual fan-mapped circuit of Seoul cafés. It's an unassuming spot by design — coffee, simple desserts, and the kind of low-key neighbourhood atmosphere you'd expect from a family-run business rather than anything built for attention.</p><p>Fans who make the trip down from Seoul tend to describe the same thing: a place that feels genuinely local, run by someone who happens to be Jimin's father rather than a shrine to Jimin himself, which is exactly what gives it its particular charm.</p>`,
        fr: `<p>Cafe Magnate est tenu par le père de Jimin, niché dans un coin tranquille du quartier de Nam-gu à Busan, bien à l'écart du circuit habituel des cafés séoulites répertoriés par les fans. C'est un lieu volontairement discret — du café, des desserts simples, et l'ambiance de quartier posée que l'on attend d'un commerce familial plutôt que d'un endroit pensé pour attirer l'attention.</p><p>Les fans qui font le déplacement depuis Séoul décrivent souvent la même chose : un lieu qui paraît sincèrement local, tenu par quelqu'un qui se trouve être le père de Jimin plutôt qu'un sanctuaire dédié à Jimin lui-même — et c'est précisément ce qui en fait tout le charme.</p>` },
      tip: { en: "This is a working family business, not a fan attraction — keep visits brief and low-key out of respect for the owners and other customers.", fr: "C'est un commerce familial en activité, pas une attraction pour fans — restez brefs et discrets par respect pour les propriétaires et les autres clients." },
      directions: { en: "Located in Busan's Nam-gu district; a taxi from Busan Station takes around 20 minutes.", fr: "Situé dans le quartier de Nam-gu à Busan ; comptez environ 20 minutes en taxi depuis la gare de Busan." } },

    { id: 36, name: "Oldeugnseu (Oldeugns)", group: "BTS", member: "RM", country: "South Korea", city: "Seoul", category: "Cafe", year: "2022", address: "Seochon", lat: 37.5808, lng: 126.9700, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
      fullDescription: { en: `<p>Tucked into the low-rise, hanok-lined streets of Seochon — the quiet neighbourhood just west of Gyeongbokgung Palace that RM has been photographed exploring more than once — Oldeugns is a small, art-filled café that fits the area's unhurried, gallery-hopping character perfectly.</p><p>It's the kind of place that gets called a "Namjooning spot" among fans, a term for the specific genre of quiet, artistic, slightly off-the-beaten-path locations RM tends to gravitate toward on his own time. There's no performance to it — just good coffee in a neighbourhood built for wandering.</p>`,
        fr: `<p>Niché dans les rues basses et bordées de hanoks de Seochon — ce quartier tranquille juste à l'ouest du palais Gyeongbokgung que RM a été photographié en train d'explorer à plusieurs reprises — Oldeugns est un petit café rempli d'œuvres d'art qui colle parfaitement au caractère posé et propice à la flânerie entre galeries du quartier.</p><p>C'est le genre d'endroit que les fans qualifient de « spot Namjooning », un terme désignant ce style bien particulier de lieux calmes, artistiques et légèrement à l'écart des sentiers battus vers lesquels RM a tendance à se tourner pendant son temps libre. Rien n'y est mis en scène — juste du bon café dans un quartier fait pour flâner.</p>` },
      tip: { en: "Pair the visit with a walk through Seochon's gallery streets — several small independent art spaces sit within a few minutes' walk.", fr: "Combinez la visite avec une balade dans les rues à galeries de Seochon — plusieurs petits espaces d'art indépendants se trouvent à quelques minutes à pied." },
      directions: { en: "Take Line 3 to Gyeongbokgung Station (Exit 2) and walk about 10 minutes into the Seochon neighbourhood.", fr: "Prenez la ligne 3 jusqu'à la station Gyeongbokgung (sortie 2) et marchez environ 10 minutes dans le quartier de Seochon." } },

    { id: 37, name: "Cafe Hyuga", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2022", address: "16 Nonhyeon-ro 119-gil, Gangnam-gu", lat: 37.5133, lng: 127.0321, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
      fullDescription: { en: `<p>Cafe Hyuga occupies a small, minimalist space just off Nonhyeon-ro, on the exact same street where BTS's first cramped dorm once stood in their earliest years. Whether that's coincidence or a quiet nod to where it all started, it's a detail that hasn't gone unnoticed by long-time fans mapping the group's history.</p><p>The café itself keeps things simple — clean lines, filtered light, coffee taken seriously — the kind of understated spot that rewards fans who know exactly what street they're standing on and why it matters.</p>`,
        fr: `<p>Cafe Hyuga occupe un petit espace minimaliste juste à côté de Nonhyeon-ro, dans la rue exacte où se trouvait le tout premier dortoir exigu de BTS à leurs débuts. Coïncidence ou clin d'œil discret à leurs origines, c'est un détail qui n'a pas échappé aux fans de longue date qui retracent l'histoire du groupe sur la carte.</p><p>Le café en lui-même reste volontairement sobre — des lignes épurées, une lumière filtrée, du café pris au sérieux — le genre de lieu discret qui prend tout son sens pour les fans qui savent exactement dans quelle rue ils se trouvent et pourquoi elle compte.</p>` },
      tip: { en: "Combine this stop with the nearby first-dorm street for a short, walkable early-BTS history loop in one afternoon.", fr: "Combinez cette étape avec la rue du premier dortoir toute proche pour une petite boucle à pied sur les débuts de BTS, en une seule après-midi." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 10 minutes south into Nonhyeon-dong.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 10 minutes vers le sud, dans Nonhyeon-dong." } },

    // ===== CONCERTS =====
    { id: 38, name: "Gillette Stadium", group: "BTS", member: "All", country: "USA", city: "Foxborough, MA", category: "Concerts", year: "2026", episode: "World Tour 'ARIRANG'", address: "1 Patriot Pl", lat: 42.0909, lng: -71.2643, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Gillette Stadium, home turf of the New England Patriots just outside Boston, turned into a sea of purple light banners for one of the East Coast stops on the 2026 "ARIRANG" World Tour — the group's first full-scale stadium run since completing their military service, and it showed in the sheer scale of everything from the staging to the setlist.</p><p>For fans who'd waited years for exactly this, a stadium this size wasn't just a venue, it was proof: seven members, one stage, sixty-some thousand people who'd bought tickets the moment they went on sale.</p>`,
        fr: `<p>Le Gillette Stadium, terrain des New England Patriots juste à l'extérieur de Boston, s'est transformé en une mer de bannières lumineuses violettes pour l'une des étapes de la côte Est de la tournée mondiale « ARIRANG » de 2026 — la première tournée en stade à pleine échelle du groupe depuis la fin de leur service militaire, et cela s'est ressenti dans l'ampleur de tout, de la scénographie à la setlist.</p><p>Pour les fans qui avaient attendu des années pour exactement ce moment, un stade de cette taille n'était pas qu'une simple salle de concert : c'était une preuve — sept membres, une seule scène, et une soixantaine de milliers de personnes qui avaient acheté leur billet dès l'ouverture de la vente.</p>` },
      tip: { en: "Gillette Stadium's parking lots open early and tailgating is common practice — arriving a few hours ahead gets you the full pre-show atmosphere.", fr: "Les parkings du Gillette Stadium ouvrent tôt et le tailgating (pique-nique avant le concert) y est courant — arriver quelques heures en avance permet de profiter pleinement de l'ambiance d'avant-concert." },
      directions: { en: "Gillette Stadium is about 30 miles southwest of Boston; on show nights, MBTA runs special event trains directly to the venue from South Station.", fr: "Le Gillette Stadium se trouve à environ 50 km au sud-ouest de Boston ; les soirs de concert, le MBTA met en place des trains spéciaux directement depuis South Station." } },

    { id: 39, name: "SoFi Stadium", group: "BTS", member: "All", country: "USA", city: "Inglewood, CA", category: "Concerts", year: "2026", episode: "World Tour 'ARIRANG'", address: "1001 Stadium Dr", lat: 33.9535, lng: -118.3392, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>SoFi Stadium's enormous suspended video board — a signature of the venue since it opened — turned the "ARIRANG" tour's West Coast stop into one of the visually biggest nights of the entire run, its curved screen wrapping the whole crowd in the same imagery at once.</p><p>Los Angeles shows have always carried a specific weight for BTS, going back to earlier tours that helped establish just how far their fanbase in the US actually reached, and this stop continued that history on one of the most technologically advanced stages the tour played all year.</p>`,
        fr: `<p>L'immense écran vidéo suspendu de SoFi Stadium — signature du lieu depuis son ouverture — a transformé l'étape ouest de la tournée « ARIRANG » en l'une des soirées les plus impressionnantes visuellement de toute la tournée, son écran incurvé enveloppant tout le public dans les mêmes images en simultané.</p><p>Les concerts à Los Angeles ont toujours eu un poids particulier pour BTS, depuis les tournées précédentes qui avaient contribué à révéler l'ampleur réelle de leur fanbase aux États-Unis, et cette étape a prolongé cette histoire sur l'une des scènes les plus techniquement avancées de toute la tournée.</p>` },
      tip: { en: "SoFi Stadium sits within the larger Hollywood Park complex — arrive early to explore the plaza and food options before doors open.", fr: "SoFi Stadium se trouve au sein du complexe Hollywood Park — arrivez en avance pour profiter de l'esplanade et des stands de restauration avant l'ouverture des portes." },
      directions: { en: "Located in Inglewood; the Metro K Line's Downtown Inglewood station is about a 15-minute walk from the stadium.", fr: "Situé à Inglewood ; la station Downtown Inglewood de la ligne K du métro se trouve à environ 15 minutes à pied du stade." } },

    { id: 40, name: "Stade de France", group: "BTS", member: "All", country: "France", city: "Saint-Denis", category: "Concerts", year: "2026", episode: "World Tour 'ARIRANG'", address: "ZAC du Cornillon Nord", lat: 48.9244, lng: 2.3601, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>The Stade de France stop marked the European leg of the "ARIRANG" World Tour, filling France's national stadium with a crowd that had clearly been counting down since the date was first announced. It's a venue built for football finals and Olympic ceremonies, and for one night it belonged entirely to seven idols and an ocean of ARMY Bombs.</p><p>Paris shows have their own distinct flavour — multilingual chanting, a crowd that skews heavily international given the city's status as a European hub — and Saint-Denis's stadium gave that energy the biggest possible room to expand into.</p>`,
        fr: `<p>L'étape du Stade de France a marqué le passage européen de la tournée mondiale « ARIRANG », remplissant le stade national français d'une foule qui comptait manifestement les jours depuis l'annonce de la date. C'est une enceinte construite pour les finales de football et les cérémonies olympiques, et le temps d'une soirée, elle a appartenu entièrement à sept idoles et à un océan d'ARMY Bombs.</p><p>Les concerts parisiens ont leur propre saveur — des chants multilingues, un public fortement international compte tenu du statut de la ville comme carrefour européen — et le stade de Saint-Denis a offert à cette énergie le plus grand espace possible pour s'exprimer.</p>` },
      tip: { en: "The RER B and D lines both serve the stadium directly — public transport is strongly recommended over driving on concert nights due to heavy traffic.", fr: "Les lignes RER B et D desservent toutes deux le stade directement — les transports en commun sont fortement recommandés plutôt que la voiture les soirs de concert, en raison d'une circulation dense." },
      directions: { en: "Take RER B or D to Saint-Denis - Stade de France station; the stadium entrance is a short walk from the platform.", fr: "Prenez le RER B ou D jusqu'à la station Saint-Denis - Stade de France ; l'entrée du stade se trouve à quelques pas du quai." } },

    { id: 41, name: "Allegiant Stadium", group: "BTS", member: "All", country: "USA", city: "Las Vegas", category: "Concerts", year: "2022", episode: "Permission to Dance On Stage", address: "3333 Al Davis Way", lat: 36.0909, lng: -115.1833, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Before the hiatus, before the military enlistments, the "Permission to Dance On Stage" residency at Allegiant Stadium was the last time fans saw the full group perform together in the US for years — four nights that, in hindsight, carry a very different weight than they did at the time.</p><p>Las Vegas leaned into the occasion with its usual excess: the whole city seemed to know a show was happening, hotel marquees lit up in tribute, and fans flew in from every time zone for what nobody quite realised yet would become such a significant closing chapter.</p>`,
        fr: `<p>Avant la pause, avant les incorporations au service militaire, la résidence « Permission to Dance On Stage » à l'Allegiant Stadium a été la dernière fois où les fans ont vu le groupe complet se produire ensemble aux États-Unis pendant plusieurs années — quatre soirs qui, avec le recul, portent un tout autre poids qu'à l'époque.</p><p>Las Vegas a joué le jeu avec son excès habituel : toute la ville semblait savoir qu'un concert avait lieu, les enseignes des hôtels s'illuminaient en hommage, et des fans ont pris l'avion depuis tous les fuseaux horaires pour ce que personne ne savait encore devenir un chapitre de clôture aussi marquant.</p>` },
      tip: { en: "Allegiant Stadium is a short rideshare from the Strip — factor in extra time for exit traffic, which is notoriously heavy after Vegas shows.", fr: "L'Allegiant Stadium se trouve à une courte course de VTC depuis le Strip — prévoyez du temps supplémentaire pour la sortie, réputée très chargée après les concerts à Vegas." },
      directions: { en: "Located just west of the Las Vegas Strip; free shuttle buses typically run from designated Strip pick-up points on event nights.", fr: "Situé juste à l'ouest du Strip de Las Vegas ; des navettes gratuites circulent généralement depuis des points de collecte dédiés sur le Strip les soirs d'événement." } },

    { id: 42, name: "Seoul Olympic Stadium", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Concerts", year: "2022", episode: "Permission to Dance On Stage", address: "25 Olympic-ro, Songpa-gu", lat: 37.5153, lng: 127.0730, img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      fullDescription: { en: `<p>Built for the 1988 Summer Olympics, Seoul Olympic Stadium hosted the homecoming leg of "Permission to Dance On Stage" — the group performing on Korean soil for a home crowd just weeks after wrapping the Las Vegas shows, closing out that chapter of the group's history exactly where it began.</p><p>There's a particular charge to a hometown stadium show that nothing overseas quite replicates: family in the crowd, a setlist that leaned into the group's earliest work, and sixty-thousand-plus voices singing back in Korean without needing a single subtitle.</p>`,
        fr: `<p>Construit pour les Jeux olympiques d'été de 1988, le stade olympique de Séoul a accueilli l'étape du retour au pays de « Permission to Dance On Stage » — le groupe se produisant sur le sol coréen devant son public national, quelques semaines seulement après avoir bouclé les concerts de Las Vegas, refermant ce chapitre de leur histoire exactement là où tout avait commencé.</p><p>Il y a une intensité particulière à un concert dans le stade de sa propre ville, que rien à l'étranger ne reproduit vraiment : de la famille dans le public, une setlist qui puisait dans les tout premiers titres du groupe, et plus de soixante mille voix qui chantaient en retour, en coréen, sans avoir besoin du moindre sous-titre.</p>` },
      tip: { en: "The stadium sits within the Seoul Sports Complex, a short walk from Jamsil's shopping and dining strip — easy to combine with a full day out.", fr: "Le stade se trouve au sein du complexe sportif de Séoul, à quelques pas des rues commerçantes et restaurants de Jamsil — facile à combiner avec une journée complète sur place." },
      directions: { en: "Take Line 2 or the Bundang Line to Sports Complex Station (Exit 1 or 3), directly adjacent to the stadium.", fr: "Prenez la ligne 2 ou la ligne Bundang jusqu'à la station Sports Complex (sortie 1 ou 3), juste à côté du stade." } },

    // ===== NOUVEAUX LIEUX (recherche complémentaire) =====
    { id: 43, name: "HYBE Headquarters", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2021", address: "42 Hangang-daero, Yongsan-gu", lat: 37.5297, lng: 126.9648, img: "https://images.unsplash.com/photo-1546874177-9e664107314e?w=600",
      fullDescription: { en: `<p>HYBE's glass-and-steel headquarters in Yongsan is the clearest physical marker of just how far BTS has taken their agency — a sleek, modern tower that stands in almost comic contrast to the cramped Gangnam offices the group started out in barely a decade earlier.</p><p>Visitors can't get inside without a scheduled event, but that hasn't stopped fans from gathering out front for photos, especially around member birthdays or big anniversaries, when the surrounding streets tend to fill with pop-up cafés, cup-sleeve events and banners paid for by fan clubs from around the world.</p>`,
        fr: `<p>Le siège de HYBE à Yongsan, tout en verre et en acier, est le marqueur le plus visible du chemin parcouru par BTS avec leur agence — une tour moderne et épurée qui contraste presque comiquement avec les bureaux exigus de Gangnam où le groupe a débuté à peine dix ans plus tôt.</p><p>Impossible d'entrer sans événement programmé, mais cela n'empêche pas les fans de se rassembler devant pour des photos, surtout autour des anniversaires des membres ou des grandes dates commémoratives, quand les rues alentour se remplissent de cafés éphémères, d'événements "cup-sleeve" et de banderoles financées par des fan clubs du monde entier.</p>` },
      tip: { en: "Check fan community boards before visiting — the surrounding cafés often run limited-time BTS-themed events tied to specific members' birthdays.", fr: "Consultez les forums de fans avant de vous y rendre — les cafés alentour organisent souvent des événements temporaires sur le thème de BTS, liés aux anniversaires de membres précis." },
      directions: { en: "A short walk from Seoul Station or Yongsan Station; both are served by multiple subway lines and the KTX high-speed rail.", fr: "À quelques minutes à pied de la gare de Séoul ou de la gare de Yongsan ; toutes deux desservies par plusieurs lignes de métro et le KTX." } },

    { id: 44, name: "Yoojung Sikdang", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2013", address: "Sinsa-dong, Gangnam-gu", lat: 37.5145, lng: 127.0223, img: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600",
      fullDescription: { en: `<p>Long before sold-out stadiums, the seven members were broke trainees eating wherever their small budget could stretch, and Yoojung Sikdang — a modest, family-run diner a few blocks from their old agency office — became their go-to. The owner, an "ajumma" in the truest, warmest sense of the word, would often feed them for free or slip extra side dishes onto the table when she knew money was tight.</p><p>The restaurant's signature black pork dolsot bibimbap remains exactly what it was back then: simple, filling, and served in the same unpretentious room. Once BTS made it big, the owner became one of their most devoted supporters, and the diner has since become something close to a pilgrimage site — a reminder that global superstardom started with a hot stone bowl and a woman who believed in seven hungry kids.</p>`,
        fr: `<p>Bien avant les stades complets, les sept membres étaient des trainees fauchés qui mangeaient là où leur maigre budget le permettait, et Yoojung Sikdang — une modeste gargote familiale à quelques rues de leur ancienne agence — est devenue leur cantine de prédilection. La patronne, une "ajumma" au sens le plus chaleureux du terme, les nourrissait souvent gratuitement ou glissait des plats d'accompagnement supplémentaires sur la table quand elle savait l'argent rare.</p><p>Le bibimbap au porc noir servi dans un bol de pierre chaude, plat signature du restaurant, reste exactement ce qu'il était à l'époque : simple, copieux, servi dans la même salle sans prétention. Une fois BTS devenu un phénomène mondial, la patronne est devenue l'une de leurs plus fidèles admiratrices, et la gargote est depuis devenue un véritable lieu de pèlerinage — un rappel que la célébrité mondiale a commencé avec un bol de pierre chaude et une femme qui croyait en sept jeunes affamés.</p>` },
      tip: { en: "This is a small, working neighborhood restaurant, not a themed attraction — go hungry, order the dolsot bibimbap, and be respectful of other diners.", fr: "C'est un petit restaurant de quartier en activité, pas une attraction à thème — venez avec de l'appétit, commandez le dolsot bibimbap, et restez respectueux envers les autres clients." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 10 minutes into Sinsa-dong.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 10 minutes dans Sinsa-dong." } },

    { id: 45, name: "Gwanghwamun Square", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2026", address: "Gwanghwamun Square, Jongno-gu", lat: 37.5759, lng: 126.9769, img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=600",
      fullDescription: { en: `<p>Framed by the towering Gwanghwamun Gate and the mountains rising behind Gyeongbokgung Palace, this vast public square sits at the historic and symbolic heart of Seoul — which is exactly why BTS chose it for a free open-air performance in 2026, turning one of Korea's most traditional spaces into a stage for one of its most modern success stories.</p><p>Standing here, it's easy to understand the choice: centuries of royal history stretching out behind a crowd of tens of thousands, all gathered for a group that has become, in its own way, a national landmark too.</p>`,
        fr: `<p>Encadrée par l'imposante porte Gwanghwamun et les montagnes qui s'élèvent derrière le palais Gyeongbokgung, cette vaste place publique se trouve au cœur historique et symbolique de Séoul — c'est précisément pour cela que BTS l'a choisie pour un concert gratuit en plein air en 2026, transformant l'un des espaces les plus traditionnels de Corée en scène pour l'une de ses réussites les plus modernes.</p><p>En se tenant ici, le choix se comprend aisément : des siècles d'histoire royale qui s'étendent derrière une foule de dizaines de milliers de personnes, toutes réunies pour un groupe devenu, à sa manière, un monument national à part entière.</p>` },
      tip: { en: "Go at sunrise before the crowds arrive — the light on the gate and the mountains behind it is best in the early morning.", fr: "Allez-y au lever du soleil avant l'arrivée de la foule — la lumière sur la porte et les montagnes en arrière-plan est la plus belle tôt le matin." },
      directions: { en: "Take Line 5 or Line 3 to Gwanghwamun Station, which opens directly onto the square.", fr: "Prenez la ligne 5 ou la ligne 3 jusqu'à la station Gwanghwamun, qui débouche directement sur la place." } },

    { id: 46, name: "HiKR Ground", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "MV Location", year: "2025", address: "Gwanghwamun area, Jongno-gu", lat: 37.5700, lng: 126.9850, img: "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600",
      fullDescription: { en: `<p>HiKR Ground is an interactive K-culture center built around a wildly specific idea: letting ordinary visitors step onto real studio sets — a subway car, a mock space station, a coin laundromat — and shoot their own music-video-style footage, complete with adjustable lighting and camera angles.</p><p>For fans who've spent years watching BTS work behind the scenes on MV shoots, the appeal is obvious: it's a rare chance to stand in front of the same kind of set, camera in hand, and get a small taste of what a day on a K-pop shoot actually feels like.</p>`,
        fr: `<p>HiKR Ground est un centre interactif dédié à la culture coréenne, construit autour d'une idée aussi précise qu'originale : permettre à n'importe quel visiteur de s'installer sur de vrais décors de studio — une rame de métro, une fausse station spatiale, une laverie automatique — pour tourner ses propres images façon clip musical, avec éclairage et angles de caméra réglables.</p><p>Pour les fans qui ont passé des années à regarder BTS travailler en coulisses sur des tournages de clips, l'attrait est évident : c'est l'occasion rare de se tenir devant le même genre de décor, caméra en main, et de goûter un peu à ce que représente une journée de tournage K-pop.</p>` },
      tip: { en: "Book your studio session slot online in advance — the most popular sets fill up quickly, especially on weekends.", fr: "Réservez votre créneau de studio en ligne à l'avance — les décors les plus populaires se remplissent vite, surtout le week-end." },
      directions: { en: "Located near Gwanghwamun Square; take Line 5 or Line 3 to Gwanghwamun Station and follow signs.", fr: "Situé près de la place Gwanghwamun ; prenez la ligne 5 ou la ligne 3 jusqu'à la station Gwanghwamun et suivez les panneaux." } },

    { id: 47, name: "The Min's", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2014", address: "14 Dosan-daero 28-gil, Gangnam-gu", lat: 37.5230, lng: 127.0350, img: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600",
      fullDescription: { en: `<p>Tucked into the Apgujeong-dong side streets, The Min's is run by Lee Chang-min — a member of the K-pop duo Homme and former 2AM member — and has quietly built up a wall of BTS photos, autographs and handwritten notes from years of visits by the group.</p><p>The café's signature drinks, fresh-squeezed lemonade and cherryade, are what members are usually pictured enjoying, and the small, homey space still feels more like a friend's living room than a fan attraction, which is exactly its charm.</p>`,
        fr: `<p>Niché dans les petites rues d'Apgujeong-dong, The Min's est tenu par Lee Chang-min — membre du duo K-pop Homme et ancien membre de 2AM — et a discrètement accumulé au fil des années un mur de photos, d'autographes et de mots manuscrits laissés par le groupe lors de ses visites.</p><p>Les boissons signature du café, citronnade et cherryade fraîchement pressées, sont ce que les membres sont généralement photographiés en train de savourer, et ce petit espace chaleureux ressemble encore davantage au salon d'un ami qu'à une attraction pour fans — ce qui fait justement tout son charme.</p>` },
      tip: { en: "Order the fresh cherryade — it's the drink most often seen in the members' own photos from their visits here.", fr: "Commandez le cherryade frais — c'est la boisson que l'on voit le plus souvent sur les photos des membres prises lors de leurs visites ici." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 8 minutes through the Dosan-daero side streets.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 8 minutes dans les petites rues de Dosan-daero." } },

    { id: 48, name: "Giani's Napoli", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018", address: "Garosu-gil, Gangnam-gu", lat: 37.5205, lng: 127.0234, img: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600",
      fullDescription: { en: `<p>Along the tree-lined boutiques of Garosu-gil sits Giani's Napoli, a wood-fired pizza spot known for traditional Italian technique and unfussy, high-quality ingredients — and, among fans, as one of Jin's regular stops when catching up with friends.</p><p>There's nothing flashy about the choice: it's simply good pizza in a good neighbourhood, which tracks with everything Jin has said over the years about preferring quiet, unpretentious spots over anything designed to be seen at.</p>`,
        fr: `<p>Le long des boutiques bordées d'arbres de Garosu-gil se trouve Giani's Napoli, une pizzeria au four à bois reconnue pour sa technique italienne traditionnelle et ses ingrédients de qualité sans chichi — et, chez les fans, comme l'une des adresses régulières de Jin lorsqu'il retrouve des amis.</p><p>Le choix n'a rien de tape-à-l'œil : c'est simplement une bonne pizza dans un bon quartier, ce qui correspond en tout point à ce que Jin a toujours dit préférer — des endroits tranquilles et sans prétention plutôt que des lieux pensés pour se faire remarquer.</p>` },
      tip: { en: "Garosu-gil gets busy on weekends — a weekday lunch is the easiest way to get a table without waiting.", fr: "Garosu-gil est très fréquenté le week-end — un déjeuner en semaine reste le moyen le plus simple d'obtenir une table sans attendre." },
      directions: { en: "Take Line 3 to Sinsa Station (Exit 8) and walk about 7 minutes into Garosu-gil.", fr: "Prenez la ligne 3 jusqu'à la station Sinsa (sortie 8) et marchez environ 7 minutes dans Garosu-gil." } },

    { id: 49, name: "MMCA Seoul", group: "BTS", member: "RM", country: "South Korea", city: "Seoul", category: "Museums", year: "2020", address: "30 Samcheong-ro, Jongno-gu", lat: 37.5786, lng: 126.9800, img: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600",
      fullDescription: { en: `<p>The National Museum of Modern and Contemporary Art's Seoul branch sits in a former Defense Security Command building near Gyeongbokgung, its galleries wrapped around an open courtyard that blends old military architecture with clean, modern exhibition space.</p><p>RM's well-documented love of contemporary art has made this one of his most frequently mentioned haunts, and fans who trace his "Namjooning" trail through the city almost always end up here — wandering the same rotating exhibitions at their own pace, the way he's said he prefers to experience a museum.</p>`,
        fr: `<p>L'antenne séoulite du Musée national d'art moderne et contemporain occupe un ancien bâtiment du Commandement de la sécurité de la défense près de Gyeongbokgung, ses galeries organisées autour d'une cour ouverte qui marie architecture militaire ancienne et espaces d'exposition modernes et épurés.</p><p>L'amour bien documenté de RM pour l'art contemporain en a fait l'un de ses repaires les plus souvent cités, et les fans qui suivent sa trace "Namjooning" à travers la ville y échouent presque toujours — errant au même rythme que lui parmi les expositions temporaires, exactement comme il dit préférer découvrir un musée.</p>` },
      tip: { en: "Check the current exhibition schedule before visiting — the rotating program means the specific artworks on view change several times a year.", fr: "Vérifiez le programme d'exposition en cours avant votre visite — les œuvres présentées changent plusieurs fois par an au gré de la programmation." },
      directions: { en: "Take Line 3 to Anguk Station (Exit 1) and walk about 10 minutes toward Samcheong-dong.", fr: "Prenez la ligne 3 jusqu'à la station Anguk (sortie 1) et marchez environ 10 minutes en direction de Samcheong-dong." } },

    { id: 50, name: "K-Star Road", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2016", address: "Apgujeong-ro, Gangnam-gu", lat: 37.5273, lng: 127.0409, img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=600",
      fullDescription: { en: `<p>A stretch of Apgujeong lined with over a dozen large, stylized bear statues — GangnamDol — each one decorated in the colours and motifs of a different K-pop act, from BTS and EXO to Super Junior and SHINee. The BTS bear, wrapped in the group's signature branding, has become a reliable photo stop for fans making their way between the neighbourhood's cafés and agency buildings.</p><p>It's more playful than solemn, and that's rather the point: K-Star Road exists as a piece of public, shareable fandom, a street-level monument built for exactly the kind of pilgrimage this guide is meant to help with.</p>`,
        fr: `<p>Un tronçon d'Apgujeong bordé d'une dizaine de grandes statues d'ours stylisées — les GangnamDol — chacune décorée aux couleurs et motifs d'un groupe de K-pop différent, de BTS et EXO à Super Junior et SHINee. L'ours BTS, habillé aux couleurs emblématiques du groupe, est devenu un arrêt photo incontournable pour les fans qui se déplacent entre les cafés et les bâtiments d'agences du quartier.</p><p>C'est plus ludique que solennel, et c'est bien tout l'intérêt : K-Star Road existe comme un morceau de fandom public et partageable, un monument à hauteur de rue conçu exactement pour le genre de pèlerinage que ce guide entend accompagner.</p>` },
      tip: { en: "The statues are spread over several blocks — walk the full stretch rather than just stopping at one to spot bears for other groups too.", fr: "Les statues s'étendent sur plusieurs pâtés de maisons — parcourez toute la rue plutôt que de vous arrêter à une seule pour repérer aussi les ours des autres groupes." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 2); the road starts a short walk from the station.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo (sortie 2) ; la rue commence à quelques pas de la station." } },

    { id: 51, name: "Achasan Mountain", group: "BTS", member: "RM", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2016", address: "Achasan, Gwangjin-gu", lat: 37.5556, lng: 127.1067, img: "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=600",
      fullDescription: { en: `<p>Achasan is a modest mountain in eastern Seoul, its main claim to fame among ARMY being the punishment hike RM and V were forced into after losing a Run BTS challenge — dragging themselves up the trail grumbling the entire way, only to go quiet once the sunrise view of the Han River and the city skyline opened up in front of them.</p><p>The members have brought it up fondly enough since that it's become shorthand among fans for a very specific kind of memory: something that felt like a punishment in the moment and turned into something closer to a gift in hindsight.</p>`,
        fr: `<p>Achasan est une montagne modeste à l'est de Séoul, connue chez les ARMY surtout pour la randonnée punitive imposée à RM et V après avoir perdu un défi de Run BTS — traînant les pieds sur le sentier en grommelant tout du long, avant de se taire d'un coup lorsque le lever de soleil sur le fleuve Han et les toits de la ville s'est ouvert devant eux.</p><p>Les membres en ont reparlé depuis avec assez d'affection pour que ce moment soit devenu, chez les fans, le raccourci d'un souvenir bien précis : quelque chose qui ressemblait à une punition sur le moment, et qui s'est révélé plus proche d'un cadeau avec le recul.</p>` },
      tip: { en: "Start the climb before dawn if you want the same sunrise view the members got — the trailhead gets busy with local hikers by mid-morning.", fr: "Démarrez l'ascension avant l'aube si vous voulez le même lever de soleil que les membres — le départ du sentier se remplit de randonneurs locaux en milieu de matinée." },
      directions: { en: "Take Line 5 to Achasan Station (Exit 2) and follow signs toward the main trailhead, about a 15-minute walk.", fr: "Prenez la ligne 5 jusqu'à la station Achasan (sortie 2) et suivez les panneaux vers le départ principal du sentier, à environ 15 minutes à pied." } },

    // ===== NOUVEAUX LIEUX (recherche complémentaire, session suivante) =====
    { id: 52, name: "Hakdong Park", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013", address: "Hakdong-ro, Gangnam-gu", lat: 37.5151, lng: 127.0327, img: "https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600",
      fullDescription: { en: `<p>Hakdong Park is a small, unremarkable neighbourhood green space in Gangnam — the kind of place you'd walk past without a second glance if you didn't know its history. During BTS's trainee years, when their first dorm and practice studio both sat within a few minutes' walk, this park was where the members actually decompressed: sitting on benches after long practice sessions, eating convenience-store snacks, occasionally sneaking in a nap.</p><p>It has no plaque, no mural, nothing marking it as significant — which is exactly why fans who track down the exact bench or the exact tree from an old trainee-era photo tend to describe the visit as one of the more moving stops on a Seoul itinerary. It's ordinary in a way that makes the years of work that happened around it feel very real.</p>`,
        fr: `<p>Hakdong Park est un petit espace vert de quartier sans prétention à Gangnam — le genre d'endroit devant lequel on passerait sans un regard si l'on n'en connaissait pas l'histoire. Durant les années de stagiaires de BTS, alors que leur premier dortoir et leur studio de répétition se trouvaient tous deux à quelques minutes à pied, ce parc était l'endroit où les membres décompressaient vraiment : assis sur des bancs après de longues séances de répétition, grignotant des snacks de supérette, s'accordant parfois une sieste.</p><p>Il n'y a ni plaque ni fresque, rien qui le signale comme significatif — c'est précisément pour ça que les fans qui retrouvent le banc exact ou l'arbre exact d'une vieille photo d'époque décrivent souvent leur visite comme l'une des étapes les plus émouvantes d'un itinéraire à Séoul. C'est un lieu ordinaire d'une façon qui rend très concrètes les années de travail qui s'y sont jouées tout autour.</p>` },
      tip: { en: "There's little to see here in the traditional sense — treat it as a quiet five-minute pause between the old dorm and Yoojung Sikdang rather than a standalone destination.", fr: "Il n'y a pas grand-chose à voir ici au sens classique — considérez-le comme une pause tranquille de cinq minutes entre l'ancien dortoir et Yoojung Sikdang plutôt qu'une destination à part entière." },
      directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station and walk about 10 minutes south; the park sits between the old dorm street and Yoojung Sikdang.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo et marchez environ 10 minutes vers le sud ; le parc se trouve entre la rue de l'ancien dortoir et Yoojung Sikdang." } },

    { id: 53, name: "Laundry Pizza", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2015", address: "Sinsa-dong, Gangnam-gu", lat: 37.5178, lng: 127.0201, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
      fullDescription: { en: `<p>Decorated to look exactly like what its name promises — vintage washing machines built into the walls, laundry baskets repurposed as light fixtures — this Gangnam pizzeria became a permanent part of BTS lore the moment it was chosen as the backdrop for the group's photoshoot for The Most Beautiful Moment in Life, Pt.2 (the "Her" version), all soft lighting and oversized sweaters against the laundromat kitsch.</p><p>The pizza itself is genuinely good, which helps, but most visitors are really there to stand in the same corner booth from the album photos, tracing the exact angle the camera used, before ordering something to justify the table.</p>`,
        fr: `<p>Décorée exactement comme son nom le promet — de vieilles machines à laver encastrées dans les murs, des paniers à linge reconvertis en luminaires — cette pizzeria de Gangnam est entrée durablement dans la légende de BTS le jour où elle a été choisie comme décor pour le photoshoot de l'album The Most Beautiful Moment in Life, Pt.2 (version « Her »), lumière douce et pulls surdimensionnés sur fond de kitsch de laverie.</p><p>La pizza est réellement bonne, ce qui aide, mais la plupart des visiteurs viennent surtout se poster dans le même coin banquette que sur les photos de l'album, en retrouvant l'angle exact de la caméra, avant de commander quelque chose pour justifier la table.</p>` },
      tip: { en: "The corner booth used in the photoshoot is the most requested table — arrive off-peak (early afternoon) if you specifically want to sit there.", fr: "La banquette d'angle utilisée pour le photoshoot est la table la plus demandée — venez en heure creuse (début d'après-midi) si vous tenez à vous y installer." },
      directions: { en: "Located in the Sinsa-dong backstreets, about a 10-minute walk from Sinsa Station (Line 3, Exit 8).", fr: "Situé dans les petites rues de Sinsa-dong, à environ 10 minutes à pied de la station Sinsa (ligne 3, sortie 8)." } },

    { id: 54, name: "Yongin Daejanggeum Park", group: "BTS", member: "SUGA", country: "South Korea", city: "Yongin", category: "MV Location", year: "2020", episode: "Agust D — Daechwita", address: "birobong-ro 507beon-gil, Yongin", lat: 37.2761, lng: 127.2044, img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600",
      fullDescription: { en: `<p>Built originally as a historical drama set — its hanok streets, royal court halls and traditional gates have hosted countless K-dramas over the years — Yongin Daejanggeum Park became something else entirely when SUGA chose it as the setting for his solo track "Daechwita" under his Agust D alias, reimagining himself as a rebellious king striding through the palace grounds in a video that ranks among the most stylish things BTS has ever put out individually.</p><p>Walking the same courtyards now, it's easy to see why it worked: the architecture is imposing enough to hold its own against SUGA's presence, and the video's blend of traditional Korean aesthetics with a thoroughly modern, defiant energy is baked right into the location itself.</p>`,
        fr: `<p>Construit à l'origine comme décor de drama historique — ses rues de hanoks, ses salles de cour royale et ses portes traditionnelles ont accueilli d'innombrables K-dramas au fil des années — le parc Daejanggeum de Yongin est devenu tout autre chose lorsque SUGA l'a choisi comme cadre de son titre solo « Daechwita », sous son alias Agust D, se réinventant en roi rebelle arpentant les allées du palais dans un clip qui compte parmi les plus stylés jamais sortis individuellement par un membre de BTS.</p><p>En parcourant aujourd'hui les mêmes cours, on comprend facilement pourquoi ça fonctionne : l'architecture est assez imposante pour tenir tête à la présence de SUGA, et le mélange d'esthétique coréenne traditionnelle et d'énergie résolument moderne et frondeuse du clip est en quelque sorte inscrit dans le lieu lui-même.</p>` },
      tip: { en: "The park still actively hosts drama shoots — check ahead, as certain areas occasionally close to visitors during filming days.", fr: "Le parc accueille encore régulièrement des tournages de drama — vérifiez avant de venir, certaines zones ferment parfois aux visiteurs les jours de tournage." },
      directions: { en: "Best reached by car from central Seoul (around 1 hour); limited public transit serves this part of Yongin.", fr: "Se rejoint le plus facilement en voiture depuis le centre de Séoul (environ 1 heure) ; les transports en commun sont limités dans ce secteur de Yongin." } },

    { id: 55, name: "Eulji Dabang", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Cafe", year: "2019", address: "Euljiro, Jung-gu", lat: 37.5663, lng: 126.9915, img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
      fullDescription: { en: `<p>Tucked into the older, unpolished backstreets of Euljiro — a neighbourhood better known for hardware wholesalers and decades-old print shops than café culture — Eulji Dabang is a deliberately old-fashioned "dabang," the retro tearoom style that was ubiquitous in Korea before the modern coffee shop took over. Low vinyl booths, dim lighting, and a short menu built around traditional teas rather than espresso.</p><p>Its signature order, and the reason it comes up in BTS conversations at all, is ssanghwacha — a bitter medicinal tea served with a raw egg yolk floating on top — an acquired taste the members have been associated with trying, and one that turns a quick coffee stop into something closer to a genuine cultural detour.</p>`,
        fr: `<p>Niché dans les ruelles anciennes et sans artifice d'Euljiro — un quartier plus connu pour ses grossistes en quincaillerie et ses imprimeries centenaires que pour sa culture café — Eulji Dabang est un « dabang » volontairement rétro, ce style de salon de thé qui régnait en Corée avant l'arrivée du café moderne. Banquettes en vinyle basses, éclairage tamisé, et une carte courte construite autour de thés traditionnels plutôt que d'espresso.</p><p>Sa commande signature, et la raison pour laquelle ce lieu revient dans les conversations autour de BTS, c'est le ssanghwacha — un thé médicinal amer servi avec un jaune d'œuf cru flottant à la surface — un goût qui ne plaît pas à tout le monde et auquel les membres ont été associés, transformant une simple pause café en une véritable escapade culturelle.</p>` },
      tip: { en: "If ssanghwacha feels too adventurous, most dabang of this style also serve a milder honey-ginger tea — a good middle ground for a first visit.", fr: "Si le ssanghwacha semble trop audacieux, la plupart des dabang de ce style servent aussi un thé au miel et au gingembre plus doux — un bon compromis pour une première visite." },
      directions: { en: "Take Line 2 or 3 to Euljiro 3(sam)-ga Station and walk about 5 minutes into the surrounding backstreets.", fr: "Prenez la ligne 2 ou 3 jusqu'à la station Euljiro 3(sam)-ga et marchez environ 5 minutes dans les ruelles alentour." } },

    { id: 56, name: "Jumunjin Beach Bus Stop", group: "BTS", member: "All", country: "South Korea", city: "Gangneung", category: "MV Location", year: "2017", episode: "Spring Day / You Never Walk Alone", address: "Jumunjin-eup, Gangneung", lat: 37.8967, lng: 128.8283, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600",
      fullDescription: { en: `<p>The pale blue bus shelter facing the water at Jumunjin Beach isn't the original one seen in the "Spring Day" music video and on the "You Never Walk Alone" album cover — that exact spot proved so difficult for fans to track down that the city of Gangneung eventually built this faithful recreation specifically so ARMY would have somewhere real to visit.</p><p>It's a rare, almost tender example of a destination shaped directly by fan devotion rather than the other way around: the wide sandy beach and pale winter light are the real draw, and the shelter itself, purple bench and all, exists purely so people have a place to sit and feel, briefly, like they've stepped inside the song.</p>`,
        fr: `<p>L'abribus bleu pâle qui fait face à la mer sur la plage de Jumunjin n'est pas l'original vu dans le clip de « Spring Day » et sur la pochette de l'album « You Never Walk Alone » — ce lieu précis s'est avéré si difficile à localiser pour les fans que la ville de Gangneung a fini par construire cette reconstitution fidèle, spécifiquement pour que les ARMY aient un endroit réel où se rendre.</p><p>C'est un exemple rare, presque touchant, d'une destination façonnée directement par la dévotion des fans plutôt que l'inverse : la large plage de sable et la lumière pâle d'hiver sont le véritable attrait, et l'abri lui-même, banc violet compris, existe uniquement pour que chacun puisse s'y asseoir et se sentir, l'espace d'un instant, transporté à l'intérieur de la chanson.</p>` },
      tip: { en: "Winter and early spring light match the music video's mood most closely — a grey, overcast afternoon here feels more \"right\" than a sunny summer day.", fr: "La lumière d'hiver et de début de printemps correspond le mieux à l'ambiance du clip — un après-midi gris et couvert semble plus « juste » ici qu'une journée d'été ensoleillée." },
      directions: { en: "Take a bus from Seoul's Nambu Bus Terminal to Jumunjin Intercity Bus Terminal, then a short taxi or 15-minute walk to the beach.", fr: "Prenez un bus depuis le terminal routier Nambu de Séoul jusqu'au terminal de Jumunjin, puis un court trajet en taxi ou 15 minutes à pied jusqu'à la plage." } },

    { id: 57, name: "Jecheon Mosan Airfield", group: "BTS", member: "All", country: "South Korea", city: "Jecheon", category: "MV Location", year: "2016", episode: "Epilogue: Young Forever", address: "Mosan-dong, Jecheon", lat: 37.1289, lng: 128.2444, img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600",
      fullDescription: { en: `<p>A disused rural airstrip in the hills outside Jecheon, this wide expanse of empty runway and open sky became the backdrop for the group running, jumping and simply being seven kids let loose in "Epilogue: Young Forever" — one of the videos fans consistently point to as the moment BTS's visual language shifted from tightly choreographed sets toward something rawer and more emotionally direct.</p><p>There's nothing built for visitors here — no signage, no facilities — just runway markings slowly fading into grass and a horizon big enough to explain exactly why a director would choose it for a song about chasing something you can't quite catch.</p>`,
        fr: `<p>Ancienne piste d'aviation rurale désaffectée dans les collines aux abords de Jecheon, cette vaste étendue de tarmac vide sous un grand ciel ouvert est devenue le décor du groupe en train de courir, sauter et simplement être sept jeunes lâchés en liberté dans « Epilogue: Young Forever » — l'un des clips que les fans citent systématiquement comme le moment où le langage visuel de BTS a basculé de mises en scène très chorégraphiées vers quelque chose de plus brut et de plus directement émotionnel.</p><p>Rien n'est aménagé pour les visiteurs ici — aucun panneau, aucune installation — juste un marquage de piste qui s'efface lentement dans l'herbe et un horizon assez vaste pour expliquer précisément pourquoi un réalisateur choisirait cet endroit pour une chanson qui parle de courir après quelque chose qu'on ne peut jamais tout à fait attraper.</p>` },
      tip: { en: "The site is remote and unmaintained — sturdy shoes are essential, and it's best visited with a car rather than attempted on foot from town.", fr: "Le site est isolé et non entretenu — de bonnes chaussures sont indispensables, et il vaut mieux s'y rendre en voiture plutôt qu'à pied depuis la ville." },
      directions: { en: "Best reached by car from Jecheon city center (around 20 minutes); no public transit serves the airfield directly.", fr: "Se rejoint le plus facilement en voiture depuis le centre de Jecheon (environ 20 minutes) ; aucun transport en commun ne dessert directement le site." } }
];


// ==========================================
// 3. LOGIQUE UI ET TRADUCTIONS
// ==========================================
const translations = {
    en: { 
        btnGenerateIti: "Auto-Itinerary Generator", filterGroup: "GROUP", filterMember: "MEMBER", filterArea: "AREA", filterYear: "YEAR", filterCategories: "CATEGORIES", 
        locationsCount: "LOCATIONS", statsCountries: "COUNTRIES", cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", 
        cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept",
        exploreDestOption: "Explore Destinations", exploreArtistsOption: "Explore Artists", accountOption: "Your Account",
        visitedOption: "My Visited Places", wishlistOption: "My Wishlist", tripsOption: "My Trips", settingsOption: "Settings", logoutOption: "Logout",
        footerText: "Screen To Street is an independent fan-made guide.", footerMentions: "Legal Notice", footerAbout: "About Us", footerTOS: "Terms of Service", footerPrivacy: "Privacy Policy",
        allGroups: "All Groups", allMembers: "All Members", allAreas: "All Areas", allYears: "All Years", allCategories: "All Categories",
        checkVisited: "I visited this place", checkWishlist: "Add to Wishlist", tripWhich: "Which trip is this for?",
        tripName: "Trip name", tripWhen: "When are you planning to go?", tripFrom: "From", tripTo: "To", tripCreate: "Create trip", tripCancel: "Cancel",
        itiTitle: "Auto-Itinerary Generator", itiDesc: "Select a group, a country, and how many days you stay.", itiCreateBtn: "Create My Guide", itiCatLabel: "Categories (optional, select multiple)", itiExport: "Export Guide as PDF", itiSave: "Save to My Trips",
        noTripsFound: "No trips found.", selectTripToView: "Select a trip to view", locationsWord: "location", locationsWordPlural: "locations",
        addAnotherVisit: "Add another visit",
        tabExplore: "Explore", tabMyItinerary: "My Itinerary", yourRating: "Your rating", whenDidYouVisit: "When did you visit?", saveMemory: "Save memory", myVisitTab: "My Visit",
        backToMap: "← Back to Map", moreDetails: "More details", openInMaps: "Open in Google Maps", detailsLabel: "Details", aboutPlaceLabel: "About this place",
        accTitle: "Your Account", accChangePhoto: "Change Profile Picture", accNameLabel: "Name", accEmailLabel: "Email address",
        accActivityTitle: "Your activity", accTrips: "Trips", accVisited: "Visited", accWishlist: "Wishlist", accPasses: "Passes & billing",
        accEditBtn: "Edit Profile", accSaveBtn: "Save Changes", accSaved: "✓ Saved Successfully", accNoPasses: "No active passes",
        accDangerZone: "Danger zone",
        accDeleteConfirmTitle: "Are you sure you want to delete your account?",
        accDeleteConfirmBody: "This action is permanent. You will not be refunded for any unlocked passes, and all your data — trips, wishlist, and visited places — will be permanently lost.",
        accDeletePasswordLabel: "Confirm your password", accDeleteCancel: "Cancel", accDeleteConfirmBtn: "Yes, delete my account",
        accDeleteGoogleReauthNote: "For your security, Google needs to confirm it's really you before we permanently delete your account. Click \"Confirm with Google\" below.",
        setTitle: "Settings", setSecurity: "Account & Security", setPassword: "Password", setPasswordSub: "Last changed 3 months ago", setChange: "Change",
        setChangePwTitle: "Change your password", setChangePwGoogleNote: "Your account uses Google Sign-In, so it has no Screen To Street password to change — manage it from your Google Account instead.", setCurrentPwLabel: "Current password", setNewPwLabel: "New password", setConfirmPwLabel: "Confirm new password", setChangePwBtn: "Change password",
        setSignedWith: "Signed in with", setPreferences: "Preferences", setLanguage: "Language", setCurrency: "Currency", setUnits: "Distance units",
        setEmailNotif: "Email notifications", setPushNotif: "Push notifications", setPrivacy: "Privacy", setCookiePrefs: "Cookie Preferences",
        setResetBanners: "Reset Banners", setDownloadData: "Download my data", setExportSub: "Export everything in JSON", setExport: "Export",
        setManage: "Manage", setNotifConfirmTitle: "Enable email notifications?", setNotifConfirmBody: "By enabling this, you agree to receive an email whenever new locations are added — at an interval that depends on how active the artist currently is (more frequent during a comeback or tour, quieter otherwise). Choose which groups and countries you care about below.", setNotifEnableBtn: "Enable", setPushNotifConfirmTitle: "Enable push notifications?", setPushNotifConfirmBody: "By enabling this, you agree to receive a push notification whenever new locations are added — at an interval that depends on how active the artist currently is (more frequent during a comeback or tour, quieter otherwise). Choose which groups and countries you care about below.", setNotifGroupsLabel: "Notify me for these groups", setNotifCountryLabel: "Notify me for these countries", setNotifAllCountries: "All countries", setNotifSearchCountry: "Search countries...", setCookiePrefsTitle: "Cookie Preferences", setCookiePrefsBody: "Necessary cookies keep the site working (login, saved wishlist) and can't be turned off. You choose whether we also use cookies to remember your preferences across visits.", setCookieNecessary: "Necessary", setCookieNecessarySub: "Always active", setCookieAnalytics: "Preferences & analytics", setCookieAnalyticsSub: "Remember your choices between visits", setSavePreferences: "Save preferences",
        setDanger: "Danger zone", setDeleteAccTitle: "Delete account", setDeleteAccSub: "This permanently deletes your trips, wishlist and unlocked passes.", setDeleteAccBtn: "Delete Account",
        wishTitle: "My Wishlist", wishEmpty: "You haven't saved any places yet. Explore the map and click \"Add to Wishlist\"!", wishSomeday: "Someday / No trip yet",
        visitTitle: "My Visited Places", visitEmpty: "You haven't marked any place as visited yet. Explore the map and check \"I visited this place\"!",
        destTitle: "Explore Destinations", destSub: "Browse every country and city featured on Screen To Street", destCountries: "Countries", destCities: "Cities", destLocations: "Locations", destViewMap: "View on Map →",
        artTitle: "Explore Artists", artSub: "Discover every group featured on Screen To Street", artGroups: "Groups", artFeatured: "Featured group",

        gateLoginTitle: "Log in to continue", gateLoginDesc: "You need an account to explore the map.",
        gateEmailLabel: "Email address", gatePasswordLabel: "Password", gateForgotPassword: "Forgot password?",
        gateLoginBtn: "Log in", gateOrDivider: "OR", gateGoogleBtn: "Continue with Google",
        gateSignupPrompt: "Don't have an account?", gateSignupLink: "Sign up",
        gateNoGroupsTitle: "Unlock a group to see the map", gateNoGroupsDesc: "You haven't unlocked any group yet. Click below to choose a pass and start exploring.",
        gateUnlockBtn: "Unlock a group", gateLogoutLink: "Log out",
        gateErrorInvalid: "Incorrect email or password.", gateErrorGeneric: "Something went wrong. Please try again.",
        gateResetSent: "Password reset email sent — check your inbox.", gateEnterEmailFirst: "Please enter your email address first."
    },
    fr: { 
        btnGenerateIti: "Générateur Itinéraire", filterGroup: "GROUPE", filterMember: "MEMBRE", filterArea: "RÉGION", filterYear: "ANNÉE", filterCategories: "CATÉGORIES", 
        locationsCount: "LIEUX", statsCountries: "PAYS", cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", 
        cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter",
        exploreDestOption: "Explorer les Destinations", exploreArtistsOption: "Explorer les Artistes", accountOption: "Mon Compte",
        visitedOption: "Mes Lieux Visités", wishlistOption: "Ma Wishlist", tripsOption: "Mes Voyages", settingsOption: "Paramètres", logoutOption: "Déconnexion",
        footerText: "Screen To Street est un guide indépendant créé par des fans.", footerMentions: "Mentions légales", footerAbout: "Qui sommes-nous", footerTOS: "CGU", footerPrivacy: "Confidentialité",
        allGroups: "Tous les groupes", allMembers: "Tous les membres", allAreas: "Toutes les régions", allYears: "Toutes les années", allCategories: "Toutes les catégories",
        checkVisited: "J'ai visité ce lieu", checkWishlist: "Ajouter à ma Wishlist", tripWhich: "Pour quel voyage ?",
        tripName: "Nom du voyage", tripWhen: "Quand prévoyez-vous d'y aller ?", tripFrom: "De", tripTo: "À", tripCreate: "Créer", tripCancel: "Annuler",
        itiTitle: "Générateur Itinéraire", itiDesc: "Sélectionnez un groupe, un pays, et le nombre de jours.", itiCreateBtn: "Créer mon guide", itiCatLabel: "Catégories (facultatif, sélection multiple)", itiExport: "Exporter en PDF", itiSave: "Sauvegarder dans My Trips",
        noTripsFound: "Aucun voyage trouvé.", selectTripToView: "Sélectionner un voyage", locationsWord: "lieu", locationsWordPlural: "lieux",
        addAnotherVisit: "Ajouter une autre visite",
        tabExplore: "Explorer", tabMyItinerary: "Mon Itinéraire", yourRating: "Votre note", whenDidYouVisit: "Quand avez-vous visité ce lieu ?", saveMemory: "Enregistrer le souvenir", myVisitTab: "Ma Visite",
        backToMap: "← Retour à la carte", moreDetails: "Plus de détails", openInMaps: "Ouvrir dans Google Maps", detailsLabel: "Détails", aboutPlaceLabel: "À propos de ce lieu",
        accTitle: "Votre compte", accChangePhoto: "Changer la photo de profil", accNameLabel: "Nom", accEmailLabel: "Adresse e-mail",
        accActivityTitle: "Votre activité", accTrips: "Voyages", accVisited: "Visités", accWishlist: "Wishlist", accPasses: "Pass et facturation",
        accEditBtn: "Modifier le profil", accSaveBtn: "Enregistrer", accSaved: "✓ Enregistré avec succès", accNoPasses: "Aucun pass actif",
        accDangerZone: "Zone de danger",
        accDeleteConfirmTitle: "Êtes-vous sûr(e) de vouloir supprimer votre compte ?",
        accDeleteConfirmBody: "Cette action est définitive. Vous ne serez pas remboursé(e) pour les pass débloqués, et toutes vos données — voyages, wishlist et lieux visités — seront définitivement perdues.",
        accDeletePasswordLabel: "Confirmez votre mot de passe", accDeleteCancel: "Annuler", accDeleteConfirmBtn: "Oui, supprimer mon compte",
        accDeleteGoogleReauthNote: "Pour votre sécurité, Google doit confirmer qu'il s'agit bien de vous avant la suppression définitive de votre compte. Cliquez sur « Confirmer avec Google » ci-dessous.",
        setTitle: "Paramètres", setSecurity: "Compte et sécurité", setPassword: "Mot de passe", setPasswordSub: "Dernière modification il y a 3 mois", setChange: "Modifier",
        setChangePwTitle: "Changer votre mot de passe", setChangePwGoogleNote: "Votre compte utilise la connexion Google, il n'a donc pas de mot de passe Screen To Street à changer — gérez-le depuis votre compte Google.", setCurrentPwLabel: "Mot de passe actuel", setNewPwLabel: "Nouveau mot de passe", setConfirmPwLabel: "Confirmer le nouveau mot de passe", setChangePwBtn: "Changer le mot de passe",
        setSignedWith: "Connecté avec", setPreferences: "Préférences", setLanguage: "Langue", setCurrency: "Devise", setUnits: "Unités de distance",
        setEmailNotif: "Notifications par e-mail", setPushNotif: "Notifications push", setPrivacy: "Confidentialité", setCookiePrefs: "Préférences de cookies",
        setResetBanners: "Réinitialiser la bannière", setDownloadData: "Télécharger mes données", setExportSub: "Exporter toutes les données en JSON", setExport: "Exporter",
        setManage: "Gérer", setNotifConfirmTitle: "Activer les notifications par e-mail ?", setNotifConfirmBody: "En activant cette option, vous acceptez de recevoir un e-mail à chaque nouveau lieu ajouté — à une fréquence qui dépend de l'activité actuelle de l'artiste (plus fréquent lors d'un comeback ou d'une tournée, plus calme sinon). Choisissez ci-dessous les groupes et les pays qui vous intéressent.", setNotifEnableBtn: "Activer", setPushNotifConfirmTitle: "Activer les notifications push ?", setPushNotifConfirmBody: "En activant cette option, vous acceptez de recevoir une notification push à chaque nouveau lieu ajouté — à une fréquence qui dépend de l'activité actuelle de l'artiste (plus fréquent lors d'un comeback ou d'une tournée, plus calme sinon). Choisissez ci-dessous les groupes et les pays qui vous intéressent.", setNotifGroupsLabel: "Me notifier pour ces groupes", setNotifCountryLabel: "Me notifier pour ces pays", setNotifAllCountries: "Tous les pays", setNotifSearchCountry: "Rechercher un pays...", setCookiePrefsTitle: "Préférences de cookies", setCookiePrefsBody: "Les cookies nécessaires font fonctionner le site (connexion, wishlist sauvegardée) et ne peuvent pas être désactivés. Vous choisissez si on utilise aussi des cookies pour mémoriser vos préférences d'une visite à l'autre.", setCookieNecessary: "Nécessaires", setCookieNecessarySub: "Toujours actifs", setCookieAnalytics: "Préférences et analyse", setCookieAnalyticsSub: "Mémorise vos choix d'une visite à l'autre", setSavePreferences: "Enregistrer les préférences",
        setDanger: "Zone de danger", setDeleteAccTitle: "Supprimer le compte", setDeleteAccSub: "Ceci supprime définitivement vos voyages, votre wishlist et vos pass débloqués.", setDeleteAccBtn: "Supprimer le compte",
        wishTitle: "Ma Wishlist", wishEmpty: "Vous n'avez encore enregistré aucun lieu. Explorez la carte et cliquez sur « Ajouter à ma Wishlist » !", wishSomeday: "Un jour / Pas de voyage prévu",
        visitTitle: "Mes lieux visités", visitEmpty: "Vous n'avez marqué aucun lieu comme visité. Explorez la carte et cochez « J'ai visité ce lieu » !",
        destTitle: "Explorer les destinations", destSub: "Parcourez tous les pays et villes présents sur Screen To Street", destCountries: "Pays", destCities: "Villes", destLocations: "Lieux", destViewMap: "Voir sur la carte →",
        artTitle: "Explorer les artistes", artSub: "Découvrez tous les groupes présents sur Screen To Street", artGroups: "Groupes", artFeatured: "Groupe à la une",

        gateLoginTitle: "Se connecter pour continuer", gateLoginDesc: "Un compte est nécessaire pour explorer la carte.",
        gateEmailLabel: "Adresse e-mail", gatePasswordLabel: "Mot de passe", gateForgotPassword: "Mot de passe oublié ?",
        gateLoginBtn: "Se connecter", gateOrDivider: "OU", gateGoogleBtn: "Continuer avec Google",
        gateSignupPrompt: "Vous n'avez pas de compte ?", gateSignupLink: "S'inscrire",
        gateNoGroupsTitle: "Débloquez un groupe pour voir la carte", gateNoGroupsDesc: "Vous n'avez encore débloqué aucun groupe. Cliquez ci-dessous pour choisir un pass et commencer à explorer.",
        gateUnlockBtn: "Débloquer un groupe", gateLogoutLink: "Se déconnecter",
        gateErrorInvalid: "E-mail ou mot de passe incorrect.", gateErrorGeneric: "Une erreur est survenue. Réessayez.",
        gateResetSent: "E-mail de réinitialisation envoyé — vérifiez votre boîte de réception.", gateEnterEmailFirst: "Merci d'indiquer d'abord votre adresse e-mail."
    },
    es: {
        btnGenerateIti: "Generador de Itinerarios", filterGroup: "GRUPO", filterMember: "MIEMBRO", filterArea: "ZONA", filterYear: "AÑO", filterCategories: "CATEGORÍAS",
        locationsCount: "LUGARES", statsCountries: "PAÍSES", cookieText: "Utilizamos cookies para mejorar tu experiencia.", cookiePolicy: "Política de cookies",
        cookieManage: "Gestionar", cookieReject: "Rechazar", cookieAccept: "Aceptar",
        exploreDestOption: "Explorar Destinos", exploreArtistsOption: "Explorar Artistas", accountOption: "Tu Cuenta",
        visitedOption: "Lugares Visitados", wishlistOption: "Mi Lista de Deseos", tripsOption: "Mis Viajes", settingsOption: "Ajustes", logoutOption: "Cerrar sesión",
        footerText: "Screen To Street es una guía independiente creada por fans.", footerMentions: "Aviso Legal", footerAbout: "Sobre Nosotros", footerTOS: "Términos de Servicio", footerPrivacy: "Política de Privacidad",
        allGroups: "Todos los grupos", allMembers: "Todos los miembros", allAreas: "Todas las zonas", allYears: "Todos los años", allCategories: "Todas las categorías",
        checkVisited: "He visitado este lugar", checkWishlist: "Añadir a mi lista", tripWhich: "¿Para qué viaje es esto?",
        tripName: "Nombre del viaje", tripWhen: "¿Cuándo planeas ir?", tripFrom: "Desde", tripTo: "Hasta", tripCreate: "Crear viaje", tripCancel: "Cancelar",
        itiTitle: "Generador de Itinerarios", itiDesc: "Selecciona un grupo, un país y cuántos días te quedas.", itiCreateBtn: "Crear mi guía", itiCatLabel: "Categorías (opcional, selección múltiple)", itiExport: "Exportar guía en PDF", itiSave: "Guardar en Mis Viajes",
        noTripsFound: "No se encontraron viajes.", selectTripToView: "Selecciona un viaje para ver", locationsWord: "lugar", locationsWordPlural: "lugares",
        addAnotherVisit: "Añadir otra visita",
        tabExplore: "Explorar", tabMyItinerary: "Mi Itinerario", yourRating: "Tu valoración", whenDidYouVisit: "¿Cuándo visitaste este lugar?", saveMemory: "Guardar recuerdo", myVisitTab: "Mi Visita",
        backToMap: "← Volver al mapa", moreDetails: "Más detalles", openInMaps: "Abrir en Google Maps", detailsLabel: "Detalles", aboutPlaceLabel: "Sobre este lugar",
        accTitle: "Tu cuenta", accChangePhoto: "Cambiar foto de perfil", accNameLabel: "Nombre", accEmailLabel: "Correo electrónico",
        accActivityTitle: "Tu actividad", accTrips: "Viajes", accVisited: "Visitados", accWishlist: "Lista de deseos", accPasses: "Pases y facturación",
        accEditBtn: "Editar perfil", accSaveBtn: "Guardar cambios", accSaved: "✓ Guardado con éxito", accNoPasses: "Sin pases activos",
        accDangerZone: "Zona de peligro",
        accDeleteConfirmTitle: "¿Seguro que quieres eliminar tu cuenta?",
        accDeleteConfirmBody: "Esta acción es permanente. No se te reembolsará ningún pase desbloqueado, y todos tus datos — viajes, lista de deseos y lugares visitados — se perderán definitivamente.",
        accDeletePasswordLabel: "Confirma tu contraseña", accDeleteCancel: "Cancelar", accDeleteConfirmBtn: "Sí, eliminar mi cuenta",
        accDeleteGoogleReauthNote: "Por tu seguridad, Google debe confirmar que eres tú antes de eliminar tu cuenta de forma permanente. Haz clic en «Confirmar con Google» a continuación.",
        setTitle: "Ajustes", setSecurity: "Cuenta y seguridad", setPassword: "Contraseña", setPasswordSub: "Última modificación hace 3 meses", setChange: "Cambiar",
        setChangePwTitle: "Cambia tu contraseña", setChangePwGoogleNote: "Tu cuenta usa el inicio de sesión con Google, por lo que no tiene una contraseña de Screen To Street que cambiar — gestiónala desde tu cuenta de Google.", setCurrentPwLabel: "Contraseña actual", setNewPwLabel: "Nueva contraseña", setConfirmPwLabel: "Confirmar nueva contraseña", setChangePwBtn: "Cambiar contraseña",
        setSignedWith: "Sesión iniciada con", setPreferences: "Preferencias", setLanguage: "Idioma", setCurrency: "Moneda", setUnits: "Unidades de distancia",
        setEmailNotif: "Notificaciones por correo", setPushNotif: "Notificaciones push", setPrivacy: "Privacidad", setCookiePrefs: "Preferencias de cookies",
        setResetBanners: "Restablecer banner", setDownloadData: "Descargar mis datos", setExportSub: "Exportar todo en JSON", setExport: "Exportar",
        setManage: "Gestionar", setNotifConfirmTitle: "¿Activar las notificaciones por correo?", setNotifConfirmBody: "Al activarlo, aceptas recibir un correo cada vez que se añadan nuevos lugares — con una frecuencia que depende de la actividad actual del artista (más frecuente durante un comeback o gira, más tranquilo el resto del tiempo). Elige a continuación los grupos y los países que te interesan.", setNotifEnableBtn: "Activar", setPushNotifConfirmTitle: "¿Activar las notificaciones push?", setPushNotifConfirmBody: "Al activarlo, aceptas recibir una notificación push cada vez que se añadan nuevos lugares — con una frecuencia que depende de la actividad actual del artista (más frecuente durante un comeback o gira, más tranquilo el resto del tiempo). Elige a continuación los grupos y los países que te interesan.", setNotifGroupsLabel: "Notificarme para estos grupos", setNotifCountryLabel: "Notificarme para estos países", setNotifAllCountries: "Todos los países", setNotifSearchCountry: "Buscar países...", setCookiePrefsTitle: "Preferencias de cookies", setCookiePrefsBody: "Las cookies necesarias hacen que el sitio funcione (inicio de sesión, lista de deseos guardada) y no se pueden desactivar. Tú decides si también usamos cookies para recordar tus preferencias entre visitas.", setCookieNecessary: "Necesarias", setCookieNecessarySub: "Siempre activas", setCookieAnalytics: "Preferencias y análisis", setCookieAnalyticsSub: "Recuerda tus elecciones entre visitas", setSavePreferences: "Guardar preferencias",
        setDanger: "Zona de peligro", setDeleteAccTitle: "Eliminar cuenta", setDeleteAccSub: "Esto elimina permanentemente tus viajes, lista de deseos y pases desbloqueados.", setDeleteAccBtn: "Eliminar cuenta",
        wishTitle: "Mi Lista de Deseos", wishEmpty: "Aún no has guardado ningún lugar. ¡Explora el mapa y haz clic en «Añadir a mi lista»!", wishSomeday: "Algún día / Sin viaje aún",
        visitTitle: "Mis Lugares Visitados", visitEmpty: "Aún no has marcado ningún lugar como visitado. ¡Explora el mapa y marca «He visitado este lugar»!",
        destTitle: "Explorar Destinos", destSub: "Explora todos los países y ciudades de Screen To Street", destCountries: "Países", destCities: "Ciudades", destLocations: "Lugares", destViewMap: "Ver en el mapa →",
        artTitle: "Explorar Artistas", artSub: "Descubre todos los grupos presentes en Screen To Street", artGroups: "Grupos", artFeatured: "Grupo destacado",

        gateLoginTitle: "Inicia sesión para continuar", gateLoginDesc: "Necesitas una cuenta para explorar el mapa.",
        gateEmailLabel: "Correo electrónico", gatePasswordLabel: "Contraseña", gateForgotPassword: "¿Olvidaste tu contraseña?",
        gateLoginBtn: "Iniciar sesión", gateOrDivider: "O", gateGoogleBtn: "Continuar con Google",
        gateSignupPrompt: "¿No tienes cuenta?", gateSignupLink: "Regístrate",
        gateNoGroupsTitle: "Desbloquea un grupo para ver el mapa", gateNoGroupsDesc: "Aún no has desbloqueado ningún grupo. Haz clic abajo para elegir un pase y empezar a explorar.",
        gateUnlockBtn: "Desbloquear un grupo", gateLogoutLink: "Cerrar sesión",
        gateErrorInvalid: "Correo o contraseña incorrectos.", gateErrorGeneric: "Algo salió mal. Inténtalo de nuevo.",
        gateResetSent: "Correo de restablecimiento enviado — revisa tu bandeja de entrada.", gateEnterEmailFirst: "Indica primero tu correo electrónico."
    },
    it: {
        btnGenerateIti: "Generatore di Itinerari", filterGroup: "GRUPPO", filterMember: "MEMBRO", filterArea: "ZONA", filterYear: "ANNO", filterCategories: "CATEGORIE",
        locationsCount: "LUOGHI", statsCountries: "PAESI", cookieText: "Utilizziamo i cookie per migliorare la tua esperienza.", cookiePolicy: "Informativa sui cookie",
        cookieManage: "Gestisci", cookieReject: "Rifiuta", cookieAccept: "Accetta",
        exploreDestOption: "Esplora Destinazioni", exploreArtistsOption: "Esplora Artisti", accountOption: "Il Tuo Account",
        visitedOption: "Luoghi Visitati", wishlistOption: "La Mia Wishlist", tripsOption: "I Miei Viaggi", settingsOption: "Impostazioni", logoutOption: "Esci",
        footerText: "Screen To Street è una guida indipendente creata dai fan.", footerMentions: "Note Legali", footerAbout: "Chi Siamo", footerTOS: "Termini di Servizio", footerPrivacy: "Privacy Policy",
        allGroups: "Tutti i gruppi", allMembers: "Tutti i membri", allAreas: "Tutte le zone", allYears: "Tutti gli anni", allCategories: "Tutte le categorie",
        checkVisited: "Ho visitato questo posto", checkWishlist: "Aggiungi alla wishlist", tripWhich: "Per quale viaggio è questo?",
        tripName: "Nome del viaggio", tripWhen: "Quando pensi di andarci?", tripFrom: "Da", tripTo: "A", tripCreate: "Crea viaggio", tripCancel: "Annulla",
        itiTitle: "Generatore di Itinerari", itiDesc: "Seleziona un gruppo, un paese e quanti giorni resti.", itiCreateBtn: "Crea la mia guida", itiCatLabel: "Categorie (opzionale, selezione multipla)", itiExport: "Esporta guida in PDF", itiSave: "Salva nei Miei Viaggi",
        noTripsFound: "Nessun viaggio trovato.", selectTripToView: "Seleziona un viaggio da vedere", locationsWord: "luogo", locationsWordPlural: "luoghi",
        addAnotherVisit: "Aggiungi un'altra visita",
        tabExplore: "Esplora", tabMyItinerary: "Il Mio Itinerario", yourRating: "La tua valutazione", whenDidYouVisit: "Quando hai visitato questo posto?", saveMemory: "Salva ricordo", myVisitTab: "La Mia Visita",
        backToMap: "← Torna alla mappa", moreDetails: "Maggiori dettagli", openInMaps: "Apri in Google Maps", detailsLabel: "Dettagli", aboutPlaceLabel: "Informazioni su questo luogo",
        accTitle: "Il tuo account", accChangePhoto: "Cambia foto profilo", accNameLabel: "Nome", accEmailLabel: "Indirizzo email",
        accActivityTitle: "La tua attività", accTrips: "Viaggi", accVisited: "Visitati", accWishlist: "Wishlist", accPasses: "Pass e fatturazione",
        accEditBtn: "Modifica profilo", accSaveBtn: "Salva modifiche", accSaved: "✓ Salvato con successo", accNoPasses: "Nessun pass attivo",
        accDangerZone: "Zona pericolosa",
        accDeleteConfirmTitle: "Sei sicuro di voler eliminare il tuo account?",
        accDeleteConfirmBody: "Questa azione è permanente. Non riceverai rimborsi per i pass sbloccati e tutti i tuoi dati — viaggi, wishlist e luoghi visitati — andranno persi definitivamente.",
        accDeletePasswordLabel: "Conferma la tua password", accDeleteCancel: "Annulla", accDeleteConfirmBtn: "Sì, elimina il mio account",
        accDeleteGoogleReauthNote: "Per la tua sicurezza, Google deve confermare che sei davvero tu prima di eliminare definitivamente il tuo account. Fai clic su \"Conferma con Google\" qui sotto.",
        setTitle: "Impostazioni", setSecurity: "Account e sicurezza", setPassword: "Password", setPasswordSub: "Ultima modifica 3 mesi fa", setChange: "Modifica",
        setChangePwTitle: "Cambia la tua password", setChangePwGoogleNote: "Il tuo account usa l'accesso con Google, quindi non ha una password di Screen To Street da cambiare — gestiscila dal tuo Account Google.", setCurrentPwLabel: "Password attuale", setNewPwLabel: "Nuova password", setConfirmPwLabel: "Conferma nuova password", setChangePwBtn: "Cambia password",
        setSignedWith: "Accesso effettuato con", setPreferences: "Preferenze", setLanguage: "Lingua", setCurrency: "Valuta", setUnits: "Unità di distanza",
        setEmailNotif: "Notifiche email", setPushNotif: "Notifiche push", setPrivacy: "Privacy", setCookiePrefs: "Preferenze cookie",
        setResetBanners: "Reimposta banner", setDownloadData: "Scarica i miei dati", setExportSub: "Esporta tutto in JSON", setExport: "Esporta",
        setManage: "Gestisci", setNotifConfirmTitle: "Attivare le notifiche email?", setNotifConfirmBody: "Attivandole, accetti di ricevere un'email ogni volta che vengono aggiunti nuovi luoghi — con una frequenza che dipende dall'attività attuale dell'artista (più frequente durante un comeback o un tour, più tranquilla altrimenti). Scegli qui sotto i gruppi e i paesi che ti interessano.", setNotifEnableBtn: "Attiva", setPushNotifConfirmTitle: "Attivare le notifiche push?", setPushNotifConfirmBody: "Attivandole, accetti di ricevere una notifica push ogni volta che vengono aggiunti nuovi luoghi — con una frequenza che dipende dall'attività attuale dell'artista (più frequente durante un comeback o un tour, più tranquilla altrimenti). Scegli qui sotto i gruppi e i paesi che ti interessano.", setNotifGroupsLabel: "Notificami per questi gruppi", setNotifCountryLabel: "Notificami per questi paesi", setNotifAllCountries: "Tutti i paesi", setNotifSearchCountry: "Cerca paesi...", setCookiePrefsTitle: "Preferenze cookie", setCookiePrefsBody: "I cookie necessari fanno funzionare il sito (accesso, lista dei desideri salvata) e non possono essere disattivati. Puoi scegliere se usiamo anche cookie per ricordare le tue preferenze tra una visita e l'altra.", setCookieNecessary: "Necessari", setCookieNecessarySub: "Sempre attivi", setCookieAnalytics: "Preferenze e analisi", setCookieAnalyticsSub: "Ricorda le tue scelte tra una visita e l'altra", setSavePreferences: "Salva preferenze",
        setDanger: "Zona pericolosa", setDeleteAccTitle: "Elimina account", setDeleteAccSub: "Questo elimina definitivamente i tuoi viaggi, la wishlist e i pass sbloccati.", setDeleteAccBtn: "Elimina account",
        wishTitle: "La Mia Wishlist", wishEmpty: "Non hai ancora salvato nessun luogo. Esplora la mappa e clicca su «Aggiungi alla wishlist»!", wishSomeday: "Un giorno / Nessun viaggio ancora",
        visitTitle: "I Miei Luoghi Visitati", visitEmpty: "Non hai ancora segnato nessun luogo come visitato. Esplora la mappa e seleziona «Ho visitato questo posto»!",
        destTitle: "Esplora Destinazioni", destSub: "Esplora tutti i paesi e le città presenti su Screen To Street", destCountries: "Paesi", destCities: "Città", destLocations: "Luoghi", destViewMap: "Vedi sulla mappa →",
        artTitle: "Esplora Artisti", artSub: "Scopri tutti i gruppi presenti su Screen To Street", artGroups: "Gruppi", artFeatured: "Gruppo in evidenza",

        gateLoginTitle: "Accedi per continuare", gateLoginDesc: "Devi avere un account per esplorare la mappa.",
        gateEmailLabel: "Indirizzo email", gatePasswordLabel: "Password", gateForgotPassword: "Password dimenticata?",
        gateLoginBtn: "Accedi", gateOrDivider: "OPPURE", gateGoogleBtn: "Continua con Google",
        gateSignupPrompt: "Non hai un account?", gateSignupLink: "Registrati",
        gateNoGroupsTitle: "Sblocca un gruppo per vedere la mappa", gateNoGroupsDesc: "Non hai ancora sbloccato nessun gruppo. Clicca qui sotto per scegliere un pass e iniziare a esplorare.",
        gateUnlockBtn: "Sblocca un gruppo", gateLogoutLink: "Esci",
        gateErrorInvalid: "Email o password errati.", gateErrorGeneric: "Qualcosa è andato storto. Riprova.",
        gateResetSent: "Email di reimpostazione inviata — controlla la posta in arrivo.", gateEnterEmailFirst: "Inserisci prima il tuo indirizzo email."
    },
    pt: {
        btnGenerateIti: "Gerador de Roteiros", filterGroup: "GRUPO", filterMember: "MEMBRO", filterArea: "REGIÃO", filterYear: "ANO", filterCategories: "CATEGORIAS",
        locationsCount: "LOCAIS", statsCountries: "PAÍSES", cookieText: "Usamos cookies para melhorar sua experiência.", cookiePolicy: "Política de Cookies",
        cookieManage: "Gerenciar", cookieReject: "Rejeitar", cookieAccept: "Aceitar",
        exploreDestOption: "Explorar Destinos", exploreArtistsOption: "Explorar Artistas", accountOption: "Sua Conta",
        visitedOption: "Locais Visitados", wishlistOption: "Minha Wishlist", tripsOption: "Minhas Viagens", settingsOption: "Configurações", logoutOption: "Sair",
        footerText: "Screen To Street é um guia independente feito por fãs.", footerMentions: "Aviso Legal", footerAbout: "Sobre Nós", footerTOS: "Termos de Serviço", footerPrivacy: "Política de Privacidade",
        allGroups: "Todos os grupos", allMembers: "Todos os membros", allAreas: "Todas as regiões", allYears: "Todos os anos", allCategories: "Todas as categorias",
        checkVisited: "Eu visitei este lugar", checkWishlist: "Adicionar à wishlist", tripWhich: "Para qual viagem é isso?",
        tripName: "Nome da viagem", tripWhen: "Quando você planeja ir?", tripFrom: "De", tripTo: "Até", tripCreate: "Criar viagem", tripCancel: "Cancelar",
        itiTitle: "Gerador de Roteiros", itiDesc: "Selecione um grupo, um país e quantos dias você fica.", itiCreateBtn: "Criar meu guia", itiCatLabel: "Categorias (opcional, seleção múltipla)", itiExport: "Exportar guia em PDF", itiSave: "Salvar em Minhas Viagens",
        noTripsFound: "Nenhuma viagem encontrada.", selectTripToView: "Selecione uma viagem para ver", locationsWord: "local", locationsWordPlural: "locais",
        addAnotherVisit: "Adicionar outra visita",
        tabExplore: "Explorar", tabMyItinerary: "Meu Itinerário", yourRating: "Sua avaliação", whenDidYouVisit: "Quando você visitou este lugar?", saveMemory: "Salvar lembrança", myVisitTab: "Minha Visita",
        backToMap: "← Voltar ao mapa", moreDetails: "Mais detalhes", openInMaps: "Abrir no Google Maps", detailsLabel: "Detalhes", aboutPlaceLabel: "Sobre este local",
        accTitle: "Sua conta", accChangePhoto: "Alterar foto de perfil", accNameLabel: "Nome", accEmailLabel: "Endereço de e-mail",
        accActivityTitle: "Sua atividade", accTrips: "Viagens", accVisited: "Visitados", accWishlist: "Wishlist", accPasses: "Passes e faturamento",
        accEditBtn: "Editar perfil", accSaveBtn: "Salvar alterações", accSaved: "✓ Salvo com sucesso", accNoPasses: "Nenhum passe ativo",
        accDangerZone: "Zona de perigo",
        accDeleteConfirmTitle: "Tem certeza de que deseja excluir sua conta?",
        accDeleteConfirmBody: "Esta ação é permanente. Você não será reembolsado por nenhum passe desbloqueado, e todos os seus dados — viagens, wishlist e locais visitados — serão perdidos definitivamente.",
        accDeletePasswordLabel: "Confirme sua senha", accDeleteCancel: "Cancelar", accDeleteConfirmBtn: "Sim, excluir minha conta",
        accDeleteGoogleReauthNote: "Para sua segurança, o Google precisa confirmar que é realmente você antes de excluirmos sua conta permanentemente. Clique em \"Confirmar com o Google\" abaixo.",
        setTitle: "Configurações", setSecurity: "Conta e segurança", setPassword: "Senha", setPasswordSub: "Última alteração há 3 meses", setChange: "Alterar",
        setChangePwTitle: "Altere sua senha", setChangePwGoogleNote: "Sua conta usa login com Google, portanto não tem uma senha do Screen To Street para alterar — gerencie-a na sua Conta Google.", setCurrentPwLabel: "Senha atual", setNewPwLabel: "Nova senha", setConfirmPwLabel: "Confirmar nova senha", setChangePwBtn: "Alterar senha",
        setSignedWith: "Conectado com", setPreferences: "Preferências", setLanguage: "Idioma", setCurrency: "Moeda", setUnits: "Unidades de distância",
        setEmailNotif: "Notificações por e-mail", setPushNotif: "Notificações push", setPrivacy: "Privacidade", setCookiePrefs: "Preferências de cookies",
        setResetBanners: "Redefinir banner", setDownloadData: "Baixar meus dados", setExportSub: "Exportar tudo em JSON", setExport: "Exportar",
        setManage: "Gerenciar", setNotifConfirmTitle: "Ativar notificações por e-mail?", setNotifConfirmBody: "Ao ativar, você concorda em receber um e-mail sempre que novos locais forem adicionados — com uma frequência que depende da atividade atual do artista (mais frequente durante um comeback ou turnê, mais tranquila fora disso). Escolha abaixo os grupos e os países do seu interesse.", setNotifEnableBtn: "Ativar", setPushNotifConfirmTitle: "Ativar notificações push?", setPushNotifConfirmBody: "Ao ativar, você concorda em receber uma notificação push sempre que novos locais forem adicionados — com uma frequência que depende da atividade atual do artista (mais frequente durante um comeback ou turnê, mais tranquila fora disso). Escolha abaixo os grupos e os países do seu interesse.", setNotifGroupsLabel: "Notificar-me para estes grupos", setNotifCountryLabel: "Notificar-me para estes países", setNotifAllCountries: "Todos os países", setNotifSearchCountry: "Buscar países...", setCookiePrefsTitle: "Preferências de cookies", setCookiePrefsBody: "Os cookies necessários fazem o site funcionar (login, lista de desejos salva) e não podem ser desativados. Você escolhe se também usamos cookies para lembrar suas preferências entre visitas.", setCookieNecessary: "Necessários", setCookieNecessarySub: "Sempre ativos", setCookieAnalytics: "Preferências e análise", setCookieAnalyticsSub: "Lembra suas escolhas entre visitas", setSavePreferences: "Salvar preferências",
        setDanger: "Zona de perigo", setDeleteAccTitle: "Excluir conta", setDeleteAccSub: "Isso exclui permanentemente suas viagens, wishlist e passes desbloqueados.", setDeleteAccBtn: "Excluir conta",
        wishTitle: "Minha Wishlist", wishEmpty: "Você ainda não salvou nenhum local. Explore o mapa e clique em «Adicionar à wishlist»!", wishSomeday: "Algum dia / Ainda sem viagem",
        visitTitle: "Meus Locais Visitados", visitEmpty: "Você ainda não marcou nenhum local como visitado. Explore o mapa e marque «Eu visitei este lugar»!",
        destTitle: "Explorar Destinos", destSub: "Explore todos os países e cidades do Screen To Street", destCountries: "Países", destCities: "Cidades", destLocations: "Locais", destViewMap: "Ver no mapa →",
        artTitle: "Explorar Artistas", artSub: "Descubra todos os grupos presentes no Screen To Street", artGroups: "Grupos", artFeatured: "Grupo em destaque",

        gateLoginTitle: "Entre para continuar", gateLoginDesc: "Você precisa de uma conta para explorar o mapa.",
        gateEmailLabel: "Endereço de e-mail", gatePasswordLabel: "Senha", gateForgotPassword: "Esqueceu a senha?",
        gateLoginBtn: "Entrar", gateOrDivider: "OU", gateGoogleBtn: "Continuar com Google",
        gateSignupPrompt: "Não tem uma conta?", gateSignupLink: "Cadastre-se",
        gateNoGroupsTitle: "Desbloqueie um grupo para ver o mapa", gateNoGroupsDesc: "Você ainda não desbloqueou nenhum grupo. Clique abaixo para escolher um passe e começar a explorar.",
        gateUnlockBtn: "Desbloquear um grupo", gateLogoutLink: "Sair",
        gateErrorInvalid: "E-mail ou senha incorretos.", gateErrorGeneric: "Algo deu errado. Tente novamente.",
        gateResetSent: "E-mail de redefinição enviado — verifique sua caixa de entrada.", gateEnterEmailFirst: "Informe primeiro seu endereço de e-mail."
    },
    ko: {
        btnGenerateIti: "자동 일정 생성기", filterGroup: "그룹", filterMember: "멤버", filterArea: "지역", filterYear: "연도", filterCategories: "카테고리",
        locationsCount: "장소", statsCountries: "국가", cookieText: "더 나은 경험을 위해 쿠키를 사용합니다.", cookiePolicy: "쿠키 정책",
        cookieManage: "관리", cookieReject: "거부", cookieAccept: "수락",
        exploreDestOption: "여행지 둘러보기", exploreArtistsOption: "아티스트 둘러보기", accountOption: "내 계정",
        visitedOption: "방문한 장소", wishlistOption: "위시리스트", tripsOption: "내 여행", settingsOption: "설정", logoutOption: "로그아웃",
        footerText: "Screen To Street는 팬이 만든 독립적인 가이드입니다.", footerMentions: "법적 고지", footerAbout: "소개", footerTOS: "이용약관", footerPrivacy: "개인정보처리방침",
        allGroups: "모든 그룹", allMembers: "모든 멤버", allAreas: "모든 지역", allYears: "모든 연도", allCategories: "모든 카테고리",
        checkVisited: "이 장소를 방문했어요", checkWishlist: "위시리스트에 추가", tripWhich: "어떤 여행을 위한 건가요?",
        tripName: "여행 이름", tripWhen: "언제 갈 계획인가요?", tripFrom: "부터", tripTo: "까지", tripCreate: "여행 만들기", tripCancel: "취소",
        itiTitle: "자동 일정 생성기", itiDesc: "그룹, 국가, 체류 일수를 선택하세요.", itiCreateBtn: "가이드 만들기", itiCatLabel: "카테고리 (선택 사항, 다중 선택 가능)", itiExport: "가이드 PDF로 내보내기", itiSave: "내 여행에 저장",
        noTripsFound: "여행을 찾을 수 없습니다.", selectTripToView: "볼 여행을 선택하세요", locationsWord: "장소", locationsWordPlural: "장소",
        addAnotherVisit: "다른 방문 추가",
        tabExplore: "탐색", tabMyItinerary: "내 일정", yourRating: "평점", whenDidYouVisit: "언제 방문하셨나요?", saveMemory: "추억 저장", myVisitTab: "내 방문",
        backToMap: "← 지도로 돌아가기", moreDetails: "자세히 보기", openInMaps: "구글 지도에서 열기", detailsLabel: "상세 정보", aboutPlaceLabel: "이 장소에 대해",
        accTitle: "내 계정", accChangePhoto: "프로필 사진 변경", accNameLabel: "이름", accEmailLabel: "이메일 주소",
        accActivityTitle: "내 활동", accTrips: "여행", accVisited: "방문함", accWishlist: "위시리스트", accPasses: "이용권 및 결제",
        accEditBtn: "프로필 수정", accSaveBtn: "변경사항 저장", accSaved: "✓ 저장되었습니다", accNoPasses: "활성화된 이용권 없음",
        accDangerZone: "위험 구역",
        accDeleteConfirmTitle: "정말 계정을 삭제하시겠습니까?",
        accDeleteConfirmBody: "이 작업은 되돌릴 수 없습니다. 잠금 해제한 이용권에 대한 환불은 제공되지 않으며, 여행·위시리스트·방문한 장소를 포함한 모든 데이터가 영구적으로 사라집니다.",
        accDeletePasswordLabel: "비밀번호를 확인해주세요", accDeleteCancel: "취소", accDeleteConfirmBtn: "네, 계정을 삭제합니다",
        accDeleteGoogleReauthNote: "보안을 위해 계정을 영구 삭제하기 전에 Google에서 본인 확인이 필요합니다. 아래의 'Google로 확인'을 클릭하세요.",
        setTitle: "설정", setSecurity: "계정 및 보안", setPassword: "비밀번호", setPasswordSub: "3개월 전에 마지막으로 변경됨", setChange: "변경",
        setChangePwTitle: "비밀번호 변경", setChangePwGoogleNote: "이 계정은 Google 로그인을 사용하므로 변경할 Screen To Street 비밀번호가 없습니다 — Google 계정에서 관리해 주세요.", setCurrentPwLabel: "현재 비밀번호", setNewPwLabel: "새 비밀번호", setConfirmPwLabel: "새 비밀번호 확인", setChangePwBtn: "비밀번호 변경",
        setSignedWith: "로그인 방식", setPreferences: "환경설정", setLanguage: "언어", setCurrency: "통화", setUnits: "거리 단위",
        setEmailNotif: "이메일 알림", setPushNotif: "푸시 알림", setPrivacy: "개인정보", setCookiePrefs: "쿠키 설정",
        setResetBanners: "배너 초기화", setDownloadData: "내 데이터 다운로드", setExportSub: "모든 데이터를 JSON으로 내보내기", setExport: "내보내기",
        setManage: "관리", setNotifConfirmTitle: "이메일 알림을 활성화할까요?", setNotifConfirmBody: "이 옵션을 켜면 새 장소가 추가될 때마다 이메일을 받는 것에 동의하는 것입니다 — 빈도는 아티스트의 현재 활동량에 따라 달라집니다(컴백이나 투어 중에는 더 자주, 그 외에는 더 조용하게). 아래에서 관심 있는 그룹과 국가를(를) 선택하세요.", setNotifEnableBtn: "활성화", setPushNotifConfirmTitle: "푸시 알림을 활성화할까요?", setPushNotifConfirmBody: "이 옵션을 켜면 새 장소가 추가될 때마다 푸시 알림을 받는 것에 동의하는 것입니다 — 빈도는 아티스트의 현재 활동량에 따라 달라집니다(컴백이나 투어 중에는 더 자주, 그 외에는 더 조용하게). 아래에서 관심 있는 그룹과 국가를(를) 선택하세요.", setNotifGroupsLabel: "알림을 받을 그룹", setNotifCountryLabel: "알림을 받을 국가(복수 선택 가능)", setNotifAllCountries: "모든 국가", setNotifSearchCountry: "국가 검색...", setCookiePrefsTitle: "쿠키 설정", setCookiePrefsBody: "필수 쿠키는 사이트가 작동하는 데 필요하며(로그인, 저장된 위시리스트) 끌 수 없습니다. 방문 간에 선호도를 기억하는 쿠키를 추가로 사용할지는 직접 선택할 수 있습니다.", setCookieNecessary: "필수", setCookieNecessarySub: "항상 활성화됨", setCookieAnalytics: "선호도 및 분석", setCookieAnalyticsSub: "방문 간 선택 사항을 기억합니다", setSavePreferences: "환경설정 저장",
        setDanger: "위험 구역", setDeleteAccTitle: "계정 삭제", setDeleteAccSub: "여행, 위시리스트, 잠금 해제된 이용권이 영구적으로 삭제됩니다.", setDeleteAccBtn: "계정 삭제",
        wishTitle: "내 위시리스트", wishEmpty: "아직 저장한 장소가 없습니다. 지도를 둘러보고 「위시리스트에 추가」를 클릭해보세요!", wishSomeday: "언젠가 / 아직 정해진 여행 없음",
        visitTitle: "내가 방문한 장소", visitEmpty: "아직 방문으로 표시한 장소가 없습니다. 지도를 둘러보고 「이 장소를 방문했어요」를 체크해보세요!",
        destTitle: "여행지 둘러보기", destSub: "Screen To Street에 소개된 모든 국가와 도시를 살펴보세요", destCountries: "국가", destCities: "도시", destLocations: "장소", destViewMap: "지도에서 보기 →",
        artTitle: "아티스트 둘러보기", artSub: "Screen To Street에 소개된 모든 그룹을 만나보세요", artGroups: "그룹", artFeatured: "추천 그룹",

        gateLoginTitle: "계속하려면 로그인하세요", gateLoginDesc: "지도를 보려면 계정이 필요합니다.",
        gateEmailLabel: "이메일 주소", gatePasswordLabel: "비밀번호", gateForgotPassword: "비밀번호를 잊으셨나요?",
        gateLoginBtn: "로그인", gateOrDivider: "또는", gateGoogleBtn: "Google로 계속하기",
        gateSignupPrompt: "계정이 없으신가요?", gateSignupLink: "회원가입",
        gateNoGroupsTitle: "지도를 보려면 그룹을 잠금 해제하세요", gateNoGroupsDesc: "아직 잠금 해제한 그룹이 없습니다. 아래를 클릭해 이용권을 선택하고 둘러보기를 시작하세요.",
        gateUnlockBtn: "그룹 잠금 해제하기", gateLogoutLink: "로그아웃",
        gateErrorInvalid: "이메일 또는 비밀번호가 올바르지 않습니다.", gateErrorGeneric: "문제가 발생했습니다. 다시 시도해주세요.",
        gateResetSent: "비밀번호 재설정 이메일을 보냈습니다 — 받은편지함을 확인해주세요.", gateEnterEmailFirst: "먼저 이메일 주소를 입력해주세요."
    },
    ja: {
        btnGenerateIti: "自動旅程ジェネレーター", filterGroup: "グループ", filterMember: "メンバー", filterArea: "エリア", filterYear: "年", filterCategories: "カテゴリー",
        locationsCount: "スポット", statsCountries: "国", cookieText: "より良い体験のためにクッキーを使用しています。", cookiePolicy: "クッキーポリシー",
        cookieManage: "管理", cookieReject: "拒否", cookieAccept: "同意",
        exploreDestOption: "旅先を探す", exploreArtistsOption: "アーティストを探す", accountOption: "アカウント",
        visitedOption: "訪れた場所", wishlistOption: "ウィッシュリスト", tripsOption: "マイトリップ", settingsOption: "設定", logoutOption: "ログアウト",
        footerText: "Screen To Streetはファンによる独立系ガイドです。", footerMentions: "特定商取引法に基づく表記", footerAbout: "私たちについて", footerTOS: "利用規約", footerPrivacy: "プライバシーポリシー",
        allGroups: "すべてのグループ", allMembers: "すべてのメンバー", allAreas: "すべてのエリア", allYears: "すべての年", allCategories: "すべてのカテゴリー",
        checkVisited: "この場所を訪れました", checkWishlist: "ウィッシュリストに追加", tripWhich: "どの旅行のためですか？",
        tripName: "旅行の名前", tripWhen: "いつ行く予定ですか？", tripFrom: "開始", tripTo: "終了", tripCreate: "旅行を作成", tripCancel: "キャンセル",
        itiTitle: "自動旅程ジェネレーター", itiDesc: "グループ、国、滞在日数を選択してください。", itiCreateBtn: "ガイドを作成", itiCatLabel: "カテゴリー（任意、複数選択可）", itiExport: "ガイドをPDFで出力", itiSave: "マイトリップに保存",
        noTripsFound: "旅行が見つかりません。", selectTripToView: "表示する旅行を選択", locationsWord: "スポット", locationsWordPlural: "スポット",
        addAnotherVisit: "別の訪問を追加",
        tabExplore: "探索", tabMyItinerary: "マイ旅程", yourRating: "評価", whenDidYouVisit: "いつ訪れましたか？", saveMemory: "思い出を保存", myVisitTab: "マイビジット",
        backToMap: "← 地図に戻る", moreDetails: "詳細を見る", openInMaps: "Googleマップで開く", detailsLabel: "詳細", aboutPlaceLabel: "この場所について",
        accTitle: "アカウント", accChangePhoto: "プロフィール写真を変更", accNameLabel: "名前", accEmailLabel: "メールアドレス",
        accActivityTitle: "アクティビティ", accTrips: "旅行", accVisited: "訪問済み", accWishlist: "ウィッシュリスト", accPasses: "パスとお支払い",
        accEditBtn: "プロフィールを編集", accSaveBtn: "変更を保存", accSaved: "✓ 保存しました", accNoPasses: "有効なパスはありません",
        accDangerZone: "危険ゾーン",
        accDeleteConfirmTitle: "本当にアカウントを削除しますか？",
        accDeleteConfirmBody: "この操作は取り消せません。解除済みのパスは返金されず、旅行・ウィッシュリスト・訪れた場所を含むすべてのデータが完全に失われます。",
        accDeletePasswordLabel: "パスワードを確認してください", accDeleteCancel: "キャンセル", accDeleteConfirmBtn: "はい、アカウントを削除します",
        accDeleteGoogleReauthNote: "セキュリティのため、アカウントを完全に削除する前にGoogleでご本人確認が必要です。下の「Googleで確認」をクリックしてください。",
        setTitle: "設定", setSecurity: "アカウントとセキュリティ", setPassword: "パスワード", setPasswordSub: "3か月前に変更済み", setChange: "変更",
        setChangePwTitle: "パスワードを変更", setChangePwGoogleNote: "このアカウントはGoogleログインを使用しているため、変更できるScreen To Streetのパスワードはありません — Googleアカウントから管理してください。", setCurrentPwLabel: "現在のパスワード", setNewPwLabel: "新しいパスワード", setConfirmPwLabel: "新しいパスワード（確認）", setChangePwBtn: "パスワードを変更",
        setSignedWith: "ログイン方法", setPreferences: "環境設定", setLanguage: "言語", setCurrency: "通貨", setUnits: "距離の単位",
        setEmailNotif: "メール通知", setPushNotif: "プッシュ通知", setPrivacy: "プライバシー", setCookiePrefs: "クッキー設定",
        setResetBanners: "バナーをリセット", setDownloadData: "データをダウンロード", setExportSub: "すべてのデータをJSONで出力", setExport: "出力",
        setManage: "管理", setNotifConfirmTitle: "メール通知を有効にしますか？", setNotifConfirmBody: "有効にすると、新しい場所が追加されるたびにメールを受け取ることに同意したことになります — 頻度はアーティストの現在の活動状況によって変わります（カムバックやツアー中は頻繁に、それ以外は控えめに）。以下で興味のあるグループと国を選んでください。", setNotifEnableBtn: "有効にする", setPushNotifConfirmTitle: "プッシュ通知を有効にしますか？", setPushNotifConfirmBody: "有効にすると、新しい場所が追加されるたびにプッシュ通知を受け取ることに同意したことになります — 頻度はアーティストの現在の活動状況によって変わります（カムバックやツアー中は頻繁に、それ以外は控えめに）。以下で興味のあるグループと国を選んでください。", setNotifGroupsLabel: "通知を受け取るグループ", setNotifCountryLabel: "通知を受け取る国（複数選択可）", setNotifAllCountries: "すべての国", setNotifSearchCountry: "国を検索...", setCookiePrefsTitle: "クッキー設定", setCookiePrefsBody: "必須クッキーはサイトの動作（ログイン、保存されたウィッシュリスト）に必要で、無効にはできません。訪問間で設定を記憶するクッキーを追加で使うかどうかは選択できます。", setCookieNecessary: "必須", setCookieNecessarySub: "常に有効", setCookieAnalytics: "設定と分析", setCookieAnalyticsSub: "訪問間で選択内容を記憶します", setSavePreferences: "設定を保存",
        setDanger: "危険ゾーン", setDeleteAccTitle: "アカウントを削除", setDeleteAccSub: "旅行、ウィッシュリスト、解除済みパスが完全に削除されます。", setDeleteAccBtn: "アカウントを削除",
        wishTitle: "ウィッシュリスト", wishEmpty: "まだ保存した場所がありません。地図を見て「ウィッシュリストに追加」をクリックしてみましょう！", wishSomeday: "いつか / まだ旅行の予定なし",
        visitTitle: "訪れた場所", visitEmpty: "まだ訪問済みにした場所がありません。地図を見て「この場所を訪れました」にチェックしてみましょう！",
        destTitle: "旅先を探す", destSub: "Screen To Streetで紹介されているすべての国と都市をチェック", destCountries: "国", destCities: "都市", destLocations: "スポット", destViewMap: "地図で見る →",
        artTitle: "アーティストを探す", artSub: "Screen To Streetで紹介されているすべてのグループを見る", artGroups: "グループ", artFeatured: "注目のグループ",

        gateLoginTitle: "続けるにはログインしてください", gateLoginDesc: "地図を見るにはアカウントが必要です。",
        gateEmailLabel: "メールアドレス", gatePasswordLabel: "パスワード", gateForgotPassword: "パスワードをお忘れですか？",
        gateLoginBtn: "ログイン", gateOrDivider: "または", gateGoogleBtn: "Googleで続ける",
        gateSignupPrompt: "アカウントをお持ちでないですか？", gateSignupLink: "新規登録",
        gateNoGroupsTitle: "地図を見るにはグループを解除してください", gateNoGroupsDesc: "まだグループを解除していません。下のボタンからパスを選んで探索を始めましょう。",
        gateUnlockBtn: "グループを解除する", gateLogoutLink: "ログアウト",
        gateErrorInvalid: "メールアドレスまたはパスワードが正しくありません。", gateErrorGeneric: "問題が発生しました。もう一度お試しください。",
        gateResetSent: "パスワード再設定メールを送信しました — 受信トレイをご確認ください。", gateEnterEmailFirst: "先にメールアドレスを入力してください。"
    },
    zh: {
        btnGenerateIti: "自动行程生成器", filterGroup: "团体", filterMember: "成员", filterArea: "地区", filterYear: "年份", filterCategories: "分类",
        locationsCount: "地点", statsCountries: "国家", cookieText: "我们使用 Cookie 来改善您的体验。", cookiePolicy: "Cookie 政策",
        cookieManage: "管理", cookieReject: "拒绝", cookieAccept: "接受",
        exploreDestOption: "探索目的地", exploreArtistsOption: "探索艺人", accountOption: "我的账户",
        visitedOption: "已访问的地点", wishlistOption: "我的收藏清单", tripsOption: "我的行程", settingsOption: "设置", logoutOption: "退出登录",
        footerText: "Screen To Street 是由粉丝创建的独立指南。", footerMentions: "法律声明", footerAbout: "关于我们", footerTOS: "服务条款", footerPrivacy: "隐私政策",
        allGroups: "所有团体", allMembers: "所有成员", allAreas: "所有地区", allYears: "所有年份", allCategories: "所有分类",
        checkVisited: "我去过这个地方", checkWishlist: "添加到收藏清单", tripWhich: "这是为哪次行程添加的？",
        tripName: "行程名称", tripWhen: "您计划什么时候出发？", tripFrom: "开始日期", tripTo: "结束日期", tripCreate: "创建行程", tripCancel: "取消",
        itiTitle: "自动行程生成器", itiDesc: "选择一个团体、一个国家，以及停留天数。", itiCreateBtn: "生成我的指南", itiCatLabel: "类别（可选，可多选）", itiExport: "导出指南为 PDF", itiSave: "保存到我的行程",
        noTripsFound: "未找到任何行程。", selectTripToView: "选择要查看的行程", locationsWord: "个地点", locationsWordPlural: "个地点",
        addAnotherVisit: "添加另一次访问",
        tabExplore: "探索", tabMyItinerary: "我的行程", yourRating: "你的评分", whenDidYouVisit: "你什么时候去的？", saveMemory: "保存回忆", myVisitTab: "我的到访",
        backToMap: "← 返回地图", moreDetails: "更多详情", openInMaps: "在 Google 地图中打开", detailsLabel: "详情", aboutPlaceLabel: "关于这个地方",
        accTitle: "我的账户", accChangePhoto: "更换头像", accNameLabel: "姓名", accEmailLabel: "电子邮箱",
        accActivityTitle: "我的动态", accTrips: "行程", accVisited: "已访问", accWishlist: "收藏清单", accPasses: "通行证与账单",
        accEditBtn: "编辑资料", accSaveBtn: "保存更改", accSaved: "✓ 保存成功", accNoPasses: "暂无有效通行证",
        accDangerZone: "危险区域",
        accDeleteConfirmTitle: "确定要删除您的账户吗？",
        accDeleteConfirmBody: "此操作不可撤销。已解锁的通行证不会退款，且您的所有数据——行程、收藏清单和已访问地点——都将被永久删除。",
        accDeletePasswordLabel: "请确认您的密码", accDeleteCancel: "取消", accDeleteConfirmBtn: "是的，删除我的账户",
        accDeleteGoogleReauthNote: "出于安全考虑，在永久删除您的账户之前，需要通过 Google 确认您的身份。请点击下方的「通过 Google 确认」。",
        setTitle: "设置", setSecurity: "账户与安全", setPassword: "密码", setPasswordSub: "上次修改于 3 个月前", setChange: "修改",
        setChangePwTitle: "修改密码", setChangePwGoogleNote: "您的账户使用 Google 登录，因此没有需要修改的 Screen To Street 密码——请通过您的 Google 账户进行管理。", setCurrentPwLabel: "当前密码", setNewPwLabel: "新密码", setConfirmPwLabel: "确认新密码", setChangePwBtn: "修改密码",
        setSignedWith: "登录方式", setPreferences: "偏好设置", setLanguage: "语言", setCurrency: "货币", setUnits: "距离单位",
        setEmailNotif: "邮件通知", setPushNotif: "推送通知", setPrivacy: "隐私", setCookiePrefs: "Cookie 偏好设置",
        setResetBanners: "重置提示横幅", setDownloadData: "下载我的数据", setExportSub: "以 JSON 格式导出全部数据", setExport: "导出",
        setManage: "管理", setNotifConfirmTitle: "开启邮件通知？", setNotifConfirmBody: "开启后，即表示您同意在新增地点时收到邮件通知——频率取决于该艺人当前的活跃程度（回归或巡演期间更频繁，其余时间较少）。请在下方选择您关心的组合和国家。", setNotifEnableBtn: "开启", setPushNotifConfirmTitle: "开启推送通知？", setPushNotifConfirmBody: "开启后，即表示您同意在新增地点时收到推送通知——频率取决于该艺人当前的活跃程度（回归或巡演期间更频繁，其余时间较少）。请在下方选择您关心的组合和国家。", setNotifGroupsLabel: "为以下组合通知我", setNotifCountryLabel: "为以下国家通知我（可多选）", setNotifAllCountries: "所有国家", setNotifSearchCountry: "搜索国家...", setCookiePrefsTitle: "Cookie 偏好设置", setCookiePrefsBody: "必要 Cookie 用于保证网站正常运行（登录、已保存的心愿单），无法关闭。您可以选择是否同时使用 Cookie 来记住您在不同访问之间的偏好设置。", setCookieNecessary: "必要", setCookieNecessarySub: "始终启用", setCookieAnalytics: "偏好与分析", setCookieAnalyticsSub: "记住您在不同访问之间的选择", setSavePreferences: "保存偏好设置",
        setDanger: "危险区域", setDeleteAccTitle: "删除账户", setDeleteAccSub: "此操作将永久删除您的行程、收藏清单和已解锁的通行证。", setDeleteAccBtn: "删除账户",
        wishTitle: "我的收藏清单", wishEmpty: "您还没有收藏任何地点。快去地图上点击「添加到收藏清单」吧！", wishSomeday: "以后再说 / 暂无行程",
        visitTitle: "我已访问的地点", visitEmpty: "您还没有标记任何已访问的地点。快去地图上勾选「我去过这个地方」吧！",
        destTitle: "探索目的地", destSub: "浏览 Screen To Street 收录的所有国家和城市", destCountries: "国家", destCities: "城市", destLocations: "地点", destViewMap: "在地图上查看 →",
        artTitle: "探索艺人", artSub: "了解 Screen To Street 收录的所有团体", artGroups: "团体", artFeatured: "精选团体",

        gateLoginTitle: "登录以继续", gateLoginDesc: "您需要一个账户才能浏览地图。",
        gateEmailLabel: "电子邮箱", gatePasswordLabel: "密码", gateForgotPassword: "忘记密码？",
        gateLoginBtn: "登录", gateOrDivider: "或", gateGoogleBtn: "使用 Google 继续",
        gateSignupPrompt: "还没有账户？", gateSignupLink: "注册",
        gateNoGroupsTitle: "解锁一个团体以查看地图", gateNoGroupsDesc: "您还没有解锁任何团体。点击下方选择通行证，开始探索吧。",
        gateUnlockBtn: "解锁一个团体", gateLogoutLink: "退出登录",
        gateErrorInvalid: "邮箱或密码不正确。", gateErrorGeneric: "出现了一些问题，请重试。",
        gateResetSent: "密码重置邮件已发送——请查收您的收件箱。", gateEnterEmailFirst: "请先输入您的电子邮箱。"
    }
};

const catTranslations = {
    "Run BTS": "Run BTS", "Bon Voyage": "Bon Voyage", 
    "Restaurants": {en: "Restaurants", fr: "Restaurants"}, 
    "Cafe": {en: "Cafe", fr: "Café"}, 
    "Museums": {en: "Museums", fr: "Musées"}, 
    "MV Location": "MV Location", "Concerts": "Concerts", 
    "Fashion": {en: "Fashion", fr: "Mode"}, 
    "Landmarks": {en: "Landmarks", fr: "Lieux mythiques"}, 
    "Pop-up Store": "Pop-up Store"
};

function getCatName(cat) {
    if (catTranslations[cat] && typeof catTranslations[cat] === 'object') { return catTranslations[cat][currentLang]; }
    return catTranslations[cat] || cat;
}
// Repli automatique vers l'anglais : si une clé n'existe pas encore pour la langue
// choisie (ex : contenu pas encore traduit dans les 6 nouvelles langues), on affiche
// la version anglaise plutôt que la clé brute ou un texte vide.
function t(key) {
    if (translations[currentLang] && translations[currentLang][key]) return translations[currentLang][key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return key;
}
function getLocText(field) { return field ? (field[currentLang] || field.en || "") : ""; }

window.changeLang = function(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateUI();
};

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(translations[currentLang] && translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });

    if(document.getElementById('edit-trip-name')) {
        const isFr = currentLang === 'fr';
        const eSub = document.getElementById('i18n-sub'); if(eSub) eSub.textContent = isFr ? "Sur les traces de vos artistes préférés" : "Following the footsteps of your favorite artists";
        const eOpen = document.getElementById('i18n-open-iti'); if(eOpen) eOpen.textContent = isFr ? "Ouvrir le Générateur" : "Open Auto-Itinerary Generator";
        const eNeed = document.getElementById('i18n-need-magic'); if(eNeed) eNeed.textContent = isFr ? "Besoin de magie ?" : "Need some magic?";
        const eDur = document.getElementById('i18n-trip-duration'); if(eDur) eDur.textContent = isFr ? "Durée & Dates" : "Trip Duration & Dates";
        const eAdd = document.getElementById('i18n-add-more'); if(eAdd) eAdd.textContent = isFr ? "+ Ajouter des lieux" : "+ Add more locations";
        const eReco = document.getElementById('i18n-reco'); if(eReco) eReco.textContent = isFr ? "RECOMMANDÉ POUR CE VOYAGE (MÊME PAYS)" : "RECOMMENDED FOR THIS TRIP (SAME COUNTRY)";
        const eIti = document.getElementById('i18n-your-iti'); if(eIti) eIti.textContent = isFr ? "VOTRE ITINÉRAIRE" : "YOUR ITINERARY";
        const eAddDay = document.getElementById('i18n-add-day'); if(eAddDay) eAddDay.textContent = isFr ? "Ajouter un jour" : "Add an empty day";
        const eCancel = document.getElementById('i18n-cancel'); if(eCancel) eCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eModAdd = document.getElementById('i18n-modal-add'); if(eModAdd) eModAdd.textContent = isFr ? "Ajouter au voyage" : "Add to this Trip";
        const eCreateTitle = document.getElementById('i18n-create-title'); if(eCreateTitle) eCreateTitle.textContent = isFr ? "Créer un nouveau voyage" : "Create a new trip";
        const eBtnCreate = document.getElementById('i18n-btn-create'); if(eBtnCreate) eBtnCreate.textContent = isFr ? "Créer" : "Create";
        const eDelTitle = document.getElementById('i18n-del-title'); if(eDelTitle) eDelTitle.textContent = isFr ? "Supprimer ce voyage ?" : "Delete this trip?";
        const eDelDesc = document.getElementById('i18n-del-desc'); if(eDelDesc) eDelDesc.textContent = isFr ? "Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible." : "Are you sure you want to delete this trip? This cannot be undone.";
        const eDelCancel = document.getElementById('i18n-del-cancel'); if(eDelCancel) eDelCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eDelConfirm = document.getElementById('i18n-del-confirm'); if(eDelConfirm) eDelConfirm.textContent = isFr ? "Supprimer" : "Delete";
        
        const eRmLocTitle = document.getElementById('i18n-rm-loc-title'); if(eRmLocTitle) eRmLocTitle.textContent = isFr ? "Retirer ce lieu ?" : "Remove location?";
        const eRmLocDesc = document.getElementById('i18n-rm-loc-desc'); if(eRmLocDesc) eRmLocDesc.textContent = isFr ? "Êtes-vous sûr de vouloir retirer ce lieu de votre voyage ?" : "Are you sure you want to remove this location from your trip?";
        const eRmLocCancel = document.getElementById('i18n-rm-loc-cancel'); if(eRmLocCancel) eRmLocCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eRmLocConfirm = document.getElementById('i18n-rm-loc-confirm'); if(eRmLocConfirm) eRmLocConfirm.textContent = isFr ? "Retirer" : "Remove";

        const eRmDayTitle = document.getElementById('i18n-rm-day-title'); if(eRmDayTitle) eRmDayTitle.textContent = isFr ? "Supprimer ce jour ?" : "Delete this day?";
        const eRmDayDesc = document.getElementById('i18n-rm-day-desc'); if(eRmDayDesc) eRmDayDesc.textContent = isFr ? "Les lieux retourneront dans les non assignés." : "Locations will return to unassigned.";
        const eRmDayCancel = document.getElementById('i18n-rm-day-cancel'); if(eRmDayCancel) eRmDayCancel.textContent = isFr ? "Annuler" : "Cancel";
        const eRmDayConfirm = document.getElementById('i18n-rm-day-confirm'); if(eRmDayConfirm) eRmDayConfirm.textContent = isFr ? "Supprimer" : "Delete";

        if(typeof window.initTrips === 'function') window.initTrips();
    }

    const yearSelect = document.getElementById('year-select');
    if(yearSelect) {
        const yearOpt = yearSelect.querySelector('option[value="All"]');
        if(yearOpt) yearOpt.textContent = t('allYears');
    }

    if(document.getElementById('group-select')) {
        initializeFilters();
        renderLocations();
    }
    
    window.initItineraryGenerator();

    // Rafraîchit le libellé du sélecteur de voyage (My Itinerary) si aucun voyage n'est sélectionné
    const tripLabel = document.getElementById('trip-select-label');
    if(tripLabel && !localStorage.getItem('activeTripId')) {
        tripLabel.textContent = t('selectTripToView');
    }
}

window.openItineraryModal = function() {
    document.getElementById('iti-result').classList.add('hidden');
    document.getElementById('itinerary-modal').classList.remove('hidden');
    window.initItineraryGenerator();
}

window.initItineraryGenerator = function() {
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    const gSelectIti = document.getElementById('iti-group');
    const cSelectIti = document.getElementById('iti-country');
    const citySelectIti = document.getElementById('iti-city');

    if(gSelectIti && gSelectIti.options.length === 0) {
        const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
        availableGroups.forEach(g => gSelectIti.innerHTML += `<option value="${g}">${g}</option>`);
        [...new Set(availableLocs.map(l => l.country))].sort().forEach(c => cSelectIti.innerHTML += `<option value="${c}">${c}</option>`);
        if(citySelectIti) window.updateItiCity();

        if(!gSelectIti._hasCatListener) {
            gSelectIti._hasCatListener = true;
            // Les catégories dépendent uniquement du groupe sélectionné (BTS et Blackpink n'ont
            // pas les mêmes catégories) : on les régénère à chaque changement de groupe.
            gSelectIti.addEventListener('change', window.updateItiCategories);
        }
    }
    window.updateItiCategories();
};

window.updateItiCity = function() {
    const country = document.getElementById('iti-country').value;
    const citySel = document.getElementById('iti-city');
    if(!citySel) return;

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let locs = availableLocs;
    if(country) locs = locs.filter(l => l.country === country);

    citySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Toutes les villes (Optionnel)' : 'All Cities (Optional)'}</option>`;
    const cities = [...new Set(locs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySel.innerHTML += `<option value="${c}">${c}</option>`);
}

// Multi-select des catégories de lieux pour l'Auto-Itinerary Generator : les options
// affichées dépendent du groupe choisi (ex : seules les catégories propres à BTS si BTS est
// sélectionné), pour ne jamais proposer un filtre qui ne donnerait aucun résultat.
window.updateItiCategories = function() {
    const group = document.getElementById('iti-group')?.value;
    const catContainer = document.getElementById('iti-categories');
    if(!catContainer || !group) return;

    const cats = (filterData[group] && filterData[group].categories) ? filterData[group].categories : filterData["General"].categories;
    // Une sélection existante qui ne fait plus partie des catégories du (nouveau) groupe est
    // abandonnée ; celle qui reste valable (ex: simple rafraîchissement de langue) est conservée.
    itiSelectedCategories = itiSelectedCategories.filter(c => cats.includes(c));

    catContainer.innerHTML = cats.map(cat =>
        `<div class="cat-card iti-cat-pill${itiSelectedCategories.includes(cat) ? ' active' : ''}" data-cat="${cat}">${getCatName(cat)}</div>`
    ).join('');

    catContainer.querySelectorAll('.iti-cat-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            const cat = this.getAttribute('data-cat');
            if(itiSelectedCategories.includes(cat)) {
                itiSelectedCategories = itiSelectedCategories.filter(c => c !== cat);
                this.classList.remove('active');
            } else {
                itiSelectedCategories.push(cat);
                this.classList.add('active');
            }
        });
    });
};

// ==========================================
// 4. AFFICHAGE DES LIEUX ET FILTRES (MAP.HTML)
// ==========================================
function initializeFilters() {
    const groupSelect = document.getElementById('group-select');
    const memberSelect = document.getElementById('member-select');
    const countrySelect = document.getElementById('country-select');
    const categoryButtonsContainer = document.getElementById('category-buttons');
    if(!groupSelect) return;
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
    
    if(groupSelect.options.length === 0 || groupSelect.options[0].text !== t('allGroups')) {
        groupSelect.innerHTML = `<option value="All">${t('allGroups')}</option>`;
        availableGroups.forEach(g => groupSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }

    const selectedGroup = groupSelect.value;
    memberSelect.innerHTML = `<option value="All">${t('allMembers')}</option>`;
    countrySelect.innerHTML = `<option value="All">${t('allAreas')}</option>`;
    
    categoryButtonsContainer.innerHTML = `<div class="cat-card active" data-cat="All">${t('allCategories')}</div>`;
    activeCategory = "All";
    
    const filteredByGroup = selectedGroup === "All" ? availableLocs : availableLocs.filter(l => l.group === selectedGroup);
    [...new Set(filteredByGroup.map(loc => loc.country))].sort().forEach(c => countrySelect.innerHTML += `<option value="${c}">${c}</option>`);

    let catsToShow = (selectedGroup !== "All" && filterData[selectedGroup]) ? filterData[selectedGroup].categories : filterData["General"].categories;
    if(selectedGroup !== "All" && filterData[selectedGroup]) filterData[selectedGroup].members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    
    catsToShow.forEach(cat => categoryButtonsContainer.innerHTML += `<div class="cat-card" data-cat="${cat}">${getCatName(cat)}</div>`);

    document.querySelectorAll('.cat-card').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.cat-card').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.getAttribute('data-cat');
            renderLocations();
        });
    });

    if(!groupSelect._hasListener) {
        groupSelect._hasListener = true;
        [groupSelect, memberSelect, document.getElementById('year-select'), countrySelect].forEach(el => {
            if(el) el.addEventListener('change', () => { if(el===groupSelect) initializeFilters(); renderLocations(); });
        });
        const sInput = document.getElementById('search-input');
        if(sInput) sInput.addEventListener('input', renderLocations);
    }
}

function renderLocations() {
    const groupSelect = document.getElementById('group-select');
    const memberSelect = document.getElementById('member-select');
    const yearSelect = document.getElementById('year-select');
    const countrySelect = document.getElementById('country-select');
    const searchInput = document.getElementById('search-input');
    
    if(!groupSelect || !map) return; 
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    if(!locationListElement) return;
    locationListElement.innerHTML = '';

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    const fGroup = groupSelect.value, fMember = memberSelect.value, fYear = yearSelect.value, fCountry = countrySelect.value, searchTerm = searchInput.value.toLowerCase();

    const filteredLocations = availableLocs.filter(loc => {
        return (fGroup === "All" || loc.group === fGroup) && (fMember === "All" || loc.member === fMember || loc.member === "All") && 
               (activeCategory === "All" || loc.category === activeCategory) && (fYear === "All" || loc.year === fYear) &&
               (fCountry === "All" || loc.country === fCountry) && (loc.name.toLowerCase().includes(searchTerm) || (loc.city && loc.city.toLowerCase().includes(searchTerm)));
    });

    currentFilteredLocations = filteredLocations;

    const cSidebar = document.getElementById('location-count-sidebar');
    if(cSidebar) cSidebar.textContent = filteredLocations.length;
    
    const sLocations = document.getElementById('stat-locations');
    if(sLocations) sLocations.textContent = filteredLocations.length;
    
    const sCountries = document.getElementById('stat-countries');
    if(sCountries) sCountries.textContent = new Set(filteredLocations.map(l => l.country)).size;

    let visitedData = JSON.parse(localStorage.getItem('visitedLocs') || '[]');

    filteredLocations.forEach(loc => {
        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        const isVisited = visitedData.some(v => v.id === loc.id || v === loc.id);
        const baseColor = groupColors[loc.group] || '#334e68';

        const cardBgColor = isVisited ? `${baseColor}15` : '#faf9fc';
        const card = document.createElement('div');
        card.className = 'loc-item';
        card.style.background = cardBgColor;
        card.innerHTML = `
            <div class="loc-icon-box" style="color:${baseColor}; background:${baseColor}1A;">${catIconSvg}</div>
            <div class="loc-info">
                <div class="loc-cat">${getCatName(loc.category)} &middot; ${loc.city || ''}</div>
                <div class="loc-name">${loc.name}</div>
            </div>
        `;
        card.addEventListener('click', () => { map.flyTo([loc.lat, loc.lng], 16); window.openDetailsPanel(loc.id); });
        locationListElement.appendChild(card);
    });

    renderMapMarkers(filteredLocations, { fitBounds: true });
}

// ==========================================
// 4bis. REGROUPEMENT DES MARQUEURS TROP PROCHES (CLUSTERING)
// ==========================================
// Quand on dézoome (ex: toute la Corée du Sud visible d'un coup), des dizaines de lieux
// très proches géographiquement finissent en pixels quasi au même endroit et deviennent
// une bouillie d'icônes illisible. On les regroupe alors en un seul marqueur avec un
// badge "×N" ; recalculé à chaque changement de zoom (les lieux qui se séparent
// suffisamment en zoomant redeviennent des marqueurs individuels).
const CLUSTER_PIXEL_RADIUS = 45;
// Au zoom maximal (limite de la tuile OSM, voir maxZoom du tileLayer plus bas), deux
// lieux réellement distincts mais très proches en vrai (ex: deux cafés de la même rue)
// peuvent encore projeter à moins de 45px l'un de l'autre et rester fusionnés en un
// cluster "×2" — trompeur puisque l'utilisateur est déjà au niveau de zoom maximum et ne
// peut pas zoomer davantage pour les séparer. On désactive donc le clustering dès ce
// niveau : chaque lieu redevient son propre marqueur individuel.
const MAP_MAX_ZOOM = 19;

function clusterLocationsForZoom(locations, zoom) {
    if (zoom >= MAP_MAX_ZOOM) return locations.map(loc => ({ locs: [loc], center: [loc.lat, loc.lng] }));

    const points = locations.map(loc => ({ loc, px: map.project([loc.lat, loc.lng], zoom) }));
    const used = new Array(points.length).fill(false);
    const clusters = [];

    for (let i = 0; i < points.length; i++) {
        if (used[i]) continue;
        const group = [points[i]];
        used[i] = true;
        for (let j = i + 1; j < points.length; j++) {
            if (used[j]) continue;
            if (points[i].px.distanceTo(points[j].px) <= CLUSTER_PIXEL_RADIUS) {
                group.push(points[j]);
                used[j] = true;
            }
        }
        const avgLat = group.reduce((sum, g) => sum + g.loc.lat, 0) / group.length;
        const avgLng = group.reduce((sum, g) => sum + g.loc.lng, 0) / group.length;
        clusters.push({ locs: group.map(g => g.loc), center: [avgLat, avgLng] });
    }
    return clusters;
}

function addSingleLocationMarker(loc, visitedData) {
    const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
    const isVisited = visitedData.some(v => v.id === loc.id || v === loc.id);
    const baseColor = groupColors[loc.group] || '#334e68';

    let inlineStyle = `border-color: ${baseColor}; --marker-color: ${baseColor};`;
    inlineStyle += isVisited ? ` background-color: ${baseColor}; color: white;` : ` background-color: white; color: ${baseColor};`;

    const customIcon = L.divIcon({ className: 'custom-category-marker', html: `<div style="${inlineStyle}">${catIconSvg}</div>`, iconSize: [32,32], iconAnchor: [16,16] });
    const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markerGroup);
    marker.on('click', () => window.openDetailsPanel(loc.id));
}

function addClusterMarker(cluster) {
    // Couleur représentative : le groupe le plus fréquent dans le cluster, pour que le
    // marqueur groupé garde un sens visuel même quand plusieurs groupes sont mélangés.
    const groupCounts = {};
    cluster.locs.forEach(l => { groupCounts[l.group] = (groupCounts[l.group] || 0) + 1; });
    const dominantGroup = Object.keys(groupCounts).sort((a, b) => groupCounts[b] - groupCounts[a])[0];
    const baseColor = groupColors[dominantGroup] || '#334e68';
    const count = cluster.locs.length;

    // Le badge (span, pas div) et le conteneur (span aussi) évitent volontairement le
    // sélecteur CSS ".custom-category-marker div", qui appliquerait sinon le style rond
    // du marqueur à tout div descendant, y compris le conteneur et le badge.
    const html = `
        <span style="position:relative; display:inline-block;">
            <div style="border-color:${baseColor}; --marker-color:${baseColor}; background-color:${baseColor}; color:#fff;">${CLUSTER_ICON_SVG}</div>
            <span class="cluster-badge">×${count}</span>
        </span>
    `;
    const clusterIcon = L.divIcon({ className: 'custom-category-marker', html, iconSize: [32, 32], iconAnchor: [16, 16] });
    const marker = L.marker(cluster.center, { icon: clusterIcon }).addTo(markerGroup);
    marker.on('click', () => { map.setView(cluster.center, Math.min(map.getZoom() + 3, 18)); });
}

function renderMapMarkers(locations, opts) {
    if (!map || !markerGroup) return;
    markerGroup.clearLayers();
    const visitedData = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
    const clusters = clusterLocationsForZoom(locations, map.getZoom());

    clusters.forEach(cluster => {
        if (cluster.locs.length === 1) addSingleLocationMarker(cluster.locs[0], visitedData);
        else addClusterMarker(cluster);
    });

    // Le fitBounds initial doit couvrir les vraies coordonnées de chaque lieu (pas les
    // centres de cluster, qui donneraient un cadrage trop serré) — seulement au premier
    // rendu / changement de filtre, jamais depuis le ré-agencement au zoom.
    if (opts && opts.fitBounds && locations.length > 0) {
        map.fitBounds(L.latLngBounds(locations.map(l => [l.lat, l.lng])), { padding: [50, 50], maxZoom: 16 });
    }
}

// ==========================================
// 5. ONGLETS EXPLORE / MY ITINERARY (MAP.HTML)
// ==========================================
window.switchMainTab = function(tabName) {
    document.querySelectorAll('.top-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sidebar-main-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
    });
    
    if (tabName === 'explore') {
        document.getElementById('tab-explore-btn').classList.add('active');
        const p = document.getElementById('sidebar-explore');
        if(p) { p.classList.remove('hidden'); p.classList.add('active'); }
        clearTripFromMainMap();
        renderLocations();
    } else if (tabName === 'itinerary') {
        document.getElementById('tab-itinerary-btn').classList.add('active');
        const p = document.getElementById('sidebar-itinerary');
        if(p) { p.classList.remove('hidden'); p.classList.add('active'); }
        loadItineraryTabOptions();
    }
}

// DROPDOWN CUSTOM POUR LA SELECTION DE VOYAGE (SANS INJECTION HTML DANGEREUSE)
window.toggleTripDropdown = function(e) {
    if(e) e.stopPropagation();
    const dropdown = document.getElementById('trip-dropdown-list');
    const chevron = document.getElementById('trip-select-chevron');
    const header = document.getElementById('trip-select-header-box');
    if(!dropdown || !chevron) return;
    if(header && header.classList.contains('disabled')) return; // rien à sélectionner, on ne fait rien
    
    if(dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
        if(header) header.classList.add('open');
    } else {
        dropdown.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
        if(header) header.classList.remove('open');
    }
};

document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.custom-trip-select');
    const dropdown = document.getElementById('trip-dropdown-list');
    const chevron = document.getElementById('trip-select-chevron');
    const header = document.getElementById('trip-select-header-box');
    if(wrapper && !wrapper.contains(e.target) && dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
        if(header) header.classList.remove('open');
    }
});

window.loadItineraryTabOptions = function() {
    const dropdownList = document.getElementById('trip-dropdown-list');
    const headerBox = document.getElementById('trip-select-header-box');
    const label = document.getElementById('trip-select-label');
    if(!dropdownList) return;
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const activeId = localStorage.getItem('activeTripId');
    dropdownList.innerHTML = '';
    
    if(trips.length > 0) {
        // Des voyages existent : le sélecteur redevient normalement cliquable.
        if(headerBox) headerBox.classList.remove('disabled');

        trips.forEach(tr => {
            let allAssignedIds = (tr.days || []).flat().map(Number);
            let durationTxt = tr.dateType === 'duration' ? (tr.duration || 'Flexible') : `${tr.days ? tr.days.length : 0} ${currentLang === 'fr' ? 'jours' : 'Days'}`;
            let locWord = allAssignedIds.length > 1 ? t('locationsWordPlural') : t('locationsWord');
            let locsTxt = `${allAssignedIds.length} ${locWord}`;
            const isActive = tr.id === activeId;

            // Création d'élément dynamique pour éviter tout bug lié aux apostrophes/guillemets dans le nom du trip
            let opt = document.createElement('div');
            opt.className = 'trip-option' + (isActive ? ' selected' : '');
            opt.onclick = () => selectCustomTrip(tr.id, tr.name);

            let body = document.createElement('div');
            body.className = 'trip-opt-body';

            let nameDiv = document.createElement('div');
            nameDiv.className = 'trip-opt-name';
            nameDiv.textContent = tr.name;

            let metaDiv = document.createElement('div');
            metaDiv.className = 'trip-opt-meta';
            metaDiv.innerHTML = `<span>${durationTxt}</span><span>&middot;</span><span>${locsTxt}</span>`;

            body.appendChild(nameDiv);
            body.appendChild(metaDiv);
            opt.appendChild(body);

            if(isActive) {
                let check = document.createElement('div');
                check.className = 'trip-opt-check';
                check.innerHTML = '✓';
                opt.appendChild(check);
            }

            dropdownList.appendChild(opt);
        });
    } else {
        // Aucun voyage : inutile de proposer un menu cliquable qui ne mènerait nulle
        // part — on le désactive et on l'indique directement dans le libellé.
        dropdownList.innerHTML = `<div class="trip-select-empty">${t('noTripsFound')}</div>`;
        if(headerBox) headerBox.classList.add('disabled');
        if(label) { label.textContent = t('noTripsFound'); label.style.color = '#94a3b8'; }
    }

    // NE PAS masquer/réinitialiser le voyage actif quand on rouvre l'onglet :
    // si un voyage était déjà sélectionné, on ré-affiche directement son itinéraire.
    if(activeId && trips.some(tr => tr.id === activeId)) {
        window.loadItineraryView(activeId);
    } else {
        document.getElementById('itinerary-content-container').classList.add('hidden');
        window.clearTripFromMainMap();
    }
};

window.selectCustomTrip = function(tripId, tripName) {
    const label = document.getElementById('trip-select-label');
    if(label) {
        label.textContent = tripName;
        label.style.color = '#1e293b';
    }
    
    window.toggleTripDropdown();
    localStorage.setItem('activeTripId', tripId);
    window.loadItineraryView(tripId);
};

window.loadItineraryView = function(tripId) {
    if(!tripId) {
        tripId = localStorage.getItem('activeTripId');
    }
    if(!tripId) {
        document.getElementById('itinerary-content-container').classList.add('hidden');
        window.clearTripFromMainMap();
        return;
    }

    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const trip = trips.find(t => t.id === tripId);
    if(!trip) return;

    localStorage.setItem('activeTripId', trip.id);
    document.getElementById('itinerary-content-container').classList.remove('hidden');

    const tripLabelEl = document.getElementById('trip-select-label');
    if(tripLabelEl) { tripLabelEl.textContent = trip.name; tripLabelEl.style.color = '#1e293b'; }

    document.getElementById('iti-view-name').textContent = trip.name;
    
    let allAssignedIds = (trip.days || []).flat().map(Number);
    document.getElementById('iti-view-loc-count').textContent = `${allAssignedIds.length} location${allAssignedIds.length > 1 ? 's' : ''}`;

    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    let totalSaved = wList.filter(w => w.tripId === trip.id).length;
    
    let countries = [...new Set(allAssignedIds.map(id => {
        let loc = celebLocations.find(l => Number(l.id) === id);
        return loc ? loc.country : null;
    }).filter(Boolean))];
    
    document.getElementById('iti-view-meta').textContent = `${countries.length} countr${countries.length > 1 ? 'ies' : 'y'} · ${totalSaved} total locations saved`;

    const timelineContainer = document.getElementById('iti-view-timeline');
    let timelineHtml = '';
    const dayColors = ['#D42759', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

    (trip.days || []).forEach((dayIds, idx) => {
        const color = dayColors[idx % dayColors.length];
        
        timelineHtml += `
            <div class="timeline-day">
                <div class="timeline-header">
                    <div class="timeline-dot" style="background:${color};"></div>
                    <span style="color:#212832;">Day ${idx + 1}</span>
                </div>
                <div class="timeline-body" style="border-left: 2px dashed ${color};">
        `;
        
        if (dayIds.length === 0) {
            timelineHtml += `<div class="timeline-loc-city" style="font-style:italic; text-align:left;">No locations planned</div>`;
        } else {
            dayIds.forEach(id => {
                const loc = celebLocations.find(l => Number(l.id) === Number(id));
                if(loc) {
                    timelineHtml += `
                        <div class="timeline-loc" onclick="map.flyTo([${loc.lat}, ${loc.lng}], 16); window.openDetailsPanel(${loc.id});" style="cursor:pointer;">
                            <span class="timeline-loc-name">${loc.name}</span>
                            <span class="timeline-loc-city">${loc.city || ''}</span>
                        </div>
                    `;
                }
            });
        }
        timelineHtml += `</div></div>`;
    });

    timelineContainer.innerHTML = timelineHtml;

    if(markerGroup) markerGroup.clearLayers();
    if(!tripMainLayerGroup) tripMainLayerGroup = L.featureGroup().addTo(map);
    else tripMainLayerGroup.clearLayers();

    drawTripOnMap(trip, map, tripMainLayerGroup);
}

window.clearTripFromMainMap = function() {
    if(tripMainLayerGroup) {
        tripMainLayerGroup.clearLayers();
    }
    
    const label = document.getElementById('trip-select-label');
    if(label) {
        label.textContent = t('selectTripToView');
        label.style.color = '#64748b';
    }
    const dropdown = document.getElementById('trip-dropdown-list');
    if(dropdown) dropdown.classList.add('hidden');
    const chevron = document.getElementById('trip-select-chevron');
    if(chevron) chevron.style.transform = 'rotate(0deg)';
    const header = document.getElementById('trip-select-header-box');
    if(header) header.classList.remove('open');

    const cont = document.getElementById('itinerary-content-container');
    if(cont) cont.classList.add('hidden');

    if(document.getElementById('tab-explore-btn')) {
        renderLocations();
    }
}

const TRIP_DAY_COLORS = ['#D42759', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

function drawTripOnMap(trip, targetMap, targetLayerGroup) {
    if(!targetLayerGroup) return;
    targetLayerGroup.clearLayers();
    if(!trip || !trip.days || trip.days.length === 0) return;

    let allPoints = [];

    trip.days.forEach((dayIds, idx) => {
        const color = TRIP_DAY_COLORS[idx % TRIP_DAY_COLORS.length];
        let coords = [];
        dayIds.forEach((id, locIdx) => {
            const loc = celebLocations.find(l => Number(l.id) === Number(id));
            if(loc) {
                coords.push([loc.lat, loc.lng]);
                allPoints.push([loc.lat, loc.lng]);
                
                const markerHtml = `<div style="background:${color}; width:28px; height:28px; border-radius:50%; border:2px solid #fff; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold; box-shadow:0 3px 6px rgba(0,0,0,0.3);">${idx+1}.${locIdx + 1}</div>`;
                const icon = L.divIcon({ className: '', html: markerHtml, iconSize: [28,28], iconAnchor: [14,14] });
                const m = L.marker([loc.lat, loc.lng], {icon: icon}).addTo(targetLayerGroup);
                
                m.on('click', () => { if(window.openDetailsPanel) window.openDetailsPanel(loc.id); });
            }
        });
        if(coords.length > 1) {
            L.polyline(coords, { color: color, weight: 4, opacity: 0.8, dashArray: '8, 6' }).addTo(targetLayerGroup);
        }
    });
    
    if(allPoints.length > 0 && targetMap) {
        targetMap.fitBounds(L.polyline(allPoints).getBounds(), { padding: [40, 40], maxZoom: 16 });
    }
}

// Recrée les mini-cartes par jour affichées dans chaque .day-card. Appelée après chaque
// re-render de l'itinéraire : les anciennes instances Leaflet sont détruites au préalable
// (leur conteneur DOM a été supprimé par box.innerHTML='' dans renderTrip, ce qui ne libère
// pas la mémoire ni le "._leaflet_id" du conteneur tant qu'on n'appelle pas .remove()).
function renderDayMiniMaps(trip) {
    dayMiniMaps.forEach(m => { if(m) m.remove(); });
    dayMiniMaps = [];
    if(!trip || !trip.days) return;

    trip.days.forEach((dayIds, idx) => {
        const container = document.getElementById(`day-map-${idx}`);
        if(!container) return;

        const color = TRIP_DAY_COLORS[idx % TRIP_DAY_COLORS.length];
        const coords = dayIds
            .map(id => celebLocations.find(l => Number(l.id) === Number(id)))
            .filter(Boolean)
            .map(loc => [loc.lat, loc.lng]);

        if(coords.length === 0) {
            dayMiniMaps[idx] = null;
            return;
        }

        const dayMap = L.map(container, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, attributionControl: false }).setView(coords[0], 13);
        L.tileLayer(OSM_TILE_URL).addTo(dayMap);
        const dayLayer = L.featureGroup().addTo(dayMap);

        coords.forEach((c, locIdx) => {
            const markerHtml = `<div style="background:${color}; width:22px; height:22px; border-radius:50%; border:2px solid #fff; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10.5px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${locIdx + 1}</div>`;
            const icon = L.divIcon({ className: '', html: markerHtml, iconSize: [22,22], iconAnchor: [11,11] });
            L.marker(c, { icon: icon }).addTo(dayLayer);
        });
        if(coords.length > 1) {
            L.polyline(coords, { color: color, weight: 3, opacity: 0.8, dashArray: '7, 5' }).addTo(dayLayer);
        }

        setTimeout(() => {
            dayMap.invalidateSize();
            if(coords.length > 1) {
                dayMap.fitBounds(L.polyline(coords).getBounds(), { padding: [24, 24], maxZoom: 15 });
            } else {
                dayMap.setView(coords[0], 14);
            }
        }, 50);

        dayMiniMaps[idx] = dayMap;
    });
}


// ==========================================
// 6. DETAILS PANEL, WISHLIST, ETC.
// ==========================================
function loadTripOptions() {
    const select = document.getElementById('trip-select');
    if(!select) return;
    
    select.innerHTML = '';
    const trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const noTripTxt = currentLang === 'fr' ? "Un jour / Pas de voyage prévu" : "Someday / no trip yet";
    const newTripTxt = currentLang === 'fr' ? "+ Créer un nouveau voyage..." : "+ Create a new trip...";
    
    select.innerHTML = `<option value="none">${noTripTxt}</option>`;
    trips.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
    select.innerHTML += `<option value="new">${newTripTxt}</option>`;
}

// Construit les options du sélecteur de voyage dans le popup "Add to Wishlist"
// (voyages existants + "Créer un nouveau voyage"). Appelée à la fois quand on coche
// la case (toggleWishlist) et quand le panneau s'ouvre avec la case déjà cochée
// (openDetailsPanel) — avant, seul le second cas la remplissait, donc cocher la case
// laissait le menu vide, sans option "Create a new trip".
function populateTripSelectOptions(selectedTripId) {
    const select = document.getElementById('trip-select');
    if (!select) return;
    const trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    select.innerHTML = `<option value="none">${currentLang === 'fr' ? "Un jour / Pas de voyage prévu" : "Someday / no trip yet"}</option>`;
    trips.forEach(tr => { select.innerHTML += `<option value="${tr.id}">${tr.name}</option>`; });
    select.innerHTML += `<option value="new">${currentLang === 'fr' ? "+ Créer un nouveau voyage..." : "+ Create a new trip..."}</option>`;
    if (selectedTripId && select.querySelector(`option[value="${selectedTripId}"]`)) {
        select.value = selectedTripId;
    } else {
        select.value = 'none';
    }
}

window.toggleWishlist = function() {
    const checked = document.getElementById('details-wishlist').checked;
    const box = document.getElementById('trip-box');
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    
    if (checked) {
        box.classList.add('open');
        if(!wList.some(w => w.id === currentLocationIdForMemory)) {
            wList.push({id: currentLocationIdForMemory, dateAdded: new Date().toLocaleDateString(), tripId: 'none'});
        }
        populateTripSelectOptions('none');
    } else {
        box.classList.remove('open');
        window.cancelNewTrip();
        wList = wList.filter(w => w.id !== currentLocationIdForMemory && w !== currentLocationIdForMemory);
    }
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    if(map) renderLocations();
};

window.handleTripSelect = function() {
    const value = document.getElementById('trip-select').value;
    const field = document.getElementById('new-trip-field');
    
    if (value === 'new') {
        field.classList.add('open');
    } else {
        field.classList.remove('open');
        let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
        let idx = wList.findIndex(w => w.id === currentLocationIdForMemory);
        if(idx !== -1) {
            wList[idx].tripId = value;
            localStorage.setItem('wishlistLocs', JSON.stringify(wList));
            syncWishlist(wList);
        }
    }
};

window.validateNewTrip = function() {
    const name = document.getElementById('new-trip-name').value.trim();
    document.getElementById('create-trip-btn').disabled = !name;
};

window.createTrip = function() {
    const name = document.getElementById('new-trip-name').value.trim();
    if (!name) return;

    const start = document.getElementById('new-trip-start').value;
    const end = document.getElementById('new-trip-end').value;

    let label = name;
    if (start) {
        const langCode = currentLang === 'fr' ? 'fr-FR' : 'en-US';
        const fmt = (m) => { const [y,mo] = m.split('-'); return new Date(y, mo-1).toLocaleDateString(langCode,{month:'short', year:'numeric'}); };
        label += ` (${fmt(start)}${end && end !== start ? ' – ' + fmt(end) : ''})`;
    }

    const newTripId = 'trip-' + Date.now();
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    trips.push({ id: newTripId, name: label, dateType: 'specific', startDate: start, endDate: end, days: [] });
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);

    populateTripSelectOptions(newTripId);
    window.handleTripSelect(); 
    window.cancelNewTrip();
};

window.cancelNewTrip = function() {
    const field = document.getElementById('new-trip-field');
    if(field) field.classList.remove('open');
    if(document.getElementById('new-trip-name')) document.getElementById('new-trip-name').value = '';
    if(document.getElementById('new-trip-start')) document.getElementById('new-trip-start').value = '';
    if(document.getElementById('new-trip-end')) document.getElementById('new-trip-end').value = '';
    if(document.getElementById('create-trip-btn')) document.getElementById('create-trip-btn').disabled = true;
    
    const select = document.getElementById('trip-select');
    if (select && select.value === 'new') {
        select.value = 'none';
        window.handleTripSelect();
    }
};

window.openDetailsPanel = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;
    currentLocationIdForMemory = loc.id;
    
    const heroBg = document.getElementById('detail-hero-bg');
    if(heroBg) {
        const bgImg = loc.ytId ? `https://img.youtube.com/vi/${loc.ytId}/maxresdefault.jpg` : loc.img;
        heroBg.style.backgroundImage = `linear-gradient(180deg, rgba(20,16,30,.15) 0%, rgba(20,16,30,.75) 100%), url('${bgImg}')`;
    }
    
    const badge = document.getElementById('detail-badge');
    if(badge) badge.textContent = `${loc.group} · ${getCatName(loc.category)}`;

    const dTitle = document.getElementById('details-title');
    if(dTitle) dTitle.textContent = loc.name;

    const dSub = document.getElementById('details-location-sub');
    if(dSub) dSub.textContent = `${loc.city}, ${loc.country}`;
    
    // Story tab : le fullDescription (1er paragraphe = le lieu, paragraphes suivants = le lien avec BTS)
    // est découpé automatiquement par balises <p>, sans toucher aux données des 57 lieux.
    const descPlaceEl = document.getElementById('details-desc-place');
    const descBtsSection = document.getElementById('story-section-bts');
    const descBtsEl = document.getElementById('details-desc-bts');
    if(descPlaceEl) {
        const descHtml = getLocText(loc.fullDescription);
        const temp = document.createElement('div');
        temp.innerHTML = descHtml || '';
        let paragraphs = Array.from(temp.querySelectorAll('p'));
        if(paragraphs.length === 0 && descHtml) {
            const onlyP = document.createElement('p');
            onlyP.innerHTML = descHtml;
            paragraphs = [onlyP];
        }
        descPlaceEl.innerHTML = paragraphs.length > 0 ? paragraphs[0].outerHTML : '';
        if(paragraphs.length > 1) {
            descBtsEl.innerHTML = paragraphs.slice(1).map(p => p.outerHTML).join('');
            if(descBtsSection) descBtsSection.classList.remove('hidden');
        } else {
            descBtsEl.innerHTML = '';
            if(descBtsSection) descBtsSection.classList.add('hidden');
        }
    }

    // Practical information & access : le champ directions existant devient un item unique de la liste.
    const practicalList = document.getElementById('details-practical-list');
    if(practicalList) {
        const directionsText = getLocText(loc.directions);
        practicalList.innerHTML = directionsText ? `<div class="practical-item"><b>How to get there:</b> ${directionsText}</div>` : '';
    }

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
    if (dEpi && dEpiCont) { if(loc.episode) { dEpi.textContent = loc.episode; dEpiCont.style.display = 'inline'; } else { dEpiCont.style.display = 'none'; } }
    
    const dLink = document.getElementById('details-episode-link');
    const dLinkCont = document.getElementById('details-link-container');
    if (dLink && dLinkCont) { if(loc.episodeLink) { dLink.href = loc.episodeLink; dLinkCont.style.display = 'inline'; } else { dLinkCont.style.display = 'none'; } }
    
    const mapLink = document.getElementById('details-map-link');
    if(mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    const videoContainer = document.getElementById('details-video-container');
    const videoSection = document.getElementById('details-video-section');
    if (videoContainer && videoSection) {
        videoContainer.innerHTML = ""; 
        if (loc.videoEmbeds && loc.videoEmbeds.length > 0) {
            loc.videoEmbeds.forEach(vidSrc => { videoContainer.innerHTML += `<div class="video-wrapper"><iframe src="${vidSrc}" frameborder="0" allowfullscreen></iframe></div>`; });
            videoSection.classList.remove('hidden');
        } else if (loc.ytId) {
            videoContainer.innerHTML = `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${loc.ytId}" frameborder="0" allowfullscreen></iframe></div>`;
            videoSection.classList.remove('hidden');
        } else { videoSection.classList.add('hidden'); }
    }

    // Tips box : le champ tip existant (un seul conseil) est enveloppé dans un tableau à un élément
    // pour remplir la liste de conseils numérotée, sans réécrire les données des 57 lieux.
    const tipText = getLocText(loc.tip);
    const tips = tipText ? [tipText] : [];
    const tipSection = document.getElementById('details-tip-section');
    const tipsList = document.getElementById('details-tips-list');
    if(tipSection && tipsList) {
        if(tips.length > 0) {
            tipsList.innerHTML = tips.map((tip, i) => `<div class="tip-line"><div class="num">${i + 1}</div><div>${tip}</div></div>`).join('');
            tipSection.classList.remove('hidden');
        } else {
            tipsList.innerHTML = '';
            tipSection.classList.add('hidden');
        }
    }
    
    const vCheck = document.getElementById('details-visited');
    const memoryDropdown = document.getElementById('memory-dropdown');
    const tabBtnVisit = document.getElementById('tab-btn-visit');
    
    if(vCheck) {
        let vList = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        let rawEntry = vList.find(v => v.id === loc.id || v === loc.id);
        let memoryData = rawEntry ? normalizeVisitEntry(rawEntry) : null;
        
        vCheck.checked = !!memoryData;
        
        if(vCheck.checked && memoryData && memoryData.visits.length > 0) {
            tabBtnVisit.classList.remove('hidden');
            memoryDropdown.classList.remove('open');
            window.renderVisitsList(memoryData.visits);
        } else {
            tabBtnVisit.classList.add('hidden');
            memoryDropdown.classList.remove('open');
        }

        vCheck.onchange = function() {
            let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
            if(this.checked) { 
                let idx = list.findIndex(v => (v.id === loc.id || v === loc.id));
                if(idx === -1) {
                    list.push({ id: loc.id, visits: [] });
                } else {
                    list[idx] = normalizeVisitEntry(list[idx]);
                }
                localStorage.setItem('visitedLocs', JSON.stringify(list));
                syncVisited(list);
                openMemoryEditor(null); // ouvre le formulaire pour la première visite
            } else { 
                list = list.filter(v => v.id !== loc.id && v !== loc.id); 
                memoryDropdown.classList.remove('open'); 
                tabBtnVisit.classList.add('hidden');
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.querySelector('.tab-btn[data-tab="info"]').classList.add('active');
                document.getElementById('tab-info').classList.add('active');

                localStorage.setItem('visitedLocs', JSON.stringify(list));
                syncVisited(list);
            }
            if(map) renderLocations(); 
        };
    }

    const wCheck = document.getElementById('details-wishlist');
    const tripBox = document.getElementById('trip-box');
    
    if(wCheck) {
        let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
        let wishData = wList.find(w => w.id === loc.id || w === loc.id);
        
        wCheck.checked = !!wishData;
        
        if(wCheck.checked) {
            tripBox.classList.add('open');
            populateTripSelectOptions(wishData && wishData.tripId);
        } else {
            tripBox.classList.remove('open');
            window.cancelNewTrip();
        }
    }

    // MASQUER LES ONGLETS EXPLORE/ITINERARY ET LE BLOC PRINCIPAL
    const topTabs = document.querySelector('.sidebar-top-tabs');
    if(topTabs) topTabs.style.display = 'none';

    const mainSidebar = document.getElementById('sidebar-main');
    if(mainSidebar) mainSidebar.style.display = 'none';
    
    const detailsSidebar = document.getElementById('sidebar-details');
    if(detailsSidebar) {
        detailsSidebar.classList.remove('hidden');
        detailsSidebar.style.display = 'flex';
    }
    
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) { sidebar.classList.add('open'); sidebar.classList.add('expanded'); }
    
    setTimeout(() => { if(map) map.invalidateSize(); }, 450);
};

window.setStars = function(val) {
    const memoryRatingVal = document.getElementById('memory-rating-val');
    if(!memoryRatingVal) return;
    memoryRatingVal.value = val;
    document.querySelectorAll('#memory-stars .star').forEach((star, index) => {
        if(index < val) {
            star.setAttribute('fill', '#D42759');
            star.setAttribute('stroke', '#D42759');
        } else {
            star.setAttribute('fill', '#e2e8f0');
            star.setAttribute('stroke', '#e2e8f0');
        }
    });
}
document.querySelectorAll('#memory-stars .star').forEach(star => {
    star.addEventListener('click', function() { window.setStars(parseInt(this.getAttribute('data-val'))); });
});

// editingVisitIndex : null = on ajoute une NOUVELLE visite ; un nombre = on modifie
// la visite existante à cet index dans le tableau "visits" du lieu courant.
let editingVisitIndex = null;

// Ouvre le formulaire (étoiles / date / notes) pour ajouter une nouvelle visite
// (visitIndex = null) ou modifier une visite existante (visitIndex = un nombre).
function openMemoryEditor(visitIndex) {
    editingVisitIndex = visitIndex;
    const dropdown = document.getElementById('memory-dropdown');

    if (visitIndex === null) {
        // Nouvelle visite : date du jour, note vierge, 4 étoiles par défaut.
        document.getElementById('memory-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('memory-notes').value = '';
        window.setStars(4);
    } else {
        let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        let entry = list.find(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);
        entry = entry ? normalizeVisitEntry(entry) : null;
        const visit = entry && entry.visits[visitIndex];
        if (visit) {
            document.getElementById('memory-date').value = visit.date || '';
            document.getElementById('memory-notes').value = visit.notes || '';
            window.setStars(visit.rating || 4);
        }
    }

    document.querySelector('.tab-btn[data-tab="info"]').click();
    dropdown.classList.add('open');
}
window.openMemoryEditor = openMemoryEditor;

const saveMemoryBtn = document.getElementById('save-memory-btn');
if(saveMemoryBtn) {
    saveMemoryBtn.addEventListener('click', () => {
        const rating = Number(document.getElementById('memory-rating-val').value);
        const date = document.getElementById('memory-date').value;
        const notes = document.getElementById('memory-notes').value;
        
        let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        const idx = list.findIndex(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);
        
        if(idx !== -1) {
            list[idx] = normalizeVisitEntry(list[idx]);

            if (editingVisitIndex === null) {
                list[idx].visits.push({ date, rating, notes });
            } else {
                list[idx].visits[editingVisitIndex] = { date, rating, notes };
            }

            localStorage.setItem('visitedLocs', JSON.stringify(list));
            syncVisited(list);
            
            document.getElementById('memory-dropdown').classList.remove('open');
            document.getElementById('tab-btn-visit').classList.remove('hidden');
            
            window.renderVisitsList(list[idx].visits);
            document.getElementById('tab-btn-visit').click();
        }
    });
}

// Affiche la liste de toutes les visites d'un lieu (les plus récentes en premier),
// chacune avec son propre bouton "Edit", plus un bouton pour ajouter une nouvelle
// visite en bas de la liste.
window.renderVisitsList = function(visits) {
    const starSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#D42759" stroke="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const emptyStarSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#e2e8f0" stroke="#e2e8f0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const editSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    // On garde une trace de l'index d'origine (dans le tableau non trié) pour que
    // "Edit" modifie bien la bonne visite, même une fois la liste triée à l'affichage.
    const withIndex = visits.map((v, i) => ({ ...v, __idx: i }));
    withIndex.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const container = document.getElementById('visits-list');
    if (!container) return;
    container.innerHTML = '';

    withIndex.forEach(v => {
        let starsHtml = '';
        for (let i = 0; i < 5; i++) { starsHtml += (i < v.rating) ? starSvg : emptyStarSvg; }

        let formattedDate = v.date;
        if (v.date) {
            const d = new Date(v.date);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }

        const notesText = v.notes ? `"${v.notes}"` : (currentLang === 'fr' ? "Aucune note pour cette visite." : "No notes for this visit.");
        const editLabel = currentLang === 'fr' ? 'Modifier' : 'Edit memory';

        const card = document.createElement('div');
        card.className = 'memory-card';
        card.innerHTML = `
            <div class="memory-card-header">
                <div class="stars" style="pointer-events:none;">${starsHtml}</div>
                <div class="memory-date">${formattedDate || (currentLang === 'fr' ? 'Date inconnue' : 'Unknown date')}</div>
            </div>
            <div class="memory-notes">${notesText}</div>
            <button class="edit-memory-btn" data-idx="${v.__idx}" style="background:transparent; border:1.5px solid #cbd5e1; color:#64748b; font-size:11px; font-weight:700; padding:6px 12px; border-radius:100px; margin-top:20px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">${editSvg} ${editLabel}</button>
        `;
        card.querySelector('.edit-memory-btn').addEventListener('click', () => openMemoryEditor(v.__idx));
        container.appendChild(card);
    });
};

const addVisitBtn = document.getElementById('add-visit-btn');
if (addVisitBtn) {
    addVisitBtn.addEventListener('click', () => openMemoryEditor(null));
}

window.closeDetailsPanel = function() {
    const dDetails = document.getElementById('sidebar-details');
    if(dDetails) {
        dDetails.classList.add('hidden');
        dDetails.style.display = 'none';
    }
    const dMain = document.getElementById('sidebar-main');
    if(dMain) dMain.style.display = 'flex'; 
    
    const topTabs = document.querySelector('.sidebar-top-tabs');
    if(topTabs) topTabs.style.display = 'flex';

    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) sidebar.classList.remove('expanded'); 
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    const tabInfo = document.querySelector('.tab-btn[data-tab="info"]');
    if(tabInfo) tabInfo.classList.add('active');
    const panelInfo = document.getElementById('tab-info');
    if(panelInfo) panelInfo.classList.add('active');
    
    setTimeout(() => { if(map) map.invalidateSize(); }, 450);
}

// ==========================================
// 7. POPUP LIEU PARTAGEE POUR visited.html ET wishlist.html
//    (reprend la charte graphique de map.html : marqueur coloré par
//    catégorie/groupe + carte CartoDB "light_all" + fiche d'infos complète)
// ==========================================
let popupMap = null;
let popupMarker = null;

window.openLocModal = function(id) {
    const loc = celebLocations.find(l => l.id == id);
    if(!loc) return;

    const modalTitle = document.getElementById('modal-title');
    const modalMeta = document.getElementById('modal-meta');
    const modalHero = document.getElementById('modal-hero');
    const modalDesc = document.getElementById('modal-desc');
    const modalMapLink = document.getElementById('modal-map-link');
    const modalMetaBox = document.getElementById('modal-meta-box');

    if(modalTitle) modalTitle.textContent = loc.name;
    if(modalMeta) modalMeta.textContent = `${loc.city}, ${loc.country} • ${getCatName(loc.category)}`;
    if(modalHero) modalHero.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.8), transparent), url('${loc.img || ('https://img.youtube.com/vi/' + loc.ytId + '/hqdefault.jpg')}')`;

    if(modalDesc) {
        const desc = getLocText(loc.fullDescription) || "No description available.";
        modalDesc.innerHTML = desc;
    }

    // Fiche d'informations, identique à celle de map.html (Group / Members / Country / City / Address / Date)
    if(modalMetaBox) {
        modalMetaBox.innerHTML = `
            <b>${currentLang === 'fr' ? 'Groupe' : 'Group'}:</b> ${loc.group}<br>
            <b>${currentLang === 'fr' ? 'Membre(s)' : 'Members'}:</b> ${loc.member === "All" ? "All" : loc.member}<br>
            <b>${currentLang === 'fr' ? 'Pays' : 'Country'}:</b> ${loc.country}<br>
            <b>${currentLang === 'fr' ? 'Ville' : 'City'}:</b> ${loc.city}<br>
            <b>${currentLang === 'fr' ? 'Adresse' : 'Address'}:</b> ${loc.address || '—'}<br>
            <b>${currentLang === 'fr' ? 'Date' : 'Date'}:</b> ${loc.year || '—'}
        `;
    }

    if(modalMapLink) modalMapLink.href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    // Bouton "Plus de détails" -> renvoie vers la fiche complète du lieu sur map.html
    const modalMoreDetails = document.getElementById('modal-more-details');
    if(modalMoreDetails) {
        modalMoreDetails.href = `map.html?loc=${loc.id}`;
        modalMoreDetails.textContent = t('moreDetails');
    }

    // Traduction des petits libellés statiques de la modale (si présents sur la page)
    const modalDetailsLabel = document.getElementById('modal-details-label');
    if(modalDetailsLabel) modalDetailsLabel.textContent = t('detailsLabel');
    const modalAboutLabel = document.getElementById('modal-about-label');
    if(modalAboutLabel) modalAboutLabel.textContent = t('aboutPlaceLabel');
    const modalMapLinkText = document.getElementById('modal-map-link-text');
    if(modalMapLinkText) modalMapLinkText.textContent = t('openInMaps');

    const modalOverlay = document.getElementById('loc-modal');
    if(modalOverlay) modalOverlay.classList.remove('hidden');

    setTimeout(() => {
        const mapEl = document.getElementById('modal-map');
        if(!mapEl || typeof L === 'undefined') return;

        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        const baseColor = groupColors[loc.group] || '#D42759';
        const markerHtml = `<div class="popup-marker-icon" style="background:${baseColor}; color:#fff;">${catIconSvg}</div>`;
        const customIcon = L.divIcon({ className: '', html: markerHtml, iconSize: [34,34], iconAnchor: [17,17] });

        if(!popupMap) {
            popupMap = L.map('modal-map', { zoomControl: false, attributionControl: false }).setView([loc.lat, loc.lng], 15);
            L.tileLayer(OSM_TILE_URL, {
                subdomains: 'abc', maxZoom: 19
            }).addTo(popupMap);
            popupMarker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(popupMap);
        } else {
            popupMap.setView([loc.lat, loc.lng], 15);
            popupMarker.setLatLng([loc.lat, loc.lng]);
            popupMarker.setIcon(customIcon);
            popupMap.invalidateSize();
        }
    }, 150);
};

window.closeLocModal = function() {
    const modalOverlay = document.getElementById('loc-modal');
    if(modalOverlay) modalOverlay.classList.add('hidden');
};

// ==========================================
// 8. AUTO-ITINERARY GENERATOR LOGIC
// ==========================================
// Distance à vol d'oiseau entre deux lieux (formule de Haversine), utilisée pour estimer
// un temps de trajet plausible entre deux étapes consécutives de l'itinéraire généré.
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// On n'a pas d'API d'itinéraire en temps réel (pas de clé, réseau restreint) : plutôt que
// d'inventer un temps de trajet dans le vide, on combine deux informations réelles —
// la distance à vol d'oiseau entre les deux lieux (pour choisir un mode de transport
// plausible et estimer une durée) et le champ "directions" déjà rédigé pour le lieu
// d'arrivée (ligne de métro/bus réelle, nom de station, temps de marche) quand il existe.
function estimateTransitLeg(fromLoc, toLoc) {
    const distKm = haversineKm(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
    const isFr = currentLang === 'fr';
    let mode, speedKmh;
    if (distKm < 0.9) { mode = isFr ? 'À pied' : 'On foot'; speedKmh = 4.5; }
    else if (distKm < 5) { mode = isFr ? 'Métro / bus' : 'Subway / bus'; speedKmh = 20; }
    else { mode = isFr ? 'Taxi ou métro' : 'Taxi or subway'; speedKmh = 28; }
    const minutes = Math.max(5, Math.round((distKm / speedKmh) * 60 / 5) * 5);
    return { mode, minutes, distKm };
}

window.generateItinerary = function() {
    const group = document.getElementById('iti-group').value;
    const country = document.getElementById('iti-country').value;
    const city = document.getElementById('iti-city') ? document.getElementById('iti-city').value : "";
    const days = parseInt(document.getElementById('iti-days').value);

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let validLocs = availableLocs.filter(l => l.group === group && l.country === country);
    if(city) validLocs = validLocs.filter(l => l.city === city);
    if(itiSelectedCategories.length > 0) validLocs = validLocs.filter(l => itiSelectedCategories.includes(l.category));

    if(validLocs.length === 0) { alert('No locations found for this selection.'); return; }

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
    if(!resultDiv) return;
    
    resultDiv.innerHTML = "";
    
    const locsPerDay = Math.ceil(validLocs.length / days);
    let coordsForMap = [];
    currentGeneratedItinerary = [];

    const txt = {
        en: { day: "Day", lunch: "Lunch recommendation near", coffee: "Coffee & explore the neighborhood", mapBtn: "Open Route in Google Maps", free: "Take your time to enjoy the site", cancel: "Cancel", add: "Add Selected Days", export: "Export PDF", save: "Save Trip" },
        fr: { day: "Jour", lunch: "Déjeuner recommandé près de", coffee: "Café & exploration du quartier", mapBtn: "Ouvrir l'itinéraire sur Google Maps", free: "Prenez le temps d'apprécier le lieu", cancel: "Annuler", add: "Ajouter la sélection", export: "Exporter en PDF", save: "Sauvegarder" }
    }[currentLang];

    const isTripsPage = !!document.getElementById('edit-trip-name');

    for(let i = 0; i < days; i++) {
        const dayLocs = validLocs.slice(i * locsPerDay, (i + 1) * locsPerDay);
        if(dayLocs.length === 0) continue;
        
        currentGeneratedItinerary.push(dayLocs);
        
        let mapLink = "";
        if(dayLocs.length === 1) {
            mapLink = `https://www.google.com/maps/search/?api=1&query=${dayLocs[0].lat},${dayLocs[0].lng}`;
            coordsForMap.push({ dayIdx: i, locIdx: 0, lat: dayLocs[0].lat, lng: dayLocs[0].lng });
        } else {
            let waypoints = dayLocs.map(l => `${l.lat},${l.lng}`).join('|');
            mapLink = `https://www.google.com/maps/dir/?api=1&origin=${dayLocs[0].lat},${dayLocs[0].lng}&destination=${dayLocs[dayLocs.length-1].lat},${dayLocs[dayLocs.length-1].lng}&waypoints=${waypoints}&travelmode=driving`;
            dayLocs.forEach((l, locIdx) => coordsForMap.push({ dayIdx: i, locIdx, lat: l.lat, lng: l.lng }));
        }
        
        let html = `<div class="iti-day-card" style="padding: 18px 16px;">
            <div class="iti-day-title" style="display:flex; justify-content:space-between; align-items:center; font-size:16px; color:#D42759; margin-bottom:20px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                <span>${txt.day} ${i + 1}</span>
                ${isTripsPage ? `<input type="checkbox" class="iti-day-checkbox" value="${i}" checked style="width:18px; height:18px; cursor:pointer; accent-color:#D42759;">` : ''}
            </div>`;
        
        let currentTime = new Date();
        currentTime.setHours(10, 0, 0);
        const formatTime = (d) => d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        dayLocs.forEach((l, idx) => {
            let startTime = formatTime(currentTime);
            currentTime.setHours(currentTime.getHours() + 1);
            currentTime.setMinutes(currentTime.getMinutes() + 30);
            let endTime = formatTime(currentTime);

            html += `
                <div style="padding-left:18px; border-left: 2px solid #D42759; position:relative; margin-bottom:15px;">
                    <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; border-radius:50%; background:#D42759; border:2px solid #fff;"></div>
                    <div style="font-size:11px; font-weight:700; color:#D42759; margin-bottom:3px;">${startTime} - ${endTime}</div>
                    <div style="font-size:14px; font-weight:700; color:#212832; margin-bottom:4px;">${idx+1}. ${l.name}</div>
                    <div style="font-size:11.5px; color:#64748b; margin-bottom:8px;">${getCatName(l.category)}</div>
            `;
            html += `</div>`;

            if (idx < dayLocs.length - 1) {
                // Pas d'API d'itinéraire disponible : le mode de transport et la durée sont
                // estimés à partir de la distance réelle entre les deux lieux (voir
                // estimateTransitLeg), et on réutilise le champ "directions" déjà rédigé pour
                // le lieu d'arrivée (ligne de métro/bus réelle) quand il en a un, plutôt que
                // le texte générique "Transit to next location" affiché jusqu'ici.
                const nextLoc = dayLocs[idx + 1];
                const leg = estimateTransitLeg(l, nextLoc);
                const nextDirections = getLocText(nextLoc.directions);
                const legLabel = `${leg.mode} · ~${leg.minutes} min${nextDirections ? ' — ' + nextDirections : ''}`;
                html += `<div style="padding-left:18px; border-left: 2px dashed #cbd5e1; margin-bottom:15px; padding-top:5px; padding-bottom:5px;"><span style="display:inline-block; background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:10.5px; font-weight:600; color:#64748b; line-height:1.5;">${legLabel}</span></div>`;
                currentTime.setMinutes(currentTime.getMinutes() + leg.minutes);
            }
        });
        
        html += `<a href="${mapLink}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; padding:10px 16px; margin-top:5px; font-size:12px; color:#2E3644; border:1px solid #cbd5e1; border-radius:100px; background:white; font-weight:600; text-decoration:none; transition:0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            ${txt.mapBtn}
        </a></div>`;
        resultDiv.innerHTML += html;
    }
    
    document.getElementById('iti-result').classList.remove('hidden');

    let actionsContainer = document.getElementById('iti-actions-container');
    if (!actionsContainer) {
        const saveBtn = document.getElementById('save-trip-btn');
        if (saveBtn) {
            actionsContainer = saveBtn.parentElement;
            actionsContainer.id = 'iti-actions-container';
        }
    }
    
    if (actionsContainer) {
        if (isTripsPage) {
            actionsContainer.innerHTML = `
                <button class="gen-btn ghost" onclick="closeModal('itinerary-modal')" style="flex:1; justify-content:center;">${txt.cancel}</button>
                <button class="gen-btn" onclick="addSelectedDaysToTrip()" style="flex:1; justify-content:center;">${txt.add}</button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <button id="export-pdf-btn" class="gen-btn ghost" onclick="exportItineraryPDF()" style="flex:1; justify-content:center;">${txt.export}</button>
                <button id="save-trip-btn" class="gen-btn" onclick="saveItineraryToTrips()" style="flex:1; justify-content:center;">${txt.save}</button>
            `;
        }
    }

    const modalContent = document.querySelector('#itinerary-modal .modal-content');
    if(modalContent) modalContent.scrollTo({ top: modalContent.scrollHeight, behavior: 'smooth' });

    if(document.getElementById('iti-map-container')) {
        setTimeout(() => {
            if(typeof itiLeafletMap !== 'undefined' && itiLeafletMap) {
                itiLeafletMap.remove();
                itiLeafletMap = null;
            }
            itiLeafletMap = L.map('iti-map-container', { zoomControl: false }).setView([0,0], 2);
            L.tileLayer(OSM_TILE_URL).addTo(itiLeafletMap);
            itiLayerGroup = L.featureGroup().addTo(itiLeafletMap);

            // Un tracé par jour, dans la couleur de ce jour (mêmes couleurs que la carte
            // globale de My Trips) : plus lisible qu'une seule ligne continue qui mélangeait
            // tous les jours ensemble sans distinction visuelle.
            const allLatLngs = [];
            const byDay = {};
            coordsForMap.forEach(c => { (byDay[c.dayIdx] = byDay[c.dayIdx] || []).push(c); allLatLngs.push([c.lat, c.lng]); });

            Object.keys(byDay).forEach(dayIdx => {
                const color = TRIP_DAY_COLORS[dayIdx % TRIP_DAY_COLORS.length];
                const pts = byDay[dayIdx];
                pts.forEach(c => {
                    L.circleMarker([c.lat, c.lng], { color: color, weight: 2, radius: 8, fillColor: color, fillOpacity: 1 }).addTo(itiLayerGroup)
                     .bindTooltip(`${Number(dayIdx)+1}.${c.locIdx+1}`, {permanent: true, direction: 'center', className: 'iti-map-label'});
                });
                if(pts.length > 1) {
                    L.polyline(pts.map(c => [c.lat, c.lng]), { color: color, weight: 3, dashArray: '5, 5' }).addTo(itiLayerGroup);
                }
            });

            if(allLatLngs.length > 1) {
                itiLeafletMap.fitBounds(L.polyline(allLatLngs).getBounds(), { padding: [20, 20], maxZoom: 15 });
            } else if (allLatLngs.length === 1) {
                itiLeafletMap.setView(allLatLngs[0], 12);
            }

            itiLeafletMap.invalidateSize();
        }, 250);
    }
}

window.addSelectedDaysToTrip = function() {
    const checkboxes = document.querySelectorAll('.iti-day-checkbox:checked');
    if (checkboxes.length === 0) { 
        alert(currentLang === 'fr' ? 'Sélectionnez au moins un jour.' : 'Select at least one day.'); 
        return; 
    }
    
    window.saveTrip(); 
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    
    checkboxes.forEach(cb => {
        const dayIndex = parseInt(cb.value);
        const dayLocs = currentGeneratedItinerary[dayIndex];
        if (dayLocs && dayLocs.length > 0) {
            let dayIds = [];
            dayLocs.forEach(loc => {
                dayIds.push(loc.id);
                if (!wList.some(w => Number(w.id) === Number(loc.id) && w.tripId === currentTrip.id)) {
                    wList.push({ id: loc.id, dateAdded: new Date().toLocaleDateString(), tripId: currentTrip.id });
                }
            });
            currentTrip.days.push(dayIds);
        }
    });
    
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
    
    window.renderTrip(); 
    closeModal('itinerary-modal');
};

window.saveItineraryToTrips = function() {
    const country = document.getElementById('iti-country').value;
    const daysCount = parseInt(document.getElementById('iti-days').value);
    const newTripId = 'trip-' + Date.now();
    const tripName = `${country} Trip (${daysCount} ${currentLang === 'fr' ? 'Jours' : 'Days'})`;

    let newTrip = {
        id: newTripId,
        name: tripName,
        dateType: 'duration',
        duration: daysCount + (currentLang === 'fr' ? ' Jours' : ' Days'),
        days: []
    };

    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');

    currentGeneratedItinerary.forEach((dayLocs) => {
        let dayIds = [];
        dayLocs.forEach(loc => {
            dayIds.push(loc.id);
            let existing = wList.find(w => w.id === loc.id && w.tripId === newTripId);
            if (!existing) {
                wList.push({ id: loc.id, dateAdded: new Date().toLocaleDateString(), tripId: newTripId });
            }
        });
        newTrip.days.push(dayIds);
    });

    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    trips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    localStorage.setItem('activeTripId', newTripId);

    if(document.getElementById('trip-name-display')) {
        document.getElementById('itinerary-modal').classList.add('hidden');
        window.initTrips();
    } else {
        window.location.href = 'trips.html';
    }
};

window.exportItineraryPDF = function() {
    const el = document.getElementById('iti-result');
    const btn = document.getElementById('export-pdf-btn');
    const saveBtn = document.getElementById('save-trip-btn');
    if(!el) return;
    if(typeof html2pdf === 'undefined') {
        alert(currentLang === 'fr' ? "L'export PDF n'a pas pu se charger. Vérifiez votre connexion et réessayez." : 'The PDF export library failed to load. Check your connection and try again.');
        return;
    }
    if(btn) btn.style.display = 'none';
    if(saveBtn) saveBtn.style.display = 'none';

    // Le bouton "Export as PDF" ne faisait jusqu'ici rien du tout, sans aucune erreur visible :
    // #iti-result contient la carte Leaflet en direct (#iti-map-container), dont les tuiles
    // OpenStreetMap sont chargées cross-origin sans que Leaflet ne les marque comme lisibles par
    // canvas (crossOrigin). html2canvas (utilisé en interne par html2pdf) se retrouve alors avec
    // un canvas "tainted" et lève une SecurityError silencieuse dès qu'il tente de le lire, ce qui
    // annule tout le PDF sans jamais déclencher le .then(). On exporte donc un clone du contenu
    // sans la carte (peu utile de toute façon dans un PDF imprimé : chaque jour garde son propre
    // lien "Open Route in Google Maps"), avec en renfort useCORS/allowTaint pour les cas où
    // d'autres images cross-origin s'ajouteraient plus tard.
    const clone = el.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('hidden');
    const mapCard = clone.querySelector('#iti-map-container');
    if(mapCard && mapCard.parentElement) mapCard.parentElement.remove();
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = el.offsetWidth + 'px';
    clone.style.background = '#fff';
    document.body.appendChild(clone);

    const restore = () => {
        if(btn) btn.style.display = 'block';
        if(saveBtn) saveBtn.style.display = 'block';
        clone.remove();
    };

    html2pdf().set({ margin: 10, filename: 'ScreenToStreet_Guide.pdf', jsPDF: { format: 'a4' }, html2canvas: { useCORS: true, allowTaint: true } }).from(clone).save()
        .then(restore)
        .catch((err) => {
            console.error('Export PDF failed:', err);
            restore();
            alert(currentLang === 'fr' ? "L'export PDF a échoué. Réessayez." : 'PDF export failed. Please try again.');
        });
};

// ==========================================
// 9. MODAL PANIER DEPUIS LA CARTE
// ==========================================
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
        if (typeof window.syncUserData === 'function') window.syncUserData({ unlockedGroups: existingGroups });
        setTimeout(() => window.location.reload(), 1000);
    });
}

// ==========================================
// 10. GESTION DES MODALES "LIST" (Depuis KPI)
// ==========================================
window.openFilteredListModal = function(type) {
    const modal = document.getElementById('list-modal');
    const title = document.getElementById('list-modal-title');
    const content = document.getElementById('list-modal-content');
    if (!modal || !content) return;

    content.innerHTML = '';
    
    if (type === 'locations') {
        title.textContent = currentLang === 'fr' ? "Lieux filtrés" : "Filtered Locations";
        currentFilteredLocations.forEach(loc => {
            content.innerHTML += `
                <div style="padding: 12px; background: #faf9fc; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#D42759'" onmouseout="this.style.borderColor='#e2e8f0'" onclick="closeModal('list-modal'); window.openDetailsPanel(${loc.id}); map.flyTo([${loc.lat}, ${loc.lng}], 16);">
                    <div style="font-weight: 700; color: #2E3644; font-size:14px; margin-bottom:2px;">${loc.name}</div>
                    <div style="font-size: 11px; color: #64748b; text-transform:uppercase; font-weight:600;">${loc.city}, ${loc.country} &middot; <span style="color:#D42759;">${getCatName(loc.category)}</span></div>
                </div>
            `;
        });
    } else if (type === 'countries') {
        title.textContent = currentLang === 'fr' ? "Pays filtrés" : "Filtered Countries";
        const countries = [...new Set(currentFilteredLocations.map(l => l.country))].sort();
        countries.forEach(c => {
            const count = currentFilteredLocations.filter(l => l.country === c).length;
            const textLoc = count > 1 ? (currentLang === 'fr' ? "lieux" : "locations") : (currentLang === 'fr' ? "lieu" : "location");
            content.innerHTML += `
                <div style="padding: 12px; background: #faf9fc; border-radius: 8px; border: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight: 700; color: #D42759; font-size:15px;">${c}</div>
                    <div style="font-size: 12px; color: #64748b; font-weight:600;">${count} ${textLoc}</div>
                </div>
            `;
        });
    }
    
    modal.classList.remove('hidden');
}

window.closeModal = function(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden'); 
};
window.onclick = function(e) { 
    if (e.target.classList.contains('modal')) e.target.classList.add('hidden'); 
};

if(!localStorage.getItem('cookiesAccepted') && document.getElementById('cookie-banner')) { 
    document.getElementById('cookie-banner').classList.remove('hidden'); 
}
function closeCookies() { 
    localStorage.setItem('cookiesAccepted', 'true'); 
    if(document.getElementById('cookie-banner')) document.getElementById('cookie-banner').classList.add('hidden'); 
}
const btnAccept = document.getElementById('cookie-accept');
if(btnAccept) btnAccept.addEventListener('click', closeCookies);
const btnReject = document.getElementById('cookie-reject');
if(btnReject) btnReject.addEventListener('click', closeCookies);

// ==========================================
// 12. LOGIQUE SPECIFIQUE POUR TRIPS.HTML
// ==========================================
window.initTrips = function() {
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    
    if (trips.length === 0) {
        // Le bouton "+ New trip" de la sidebar est caché par défaut sur mobile (tiroir
        // fermé) : on duplique donc un bouton directement dans l'état vide, au premier
        // plan, pour qu'il reste cliquable sans devoir d'abord ouvrir le menu.
        document.getElementById('empty-state').innerHTML = (currentLang === 'fr'
            ? "Vous n'avez pas encore de voyage.<br>Cliquez sur le bouton « New trip » pour en créer un !"
            : "You haven't created any trips yet.<br>Click the 'New trip' button to create one!")
            + `<br><button class="gen-btn empty-state-new-trip-btn" onclick="openNewTripModal()">+ ${currentLang === 'fr' ? 'Nouveau voyage' : 'New trip'}</button>`;
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('trip-detail-content').style.display = 'none';
        document.getElementById('sidebar-title').textContent = `MY TRIPS (0)`;
        document.getElementById('trips-list-container').innerHTML = '';
        return;
    }
    
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('trip-detail-content').style.display = 'block';
    
    let activeId = localStorage.getItem('activeTripId');
    if (activeId) {
        currentTrip = trips.find(t => t.id === activeId);
    }
    if (!currentTrip) {
        currentTrip = trips[trips.length - 1];
    }
    if (!currentTrip.days) currentTrip.days = [];

    if(document.getElementById('trip-map-container') && !tripPageMap) {
        tripPageMap = L.map('trip-map-container', { zoomControl: false }).setView([37.541, 127.025], 6);
        L.tileLayer(OSM_TILE_URL).addTo(tripPageMap);
        tripPageLayer = L.featureGroup().addTo(tripPageMap);
    }

    window.renderTripsSidebar();
    window.renderTrip();
}

window.renderTripsSidebar = function() {
    const listContainer = document.getElementById('trips-list-container');
    if(!listContainer) return;
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    
    listContainer.innerHTML = '';
    document.getElementById('sidebar-title').textContent = `MY TRIPS (${trips.length})`;

    trips.forEach(t => {
        let allAssignedIds = (t.days || []).flat();
        let unassignedCount = wList.filter(w => w.tripId === t.id && !allAssignedIds.includes(Number(w.id))).length;
        let totalLocs = allAssignedIds.length + unassignedCount;

        let dateStr = t.dateType === 'duration' ? (t.duration || 'Flexible') : `${t.startDate || '?'} to ${t.endDate || '?'}`;
        
        let pill = document.createElement('div');
        pill.className = `trip-pill ${currentTrip && currentTrip.id === t.id ? 'active' : ''}`;
        pill.setAttribute('draggable', 'true');
        pill.ondragstart = (e) => window.dragTripStart(e, t.id, 'trip');
        pill.ondragover = (e) => window.dragTripOver(e);
        pill.ondragleave = (e) => window.dragTripLeave(e);
        pill.ondrop = (e) => window.dropTrip(e, t.id);
        pill.onclick = () => { 
            localStorage.setItem('activeTripId', t.id);
            window.initTrips();
        };

        pill.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div class="trip-pill-name">${t.name}</div>
                <div class="del-trip-btn" onclick="openDeleteModal('${t.id}', event)" title="Delete trip">✕</div>
            </div>
            <div class="trip-pill-meta">${dateStr} &middot; ${totalLocs} locations</div>
        `;
        listContainer.appendChild(pill);
    });
}

window.dragTripStart = function(e, id, type) { 
    dragType = type; 
    e.dataTransfer.setData('text/plain', id); 
    e.dataTransfer.setData('type', type);
    e.currentTarget.style.opacity = '0.4'; 
}
window.dragTripOver = function(e) { if(dragType === 'trip') { e.preventDefault(); e.currentTarget.classList.add('drag-over-trip'); } }
window.dragTripLeave = function(e) { if(dragType === 'trip') { e.currentTarget.classList.remove('drag-over-trip'); } }
window.dropTrip = function(e, targetId) {
    if(dragType !== 'trip') return;
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-trip');
    const draggedId = e.dataTransfer.getData('text/plain');
    if(draggedId && draggedId !== targetId) {
        let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
        const fromIdx = trips.findIndex(t => t.id === draggedId);
        const toIdx = trips.findIndex(t => t.id === targetId);
        if(fromIdx > -1 && toIdx > -1) {
            const [moved] = trips.splice(fromIdx, 1);
            trips.splice(toIdx, 0, moved);
            localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
            window.renderTripsSidebar();
        }
    }
    document.querySelectorAll('.trip-pill').forEach(p => p.style.opacity = '1');
}

window.populateEditTripFilters = function() {
    const groupSel = document.getElementById('edit-trip-group');
    const memberSel = document.getElementById('edit-trip-member');
    const countrySel = document.getElementById('edit-trip-country');
    const citySel = document.getElementById('edit-trip-city');
    if(!groupSel) return;

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    if(groupSel.options.length <= 1) {
        groupSel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Tous les Groupes' : 'All Groups'}</option>`;
        const groups = [...new Set(baseLocs.map(l => l.group))].sort();
        groups.forEach(g => groupSel.innerHTML += `<option value="${g}">${g}</option>`);
    }
    
    if(currentTrip.group !== undefined) groupSel.value = currentTrip.group;

    let locs = baseLocs;
    if(groupSel.value) locs = locs.filter(l => l.group === groupSel.value);

    const currentMember = currentTrip.member || "All";
    memberSel.innerHTML = `<option value="All">${currentLang === 'fr' ? 'Tous les membres' : 'All Members'}</option>`;
    if(groupSel.value && filterData[groupSel.value]) {
        filterData[groupSel.value].members.forEach(m => memberSel.innerHTML += `<option value="${m}">${m}</option>`);
    } else {
        const members = [...new Set(locs.map(l => l.member))].filter(m => m !== 'All');
        members.forEach(m => memberSel.innerHTML += `<option value="${m}">${m}</option>`);
    }
    memberSel.value = currentMember;

    const currentCountry = currentTrip.country || "";
    countrySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Tous les pays' : 'All Countries'}</option>`;
    const countries = [...new Set(locs.map(l => l.country))].sort();
    countries.forEach(c => countrySel.innerHTML += `<option value="${c}">${c}</option>`);
    if(countries.includes(currentCountry)) countrySel.value = currentCountry;

    const currentCity = currentTrip.city || "";
    let cityLocs = locs;
    if(countrySel.value) cityLocs = locs.filter(l => l.country === countrySel.value);
    citySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Toutes les villes' : 'All Cities'}</option>`;
    const cities = [...new Set(cityLocs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySel.innerHTML += `<option value="${c}">${c}</option>`);
    if(cities.includes(currentCity)) citySel.value = currentCity;
}

window.updateEditTripOptions = function(fieldChanged) {
    if(fieldChanged === 'group') {
        currentTrip.group = document.getElementById('edit-trip-group').value;
        currentTrip.member = "All"; 
    } else if (fieldChanged === 'member') {
        currentTrip.member = document.getElementById('edit-trip-member').value;
    } else if(fieldChanged === 'country') {
        currentTrip.country = document.getElementById('edit-trip-country').value;
        currentTrip.city = ""; 
    } else if(fieldChanged === 'city') {
        currentTrip.city = document.getElementById('edit-trip-city').value;
    }
    window.saveTrip();
    window.renderTrip();
}

window.renderTrip = function() {
    if (!currentTrip) return;

    document.getElementById('edit-trip-name').value = currentTrip.name;
    
    let metaText = "";
    if (currentTrip.group) metaText += currentTrip.group + " • ";
    if (currentTrip.country) metaText += currentTrip.country + " • ";
    let allAssignedIds = currentTrip.days.flat().map(Number);
    metaText += `${allAssignedIds.length} location${allAssignedIds.length > 1 ? 's' : ''}`;
    const datesDisplay = document.getElementById('dates-display');
    if(datesDisplay) {
        datesDisplay.textContent = metaText;
        if(metaText.trim() === '0 location') datesDisplay.style.display = 'none';
        else datesDisplay.style.display = 'inline-flex';
    }

    window.populateEditTripFilters();

    if(currentTrip.dateType === 'duration') {
        document.getElementById('edit-date-specific-panel').classList.add('hidden');
        document.getElementById('edit-date-flexible-panel').classList.remove('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.remove('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.add('active');
        
        document.querySelectorAll('.edit-banner .pill-btn').forEach(el => el.classList.remove('active'));
        if (currentTrip.duration) {
            const parts = currentTrip.duration.split(' in ');
            if (parts[0]) {
                document.querySelectorAll('.edit-banner .pill-btn[data-type="edit-duration"]').forEach(el => {
                    if (el.textContent === parts[0]) el.classList.add('active');
                });
            }
            if (parts[1]) {
                document.querySelectorAll('.edit-banner .pill-btn[data-type="edit-month"]').forEach(el => {
                    if (el.textContent === parts[1]) el.classList.add('active');
                });
            }
        }
    } else {
        document.getElementById('edit-date-specific-panel').classList.remove('hidden');
        document.getElementById('edit-date-flexible-panel').classList.add('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.add('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.remove('active');
        document.getElementById('date-start').value = currentTrip.startDate || '';
        document.getElementById('date-end').value = currentTrip.endDate || '';
    }
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let filteredLocs = baseLocs.filter(loc => {
        if (currentTrip.group && loc.group !== currentTrip.group) return false;
        if (currentTrip.member && currentTrip.member !== "All" && loc.member !== currentTrip.member && loc.member !== "All") return false;
        if (currentTrip.country && loc.country !== currentTrip.country) return false;
        if (currentTrip.city && loc.city !== currentTrip.city) return false;
        return true;
    });

    // Ne garder dans unassignedLocs QUE les lieux qui sont explicitement dans wishlistLocs pour ce voyage ET qui ne sont pas déjà assignés.
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    let unassignedLocs = wList
        .filter(w => w.tripId === currentTrip.id && !allAssignedIds.includes(Number(w.id)))
        .map(w => celebLocations.find(l => l.id === Number(w.id)))
        .filter(Boolean);

    const locList = document.getElementById('loc-list');
    locList.innerHTML = '';
    unassignedLocs.forEach(loc => {
        locList.appendChild(window.createLocRow(loc));
    });
    document.getElementById('saved-locs-label').textContent = currentLang === 'fr' ? `Lieux non assignés (${unassignedLocs.length})` : `UNASSIGNED LOCATIONS (${unassignedLocs.length})`;

    const box = document.getElementById('itinerary-box');
    const addBtn = box.querySelector('.add-day-btn');
    box.innerHTML = ''; 
    
    currentTrip.days.forEach((dayIds, index) => {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.dataset.day = index + 1;
        card.setAttribute('draggable', 'true'); 
        card.setAttribute('ondragstart', 'dragStart(event, "day")');
        card.setAttribute('ondragover', 'allowDrop(event)');
        card.setAttribute('ondrop', 'drop(event)');
        card.setAttribute('ondragleave', 'dragLeave(event)');
        
        let itemsHtml = '';
        dayIds.forEach(id => {
            const loc = celebLocations.find(l => l.id === Number(id));
            if (loc) itemsHtml += window.createLocRowHtml(loc);
        });

        card.innerHTML = `
            <div class="day-header">
                <div class="day-title"><span class="drag-handle" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${index + 1}</div>
                <div class="x-btn edit-only" style="display:block;" onclick="removeDay(this)">✕</div>
            </div>
            <div class="day-items">${itemsHtml}</div>
            ${dayIds.length > 0 ? `<div class="day-mini-map" id="day-map-${index}"></div>` : ''}
        `;
        box.appendChild(card);
    });
    box.appendChild(addBtn);

    let tripCountries = [currentTrip.country].filter(Boolean);
    if(tripCountries.length === 0) {
        tripCountries = [...new Set(filteredLocs.map(l => l.country))].filter(Boolean);
    }

    const recoList = document.getElementById('reco-list');
    recoList.innerHTML = '';
    let recoCount = 0;
    
    if(tripCountries.length > 0) {
        celebLocations.forEach(loc => {
            // Recommandation si: même pays + PAS assigné à un jour + PAS déjà dans unassignedLocs
            if (tripCountries.includes(loc.country) && !allAssignedIds.includes(loc.id) && !unassignedLocs.some(u=>u.id===loc.id)) {
                if (recoCount < 4) {
                    recoList.innerHTML += `
                        <div class="loc-row">
                            <div class="loc-thumb" style="background-image:url('${loc.img}');"></div>
                            <div style="flex:1;"><div class="loc-name">${loc.name}</div><div class="loc-meta">${loc.city}, ${loc.country} &middot; ${getCatName(loc.category)}</div></div>
                            <button class="add-to-trip-btn edit-only" style="display:block;" onclick="quickAddLoc(${loc.id})">+ Add</button>
                        </div>
                    `;
                    recoCount++;
                }
            }
        });
    }
    document.getElementById('reco-section').style.display = recoCount > 0 ? 'block' : 'none';
    document.querySelectorAll('.day-loc').forEach(el => el.setAttribute('draggable', 'true'));
    
    if(tripPageMap) {
        setTimeout(() => { tripPageMap.invalidateSize(); drawTripOnMap(currentTrip, tripPageMap, tripPageLayer); }, 200);
    }
    renderDayMiniMaps(currentTrip);
}

window.switchEditDateTab = function(tab) {
    if(tab === 'specific') {
        document.getElementById('edit-date-specific-panel').classList.remove('hidden');
        document.getElementById('edit-date-flexible-panel').classList.add('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.remove('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.add('active');
    } else {
        document.getElementById('edit-date-specific-panel').classList.add('hidden');
        document.getElementById('edit-date-flexible-panel').classList.remove('hidden');
        document.querySelector('.date-tab[data-tab="edit-specific"]').classList.remove('active');
        document.querySelector('.date-tab[data-tab="edit-flexible"]').classList.add('active');
    }
    window.saveTrip();
}

window.selectEditPill = function(btn, type) {
    document.querySelectorAll(`.edit-banner .pill-btn[data-type="${type}"]`).forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    window.saveTrip();
}

window.createLocRow = function(loc) {
    const div = document.createElement('div');
    div.className = 'day-loc';
    div.dataset.id = loc.id;
    div.setAttribute('draggable', 'true');
    div.setAttribute('ondragstart', 'dragStart(event, "loc")');
    div.setAttribute('ondragend', 'dragEnd(event)');
    div.innerHTML = `
        <span class="drag-handle edit-only" style="display:inline;">⠿</span>
        ${loc.name}
        <span class="x-btn edit-only" style="display:inline;" onclick="removeFromTrip(this, ${loc.id})">✕</span>
    `;
    return div;
}

window.createLocRowHtml = function(loc) {
    return `
        <div class="day-loc" data-id="${loc.id}" draggable="true" ondragstart="dragStart(event, 'loc')" ondragend="dragEnd(event)">
            <span class="drag-handle edit-only" style="display:inline;">⠿</span>
            ${loc.name}
            <span class="x-btn edit-only" style="display:inline;" onclick="removeFromTrip(this, ${loc.id})">✕</span>
        </div>
    `;
}

// DRAG & DROP DES LIEUX ET DES JOURS
window.dragStart = function(e, type) { 
    dragType = type; 
    draggedEl = e.currentTarget; 
    draggedEl.classList.add('dragging'); 
    e.dataTransfer.effectAllowed = 'move'; 
    e.stopPropagation();
}

window.dragEnd = function(e) { 
    if(draggedEl) draggedEl.classList.remove('dragging'); 
    document.querySelectorAll('.day-card, #loc-list, .day-loc').forEach(d => {
        d.classList.remove('drag-over');
        d.classList.remove('drag-over-day');
        d.classList.remove('drag-over-top');
        d.classList.remove('drag-over-bottom');
    }); 
    draggedEl = null; 
    dragType = null;
    window.saveTrip(); 
}

window.allowDrop = function(e) { 
    e.preventDefault(); 
    e.stopPropagation();
    
    document.querySelectorAll('.drag-over, .drag-over-day, .drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-day', 'drag-over-top', 'drag-over-bottom');
    });

    if (dragType === 'day' && e.currentTarget.classList.contains('day-card')) {
        e.currentTarget.classList.add('drag-over-day');
    } else if (dragType === 'loc') {
        if (e.currentTarget.classList.contains('day-loc')) {
            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            if (relY < rect.height / 2) e.currentTarget.classList.add('drag-over-top');
            else e.currentTarget.classList.add('drag-over-bottom');
        } else {
            e.currentTarget.classList.add('drag-over');
        }
    }
}

window.dragLeave = function(e) { 
    e.currentTarget.classList.remove('drag-over', 'drag-over-day', 'drag-over-top', 'drag-over-bottom'); 
}

window.drop = function(e) { 
    e.preventDefault(); 
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over', 'drag-over-day', 'drag-over-top', 'drag-over-bottom'); 
    
    if(!draggedEl) return;

    if (dragType === 'day' && e.currentTarget.classList.contains('day-card')) {
        const box = document.getElementById('itinerary-box');
        const draggedIdx = Array.from(box.children).indexOf(draggedEl);
        const targetIdx = Array.from(box.children).indexOf(e.currentTarget);
        if (draggedIdx < targetIdx) {
            e.currentTarget.after(draggedEl);
        } else {
            e.currentTarget.before(draggedEl);
        }
        
        document.querySelectorAll('.day-card').forEach((c, index) => {
            c.dataset.day = index + 1;
            c.querySelector('.day-title').innerHTML = `<span class="drag-handle" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${index + 1}`;
        });
    } else if (dragType === 'loc') {
        if (e.currentTarget.classList.contains('day-loc')) {
            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            if (relY < rect.height / 2) e.currentTarget.before(draggedEl);
            else e.currentTarget.after(draggedEl);
        } else if (e.currentTarget.id === 'loc-list') { 
            e.currentTarget.appendChild(draggedEl); 
        } else { 
            const itemsContainer = e.currentTarget.querySelector('.day-items');
            if(itemsContainer) itemsContainer.appendChild(draggedEl); 
        } 
    }
    window.saveTrip();
}

window.addDay = function() {
    const box = document.getElementById('itinerary-box');
    const addBtn = box.querySelector('.add-day-btn');
    const newDayNum = document.querySelectorAll('.day-card').length + 1;
    
    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.day = newDayNum;
    card.setAttribute('draggable', 'true'); 
    card.setAttribute('ondragstart', 'dragStart(event, "day")');
    card.setAttribute('ondragover', 'allowDrop(event)');
    card.setAttribute('ondrop', 'drop(event)');
    card.setAttribute('ondragleave', 'dragLeave(event)');
    card.innerHTML = `
        <div class="day-header">
            <div class="day-title"><span class="drag-handle" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${newDayNum}</div>
            <div class="x-btn edit-only" style="display:flex;" onclick="removeDay(this)">✕</div>
        </div>
        <div class="day-items"></div>
    `;
    box.insertBefore(card, addBtn);
    window.saveTrip();
}

window.removeDay = function(btn) {
    dayToRemoveBtn = btn;
    document.getElementById('remove-day-modal').classList.remove('hidden');
}

window.confirmRemoveDay = function() {
    if(!dayToRemoveBtn) return;
    const card = dayToRemoveBtn.closest('.day-card');
    const items = card.querySelectorAll('.day-loc');
    const locList = document.getElementById('loc-list');
    items.forEach(i => locList.appendChild(i)); 
    card.remove();
    
    document.querySelectorAll('.day-card').forEach((c, index) => {
        c.dataset.day = index + 1;
        c.querySelector('.day-title').innerHTML = `<span class="drag-handle" style="cursor:grab; margin-right:8px;">⠿</span>${currentLang==='fr'?'Jour':'Day'} ${index + 1}`;
    });
    window.saveTrip();
    closeModal('remove-day-modal');
    dayToRemoveBtn = null;
}

window.removeFromTrip = function(btn, locId) {
    locToRemoveData = { btn: btn, id: Number(locId) };
    document.getElementById('remove-loc-modal').classList.remove('hidden');
}

window.confirmRemoveLoc = function() {
    if(!locToRemoveData) return;
    
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    wList = wList.filter(w => !(Number(w.id) === locToRemoveData.id && w.tripId === currentTrip.id));
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    
    currentTrip.days = currentTrip.days.map(day => day.filter(id => Number(id) !== locToRemoveData.id));

    // Important : on persiste directement le voyage mis à jour AVANT de ré-appeler renderTrip().
    // On n'utilise pas saveTrip() ici, car elle reconstruit currentTrip.days en relisant le DOM
    // (qui contient encore l'ancien lieu tant que renderTrip() n'a pas tourné), ce qui annulait
    // silencieusement la suppression qu'on vient de faire.
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);

    closeModal('remove-loc-modal');
    locToRemoveData = null;
    window.renderTrip();
    window.renderTripsSidebar();
}

window.quickAddLoc = function(locId) {
    locId = Number(locId);
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    if(!wList.some(w => Number(w.id) === locId && w.tripId === currentTrip.id)) {
        wList.push({ id: locId, dateAdded: new Date().toLocaleDateString(), tripId: currentTrip.id });
        localStorage.setItem('wishlistLocs', JSON.stringify(wList));
        syncWishlist(wList);
        window.renderTrip(); 
        
        if(document.getElementById('add-modal') && !document.getElementById('add-modal').classList.contains('hidden')) {
            window.filterAddModal(); 
        }
    }
}

window.saveTrip = function() {
    if(!currentTrip) return;
    currentTrip.name = document.getElementById('edit-trip-name').value || currentTrip.name;
    
    const isFlexible = document.querySelector('.edit-banner .date-tab[data-tab="edit-flexible"]')?.classList.contains('active');
    if(isFlexible) {
        currentTrip.dateType = 'duration';
        const month = document.querySelector('.edit-banner .pill-btn[data-type="edit-month"].active')?.textContent || '';
        const length = document.querySelector('.edit-banner .pill-btn[data-type="edit-duration"].active')?.textContent || '';
        currentTrip.duration = `${length} in ${month}`;
    } else {
        currentTrip.dateType = 'specific';
        currentTrip.startDate = document.getElementById('date-start').value;
        currentTrip.endDate = document.getElementById('date-end').value;
    }
    
    const newDays = [];
    document.querySelectorAll('.day-card').forEach(card => {
        const ids = [];
        card.querySelectorAll('.day-loc').forEach(locEl => { ids.push(parseInt(locEl.dataset.id)); });
        newDays.push(ids);
    });
    currentTrip.days = newDays;
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
    
    window.renderTripsSidebar();

    if(tripPageMap) {
        drawTripOnMap(currentTrip, tripPageMap, tripPageLayer);
    }

    // saveTrip() ne reconstruit pas le HTML des .day-card (pour ne pas perturber le drag & drop
    // en cours) : on ajoute/retire seulement le conteneur de mini-carte selon que le jour a
    // désormais des lieux ou non, avant de redessiner les mini-cartes elles-mêmes.
    document.querySelectorAll('.day-card').forEach((card, idx) => {
        let mapDiv = card.querySelector('.day-mini-map');
        const hasLocs = currentTrip.days[idx] && currentTrip.days[idx].length > 0;
        if(hasLocs && !mapDiv) {
            mapDiv = document.createElement('div');
            mapDiv.className = 'day-mini-map';
            mapDiv.id = `day-map-${idx}`;
            card.appendChild(mapDiv);
        } else if(!hasLocs && mapDiv) {
            mapDiv.remove();
        }
    });
    renderDayMiniMaps(currentTrip);
}

window.openAddModal = function() { document.getElementById('add-modal').classList.remove('hidden'); window.filterAddModal(); }
window.closeAddModal = function() { document.getElementById('add-modal').classList.add('hidden'); document.getElementById('add-search').value = ""; }

window.filterAddModal = function() {
    if(!currentTrip) return;
    const query = (document.getElementById('add-search').value || "").toLowerCase();
    const list = document.getElementById('add-modal-list');
    list.innerHTML = '';
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let filteredLocs = baseLocs.filter(loc => {
        if (currentTrip.group && loc.group !== currentTrip.group) return false;
        if (currentTrip.country && loc.country !== currentTrip.country) return false;
        return true;
    });

    let allAssignedIds = currentTrip.days.flat().map(Number);
    
    filteredLocs.forEach(loc => {
        if (!allAssignedIds.includes(Number(loc.id))) {
            if(loc.name.toLowerCase().includes(query) || (loc.city && loc.city.toLowerCase().includes(query)) || (loc.category && loc.category.toLowerCase().includes(query))) {
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #e2e8f0;">
                        <div>
                            <div style="font-weight:700; font-size:13px; color:#212832;">${loc.name}</div>
                            <div style="font-size:11px; color:#64748b;">${loc.city}, ${loc.country} &middot; ${getCatName(loc.category)}</div>
                        </div>
                        <button onclick="quickAddLoc(${loc.id}); this.textContent='Added'; this.disabled=true; this.style.background='#e2e8f0';" style="background:#D42759; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">+ Add</button>
                    </div>
                `;
            }
        }
    });
}

// LOGIQUE GOOGLE FLIGHTS STYLE TABS (NEW TRIP)
window.openNewTripModal = function() {
    document.getElementById('add-trip-modal').classList.remove('hidden');
    const gSelect = document.getElementById('create-trip-group');
    if(gSelect && gSelect.options.length <= 1) {
        const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
        let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
        const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
        availableGroups.forEach(g => gSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }
}

window.updateCreateTripOptions = function() {
    const group = document.getElementById('create-trip-group').value;
    const memberSelect = document.getElementById('create-trip-member');
    const countrySelect = document.getElementById('create-trip-country');
    const citySelect = document.getElementById('create-trip-city');

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let locs = baseLocs;
    if(group) locs = locs.filter(l => l.group === group);

    memberSelect.innerHTML = `<option value="All">${currentLang === 'fr' ? 'Tous les membres (Optionnel)' : 'All Members (Optional)'}</option>`;
    if(group && filterData[group]) {
        filterData[group].members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    } else {
        const members = [...new Set(locs.map(l => l.member))].filter(m => m !== 'All');
        members.forEach(m => memberSelect.innerHTML += `<option value="${m}">${m}</option>`);
    }

    const currentCountry = countrySelect.value;
    countrySelect.innerHTML = `<option value="">${currentLang === 'fr' ? 'Sélectionner le Pays' : 'Select Country'}</option>`;
    const countries = [...new Set(locs.map(l => l.country))].sort();
    countries.forEach(c => countrySelect.innerHTML += `<option value="${c}">${c}</option>`);
    if(countries.includes(currentCountry)) countrySelect.value = currentCountry;

    const currentCity = citySelect.value;
    let cityLocs = locs;
    if(countrySelect.value) cityLocs = locs.filter(l => l.country === countrySelect.value);
    
    citySelect.innerHTML = `<option value="">${currentLang === 'fr' ? 'Sélectionner la Ville (Optionnel)' : 'Select City (Optional)'}</option>`;
    const cities = [...new Set(cityLocs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySelect.innerHTML += `<option value="${c}">${c}</option>`);
    if(cities.includes(currentCity)) citySelect.value = currentCity;
}

window.switchCreateDateTab = function(tab) {
    document.querySelectorAll('#add-trip-modal .date-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`#add-trip-modal .date-tab[data-tab="create-${tab}"]`).classList.add('active');
    
    if(tab === 'specific') {
        document.getElementById('create-date-specific-panel').classList.remove('hidden');
        document.getElementById('create-date-flexible-panel').classList.add('hidden');
    } else {
        document.getElementById('create-date-specific-panel').classList.add('hidden');
        document.getElementById('create-date-flexible-panel').classList.remove('hidden');
    }
}

window.selectCreatePill = function(btn, type) {
    document.querySelectorAll(`#add-trip-modal .pill-btn[data-type="${type}"]`).forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
}

window.createNewTripAdvanced = function() {
    const nameInput = document.getElementById('create-trip-name');
    let name = nameInput.value.trim();
    
    const country = document.getElementById('create-trip-country').value;
    const group = document.getElementById('create-trip-group').value;
    const member = document.getElementById('create-trip-member').value;
    const city = document.getElementById('create-trip-city').value;
    
    if (!name) {
        if(country && group) name = `${group} Trip in ${country}`;
        else if (country) name = `Trip to ${country}`;
        else name = "My New Trip";
    }

    const isFlexible = document.querySelector('#add-trip-modal .date-tab[data-tab="create-flexible"]').classList.contains('active');
    
    let dateType = isFlexible ? 'duration' : 'specific';
    let duration = "";
    let startDate = "";
    let endDate = "";
    let numDays = 3; 

    if (isFlexible) {
        const month = document.querySelector('#add-trip-modal .pill-btn[data-type="create-month"].active')?.textContent || '';
        const length = document.querySelector('#add-trip-modal .pill-btn[data-type="create-duration"].active')?.textContent || '';
        duration = `${length} in ${month}`;
        
        if(length.includes('Weekend')) numDays = 2;
        else if(length.includes('1 week') || length.includes('1 semaine')) numDays = 7;
        else if(length.includes('2 weeks') || length.includes('2 semaines')) numDays = 14;
        else if(length.includes('1 month') || length.includes('1 mois')) numDays = 30;
    } else {
        startDate = document.getElementById('create-trip-start').value;
        endDate = document.getElementById('create-trip-end').value;
        if(startDate && endDate) {
            const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
            numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
    }

    let daysArray = [];
    for(let i=0; i<numDays; i++) daysArray.push([]);

    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let baseLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));

    let validLocs = baseLocs.filter(l => {
        if(group && l.group !== group) return false;
        if(country && l.country !== country) return false;
        if(city && l.city !== city) return false;
        return true;
    });

    if(group && country && validLocs.length > 0) {
        let locsPerDay = Math.ceil(validLocs.length / numDays);
        for(let i=0; i<numDays; i++) {
            let chunk = validLocs.slice(i*locsPerDay, (i+1)*locsPerDay);
            daysArray[i] = chunk.map(l => l.id);
        }
    }

    const newTripId = 'trip-' + Date.now();
    let newTrip = { 
        id: newTripId, name: name, dateType: dateType, duration: duration, startDate: startDate, endDate: endDate, days: daysArray,
        group: group, member: member, country: country, city: city
    };
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    trips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);

    localStorage.setItem('activeTripId', newTripId);
    
    document.getElementById('add-trip-modal').classList.add('hidden');
    nameInput.value = '';
    
    if(typeof window.initTrips === 'function') window.initTrips();
    else if(document.getElementById('tab-itinerary-btn')) loadItineraryTabOptions();
}

window.openDeleteModal = function(id = null, event = null) {
    if(event) event.stopPropagation();
    tripIdToDelete = id || currentTrip.id;
    document.getElementById('delete-trip-modal').classList.remove('hidden');
}

window.confirmDeleteTrip = function() {
    if (!tripIdToDelete) return;

    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    trips = trips.filter(t => t.id !== tripIdToDelete);
    localStorage.setItem('myTrips', JSON.stringify(trips));
    syncTrips(trips);
    
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    wList = wList.filter(w => w.tripId !== tripIdToDelete);
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    syncWishlist(wList);
    
    if (currentTrip && currentTrip.id === tripIdToDelete) {
        currentTrip = null;
        localStorage.removeItem('activeTripId');
    }
    
    tripIdToDelete = null;
    document.getElementById('delete-trip-modal').classList.add('hidden');
    
    if(typeof window.initTrips === 'function') window.initTrips();
    else if(document.getElementById('tab-itinerary-btn')) loadItineraryTabOptions();
}
