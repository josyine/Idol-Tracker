// ==========================================
// GUIDE PAS À PAS ("See Demo" / "Voir la démo")
// ==========================================
// Le bouton "See Demo" existait déjà dans le hero de index.html (voir welcome-style.css
// .cta-secondary) mais n'était relié à rien : ce fichier lui donne un vrai comportement,
// une visite guidée qui met en surbrillance, une par une, les vraies interactions de la
// page (pas des captures d'écran statiques) avec une bulle d'explication à côté de
// chacune. Fichier volontairement séparé de welcome-script.js (module) pour rester
// simple : il lit directement localStorage('lang'), la même source de vérité que le
// reste du site, sans dépendre de son état interne.
(function() {

    // Un sélecteur CSS par étape, dans l'ordre de la visite : le vrai bouton/lien mis en
    // surbrillance à cette étape. Si un sélecteur ne correspond à rien sur l'écran actuel
    // (ex: largeur non standard), l'étape s'affiche centrée sans surbrillance plutôt que
    // de casser la visite.
    const TOUR_SELECTORS = [
        '.brand',
        'a.nav-link[href="destinations.html"]',
        'a.nav-link[href="artists.html"]',
        '#lang-btn',
        '.open-auth-btn',
        '#header-login-btn'
    ];

    const TOUR_CONTENT = {
        en: { skip: "Skip tour", back: "Back", next: "Next", done: "Got it", stepLabel: "Step", steps: [
            { title: "Welcome to Screen To Street", desc: "Turn your favorite K-pop scenes into real places you can actually visit." },
            { title: "Explore by destination", desc: "Browse countries with real filming and visit locations tied to your favorite groups." },
            { title: "Explore by artist", desc: "Discover every group and member covered by the site, and the places linked to them." },
            { title: "Pick your language", desc: "Switch the whole site to one of 8 languages, anytime." },
            { title: "Create your free account", desc: "Sign up to unlock the interactive map and start building your own itinerary." },
            { title: "Already a member?", desc: "Log back in here whenever you return." }
        ]},
        fr: { skip: "Passer la visite", back: "Retour", next: "Suivant", done: "Compris", stepLabel: "Étape", steps: [
            { title: "Bienvenue sur Screen To Street", desc: "Transformez vos scènes K-pop préférées en lieux réels que vous pouvez vraiment visiter." },
            { title: "Explorez par destination", desc: "Parcourez les pays avec de vrais lieux de tournage et de visite liés à vos groupes préférés." },
            { title: "Explorez par artiste", desc: "Découvrez chaque groupe et chaque membre couverts par le site, ainsi que les lieux qui leur sont liés." },
            { title: "Choisissez votre langue", desc: "Basculez tout le site dans l'une des 8 langues disponibles, à tout moment." },
            { title: "Créez votre compte gratuit", desc: "Inscrivez-vous pour débloquer la carte interactive et commencer à construire votre propre itinéraire." },
            { title: "Déjà membre ?", desc: "Reconnectez-vous ici à chaque retour." }
        ]},
        es: { skip: "Omitir", back: "Atrás", next: "Siguiente", done: "Entendido", stepLabel: "Paso", steps: [
            { title: "Bienvenido a Screen To Street", desc: "Convierte tus escenas de K-pop favoritas en lugares reales que puedes visitar." },
            { title: "Explora por destino", desc: "Recorre países con lugares reales de rodaje y visita vinculados a tus grupos favoritos." },
            { title: "Explora por artista", desc: "Descubre cada grupo y cada miembro del sitio, y los lugares vinculados a ellos." },
            { title: "Elige tu idioma", desc: "Cambia todo el sitio a uno de los 8 idiomas disponibles, en cualquier momento." },
            { title: "Crea tu cuenta gratuita", desc: "Regístrate para desbloquear el mapa interactivo y empezar a crear tu propio itinerario." },
            { title: "¿Ya eres miembro?", desc: "Vuelve a iniciar sesión aquí cuando regreses." }
        ]},
        it: { skip: "Salta", back: "Indietro", next: "Avanti", done: "Capito", stepLabel: "Passo", steps: [
            { title: "Benvenuto su Screen To Street", desc: "Trasforma le tue scene K-pop preferite in luoghi reali da visitare davvero." },
            { title: "Esplora per destinazione", desc: "Sfoglia i paesi con luoghi reali di riprese e visita legati ai tuoi gruppi preferiti." },
            { title: "Esplora per artista", desc: "Scopri ogni gruppo e membro presente sul sito, e i luoghi a loro collegati." },
            { title: "Scegli la tua lingua", desc: "Passa a una delle 8 lingue disponibili per l'intero sito, in qualsiasi momento." },
            { title: "Crea il tuo account gratuito", desc: "Iscriviti per sbloccare la mappa interattiva e iniziare a creare il tuo itinerario." },
            { title: "Sei già membro?", desc: "Accedi di nuovo qui ogni volta che torni." }
        ]},
        pt: { skip: "Pular", back: "Voltar", next: "Próximo", done: "Entendi", stepLabel: "Passo", steps: [
            { title: "Bem-vindo ao Screen To Street", desc: "Transforme suas cenas de K-pop favoritas em lugares reais que você pode visitar de verdade." },
            { title: "Explore por destino", desc: "Percorra países com locais reais de filmagem e visita ligados aos seus grupos favoritos." },
            { title: "Explore por artista", desc: "Descubra cada grupo e membro presente no site, e os locais ligados a eles." },
            { title: "Escolha seu idioma", desc: "Mude todo o site para um dos 8 idiomas disponíveis, a qualquer momento." },
            { title: "Crie sua conta gratuita", desc: "Cadastre-se para desbloquear o mapa interativo e começar a criar seu próprio roteiro." },
            { title: "Já é membro?", desc: "Faça login novamente aqui sempre que voltar." }
        ]},
        ko: { skip: "건너뛰기", back: "이전", next: "다음", done: "확인", stepLabel: "단계", steps: [
            { title: "Screen To Street에 오신 것을 환영합니다", desc: "좋아하는 K-pop 장면을 실제로 방문할 수 있는 진짜 장소로 바꿔보세요." },
            { title: "여행지로 둘러보기", desc: "좋아하는 그룹과 관련된 실제 촬영지와 방문 장소가 있는 국가를 둘러보세요." },
            { title: "아티스트로 둘러보기", desc: "사이트에 있는 모든 그룹과 멤버, 그리고 그들과 관련된 장소를 확인해보세요." },
            { title: "언어 선택", desc: "언제든지 사이트 전체를 8개 언어 중 하나로 전환할 수 있습니다." },
            { title: "무료 계정 만들기", desc: "가입하고 인터랙티브 지도를 잠금 해제하여 나만의 일정을 만들어보세요." },
            { title: "이미 회원이신가요?", desc: "다시 방문할 때마다 여기서 로그인하세요." }
        ]},
        ja: { skip: "スキップ", back: "戻る", next: "次へ", done: "わかった", stepLabel: "ステップ", steps: [
            { title: "Screen To Streetへようこそ", desc: "お気に入りのK-popシーンを、実際に訪れることができる本物の場所に変えましょう。" },
            { title: "旅行先で探す", desc: "お気に入りのグループに関連した実際の撮影地や訪問スポットがある国を見てみましょう。" },
            { title: "アーティストで探す", desc: "サイトに登録されているすべてのグループとメンバー、そして関連する場所を発見しましょう。" },
            { title: "言語を選択", desc: "いつでもサイト全体を8つの言語のいずれかに切り替えられます。" },
            { title: "無料アカウントを作成", desc: "登録してインタラクティブマップのロックを解除し、自分だけの旅程を作成しましょう。" },
            { title: "すでに会員ですか？", desc: "戻ってきたときはいつでもここからログインしてください。" }
        ]},
        zh: { skip: "跳过", back: "上一步", next: "下一步", done: "知道了", stepLabel: "步骤", steps: [
            { title: "欢迎来到 Screen To Street", desc: "把你最喜欢的K-pop场景变成真正可以去参观的地方。" },
            { title: "按目的地探索", desc: "浏览与你喜欢的组合相关的真实取景地和打卡地点所在的国家。" },
            { title: "按艺人探索", desc: "发现网站收录的每个组合和成员，以及与他们相关的地点。" },
            { title: "选择语言", desc: "随时将整个网站切换为8种语言中的任意一种。" },
            { title: "创建免费账户", desc: "注册以解锁互动地图，开始规划属于你自己的行程。" },
            { title: "已经是会员了？", desc: "每次回来都可以在这里重新登录。" }
        ]}
    };

    let overlay, spotlight, tooltip, tourIndex = 0;

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

        overlay.querySelector('#tour-skip').addEventListener('click', closeTour);
        overlay.querySelector('#tour-back').addEventListener('click', () => goToStep(tourIndex - 1));
        overlay.querySelector('#tour-next').addEventListener('click', () => {
            const c = content();
            if (tourIndex >= c.steps.length - 1) { closeTour(); return; }
            goToStep(tourIndex + 1);
        });

        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;
            const c = content();
            if (e.key === 'Escape') closeTour();
            else if (e.key === 'ArrowRight') { if (tourIndex < c.steps.length - 1) goToStep(tourIndex + 1); else closeTour(); }
            else if (e.key === 'ArrowLeft') goToStep(tourIndex - 1);
        });
        window.addEventListener('resize', () => { if (overlay.classList.contains('open')) positionStep(); });
    }

    function goToStep(idx) {
        const c = content();
        if (idx < 0 || idx >= c.steps.length) return;
        tourIndex = idx;
        positionStep();
    }

    function positionStep() {
        const c = content();
        const step = c.steps[tourIndex];
        const targetEl = document.querySelector(TOUR_SELECTORS[tourIndex]);

        document.getElementById('tour-step-count').textContent = `${c.stepLabel} ${tourIndex + 1} / ${c.steps.length}`;
        document.getElementById('tour-title').textContent = step.title;
        document.getElementById('tour-desc').textContent = step.desc;
        document.getElementById('tour-skip').textContent = c.skip;
        const backBtn = document.getElementById('tour-back');
        backBtn.textContent = c.back;
        backBtn.disabled = tourIndex === 0;
        document.getElementById('tour-next').textContent = (tourIndex === c.steps.length - 1) ? c.done : c.next;

        if (!targetEl) {
            // Élément introuvable sur cet écran (langue/largeur particulière) : bulle centrée
            // sans surbrillance plutôt que de casser la visite guidée.
            spotlight.style.display = 'none';
            overlay.classList.add('no-target');
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }
        overlay.classList.remove('no-target');
        tooltip.style.transform = 'none';

        // Scroll instantané plutôt que "smooth" : un scroll animé mesuré après un délai fixe
        // (ou même une détection de stabilité image par image) peut être piégé par le
        // démarrage lent d'une courbe d'easing, qui ressemble à tort à une position déjà
        // stabilisée — le spotlight se retrouvait alors décalé de plusieurs dizaines de
        // pixels par rapport au vrai bouton. Un scroll instantané supprime complètement ce
        // problème de timing ; deux frames suffisent ensuite pour laisser le layout se
        // recalculer avant de mesurer la position réelle.
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
            // Si la bulle sortirait sous l'écran, on la place au-dessus de l'élément à la place.
            if (top + tooltipRect.height > window.innerHeight - 10) top = rect.top - tooltipRect.height - 16;
            if (top < 10) top = 10;
            const maxLeft = window.innerWidth - tooltipRect.width - 10;
            if (left > maxLeft) left = maxLeft;
            if (left < 10) left = 10;
            tooltip.style.top = top + 'px';
            tooltip.style.left = left + 'px';
        }));
    }

    function startTour() {
        if (!overlay) buildTourDOM();
        tourIndex = 0;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        positionStep();
    }

    function closeTour() {
        if (!overlay) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('see-demo-btn');
        if (btn) btn.addEventListener('click', startTour);
    });
})();
