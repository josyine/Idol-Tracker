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
    setTimeout(() => { map.invalidateSize(); }, 200);
}

window.toggleMobileMenu = function() {
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) {
        sidebar.classList.toggle('open');
        if(!sidebar.classList.contains('open')) sidebar.classList.remove('expanded');
    }
};

// ==========================================
// 2. DONNÉES (ICONES, COULEURS & LIEUX - LES 19 LIEUX RESTAURÉS)
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
const mapPinSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

const groupColors = { "BTS": "#8b5cf6", "Blackpink": "#ec4899", "Twice": "#f43f5e", "Seventeen": "#3b82f6", "Katseye": "#10b981", "TXT": "#f59e0b" };

const filterData = {
    "BTS": { members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"], categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks"] },
    "Blackpink": { members: ["Jisoo", "Jennie", "Rosé", "Lisa"], categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"] },
    "General": { categories: ["Cafe", "Concerts", "Fashion", "Landmarks", "Museums", "Restaurants", "Pop-up Store"] }
};

// LES 19 LIEUX INTÉGRAUX
let celebLocations = [
    {
        id: 1, name: "Cafe Camptong", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2020",
        episode: "Episodes 118 & 119", episodeLink: "https://weverse.io/bts/media/3-104694116",
        context: { en: "The boys played an energetic game searching for hidden sticky notes in this massive cafe.", fr: "Le groupe a joué à un jeu plein d'énergie en cherchant des post-it cachés dans cet immense café." },
        address: "27 Apgujeong-ro 42-gil, Gangnam-gu", lat: 37.5255, lng: 127.0375, img: "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg", 
        videoEmbeds: ["https://www.youtube.com/embed/yiqe-aegVk0", "https://www.youtube.com/embed/wlHS-fpJrm0"], gallery: ["images/Camptong1.jpg", "images/Camptong2.jpg", "images/Camptong3.jpg"],
        fullDescription: { en: "Located in the trendy Apgujeong neighborhood, Cafe Camptong was a massive, multi-level establishment. Known for its industrial architecture, the venue offered coworking spaces, large lounge areas, and themed meeting rooms.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps</h3>The group took over the entire building for a giant photographic scavenger hunt.", fr: "Situé dans le quartier branché d'Apgujeong, le Cafe Camptong était un immense établissement sur plusieurs niveaux. Connu pour son architecture industrielle, le lieu proposait des espaces de coworking et des salons.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Sur les traces de BTS</h3>Le groupe a réquisitionné tout le bâtiment pour une chasse au trésor photographique géante." },
        tip: { en: "Although the original Cafe Camptong has permanently closed, the street and the building's facade remain a historical landmark for fans.", fr: "Bien que le Cafe Camptong original ait définitivement fermé, la rue et la façade du bâtiment restent un repère historique pour les fans." },
        directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 5). Walk for about 10 minutes.", fr: "Prenez la ligne Suin-Bundang jusqu'à la station Apgujeong Rodeo (Sortie 5). Marchez environ 10 minutes." }
    },
    {
        id: 2, name: "Ossu Seiromushi", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018", episode: "", episodeLink: "",
        context: { en: "A premium Japanese steamed cuisine restaurant famously co-owned by Jin and his brother.", fr: "Un restaurant japonais haut de gamme co-détenu par Jin et son frère." },
        address: "30 Baekjegobun-ro 45-gil, Songpa-gu", lat: 37.5105, lng: 127.1085, img: "images/Otsu1.jpg", videoEmbeds: [], gallery: ["images/Otsu1.jpg"],
        fullDescription: { en: "Opened in 2018, Ossu Seiromushi is a popular dining establishment near Seokchon Lake specializing in traditional Japanese cuisine. The restaurant’s signature offering is seiromushi.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>The Jin Connection</h3>While not a filming location for a specific show, this restaurant is a major landmark for the ARMY community.", fr: "Ouvert en 2018, Ossu Seiromushi est un restaurant populaire près du lac Seokchon spécialisé dans la cuisine japonaise.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>La Connexion avec Jin</h3>Bien qu'il ne s'agisse pas d'un lieu de tournage, ce restaurant est un repère majeur pour les ARMY." },
        tip: { en: "It is highly recommended to arrive early to put your name on the waiting list. Remember to respect the privacy of the staff and owners.", fr: "Il est fortement recommandé d'arriver tôt pour s'inscrire sur la liste d'attente. N'oubliez pas de respecter la vie privée du personnel et des propriétaires." },
        directions: { en: "Take Line 8 or Line 9 to Songpanaru Station (Exit 1).", fr: "Prenez la ligne 8 ou 9 jusqu'à la station Songpanaru (Sortie 1)." }
    },
    {
        id: 3, name: "Lotte World Adventure", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2018", episode: "Episode 51", episodeLink: "https://www.youtube.com/watch?v=d--MDCCJ3jg",
        context: { en: "The members went on the pirate ship and other rides for a special amusement park episode.", fr: "Les membres sont montés sur le bateau pirate et d'autres manèges pour un épisode spécial." },
        address: "240 Olympic-ro, Songpa-gu", lat: 37.5113, lng: 127.0980, img: "https://img.youtube.com/vi/d--MDCCJ3jg/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/d--MDCCJ3jg"], gallery: ["images/RunLotte1.jpg", "images/RunLotte2.png"], 
        fullDescription: { en: "Opened in 1989 in the Jamsil neighborhood, Lotte World is a must-visit entertainment complex in Seoul.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (Run BTS!)</h3>The group rented out the amusement park after hours to film their nighttime challenges.", fr: "Ouvert en 1989, Lotte World est un complexe de divertissement incontournable à Séoul.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Sur les traces de BTS (Run BTS!)</h3>Le groupe a privatisé le parc d'attractions après la fermeture pour relever des défis nocturnes." },
        tip: { en: "The animal headbands worn by the BTS members are a real tradition in South Korean amusement parks.", fr: "Les serre-têtes portés par BTS sont une vraie tradition dans les parcs sud-coréens." },
        directions: { en: "Take Line 2 or Line 8 directly to Jamsil Station.", fr: "Prenez la ligne 2 ou 8 directement jusqu'à la station Jamsil." }
    },
    {
        id: 4, name: "Ahwon Museum & Hotel", group: "BTS", member: "All", country: "South Korea", city: "Wanju (near Jeonju)", category: "Museums", year: "2019", episode: "2019 BTS Summer Package", episodeLink: "https://www.youtube.com/watch?v=h1jUtpEzxxA",
        context: { en: "Filming location for the beautiful traditional concepts of the 2019 Summer Package.", fr: "Lieu de tournage pour les magnifiques concepts traditionnels du Summer Package 2019." },
        address: "516-7 Songgwangsuman-ro, Wanju-gun", lat: 35.8455, lng: 127.1895, img: "https://img.youtube.com/vi/h1jUtpEzxxA/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/h1jUtpEzxxA"], gallery: ["images/Ahwon1.jpg"],
        fullDescription: { en: "Located in the serene Oseong Hanok Village, Ahwon blends modern concrete galleries with a 250-year-old traditional Korean house.", fr: "Situé dans le paisible village Hanok d'Oseong, Ahwon mêle galeries modernes et maisons traditionnelles de 250 ans." },
        tip: { en: "You don't need to book an overnight stay; Ahwon operates as a gallery and cafe during the day.", fr: "Pas besoin d'y dormir : Ahwon fonctionne comme galerie et café la journée." },
        directions: { en: "Take a taxi from Jeonju Station (approx 30-40 mins).", fr: "Prendre un taxi depuis la station de Jeonju (environ 30-40 min)." }
    },
    {
        id: 5, name: "Cafe Kitsuné Seoul", group: "Blackpink", member: "Jennie", country: "South Korea", city: "Seoul", category: "Cafe", year: "2021", episode: "", episodeLink: "",
        context: { en: "Jennie visited this popular cafe and posted photos on her Instagram.", fr: "Jennie a visité ce célèbre café et posté des photos sur Instagram." },
        address: "23 Dosan-daero 13-gil, Gangnam-gu", lat: 37.5197, lng: 127.0229, img: "images/Kitsune1.jpg", videoEmbeds: [], gallery: ["images/Kitsune1.jpg"],
        fullDescription: { en: "A chic French-Japanese aesthetic cafe located in Garosu-gil.", fr: "Un café à l'esthétique franco-japonaise situé à Garosu-gil." },
        tip: { en: "Great spot for fashion lovers visiting Sinsa-dong.", fr: "Un super endroit pour les amateurs de mode visitant Sinsa-dong." },
        directions: { en: "Take Line 3 to Sinsa Station. Exit 8.", fr: "Ligne 3 jusqu'à la station Sinsa. Sortie 8." }
    },
    {
        id: 6, name: "Pozzetto", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Cafe", year: "2019", episode: "", episodeLink: "",
        context: { en: "Jimin was spotted enjoying artisanal gelato here.", fr: "Jimin a été aperçu en train de déguster une glace artisanale ici." },
        address: "39 Rue du Roi de Sicile, 75004 Paris", lat: 48.8569, lng: 2.3572, img: "images/Pozzetto1.jpg", videoEmbeds: [], gallery: ["images/Pozzetto1.jpg"],
        fullDescription: { en: "During BTS's time in Paris in 2019, Jimin visited Pozzetto, a highly rated artisanal Italian gelato.", fr: "Lors du passage de BTS à Paris en 2019, Jimin a visité Pozzetto, un excellent glacier artisanal italien." },
        tip: { en: "Try the pistachio gelato, it's their specialty!", fr: "Goûtez la glace à la pistache, c'est leur spécialité !" },
        directions: { en: "Take Metro Line 1 or 11 to Hôtel de Ville.", fr: "Prendre le Métro Ligne 1 ou 11 jusqu'à Hôtel de Ville." }
    },
    {
        id: 7, name: "Musée Nissim de Camondo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Fashion", year: "2026", episode: "Dior Men's Fashion Week Show", episodeLink: "https://www.youtube.com/watch?v=1TdxCtgX53w",
        context: { en: "Jimin made a highly anticipated appearance at the Dior Men's Fashion Week presentation here.", fr: "Jimin a fait une apparition très attendue au défilé Dior pour la Fashion Week." },
        address: "63 Rue de Monceau, 75008 Paris", lat: 48.8795, lng: 2.3117, img: "https://img.youtube.com/vi/1TdxCtgX53w/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/1TdxCtgX53w"], gallery: ["images/Nissim1.jpg"],
        fullDescription: { en: "Located near Parc Monceau, this spectacular private mansion was chosen by Dior as the backdrop for its 2026 Men's Fashion Week.", fr: "Situé près du Parc Monceau, cet hôtel particulier spectaculaire a été choisi par Dior pour son défilé Homme 2026." },
        tip: { en: "The museum is fully open to the public and is a fantastic, quieter alternative to Versailles.", fr: "Le musée est ouvert au public et constitue une excellente alternative paisible à Versailles." },
        directions: { en: "Take Metro Line 2 to Monceau station.", fr: "Prendre le Métro Ligne 2 jusqu'à la station Monceau." }
    },
    {
        id: 8, name: "Montmartre Stairs", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", episode: "", episodeLink: "",
        context: { en: "Jimin took iconic photos on these famous steps during his trip.", fr: "Jimin a pris des photos emblématiques sur ces célèbres marches." },
        address: "Rue Foyatier, 75018 Paris", lat: 48.8856, lng: 2.3432, img: "images/MontmartreStairs1.jpg", videoEmbeds: [], gallery: ["images/MontmartreStairs1.jpg"],
        fullDescription: { en: "During his free time in Paris, Jimin wandered around the historic Montmartre neighborhood. He shared photos posing gracefully on these steep, picturesque stairs.", fr: "Pendant son temps libre à Paris, Jimin s'est promené dans le quartier historique de Montmartre. Il a partagé des photos posant gracieusement sur ces escaliers pittoresques." },
        tip: { en: "Climb these early in the morning to avoid crowds.", fr: "Montez ces marches tôt le matin pour éviter la foule." },
        directions: { en: "Take Metro Line 2 to Anvers. Walk up the hill.", fr: "Prendre le Métro Ligne 2 jusqu'à Anvers et monter la colline." }
    },
    {
        id: 9, name: "Wall of Love", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", episode: "", episodeLink: "",
        context: { en: "Jimin was spotted exploring this famous romantic art installation.", fr: "Jimin a exploré cette célèbre installation romantique." },
        address: "Square Jehan Rictus, 75018 Paris", lat: 48.8848, lng: 2.3386, img: "images/WallOfLove1.jpg", videoEmbeds: [], gallery: ["images/WallOfLove1.jpg"],
        fullDescription: { en: "Located in the heart of Montmartre, this art installation features the phrase 'I love you' in 250 languages.", fr: "Située au cœur de Montmartre, cette œuvre d'art affiche la phrase 'Je t'aime' dans 250 langues." },
        tip: { en: "Try finding your language on the wall!", fr: "Essayez de trouver votre langue sur le mur !" },
        directions: { en: "Take Metro Line 12 to Abbesses station.", fr: "Prendre le Métro Ligne 12 jusqu'à la station Abbesses." }
    },
    {
        id: 10, name: "Palais de Tokyo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Museums", year: "2023", episode: "", episodeLink: "",
        context: { en: "Jimin attended a prestigious Dior fashion event here.", fr: "Jimin a assisté à un événement Dior prestigieux ici." },
        address: "13 Avenue du Président Wilson, 75116 Paris", lat: 48.8643, lng: 2.2965, img: "images/PalaisTokyo1.jpg", videoEmbeds: [], gallery: ["images/PalaisTokyo1.jpg"],
        fullDescription: { en: "This contemporary art museum frequently hosts major Paris Fashion Week events.", fr: "Ce musée d'art contemporain accueille souvent des événements majeurs de la Fashion Week." },
        tip: { en: "Great views of the Eiffel Tower from the courtyard.", fr: "Superbe vue sur la Tour Eiffel depuis la cour." },
        directions: { en: "Take Metro Line 9 to Iéna.", fr: "Prendre le Métro Ligne 9 jusqu'à Iéna." }
    },
    {
        id: 11, name: "Cheonggu Building", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2017", episode: "Early Debut Era", episodeLink: "https://www.youtube.com/watch?v=vJwHIpEogEY",
        context: { en: "The legendary former Big Hit Entertainment building and practice room.", fr: "Le légendaire ancien bâtiment de Big Hit Entertainment et sa salle de pratique." },
        address: "16 Hakdong-ro 30-gil, Gangnam-gu", lat: 37.5144, lng: 127.0315, img: "https://img.youtube.com/vi/vJwHIpEogEY/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/vJwHIpEogEY"], gallery: ["images/Cheonggu1.jpg", "images/Cheonggu2.jpg"],
        fullDescription: { en: "Long before the massive HYBE headquarters existed, this modest building was the cradle of BTS's career. Big Hit Entertainment operated from the second floor, while the basement housed their legendary, cramped practice room.", fr: "Bien avant l'immense siège d'HYBE, ce modeste bâtiment fut le berceau de la carrière de BTS. Big Hit Entertainment opérait au deuxième étage, et le sous-sol abritait leur mythique salle de danse." },
        tip: { en: "Please respect the current tenants by not entering the building itself.", fr: "Merci de respecter les locataires actuels en n'entrant pas dans le bâtiment." },
        directions: { en: "Take Subway Line 7 to Hakdong Station (Exit 7). Walk 10 minutes.", fr: "Prenez la ligne 7 jusqu'à la station Hakdong (Sortie 7). Marchez 10 minutes." }
    },
    {
        id: 12, name: "The First BTS Dorm", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", episode: "1st BTS Birthday Party", episodeLink: "https://www.youtube.com/watch?v=RhJqNFQCU_Q",
        context: { en: "The original cramped dorm where all 7 members lived together.", fr: "Le premier dortoir exigu où les 7 membres ont vécu ensemble." },
        address: "29 Nonhyeon-ro 119-gil, Gangnam-gu", lat: 37.5133, lng: 127.0321, img: "https://img.youtube.com/vi/RhJqNFQCU_Q/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/RhJqNFQCU_Q"], gallery: ["images/Dorm1.jpg"],
        fullDescription: { en: "This unassuming residential building houses the very first apartment shared by BTS during their rookie days. All seven members famously shared a single bedroom with bunk beds.", fr: "Ce bâtiment résidentiel discret abrite le tout premier appartement partagé par BTS à leurs débuts. Les sept membres ont partagé une seule chambre remplie de lits superposés." },
        tip: { en: "Crucial Legal Tip: Please remember that this building is currently a private residence. Do not disturb the tenants.", fr: "Conseil important : N'oubliez pas qu'il s'agit aujourd'hui d'une résidence privée. Ne dérangez pas les locataires." },
        directions: { en: "Walk a few streets down from Hakdong Station or Hakdong Park.", fr: "Marchez quelques rues depuis la station Hakdong ou le parc Hakdong." }
    },
    {
        id: 13, name: "Hyangho Beach Bus Stop", group: "BTS", member: "All", country: "South Korea", city: "Gangneung", category: "Landmarks", year: "2017", episode: "You Never Walk Alone Photoshoot", episodeLink: "https://www.youtube.com/watch?v=46qWWmnK4F0",
        context: { en: "The iconic standalone bus stop built on the beach.", fr: "Le célèbre arrêt de bus construit sur la plage." },
        address: "8-55 Hyangho-ri, Jumunjin-eup, Gangneung", lat: 37.9048, lng: 128.8266, img: "https://img.youtube.com/vi/46qWWmnK4F0/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/46qWWmnK4F0"], gallery: ["images/Hyangho1.jpg"],
        fullDescription: { en: "Set directly against the backdrop of the East Sea, this structure captures the melancholic vibe of BTS's track, 'Spring Day'.", fr: "Face à la mer de l'Est, cette structure capture l'ambiance mélancolique du titre 'Spring Day'." },
        tip: { en: "Fans waiting in line will usually help you take photos so you can fit your whole group!", fr: "Les fans qui font la queue vous aideront généralement à prendre des photos pour que tout votre groupe soit sur l'image !" },
        directions: { en: "Take the KTX to Gangneung Station, then Bus 300 or a taxi.", fr: "Prenez le KTX jusqu'à la gare de Gangneung, puis le bus 300 ou un taxi." }
    },
    {
        id: 14, name: "Iryeong Station", group: "BTS", member: "All", country: "South Korea", city: "Yangju", category: "MV Location", year: "2017", episode: "\"Spring Day\" Official MV", episodeLink: "https://www.youtube.com/watch?v=xEeFrLSkMm8",
        context: { en: "The abandoned railway station featured in the opening scene of 'Spring Day'.", fr: "La gare abandonnée vue dans la magnifique scène d'ouverture de 'Spring Day'." },
        address: "327 Samsang-ri, Yangju-si", lat: 37.7135, lng: 126.9329, img: "https://img.youtube.com/vi/xEeFrLSkMm8/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/xEeFrLSkMm8"], gallery: ["images/Iryeong1.jpg"],
        fullDescription: { en: "This rustic, decommissioned station serves as the breathtaking opening shot for the 'Spring Day' music video, where V kneels down in the quiet, wintery landscape.", fr: "Cette gare rustique désaffectée sert de plan d'ouverture époustouflant pour le clip 'Spring Day', où V s'agenouille dans le paysage hivernal silencieux." },
        tip: { en: "Do not walk far down the active rail lines, as cargo trains occasionally pass.", fr: "Ne marchez pas trop loin sur les voies, car des trains de marchandises y passent parfois." },
        directions: { en: "Take Subway Line 3 to Yeonsinnae Station, then local Bus 360.", fr: "Prenez la ligne 3 jusqu'à Yeonsinnae, puis le bus local 360." }
    },
    {
        id: 15, name: "Quinta da Francelha de Cima", group: "BTS", member: "All", country: "Portugal", city: "Prior Velho", category: "MV Location", year: "2026", episode: "\"NORMAL\" MV", episodeLink: "https://www.youtube.com/watch?v=GEk4jHwfFTA",
        context: { en: "The breathtaking historic Portuguese estate from the 'NORMAL' music video.", fr: "Le magnifique domaine historique portugais du clip 'NORMAL'." },
        address: "R. da Francelha de Cima, Prior Velho", lat: 38.7844, lng: -9.1238, img: "https://img.youtube.com/vi/GEk4jHwfFTA/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/GEk4jHwfFTA"], gallery: ["images/Quinta1.jpg", "images/Quinta2.jpg"],
        fullDescription: { en: "A magnificent 18th-century historic Portuguese estate. BTS chose this venue to film the cinematic music video for 'NORMAL'.", fr: "Un magnifique domaine portugais du 18e siècle. BTS a choisi ce lieu pour filmer le clip cinématographique de 'NORMAL'." },
        tip: { en: "It is incredibly easy to swing by and admire the entrance if you are near Lisbon Airport.", fr: "C'est incroyablement facile d'y passer admirer l'entrée si vous êtes près de l'aéroport de Lisbonne." },
        directions: { en: "Take a taxi or ride-share directly from Lisbon Airport.", fr: "Prenez un taxi ou un VTC directement depuis l'aéroport de Lisbonne." }
    },
    {
        id: 16, name: "Sunhyewon", group: "BTS", member: "All", country: "South Korea", city: "Seoul Area", category: "MV Location", year: "2026", episode: "\"NORMAL\" Live Clip", episodeLink: "https://www.youtube.com/watch?v=Hb06Iem3FWg",
        context: { en: "BTS delivered an intimate live performance against the quiet elegance of this traditional estate.", fr: "BTS a livré une performance live intime dans l'élégance paisible de ce domaine traditionnel." },
        address: "Sunhyewon Estate, South Korea", lat: 37.5826, lng: 126.9856, img: "https://img.youtube.com/vi/Hb06Iem3FWg/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/Hb06Iem3FWg"], gallery: ["images/Sunhyewon1.jpg"],
        fullDescription: { en: "Sunhyewon is a breathtaking traditional Korean architectural estate blending living quarters with the natural landscape.", fr: "Sunhyewon est un domaine architectural traditionnel coréen époustouflant qui se fond dans le paysage naturel." },
        tip: { en: "Visitors are often expected to remove their footwear before stepping onto elevated wooden platforms.", fr: "On attend souvent des visiteurs qu'ils enlèvent leurs chaussures avant de monter sur les plateformes en bois." },
        directions: { en: "Accessible via regional commuter rail followed by a local bus.", fr: "Accessible via les trains de banlieue régionaux suivis d'un bus local." }
    },
    {
        id: 17, name: "Museu de Marinha", group: "BTS", member: "All", country: "Portugal", city: "Lisbon", category: "Default", year: "2026", episode: "\"Swim\" MV", episodeLink: "https://www.youtube.com/watch?v=b4iVv91Z6lY",
        context: { en: "The historic naval museum serving as the grandiose backdrop for the 'Swim' music video.", fr: "Le musée naval historique servant de décor grandiose pour le clip de 'Swim'." },
        address: "Praça do Império, 1400-206 Lisboa", lat: 38.6976, lng: -9.2082, img: "https://img.youtube.com/vi/b4iVv91Z6lY/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/b4iVv91Z6lY"], gallery: ["images/Marinha1.jpg"],
        fullDescription: { en: "Housed in the Jerónimos Monastery, the Navy Museum displays over 17,000 historical items.", fr: "Situé dans le monastère des Hiéronymites, le musée de la Marine expose plus de 17 000 objets historiques." },
        tip: { en: "Belém is a must-visit! Walk to the famous Pastéis de Belém bakery right down the street.", fr: "Belém est incontournable ! Marchez jusqu'à la célèbre boulangerie Pastéis de Belém juste au bout de la rue." },
        directions: { en: "Take Tram 15E or Bus 728 from Praça do Comércio.", fr: "Prenez le tram 15E ou le bus 728 depuis la Praça do Comércio." }
    },
    {
        id: 18, name: "In the SOOP Estate", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2021", episode: "In the SOOP Season 2", episodeLink: "https://www.youtube.com/watch?v=6qB8Nb_WO_Y",
        context: { en: "The luxurious private mountain estate custom-built by HYBE for BTS's healing reality show.", fr: "Le luxueux domaine privé à la montagne, construit sur mesure par HYBE pour l'émission de BTS." },
        address: "Chuncheon, Gangwon-do", lat: 37.8813, lng: 127.7298, img: "https://img.youtube.com/vi/6qB8Nb_WO_Y/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/6qB8Nb_WO_Y"], gallery: ["images/Soop1.jpg"],
        fullDescription: { en: "Hidden deep within the lush mountains of Chuncheon, this sprawling private estate was completely customized for the show.", fr: "Caché au fond des montagnes verdoyantes de Chuncheon, ce vaste domaine privé a été entièrement personnalisé pour l'émission." },
        tip: { en: "You cannot drive there yourself. You must book the official 'In the SOOP Stay' package through Phoenix Pyeongchang.", fr: "Vous ne pouvez pas vous y rendre par vous-même. Vous devez réserver le tour officiel 'In the SOOP Stay' via Phoenix Pyeongchang." },
        directions: { en: "Take the KTX to Pyeongchang Station, and hop on the official resort shuttle.", fr: "Prenez le KTX jusqu'à la gare de Pyeongchang, puis montez dans la navette officielle." }
    },
    {
        id: 19, name: "Happy Meadow Ranch", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2020", episode: "In the SOOP Season 1 Area", episodeLink: "https://www.youtube.com/watch?v=F14vk9qPRM0",
        context: { en: "Experience the ultimate In the SOOP vibe by eating a premium Hanwoo burger overlooking the lake.", fr: "Vivez l'ambiance ultime de 'In the SOOP' en dégustant un burger Hanwoo premium avec vue sur le lac." },
        address: "330-48 Chunhwa-ro, Chuncheon-si", lat: 37.9547, lng: 127.6975, img: "https://img.youtube.com/vi/F14vk9qPRM0/hqdefault.jpg", videoEmbeds: ["https://www.youtube.com/embed/F14vk9qPRM0"], gallery: ["images/HappyMeadow1.jpg"],
        fullDescription: { en: "Perched high on the mountainsides, this ranch offers breathtaking views of the pristine Chuncheon Lake.", fr: "Perché sur les flancs de la montagne, ce ranch offre une vue imprenable sur le magnifique lac de Chuncheon." },
        tip: { en: "The burgers sell out fast! Arrive early, then take the 15-minute uphill walking trail to reach the main photo zone.", fr: "Les burgers sont vite en rupture de stock ! Arrivez tôt, puis prenez le sentier de 15 minutes pour atteindre la zone photo panoramique." },
        directions: { en: "Take the ITX train from Seoul to Chuncheon Station, and then take a 30-minute taxi ride.", fr: "Prenez le train ITX de Séoul à la gare de Chuncheon, puis prenez un taxi pendant 30 minutes." }
    }
];

