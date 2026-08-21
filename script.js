// ==========================================
// 1. MAP INITIALIZATION & ICONS
// ==========================================
let map = null;
let markerGroup = null;

if (document.getElementById('map') && typeof L !== 'undefined') {
    map = L.map('map', { zoomControl: false }).setView([37.541, 127.025], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap contributors', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    markerGroup = L.layerGroup().addTo(map);
}

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

const filterData = {
    "BTS": { members: ["Namjoon", "Jin", "Suga", "JHope", "Jimin", "V", "Jungkook"], categories: ["Run BTS", "Bon Voyage", "Museums", "Restaurants", "Cafe", "MV Location", "Concerts", "Fashion", "Landmarks"] },
    "Blackpink": { members: ["Jisoo", "Jennie", "Rosé", "Lisa"], categories: ["Cafe", "Restaurants", "MV Location", "Pop-up Store", "Concerts", "Fashion"] }
};

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
        id: 17, name: "Museu de Marinha", group: "BTS", member: "All", country: "Portugal", city: "Lisbon", category: "MV Location", year: "2026", episode: "\"Swim\" MV", episodeLink: "https://www.youtube.com/watch?v=b4iVv91Z6lY",
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
// 5. TRANSLATION & UI UPDATE
// ==========================================
let currentLang = localStorage.getItem('lang') || 'en';
const translations = {
    en: {
        subtitle: "Following the footsteps of your favorite artists",
        btnGenerateIti: "Auto-Itinerary Generator",
        filterGroup: "Group", filterMember: "Member", filterArea: "Area", filterYear: "Year", filterCategories: "Categories",
        locationsCount: "Locations", statLocs: "Locations", statCountries: "Countries",
        mdlGroup: "Group:", mdlMember: "Members:", mdlCountry: "Country:", mdlCity: "City:", mdlAddress: "Address:", mdlDate: "Date:",
        mdlEpisode: "Episode:", mdlWatch: "Watch:", mdlLink: "Official Link", mdlStoryTitle: "The story of this place",
        mdlPhotosTitle: "Location Photos", mdlVideoTitle: "Watch the Episode", mdlTipTitle: "The 'Screen to Street' Tip:",
        mdlDirTitle: "How to get there", mdlGoogleMap: "Open in Google Maps",
        itiTitle: "Auto-Itinerary Generator", itiDesc: "Select a group, a country, and how many days you stay. We will generate an optimized route for you!",
        itiGroup: "Group", itiCountry: "Country", itiDays: "Number of Days", itiCreateBtn: "Create My Guide",
        allGroups: "All Groups", allMembers: "All Members", allAreas: "All Areas", allCats: "All Categories",
        moreDetails: "More details", day: "Day", noLocationsFound: "Not enough locations found for this selection.", openRouteMap: "Open Route in Google Maps", searchPlaceholder: "Search a location, city, context...",
        cookieText: "We use cookies to enhance your experience.", cookiePolicy: "Cookie Policy", cookieManage: "Manage", cookieReject: "Reject", cookieAccept: "Accept"
    },
    fr: {
        subtitle: "Sur les traces de vos artistes préférés",
        btnGenerateIti: "Générateur d'Itinéraire",
        filterGroup: "Groupe", filterMember: "Membre", filterArea: "Région/Pays", filterYear: "Année", filterCategories: "Catégories",
        locationsCount: "Lieux", statLocs: "Lieux", statCountries: "Pays",
        mdlGroup: "Groupe :", mdlMember: "Membres :", mdlCountry: "Pays :", mdlCity: "Ville :", mdlAddress: "Adresse :", mdlDate: "Date :",
        mdlEpisode: "Épisode :", mdlWatch: "Voir :", mdlLink: "Lien Officiel", mdlStoryTitle: "L'histoire de ce lieu",
        mdlPhotosTitle: "Photos du lieu", mdlVideoTitle: "Regarder l'épisode", mdlTipTitle: "Le conseil 'Screen to Street' :",
        mdlDirTitle: "Comment s'y rendre", mdlGoogleMap: "Ouvrir dans Google Maps",
        itiTitle: "Générateur d'Itinéraire", itiDesc: "Choisissez un groupe, un pays, et le nombre de jours. Nous vous créons un parcours optimisé !",
        itiGroup: "Groupe", itiCountry: "Pays", itiDays: "Nombre de Jours", itiCreateBtn: "Créer Mon Guide",
        allGroups: "Tous les Groupes", allMembers: "Tous les Membres", allAreas: "Toutes les Régions", allCats: "Toutes les Catégories",
        moreDetails: "Plus de détails", day: "Jour", noLocationsFound: "Pas assez de lieux trouvés pour cette sélection.", openRouteMap: "Ouvrir l'itinéraire Google Maps", searchPlaceholder: "Rechercher un lieu, une ville...",
        cookieText: "Nous utilisons des cookies pour améliorer votre expérience.", cookiePolicy: "Politique de cookies", cookieManage: "Gérer", cookieReject: "Refuser", cookieAccept: "Accepter"
    }
};

function t(key) { return translations[currentLang][key] || key; }
function getLocText(field) {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[currentLang] || field.en || "";
}

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.placeholder = translations[currentLang].searchPlaceholder;
    
    const groupSelect = document.getElementById('group-select');
    if(groupSelect && groupSelect.options.length > 0) groupSelect.options[0].text = t('allGroups');
    
    initializeFilters();
    renderLocations();
}

