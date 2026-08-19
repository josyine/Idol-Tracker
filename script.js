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
        episode: "Episodes 118 & 119 (Photo Story)",
        episodeLink: "https://weverse.io/bts/media/3-104694116",
        context: "The boys played an energetic game searching for hidden sticky notes in this massive cafe.",
        address: "27 Apgujeong-ro 42-gil, Gangnam-gu",
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
        fullDescription: "Located in the trendy Apgujeong neighborhood, Cafe Camptong was a massive, multi-level establishment. Known for its industrial architecture, the venue offered coworking spaces, large lounge areas, and themed meeting rooms. Its maze-like layout and numerous hidden corners made it not only a huge cafe but also an ideal filming location for television shows.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (Run BTS! - Episodes 118 & 119)</h3>The group took over the entire building for a giant photographic scavenger hunt. The goal was to find sticky notes hidden across the different floors and recreate the exact scenes requested in the photos to earn points. The episodes feature the members throughout the cafe:<ul style='margin-top:10px; margin-left:20px; line-height:1.6;'><li><strong>Racing through the floors:</strong> The members frantically running up and down the metal stairs and industrial hallways in search of the hidden notes.</li><li><strong>Impromptu photo spots:</strong> The various spaces in the cafe (sofas, glass rooms, mirrors) used as backdrops for hilarious photoshoots and secret alliances to unmask the game's spy.</li></ul>",
        tip: "Although the original Cafe Camptong has permanently closed, the street and the building's facade remain a historical landmark for fans. The Apgujeong Rodeo area is a must-visit anyway: take advantage of being in this neighborhood to explore the surrounding alleys, which are full of other iconic spots from the group's early days.",
        directions: "Take the Suin-Bundang Line to Apgujeong Rodeo Station (Exit 5). Walk for about 10 minutes towards the Apgujeong cafe street area."
    },
    {
        id: 2,
        name: "Ossu Seiromushi",
        group: "BTS",
        member: "Jin", 
        country: "South Korea",
        city: "Seoul",
        category: "Restaurants",
        year: "2018",
        context: "A premium Japanese steamed cuisine restaurant famously co-owned by Jin and his brother.",
        address: "30 Baekjegobun-ro 45-gil, Songpa-gu",
        lat: 37.5105,
        lng: 127.1085,
        img: "images/Otsu1.jpg", 
        videoEmbeds: [],
        gallery: ["images/Otsu1.jpg"],
        fullDescription: "Opened in 2018, Ossu Seiromushi is a popular dining establishment near Seokchon Lake specializing in traditional Japanese cuisine. The restaurant’s signature offering is seiromushi, a cooking method where premium, thinly sliced beef, pork, and fresh vegetables are steamed in cypress wood boxes right at your table. This technique preserves the natural flavors and nutrients of the ingredients. With its elegant, minimalist wooden interior and private dining booths, the restaurant offers a premium, tranquil culinary experience in a bustling neighborhood.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (The Jin Connection)</h3>While not a filming location for a specific show, this restaurant is a major landmark for the ARMY community. It is famously co-owned by Jin and his older brother, Kim Seok-jung, who manages the daily operations. Over the years, several BTS members have visited to enjoy a meal and support the business. Visiting this restaurant is less about recreating a TV scene and more about experiencing a high-quality, authentic meal at a venue closely tied to the BTS family.",
        tip: "Because this restaurant is highly regarded by locals and famous among international fans, the wait times can be quite long, especially during dinner hours or around BTS anniversaries. It is highly recommended to arrive early to put your name on the waiting list. From a legal and respectful standpoint, remember that this is a working business: taking photos of your food and the lovely interior is perfectly fine, but avoid filming the staff or looking for the owners to respect their privacy!",
        directions: "Take Line 8 or Line 9 to Songpanaru Station (Exit 1) or Seokchon Station. The restaurant is just a short walk away, tucked in the streets near Seokchon Lake, making it a perfect spot for dinner after a scenic walk."
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
        city: "Wanju (near Jeonju)",
        category: "Museums",
        year: "2019",
        episode: "2019 BTS Summer Package in Korea",
        episodeLink: "https://www.youtube.com/watch?v=h1jUtpEzxxA",
        context: "Filming location for the beautiful traditional concepts of the 2019 Summer Package.",
        address: "516-7 Songgwangsuman-ro, Soyang-myeon, Wanju-gun, Jeollabuk-do",
        lat: 35.8455,
        lng: 127.1895,
        img: "https://img.youtube.com/vi/h1jUtpEzxxA/hqdefault.jpg",
        videoEmbeds: ["https://www.youtube.com/embed/h1jUtpEzxxA"],
        gallery: ["images/Ahwon1.jpg"],
        fullDescription: "Located in the serene Oseong Hanok Village, Ahwon Museum & Hotel is a stunning architectural masterpiece that blends the past and the present. The ground level features a modern, minimalist concrete art gallery, while the upper level showcases a 250-year-old traditional Korean house (Hanok) that was carefully relocated from Jinju. The estate offers breathtaking views of the surrounding Jongnamsan Mountain, making it a peaceful retreat for art lovers and travelers seeking tranquility.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (2019 BTS Summer Package)</h3>BTS chose this breathtaking location to film their 2019 Summer Package, which was notably their first Summer Package shot entirely in South Korea. The members highlighted the beauty of traditional Korean architecture and nature across the property:<ul style='margin-top:10px; margin-left:20px; line-height:1.6;'><li><strong>The Hanok Porch:</strong> The members relaxed and took stunning individual and group photos on the wooden porches (daecheongmaru) of the traditional houses, beautifully framed by the majestic mountains in the background.</li><li><strong>The Modern Gallery:</strong> The architectural contrast of the estate allowed the group to capture both historical aesthetics and modern, sleek concepts during their extensive photoshoot.</li></ul>",
        tip: "You do not have to book a very expensive overnight stay to experience this beautiful place! Ahwon operates as a gallery and cafe during the day. You can pay a standard entrance fee to explore the modern museum, walk up to the traditional Hanok area, and enjoy a cup of coffee while taking in the exact same mountain views as BTS. Please note that it often operates as a \"No Kids Zone\" to maintain its quiet, meditative atmosphere.",
        directions: "Because it is located in a mountainous area, the easiest way to reach Ahwon is by taking a taxi from Jeonju Station or the Jeonju Hanok Village, which takes about 30 to 40 minutes."
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
        year: "2026",
        episode: "Dior Men's Fashion Week Show",
        episodeLink: "https://www.youtube.com/watch?v=1TdxCtgX53w&t=88s",
        context: "Jimin made a highly anticipated appearance at the Dior Men's Fashion Week presentation here.",
        address: "63 Rue de Monceau, 75008 Paris",
        lat: 48.8795,
        lng: 2.3117,
        img: "https://img.youtube.com/vi/1TdxCtgX53w/hqdefault.jpg",
        videoEmbeds: ["https://www.youtube.com/embed/1TdxCtgX53w"],
        gallery: ["images/Nissim1.jpg"],
        fullDescription: "Located on the edge of the beautiful Parc Monceau in the 8th arrondissement, the Musée Nissim de Camondo is a spectacular private mansion turned museum. Built in the early 20th century by Count Moïse de Camondo, it was designed to house one of the world's finest private collections of French 18th-century furniture and decorative arts. The mansion has been perfectly preserved, offering visitors a rare and intimate glimpse into the aristocratic Parisian lifestyle of the Belle Époque.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (Dior Men's Show 2026)</h3>As a Global Ambassador for Dior, Jimin made a highly anticipated appearance at the brand's 2026 Men's Fashion Week presentation, which selected this historic Parisian venue as its breathtaking backdrop. The event perfectly blended classic French heritage with modern haute couture. Jimin's arrival turned the elegant Rue de Monceau into a major pop culture event, with global media and fans gathering to catch a glimpse of him stepping out in front of the museum's majestic courtyard.",
        tip: "The Musée Nissim de Camondo is fully open to the public and is a fantastic, quieter alternative to crowded palaces like Versailles. You can easily walk through the same courtyard where the Fashion Week arrivals took place and admire the stunning architecture. After your visit, be sure to take a relaxing stroll through the adjacent Parc Monceau, one of the most romantic and elegant public parks in Paris.",
        directions: "Take Metro Line 2 to the Monceau station or Line 3 to the Villiers station. The museum is just a short 5-minute walk from the metro exits, right next to the park."
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
    },
    {
        id: 11,
        name: "Cheonggu Building",
        group: "BTS",
        member: "All",
        country: "South Korea",
        city: "Seoul",
        category: "Landmarks",
        year: "2013 - 2017",
        episode: "Early Debut Era & Training Days",
        episodeLink: "https://www.youtube.com/watch?v=vJwHIpEogEY",
        context: "The legendary former Big Hit Entertainment building and basement practice room.",
        address: "16 Hakdong-ro 30-gil, Gangnam-gu",
        lat: 37.5144,
        lng: 127.0315,
        img: "https://img.youtube.com/vi/vJwHIpEogEY/hqdefault.jpg",
        videoEmbeds: [
            "https://www.youtube.com/embed/vJwHIpEogEY" 
        ],
        gallery: [
            "images/Cheonggu1.jpg", 
            "images/Cheonggu2.jpg"
        ],
        fullDescription: "Tucked away in the quiet residential and commercial streets of Nonhyeon-dong, the Cheonggu Building is an ordinary-looking brick and concrete structure that holds extraordinary history. While it currently houses various everyday businesses and private offices, its exterior walls tell a completely different story. The bricks and surrounding walls are famously covered in thousands of heartfelt messages, signatures, and drawings left by fans from all over the globe, transforming this humble facade into a living monument of pop culture history.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (The Beginning)</h3>Long before the massive HYBE headquarters in Yongsan existed, this modest building was the cradle of BTS's career. Big Hit Entertainment operated from a small office on the second floor, while the basement housed the group's legendary, cramped practice room. This is the exact place where the seven members spent countless sleepless nights perfecting their earliest choreographies, writing their first albums, and filming their very first vlog entries. It represents the grit, sweat, and humble beginnings of their journey to global stardom.",
        tip: "While this is a must-visit pilgrimage site for any fan, it is important to remember that the Cheonggu Building is now a private workspace for other companies. It is perfectly fine to admire the fan graffiti and take photos of the exterior walls, but please respect the current tenants by not entering the building itself. After visiting, take a short 5-minute walk to nearby Hakdong Park—a quiet public park where the members frequently went to sit on the swings, rest, and talk about their dreams during their trainee days.",
        directions: "Take Subway Line 7 to Hakdong Station and go out of Exit 7. The building is about a 10-minute walk through the quiet, hilly streets of the Nonhyeon-dong neighborhood."
    },
    {
        id: 12,
        name: "The First BTS Dorm",
        group: "BTS",
        member: "All",
        country: "South Korea",
        city: "Seoul",
        category: "Landmarks", 
        year: "2013 - 2015",
        episode: "[EPISODE] 1st BTS Birthday Party",
        episodeLink: "https://www.youtube.com/watch?v=RhJqNFQCU_Q", // Nouveau lien
        context: "The original cramped dorm where all 7 members lived together and celebrated their 1st anniversary.",
        address: "29 Nonhyeon-ro 119-gil, Gangnam-gu",
        lat: 37.5133,
        lng: 127.0321,
        img: "https://img.youtube.com/vi/RhJqNFQCU_Q/hqdefault.jpg", // Nouvelle miniature
        videoEmbeds: [
            "https://www.youtube.com/embed/RhJqNFQCU_Q" // Nouvelle vidéo intégrée
        ],
        gallery: [
            "images/Dorm1.jpg", 
            "images/Dorm2.jpg"
        ],
        fullDescription: "Located in the quiet streets of Nonhyeon-dong, this unassuming residential building houses the very first apartment shared by BTS during their pre-debut and rookie days. All seven members famously lived in this cramped space, sharing a single bedroom packed with bunk beds, one tiny bathroom, and a small kitchen. This dorm is a powerful symbol for the ARMY community, representing the group's humble beginnings, their early struggles, and the incredibly tight family bond they formed while dreaming of making it big.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (1st BTS Birthday Party)</h3>In the provided YouTube video, the members celebrate their very first anniversary as a group in this exact dorm. The chaotic but heartwarming vlog captures the reality of their domestic life. You can see RM and the others cleaning up their small living room, Suga and Jimin hilariously struggling to decorate a homemade cake, and Jin taking on his role as the \"chef\" of the group by cooking a massive feast—including seaweed soup and spicy webfoot octopus with pork belly—in their tiny kitchen.",
        tip: "Crucial Legal & Respect Tip: Please remember that this building is currently a private residence where ordinary citizens live today. You can respectfully walk by to see the neighborhood where BTS grew up, but do not enter the building, ring the doorbell, or disturb the current tenants. To complete your historical tour, walk just a few streets down to Yoojung Sikdang (the restaurant where they ate every day as trainees) or Hakdong Park, where the members used to go when their dorm felt too crowded.",
        directions: "Take Subway Line 7 to Hakdong Station and go out of Exit 7. The dorm is about a 10-minute walk into the residential area, located very close to Hakdong Park."
    },
    {
        id: 13, // Identifiant unique
        name: "Hyangho Beach Bus Stop",
        group: "BTS",
        member: "All",
        country: "South Korea",
        city: "Gangneung",
        category: "Landmarks",
        year: "2017",
        episode: "\"You Never Walk Alone\" Album Concept Photoshoot",
        episodeLink: "https://www.youtube.com/watch?v=46qWWmnK4F0",
        context: "The iconic standalone bus stop built on the beach for the 'You Never Walk Alone' album cover.",
        address: "8-55 Hyangho-ri, Jumunjin-eup, Gangneung-si, Gangwon-do",
        lat: 37.9048, // Coordonnées GPS exactes de l'arrêt de bus sur la plage
        lng: 128.8266,
        img: "https://img.youtube.com/vi/46qWWmnK4F0/hqdefault.jpg", // Miniature de la vidéo
        videoEmbeds: [
            "https://www.youtube.com/embed/46qWWmnK4F0" // Vidéo intégrée du shooting
        ],
        gallery: [
            "images/Hyangho1.jpg", 
            "images/Hyangho2.jpg"
        ],
        fullDescription: "Located on the pristine white sands of Hyangho Beach (just north of Jumunjin Beach), this lone bus stop is not a real transit station, but rather one of the most famous pop culture landmarks in South Korea. Set directly against the backdrop of the East Sea, the structure perfectly captures the melancholic, nostalgic, and comforting vibe of BTS's legendary track, \"Spring Day.\"<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (You Never Walk Alone)</h3>In 2017, the agency built a temporary bus stop on this exact stretch of sand solely for the album jacket photoshoot of You Never Walk Alone. The members were photographed sitting together under the small roof, smiling against the winter ocean breeze. The original set was dismantled immediately after the shoot ended. However, due to the overwhelming number of fans traveling to the beach to find the location, the city of Gangneung permanently built an exact replica of the bus stop in 2018 for visitors to enjoy.",
        tip: "Because this location is incredibly popular all year round, you will often find a small, organized queue of fans waiting to take photos. A beautiful unwritten rule here is that the people in line behind you will gladly help take your pictures so you can fit your whole group in the frame! After your photoshoot, take the time to walk along Jumunjin Beach, famous for its clear blue waters and peaceful pine tree forests.",
        directions: "Take the KTX high-speed train from Seoul Station to Gangneung Station (about a 2-hour ride). From Gangneung Station, you can either take Bus 300 or 302 towards Jumunjin, or take a 20-minute taxi ride directly along the scenic coast to the bus stop."
    },
    {
        id: 14, // Identifiant unique
        name: "Iryeong Station",
        group: "BTS",
        member: "All", 
        country: "South Korea",
        city: "Yangju (Gyeonggi-do)",
        category: "MV Location",
        year: "2017",
        episode: "\"Spring Day\" Official Music Video",
        episodeLink: "https://www.youtube.com/watch?v=xEeFrLSkMm8",
        context: "The abandoned railway station featured in the breathtaking opening scene of the 'Spring Day' music video.",
        address: "327 Samsang-ri, Jangheung-myeon, Yangju-si, Gyeonggi-do",
        lat: 37.7135, // Coordonnées GPS de la gare d'Iryeong
        lng: 126.9329,
        img: "https://img.youtube.com/vi/xEeFrLSkMm8/hqdefault.jpg", // Miniature officielle du MV
        videoEmbeds: [
            "https://www.youtube.com/embed/xEeFrLSkMm8" // Vidéo intégrée du MV
        ],
        gallery: [
            "images/Iryeong1.jpg", 
            "images/Iryeong2.jpg"
        ],
        fullDescription: "Iryeong Station is a rustic, decommissioned railway station located on the Seoul Suburban Line, just north of the capital. Originally opened in the 1960s, the station eventually ceased its passenger operations in 2004. Today, it stands quietly abandoned. With its faded station signs, rusted tracks, and vintage architecture, the location exudes a hauntingly beautiful and nostalgic atmosphere, frozen in time.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (\"Spring Day\" Music Video)</h3>This abandoned station serves as the breathtaking opening shot for BTS's masterpiece music video, \"Spring Day.\" The video begins with V stepping off a desolate platform onto the snow-covered tracks. He kneels down in the quiet, wintery landscape to listen to the rails, waiting for a train that seems like it will never arrive. This specific location perfectly captures the visual essence of the song: a deep sense of longing, distance, and the painful wait for the winter to pass.",
        tip: "While the station no longer serves regular passenger trains, please be aware that cargo or maintenance trains do occasionally pass through the area. For your safety, do not walk far down the active rail lines. The best time to visit and recreate the exact mood of the music video is, of course, after a fresh snowfall in winter, but the vintage charm of the station makes for beautiful, moody photography year-round.",
        directions: "Located about an hour north of central Seoul, the easiest way to reach the station via public transit is to take Subway Line 3 to Yeonsinnae Station, go out of Exit 3, and catch local Bus 360. Ride the bus for about 25 minutes and get off at the Iryeong Station bus stop. The station is a short walk from the road."
    },
    {
        id: 15, // Identifiant unique
        name: "Quinta da Francelha de Cima",
        group: "BTS",
        member: "All", 
        country: "Portugal",
        city: "Prior Velho (near Lisbon)",
        category: "MV Location",
        year: "2026",
        episode: "\"NORMAL\" Official Music Video (ARIRANG Album)",
        episodeLink: "https://www.youtube.com/watch?v=GEk4jHwfFTA",
        context: "The breathtaking historic Portuguese estate featured in the 'NORMAL' music video.",
        address: "R. da Francelha de Cima, 2685-332 Prior Velho, Portugal",
        lat: 38.7844, // Coordonnées approximatives de Prior Velho près de l'aéroport
        lng: -9.1238,
        img: "https://img.youtube.com/vi/GEk4jHwfFTA/hqdefault.jpg", // Miniature officielle du MV
        videoEmbeds: [
            "https://www.youtube.com/embed/GEk4jHwfFTA" // Vidéo intégrée du MV "NORMAL"
        ],
        gallery: [
            "images/Quinta1.jpg", 
            "images/Quinta2.jpg"
        ],
        fullDescription: "Located very close to Lisbon's Humberto Delgado Airport, Quinta da Francelha de Cima is a magnificent 18th-century historic Portuguese estate. Characterized by its traditional architecture, grand majestic halls, and manicured gardens, it perfectly reflects the aristocratic charm of its era. This elegant property is typically used as a venue for private events, offering a romantic and timeless setting steeped in classic Portuguese aesthetics.<br><br><h3 style='color: var(--primary-magenta); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;'>Following in BTS's Footsteps (\"NORMAL\" Music Video)</h3>To accompany the release of their highly anticipated comeback album, ARIRANG, BTS chose this historic estate to film the music video for their track \"NORMAL,\" released in the summer of 2026. Directed by Tanu Muiño, the cinematic visual explores a deeply personal side of the group's life away from the spotlight. Fans can distinctly recognize several spaces within the Quinta, including its grand reception rooms, bedrooms, lush gardens, and iconic Portuguese entrance, creating a striking contrast between the historical venue and modern pop.",
        tip: "Because Quinta da Francelha de Cima operates primarily as a private event venue, it is not open for casual, everyday walk-ins like a traditional museum. However, since the property is only a 4-minute drive from Lisbon Airport, it is incredibly easy to swing by and admire the entrance and exterior facade if you have a flight to catch or are just arriving in Portugal!",
        directions: "The estate is extremely accessible for travelers. The easiest and fastest way to get there is to take a taxi or a ride-share app (like Uber or Bolt) directly from Lisbon Humberto Delgado Airport. The ride takes barely 4 to 5 minutes."
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
            <div class="popup-title" onclick="window.openModal(${loc.id}); event.stopPropagation();">${loc.name} </div>
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

// Modal Functions (Secured with Try/Catch and explicit media sections)
window.openModal = function(id) {
    try {
        const loc = celebLocations.find(l => l.id === id);
        if(!loc) return;

        document.getElementById('modal-title').textContent = loc.name;
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

        // 1. GALLERY
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

        // 2. VIDEOS
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
