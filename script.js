// ==========================================
// 0. CONFIGURATION DES FONDS DE CARTE (CARTO)
// ==========================================
// CARTO exige désormais une clé API gratuite pour ses fonds de carte (changement
// effectué courant août 2026, indépendant de toute action sur ce site).
// 1) Va sur https://carto.com/basemaps/apikey et demande une clé gratuite (gratuite
//    jusqu'à 5 millions de requêtes/mois, largement suffisant pour ce site).
// 2) Colle la clé reçue ci-dessous, entre les guillemets.
// 3) Tant que CARTO_API_KEY est vide, les cartes afficheront le filigrane
//    "API KEY REQUIRED" — c'est normal, ça disparaît dès que la clé est renseignée.
const CARTO_API_KEY = ""; // <-- colle ta clé CARTO ici, ex: "abcd1234..."
const CARTO_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' + (CARTO_API_KEY ? ('?key=' + CARTO_API_KEY) : '');

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
        map = L.map('map', { zoomControl: false }).setView([37.541, 127.025], 6);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer(CARTO_TILE_URL, { 
            attribution: '&copy; OpenStreetMap contributors', subdomains: 'abcd', maxZoom: 19 
        }).addTo(map);
        markerGroup = L.layerGroup().addTo(map);
        setTimeout(() => { map.invalidateSize(); }, 200);

        map.on('zoomend', function() {
            const zoom = map.getZoom();
            let markerSize = 32; let iconSize = 16;
            if (zoom < 5) { markerSize = 12; iconSize = 0; }
            else if (zoom < 9) { markerSize = 20; iconSize = 10; }
            else { markerSize = 32; iconSize = 16; }
            document.documentElement.style.setProperty('--marker-size', `${markerSize}px`);
            document.documentElement.style.setProperty('--icon-size', `${iconSize}px`);
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
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('unlockedGroups');
            window.location.href = 'index.html';
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
      directions: { en: "Best reached by car from Chuncheon city center (around 20 minutes); a taxi is the easiest option for visitors without a vehicle.", fr: "Se rejoint le plus facilement en voiture depuis le centre-ville de Chuncheon (environ 20 minutes) ; le taxi reste l'option la plus simple pour les visiteurs sans véhicule." } }
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
        itiTitle: "Auto-Itinerary Generator", itiDesc: "Select a group, a country, and how many days you stay.", itiCreateBtn: "Create My Guide", itiExport: "Export Guide as PDF", itiSave: "Save to My Trips",
        noTripsFound: "No trips found.", selectTripToView: "Select a trip to view", locationsWord: "location", locationsWordPlural: "locations",
        backToMap: "← Back to Map", moreDetails: "More details", openInMaps: "Open in Google Maps", detailsLabel: "Details", aboutPlaceLabel: "About this place",
        accTitle: "Your Account", accChangePhoto: "Change Profile Picture", accNameLabel: "Name", accEmailLabel: "Email address",
        accActivityTitle: "Your activity", accTrips: "Trips", accVisited: "Visited", accWishlist: "Wishlist", accPasses: "Passes & billing",
        accEditBtn: "Edit Profile", accSaveBtn: "Save Changes", accSaved: "✓ Saved Successfully", accNoPasses: "No active passes",
        setTitle: "Settings", setSecurity: "Account & Security", setPassword: "Password", setPasswordSub: "Last changed 3 months ago", setChange: "Change",
        setSignedWith: "Signed in with", setPreferences: "Preferences", setLanguage: "Language", setCurrency: "Currency", setUnits: "Distance units",
        setEmailNotif: "Email notifications", setPushNotif: "Push notifications", setPrivacy: "Privacy", setCookiePrefs: "Cookie Preferences",
        setResetBanners: "Reset Banners", setDownloadData: "Download my data", setExportSub: "Export everything in JSON", setExport: "Export",
        setDanger: "Danger zone", setDeleteAccTitle: "Delete account", setDeleteAccSub: "This permanently deletes your trips, wishlist and unlocked passes.", setDeleteAccBtn: "Delete Account",
        wishTitle: "My Wishlist", wishEmpty: "You haven't saved any places yet. Explore the map and click \"Add to Wishlist\"!", wishSomeday: "Someday / No trip yet",
        visitTitle: "My Visited Places", visitEmpty: "You haven't marked any place as visited yet. Explore the map and check \"I visited this place\"!",
        destTitle: "Explore Destinations", destSub: "Browse every country and city featured on Screen To Street", destCountries: "Countries", destCities: "Cities", destLocations: "Locations", destViewMap: "View on Map →",
        artTitle: "Explore Artists", artSub: "Discover every group featured on Screen To Street", artGroups: "Groups", artFeatured: "Featured group"
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
        itiTitle: "Générateur Itinéraire", itiDesc: "Sélectionnez un groupe, un pays, et le nombre de jours.", itiCreateBtn: "Créer mon guide", itiExport: "Exporter en PDF", itiSave: "Sauvegarder dans My Trips",
        noTripsFound: "Aucun voyage trouvé.", selectTripToView: "Sélectionner un voyage", locationsWord: "lieu", locationsWordPlural: "lieux",
        backToMap: "← Retour à la carte", moreDetails: "Plus de détails", openInMaps: "Ouvrir dans Google Maps", detailsLabel: "Détails", aboutPlaceLabel: "À propos de ce lieu",
        accTitle: "Votre compte", accChangePhoto: "Changer la photo de profil", accNameLabel: "Nom", accEmailLabel: "Adresse e-mail",
        accActivityTitle: "Votre activité", accTrips: "Voyages", accVisited: "Visités", accWishlist: "Wishlist", accPasses: "Pass et facturation",
        accEditBtn: "Modifier le profil", accSaveBtn: "Enregistrer", accSaved: "✓ Enregistré avec succès", accNoPasses: "Aucun pass actif",
        setTitle: "Paramètres", setSecurity: "Compte et sécurité", setPassword: "Mot de passe", setPasswordSub: "Dernière modification il y a 3 mois", setChange: "Modifier",
        setSignedWith: "Connecté avec", setPreferences: "Préférences", setLanguage: "Langue", setCurrency: "Devise", setUnits: "Unités de distance",
        setEmailNotif: "Notifications par e-mail", setPushNotif: "Notifications push", setPrivacy: "Confidentialité", setCookiePrefs: "Préférences de cookies",
        setResetBanners: "Réinitialiser la bannière", setDownloadData: "Télécharger mes données", setExportSub: "Exporter toutes les données en JSON", setExport: "Exporter",
        setDanger: "Zone de danger", setDeleteAccTitle: "Supprimer le compte", setDeleteAccSub: "Ceci supprime définitivement vos voyages, votre wishlist et vos pass débloqués.", setDeleteAccBtn: "Supprimer le compte",
        wishTitle: "Ma Wishlist", wishEmpty: "Vous n'avez encore enregistré aucun lieu. Explorez la carte et cliquez sur « Ajouter à ma Wishlist » !", wishSomeday: "Un jour / Pas de voyage prévu",
        visitTitle: "Mes lieux visités", visitEmpty: "Vous n'avez marqué aucun lieu comme visité. Explorez la carte et cochez « J'ai visité ce lieu » !",
        destTitle: "Explorer les destinations", destSub: "Parcourez tous les pays et villes présents sur Screen To Street", destCountries: "Pays", destCities: "Villes", destLocations: "Lieux", destViewMap: "Voir sur la carte →",
        artTitle: "Explorer les artistes", artSub: "Découvrez tous les groupes présents sur Screen To Street", artGroups: "Groupes", artFeatured: "Groupe à la une"
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
function t(key) { return translations[currentLang] ? (translations[currentLang][key] || key) : key; }
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
    if(unlockedGroups.length === 0) availableLocs = celebLocations;
    
    const gSelectIti = document.getElementById('iti-group');
    const cSelectIti = document.getElementById('iti-country');
    const citySelectIti = document.getElementById('iti-city');
    
    if(gSelectIti && gSelectIti.options.length === 0) {
        const availableGroups = [...new Set(availableLocs.map(l => l.group))].sort();
        availableGroups.forEach(g => gSelectIti.innerHTML += `<option value="${g}">${g}</option>`);
        [...new Set(availableLocs.map(l => l.country))].sort().forEach(c => cSelectIti.innerHTML += `<option value="${c}">${c}</option>`);
        if(citySelectIti) window.updateItiCity();
    }
};

