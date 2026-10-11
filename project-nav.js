/* ── PROJECT NAV ──
   The panel behind the hamburger on every project page: a compact list of
   the work, so you can cross from one project straight to another instead of
   going back out to the orbit and finding it again.

   One file rather than markup pasted into twelve pages, because the list is
   the kind of thing that goes stale silently — a project renamed in eleven
   places and missed in the twelfth looks like a bug nobody can reproduce.
   Adding a project here adds it everywhere.

   The hamburger used to be a second link to the index, duplicating the
   "Work" crumb beside it. That crumb still goes back, so nothing is lost by
   giving the icon this job instead. Its href stays as the no-JS fallback. */
(function () {
    'use strict';

    /* Source order matches the orbit and the archive. CatOS is in here but
       has no orbit thumbnail, so this list is the only place it can be
       reached from — worth knowing before reordering anything. */
    var PROJECTS = [
        { href: 'pack-mentality.html',           title: 'PACK MENTALITY',           year: '2026' },
        { href: 'magi-website.html',             title: 'MAGI Website',             year: '2026' },
        { href: 'luminous-festival.html',        title: 'Luminous Festival',        year: '2025' },
        { href: 'cctv-installation.html',        title: 'CCTV Installation',        year: '2025' },
        { href: 'magi-expo-2025.html',           title: 'MAGI EXPO 2025',           year: '2025' },
        { href: 'held-instantaneously.html',     title: 'Held, Instantaneously',    year: '2025' },
        { href: 'magi-milk-bar.html',            title: 'Lost & Found Milk Bar',    year: '2025' },
        { href: 'catos.html',                    title: 'CatOS',                    year: '2025' },
        { href: 'digital-media-exhibition.html', title: 'Digital Media Exhibition', year: '2024' },
        { href: 'n0-r3ply-collective.html',      title: 'N0_R3PLY Collective',      year: '2024' },
        { href: 'neurometrix.html',              title: 'NeuroMetrix™',        year: '2023' },
        { href: 'sos2.html',                     title: 'S0S2',                     year: '2023' }
    ];

    var trigger = document.querySelector('.crumb a[aria-label="Back to index"]');
    if (!trigger) return;

    // last path segment, so it works from a sub-path or a trailing-slash URL
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    var scrim = document.createElement('div');
    scrim.className = 'proj-scrim';

    var panel = document.createElement('nav');
    panel.className = 'proj-panel';
    panel.setAttribute('aria-label', 'Projects');
    panel.setAttribute('tabindex', '-1');

    var rows = PROJECTS.map(function (p, i) {
        var current = p.href.toLowerCase() === here;
        return '<a class="proj-row' + (current ? ' is-current' : '') + '"' +
               ' href="' + p.href + '"' + (current ? ' aria-current="page"' : '') + '>' +
               '<span class="proj-n">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
               '<span class="proj-t">' + p.title + '</span>' +
               '<span class="proj-y">' + p.year + '</span>' +
               '</a>';
    }).join('');

    panel.innerHTML =
        '<div class="proj-head">' +
            '<span class="proj-label">Projects</span>' +
            '<button class="proj-close" type="button" aria-label="Close">×</button>' +
        '</div>' +
        '<div class="proj-list">' + rows + '</div>' +
        '<a class="proj-foot" href="index.html">All work →</a>';

    document.body.appendChild(scrim);
    document.body.appendChild(panel);

    var open = false;
    var lastFocus = null;

    function setOpen(want) {
        if (want === open) return;
        open = want;
        scrim.classList.toggle('is-open', want);
        panel.classList.toggle('is-open', want);
        trigger.setAttribute('aria-expanded', want ? 'true' : 'false');
        /* The page behind keeps its scroll position but must not scroll under
           the panel, which on a phone is the whole screen. */
        document.body.classList.toggle('proj-nav-open', want);

        if (want) {
            lastFocus = document.activeElement;
            panel.focus();
        } else if (lastFocus && lastFocus.focus) {
            lastFocus.focus();
        }
    }

    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', 'Open project list');
    trigger.setAttribute('aria-expanded', 'false');

    trigger.addEventListener('click', function (e) {
        // modified clicks keep the old behaviour: open the index in a new tab
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setOpen(!open);
    });

    scrim.addEventListener('click', function () { setOpen(false); });
    panel.querySelector('.proj-close').addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && open) setOpen(false);
    });
})();
