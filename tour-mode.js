// ==========================================
// MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Gère le badge (toujours visible sur la carte) et le panneau détaillé qu'il ouvre.
// S'appuie sur TOUR_MODE_DATA / MEMBER_EVENTS_DATA / getCurrentTourStop() /
// getCurrentMemberEvent() / getTourStopStatus() définis dans script.js (chargé avant ce
// fichier). Purement informatif et public : aucune donnée liée à un compte, donc affiché
// à l'identique en mode démo et pour un compte réel.
//
// Le panneau affiche une fenêtre glissante de 5 étapes maximum (2 avant, l'étape
// affichée, 2 après) plutôt que les 34 arrêts d'un coup — la tournée réelle est bien trop
// longue pour tenir sur une seule route lisible. Naviguer précédent/suivant fait glisser
// cette fenêtre. Le sélecteur "Choisir une tournée" liste les tournées disponibles dans
// TOUR_MODE_DATA (une seule pour l'instant) — prêt à en accueillir d'autres plus tard sans
// changement de structure.
//
// Priorité d'affichage du badge : un événement solo d'un membre (ex: Jimin en fashion
// week) prime sur la tournée du groupe, car c'est l'info la plus spécifique du moment.
// Si rien n'est en cours, le badge reste visible mais affiche un libellé générique
// ("Tournée"/"Tour") — cliquer dessus ouvre quand même le calendrier complet.
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

    // Fenêtre de 5 arrêts maximum centrée sur `current`, bornée aux limites du tableau.
    function windowIndices(current, total) {
        const size = Math.min(5, total);
        let start = current - Math.floor((size - 1) / 2);
        start = Math.max(0, Math.min(start, total - size));
        return Array.from({ length: size }, (_, i) => start + i);
    }

    function routePoints() {
        const stops = TOUR_MODE_DATA.stops;
        const now = getTourNow();
        const idxs = windowIndices(currentStopIndex, stops.length);
        const padX = 70, w = 700 - padX * 2, baseY = 95, amp = 30;
        return idxs.map((stopIdx, j) => ({
            stopIdx,
            x: idxs.length === 1 ? 350 : padX + (w * j) / (idxs.length - 1),
            y: baseY + amp * Math.sin(j * 2.4),
            status: getTourStopStatus(stops[stopIdx], now)
        }));
    }

    function renderRoute() {
        const svg = document.getElementById('tour-mode-route-svg');
        if (!svg) return;
        const points = routePoints();

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let k = 1; k < points.length; k++) {
            const p0 = points[k - 1], p1 = points[k];
            const midX = (p0.x + p1.x) / 2;
            d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
        }
        let html = `<path d="${d}" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="1 8" stroke-linecap="round"/>`;

        points.forEach(p => {
            const stop = TOUR_MODE_DATA.stops[p.stopIdx];
            const isCurrent = p.stopIdx === currentStopIndex;
            const r = isCurrent ? 9 : 6;
            const fill = isCurrent ? '#211C2E' : p.status === 'upcoming' ? '#fff' : '#D42759';
            const stroke = p.status === 'upcoming' && !isCurrent ? '#cbd5e1' : isCurrent ? '#211C2E' : '#D42759';
            const labelBelow = p.y < 95;
            const labelY = labelBelow ? p.y + 22 : p.y - 16;
            const labelClass = isCurrent ? 'tour-mode-route-label tour-mode-route-label-current' : 'tour-mode-route-label';

            html += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" style="cursor:pointer;" onclick="tourModeGoToIndex(${p.stopIdx})"></circle>`;
            html += `<text x="${p.x}" y="${labelY}" text-anchor="middle" class="${labelClass}" style="cursor:pointer;" onclick="tourModeGoToIndex(${p.stopIdx})">${stop.city}</text>`;

            if (isCurrent) {
                html += `<g id="tour-mode-plane" class="tour-mode-plane-pin" transform="translate(${p.x + 16}, ${p.y - 34})">
                    <circle r="13" fill="#ef4444"></circle>
                    <circle r="9" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.55">
                        <animate attributeName="r" values="9;17;9" dur="1.8s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.55;0;0.55" dur="1.8s" repeatCount="indefinite"/>
                    </circle>
                    <text y="5" text-anchor="middle" font-size="13">✈️</text>
                </g>`;
            }
        });

        svg.innerHTML = html;
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

    function refresh() {
        renderRoute();
        renderStopInfo(currentStopIndex);
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
        const titleEl = document.getElementById('tour-mode-panel-title');
        if (label) label.textContent = TOUR_MODE_DATA.tourName;
        if (titleEl) titleEl.textContent = TOUR_MODE_DATA.tourName;
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
        const groupStop = getCurrentTourStop();
        currentStopIndex = groupStop ? TOUR_MODE_DATA.stops.indexOf(groupStop) : 0;

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
        setTimeout(() => panel.classList.add('hidden'), 350);
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
