// ==========================================
// MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Gère le badge (toujours visible sur la carte) et le panneau plein écran qu'il ouvre :
// une carte décorative à gauche (route + étapes numérotées) et un rail clair à droite
// (sélecteur de tournée, liste complète des étapes, détail de l'étape sélectionnée,
// navigation précédent/suivant). S'appuie sur TOUR_MODE_DATA / MEMBER_EVENTS_DATA /
// getCurrentTourStop() / getCurrentMemberEvent() / getTourStopStatus() définis dans
// script.js (chargé avant ce fichier). Purement informatif et public : aucune donnée
// liée à un compte, donc affiché à l'identique en mode démo et pour un compte réel.
//
// À l'ouverture, l'étape affichée par défaut est la PROCHAINE à venir (celle en cours si
// une l'est déjà, sinon la suivante) — jamais un arrêt déjà passé au hasard. Si la
// tournée est entièrement terminée, on retombe sur sa toute première étape.
(function () {
    let currentStopIndex = 0;

    function fmtShowDates(showDates) {
        const locale = currentLang || 'en';
        const days = showDates.map(d => new Date(d + 'T00:00:00'));
        const groups = [];
        days.forEach(d => {
            const key = d.getFullYear() + '-' + d.getMonth();
            let g = groups[groups.length - 1];
            if (!g || g.key !== key) {
                g = { key, year: d.getFullYear(), month: d.toLocaleDateString(locale, { month: 'short' }), days: [] };
                groups.push(g);
            }
            g.days.push(d.getDate());
        });
        const segStrs = groups.map(g => `${g.month} ${g.days.join(', ')}`);
        const joined = segStrs.length === 1 ? segStrs[0] : segStrs.slice(0, -1).join(', ') + ' & ' + segStrs[segStrs.length - 1];
        return `${joined}, ${groups[groups.length - 1].year}`;
    }

    // La première étape non terminée (en cours, ou à venir) — jamais un arrêt déjà passé.
    // Si la tournée entière est terminée, on retombe sur la toute première étape.
    function getDefaultStopIndex() {
        const stops = TOUR_MODE_DATA.stops;
        const now = getTourNow();
        const idx = stops.findIndex(s => getTourStopStatus(s, now) !== 'done');
        return idx === -1 ? 0 : idx;
    }

    // Dispose tous les arrêts en "serpentin" (lignes successives, sens alterné) sur le
    // canevas de la carte — purement décoratif, pas une projection géographique réelle
    // (avec 34 étapes sur 5 continents, une vraie projection serait illisible).
    function routeLayout() {
        const stops = TOUR_MODE_DATA.stops;
        const n = stops.length;
        const w = 760, h = 620, marginX = 60, marginY = 70;
        const perRow = Math.min(n, 6);
        const rows = Math.ceil(n / perRow);
        const colGap = perRow > 1 ? (w - marginX * 2) / (perRow - 1) : 0;
        const rowGap = rows > 1 ? (h - marginY * 2) / (rows - 1) : 0;
        return stops.map((stop, i) => {
            const row = Math.floor(i / perRow);
            let col = i % perRow;
            if (row % 2 === 1) col = perRow - 1 - col;
            return { x: marginX + col * colGap, y: marginY + row * rowGap, status: getTourStopStatus(stop, getTourNow()) };
        });
    }

    function pathD(pts) {
        if (pts.length < 2) return '';
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let k = 1; k < pts.length; k++) {
            const p0 = pts[k - 1], p1 = pts[k];
            const midX = (p0.x + p1.x) / 2;
            d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
        }
        return d;
    }

    function drawDecorativeRoads(svg, w, h) {
        let s = '';
        for (let i = 0; i < 6; i++) {
            const y = (h / 7) * (i + 1) + (i % 2 ? 14 : -10);
            s += `<path class="tour-mode-map-road" d="M0 ${y} Q ${w * 0.3} ${y - 40} ${w * 0.55} ${y + 10} T ${w} ${y - 20}"/>`;
        }
        for (let i = 0; i < 4; i++) {
            const x = (w / 5) * (i + 1);
            s += `<path class="tour-mode-map-road" d="M${x} 0 Q ${x + 30} ${h * 0.4} ${x - 20} ${h}"/>`;
        }
        svg.insertAdjacentHTML('beforeend', s);
    }

    function renderMap() {
        const svg = document.getElementById('tour-mode-map-svg');
        if (!svg) return;
        const w = 760, h = 620;
        svg.innerHTML = '';
        drawDecorativeRoads(svg, w, h);

        const points = routeLayout();
        const d = pathD(points);
        svg.insertAdjacentHTML('beforeend', `<path class="tour-mode-route-path-glow" d="${d}"/><path class="tour-mode-route-path" d="${d}"/>`);

        TOUR_MODE_DATA.stops.forEach((stop, i) => {
            const p = points[i];
            const isActive = i === currentStopIndex;
            const fill = p.status === 'done' ? '#171331' : (isActive ? 'var(--primary-magenta)' : '#c9bfe0');
            let html = '';
            if (isActive) {
                html += `<circle class="tour-mode-pulse-ring" cx="${p.x}" cy="${p.y}" r="9"/><circle class="tour-mode-pulse-ring tour-mode-pulse-ring2" cx="${p.x}" cy="${p.y}" r="9"/>`;
            }
            html += `<g class="${isActive ? 'tour-mode-marker-active' : ''}" style="cursor:pointer;" onclick="tourModeGoToIndex(${i})">
                <circle cx="${p.x}" cy="${p.y}" r="9" fill="${fill}" stroke="#fff" stroke-width="2"/>
                <text class="tour-mode-marker-num" x="${p.x}" y="${p.y + 0.5}">${i + 1}</text>
            </g>`;
            html += `<text class="tour-mode-marker-label" x="${p.x + 13}" y="${p.y + 3}" style="cursor:pointer;" onclick="tourModeGoToIndex(${i})">${stop.city}</text>`;
            svg.insertAdjacentHTML('beforeend', html);
        });

        const pillEl = document.getElementById('tour-mode-map-pill');
        if (pillEl) pillEl.textContent = t('tourModeStep').replace('{n}', currentStopIndex + 1).replace('{total}', TOUR_MODE_DATA.stops.length);
    }

    function renderRailList() {
        const list = document.getElementById('tour-mode-rail-list');
        if (!list) return;
        list.innerHTML = TOUR_MODE_DATA.stops.map((stop, i) => {
            const status = getTourStopStatus(stop, getTourNow());
            const cls = i === currentStopIndex ? 'active' : (status === 'done' ? 'done' : '');
            return `<div class="tour-mode-rnode ${cls}" onclick="tourModeGoToIndex(${i})">
                <div class="tour-mode-rnode-num">${i + 1}</div>
                <div class="tour-mode-rnode-tx"><b>${stop.city}</b><span>${fmtShowDates(stop.showDates)}</span></div>
            </div>`;
        }).join('');
    }

    function renderStopInfo(idx) {
        const stop = TOUR_MODE_DATA.stops[idx];
        if (!stop) return;
        const status = getTourStopStatus(stop, getTourNow());
        const tagRow = document.getElementById('tour-mode-stop-tag-row');
        const tagText = document.getElementById('tour-mode-stop-tag-text');
        const titleEl = document.getElementById('tour-mode-stop-title');
        const subEl = document.getElementById('tour-mode-stop-sub');
        if (!tagRow || !tagText || !titleEl || !subEl) return;

        tagRow.className = 'tour-mode-stop-tag-row ' + (status === 'current' ? 'tour-mode-tag-live' : status === 'done' ? 'tour-mode-tag-done' : 'tour-mode-tag-upcoming');
        tagText.textContent = status === 'current' ? t('tourModeLive') : status === 'done' ? t('tourModeDone') : t('tourModeUpcoming');
        titleEl.textContent = stop.venue ? `${stop.venue} — ${stop.city}` : `${stop.city}, ${stop.country}`;
        subEl.textContent = `${fmtShowDates(stop.showDates)} · ${t('tourModeStep').replace('{n}', idx + 1).replace('{total}', TOUR_MODE_DATA.stops.length)}`;

        const prevBtn = document.getElementById('tour-mode-prev');
        const nextBtn = document.getElementById('tour-mode-next');
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx === TOUR_MODE_DATA.stops.length - 1;
    }

    function scrollActiveNodeIntoView() {
        const list = document.getElementById('tour-mode-rail-list');
        const active = list && list.querySelector('.tour-mode-rnode.active');
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function refresh() {
        renderMap();
        renderRailList();
        renderStopInfo(currentStopIndex);
        scrollActiveNodeIntoView();
    }

    window.tourModeNavigate = function (delta) {
        currentStopIndex = Math.max(0, Math.min(TOUR_MODE_DATA.stops.length - 1, currentStopIndex + delta));
        refresh();
    };
    window.tourModeGoToIndex = function (idx) {
        currentStopIndex = Math.max(0, Math.min(TOUR_MODE_DATA.stops.length - 1, idx));
        refresh();
    };

    function renderMemberCard(memberEvent) {
        const card = document.getElementById('tour-mode-member-card');
        if (!card) return;
        if (!memberEvent) { card.classList.add('hidden'); card.innerHTML = ''; return; }
        card.classList.remove('hidden');
        card.innerHTML = `
            <span class="tour-mode-member-dot"></span>
            <div>
                <div class="tour-mode-member-name">${memberEvent.member} — ${memberEvent.eventName}</div>
                <div class="tour-mode-member-place">${memberEvent.city}, ${memberEvent.country}</div>
            </div>
        `;
    }

    // Sélecteur "Choisir une tournée" : une seule tournée dans les données pour
    // l'instant, mais la liste est déjà générée dynamiquement pour ne rien avoir à
    // changer ici le jour où une deuxième tournée (ou celle d'un autre groupe) sera
    // ajoutée à TOUR_MODE_DATA.
    function renderTourSelect() {
        const label = document.getElementById('tour-mode-select-label');
        const menu = document.getElementById('tour-mode-select-menu');
        if (label) label.textContent = TOUR_MODE_DATA.tourName;
        if (menu) {
            menu.innerHTML = `<div class="tour-mode-select-option active">${TOUR_MODE_DATA.tourName} <span>✓</span></div>`;
        }
    }
    window.tourModeToggleSelect = function (e) {
        e.stopPropagation();
        const menu = document.getElementById('tour-mode-select-menu');
        if (menu) menu.classList.toggle('hidden');
    };
    document.addEventListener('click', () => {
        const menu = document.getElementById('tour-mode-select-menu');
        if (menu) menu.classList.add('hidden');
    });

    window.openTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        const memberEvent = getCurrentMemberEvent();
        currentStopIndex = getDefaultStopIndex();

        renderTourSelect();
        renderMemberCard(memberEvent);
        refresh();

        panel.classList.remove('hidden');
        requestAnimationFrame(() => panel.classList.add('open'));
    };

    window.closeTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        panel.classList.remove('open');
        setTimeout(() => panel.classList.add('hidden'), 300);
    };

    window.initTourModeBadge = function () {
        const badge = document.getElementById('tour-mode-badge');
        if (!badge) return;
        const textEl = document.getElementById('tour-mode-badge-text');
        const memberEvent = getCurrentMemberEvent();
        const groupStop = getCurrentTourStop();

        badge.classList.remove('hidden');
        if (memberEvent) {
            badge.classList.add('tour-mode-badge-live');
            if (textEl) textEl.textContent = t('tourModeMemberLiveIn').replace('{member}', memberEvent.member).replace('{event}', memberEvent.eventName).replace('{city}', memberEvent.city);
        } else if (groupStop) {
            badge.classList.add('tour-mode-badge-live');
            if (textEl) textEl.textContent = t('tourModeLiveIn').replace('{city}', groupStop.city);
        } else {
            badge.classList.remove('tour-mode-badge-live');
            if (textEl) textEl.textContent = t('tourModeGenericLabel');
        }
    };

    document.addEventListener('DOMContentLoaded', window.initTourModeBadge);
})();
