// ==========================================
// GUIDE PAS À PAS DE LA CARTE ("See Demo" depuis index.html -> map.html?demo=1)
// ==========================================
// Contrairement à la première version de ce guide (qui présentait index.html, la page
// de connexion/inscription), celui-ci présente vraiment le cœur du site : la carte
// interactive elle-même, la recherche/filtres, le détail d'un lieu, le générateur
// d'itinéraire automatique, et l'accès à toutes les autres pages du site — sur de
// vraies données (voir window.__demoMode / getUnlockedGroups() dans script.js), sans
// avoir besoin de créer de compte au préalable.
(function() {

    // Un sélecteur par étape (null = bulle centrée sans surbrillance, utilisé pour
    // l'étape finale). onEnter peut déclencher une action réelle sur la page (ouvrir un
    // lieu, changer d'onglet...) avant que l'étape ne soit positionnée.
    const TOUR_STEPS = [
        { selector: '#map', onEnter: () => { if(window.closeDetailsPanel) window.closeDetailsPanel(); if(window.switchMainTab) window.switchMainTab('explore'); } },
        { selector: '#search-input', onEnter: null },
        { selector: '#category-buttons', onEnter: null },
        { selector: '#sidebar-details', onEnter: () => { if(window.openDetailsPanel) window.openDetailsPanel(1); } },
        { selector: '#iti-generator-btn', onEnter: () => { if(window.closeDetailsPanel) window.closeDetailsPanel(); if(window.switchMainTab) window.switchMainTab('itinerary'); } },
        { selector: '#profile-btn', onEnter: () => { if(window.switchMainTab) window.switchMainTab('explore'); const m = document.getElementById('profile-menu'); if(m) m.classList.remove('hidden'); } },
        { selector: null, onEnter: () => { const m = document.getElementById('profile-menu'); if(m) m.classList.add('hidden'); }, isFinal: true },
    ];

    const TOUR_CONTENT = {
        en: { skip: "Skip tour", back: "Back", next: "Next", done: "Create My Account", stepLabel: "Step", steps: [
            { title: "The Interactive Map", desc: "This is the heart of Screen To Street — every pin marks a real place tied to a K-pop artist, ready for you to explore." },
            { title: "Search & Filter", desc: "Search any location by name, or use the filters to narrow down by group, member, country or year." },
            { title: "Browse by Category", desc: "Cafés, concerts, museums, MV filming spots and more — filter the map down to exactly what you're after." },
            { title: "Every Location, in Detail", desc: "Click any pin or list item to see its full story, practical tips and directions — and, once you've logged your visits, your own rating out of 5." },
            { title: "Auto-Itinerary Generator", desc: "Pick a group, a country and how many days you're staying — get an optimised day-by-day route with realistic transit times, automatically." },
            { title: "Every Part of the Site", desc: "From here, reach every page: Explore Destinations, Explore Artists, My Trips, My Wishlist, My Visited Places, and Settings." },
            { title: "Ready to Explore for Real?", desc: "Create your free account to unlock the map, save your favourite spots, and start planning your own trip." },
        ]},
        fr: { skip: "Passer la visite", back: "Retour", next: "Suivant", done: "Créer mon compte", stepLabel: "Étape", steps: [
            { title: "La carte interactive", desc: "C'est le cœur de Screen To Street — chaque épingle marque un vrai lieu lié à un artiste K-pop, prêt à être exploré." },
            { title: "Rechercher & filtrer", desc: "Recherchez un lieu par son nom, ou utilisez les filtres pour affiner par groupe, membre, pays ou année." },
            { title: "Parcourir par catégorie", desc: "Cafés, concerts, musées, lieux de tournage de clips et plus encore — filtrez la carte selon ce que vous cherchez." },
            { title: "Chaque lieu, en détail", desc: "Cliquez sur une épingle ou un lieu de la liste pour voir son histoire complète, des conseils pratiques et l'itinéraire — et, une fois vos visites enregistrées, votre propre note sur 5." },
            { title: "Générateur d'itinéraire automatique", desc: "Choisissez un groupe, un pays et le nombre de jours de votre séjour — obtenez un itinéraire optimisé jour par jour, avec des temps de trajet réalistes, automatiquement." },
            { title: "Toutes les pages du site", desc: "Depuis ici, accédez à tout : Explorer les destinations, Explorer les artistes, Mes voyages, Ma liste de souhaits, Mes lieux visités, et les Paramètres." },
            { title: "Prêt·e à explorer pour de vrai ?", desc: "Créez votre compte gratuit pour débloquer la carte, enregistrer vos lieux favoris et commencer à planifier votre propre voyage." },
        ]},
        es: { skip: "Omitir", back: "Atrás", next: "Siguiente", done: "Crear mi cuenta", stepLabel: "Paso", steps: [
            { title: "El mapa interactivo", desc: "Este es el corazón de Screen To Street — cada marcador señala un lugar real vinculado a un artista K-pop, listo para explorar." },
            { title: "Buscar y filtrar", desc: "Busca cualquier lugar por su nombre, o usa los filtros para acotar por grupo, miembro, país o año." },
            { title: "Explora por categoría", desc: "Cafeterías, conciertos, museos, lugares de rodaje de videoclips y más — filtra el mapa según lo que buscas." },
            { title: "Cada lugar, en detalle", desc: "Haz clic en cualquier marcador o lugar de la lista para ver su historia completa, consejos prácticos e indicaciones — y, una vez registradas tus visitas, tu propia valoración sobre 5." },
            { title: "Generador de itinerarios automático", desc: "Elige un grupo, un país y cuántos días te quedas — obtén una ruta optimizada día por día con tiempos de trayecto realistas, automáticamente." },
            { title: "Todas las partes del sitio", desc: "Desde aquí, accede a todo: Explorar destinos, Explorar artistas, Mis viajes, Mi lista de deseos, Mis lugares visitados y Configuración." },
            { title: "¿List@ para explorar de verdad?", desc: "Crea tu cuenta gratuita para desbloquear el mapa, guardar tus lugares favoritos y empezar a planear tu propio viaje." },
        ]},
        it: { skip: "Salta", back: "Indietro", next: "Avanti", done: "Crea il mio account", stepLabel: "Passo", steps: [
            { title: "La mappa interattiva", desc: "Questo è il cuore di Screen To Street — ogni segnaposto indica un luogo reale legato a un artista K-pop, pronto da esplorare." },
            { title: "Cerca e filtra", desc: "Cerca qualsiasi luogo per nome, oppure usa i filtri per restringere per gruppo, membro, paese o anno." },
            { title: "Esplora per categoria", desc: "Caffè, concerti, musei, luoghi delle riprese dei video musicali e altro ancora — filtra la mappa in base a ciò che cerchi." },
            { title: "Ogni luogo, nel dettaglio", desc: "Clicca su un segnaposto o su un luogo dell'elenco per vederne la storia completa, consigli pratici e indicazioni — e, una volta registrate le tue visite, la tua valutazione su 5." },
            { title: "Generatore automatico di itinerari", desc: "Scegli un gruppo, un paese e quanti giorni resti — ottieni un percorso ottimizzato giorno per giorno con tempi di trasporto realistici, automaticamente." },
            { title: "Ogni parte del sito", desc: "Da qui raggiungi tutto: Esplora destinazioni, Esplora artisti, I miei viaggi, La mia lista dei desideri, I miei luoghi visitati e Impostazioni." },
            { title: "Pront@ per esplorare sul serio?", desc: "Crea il tuo account gratuito per sbloccare la mappa, salvare i tuoi posti preferiti e iniziare a pianificare il tuo viaggio." },
        ]},
        pt: { skip: "Pular", back: "Voltar", next: "Próximo", done: "Criar minha conta", stepLabel: "Passo", steps: [
            { title: "O mapa interativo", desc: "Este é o coração do Screen To Street — cada marcador indica um lugar real ligado a um artista K-pop, pronto para explorar." },
            { title: "Pesquisar e filtrar", desc: "Pesquise qualquer lugar pelo nome, ou use os filtros para refinar por grupo, membro, país ou ano." },
            { title: "Explore por categoria", desc: "Cafés, shows, museus, locais de gravação de videoclipes e muito mais — filtre o mapa de acordo com o que você procura." },
            { title: "Cada lugar, em detalhes", desc: "Clique em qualquer marcador ou lugar da lista para ver sua história completa, dicas práticas e como chegar — e, depois de registrar suas visitas, sua própria avaliação de 5." },
            { title: "Gerador automático de roteiros", desc: "Escolha um grupo, um país e quantos dias você fica — obtenha um roteiro otimizado dia a dia com tempos de trajeto realistas, automaticamente." },
            { title: "Todas as partes do site", desc: "A partir daqui, acesse tudo: Explorar destinos, Explorar artistas, Minhas viagens, Minha lista de desejos, Meus lugares visitados e Configurações." },
            { title: "Pront@ para explorar de verdade?", desc: "Crie sua conta gratuita para desbloquear o mapa, salvar seus lugares favoritos e começar a planejar sua própria viagem." },
        ]},
        ko: { skip: "건너뛰기", back: "이전", next: "다음", done: "계정 만들기", stepLabel: "단계", steps: [
            { title: "인터랙티브 지도", desc: "이곳은 Screen To Street의 핵심입니다 — 모든 핀은 K-pop 아티스트와 연결된 실제 장소를 나타내며, 탐험할 준비가 되어 있습니다." },
            { title: "검색 및 필터", desc: "장소 이름으로 검색하거나, 필터를 사용해 그룹, 멤버, 국가, 연도별로 좁혀보세요." },
            { title: "카테고리별로 둘러보기", desc: "카페, 콘서트, 박물관, 뮤직비디오 촬영지 등 — 원하는 대로 지도를 필터링하세요." },
            { title: "모든 장소를 자세히", desc: "핀이나 목록의 장소를 클릭하면 전체 스토리, 실용적인 팁, 가는 방법을 볼 수 있고, 방문 기록을 남기면 5점 만점의 나만의 평점도 확인할 수 있습니다." },
            { title: "자동 일정 생성기", desc: "그룹, 국가, 머무는 일수를 선택하면 현실적인 이동 시간이 포함된 최적화된 일별 경로를 자동으로 받을 수 있습니다." },
            { title: "사이트의 모든 부분", desc: "여기서 모든 페이지에 접근할 수 있습니다: 여행지 탐색, 아티스트 탐색, 내 여행, 내 위시리스트, 내가 방문한 장소, 설정." },
            { title: "진짜로 탐험할 준비가 되셨나요?", desc: "무료 계정을 만들어 지도를 잠금 해제하고, 좋아하는 장소를 저장하고, 나만의 여행을 계획해보세요." },
        ]},
        ja: { skip: "スキップ", back: "戻る", next: "次へ", done: "アカウントを作成", stepLabel: "ステップ", steps: [
            { title: "インタラクティブマップ", desc: "ここがScreen To Streetの中心です — すべてのピンはK-popアーティストに関連する実在の場所を示しており、探索する準備ができています。" },
            { title: "検索とフィルター", desc: "場所を名前で検索するか、フィルターを使ってグループ、メンバー、国、年で絞り込みましょう。" },
            { title: "カテゴリーで探す", desc: "カフェ、コンサート、美術館、MV撮影地など — 目的に合わせて地図を絞り込めます。" },
            { title: "すべての場所を詳しく", desc: "ピンやリストの場所をクリックすると、詳しいストーリー、実用的なヒント、行き方が表示され、訪問を記録すると5点満点の自分の評価も確認できます。" },
            { title: "自動旅程ジェネレーター", desc: "グループ、国、滞在日数を選ぶだけで、現実的な移動時間を含む最適化された日ごとのルートが自動で作成されます。" },
            { title: "サイトのすべての機能", desc: "ここからすべてのページにアクセスできます：旅行先を探す、アーティストを探す、マイ旅程、マイウィッシュリスト、訪れた場所、設定。" },
            { title: "本当に探索する準備はできましたか？", desc: "無料アカウントを作成して地図のロックを解除し、お気に入りの場所を保存して、自分だけの旅を計画しましょう。" },
        ]},
        zh: { skip: "跳过", back: "上一步", next: "下一步", done: "创建我的账户", stepLabel: "步骤", steps: [
            { title: "互动地图", desc: "这里是 Screen To Street 的核心 — 每个图钉都标记着与K-pop艺人相关的真实地点，等待你去探索。" },
            { title: "搜索与筛选", desc: "按名称搜索任意地点，或使用筛选器按组合、成员、国家或年份缩小范围。" },
            { title: "按类别浏览", desc: "咖啡馆、演唱会、博物馆、MV取景地等等 — 按你的需求筛选地图。" },
            { title: "每个地点的详细信息", desc: "点击任意图钉或列表中的地点，即可查看完整故事、实用贴士和路线 — 记录你的到访后，还能看到你自己的5分制评分。" },
            { title: "自动行程生成器", desc: "选择一个组合、一个国家和停留天数，即可自动获得包含真实交通时间的逐日优化路线。" },
            { title: "网站的每个部分", desc: "从这里可以进入所有页面：探索目的地、探索艺人、我的行程、我的心愿单、我到访过的地方，以及设置。" },
            { title: "准备好真正开始探索了吗？", desc: "创建你的免费账户，解锁地图，保存你喜欢的地点，开始规划属于你自己的旅程。" },
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
        // jusqu'à document et referme instantanément le menu profil que l'étape "Toutes les
        // pages du site" vient d'ouvrir via onEnter, dans le même événement.
        overlay.querySelector('#tour-skip').addEventListener('click', (e) => { e.stopPropagation(); closeTour(); });
        overlay.querySelector('#tour-back').addEventListener('click', (e) => { e.stopPropagation(); goToStep(tourIndex - 1); });
        overlay.querySelector('#tour-next').addEventListener('click', (e) => {
            e.stopPropagation();
            if (TOUR_STEPS[tourIndex].isFinal) { window.location.href = 'index.html'; return; }
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
        document.getElementById('tour-skip').style.display = stepDef.isFinal ? 'none' : 'block';
        const backBtn = document.getElementById('tour-back');
        backBtn.textContent = c.back;
        backBtn.disabled = tourIndex === 0;
        document.getElementById('tour-next').textContent = stepDef.isFinal ? c.done : c.next;

        const targetEl = stepDef.selector ? document.querySelector(stepDef.selector) : null;

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

        // Un scroll "smooth" mesuré trop tôt (délai fixe ou détection de stabilité par
        // frame) peut être piégé par le démarrage lent d'une courbe d'easing et placer le
        // spotlight à côté de la cible réelle. Un scroll instantané supprime ce problème de
        // timing ; deux frames suffisent ensuite pour laisser le layout se recalculer.
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

    window.startMapTour = function() {
        if (started) return;
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
    }
})();
