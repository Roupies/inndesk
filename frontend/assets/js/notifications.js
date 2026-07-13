// @file: assets/js/notifications.js
// Notification bell — injected into every page's topbar via app.js.
// Sources: arrivals today (confirmed), departures today (checked_in), dirty rooms.
// No new backend endpoints — uses existing GET /reservations/ and GET /housekeeping/.

(function () {
    const STORAGE_KEY = 'inndesk_notif_read';

    // --- CSS -----------------------------------------------------------------

    const style = document.createElement('style');
    style.textContent = `
        .notif-wrapper {
            position: relative;
        }

        .notif-bell-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: var(--space-2);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            transition: background 0.15s;
        }

        .notif-bell-btn:hover,
        .notif-bell-btn:focus-visible {
            background: var(--bg-secondary);
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }

        .notif-badge {
            position: absolute;
            top: 4px;
            right: 4px;
            background: var(--color-red, #ef4444);
            color: #fff;
            font-size: 0.65rem;
            font-weight: 700;
            min-width: 16px;
            height: 16px;
            border-radius: 8px;
            padding: 0 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }

        .notif-badge[hidden] {
            display: none;
        }

        .notif-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 340px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,.15));
            z-index: 500;
            display: none;
            flex-direction: column;
            max-height: 420px;
        }

        .notif-dropdown.open {
            display: flex;
        }

        .notif-dropdown-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3) var(--space-4);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
        }

        .notif-dropdown-title {
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }

        .notif-mark-read-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: var(--text-sm);
            color: var(--color-primary, #1a5f7a);
            padding: 0;
            text-decoration: underline;
        }

        .notif-mark-read-btn:hover,
        .notif-mark-read-btn:focus-visible {
            opacity: 0.8;
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }

        .notif-list {
            overflow-y: auto;
            flex: 1;
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .notif-item {
            display: flex;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            border-bottom: 1px solid var(--border);
            transition: background 0.1s;
        }

        .notif-item:last-child {
            border-bottom: none;
        }

        .notif-item:hover {
            background: var(--bg-secondary);
        }

        .notif-item.read {
            opacity: 0.45;
        }

        .notif-icon {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }

        .notif-icon--arrival  { background: #dcfce7; }
        .notif-icon--departure { background: #dbeafe; }
        .notif-icon--dirty    { background: #fff7ed; }

        .notif-body {
            flex: 1;
            min-width: 0;
        }

        .notif-msg {
            font-size: var(--text-sm);
            color: var(--text-primary);
            margin: 0 0 2px;
            line-height: 1.35;
        }

        .notif-time {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .notif-empty {
            padding: var(--space-6) var(--space-4);
            text-align: center;
            font-size: var(--text-sm);
            color: var(--text-secondary);
        }

        .notif-loading {
            padding: var(--space-4);
            text-align: center;
            font-size: var(--text-sm);
            color: var(--text-secondary);
        }
    `;
    document.head.appendChild(style);

    // --- DOM -----------------------------------------------------------------

    function buildBell() {
        const wrapper = document.createElement('div');
        wrapper.className = 'notif-wrapper';

        const btn = document.createElement('button');
        btn.className = 'notif-bell-btn';
        btn.id = 'notifBellBtn';
        btn.setAttribute('aria-label', 'Notifications');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-haspopup', 'true');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>`;

        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.id = 'notifBadge';
        badge.setAttribute('aria-live', 'polite');
        badge.setAttribute('aria-label', '0 notifications');
        badge.hidden = true;
        btn.appendChild(badge);

        const dropdown = document.createElement('div');
        dropdown.className = 'notif-dropdown';
        dropdown.id = 'notifDropdown';
        dropdown.setAttribute('role', 'menu');
        dropdown.setAttribute('aria-label', 'Notifications');

        dropdown.innerHTML = `
            <div class="notif-dropdown-header">
                <p class="notif-dropdown-title">Notifications</p>
                <button class="notif-mark-read-btn" id="notifMarkReadBtn">Tout marquer comme lu</button>
            </div>
            <ul class="notif-list" id="notifList" role="list">
                <li class="notif-loading">Chargement…</li>
            </ul>
        `;

        wrapper.appendChild(btn);
        wrapper.appendChild(dropdown);
        return wrapper;
    }

    // --- State ----------------------------------------------------------------

    let notifications = [];

    function getReadIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
        } catch {
            return new Set();
        }
    }

    function saveReadIds(ids) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    }

    function unreadCount() {
        const read = getReadIds();
        return notifications.filter(n => !read.has(n.id)).length;
    }

    // --- Render ---------------------------------------------------------------

    function updateBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        const count = unreadCount();
        badge.hidden = count === 0;
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.setAttribute('aria-label', `${count} notification${count > 1 ? 's' : ''}`);
    }

    function renderList() {
        const list = document.getElementById('notifList');
        if (!list) return;
        const read = getReadIds();

        if (notifications.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'notif-empty';
            empty.textContent = 'Aucune notification';
            list.replaceChildren(empty);
            return;
        }

        list.replaceChildren();
        notifications.forEach(n => {
            const li = document.createElement('li');
            li.className = 'notif-item' + (read.has(n.id) ? ' read' : '');
            li.setAttribute('role', 'menuitem');

            const icon = document.createElement('div');
            const supportedTypes = new Set(['arrival', 'departure', 'dirty']);
            const type = supportedTypes.has(n.type) ? n.type : 'arrival';
            icon.className = `notif-icon notif-icon--${type}`;
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = n.emoji;

            const body = document.createElement('div');
            body.className = 'notif-body';

            const message = document.createElement('p');
            message.className = 'notif-msg';
            message.textContent = n.message;

            const time = document.createElement('span');
            time.className = 'notif-time';
            time.textContent = "Aujourd'hui";

            body.append(message, time);
            li.append(icon, body);
            list.appendChild(li);
        });
    }

    // --- Fetch ---------------------------------------------------------------

    async function fetchNotifications() {
        if (!getToken || !getToken()) return;

        const today = new Date().toISOString().split('T')[0];
        const result = [];

        try {
            const [arrivals, departures, rooms] = await Promise.all([
                apiFetch(`/reservations/?reservation_status=confirmed&limit=200`),
                apiFetch(`/reservations/?reservation_status=checked_in&limit=200`),
                apiFetch('/housekeeping/')
            ]);

            arrivals
                .filter(r => r.check_in_date === today)
                .forEach(r => {
                    const client = r.client
                        ? `${r.client.first_name} ${r.client.last_name}`
                        : `Réservation #${r.id}`;
                    const room = r.room?.number || (r.room_id ? `#${r.room_id}` : 'non assignée');
                    result.push({
                        id: `arrival-${r.id}`,
                        type: 'arrival',
                        emoji: '🛬',
                        message: `Check-in prévu aujourd'hui — ${client}, chambre ${room}`
                    });
                });

            departures
                .filter(r => r.check_out_date === today)
                .forEach(r => {
                    const client = r.client
                        ? `${r.client.first_name} ${r.client.last_name}`
                        : `Réservation #${r.id}`;
                    const room = r.room?.number || (r.room_id ? `#${r.room_id}` : '?');
                    result.push({
                        id: `departure-${r.id}`,
                        type: 'departure',
                        emoji: '🛫',
                        message: `Check-out prévu aujourd'hui — ${client}, chambre ${room}`
                    });
                });

            rooms
                .filter(r => r.status === 'dirty')
                .forEach(r => {
                    result.push({
                        id: `dirty-${r.id}`,
                        type: 'dirty',
                        emoji: '🧹',
                        message: `Chambre à nettoyer — ${r.number} (${r.room_type_name || ''})`
                    });
                });

        } catch (_) {
        }

        notifications = result;
        renderList();
        updateBadge();
    }

    // --- Toggle ---------------------------------------------------------------

    function openDropdown() {
        const dropdown = document.getElementById('notifDropdown');
        const btn = document.getElementById('notifBellBtn');
        if (!dropdown || !btn) return;
        dropdown.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        const dropdown = document.getElementById('notifDropdown');
        const btn = document.getElementById('notifBellBtn');
        if (!dropdown || !btn) return;
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
    }

    // --- Init -----------------------------------------------------------------

    function initNotifications() {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        if (document.getElementById('notifBellBtn')) return;

        const bellWrapper = buildBell();

        const themeToggle = topbar.querySelector('#themeToggle');
        if (themeToggle) {
            let group = topbar.querySelector('.topbar-actions');
            if (!group) {
                group = document.createElement('div');
                group.className = 'topbar-actions';
                group.style.cssText = 'display:flex;align-items:center;gap:var(--space-2);';
                themeToggle.parentNode.insertBefore(group, themeToggle);
                group.appendChild(themeToggle);
            }
            group.insertBefore(bellWrapper, group.firstChild);
        } else {
            topbar.appendChild(bellWrapper);
        }

        document.getElementById('notifBellBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('notifDropdown');
            if (dropdown.classList.contains('open')) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        document.getElementById('notifMarkReadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const ids = new Set(notifications.map(n => n.id));
            saveReadIds(ids);
            renderList();
            updateBadge();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notif-wrapper')) {
                closeDropdown();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDropdown();
        });

        fetchNotifications();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotifications);
    } else {
        initNotifications();
    }
})();
