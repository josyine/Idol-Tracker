// ==========================================
// MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Gère le badge (toujours visible sur la carte) et le panneau détaillé qu'il ouvre.
// S'appuie sur TOUR_MODE_DATA / MEMBER_EVENTS_DATA / getCurrentTourStop() /
// getCurrentMemberEvent() / getTourStopStatus() définis dans script.js (chargé avant ce
// fichier). Purement informatif et public : aucune donnée liée à un compte, donc affiché
// à l'identique en mode démo et pour un compte réel.
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

    function stopWidth() {
        return Math.max(900, TOUR_MODE_DATA.stops.length * 30);
    }

    function routePoints() {
        const stops = TOUR_MODE_DATA.stops;
        const n = stops.length;
        const now = getTourNow();
        const padX = 40, y = 55, w = stopWidth() - padX * 2;
        return stops.map((s, i) => ({
            x: padX + (n === 1 ? w / 2 : (w * i) / (n - 1)),
            y,
            status: getTourStopStatus(s, now)
        }));
    }

    function renderRoute() {
        const svg = document.getElementById('tour-mode-route-svg');
        if (!svg) return;
        const totalW = stopWidth();
        svg.setAttribute('viewBox', `0 0 ${totalW} 70`);
        svg.style.minWidth = totalW + 'px';
        const points = routePoints();
        const y = points[0].y;
        let html = `<line x1="${points[0].x}" y1="${y}" x2="${points[points.length - 1].x}" y2="${y}" stroke="#e2e8f0" stroke-width="3"/>`;

        let lastDoneIdx = -1;
        points.forEach((p, i) => { if (p.status === 'done' || p.status === 'current') lastDoneIdx = i; });
        if (lastDoneIdx >= 0) {
            html += `<line x1="${points[0].x}" y1="${y}" x2="${points[lastDoneIdx].x}" y2="${y}" stroke="#D42759" stroke-width="3"/>`;
        }

        points.forEach((p, i) => {
            const r = p.status === 'current' ? 9 : 6;
            const fill = p.status === 'upcoming' ? '#fff' : '#D42759';
            const stroke = p.status === 'upcoming' ? '#cbd5e1' : '#D42759';
            html += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" style="cursor:pointer;" onclick="tourModeGoToIndex(${i})"></circle>`;
            if (p.status === 'current') {
                html += `<circle cx="${p.x}" cy="${p.y}" r="9" fill="none" stroke="#D42759" stroke-width="2" opacity="0.55">
                    <animate attributeName="r" values="9;17;9" dur="1.8s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.55;0;0.55" dur="1.8s" repeatCount="indefinite"/>
                </circle>`;
            }
        });

        html += `<g id="tour-mode-plane" class="tour-mode-plane"><text x="0" y="0" text-anchor="middle" font-size="20">✈️</text></g>`;
        svg.innerHTML = html;
    }

    function updatePlanePosition() {
        const plane = document.getElementById('tour-mode-plane');
        if (!plane) return;
        const points = routePoints();
        const p = points[currentStopIndex];
        if (!p) return;
        plane.setAttribute('transform', `translate(${p.x}, ${p.y - 22})`);
        const wrap = document.querySelector('.tour-mode-route-wrap');
        if (wrap) {
            const target = p.x - wrap.clientWidth / 2;
            wrap.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        }
    }

    function renderStopCard(idx) {
        const stop = TOUR_MODE_DATA.stops[idx];
        const card = document.getElementById('tour-mode-stop-card');
        if (!stop || !card) return;
        const status = getTourStopStatus(stop, getTourNow());
        const tagClass = status === 'current' ? 'tour-mode-tag-live' : status === 'done' ? 'tour-mode-tag-done' : 'tour-mode-tag-upcoming';
        const tagLabel = status === 'current' ? t('tourModeLive') : status === 'done' ? t('tourModeDone') : t('tourModeUpcoming');
        const venueLine = stop.venue ? `<div class="tour-mode-stop-venue">${stop.venue}</div>` : '';
        card.innerHTML = `
            <div class="tour-mode-stop-card-top">
                <span class="tour-mode-stop-tag ${tagClass}">${tagLabel}</span>
                <span class="tour-mode-stop-dates">${fmtShowDates(stop.showDates)}</span>
            </div>
            <div class="tour-mode-stop-city">${stop.city}, ${stop.country}</div>
            ${venueLine}
        `;
        const idxEl = document.getElementById('tour-mode-stop-index');
        if (idxEl) idxEl.textContent = `${idx + 1} / ${TOUR_MODE_DATA.stops.length}`;
        const prevBtn = document.getElementById('tour-mode-prev');
        const nextBtn = document.getElementById('tour-mode-next');
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx === TOUR_MODE_DATA.stops.length - 1;
    }

    window.tourModeNavigate = function (delta) {
        currentStopIndex = Math.max(0, Math.min(TOUR_MODE_DATA.stops.length - 1, currentStopIndex + delta));
        renderStopCard(currentStopIndex);
        updatePlanePosition();
    };
    window.tourModeGoToIndex = function (idx) {
        currentStopIndex = Math.max(0, Math.min(TOUR_MODE_DATA.stops.length - 1, idx));
        renderStopCard(currentStopIndex);
        updatePlanePosition();
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

    window.openTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        const memberEvent = getCurrentMemberEvent();
        const groupStop = getCurrentTourStop();
        currentStopIndex = groupStop ? TOUR_MODE_DATA.stops.indexOf(groupStop) : 0;

        const titleEl = document.getElementById('tour-mode-panel-title');
        if (titleEl) titleEl.textContent = TOUR_MODE_DATA.tourName;
        const liveTagEl = document.getElementById('tour-mode-panel-livetag');
        if (liveTagEl) liveTagEl.textContent = groupStop ? `\u{1F534} ${t('tourModeLiveIn').replace('{city}', groupStop.city)}` : t('tourModeSchedule');

        renderMemberCard(memberEvent);
        renderRoute();
        renderStopCard(currentStopIndex);
        updatePlanePosition();

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