// ==========================================
// 3. LOGIQUE UI ET LANGUES
// ==========================================
let currentLang = localStorage.getItem('lang') || 'en';
const translations = {
    en: { btnGenerateIti: "Auto-Itinerary Generator", filterGroup: "GROUP", filterMember: "MEMBER", filterArea: "AREA", filterYear: "YEAR", filterCategories: "CATEGORIES", locationsCount: "LOCATIONS", cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept" },
    fr: { btnGenerateIti: "Générateur Itinéraire", filterGroup: "GROUPE", filterMember: "MEMBRE", filterArea: "RÉGION", filterYear: "ANNÉE", filterCategories: "CATÉGORIES", locationsCount: "LIEUX", cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter" }
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
        opt.addEventListener('click', function(e) { e.preventDefault(); currentLang = this.getAttribute('data-lang'); localStorage.setItem('lang', currentLang); updateUI(); });
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
    if(unlockedGroups.length === 0) availableLocs = celebLocations; // Mode demo si rien n'est acheté

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
            loc.gallery.forEach(p => { galleryContainer.innerHTML += `<img src="${p}" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">`; });
            gallerySection.classList.remove('hidden');
        } else { gallerySection.classList.add('hidden'); }
    }

    const videoContainer = document.getElementById('details-video-container');
    const videoSection = document.getElementById('details-video-section');
    if (videoContainer && videoSection) {
        videoContainer.innerHTML = ""; 
        if (loc.videoEmbeds && loc.videoEmbeds.length > 0) {
            loc.videoEmbeds.forEach(vidSrc => { videoContainer.innerHTML += `<div class="video-wrapper"><iframe src="${vidSrc}" frameborder="0" allowfullscreen></iframe></div>`; });
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
    if(vCheck) {
        let vList = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        vCheck.checked = vList.some(v => v.id === loc.id || v === loc.id);
        vCheck.onchange = function() {
            let list = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
            if(this.checked) { if(!list.some(v => v.id === loc.id)) list.push({id: loc.id, date: new Date().toLocaleDateString()}); }
            else { list = list.filter(v => v.id !== loc.id && v !== loc.id); }
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
            if(this.checked) { if(!list.some(w => w.id === loc.id)) list.push({id: loc.id, date: new Date().toLocaleDateString()}); }
            else { list = list.filter(w => w.id !== loc.id && w !== loc.id); }
            localStorage.setItem('wishlistLocs', JSON.stringify(list));
            renderLocations();
        };
    }

    document.getElementById('sidebar-main').classList.add('hidden');
    document.getElementById('sidebar-details').classList.remove('hidden');
    
    const sidebar = document.getElementById('app-sidebar');
    if(sidebar) { sidebar.classList.add('open'); sidebar.classList.add('expanded'); }
    
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
// 8. COOKIES BANNER LOGIC
// ==========================================
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
// 9. REDIRECTION DEPUIS VISITED / WISHLIST
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
