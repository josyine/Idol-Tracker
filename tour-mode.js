// ==========================================
// MODE TOURNÉE EN DIRECT (Tour Mode)
// ==========================================
// Gère le badge (toujours visible sur la carte) et le panneau plein écran qu'il ouvre :
// une vraie carte Leaflet à gauche (même fond de carte que le reste du site, avec toutes
// les étapes et l'itinéraire de la tournée affichés par-dessus) et un rail clair à droite
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
    let tourModeLeafletMap = null;
    let tourModeMarkers = [];
    let liveMapMarker = null;

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

    // Vraie carte Leaflet (mêmes tuiles que le reste du site, voir createOSMTileLayer
    // dans script.js) avec l'itinéraire de la tournée affiché par-dessus : un marqueur
    // numéroté par étape (magenta = passée, mauve clair = à venir, grand marqueur sombre
    // qui pulse = étape sélectionnée) relié par un tracé en pointillés dans l'ordre réel
    // de la tournée. Recréée à chaque ouverture du panneau (comme itiLeafletMap pour
    // l'Auto-Itinerary Generator) car son conteneur est à taille nulle tant que le
    // panneau est masqué.
    function ensureMap() {
        const container = document.getElementById('tour-mode-map-container');
        if (!container || typeof L === 'undefined') return null;
        if (tourModeLeafletMap) { tourModeLeafletMap.remove(); tourModeLeafletMap = null; }
        tourModeLeafletMap = L.map('tour-mode-map-container', { zoomControl: false }).setView([20, 0], 2);
        createOSMTileLayer(tourModeLeafletMap).addTo(tourModeLeafletMap);
        L.control.zoom({ position: 'bottomright' }).addTo(tourModeLeafletMap);
        return tourModeLeafletMap;
    }

    function renderMap(fitAll) {
        const map = tourModeLeafletMap;
        if (!map) return;

        tourModeMarkers.forEach(m => map.removeLayer(m));
        tourModeMarkers = [];

        const latlngs = TOUR_MODE_DATA.stops.map(s => [s.lat, s.lng]);
        const routeLine = L.polyline(latlngs, { color: '#D42759', weight: 2, dashArray: '4 8', opacity: 0.85 }).addTo(map);
        tourModeMarkers.push(routeLine);

        const now = getTourNow();
        let activeLatLng = null;
        TOUR_MODE_DATA.stops.forEach((stop, i) => {
            const isActive = i === currentStopIndex;
            if (isActive) activeLatLng = [stop.lat, stop.lng];
            const status = getTourStopStatus(stop, now);
            const cls = isActive ? 'tour-mode-marker-active' : (status === 'upcoming' ? 'tour-mode-marker-upcoming' : 'tour-mode-marker-done');
            const size = isActive ? 28 : 22;
            const icon = L.divIcon({
                className: '',
                html: `<div style="position:relative;"><div class="tour-mode-marker ${cls}">${i + 1}</div>${isActive ? `<div class="tour-mode-marker-label">${stop.city}</div>` : ''}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            });
            const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
            marker.on('click', () => tourModeGoToIndex(i));
            tourModeMarkers.push(marker);
        });

        if (fitAll) {
            map.fitBounds(routeLine.getBounds(), { padding: [40, 40], maxZoom: 5 });
            setTimeout(() => map.invalidateSize(), 50);
        } else if (activeLatLng) {
            map.panTo(activeLatLng, { animate: true });
        }

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

    function refresh(fitAll) {
        renderMap(fitAll);
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

    // Sélecteur "Choisir une tournée" : liste toutes les tournées disponibles
    // (ALL_TOURS, définies dans script.js) — la tournée en cours (Arirang) en tête,
    // puis les tournées historiques par ordre chronologique inverse. En choisir une
    // change simplement la tournée AFFICHÉE dans ce panneau ; le badge "en direct" sur
    // la carte continue, lui, de ne regarder que la tournée réellement en cours (voir
    // getLiveTour() / LIVE_TOUR_ID côté script.js) — les tournées historiques restent
    // toujours "Terminé", ce qui est honnête.
    function renderTourSelect() {
        const label = document.getElementById('tour-mode-select-label');
        const menu = document.getElementById('tour-mode-select-menu');
        if (label) label.textContent = TOUR_MODE_DATA.tourName;
        if (menu) {
            menu.innerHTML = ALL_TOURS.map(tour => `
                <div class="tour-mode-select-option${tour.id === selectedTourId ? ' active' : ''}" onclick="tourModeSelectTour('${tour.id}')">
                    ${tour.tourName}${tour.id === selectedTourId ? ' <span>✓</span>' : ''}
                </div>
            `).join('');
        }
    }
    window.tourModeSelectTour = function (tourId) {
        selectedTourId = tourId;
        currentStopIndex = getDefaultStopIndex();
        renderTourSelect();
        refresh(true);
        const menu = document.getElementById('tour-mode-select-menu');
        if (menu) menu.classList.add('hidden');
    };
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
        selectedTourId = LIVE_TOUR_ID; // toujours repartir de la tournée en cours à l'ouverture
        const memberEvent = getCurrentMemberEvent();
        currentStopIndex = getDefaultStopIndex();

        renderTourSelect();
        renderMemberCard(memberEvent);
        renderRailList();
        renderStopInfo(currentStopIndex);
        scrollActiveNodeIntoView();

        panel.classList.remove('hidden');
        requestAnimationFrame(() => panel.classList.add('open'));

        // Le conteneur de la carte est à taille nulle tant que le panneau est masqué —
        // on attend la fin de la transition d'ouverture avant de créer la carte Leaflet,
        // sinon elle se dessinerait avec de mauvaises dimensions.
        setTimeout(() => { ensureMap(); renderMap(true); }, 320);
    };

    window.closeTourModePanel = function () {
        const panel = document.getElementById('tour-mode-panel');
        if (!panel) return;
        panel.classList.remove('open');
        setTimeout(() => {
            panel.classList.add('hidden');
            if (tourModeLeafletMap) { tourModeLeafletMap.remove(); tourModeLeafletMap = null; }
            tourModeMarkers = [];
        }, 300);
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

        renderLiveMapMarker(memberEvent || groupStop);
    };

    // Marqueur animé (pulsation) sur la VRAIE carte principale (pas seulement dans le
    // panneau Mode Tournée) à l'emplacement réel de ce qui est en cours — la tournée du
    // groupe, ou l'événement d'un membre seul s'il y en a un. `map` est la carte Leaflet
    // globale créée par script.js ; comme ce fichier se charge après, mais qu'une
    // condition d'affichage précoce (avant connexion, etc.) peut retarder sa création, on
    // retente une fois après un court délai si elle n'existe pas encore.
    let liveMarkerRetried = false;
    function renderLiveMapMarker(live) {
        if (typeof map === 'undefined' || !map) {
            if (!liveMarkerRetried) { liveMarkerRetried = true; setTimeout(() => renderLiveMapMarker(live), 800); }
            return;
        }
        if (liveMapMarker) { map.removeLayer(liveMapMarker); liveMapMarker = null; }
        if (!live) return;
        const icon = L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35); animation: tourModePulse 1.6s infinite;"></div>`,
            iconSize: [16, 16], iconAnchor: [8, 8]
        });
        liveMapMarker = L.marker([live.lat, live.lng], { icon, zIndexOffset: 2000 }).addTo(map);
        const label = live.member ? `${live.member} — ${live.eventName}<br>${live.city}, ${live.country}` : `🔴 ${TOUR_MODE_DATA.tourName}<br>${live.city}, ${live.country}`;
        liveMapMarker.bindTooltip(label, { direction: 'top', offset: [0, -8] });
    }

    // Balayage tactile (mobile) pour naviguer entre les étapes, en plus des boutons
    // Précédent/Suivant et du clic sur une étape — sans gêner le défilement vertical
    // normal de la liste du rail (on n'agit que si le geste est clairement horizontal).
    function attachSwipeNavigation(el) {
        if (!el) return;
        let startX = 0, startY = 0, tracking = false;
        el.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            tracking = true;
        }, { passive: true });
        el.addEventListener('touchend', (e) => {
            if (!tracking) return;
            tracking = false;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                tourModeNavigate(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }
    document.addEventListener('DOMContentLoaded', () => {
        window.initTourModeBadge();
        attachSwipeNavigation(document.getElementById('tour-mode-mapwrap') || document.querySelector('.tour-mode-mapwrap'));
        attachSwipeNavigation(document.getElementById('tour-mode-rail-list'));
        attachSwipeNavigation(document.querySelector('.tour-mode-stop-info'));
    });
})();
