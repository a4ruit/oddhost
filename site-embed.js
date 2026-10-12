/* ── LIVE SITE EMBED ──
   Scales an embedded website down to fit whatever column it is sitting in.

   The site inside is laid out at a desktop width and then scaled, rather than
   handed a narrow iframe. That distinction matters for the work this is used
   on: these are scenes whose camera framing and UI respond to the viewport,
   so a 560px frame would not show a smaller version of the site — it would
   show a different composition. Laying it out at --ew and scaling the result
   keeps the framing the work was built for.

   The ratio has to be computed here because CSS cannot divide a length by a
   length to recover a scale factor. Each .site-embed declares its layout size
   in --ew / --eh (unitless) and this writes back --escale.

   Below the mobile breakpoint the stylesheet drops the trick entirely and the
   iframe runs at its own width — on a phone the site's real mobile layout is
   what belongs there, and scaling a 1280px page into a 340px column would
   make it unreadable. So --escale is cleared rather than fought over. */
(function () {
    'use strict';

    /* ── INSTAGRAM, SELF-SIZING ──
       Instagram's embed endpoint posts {type:'MEASURE', details:{height}} to
       its parent as the card settles, and again whenever it reflows. Reading
       that is what their embed.js does; doing it here is eight lines instead
       of a third-party bundle.

       The message is matched to the iframe by comparing event.source against
       each frame's contentWindow — not by trusting anything in the payload,
       and only from an instagram.com origin. */
    var igFrames = [].slice.call(document.querySelectorAll('.ig-frame'));
    if (igFrames.length) {
        window.addEventListener('message', function (e) {
            if (!/^https?:\/\/(www\.)?instagram\.com$/.test(e.origin)) return;

            var data = e.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (err) { return; }
            }
            if (!data || data.type !== 'MEASURE' || !data.details) return;

            var h = parseInt(data.details.height, 10);
            if (!h || h < 120 || h > 4000) return;

            igFrames.forEach(function (f) {
                if (f.contentWindow === e.source) f.style.height = h + 'px';
            });
        });
    }

    var boxes = [].slice.call(document.querySelectorAll('.site-embed'));
    if (!boxes.length) return;

    function fitOne(box) {
        /* Measured on the SCREEN, not on the embed. The frame around it has a
           border, so the box is a couple of pixels wider than the area the
           iframe is actually scaled into — deriving the ratio from the outer
           width left a hairline of letterbox inside the frame. */
        var screen = box.querySelector('.site-screen');
        var w = screen ? screen.clientWidth : box.clientWidth;
        if (!w) return;
        var ew = parseFloat(getComputedStyle(box).getPropertyValue('--ew')) || 1280;

        /* A card has a fixed design and no mobile layout of its own, so it
           keeps scaling at every width. Everything else hands the phone its
           own layout instead of a shrunken desktop one. */
        if (window.innerWidth <= 900 && !box.classList.contains('is-card')) {
            box.style.removeProperty('--escale');
            return;
        }
        box.style.setProperty('--escale', (w / ew).toFixed(4));
    }

    function fitAll() { boxes.forEach(fitOne); }

    /* ── CLICK TO PLAY ──
       An embed whose iframe carries data-src instead of src is not loaded
       until its poster is pressed. The poster is REMOVED rather than hidden:
       left in the DOM it would sit over the frame and swallow the first
       click of something that is nothing but clicks. */
    boxes.forEach(function (box) {
        var poster = box.querySelector('.site-poster');
        var frame = box.querySelector('iframe[data-src]');
        if (!poster || !frame) return;

        poster.addEventListener('click', function () {
            frame.src = frame.getAttribute('data-src');
            frame.removeAttribute('data-src');
            frame.hidden = false;
            poster.remove();
            frame.focus();
        }, { once: true });
    });

    fitAll();
    window.addEventListener('resize', fitAll);

    if ('ResizeObserver' in window) {
        var ro = new ResizeObserver(function (entries) {
            entries.forEach(function (e) { fitOne(e.target); });
        });
        boxes.forEach(function (b) { ro.observe(b); });
    }
})();
