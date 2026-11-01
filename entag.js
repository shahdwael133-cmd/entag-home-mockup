/* The order ticket: everything bespoke to this page. The engine stays untouched. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var peak = $('.peak'), hero = $('.hero'), close = $('.close');
  var rows = $$('[data-row]'), stamp = $('[data-stamp]');
  var dock = $('[data-dock]'), dockState = $('[data-dock-state]'), mbar = $('[data-mbar]');
  var jumps = $$('[data-jump]');
  var STEPS = 5;

  /* ---------------------------------------- the order film (canvas) ---- */
  // 156 real frames. Rough pass first so it plays at once, then the gaps fill in.
  var FRAMES = 156, STOPS = [0, 40, 66, 100, 128, 155];
  var canvas = $('[data-film]'), ctx = canvas.getContext('2d'), frames = [], loaded = [];
  var want = 0, cur = 0, drawn = -1, started = false;
  function name(n) { return 'assets/film/' + ('00' + n).slice(-3) + '.webp'; }
  function queue() {
    var order = [], seen = {};
    [12, 6, 3, 1].forEach(function (g) {
      for (var n = 0; n < FRAMES; n += g) if (!seen[n]) { seen[n] = 1; order.push(n); }
    });
    if (!seen[FRAMES - 1]) order.push(FRAMES - 1);
    return order;
  }
  function startLoading() {
    if (started) return;
    started = true;
    var order = queue(), at = 0;
    function next() {
      if (at >= order.length) return;
      var n = order[at++], im = new Image();
      im.onload = function () { frames[n] = im; loaded[n] = true; if (n === 0 && drawn < 0) draw(0); next(); };
      im.onerror = next;
      im.src = name(n);
    }
    for (var i = 0; i < 6; i++) next();
  }
  function nearest(n) {
    for (var d = 0; d < FRAMES; d++) {
      if (loaded[n - d]) return n - d;
      if (loaded[n + d]) return n + d;
    }
    return -1;
  }
  function draw(n) {
    var k = nearest(n);
    if (k < 0 || k === drawn) return;
    ctx.drawImage(frames[k], 0, 0, 720, 900);
    drawn = k;
  }
  if ('IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(function (e) { if (e[0].isIntersecting) startLoading(); }, { rootMargin: '160% 0px' }).observe(peak);
  } else if (!reduce) { startLoading(); }

  /* ------------------------------------------------ the peak's stages ---- */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  var lastStep = -1;

  function setStage(s) {
    var step = Math.min(STEPS - 1, Math.floor(s));
    if (step !== lastStep) {
      rows.forEach(function (r, n) {
        r.classList.toggle('is-done', n < step);
        r.classList.toggle('is-now', n === step);
      });
      stamp.classList.toggle('is-on', step >= 4);
      lastStep = step;
    }
    // A step stamps itself once its part of the film has landed
    rows[step].classList.toggle('is-done', s - step > 0.45);
    var f = STOPS[step] + (s - step) * (STOPS[step + 1] - STOPS[step]);
    want = f;
    cur += (want - cur) * 0.2;
    if (Math.abs(want - cur) < 0.2) cur = want;
    draw(Math.round(cur));
  }

  /* ---------------------------------------------- jump to a step --------- */
  function peakTravel() { return peak.offsetHeight - window.innerHeight; }
  function pageTop(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
  jumps.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var n = parseInt(a.getAttribute('data-jump'), 10);
      window.scrollTo({ top: pageTop(peak) + peakTravel() * ((n + 0.5) / STEPS), behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ----------------------------------------------------------- frame ---- */
  function frame() {
    var y = window.pageYOffset, vh = window.innerHeight;
    var heroEnd = pageTop(hero) + hero.offsetHeight - vh * 0.75;
    var pTop = pageTop(peak), pEnd = pTop + peak.offsetHeight - vh;
    var cTop = pageTop(close) - vh * 0.65;
    var inPeak = y > pTop - vh * 0.4 && y < pEnd + vh * 0.4;

    if (!reduce) {
      var p = clamp((y - pTop) / Math.max(1, pEnd - pTop));
      if (inPeak || lastStep < 0) setStage(p * STEPS * 0.9999);
    }
    dock.classList.toggle('is-on', y > heroEnd && !inPeak && y < cTop);
    mbar.classList.toggle('is-on', y > heroEnd);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* --------------------------------------- hero: pointer moves the world */
  var scene = $('.scene');
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var tx = 0, ty = 0, cx = 0, cy = 0;
    hero.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    (function ease() {
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      scene.style.setProperty('--px', cx.toFixed(3));
      scene.style.setProperty('--py', cy.toFixed(3));
      requestAnimationFrame(ease);
    })();
  }

  /* --------------------------- ticket state: your process and your file */
  var ticket = { process: '', file: '' };
  function paint() {
    var text = ticket.file ? ticket.file : ticket.process ? ticket.process + ' added' : 'Waiting for your drawing';
    $$('[data-ticket-state]').forEach(function (s) { s.textContent = text; });
    dockState.textContent = ticket.file || ticket.process || 'Your order';
  }
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      $$('[data-pick]').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); o.textContent = 'Add to my ticket'; });
      if (on) { b.setAttribute('aria-pressed', 'true'); b.textContent = 'On your ticket'; }
      ticket.process = on ? b.getAttribute('data-pick') : '';
      paint();
    });
  });

  // The file name is read in the browser. Nothing leaves the page in this mockup.
  function takeFile(f) {
    if (!f) return;
    ticket.file = f.name;
    paint();
    say('Mockup: your file stays on your computer. On the real page, Get a quote takes it to the quote app.');
  }
  $$('[data-file]').forEach(function (inp) {
    inp.addEventListener('change', function () { takeFile(inp.files[0]); });
  });
  $$('.drop').forEach(function (d) {
    ['dragenter', 'dragover'].forEach(function (t) {
      d.addEventListener(t, function (e) { e.preventDefault(); d.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      d.addEventListener(t, function (e) { e.preventDefault(); d.classList.remove('is-over'); });
    });
    d.addEventListener('drop', function (e) { takeFile(e.dataTransfer.files[0]); });
  });

  /* ------------------------------------------- notes for mockup links --- */
  var toast = $('[data-toast]'), timer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('is-on'); }, 3600);
  }
  $$('[data-mock]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); say('Mockup: ' + a.getAttribute('data-mock')); });
  });
})();
