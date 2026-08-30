// ==========================================
// MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Gère le badge "Live now" sur la carte et le panneau détaillé qu'il ouvre.
// S'appuie sur TOUR_MODE_DATA / getCurrentTourStop() / getTourStopStatus() définis
// dans script.js (chargé avant ce fichier). Purement informatif et public : aucune
// donnée liée à un compte, donc affiché à l'identique en mode démo et pour un compte réel.
(function () {
    let currentStopIndex = 0;

    function fmtDateRange(stop) {
        const opts = { month: 'short', day: 'numeric' };
        const locale = currentLang || 'en';
        const s = new Date(stop.dateStart + 'T00:00:00');
        const e = new Date(stop.dateEnd + 'T00:00:00');
        try {
            if (stop.dateStart === stop.dateEnd) return s.toLocaleDateString(locale, Object.assign({}, opts, { year: 'numeric' }));
            return `${s.toLocaleDateString(locale, opts)} – ${e.toLocaleDateString(locale, Object.assign({}, opts, { year: 'numeric' }))}`;
        } catch (err) {
            return `${stop.dateStart} – ${stop.dateEnd}`;
        }
    }

    function routePoints() {
        const stops = TOUR_MODE_DATA.stops;
        const n = stops.length;
        const now = getTourNow();
        const padX = 40, y = 55, w = 900 - padX * 2;
        return stops.map((s, i) => ({
            x: padX + (n === 1 ? w / 2 : (w * i) / (n - 1)),
            y,
            status: getTourStopStatus(s, now)
        }));
    }

    function renderRoute() {
        const svg = document.getElementById('tour-mode-route-svg');
        if (!svg) return;
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
    }

    function renderStopCard(idx) {
        const stop = TOUR_MODE_DATA.stops[idx];
        const card = document.getElementById('tour-mode-stop-card');
        if (!stop || !card) return;
        const status = getTourStopStatus(stop, getTourNow());
        const tagClass = status === 'current' ? 'tour-mode-tag-live' : status === 'done' ? 'tour-mode-tag-done' : 'tour-mode-tag-upcoming';
        const tagLabel = status === 'current' ? t('tourModeLive') : status === 'done' ? t('tourModeDone') : t('tourModeUpcoming');
        card.innerHTML = `
            <div class="tour-mode-stop-card-top">
                <span class="tour-mode-stop-tag ${tagClass}">${tagLabel}</span>
                <span class="tour-mode-stop-dates">${fmtDateRange(stop)}</span>
            </div>
            <div class="tour-mode-stop-city">${stop.city}, ${stop.country}</div>
            <div class="tour-mode-stop-venue">${stop.venue}</div>
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

    window.openTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        const liveStop = getCurrentTourStop();
        currentStopIndex = liveStop ? TOUR_MODE_DATA.stops.indexOf(liveStop) : 0;

        const titleEl = document.getElementById('tour-mode-panel-title');
        if (titleEl) titleEl.textContent = TOUR_MODE_DATA.tourName;
        const liveTagEl = document.getElementById('tour-mode-panel-livetag');
        if (liveTagEl) liveTagEl.textContent = liveStop ? `\u{1F534} ${t('tourModeLiveIn').replace('{city}', liveStop.city)}` : t('tourModeSchedule');

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
        const stop = getCurrentTourStop();
        if (!stop) { badge.classList.add('hidden'); return; }
        const textEl = document.getElementById('tour-mode-badge-text');
        if (textEl) textEl.textContent = t('tourModeLiveIn').replace('{city}', stop.city);
        badge.classList.remove('hidden');
    };

    document.addEventListener('DOMContentLoaded', window.initTourModeBadge);
})();
