// ==========================================
// GUIDE PAS À PAS DE LA CARTE ("See Demo" depuis index.html -> map.html?demo=1)
// ==========================================
// Présente le cœur du site : la carte interactive elle-même, la recherche/filtres, le
// détail d'un lieu, le générateur d'itinéraire automatique, puis chacune des autres
// pages du site (Destinations, Artistes, Paramètres, Compte, Voyages, Wishlist) — sur de
// vraies données de démonstration (voir window.__demoMode dans script.js), sans avoir
// besoin de créer de compte au préalable. La dernière étape termine sur la vraie fenêtre
// "Log in to continue" (identique à celle qui protège la carte normalement), pour que la
// visite se conclue naturellement sur la création d'un compte.
(function() {

    // Un sélecteur par étape (null = bulle centrée sans surbrillance, utilisé pour
    // l'étape finale). onEnter peut déclencher une action réelle sur la page (ouvrir un
    // lieu, changer d'onglet, ouvrir le menu profil...) avant que l'étape ne soit
    // positionnée. settleDelay : certaines de ces actions déclenchent une transition CSS
    // sur la sidebar (ex: largeur 360px -> 480px à l'ouverture du détail d'un lieu, en
    // 0.4s) — mesurer la position immédiatement après capturerait un rectangle en pleine
    // transition. On attend ce délai (couvrant large la transition la plus longue du
    // site) avant de mesurer quoi que ce soit.
    const SETTLE_DELAY = 480;

    // Sur mobile, la sidebar (#app-sidebar) est hors-écran par défaut (left:-100%) et ne
    // devient visible qu'avec la classe "open" (voir style.css, @media max-width:800px).
    // Le contenu de la carte proprement dite (#search-input, #category-buttons,
    // #iti-generator-btn...) vit à l'intérieur de cette sidebar : chaque étape du guide qui
    // cible un de ces éléments doit donc explicitement rouvrir la sidebar sur mobile, et
    // chaque étape qui cible autre chose (la carte elle-même, le menu profil) doit
    // explicitement la refermer — sans quoi elle reste bloquée en plein écran par-dessus le
    // reste (ex : par-dessus le menu profil des dernières étapes) selon la dernière action
    // effectuée. Desktop n'est pas affecté : ces classes n'ont aucun effet en dehors de
    // cette media query.
    function setMobileSidebar(open) {
        const sidebar = document.getElementById('app-sidebar');
        if (!sidebar) return;
        if (open) sidebar.classList.add('open');
        else { sidebar.classList.remove('open'); sidebar.classList.remove('expanded'); }
    }

    const TOUR_STEPS = [
        { selector: '#map', onEnter: () => {
            if (window.closeDetailsPanel) window.closeDetailsPanel();
            if (window.switchMainTab) window.switchMainTab('explore');
            const m = document.getElementById('profile-menu'); if (m) m.classList.add('hidden');
            setMobileSidebar(false);
        }, settleDelay: SETTLE_DELAY },
        { selector: '#search-input', onEnter: () => setMobileSidebar(true), settleDelay: SETTLE_DELAY },
        { selector: '#category-buttons', onEnter: () => setMobileSidebar(true), settleDelay: SETTLE_DELAY },
        { selector: '#sidebar-details', onEnter: () => { if (window.openDetailsPanel) window.openDetailsPanel(1); }, settleDelay: SETTLE_DELAY },
        { selector: '#iti-generator-btn', onEnter: () => {
            if (window.closeDetailsPanel) window.closeDetailsPanel();
            if (window.switchMainTab) window.switchMainTab('itinerary');
            setMobileSidebar(true);
        }, settleDelay: SETTLE_DELAY },
        // Bouton fusionné Tour/Live (voir openLiveTourChooser() dans script.js) : selon la
        // largeur d'écran, seul #tour-mode-badge (desktop) OU #tour-mode-badge-mobile
        // (mobile) est réellement visible — les deux perdent leur classe .hidden ensemble
        // (voir initTourModeBadge() dans tour-mode.js), donc un simple sélecteur CSS
        // renverrait toujours le même des deux, quelle que soit la largeur réelle de la
        // fenêtre. selector en fonction (géré par positionStepNow ci-dessous) pour choisir
        // celui qui est effectivement affiché.
        { selector: () => {
            const badgeMobile = document.getElementById('tour-mode-badge-mobile');
            if (badgeMobile && badgeMobile.offsetParent !== null) return badgeMobile;
            return document.getElementById('tour-mode-badge');
        }, onEnter: () => {
            if (window.closeDetailsPanel) window.closeDetailsPanel();
            if (window.switchMainTab) window.switchMainTab('explore');
            setMobileSidebar(false);
        }, settleDelay: SETTLE_DELAY },
        { selector: '#profile-menu a[href="map-destinations.html"]', onEnter: () => {
            if (window.closeDetailsPanel) window.closeDetailsPanel();
            if (window.switchMainTab) window.switchMainTab('explore');
            const m = document.getElementById('profile-menu'); if (m) m.classList.remove('hidden');
            setMobileSidebar(false);
        }, settleDelay: SETTLE_DELAY },
        { selector: '#profile-menu a[href="map-artists.html"]', onEnter: null },
        { selector: '#profile-menu a[href="settings.html"]', onEnter: null },
        { selector: '#profile-menu a[href="account.html"]', onEnter: null },
        { selector: '#profile-menu a[href="trips.html"]', onEnter: null },
        { selector: '#profile-menu a[href="wishlist.html"]', onEnter: null, isFinal: true },
    ];

    const TOUR_CONTENT = {
        en: { skip: "Skip tour", back: "Back", next: "Next", done: "Create My Account", stepLabel: "Step", steps: [
            { title: "The Interactive Map", desc: "This is the heart of Screen To Street — every pin marks a real place tied to a K-pop artist, ready for you to explore." },
            { title: "Search & Filter", desc: "Search any location by name, or use the filters to narrow down by group, member, country or year." },
            { title: "Browse by Category", desc: "Cafés, concerts, museums, MV filming spots and more — filter the map down to exactly what you're after." },
            { title: "Every Location, in Detail", desc: "Click any pin or list item to see its full story, practical tips and directions — and, once you've logged your visits, its community rating out of 5." },
            { title: "Auto-Itinerary Generator", desc: "Pick a group, a country and how many days you're staying — get an optimised day-by-day route with realistic transit times, automatically." },
            { title: "Live & Tour Updates", desc: "One badge tells you what's happening right now — a live show or an upcoming tour stop — for BTS and any other artist you follow. Tap it to see the full schedule." },
            { title: "Explore Destinations", desc: "Browse every country covered by the site, with real filming and visit locations tied to your favourite groups." },
            { title: "Explore Artists", desc: "Discover every group and member on the site, and the real places linked to them." },
            { title: "Settings", desc: "Switch language, manage notifications and cookie preferences, or download your data." },
            { title: "Your Account", desc: "Manage your profile, password, and which artist passes you've unlocked." },
            { title: "My Trips", desc: "Build and save multi-day itineraries, complete with a day-by-day map." },
            { title: "My Wishlist", desc: "Keep track of every place you're planning to visit next." },
        ]},
        fr: { skip: "Passer la visite", back: "Retour", next: "Suivant", done: "Créer mon compte", stepLabel: "Étape", steps: [
            { title: "La carte interactive", desc: "C'est le cœur de Screen To Street — chaque épingle marque un vrai lieu lié à un artiste K-pop, prêt à être exploré." },
            { title: "Rechercher & filtrer", desc: "Recherchez un lieu par son nom, ou utilisez les filtres pour affiner par groupe, membre, pays ou année." },
            { title: "Parcourir par catégorie", desc: "Cafés, concerts, musées, lieux de tournage de clips et plus encore — filtrez la carte selon ce que vous cherchez." },
            { title: "Chaque lieu, en détail", desc: "Cliquez sur une épingle ou un lieu de la liste pour voir son histoire complète, des conseils pratiques et l'itinéraire — et, une fois vos visites enregistrées, sa note communautaire sur 5." },
            { title: "Générateur d'itinéraire automatique", desc: "Choisissez un groupe, un pays et le nombre de jours de votre séjour — obtenez un itinéraire optimisé jour par jour, avec des temps de trajet réalistes, automatiquement." },
            { title: "Live & Tournées", desc: "Un seul badge indique ce qui se passe en ce moment — un concert en direct ou une prochaine date de tournée — pour BTS et tout autre artiste que vous suivez. Touchez-le pour voir le programme complet." },
            { title: "Explorer les destinations", desc: "Parcourez tous les pays couverts par le site, avec de vrais lieux de tournage et de visite liés à vos groupes préférés." },
            { title: "Explorer les artistes", desc: "Découvrez chaque groupe et chaque membre du site, ainsi que les vrais lieux qui leur sont liés." },
            { title: "Paramètres", desc: "Changez de langue, gérez vos notifications et préférences de cookies, ou téléchargez vos données." },
            { title: "Votre compte", desc: "Gérez votre profil, votre mot de passe, et les pass d'artistes que vous avez débloqués." },
            { title: "Mes voyages", desc: "Construisez et enregistrez des itinéraires sur plusieurs jours, avec une carte jour par jour." },
            { title: "Ma liste de souhaits", desc: "Gardez une trace de tous les lieux que vous prévoyez de visiter." },
        ]},
        es: { skip: "Omitir", back: "Atrás", next: "Siguiente", done: "Crear mi cuenta", stepLabel: "Paso", steps: [
            { title: "El mapa interactivo", desc: "Este es el corazón de Screen To Street — cada marcador señala un lugar real vinculado a un artista K-pop, listo para explorar." },
            { title: "Buscar y filtrar", desc: "Busca cualquier lugar por su nombre, o usa los filtros para acotar por grupo, miembro, país o año." },
            { title: "Explora por categoría", desc: "Cafeterías, conciertos, museos, lugares de rodaje de videoclips y más — filtra el mapa según lo que buscas." },
            { title: "Cada lugar, en detalle", desc: "Haz clic en cualquier marcador o lugar de la lista para ver su historia completa, consejos prácticos e indicaciones — y, una vez registradas tus visitas, su valoración comunitaria sobre 5." },
            { title: "Generador de itinerarios automático", desc: "Elige un grupo, un país y cuántos días te quedas — obtén una ruta optimizada día por día con tiempos de trayecto realistas, automáticamente." },
            { title: "Live y giras", desc: "Una sola insignia te muestra lo que está pasando ahora mismo — un show en directo o una próxima fecha de gira — para BTS y cualquier otro artista que sigas. Tócala para ver el calendario completo." },
            { title: "Explorar destinos", desc: "Explora todos los países que cubre el sitio, con lugares reales de rodaje y visita vinculados a tus grupos favoritos." },
            { title: "Explorar artistas", desc: "Descubre cada grupo y miembro del sitio, y los lugares reales vinculados a ellos." },
            { title: "Configuración", desc: "Cambia de idioma, gestiona tus notificaciones y preferencias de cookies, o descarga tus datos." },
            { title: "Tu cuenta", desc: "Gestiona tu perfil, tu contraseña y los pases de artistas que has desbloqueado." },
            { title: "Mis viajes", desc: "Crea y guarda itinerarios de varios días, con un mapa día a día." },
            { title: "Mi lista de deseos", desc: "Lleva un registro de todos los lugares que planeas visitar." },
        ]},
        it: { skip: "Salta", back: "Indietro", next: "Avanti", done: "Crea il mio account", stepLabel: "Passo", steps: [
            { title: "La mappa interattiva", desc: "Questo è il cuore di Screen To Street — ogni segnaposto indica un luogo reale legato a un artista K-pop, pronto da esplorare." },
            { title: "Cerca e filtra", desc: "Cerca qualsiasi luogo per nome, oppure usa i filtri per restringere per gruppo, membro, paese o anno." },
            { title: "Esplora per categoria", desc: "Caffè, concerti, musei, luoghi delle riprese dei video musicali e altro ancora — filtra la mappa in base a ciò che cerchi." },
            { title: "Ogni luogo, nel dettaglio", desc: "Clicca su un segnaposto o su un luogo dell'elenco per vederne la storia completa, consigli pratici e indicazioni — e, una volta registrate le tue visite, la sua valutazione della community su 5." },
            { title: "Generatore automatico di itinerari", desc: "Scegli un gruppo, un paese e quanti giorni resti — ottieni un percorso ottimizzato giorno per giorno con tempi di trasporto realistici, automaticamente." },
            { title: "Live e tour", desc: "Un solo badge ti mostra cosa sta succedendo in questo momento — uno show dal vivo o una prossima data del tour — per i BTS e qualsiasi altro artista che segui. Toccalo per vedere il calendario completo." },
            { title: "Esplora destinazioni", desc: "Sfoglia tutti i paesi coperti dal sito, con veri luoghi di riprese e visita legati ai tuoi gruppi preferiti." },
            { title: "Esplora artisti", desc: "Scopri ogni gruppo e membro del sito, e i luoghi reali a loro collegati." },
            { title: "Impostazioni", desc: "Cambia lingua, gestisci le notifiche e le preferenze sui cookie, o scarica i tuoi dati." },
            { title: "Il tuo account", desc: "Gestisci il tuo profilo, la password e i pass degli artisti che hai sbloccato." },
            { title: "I miei viaggi", desc: "Crea e salva itinerari di più giorni, con una mappa giorno per giorno." },
            { title: "La mia lista dei desideri", desc: "Tieni traccia di tutti i luoghi che hai in programma di visitare." },
        ]},
        pt: { skip: "Pular", back: "Voltar", next: "Próximo", done: "Criar minha conta", stepLabel: "Passo", steps: [
            { title: "O mapa interativo", desc: "Este é o coração do Screen To Street — cada marcador indica um lugar real ligado a um artista K-pop, pronto para explorar." },
            { title: "Pesquisar e filtrar", desc: "Pesquise qualquer lugar pelo nome, ou use os filtros para refinar por grupo, membro, país ou ano." },
            { title: "Explore por categoria", desc: "Cafés, shows, museus, locais de gravação de videoclipes e muito mais — filtre o mapa de acordo com o que você procura." },
            { title: "Cada lugar, em detalhes", desc: "Clique em qualquer marcador ou lugar da lista para ver sua história completa, dicas práticas e como chegar — e, depois de registrar suas visitas, sua avaliação da comunidade sobre 5." },
            { title: "Gerador automático de roteiros", desc: "Escolha um grupo, um país e quantos dias você fica — obtenha um roteiro otimizado dia a dia com tempos de trajeto realistas, automaticamente." },
            { title: "Live e turnês", desc: "Um único selo mostra o que está acontecendo agora — um show ao vivo ou uma próxima data de turnê — para o BTS e qualquer outro artista que você segue. Toque nele para ver a agenda completa." },
            { title: "Explorar destinos", desc: "Navegue por todos os países cobertos pelo site, com locais reais de filmagem e visita ligados aos seus grupos favoritos." },
            { title: "Explorar artistas", desc: "Descubra cada grupo e membro do site, e os locais reais ligados a eles." },
            { title: "Configurações", desc: "Mude o idioma, gerencie notificações e preferências de cookies, ou baixe seus dados." },
            { title: "Sua conta", desc: "Gerencie seu perfil, sua senha e os passes de artistas que você desbloqueou." },
            { title: "Minhas viagens", desc: "Crie e salve roteiros de vários dias, com um mapa dia a dia." },
            { title: "Minha lista de desejos", desc: "Acompanhe todos os lugares que você planeja visitar." },
        ]},
        ko: { skip: "건너뛰기", back: "이전", next: "다음", done: "계정 만들기", stepLabel: "단계", steps: [
            { title: "인터랙티브 지도", desc: "이곳은 Screen To Street의 핵심입니다 — 모든 핀은 K-pop 아티스트와 연결된 실제 장소를 나타내며, 탐험할 준비가 되어 있습니다." },
            { title: "검색 및 필터", desc: "장소 이름으로 검색하거나, 필터를 사용해 그룹, 멤버, 국가, 연도별로 좁혀보세요." },
            { title: "카테고리별로 둘러보기", desc: "카페, 콘서트, 박물관, 뮤직비디오 촬영지 등 — 원하는 대로 지도를 필터링하세요." },
            { title: "모든 장소를 자세히", desc: "핀이나 목록의 장소를 클릭하면 전체 스토리, 실용적인 팁, 가는 방법을 볼 수 있고, 방문 기록을 남기면 5점 만점의 커뮤니티 평점도 확인할 수 있습니다." },
            { title: "자동 일정 생성기", desc: "그룹, 국가, 머무는 일수를 선택하면 현실적인 이동 시간이 포함된 최적화된 일별 경로를 자동으로 받을 수 있습니다." },
            { title: "라이브 및 투어 업데이트", desc: "지금 무슨 일이 일어나고 있는지 하나의 배지로 확인하세요 — 라이브 공연이나 다가오는 투어 일정 — BTS와 팔로우하는 다른 아티스트 모두. 탭하면 전체 일정을 볼 수 있습니다." },
            { title: "여행지 탐색", desc: "사이트에 있는 모든 국가를 둘러보세요. 좋아하는 그룹과 관련된 실제 촬영지와 방문 장소가 포함되어 있습니다." },
            { title: "아티스트 탐색", desc: "사이트의 모든 그룹과 멤버, 그리고 그들과 관련된 실제 장소를 확인해보세요." },
            { title: "설정", desc: "언어를 변경하고, 알림 및 쿠키 설정을 관리하거나, 데이터를 다운로드하세요." },
            { title: "내 계정", desc: "프로필, 비밀번호, 잠금 해제한 아티스트 이용권을 관리하세요." },
            { title: "내 여행", desc: "일별 지도가 포함된 여러 날짜의 일정을 만들고 저장하세요." },
            { title: "내 위시리스트", desc: "다음에 방문할 계획인 모든 장소를 기록해두세요." },
        ]},
        ja: { skip: "スキップ", back: "戻る", next: "次へ", done: "アカウントを作成", stepLabel: "ステップ", steps: [
            { title: "インタラクティブマップ", desc: "ここがScreen To Streetの中心です — すべてのピンはK-popアーティストに関連する実在の場所を示しており、探索する準備ができています。" },
            { title: "検索とフィルター", desc: "場所を名前で検索するか、フィルターを使ってグループ、メンバー、国、年で絞り込みましょう。" },
            { title: "カテゴリーで探す", desc: "カフェ、コンサート、美術館、MV撮影地など — 目的に合わせて地図を絞り込めます。" },
            { title: "すべての場所を詳しく", desc: "ピンやリストの場所をクリックすると、詳しいストーリー、実用的なヒント、行き方が表示され、訪問を記録すると5点満点のコミュニティ評価も確認できます。" },
            { title: "自動旅程ジェネレーター", desc: "グループ、国、滞在日数を選ぶだけで、現実的な移動時間を含む最適化された日ごとのルートが自動で作成されます。" },
            { title: "ライブ＆ツアー情報", desc: "今何が起きているか（ライブ公演や次のツアー日程）を1つのバッジで確認できます — BTSはもちろん、フォローしている他のアーティストも。タップすると全スケジュールが見られます。" },
            { title: "旅行先を探す", desc: "サイトに掲載されているすべての国を閲覧できます。お気に入りのグループに関連した実際の撮影地や訪問スポットも。" },
            { title: "アーティストを探す", desc: "サイトのすべてのグループとメンバー、そして関連する実際の場所を発見しましょう。" },
            { title: "設定", desc: "言語を切り替えたり、通知やクッキーの設定を管理したり、データをダウンロードできます。" },
            { title: "マイアカウント", desc: "プロフィール、パスワード、ロック解除したアーティストパスを管理できます。" },
            { title: "マイ旅程", desc: "日ごとの地図付きで、複数日の旅程を作成・保存できます。" },
            { title: "マイウィッシュリスト", desc: "次に訪れたいすべての場所を記録しておけます。" },
        ]},
        zh: { skip: "跳过", back: "上一步", next: "下一步", done: "创建我的账户", stepLabel: "步骤", steps: [
            { title: "互动地图", desc: "这里是 Screen To Street 的核心 — 每个图钉都标记着与K-pop艺人相关的真实地点，等待你去探索。" },
            { title: "搜索与筛选", desc: "按名称搜索任意地点，或使用筛选器按组合、成员、国家或年份缩小范围。" },
            { title: "按类别浏览", desc: "咖啡馆、演唱会、博物馆、MV取景地等等 — 按你的需求筛选地图。" },
            { title: "每个地点的详细信息", desc: "点击任意图钉或列表中的地点，即可查看完整故事、实用贴士和路线 — 记录你的到访后，还能看到社区评分（满分5分）。" },
            { title: "自动行程生成器", desc: "选择一个组合、一个国家和停留天数，即可自动获得包含真实交通时间的逐日优化路线。" },
            { title: "直播与巡演更新", desc: "一个徽章即可查看当下动态——正在进行的演出或即将到来的巡演站点——适用于BTS及你关注的其他艺人。点击即可查看完整日程。" },
            { title: "探索目的地", desc: "浏览网站涵盖的所有国家，包含与你喜欢的组合相关的真实取景地和到访地点。" },
            { title: "探索艺人", desc: "发现网站上的每个组合和成员，以及与他们相关的真实地点。" },
            { title: "设置", desc: "切换语言，管理通知和 Cookie 偏好设置，或下载你的数据。" },
            { title: "我的账户", desc: "管理你的个人资料、密码，以及你已解锁的艺人通行证。" },
            { title: "我的行程", desc: "创建并保存多日行程，附带逐日地图。" },
            { title: "我的心愿单", desc: "记录所有你计划去的地方。" },
        ]}
    };

    let overlay, spotlight, tooltip, tourIndex = 0, started = false;

    function lang() { return localStorage.getItem('lang') || 'en'; }
    function content() { return TOUR_CONTENT[lang()] || TOUR_CONTENT.en; }

    function buildTourDOM() {
        overlay = document.createElement('div');
        overlay.id = 'tour-overlay';
        overlay.className = 'tour-overlay';
        overlay.innerHTML = `
            <div class="tour-spotlight" id="tour-spotlight"></div>
            <div class="tour-tooltip" id="tour-tooltip">
                <div class="tour-step-count" id="tour-step-count"></div>
                <h3 id="tour-title"></h3>
                <p id="tour-desc"></p>
                <div class="tour-controls">
                    <button class="tour-skip-btn" id="tour-skip"></button>
                    <div class="tour-nav-btns">
                        <button class="tour-nav-btn tour-back-btn" id="tour-back"></button>
                        <button class="tour-nav-btn tour-next-btn" id="tour-next"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        spotlight = overlay.querySelector('#tour-spotlight');
        tooltip = overlay.querySelector('#tour-tooltip');

        // e.stopPropagation() : script.js attache un écouteur "click n'importe où ferme les
        // menus déroulants" sur document. Sans ça, ce même clic sur Suivant/Retour remonte
        // jusqu'à document et referme instantanément le menu profil qu'une étape vient
        // d'ouvrir via onEnter, dans le même événement.
        overlay.querySelector('#tour-skip').addEventListener('click', (e) => { e.stopPropagation(); closeTour(); });
        overlay.querySelector('#tour-back').addEventListener('click', (e) => { e.stopPropagation(); goToStep(tourIndex - 1); });
        overlay.querySelector('#tour-next').addEventListener('click', (e) => {
            e.stopPropagation();
            if (TOUR_STEPS[tourIndex].isFinal) { finishTour(); return; }
            if (tourIndex >= TOUR_STEPS.length - 1) { closeTour(); return; }
            goToStep(tourIndex + 1);
        });

        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;
            if (e.key === 'Escape') closeTour();
            else if (e.key === 'ArrowRight') { if (!TOUR_STEPS[tourIndex].isFinal && tourIndex < TOUR_STEPS.length - 1) goToStep(tourIndex + 1); }
            else if (e.key === 'ArrowLeft') goToStep(tourIndex - 1);
        });
        window.addEventListener('resize', () => { if (overlay.classList.contains('open')) positionStep(); });
    }

    function goToStep(idx) {
        if (idx < 0 || idx >= TOUR_STEPS.length) return;
        tourIndex = idx;
        positionStep();
    }

    function positionStep() {
        const c = content();
        const stepDef = TOUR_STEPS[tourIndex];
        const stepText = c.steps[tourIndex];

        if (typeof stepDef.onEnter === 'function') stepDef.onEnter();

        document.getElementById('tour-step-count').textContent = `${c.stepLabel} ${tourIndex + 1} / ${TOUR_STEPS.length}`;
        document.getElementById('tour-title').textContent = stepText.title;
        document.getElementById('tour-desc').textContent = stepText.desc;
        document.getElementById('tour-skip').textContent = c.skip;
        const backBtn = document.getElementById('tour-back');
        backBtn.textContent = c.back;
        backBtn.disabled = tourIndex === 0;
        document.getElementById('tour-next').textContent = stepDef.isFinal ? c.done : c.next;

        // Certaines actions onEnter déclenchent une transition CSS sur la sidebar (largeur
        // 360px <-> 480px, 0.4s) : on attend qu'elle se termine avant de mesurer quoi que
        // ce soit, sinon le spotlight se positionne sur un rectangle en plein changement de
        // taille (trop étroit, ou débordant à droite une fois la sidebar revenue à 360px).
        setTimeout(() => positionStepNow(stepDef), stepDef.settleDelay || 0);
    }

    function positionStepNow(stepDef) {
        const targetEl = typeof stepDef.selector === 'function'
            ? stepDef.selector()
            : (stepDef.selector ? document.querySelector(stepDef.selector) : null);

        if (!targetEl) {
            spotlight.style.display = 'none';
            overlay.classList.add('no-target');
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }
        overlay.classList.remove('no-target');
        tooltip.style.transform = 'none';

        // Scroll instantané (pas "smooth") : un scroll animé mesuré trop tôt peut être
        // piégé par le démarrage lent d'une courbe d'easing et placer le spotlight à côté
        // de la cible réelle. Deux frames suffisent ensuite pour laisser le layout se
        // recalculer après le scroll instantané.
        targetEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const rect = targetEl.getBoundingClientRect();
            const pad = 8;
            spotlight.style.display = 'block';
            spotlight.style.top = (rect.top - pad) + 'px';
            spotlight.style.left = (rect.left - pad) + 'px';
            spotlight.style.width = (rect.width + pad * 2) + 'px';
            spotlight.style.height = (rect.height + pad * 2) + 'px';

            const tooltipRect = tooltip.getBoundingClientRect();
            let top = rect.bottom + 16;
            let left = rect.left;
            if (top + tooltipRect.height > window.innerHeight - 10) top = rect.top - tooltipRect.height - 16;
            if (top < 10) top = 10;
            const maxLeft = window.innerWidth - tooltipRect.width - 10;
            if (left > maxLeft) left = maxLeft;
            if (left < 10) left = 10;
            tooltip.style.top = top + 'px';
            tooltip.style.left = left + 'px';
        }));
    }

    // Pas de garde "started" : le bouton "Tour" (voir map.html) doit pouvoir relancer le
    // guide depuis le début à tout moment, même après l'avoir déjà suivi ou passé.
    window.startMapTour = function() {
        started = true;
        if (!overlay) buildTourDOM();
        tourIndex = 0;
        overlay.classList.add('open');
        positionStep();
    };

    function closeTour() {
        if (!overlay) return;
        overlay.classList.remove('open');
        const m = document.getElementById('profile-menu');
        if (m) m.classList.add('hidden');
        setMobileSidebar(false);
    }

    // Fin de la visite : au lieu de rediriger vers index.html, on referme le guide et on
    // affiche directement la vraie fenêtre "Log in to continue" qui protège normalement la
    // carte (même formulaire email/mot de passe, bouton Google, lien "Sign up") — la visite
    // se termine ainsi naturellement sur la création d'un compte, sans navigation.
    function finishTour() {
        closeTour();
        const notLoggedIn = document.getElementById('gate-not-logged-in');
        const noGroups = document.getElementById('gate-no-groups');
        if (noGroups) noGroups.classList.add('hidden');
        if (notLoggedIn) notLoggedIn.classList.remove('hidden');
        document.body.classList.add('auth-gate-active');
    }
})();