// ==========================================
// 6. MAP LOGIC & FILTERING
// ==========================================
const unlockedGroupsStr = localStorage.getItem('unlockedGroups');
if (unlockedGroupsStr) {
    try {
        const unlockedGroups = JSON.parse(unlockedGroupsStr);
        if (unlockedGroups && unlockedGroups.length > 0) {
            celebLocations = celebLocations.filter(loc => unlockedGroups.includes(loc.group));
        }
    } catch(e) { console.error("Error parsing unlocked groups", e); }
}

const groupSelect = document.getElementById('group-select');
const memberSelect = document.getElementById('member-select');
const yearSelect = document.getElementById('year-select');
const countrySelect = document.getElementById('country-select');
const searchInput = document.getElementById('search-input');
const categoryButtonsContainer = document.getElementById('category-buttons');
let activeCategory = "All"; 

function populateGroupDropdown() {
    if(!groupSelect) return;
    const availableGroups = [...new Set(celebLocations.map(l => l.group))].sort();
    groupSelect.innerHTML = `<option value="All">${t('allGroups')}</option>`;
    availableGroups.forEach(g => {
        groupSelect.innerHTML += `<option value="${g}">${g}</option>`;
    });
}
populateGroupDropdown();

function initializeFilters() {
    if(!groupSelect) return;
    const selectedGroup = groupSelect.value;
    if(groupSelect.options.length > 0) groupSelect.options[0].text = t('allGroups');

    if(memberSelect) memberSelect.innerHTML = `<option value="All">${t('allMembers')}</option>`;
    if(countrySelect) countrySelect.innerHTML = `<option value="All">${t('allAreas')}</option>`;
    if(categoryButtonsContainer) categoryButtonsContainer.innerHTML = `<button class="filter-btn active" data-cat="All">${t('allCats')}</button>`;
    activeCategory = "All";
    
    const filteredByGroup = selectedGroup === "All" ? celebLocations : celebLocations.filter(l => l.group === selectedGroup);
    const uniqueCountries = [...new Set(filteredByGroup.map(loc => loc.country))].sort();
    uniqueCountries.forEach(country => {
        if(countrySelect) countrySelect.innerHTML += `<option value="${country}">${country}</option>`;
    });

    if (selectedGroup !== "All" && filterData[selectedGroup]) {
        if(memberSelect) filterData[selectedGroup].members.forEach(member => { memberSelect.innerHTML += `<option value="${member}">${member}</option>`; });
        if(categoryButtonsContainer) filterData[selectedGroup].categories.forEach(cat => { categoryButtonsContainer.innerHTML += `<button class="filter-btn" data-cat="${cat}">${cat}</button>`; });
    } else {
        const allCats = [...new Set(filteredByGroup.map(l => l.category))].sort();
        if(categoryButtonsContainer) allCats.forEach(cat => { categoryButtonsContainer.innerHTML += `<button class="filter-btn" data-cat="${cat}">${cat}</button>`; });
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

if(groupSelect) groupSelect.addEventListener('change', () => { initializeFilters(); renderLocations(); });
if(memberSelect) memberSelect.addEventListener('change', renderLocations);
if(yearSelect) yearSelect.addEventListener('change', renderLocations);
if(countrySelect) countrySelect.addEventListener('change', renderLocations);
if(searchInput) searchInput.addEventListener('input', renderLocations);

function renderLocations() {
    if(!groupSelect || !map) return; 
    markerGroup.clearLayers();
    const locationListElement = document.getElementById('location-list');
    if(!locationListElement) return;
    locationListElement.innerHTML = '';

    const fGroup = groupSelect.value;
    const fMember = memberSelect ? memberSelect.value : "All";
    const fYear = yearSelect ? yearSelect.value : "All";
    const fCountry = countrySelect ? countrySelect.value : "All";
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

    const filteredLocations = celebLocations.filter(loc => {
        const matchGroup = (fGroup === "All" || loc.group === fGroup);
        const matchMember = (fMember === "All" || loc.member === fMember || loc.member === "All");
        const matchCategory = (activeCategory === "All" || loc.category === activeCategory);
        const matchYear = (fYear === "All" || loc.year === fYear);
        const matchCountry = (fCountry === "All" || loc.country === fCountry);
        const matchSearch = loc.name.toLowerCase().includes(searchTerm) || loc.city.toLowerCase().includes(searchTerm) || getLocText(loc.context).toLowerCase().includes(searchTerm);
        return matchGroup && matchMember && matchCategory && matchYear && matchCountry && matchSearch;
    });

    const countSidebar = document.getElementById('location-count-sidebar');
    if (countSidebar) countSidebar.textContent = filteredLocations.length;
    
    const statLocations = document.getElementById('stat-locations');
    if (statLocations) statLocations.textContent = filteredLocations.length;
    
    const statCountries = document.getElementById('stat-countries');
    if (statCountries) statCountries.textContent = new Set(filteredLocations.map(l => l.country)).size;

    const mapMarkers = [];
    let visitedData = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
    let wishlistData = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');

    filteredLocations.forEach(loc => {
        const catIconSvg = iconsSVG[loc.category] || iconsSVG["Default"];
        
        const isVisited = visitedData.some(v => v.id === loc.id || v === loc.id);
        const isWishlist = wishlistData.some(w => w.id === loc.id || w === loc.id);
        
        let iconColorStyle = '';
        let extraClass = '';
        if(isVisited) {
            iconColorStyle = `style="border-color: #10b981; color: #10b981;"`;
            extraClass = 'visited-marker-div';
        } else if (isWishlist) {
            iconColorStyle = `style="border-color: #f59e0b; color: #f59e0b;"`;
            extraClass = 'wishlist-marker-div';
        }
        
        const customIcon = L.divIcon({ 
            className: 'custom-category-marker', 
            html: `<div class="${extraClass}" ${iconColorStyle}>${catIconSvg}</div>`, 
            iconSize: [32, 32], 
            iconAnchor: [16, 16], 
            popupAnchor: [0, -16] 
        });
        
        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markerGroup);
        mapMarkers.push(marker);

        let metaHtml = `<strong>Year:</strong> ${loc.year}`;
        if(loc.episode) { metaHtml += ` <br><strong>Ep:</strong> ${loc.episode}`; }
        const popupContent = `
            <div class="popup-title" onclick="window.openModal(${loc.id}); event.stopPropagation();">${loc.name}</div>
            <span class="popup-tag">${catIconSvg} ${loc.category}</span>
            <img src="${loc.img}" alt="${loc.name}" class="popup-img" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <div class="popup-context">"${getLocText(loc.context)}"</div>
            <div class="popup-meta">${metaHtml}</div>
            <button type="button" onclick="window.openModal(${loc.id}); event.stopPropagation();" style="width:100%; padding:8px; background:var(--primary-magenta); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">${t('moreDetails')}</button>
        `;
        marker.bindPopup(popupContent);

        const card = document.createElement('div');
        card.className = 'location-card';
        card.innerHTML = `<div class="card-icon-box">${catIconSvg}</div><div class="card-content"><div class="card-meta-top">${loc.category} • ${loc.city}</div><div class="card-title">${loc.name}</div><div class="card-address">${mapPinSvg} ${loc.city}</div></div>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('.location-card').forEach(c => c.style.borderColor = '#cbd5e1');
            card.style.borderColor = '#D94680';
            map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
            setTimeout(() => marker.openPopup(), 1500);
        });
        locationListElement.appendChild(card);
    });

    if (mapMarkers.length > 0) map.fitBounds(new L.featureGroup(mapMarkers).getBounds(), { padding: [50, 50], maxZoom: 16 });
}

if(document.getElementById('search-input')) {
    updateUI();
}

// ==========================================
// 7. MODALS (DETAILS & CART)
// ==========================================
window.openModal = function(id) {
    const loc = celebLocations.find(l => l.id === id);
    if(!loc) return;
    document.getElementById('modal-title').textContent = loc.name;
    document.getElementById('modal-desc').innerHTML = getLocText(loc.fullDescription); 
    document.getElementById('modal-directions').textContent = getLocText(loc.directions);
    document.getElementById('modal-group').textContent = loc.group;
    document.getElementById('modal-member').textContent = loc.member === "All" ? t('allMembers') : loc.member;
    document.getElementById('modal-country').textContent = loc.country;
    document.getElementById('modal-city').textContent = loc.city;
    document.getElementById('modal-full-address').textContent = loc.address;
    document.getElementById('modal-date').textContent = loc.year;

    if (loc.episode) { document.getElementById('modal-episode').textContent = loc.episode; document.getElementById('modal-episode-container').style.display = 'block'; } else { document.getElementById('modal-episode-container').style.display = 'none'; }
    if (loc.episodeLink) { document.getElementById('modal-episode-link').href = loc.episodeLink; document.getElementById('modal-link-container').style.display = 'block'; } else { document.getElementById('modal-link-container').style.display = 'none'; }
    document.getElementById('modal-address').textContent = `${loc.address}, ${loc.city}`;
    document.getElementById('modal-map-link').href = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

    const tipText = getLocText(loc.tip);
    const tipSection = document.getElementById('modal-tip-section');
    if (tipText) { document.getElementById('modal-tip').textContent = tipText; if(tipSection) tipSection.classList.remove('hidden'); } else { if(tipSection) tipSection.classList.add('hidden'); }

    const galleryContainer = document.getElementById('modal-gallery');
    const gallerySection = document.getElementById('modal-gallery-section');
    if (galleryContainer && gallerySection) {
        galleryContainer.innerHTML = ""; 
        if(loc.gallery && loc.gallery.length > 0) {
            galleryContainer.style.display = 'flex';
            loc.gallery.forEach(imagePath => {
                const img = document.createElement('img'); img.src = imagePath; img.onerror = function() { this.src = 'https://via.placeholder.com/300x250?text=Pending+Image'; };
                galleryContainer.appendChild(img);
            });
            gallerySection.classList.remove('hidden');
        } else { gallerySection.classList.add('hidden'); }
    }

    const videoContainer = document.getElementById('modal-video-container');
    const videoSection = document.getElementById('modal-video-section');
    if (videoContainer && videoSection) {
        videoContainer.innerHTML = ""; 
        if (loc.videoEmbeds && loc.videoEmbeds.length > 0) {
            loc.videoEmbeds.forEach(vidSrc => { videoContainer.innerHTML += `<div class="video-wrapper"><iframe src="${vidSrc}" frameborder="0" allowfullscreen></iframe></div>`; });
            videoSection.classList.remove('hidden');
        } else { videoSection.classList.add('hidden'); }
    }
    
    // GESTION CHECKBOX "VISITÉ"
    const visitedCheckbox = document.getElementById('modal-visited');
    if(visitedCheckbox) {
        let visitedLocs = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
        visitedCheckbox.checked = visitedLocs.some(v => v.id === loc.id || v === loc.id);
        
        visitedCheckbox.onchange = function() {
            let vList = JSON.parse(localStorage.getItem('visitedLocs') || '[]');
            if(this.checked) {
                if(!vList.some(v => v.id === loc.id || v === loc.id)) {
                    vList.push({id: loc.id, date: new Date().toLocaleDateString()});
                }
            } else {
                vList = vList.filter(v => v.id !== loc.id && v !== loc.id);
            }
            localStorage.setItem('visitedLocs', JSON.stringify(vList));
            renderLocations(); 
        };
    }

    // GESTION CHECKBOX "WISHLIST"
    const wishlistCheckbox = document.getElementById('modal-wishlist');
    if (wishlistCheckbox) {
        let wishlistLocs = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
        wishlistCheckbox.checked = wishlistLocs.some(w => w.id === loc.id || w === loc.id);
        
        wishlistCheckbox.onchange = function() {
            let wList = JSON.parse(localStorage.getItem('wishlistLocs') || '[]');
            if(this.checked) {
                if(!wList.some(w => w.id === loc.id || w === loc.id)) {
                    wList.push({id: loc.id, date: new Date().toLocaleDateString()});
                }
            } else {
                wList = wList.filter(w => w.id !== loc.id && w !== loc.id);
            }
            localStorage.setItem('wishlistLocs', JSON.stringify(wList));
            renderLocations();
        };
    }

    const detailsModal = document.getElementById('details-modal');
    if(detailsModal) detailsModal.classList.remove('hidden');
};

window.closeModal = function(id) { 
    if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); 
    if (id === 'details-modal') {
        const vidContainer = document.getElementById('modal-video-container');
        if(vidContainer) vidContainer.innerHTML = ""; 
    }
};

window.onclick = function(event) { 
    if (event.target === document.getElementById('details-modal')) window.closeModal('details-modal'); 
    if (event.target === document.getElementById('itinerary-modal')) window.closeModal('itinerary-modal'); 
    if (event.target === document.getElementById('cart-modal')) window.closeModal('cart-modal'); 
};

// ==========================================
// 8. CART & ITINERARY LOGIC
// ==========================================
window.openCartModal = function() {
    const cartModal = document.getElementById('cart-modal');
    if(!cartModal) return;
    cartModal.classList.remove('hidden');
    const unlockedGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
    
    document.querySelectorAll('.cart-checkbox').forEach(cb => {
        cb.checked = false; 
        const span = cb.nextElementSibling;
        if(unlockedGroups.includes(cb.value)) {
            cb.disabled = true;
            span.style.background = "#f1f5f9";
            span.style.color = "#94a3b8";
            span.textContent = `${cb.value} (Purchased)`;
        } else {
            cb.disabled = false;
            span.style.background = "white";
            span.style.color = "#64748b";
            span.textContent = cb.value;
        }
    });
    updateCartPrice();
}

function updateCartPrice() {
    const cartPriceDisplay = document.getElementById('cart-price');
    const cartPayBtn = document.getElementById('cart-pay-btn');
    if(!cartPriceDisplay || !cartPayBtn) return;

    const selectedCount = document.querySelectorAll('.cart-checkbox:not(:disabled):checked').length;
    const totalPrice = selectedCount * 14.99;
    cartPriceDisplay.textContent = `${totalPrice.toFixed(2)} €`;
    
    if (selectedCount > 0) {
        cartPayBtn.disabled = false;
        cartPayBtn.textContent = `Pay ${totalPrice.toFixed(2)} €`;
    } else {
        cartPayBtn.disabled = true;
        cartPayBtn.textContent = `Select a group`;
    }
}

document.querySelectorAll('.cart-checkbox').forEach(cb => {
    cb.addEventListener('change', function() {
        if(this.checked) {
            this.nextElementSibling.style.background = "#FCE7F0";
            this.nextElementSibling.style.borderColor = "#D94680";
            this.nextElementSibling.style.color = "#D94680";
        } else {
            this.nextElementSibling.style.background = "white";
            this.nextElementSibling.style.borderColor = "#cbd5e1";
            this.nextElementSibling.style.color = "#64748b";
        }
        updateCartPrice();
    });
});

const cartForm = document.getElementById('cart-form');
if (cartForm) {
    cartForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const checkedBoxes = document.querySelectorAll('.cart-checkbox:not(:disabled):checked');
        if(checkedBoxes.length === 0) return;

        let existingGroups = JSON.parse(localStorage.getItem('unlockedGroups') || '[]');
        checkedBoxes.forEach(cb => {
            if(!existingGroups.includes(cb.value)) existingGroups.push(cb.value);
        });
        localStorage.setItem('unlockedGroups', JSON.stringify(existingGroups));
        
        document.getElementById('cart-pay-btn').textContent = "Processing...";
        setTimeout(() => { window.location.reload(); }, 1500);
    });
}

// ITINERARY
let itiLeafletMap = null;
let itiLayerGroup = null;

const btnOpenIti = document.getElementById('open-itinerary-btn');
if(btnOpenIti) {
    btnOpenIti.addEventListener('click', () => {
        const itiGroup = document.getElementById('iti-group');
        const itiCountry = document.getElementById('iti-country');
        
        const availableGroups = [...new Set(celebLocations.map(l => l.group))].sort();
        itiGroup.innerHTML = ''; availableGroups.forEach(g => { itiGroup.innerHTML += `<option value="${g}">${g}</option>`; });
        itiCountry.innerHTML = ''; [...new Set(celebLocations.map(l => l.country))].sort().forEach(c => { itiCountry.innerHTML += `<option value="${c}">${c}</option>`; });
        
        document.getElementById('iti-result').classList.add('hidden');
        document.getElementById('iti-form').classList.remove('hidden');
        document.getElementById('itinerary-modal').classList.remove('hidden');
    });
}

function optimizeRoute(locations) {
    if(locations.length <= 1) return locations;
    let unvisited = [...locations];
    let route = [unvisited.shift()]; 
    while(unvisited.length > 0) {
        let lastLoc = route[route.length - 1];
        let nearestIdx = 0;
        let minDist = Infinity;
        for(let i=0; i<unvisited.length; i++) {
            let d = Math.hypot(lastLoc.lat - unvisited[i].lat, lastLoc.lng - unvisited[i].lng);
            if(d < minDist) { minDist = d; nearestIdx = i; }
        }
        route.push(unvisited.splice(nearestIdx, 1)[0]);
    }
    return route;
}

window.generateItinerary = function() {
    const group = document.getElementById('iti-group').value;
    const country = document.getElementById('iti-country').value;
    const days = parseInt(document.getElementById('iti-days').value);

    let validLocs = celebLocations.filter(l => l.group === group && l.country === country);
    if(validLocs.length === 0) { alert(t('noLocationsFound')); return; }

    validLocs = optimizeRoute(validLocs);

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
            const origin = `${dayLocs[0].lat},${dayLocs[0].lng}`;
            const destination = `${dayLocs[dayLocs.length - 1].lat},${dayLocs[dayLocs.length - 1].lng}`;
            const waypoints = dayLocs.slice(1, -1).map(l => `${l.lat},${l.lng}`).join('|');
            mapLink = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
            dayLocs.forEach(l => coordsForMap.push([l.lat, l.lng]));
        }

        let dayHtml = `<div class="iti-day-card"><div class="iti-day-title">${t('day')} ${i + 1}</div>`;
        dayLocs.forEach((l, index) => { dayHtml += `<div class="iti-loc"><strong>${index+1}. ${l.name}</strong> <span style="color:#9CA3AF; font-size:0.8rem;">(${l.category})</span></div>`; });
        
        // BOUTON GOOGLE MAPS ÉLÉGANT ET ALIGNÉ À GAUCHE
        dayHtml += `<div style="text-align: left;"><a href="${mapLink}" target="_blank" class="subtle-btn" style="display:inline-block; padding:8px 12px; margin-top:10px; font-size:0.85rem; color:#34414C; border:1px solid #cbd5e1; border-radius:6px; text-decoration:none; font-weight:600; background:white; transition:all 0.2s;">🗺️ ${t('openRouteMap')}</a></div></div>`;
        resultDiv.innerHTML += dayHtml;
    }

    document.getElementById('iti-form').classList.add('hidden');
    document.getElementById('iti-result').classList.remove('hidden');

    if(!itiLeafletMap) {
        itiLeafletMap = L.map('iti-map-container', { zoomControl: false }).setView([0,0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(itiLeafletMap);
        itiLayerGroup = L.featureGroup().addTo(itiLeafletMap);
    } else {
        itiLayerGroup.clearLayers();
    }

    coordsForMap.forEach((c, idx) => {
        L.circleMarker(c, { color: '#D94680', radius: 6, fillOpacity: 1 }).addTo(itiLayerGroup)
         .bindTooltip((idx+1).toString(), {permanent: true, direction: 'center', className: 'iti-map-label'});
    });
    L.polyline(coordsForMap, { color: '#D94680', weight: 3, dashArray: '5, 5' }).addTo(itiLayerGroup);

    setTimeout(() => {
        itiLeafletMap.invalidateSize();
        itiLeafletMap.fitBounds(itiLayerGroup.getBounds(), { padding: [20, 20] });
    }, 300);
};

window.exportItineraryPDF = function() {
    const element = document.getElementById('iti-result');
    const exportBtn = document.getElementById('export-pdf-btn');
    exportBtn.style.display = 'none';

    const opt = {
      margin:       10,
      filename:     'ScreenToStreet_Guide.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        exportBtn.style.display = 'block';
    });
};

// ==========================================
// 10. COOKIES LOGIC
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