window.updateItiCity = function() {
    const country = document.getElementById('iti-country').value;
    const citySel = document.getElementById('iti-city');
    if(!citySel) return;
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

    let locs = availableLocs;
    if(country) locs = locs.filter(l => l.country === country);

    citySel.innerHTML = `<option value="">${currentLang === 'fr' ? 'Toutes les villes (Optionnel)' : 'All Cities (Optional)'}</option>`;
    const cities = [...new Set(locs.map(l => l.city))].filter(Boolean).sort();
    cities.forEach(c => citySel.innerHTML += `<option value="${c}">${c}</option>`);
}

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
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

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
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

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
                <div class="loc-cat">${getCatName(loc.category)} &middot; ${loc.city || ''}</div>
                <div class="loc-name">${loc.name}</div>
            </div>
        `;
        card.addEventListener('click', () => { map.flyTo([loc.lat, loc.lng], 16); window.openDetailsPanel(loc.id); });
        locationListElement.appendChild(card);
    });

    if (mapMarkers.length > 0) map.fitBounds(new L.featureGroup(mapMarkers).getBounds(), { padding: [50, 50], maxZoom: 16 });
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
    if(!dropdownList) return;
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const activeId = localStorage.getItem('activeTripId');
    dropdownList.innerHTML = '';
    
    if(trips.length > 0) {
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
        dropdownList.innerHTML = `<div class="trip-select-empty">${t('noTripsFound')}</div>`;
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

function drawTripOnMap(trip, targetMap, targetLayerGroup) {
    if(!targetLayerGroup) return;
    targetLayerGroup.clearLayers();
    if(!trip || !trip.days || trip.days.length === 0) return;
    
    const dayColors = ['#D42759', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];
    let allPoints = [];
    
    trip.days.forEach((dayIds, idx) => {
        const color = dayColors[idx % dayColors.length];
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

window.toggleWishlist = function() {
    const checked = document.getElementById('details-wishlist').checked;
    const box = document.getElementById('trip-box');
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    
    if (checked) {
        box.classList.add('open');
        if(!wList.some(w => w.id === currentLocationIdForMemory)) {
            wList.push({id: currentLocationIdForMemory, dateAdded: new Date().toLocaleDateString(), tripId: 'none'});
        }
    } else {
        box.classList.remove('open');
        window.cancelNewTrip();
        wList = wList.filter(w => w.id !== currentLocationIdForMemory && w !== currentLocationIdForMemory);
    }
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
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

    loadTripOptions(); 
    document.getElementById('trip-select').value = newTripId;
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

    const tipText = getLocText(loc.tip);
    const tipSection = document.getElementById('details-tip-section');
    if(tipSection) {
        if (tipText) { document.getElementById('details-tip').textContent = tipText; tipSection.classList.remove('hidden'); } 
        else { tipSection.classList.add('hidden'); }
    }
    
    const vCheck = document.getElementById('details-visited');
    const memoryDropdown = document.getElementById('memory-dropdown');
    const tabBtnVisit = document.getElementById('tab-btn-visit');
    
    if(vCheck) {
        let vList = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        let memoryData = vList.find(v => v.id === loc.id || v === loc.id);
        
        vCheck.checked = !!memoryData;
        
        if(vCheck.checked && memoryData && memoryData.rating) {
            tabBtnVisit.classList.remove('hidden');
            memoryDropdown.classList.remove('open');
            window.displayMemoryData(memoryData);
        } else {
            tabBtnVisit.classList.add('hidden');
            memoryDropdown.classList.remove('open');
        }

        vCheck.onchange = function() {
            let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
            if(this.checked) { 
                if(!list.some(v => v.id === loc.id)) {
                    list.push({id: loc.id, date: new Date().toISOString().split('T')[0]}); 
                }
                memoryDropdown.classList.add('open'); 
                document.getElementById('memory-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('memory-notes').value = '';
                window.setStars(4); 
            } else { 
                list = list.filter(v => v.id !== loc.id && v !== loc.id); 
                memoryDropdown.classList.remove('open'); 
                tabBtnVisit.classList.add('hidden');
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.querySelector('.tab-btn[data-tab="info"]').classList.add('active');
                document.getElementById('tab-info').classList.add('active');
            }
            localStorage.setItem('visitedLocs', JSON.stringify(list));
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
            const select = document.getElementById('trip-select');
            
            if(select) {
                select.innerHTML = '';
                const trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
                select.innerHTML = `<option value="none">${currentLang === 'fr' ? "Un jour / Pas de voyage prévu" : "Someday / no trip yet"}</option>`;
                trips.forEach(t => { select.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
                select.innerHTML += `<option value="new">${currentLang === 'fr' ? "+ Créer un nouveau voyage..." : "+ Create a new trip..."}</option>`;
                
                if(wishData && wishData.tripId && select.querySelector(`option[value="${wishData.tripId}"]`)) {
                    select.value = wishData.tripId;
                } else {
                    select.value = 'none';
                }
            }
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

const saveMemoryBtn = document.getElementById('save-memory-btn');
if(saveMemoryBtn) {
    saveMemoryBtn.addEventListener('click', () => {
        const rating = document.getElementById('memory-rating-val').value;
        const date = document.getElementById('memory-date').value;
        const notes = document.getElementById('memory-notes').value;
        
        let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        const idx = list.findIndex(v => v.id === currentLocationIdForMemory || v === currentLocationIdForMemory);
        
        if(idx !== -1) {
            if(typeof list[idx] !== 'object') { list[idx] = { id: list[idx] }; }
            
            list[idx].rating = rating;
            list[idx].date = date;
            list[idx].notes = notes;
            localStorage.setItem('visitedLocs', JSON.stringify(list));
            
            document.getElementById('memory-dropdown').classList.remove('open');
            document.getElementById('tab-btn-visit').classList.remove('hidden');
            
            window.displayMemoryData(list[idx]);
            document.getElementById('tab-btn-visit').click();
        }
    });
}

window.displayMemoryData = function(data) {
    const starSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#D42759" stroke="#D42759"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const emptyStarSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#e2e8f0" stroke="#e2e8f0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    
    let starsHtml = '';
    for(let i=0; i<5; i++) { starsHtml += (i < data.rating) ? starSvg : emptyStarSvg; }
    
    const displayStars = document.getElementById('display-memory-stars');
    if(displayStars) displayStars.innerHTML = starsHtml;
    
    let formattedDate = data.date;
    if(data.date) {
        const d = new Date(data.date);
        if(!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    }
    
    const displayDate = document.getElementById('display-memory-date');
    if(displayDate) displayDate.textContent = formattedDate || 'Unknown date';
    
    const displayNotes = document.getElementById('display-memory-notes');
    if(displayNotes) displayNotes.textContent = data.notes ? `"${data.notes}"` : (currentLang === 'fr' ? "Aucune note pour cette visite." : "No notes for this visit.");
}

const editMemoryBtn = document.getElementById('edit-memory-btn');
if(editMemoryBtn) {
    editMemoryBtn.addEventListener('click', () => {
        let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        let data = list.find(v => v.id === currentLocationIdForMemory);
        if(data) {
            document.getElementById('memory-date').value = data.date || '';
            document.getElementById('memory-notes').value = data.notes || '';
            window.setStars(data.rating || 4);
        }
        document.querySelector('.tab-btn[data-tab="info"]').click(); 
        document.getElementById('memory-dropdown').classList.add('open'); 
    });
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
            L.tileLayer(CARTO_TILE_URL, {
                subdomains: 'abcd', maxZoom: 19
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
window.generateItinerary = function() {
    const group = document.getElementById('iti-group').value;
    const country = document.getElementById('iti-country').value;
    const city = document.getElementById('iti-city') ? document.getElementById('iti-city').value : "";
    const days = parseInt(document.getElementById('iti-days').value);
    
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    let availableLocs = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

    let validLocs = availableLocs.filter(l => l.group === group && l.country === country);
    if(city) validLocs = validLocs.filter(l => l.city === city);
    
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
        en: { day: "Day", transit: "Transit to next location", lunch: "Lunch recommendation near", coffee: "Coffee & explore the neighborhood", mapBtn: "Open Route in Google Maps", free: "Take your time to enjoy the site", cancel: "Cancel", add: "Add Selected Days", export: "Export Guide as PDF", save: "Save to My Trips" },
        fr: { day: "Jour", transit: "Trajet vers le prochain lieu", lunch: "Déjeuner recommandé près de", coffee: "Café & exploration du quartier", mapBtn: "Ouvrir l'itinéraire sur Google Maps", free: "Prenez le temps d'apprécier le lieu", cancel: "Annuler", add: "Ajouter la sélection", export: "Exporter en PDF", save: "Sauvegarder dans My Trips" }
    }[currentLang];

    const isTripsPage = !!document.getElementById('edit-trip-name');

    for(let i = 0; i < days; i++) {
        const dayLocs = validLocs.slice(i * locsPerDay, (i + 1) * locsPerDay);
        if(dayLocs.length === 0) continue;
        
        currentGeneratedItinerary.push(dayLocs);
        
        let mapLink = "";
        if(dayLocs.length === 1) {
            mapLink = `https://www.google.com/maps/search/?api=1&query=${dayLocs[0].lat},${dayLocs[0].lng}`;
            coordsForMap.push([dayLocs[0].lat, dayLocs[0].lng]);
        } else {
            let waypoints = dayLocs.map(l => `${l.lat},${l.lng}`).join('|');
            mapLink = `https://www.google.com/maps/dir/?api=1&origin=${dayLocs[0].lat},${dayLocs[0].lng}&destination=${dayLocs[dayLocs.length-1].lat},${dayLocs[dayLocs.length-1].lng}&waypoints=${waypoints}&travelmode=driving`;
            dayLocs.forEach(l => coordsForMap.push([l.lat, l.lng]));
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
                html += `<div style="padding-left:18px; border-left: 2px dashed #cbd5e1; margin-bottom:15px; padding-top:5px; padding-bottom:5px;"><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:10.5px; font-weight:600; color:#64748b;">${txt.transit}</span></div>`;
                currentTime.setMinutes(currentTime.getMinutes() + 30);
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
            L.tileLayer(CARTO_TILE_URL).addTo(itiLeafletMap);
            itiLayerGroup = L.featureGroup().addTo(itiLeafletMap);

            coordsForMap.forEach((c, idx) => {
                L.circleMarker(c, { color: '#D42759', radius: 6, fillOpacity: 1 }).addTo(itiLayerGroup)
                 .bindTooltip((idx+1).toString(), {permanent: true, direction: 'center', className: 'iti-map-label'});
            });
            
            if(coordsForMap.length > 1) {
                L.polyline(coordsForMap, { color: '#D42759', weight: 3, dashArray: '5, 5' }).addTo(itiLayerGroup);
                itiLeafletMap.fitBounds(itiLayerGroup.getBounds(), { padding: [20, 20], maxZoom: 15 });
            } else if (coordsForMap.length === 1) {
                itiLeafletMap.setView(coordsForMap[0], 12);
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
    
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));
    
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
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
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
    if(btn) btn.style.display = 'none'; 
    if(saveBtn) saveBtn.style.display = 'none';
    html2pdf().set({ margin: 10, filename: 'ScreenToStreet_Guide.pdf', jsPDF: { format: 'a4' } }).from(el).save().then(() => { 
        if(btn) btn.style.display = 'block'; 
        if(saveBtn) saveBtn.style.display = 'block'; 
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
        document.getElementById('empty-state').innerHTML = currentLang === 'fr' 
            ? "Vous n'avez pas encore de voyage.<br>Allez sur la carte et ajoutez des lieux !"
            : "You haven't created any trips yet. <br>Go to the map, click on a location and 'Add to Wishlist'!";
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
        L.tileLayer(CARTO_TILE_URL).addTo(tripPageMap);
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
    if(unlockedGroups.length === 0) baseLocs = celebLocations;

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
    if(unlockedGroups.length === 0) baseLocs = celebLocations;

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
    
    currentTrip.days = currentTrip.days.map(day => day.filter(id => Number(id) !== locToRemoveData.id));

    // Important : on persiste directement le voyage mis à jour AVANT de ré-appeler renderTrip().
    // On n'utilise pas saveTrip() ici, car elle reconstruit currentTrip.days en relisant le DOM
    // (qui contient encore l'ancien lieu tant que renderTrip() n'a pas tourné), ce qui annulait
    // silencieusement la suppression qu'on vient de faire.
    let trips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    const tripIndex = trips.findIndex(t => t.id === currentTrip.id);
    if(tripIndex !== -1) trips[tripIndex] = currentTrip;
    localStorage.setItem('myTrips', JSON.stringify(trips));

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
    
    window.renderTripsSidebar();
    
    if(tripPageMap) {
        drawTripOnMap(currentTrip, tripPageMap, tripPageLayer);
    }
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
    if(unlockedGroups.length === 0) baseLocs = celebLocations;

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
        if(unlockedGroups.length === 0) availableLocs = celebLocations;
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
    if(unlockedGroups.length === 0) baseLocs = celebLocations;

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
    if(unlockedGroups.length === 0) baseLocs = celebLocations;

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
    
    let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
    wList = wList.filter(w => w.tripId !== tripIdToDelete);
    localStorage.setItem('wishlistLocs', JSON.stringify(wList));
    
    if (currentTrip && currentTrip.id === tripIdToDelete) {
        currentTrip = null;
        localStorage.removeItem('activeTripId');
    }
    
    tripIdToDelete = null;
    document.getElementById('delete-trip-modal').classList.add('hidden');
    
    if(typeof window.initTrips === 'function') window.initTrips();
    else if(document.getElementById('tab-itinerary-btn')) loadItineraryTabOptions();
}
