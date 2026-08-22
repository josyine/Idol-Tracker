// ==========================================
// 1. INITIALISATION DE LA CARTE PRINCIPALE
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
// 2. DONNÉES : LES 19 LIEUX INTÉGRAUX AVEC TEXTES ET INSPIS #1-#5
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
    {
        id: 1, name: "Cafe Camptong", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2020",
        episode: "Episodes 118 & 119", episodeLink: "https://weverse.io/bts/media/3-104694116", ytId: "yiqe-aegVk0",
        context: { en: "The boys played an energetic game searching for hidden sticky notes in this massive cafe.", fr: "Le groupe a joué à un jeu plein d'énergie en cherchant des post-it cachés dans cet immense café." },
        address: "27 Apgujeong-ro 42-gil, Gangnam-gu", lat: 37.5255, lng: 127.0375, img: "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg", 
        gallery: ["images/Camptong1.jpg", "images/Camptong2.jpg", "https://img.youtube.com/vi/yiqe-aegVk0/hqdefault.jpg"],
        fullDescription: { 
            en: `<p>Located in the trendy Apgujeong district, Cafe Camptong served as the sprawling backdrop for one of the most chaotic scavenger hunts in Run BTS history.</p><h4>When a cafe becomes an obstacle course</h4><p>The multi-story building offered industrial aesthetics, open lounges, and maze-like corners which the production team weaponized into hideouts for hundreds of hidden sticky notes.</p><div class="quote">"If we find the golden note here, we're taking all the credit!" — RM</div><h4>Legacy</h4><p>Although the venue has closed, ARMYs still make pilgrimages to the building facade to retrace the members' running paths across Apgujeong.</p>`, 
            fr: `<p>Situé dans le quartier branché d'Apgujeong, le Cafe Camptong a servi de décor gigantesque pour l'une des chasses au trésor les plus chaotiques de Run BTS.</p><h4>Quand un café devient un parcours d'obstacles</h4><p>Ce bâtiment à plusieurs niveaux offrait des espaces industriels et des recoins labyrinthiques parfaits pour cacher des centaines de post-it.</p><div class="quote">"Si on trouve le post-it doré ici, on prend tout le mérite !" — RM</div><h4>Héritage</h4><p>Bien que le lieu ait fermé, les ARMY continuent de visiter la façade pour revivre les courses effrénées des membres.</p>` 
        },
        tip: { en: "The building facade remains a historical landmark for fans.", fr: "La façade du bâtiment reste un repère historique pour les fans." },
        directions: { en: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 5).", fr: "Prenez la ligne Suin-Bundang jusqu'à Apgujeong Rodeo (Sortie 5)." }
    },
    {
        id: 2, name: "Ossu Seiromushi", group: "BTS", member: "Jin", country: "South Korea", city: "Seoul", category: "Restaurants", year: "2018", ytId: "Otsu1",
        context: { en: "A premium Japanese steamed cuisine restaurant co-owned by Jin.", fr: "Un restaurant haut de gamme co-détenu par Jin." },
        address: "30 Baekjegobun-ro 45-gil, Songpa-gu", lat: 37.5105, lng: 127.1085, img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600", gallery: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600"],
        fullDescription: { 
            en: `<p>Nestled near Seokchon Lake, Ossu Seiromushi represents Jin's successful venture into culinary business alongside his brother.</p><h4>Traditional Steamed Delights</h4><p>Specializing in seiromushi—traditional Japanese wood-steamed dishes—the restaurant pairs high-end cuts of meat and fresh vegetables with an intimate interior design.</p>`, 
            fr: `<p>Niché près du lac Seokchon, Ossu Seiromushi illustre le succès de Jin dans la restauration aux côtés de son frère.</p><h4>Cuisine vapeur traditionnelle</h4><p>Spécialisé dans le seiromushi, le restaurant propose des viandes et légumes frais dans un cadre intime.</p>` 
        },
        tip: { en: "Arrive early to secure a spot on the waiting list.", fr: "Arrivez tôt pour être sur la liste d'attente." },
        directions: { en: "Take Line 8 or Line 9 to Songpanaru Station (Exit 1).", fr: "Prenez la ligne 8 ou 9 jusqu'à Songpanaru (Sortie 1)." }
    },
    {
        id: 3, name: "Lotte World Adventure", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Run BTS", year: "2018", episode: "Episode 51", episodeLink: "https://www.youtube.com/watch?v=d--MDCCJ3jg", ytId: "d--MDCCJ3jg",
        context: { en: "The members went on the pirate ship and other rides for a special amusement park episode.", fr: "Les membres sont montés sur le bateau pirate pour un épisode spécial." },
        address: "240 Olympic-ro, Songpa-gu", lat: 37.5113, lng: 127.0980, img: "https://img.youtube.com/vi/d--MDCCJ3jg/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/d--MDCCJ3jg/hqdefault.jpg"],
        fullDescription: { en: `<p>Lotte World is the world's largest indoor amusement park, providing an epic playground for Run BTS Episode 51.</p><h4>Privatized Thrills</h4><p>The group rented out the park after hours, screaming their way through the Gyro Drop and the iconic pirate ship.</p>`, fr: `<p>Lotte World est le plus grand parc d'attractions couvert au monde, servant de terrain de jeu épique pour l'épisode 51 de Run BTS.</p><h4>Sensations privatisées</h4><p>Le groupe a privatisé le parc pour affronter les manèges mythiques.</p>` },
        tip: { en: "Wear animal headbands just like they did!", fr: "Portez des serre-têtes d'animaux comme eux !" },
        directions: { en: "Take Line 2 or 8 to Jamsil Station.", fr: "Ligne 2 ou 8 jusqu'à Jamsil." }
    },
    {
        id: 4, name: "Ahwon Museum & Hotel", group: "BTS", member: "All", country: "South Korea", city: "Wanju", category: "Museums", year: "2019", episode: "Summer Package", episodeLink: "https://www.youtube.com/watch?v=h1jUtpEzxxA", ytId: "h1jUtpEzxxA",
        context: { en: "Filming location for the traditional concepts of the 2019 Summer Package.", fr: "Lieu de tournage du Summer Package 2019." },
        address: "516-7 Songgwangsuman-ro", lat: 35.8455, lng: 127.1895, img: "https://img.youtube.com/vi/h1jUtpEzxxA/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/h1jUtpEzxxA/hqdefault.jpg"],
        fullDescription: { en: `<p>A stunning blend of modern concrete art galleries and 250-year-old traditional Korean hanok architecture.</p>`, fr: `<p>Un mélange saisissant de galeries d'art modernes en béton et de maisons traditionnelles coréennes de 250 ans.</p>` },
        tip: { en: "Operates as a cafe and gallery during the day.", fr: "Ouvert en journée comme galerie et café." },
        directions: { en: "Taxi from Jeonju Station.", fr: "Taxi depuis la gare de Jeonju." }
    },
    {
        id: 5, name: "Cafe Kitsuné Seoul", group: "Blackpink", member: "Jennie", country: "South Korea", city: "Seoul", category: "Cafe", year: "2021", ytId: "Kitsune1",
        context: { en: "Jennie visited this popular cafe and posted photos on Instagram.", fr: "Jennie a visité ce café et posté sur Instagram." },
        address: "23 Dosan-daero 13-gil", lat: 37.5197, lng: 127.0229, img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600", gallery: ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600"],
        fullDescription: { en: `<p>A chic French-Japanese aesthetic cafe located in the heart of Garosu-gil.</p>`, fr: `<p>Un café chic à l'esthétique franco-japonaise situé au cœur de Garosu-gil.</p>` },
        tip: { en: "Great spot for fashion lovers.", fr: "Super endroit pour les amateurs de mode." },
        directions: { en: "Line 3 to Sinsa Station (Exit 8).", fr: "Ligne 3 jusqu'à Sinsa (Sortie 8)." }
    },
    {
        id: 6, name: "Pozzetto", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Cafe", year: "2019", ytId: "Pozzetto1",
        context: { en: "Jimin was spotted enjoying artisanal gelato here.", fr: "Jimin a été aperçu en train de déguster une glace ici." },
        address: "39 Rue du Roi de Sicile, Paris", lat: 48.8569, lng: 2.3572, img: "https://images.unsplash.com/photo-1557142046-c704a3adf365?w=600", gallery: ["https://images.unsplash.com/photo-1557142046-c704a3adf365?w=600"],
        fullDescription: { en: `<p>High-end Italian artisan gelato in the Marais district.</p>`, fr: `<p>Glacier artisanal italien haut de gamme dans le Marais.</p>` },
        tip: { en: "Try the pistachio flavor!", fr: "Goûtez la pistache !" },
        directions: { en: "Metro Hôtel de Ville.", fr: "Métro Hôtel de Ville." }
    },
    {
        id: 7, name: "Musée Nissim de Camondo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Fashion", year: "2026", episode: "Dior Show", episodeLink: "https://www.youtube.com/watch?v=1TdxCtgX53w", ytId: "1TdxCtgX53w",
        context: { en: "Jimin made an appearance at the Dior Men's Fashion Week.", fr: "Apparition de Jimin au défilé Dior." },
        address: "63 Rue de Monceau, Paris", lat: 48.8795, lng: 2.3117, img: "https://img.youtube.com/vi/1TdxCtgX53w/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/1TdxCtgX53w/hqdefault.jpg"],
        fullDescription: { en: `<p>A spectacular private mansion chosen by Dior for its Fashion Week presentation.</p>`, fr: `<p>Hôtel particulier spectaculaire choisi par Dior pour sa Fashion Week.</p>` },
        tip: { en: "Open to the public as a museum.", fr: "Ouvert au public comme musée." },
        directions: { en: "Metro Monceau.", fr: "Métro Monceau." }
    },
    {
        id: 8, name: "Montmartre Stairs", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", ytId: "Montmartre1",
        context: { en: "Jimin took iconic photos on these steps.", fr: "Photos emblématiques de Jimin sur ces marches." },
        address: "Rue Foyatier, Paris", lat: 48.8856, lng: 2.3432, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600", gallery: ["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600"],
        fullDescription: { en: `<p>Steep, picturesque stairs in the historic Montmartre district.</p>`, fr: `<p>Escaliers pittoresques dans le quartier historique de Montmartre.</p>` },
        tip: { en: "Visit early morning.", fr: "Visitez tôt le matin." },
        directions: { en: "Metro Anvers.", fr: "Métro Anvers." }
    },
    {
        id: 9, name: "Wall of Love", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Landmarks", year: "2019", ytId: "WallOfLove1",
        context: { en: "Jimin explored this romantic art installation.", fr: "Jimin a exploré cette installation romantique." },
        address: "Square Jehan Rictus, Paris", lat: 48.8848, lng: 2.3386, img: "https://images.unsplash.com/photo-1522093005080-d132e14a2e6f?w=600", gallery: ["https://images.unsplash.com/photo-1522093005080-d132e14a2e6f?w=600"],
        fullDescription: { en: `<p>Features 'I love you' in 250 languages.</p>`, fr: `<p>Affiche 'Je t'aime' en 250 langues.</p>` },
        tip: { en: "Located in Abbesses.", fr: "Situé à Abbesses." },
        directions: { en: "Metro Abbesses.", fr: "Métro Abbesses." }
    },
    {
        id: 10, name: "Palais de Tokyo", group: "BTS", member: "Jimin", country: "France", city: "Paris", category: "Museums", year: "2023", ytId: "PalaisTokyo1",
        context: { en: "Jimin attended a prestigious Dior fashion event.", fr: "Événement Dior prestigieux." },
        address: "13 Av. du Président Wilson, Paris", lat: 48.8643, lng: 2.2965, img: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600", gallery: ["https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600"],
        fullDescription: { en: `<p>Contemporary art museum hosting major fashion events.</p>`, fr: `<p>Musée d'art contemporain accueillant des événements majeurs.</p>` },
        tip: { en: "Great Eiffel Tower views.", fr: "Superbe vue sur la Tour Eiffel." },
        directions: { en: "Metro Iéna.", fr: "Métro Iéna." }
    },
    {
        id: 11, name: "Cheonggu Building", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2017", episode: "Early Debut", episodeLink: "https://www.youtube.com/watch?v=vJwHIpEogEY", ytId: "vJwHIpEogEY",
        context: { en: "Former Big Hit Entertainment building and practice room.", fr: "Ancien bâtiment de Big Hit et salle de danse." },
        address: "16 Hakdong-ro 30-gil", lat: 37.5144, lng: 127.0315, img: "https://img.youtube.com/vi/vJwHIpEogEY/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/vJwHIpEogEY/hqdefault.jpg"],
        fullDescription: { en: `<p>The cradle of BTS's career during their rookie days.</p>`, fr: `<p>Le berceau de la carrière de BTS à leurs débuts.</p>` },
        tip: { en: "Respect current tenants.", fr: "Respectez les locataires actuels." },
        directions: { en: "Hakdong Station Exit 7.", fr: "Station Hakdong Sortie 7." }
    },
    {
        id: 12, name: "The First BTS Dorm", group: "BTS", member: "All", country: "South Korea", city: "Seoul", category: "Landmarks", year: "2013 - 2015", episode: "1st Birthday", episodeLink: "https://www.youtube.com/watch?v=RhJqNFQCU_Q", ytId: "RhJqNFQCU_Q",
        context: { en: "The original cramped dorm where all 7 members lived.", fr: "Le premier dortoir exigu." },
        address: "29 Nonhyeon-ro 119-gil", lat: 37.5133, lng: 127.0321, img: "https://img.youtube.com/vi/RhJqNFQCU_Q/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/RhJqNFQCU_Q/hqdefault.jpg"],
        fullDescription: { en: `<p>Where all seven members shared a single bedroom.</p>`, fr: `<p>Où les sept membres partagaient une seule chambre.</p>` },
        tip: { en: "Private residence, do not disturb.", fr: "Résidence privée, ne pas déranger." },
        directions: { en: "Near Hakdong Park.", fr: "Près du parc Hakdong." }
    },
    {
        id: 13, name: "Hyangho Beach Bus Stop", group: "BTS", member: "All", country: "South Korea", city: "Gangneung", category: "Landmarks", year: "2017", episode: "Spring Day", episodeLink: "https://www.youtube.com/watch?v=46qWWmnK4F0", ytId: "46qWWmnK4F0",
        context: { en: "The iconic bus stop built on the beach.", fr: "L'arrêt de bus sur la plage." },
        address: "8-55 Hyangho-ri", lat: 37.9048, lng: 128.8266, img: "https://img.youtube.com/vi/46qWWmnK4F0/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/46qWWmnK4F0/hqdefault.jpg"],
        fullDescription: { en: `<p>Featured in the 'Spring Day' album jacket photos.</p>`, fr: `<p>Présent dans les photos de l'album 'Spring Day'.</p>` },
        tip: { en: "Queue up for photos.", fr: "Faites la queue pour les photos." },
        directions: { en: "KTX to Gangneung Station.", fr: "KTX jusqu'à Gangneung." }
    },
    {
        id: 14, name: "Iryeong Station", group: "BTS", member: "All", country: "South Korea", city: "Yangju", category: "MV Location", year: "2017", episode: "Spring Day MV", episodeLink: "https://www.youtube.com/watch?v=xEeFrLSkMm8", ytId: "xEeFrLSkMm8",
        context: { en: "Abandoned railway station from Spring Day.", fr: "Gare abandonnée de Spring Day." },
        address: "327 Samsang-ri", lat: 37.7135, lng: 126.9329, img: "https://img.youtube.com/vi/xEeFrLSkMm8/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/xEeFrLSkMm8/hqdefault.jpg"],
        fullDescription: { en: `<p>The breathtaking opening shot where V stands in the snow.</p>`, fr: `<p>Le plan d'ouverture où V apparaît dans la neige.</p>` },
        tip: { en: "Watch out for active tracks.", fr: "Attention aux voies de train." },
        directions: { en: "Bus 360 from Yeonsinnae.", fr: "Bus 360 depuis Yeonsinnae." }
    },
    {
        id: 15, name: "Quinta da Francelha de Cima", group: "BTS", member: "All", country: "Portugal", city: "Prior Velho", category: "MV Location", year: "2026", episode: "NORMAL MV", episodeLink: "https://www.youtube.com/watch?v=GEk4jHwfFTA", ytId: "GEk4jHwfFTA",
        context: { en: "Historic Portuguese estate from NORMAL.", fr: "Domaine portugais du clip NORMAL." },
        address: "R. da Francelha de Cima", lat: 38.7844, lng: -9.1238, img: "https://img.youtube.com/vi/GEk4jHwfFTA/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/GEk4jHwfFTA/hqdefault.jpg"],
        fullDescription: { en: `<p>An 18th-century historic estate chosen for cinematic music videos.</p>`, fr: `<p>Domaine historique du 18e siècle choisi pour des clips.</p>` },
        tip: { en: "Close to Lisbon Airport.", fr: "Près de l'aéroport de Lisbonne." },
        directions: { en: "Taxi from Airport.", fr: "Taxi depuis l'aéroport." }
    },
    {
        id: 16, name: "Sunhyewon", group: "BTS", member: "All", country: "South Korea", city: "Seoul Area", category: "MV Location", year: "2026", episode: "NORMAL Live", episodeLink: "https://www.youtube.com/watch?v=Hb06Iem3FWg", ytId: "Hb06Iem3FWg",
        context: { en: "Intimate live performance estate.", fr: "Domaine de performance live intime." },
        address: "Sunhyewon Estate", lat: 37.5826, lng: 126.9856, img: "https://img.youtube.com/vi/Hb06Iem3FWg/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/Hb06Iem3FWg/hqdefault.jpg"],
        fullDescription: { en: `<p>Traditional Korean architectural estate blending living quarters with nature.</p>`, fr: `<p>Domaine architectural traditionnel coréen mêlant nature et habitat.</p>` },
        tip: { en: "Remove footwear on platforms.", fr: "Retirez vos chaussures." },
        directions: { en: "Commuter rail & local bus.", fr: "Train et bus local." }
    },
    {
        id: 17, name: "Museu de Marinha", group: "BTS", member: "All", country: "Portugal", city: "Lisbon", category: "MV Location", year: "2026", episode: "Swim MV", episodeLink: "https://www.youtube.com/watch?v=b4iVv91Z6lY", ytId: "b4iVv91Z6lY",
        context: { en: "Historic naval museum backdrop.", fr: "Musée naval historique." },
        address: "Praça do Império, Lisboa", lat: 38.6976, lng: -9.2082, img: "https://img.youtube.com/vi/b4iVv91Z6lY/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/b4iVv91Z6lY/hqdefault.jpg"],
        fullDescription: { en: `<p>Displays over 17,000 historical nautical items in Belém.</p>`, fr: `<p>Expose plus de 17 000 objets historiques à Belém.</p>` },
        tip: { en: "Visit Pastéis de Belém nearby.", fr: "Goûtez les pasteis de Belém." },
        directions: { en: "Tram 15E.", fr: "Tram 15E." }
    },
    {
        id: 18, name: "In the SOOP Estate", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2021", episode: "Season 2", episodeLink: "https://www.youtube.com/watch?v=6qB8Nb_WO_Y", ytId: "6qB8Nb_WO_Y",
        context: { en: "The luxurious private mountain estate custom-built by HYBE for BTS's healing reality show.", fr: "Le luxueux domaine privé à la montagne, construit sur mesure par HYBE pour l'émission de BTS." },
        address: "Chuncheon, Gangwon-do", lat: 37.8813, lng: 127.7298, img: "https://img.youtube.com/vi/6qB8Nb_WO_Y/hqdefault.jpg", 
        gallery: ["https://img.youtube.com/vi/6qB8Nb_WO_Y/maxresdefault.jpg", "https://img.youtube.com/vi/6qB8Nb_WO_Y/hqdefault.jpg", "https://img.youtube.com/vi/6qB8Nb_WO_Y/mqdefault.jpg", "https://img.youtube.com/vi/6qB8Nb_WO_Y/0.jpg", "https://img.youtube.com/vi/6qB8Nb_WO_Y/1.jpg"],
        fullDescription: { 
            en: `<p class="drop">Hidden deep within the pine-covered mountains above Chuncheon, roughly two hours east of Seoul, sits one of the most talked-about addresses in the entire BTS fandom — a estate that doesn't appear on any tourist map, yet has been watched by tens of millions of people around the world. This is the house from <b>In the SOOP: Friendcation</b> and <b>In the SOOP BTS ver. Season 2</b>, the healing reality show built entirely around the idea of doing nothing at all.</p><h4>A house built for a show, not the other way around</h4><p>Unlike most filming locations that fans track down after the fact, this estate was never a pre-existing building the production simply rented. HYBE worked with local architects and builders in Gangwon-do to construct the space specifically for the "In the SOOP" concept: a cluster of wood-and-glass pavilions connected by open decks, a lake close enough to fish from the porch, and just enough distance between each member's private cabin to give the group room to breathe between group scenes. Every camera angle you remember from the show — the hammock by the water, the outdoor kitchen, the long wooden table where the members shared meals — was designed with filming in mind from day one.</p><h4>Why fans can't just show up</h4><p>Because the estate remains a working set and a privately operated retreat, walking up to the gate isn't an option. Since 2022, the only legitimate way to set foot on the grounds is through the official "In the SOOP Stay" package, operated in partnership with Phoenix Pyeongchang. The package recreates elements of the show's atmosphere for guests — think slow mornings, mountain air, and the same silence that made the members fall in love with the place — without pretending to be BTS's actual set piece by piece.</p><div class="quote">"We didn't want a place to relax in — we wanted a place where doing nothing felt like enough." — a sentiment the members echoed across several episodes of Season 2, describing the estate as the first time in years they didn't have anywhere to be.</div><h4>What makes this stop worth the trip</h4><p>For ARMY, the appeal isn't really the architecture — it's the contrast. This is one of the few BTS-linked locations that was built <i>for</i> the members rather than simply visited by them, which makes it feel less like a photo-op and more like a piece of the group's actual story. Combined with the surrounding Gangwon-do scenery — misty ridgelines, quiet back roads, and Chuncheon's lakeside calm — it's an easy case for the most atmospheric entry on this map, even if you can only experience it through the curated stay rather than the real cabins.</p>`, 
            fr: `<p class="drop">Caché au cœur des montagnes de Chuncheon, à l'est de Séoul, se trouve l'un des lieux les plus célèbres du fandom de BTS — un domaine qui n'apparaît sur aucune carte touristique, mais qui a été visionné par des dizaines de millions de personnes. C'est la maison d'<b>In the SOOP</b>.</p><h4>Une maison construite pour l'émission</h4><p>Contrairement aux lieux de tournage classiques, HYBE a fait construire ce domaine sur mesure avec des architectes locaux pour les besoins de l'émission : des pavillons en bois et verre reliés par des pontons, un lac poissonneux et des cabanes individuelles.</p><div class="quote">"On ne voulait pas d'un simple lieu de repos, on voulait un endroit où ne rien faire suffisait." — BTS</div><h4>Pourquoi on ne peut pas y accéder librement</h4><p>Le site étant un lieu privé protégé, il faut réserver le forfait officiel "In the SOOP Stay" via Phoenix Pyeongchang pour y séjourner.</p>` 
        },
        tip: { en: "You cannot drive there yourself. You must book the official 'In the SOOP Stay' package through Phoenix Pyeongchang.", fr: "Vous ne pouvez pas vous y rendre par vous-même. Vous devez réserver le tour officiel 'In the SOOP Stay' via Phoenix Pyeongchang." },
        directions: { en: "Take the KTX to Pyeongchang Station, and hop on the official resort shuttle.", fr: "Prenez le KTX jusqu'à la gare de Pyeongchang, puis montez dans la navette officielle." }
    },
    {
        id: 19, name: "Happy Meadow Ranch", group: "BTS", member: "All", country: "South Korea", city: "Chuncheon", category: "Bon Voyage", year: "2020", episode: "Season 1 Area", episodeLink: "https://www.youtube.com/watch?v=F14vk9qPRM0", ytId: "F14vk9qPRM0",
        context: { en: "Ranch overlooking Chuncheon lake.", fr: "Ranch surplombant le lac de Chuncheon." },
        address: "330-48 Chunhwa-ro", lat: 37.9547, lng: 127.6975, img: "https://img.youtube.com/vi/F14vk9qPRM0/hqdefault.jpg", gallery: ["https://img.youtube.com/vi/F14vk9qPRM0/hqdefault.jpg"],
        fullDescription: { en: `<p>Offers breathtaking views of pristine Chuncheon Lake.</p>`, fr: `<p>Offre une vue imprenable sur le lac de Chuncheon.</p>` },
        tip: { en: "Try the Hanwoo burgers.", fr: "Goûtez les burgers au Hanwoo." },
        directions: { en: "Taxi from Chuncheon Station.", fr: "Taxi depuis la gare de Chuncheon." }
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

    // Gestion des onglets du panneau détail
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById('tab-' + btn.dataset.tab);
            if(target) target.classList.add('active');
        });
    });
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
    if(unlockedGroups.length === 0) availableLocs = celebLocations;

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
// 6. PANNEAU DE DÉTAILS (STYLE IN THE SOOP + INSPIS #1-#5)
// ==========================================
window.openDetailsPanel = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;
    
    const heroBg = document.getElementById('detail-hero-bg');
    if(heroBg) {
        const bgImg = loc.ytId ? `https://img.youtube.com/vi/${loc.ytId}/maxresdefault.jpg` : loc.img;
        heroBg.style.backgroundImage = `linear-gradient(180deg, rgba(20,16,30,.15) 0%, rgba(20,16,30,.75) 100%), url('${bgImg}')`;
    }
    
    const badge = document.getElementById('detail-badge');
    if(badge) badge.textContent = `${loc.group} · ${loc.category}`;

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

    // Vidéo YouTube
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

    // Galerie photos + Inspis à poster (#1, #2, etc.)
    const galleryContainer = document.getElementById('details-gallery');
    if (galleryContainer) {
        galleryContainer.innerHTML = ""; 
        if(loc.gallery && loc.gallery.length > 0) {
            loc.gallery.forEach((p, idx) => {
                const wideClass = idx === 0 ? "wide" : "";
                galleryContainer.innerHTML += `<img class="${wideClass}" src="${p}" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">`;
            });
        }
        
        // Ajout dynamique de la section "Inspis à poster" (#1 à #5)
        galleryContainer.innerHTML += `
            <div style="grid-column: 1 / span 2; margin-top: 15px;">
                <span class="sub-label">Inspis à poster</span>
                <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;">
                    <a href="https://share.google/9JeI2Qp6WkMOZmDoT" target="_blank" style="min-width:110px;border-radius:12px;overflow:hidden;position:relative;flex-shrink:0;height:130px;">
                        <img src="${loc.img}" style="width:100%;height:100%;object-fit:cover;display:block;">
                        <div style="position:absolute;top:6px;left:6px;background:rgba(20,16,30,.6);backdrop-filter:blur(4px);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;">#1</div>
                    </a>
                    <a href="https://share.google/5NH75MtKizvDYvZS3" target="_blank" style="min-width:110px;border-radius:12px;overflow:hidden;position:relative;flex-shrink:0;height:130px;">
                        <img src="https://picsum.photos/seed/inspi2/260/300" style="width:100%;height:100%;object-fit:cover;display:block;">
                        <div style="position:absolute;top:6px;left:6px;background:rgba(20,16,30,.6);backdrop-filter:blur(4px);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;">#2</div>
                    </a>
                    <a href="https://share.google/IwXXndlYkhvLx6uSD" target="_blank" style="min-width:110px;border-radius:12px;overflow:hidden;position:relative;flex-shrink:0;height:130px;">
                        <img src="https://picsum.photos/seed/inspi3/260/300" style="width:100%;height:100%;object-fit:cover;display:block;">
                        <div style="position:absolute;top:6px;left:6px;background:rgba(20,16,30,.6);backdrop-filter:blur(4px);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;">#3</div>
                    </a>
                    <a href="https://share.google/rBkRjzkNFSkDNal6s" target="_blank" style="min-width:110px;border-radius:12px;overflow:hidden;position:relative;flex-shrink:0;height:130px;">
                        <img src="https://picsum.photos/seed/inspi4/260/300" style="width:100%;height:100%;object-fit:cover;display:block;">
                        <div style="position:absolute;top:6px;left:6px;background:rgba(20,16,30,.6);backdrop-filter:blur(4px);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;">#4</div>
                    </a>
                    <a href="https://share.google/mlazCXtihGmPUeGy4" target="_blank" style="min-width:110px;border-radius:12px;overflow:hidden;position:relative;flex-shrink:0;height:130px;">
                        <img src="https://picsum.photos/seed/inspi5/260/300" style="width:100%;height:100%;object-fit:cover;display:block;">
                        <div style="position:absolute;top:6px;left:6px;background:rgba(20,16,30,.6);backdrop-filter:blur(4px);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;">#5</div>
                    </a>
                </div>
                <p style="font-size:10.5px;color:#94a3b8;">Faites glisser pour voir toutes les inspirations.</p>
            </div>
        `;
    }

    const tipText = getLocText(loc.tip);
    const tipSection = document.getElementById('details-tip-section');
    if(tipSection) {
        if (tipText) { document.getElementById('details-tip').textContent = tipText; tipSection.classList.remove('hidden'); } 
        else { tipSection.classList.add('hidden'); }
    }
    
    // Checkboxes
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
