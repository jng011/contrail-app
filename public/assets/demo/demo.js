/* Contrail interactive demo (home page #demo).
   Builds a working mock of the app inside the bezel: Home, Record (ball lock, a session that plays four example
   swings), Finding your shots, Library, the shot viewer (swipe, scrub, speed, favorite, delete), Settings and
   Comet's intro. Nothing leaves the phone: no links, no navigation, no network beyond this site's own files.
   The app is laid out on a 402 x 874 pt canvas and scaled to the bezel's screen box. Videos only load once a
   session starts. Reduce Motion turns screen changes into short fades and stops decorative motion.
   avoid-ai-design-ignore: SD4d (the middle-dot strings are the app's own UI labels, copied from its screens) */
(function () {
  'use strict';

  var root = document.querySelector('[data-demo-root]');
  if (!root) return;
  var section = root.closest('section') || root;
  var restartBtn = document.querySelector('[data-demo-restart]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var NS = 'http://www.w3.org/2000/svg';
  var W = 402;

  // Snapshot Comet from the page now, before the page's own Comet animation touches its layers.
  var cometSrc = document.querySelector('[data-comet]');
  var cometMarkup = cometSrc ? cometSrc.outerHTML : '';

  /* ================= Data ================= */
  var SHOTS = [
    { id: 'range', kind: 'synth', len: 4.6, alt: 'Example shot on the practice range: the lime line rises off the mat, over the tree line and comes down on the far range.' },
    { id: 'driver', kind: 'video', src: '/assets/video/driver.mp4', poster: '/assets/video/driver-poster.webp', len: 5.1, pos: '35% 50%', alt: 'Driver swing filmed from behind with a lime tracer up into the sky.' },
    { id: 'iron', kind: 'video', src: '/assets/video/iron.mp4', poster: '/assets/video/iron-poster.webp', len: 7.1, pos: '35% 50%', alt: 'Iron shot off a range mat with a lime tracer up and out over the range.' },
    { id: 'slice', kind: 'video', src: '/assets/video/bad-shot.mp4', poster: '/assets/video/bad-shot-poster.webp', len: 7.3, pos: '10% 50%', alt: 'A slice: the lime tracer starts left and curves away to the right.' }
  ];
  var COLORS = [['Lime', '#c6f23f'], ['Red', '#ff453a'], ['Yellow', '#ffd60a'], ['White', '#ffffff'], ['Green', '#30d158']];
  var SPEEDS = [[1, '1×'], [0.5, '½×'], [0.25, '¼×'], [0.125, '⅛×']];
  var STEPS = [
    { line: 'This is how you use the app.', extra: '', art: 'range', voice: 'welcome' },
    { line: 'I draw the ball’s flight right on your video.', extra: 'That line is the tracer.', art: 'tracer' },
    { line: 'Put your phone behind you, on your target line.', extra: 'About hand height, a few steps back.', art: 'placement' },
    { line: 'Tap record and hit a few balls.', extra: 'I find the ball on your first swing. Short sessions work best.', art: 'record' },
    { line: 'When you stop, I find each shot and trace it.', extra: 'Each one gets its own clip.', art: 'shots', voice: 'shots' },
    { line: 'And it all stays on this iPhone.', extra: 'No account, no uploads.', art: 'private' }
  ];
  var IMG = {
    tall: { src: '/assets/demo/range-tall-720.webp', srcset: '/assets/demo/range-tall-720.webp 720w, /assets/demo/range-tall-1080.webp 1080w' },
    wide: { src: '/assets/demo/range-wide-720.webp', srcset: '/assets/demo/range-wide-720.webp 720w, /assets/demo/range-wide-1080.webp 1080w' }
  };

  // The app's example flight (golf-shot ExampleRange.tracer), normalized in the tall crop: [seconds, x, y].
  var FLIGHT = [[0, 0.5, 0.82], [0.05, 0.503, 0.74], [0.12, 0.508, 0.62], [0.4, 0.522, 0.42], [0.8, 0.542, 0.29],
    [1.3, 0.566, 0.215], [1.9, 0.594, 0.215], [2.5, 0.616, 0.30], [3.0, 0.630, 0.425]];
  var CROPS = {
    tall: { w: 1080, h: 1920, map: function (x, y) { return [x * 1080, y * 1920]; } },
    // The wide crop of the same render (2400 x 2691 source; tall crop is x 390..2010 of it)
    wide: { w: 1080, h: 1211, map: function (x, y) { return [(390 + x * 1620) / 2400 * 1080, y * 2880 / 2691 * 1211]; } }
  };
  var flightCache = {};
  function flight(crop) {
    if (flightCache[crop]) return flightCache[crop];
    var map = CROPS[crop].map;
    var P = FLIGHT.map(function (p) { var xy = map(p[1], p[2]); return [p[0], xy[0], xy[1]]; });
    var out = [], dt = 1 / 120;
    for (var t = 0; t <= 3.0 + 1e-9; t += dt) {
      var i = 0;
      while (i < P.length - 2 && t > P[i + 1][0]) i++;
      var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      var u = Math.min(1, Math.max(0, (t - p1[0]) / (p2[0] - p1[0])));
      var cr = function (a, b, c, d) { return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u); };
      out.push({ t: t, x: cr(p0[1], p1[1], p2[1], p3[1]), y: cr(p0[2], p1[2], p2[2], p3[2]) });
    }
    var L = 0;
    out.forEach(function (p, k) { if (k) L += Math.hypot(p.x - out[k - 1].x, p.y - out[k - 1].y); p.l = L; });
    out.total = L;
    out.d = 'M' + out.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join('L');
    flightCache[crop] = out;
    return out;
  }

  /* ================= Icons (24pt grid) ================= */
  function gearPath() {
    var d = '', T = 8;
    for (var i = 0; i < T; i++) {
      var a = (i / T) * Math.PI * 2;
      [[-0.32, 7.4], [-0.17, 10.6], [0.17, 10.6], [0.32, 7.4]].forEach(function (q, k) {
        var x = 12 + Math.cos(a + q[0]) * q[1], y = 12 + Math.sin(a + q[0]) * q[1];
        d += (i === 0 && k === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
      });
    }
    return d + 'Z M12 8.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8Z';
  }
  var S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var I = {
    chevL: '<svg class="ico" viewBox="0 0 24 24" ' + S + ' stroke-width="2.4"><path d="M15 4.5 7.5 12l7.5 7.5"/></svg>',
    chevR: '<svg class="ico" viewBox="0 0 24 24" ' + S + ' stroke-width="2.4"><path d="M9 4.5l7.5 7.5L9 19.5"/></svg>',
    chevRsm: '<svg class="ico" viewBox="0 0 24 24" ' + S + ' stroke-width="2.4" style="width:18px;height:18px;opacity:.7"><path d="M9 5l7 7-7 7"/></svg>',
    check: '<svg class="ico" viewBox="0 0 24 24" ' + S + ' stroke-width="2.8"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    house: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3 2.6 10.9a1 1 0 0 0 1.3 1.5l.9-.75V20a1 1 0 0 0 1 1h4.1v-5.6h4.2V21h4.1a1 1 0 0 0 1-1v-8.35l.9.75a1 1 0 0 0 1.3-1.5Z"/></svg>',
    library: '<svg viewBox="0 0 24 24"><path d="M7 3.8h11a3 3 0 0 1 3 3v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="2.6" y="7.2" width="15.6" height="13" rx="3" fill="currentColor"/><path d="M8.6 10.6v6.2l5.2-3.1Z" fill="rgb(28 30 28)"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="' + gearPath() + '"/></svg>',
    rec: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.2" fill="currentColor"/></svg>',
    filter: '<svg class="ico" viewBox="0 0 24 24" ' + S + ' stroke-width="2.2"><path d="M4.5 7.5h15M7.5 12h9M10.5 16.5h3"/></svg>',
    heart: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><path d="M12 20s-7.2-4.4-9.1-8.7C1.5 8.2 3.3 4.8 6.6 4.8c2 0 3.4 1.1 4.2 2.4.5.7 1.9.7 2.4 0 .8-1.3 2.2-2.4 4.2-2.4 3.3 0 5.1 3.4 3.7 6.5C19.2 15.6 12 20 12 20Z"/></svg>',
    heartFill: '<svg class="ico" viewBox="0 0 24 24"><path fill="currentColor" d="M12 20.6s-7.6-4.6-9.6-9.1C.9 8.1 2.9 4.3 6.6 4.3c2.2 0 3.7 1.2 4.6 2.6.4.6 1.2.6 1.6 0 .9-1.4 2.4-2.6 4.6-2.6 3.7 0 5.7 3.8 4.2 7.2-2 4.5-9.6 9.1-9.6 9.1Z"/></svg>',
    play: '<svg class="ico" viewBox="0 0 24 24"><path fill="currentColor" d="M7.5 4.8v14.4a.9.9 0 0 0 1.4.8l11.2-7.2a.9.9 0 0 0 0-1.6L8.9 4a.9.9 0 0 0-1.4.8Z"/></svg>',
    pause: '<svg class="ico" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor"/></svg>',
    trash: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><path d="M4.5 6.8h15M9.5 6.8V4.6h5v2.2M6.6 6.8l.9 13h9l.9-13M10 10.8v5.4M14 10.8v5.4"/></svg>',
    lock: '<svg class="ico" viewBox="0 0 24 24"><rect x="5" y="10.4" width="14" height="10.2" rx="2.4" fill="currentColor"/><path d="M8.2 10.6V8a3.8 3.8 0 0 1 7.6 0v2.6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    lockO: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><rect x="5" y="10.4" width="14" height="10.2" rx="2.4"/><path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4"/></svg>',
    cross: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg>',
    camera: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><path d="M3.5 8.6a2 2 0 0 1 2-2h2.2l1.6-2.2h5.4l1.6 2.2h2.2a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    mic: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><rect x="9" y="3.2" width="6" height="11" rx="3"/><path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0M12 17.6v3.4M8.8 21h6.4"/></svg>',
    motion: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12M18 6 6 18"/><circle cx="12" cy="12" r="3"/></svg>',
    compass: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><path d="M12 2.8v3M12 7.5 7 20.5l5-3.2 5 3.2Z"/></svg>',
    location: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><path d="M20 4 4.2 10.6l7 2.2 2.2 7Z"/></svg>',
    lidar: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><circle cx="6.5" cy="12" r="1.6" fill="currentColor"/><path d="M11 8.5a5 5 0 0 1 0 7M14.6 5.8a9 9 0 0 1 0 12.4M18.2 3.4a12.6 12.6 0 0 1 0 17.2"/></svg>',
    phone: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.6 5.6h2.8"/></svg>',
    wifiOff: '<svg class="ico" viewBox="0 0 24 24" ' + S + '><path d="M3 9.2a13 13 0 0 1 4.4-2.6M10.8 5.9A13 13 0 0 1 21 9.2M6.3 12.6a8.2 8.2 0 0 1 3.6-1.9M14.6 10.9a8.2 8.2 0 0 1 3.1 1.7M9.6 16a3.6 3.6 0 0 1 4.8 0M3.5 3.5l17 17"/><circle cx="12" cy="19.4" r="1" fill="currentColor"/></svg>',
    speaker: '<svg class="ico" viewBox="0 0 24 24"><path fill="currentColor" d="M4 9.2h3.4L12 5.2v13.6l-4.6-4H4Z"/><path d="M15.4 9a4.4 4.4 0 0 1 0 6M18.2 6.4a8.2 8.2 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    speakerOff: '<svg class="ico" viewBox="0 0 24 24"><path fill="currentColor" d="M4 9.2h3.4L12 5.2v13.6l-4.6-4H4Z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    spinner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v3.4" opacity="1"/><path d="M18.4 5.6l-2.4 2.4" opacity=".88"/><path d="M21 12h-3.4" opacity=".76"/><path d="M18.4 18.4 16 16" opacity=".64"/><path d="M12 21v-3.4" opacity=".52"/><path d="M5.6 18.4 8 16" opacity=".4"/><path d="M3 12h3.4" opacity=".3"/><path d="M5.6 5.6 8 8" opacity=".2"/></svg>',
    restart: '<svg viewBox="0 0 24 24" ' + S + '><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4"/></svg>'
  };
  var STATUS = '<time>9:41</time><span class="si">' +
    '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="#fff"/><rect x="4.7" y="5.6" width="3.2" height="6.4" rx="1" fill="#fff"/><rect x="9.4" y="3" width="3.2" height="9" rx="1" fill="#fff"/><rect x="14.1" y="0" width="3.2" height="12" rx="1" fill="#fff"/></svg>' +
    '<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path fill="#fff" d="M8 11.6 5.7 9.3a3.3 3.3 0 0 1 4.6 0ZM3.4 7a6.6 6.6 0 0 1 9.2 0l-1.4 1.4a4.6 4.6 0 0 0-6.4 0ZM1 4.6a10 10 0 0 1 14 0l-1.4 1.4a8 8 0 0 0-11.2 0Z"/></svg>' +
    '<svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="#fff" stroke-opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.4" fill="#fff"/><path d="M25 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1s-.6-1.8-1.4-2.1Z" fill="#fff" fill-opacity=".45"/></svg>' +
    '</span>';

  /* ================= Small helpers ================= */
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function $(sel, ctx) { return (ctx || app).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || app).querySelectorAll(sel)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function img(which, extra) {
    return '<img class="fill-img" src="' + IMG[which].src + '" srcset="' + IMG[which].srcset + '" sizes="400px" alt="" draggable="false" decoding="async"' + (extra || '') + '>';
  }
  function cometSVG(cls) {
    var wrap = document.createElement('div');
    wrap.innerHTML = cometMarkup;
    var svg = wrap.firstElementChild;
    if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 512 512'); }
    cometSVG.n = (cometSVG.n || 0) + 1;
    svg.removeAttribute('data-comet'); svg.removeAttribute('role'); svg.removeAttribute('aria-label');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.querySelectorAll('[id]').forEach(function (n) {
      var old = n.id, nu = old + '-demo' + cometSVG.n;
      n.id = nu;
      svg.querySelectorAll('[clip-path="url(#' + old + ')"]').forEach(function (u) { u.setAttribute('clip-path', 'url(#' + nu + ')'); });
    });
    svg.querySelectorAll('[data-layer]').forEach(function (g) { g.removeAttribute('transform'); g.removeAttribute('style'); });
    face(svg, 'face');
    if (cls) svg.setAttribute('class', cls);
    return svg;
  }
  function face(svg, which) {
    ['face', 'faceClosed', 'faceTalk'].forEach(function (n) {
      var g = svg.querySelector('[data-layer="' + n + '"]');
      if (g) g.setAttribute('opacity', n === which ? '1' : '0');
    });
  }

  /* Synthetic shot: the range render with the example flight drawn over it, frame by frame. */
  function makeSynth(crop, opts) {
    opts = opts || {};
    var c = CROPS[crop], F = flight(crop), start = F[0], end = F[F.length - 1];
    var sw = opts.width || 12;
    var node = el('<div class="synth">' + img(crop) +
      '<svg viewBox="0 0 ' + c.w + ' ' + c.h + '" preserveAspectRatio="' + (opts.align || 'xMidYMid') + ' slice" aria-hidden="true">' +
      '<g class="patch" opacity="0"><circle cx="' + start.x + '" cy="' + start.y + '" r="24" fill="rgb(48 88 37)" opacity=".55"/><circle cx="' + start.x + '" cy="' + start.y + '" r="18" fill="rgb(48 88 37)"/></g>' +
      '<g class="trace-svg"><path class="under" stroke-width="' + (sw + 8) + '" d="' + F.d + '"/><path class="line" stroke-width="' + sw + '" d="' + F.d + '"/>' +
      '<circle class="land" r="' + (sw * 0.95) + '" stroke-width="' + (sw * 0.45) + '" cx="' + end.x + '" cy="' + end.y + '" opacity="0"/></g>' +
      '<circle class="ball" r="14" fill="#fff" stroke="rgb(0 0 0 / .25)" stroke-width="2" cx="' + start.x + '" cy="' + start.y + '" opacity="0"/>' +
      '</svg></div>');
    if (opts.imgPos) node.querySelector('img').style.objectPosition = opts.imgPos;
    var patch = node.querySelector('.patch'), under = node.querySelector('.under'), line = node.querySelector('.line');
    var land = node.querySelector('.land'), ball = node.querySelector('.ball');
    var L = F.total;
    [under, line].forEach(function (p) { p.style.strokeDasharray = L + ' ' + L; });
    var T0 = 0.6, DUR = 4.6;
    function render(t) {
      var ft = t - T0, off, show = 0;
      if (ft <= 0) { off = L; patch.setAttribute('opacity', '0'); ball.setAttribute('opacity', opts.ball ? '1' : '0'); ball.setAttribute('cx', start.x); ball.setAttribute('cy', start.y); ball.setAttribute('r', 14); }
      else if (ft < 3.0) {
        var p = F[Math.min(F.length - 1, Math.floor(ft * 120))];
        off = L - p.l;
        patch.setAttribute('opacity', '1');
        ball.setAttribute('opacity', '1'); ball.setAttribute('cx', p.x); ball.setAttribute('cy', p.y);
        ball.setAttribute('r', (14 - 10.5 * Math.pow(ft / 3, 0.55)).toFixed(2));
      } else { off = 0; show = 1; patch.setAttribute('opacity', '1'); ball.setAttribute('opacity', '0'); }
      under.style.strokeDashoffset = off; line.style.strokeDashoffset = off;
      land.setAttribute('opacity', show);
    }
    render(opts.done ? DUR : 0);
    return { node: node, render: render, duration: DUR };
  }

  /* One play/pause/seek interface over a <video> or a synthetic shot */
  function SynthMedia(synth, loop) {
    var self = this;
    this.synth = synth; this.node = synth.node; this.duration = synth.duration; this.loop = !!loop;
    this.t = 0; this.rate = 1; this.playing = false; this.onend = null; this.raf = 0; this.last = 0;
    this.tick = function (now) {
      if (!self.playing) return;
      self.t += Math.min(0.1, (now - self.last) / 1000) * self.rate;
      self.last = now;
      if (self.t >= self.duration) {
        if (self.loop) self.t = 0;
        else { self.t = self.duration; self.playing = false; synth.render(self.t); if (self.onend) self.onend(); return; }
      }
      synth.render(self.t);
      self.raf = requestAnimationFrame(self.tick);
    };
  }
  SynthMedia.prototype = {
    play: function () { if (this.playing) return; if (this.t >= this.duration) this.t = 0; this.playing = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); },
    pause: function () { this.playing = false; cancelAnimationFrame(this.raf); },
    get paused() { return !this.playing; },
    get currentTime() { return this.t; },
    set currentTime(v) { this.t = Math.max(0, Math.min(this.duration, v)); this.synth.render(this.t); },
    set playbackRate(r) { this.rate = r; },
    load: function () {}, unload: function () { this.pause(); this.currentTime = 0; }
  };
  function VideoMedia(shot, loop) {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = !!loop; v.preload = 'none';
    v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.poster = shot.poster;
    v.setAttribute('aria-label', shot.alt);
    v.style.objectPosition = shot.pos;
    this.v = v; this.node = v; this.shot = shot; this.rate = 1; this.onend = null;
    var self = this;
    v.addEventListener('ended', function () { if (self.onend) self.onend(); });
  }
  VideoMedia.prototype = {
    load: function () { if (!this.v.getAttribute('src')) { this.v.preload = 'auto'; this.v.src = this.shot.src; } },
    play: function () { this.load(); this.v.playbackRate = this.rate; var p = this.v.play(); if (p) p.catch(function () {}); },
    pause: function () { this.v.pause(); },
    get paused() { return this.v.paused; },
    get currentTime() { return this.v.currentTime || 0; },
    set currentTime(t) { try { this.v.currentTime = t; } catch (e) { /* not seekable yet */ } },
    get duration() { return isFinite(this.v.duration) && this.v.duration > 0 ? this.v.duration : this.shot.len; },
    set playbackRate(r) { this.rate = r; this.v.playbackRate = r; },
    unload: function () { this.v.pause(); try { this.v.currentTime = 0; } catch (e) { /* ignore */ } }
  };
  function mediaFor(shot, loop, synthOpts) {
    return shot.kind === 'synth' ? new SynthMedia(makeSynth('tall', synthOpts || { width: 13 }), loop) : new VideoMedia(shot, loop);
  }
  function thumbArt(shot) {
    if (shot.kind === 'synth') return makeSynth('tall', { width: 22, done: true, imgPos: '50% 50%' }).node;
    var i = el('<img src="' + shot.poster + '" alt="" draggable="false" loading="lazy" decoding="async">');
    i.style.objectPosition = shot.pos.replace('50%', '40%');
    return i;
  }

  /* ================= State ================= */
  var state, app, scaleRO;
  function fresh() {
    return {
      tab: 'home', stack: [], shots: [], sessions: 0, favOnly: false, speed: 0, tracer: 0,
      toggles: { camera: true, microphone: true, motion: true, location: true, keep: false }, uid: 0
    };
  }

  /* ================= Build ================= */
  function build() {
    if (app) return;
    state = fresh();
    var fallback = root.querySelector('.demo-fallback');
    app = el('<div class="app"></div>');
    app.innerHTML =
      '<div class="app-status" aria-hidden="true">' + STATUS + '</div>' +
      '<div class="layer tabs" data-layer-tabs>' +
        homeHTML() + libraryHTML() + settingsHTML() +
        '<div class="tabbar glass" role="tablist" aria-label="Tabs"><span class="pill" aria-hidden="true"></span>' +
          '<button class="tap" type="button" role="tab" data-tab="home" aria-selected="true">' + I.house + '<span>Home</span></button>' +
          '<button class="tap" type="button" role="tab" data-tab="library" aria-selected="false">' + I.library + '<span>Library</span></button>' +
          '<button class="tap" type="button" role="tab" data-tab="settings" aria-selected="false">' + I.gear + '<span>Settings</span></button>' +
        '</div>' +
      '</div>' +
      recordHTML() + procHTML() + viewerHTML() + tutHTML() +
      '<div class="sheet" hidden data-sheet role="dialog" aria-modal="true" aria-labelledby="demo-sheet-t"><div class="card"><p class="msg" id="demo-sheet-t"></p><button class="act tap" type="button" data-sheet-ok></button></div><button class="cancel tap" type="button" data-sheet-cancel>Cancel</button></div>' +
      '<button class="app-home-ind" type="button" data-home-ind aria-label="Go to the Home tab"><span></span></button>' +
      '<p class="vh" aria-live="polite" data-live></p>';
    root.appendChild(app);
    if (fallback) fallback.remove();
    root.setAttribute('data-ready', '');

    // touchstart makes :active work on iOS Safari
    app.addEventListener('touchstart', function () {}, { passive: true });
    fit();
    if ('ResizeObserver' in window) { scaleRO = new ResizeObserver(fit); scaleRO.observe(root); } else window.addEventListener('resize', fit);

    wireTabs(); wireHome(); wireRecord(); wireLibrary(); wireViewer(); wireSettings(); wireTutorial(); wireSheet(); wireHomeIndicator();
    renderLibrary(); renderSettings();
    $('.scr-home .media').appendChild(heroSynth.node);
    syncInert();
    showHomeHero();
  }
  function fit() {
    var w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    var s = w / W;
    app.style.setProperty('--s', s);
    app.style.setProperty('--app-h', (h / s) + 'px');
  }

  /* ================= Templates ================= */
  var heroSynth = null;
  function homeHTML() {
    heroSynth = makeSynth('wide', { width: 10, align: 'xMidYMax' });
    heroSynth.node.querySelector('img').style.objectPosition = '50% 100%';
    return '<section class="scr scr-home" data-screen="home" aria-label="Home">' +
      '<div class="scr-scroll" data-lenis-prevent>' +
        '<div class="home-hero"><div class="media"><span class="chip glass" style="z-index:2">Example · this is what you get</span></div></div>' +
        '<div class="home-body">' +
          '<h2>Record a few swings</h2>' +
          '<p>Set your iPhone behind you on your target line, hit a few balls, then stop. Every shot lands here, cut and traced.</p>' +
          '<button class="btn-lime tap" type="button" data-start>' + I.rec + 'Start Session</button>' +
          '<button class="home-row tap" type="button" data-howto>How to set up' + I.chevRsm + '</button>' +
          '<p class="home-lock">' + I.lock + 'Everything stays on this iPhone.</p>' +
        '</div>' +
      '</div></section>';
  }
  function libraryHTML() {
    return '<section class="scr scr-library" data-screen="library" aria-label="Library" hidden>' +
      '<div class="navbar" aria-hidden="true">Library</div>' +
      '<div class="scr-scroll" data-lenis-prevent><div class="lib">' +
        '<div class="lib-head"><div><h2>Library</h2><p data-lib-count>No shots yet</p></div>' +
          '<div class="btns"><button class="round tap" type="button" data-fav-filter aria-pressed="false" aria-label="Show favorites only">' + I.filter + '</button>' +
          '<button class="round tap" type="button" data-start aria-label="Start a session">' + I.rec + '</button></div></div>' +
        '<div data-lib-body></div>' +
      '</div></div></section>';
  }
  function settingsHTML() {
    var perm = [['camera', I.camera, 'Camera', 'Records your sessions'], ['microphone', I.mic, 'Microphone', 'Records sound with each session'],
      ['motion', I.motion, 'Motion & Fitness', 'Reads the phone’s motion sensors'], ['location', I.location, 'Location', 'Saves location and compass heading']];
    return '<section class="scr scr-settings" data-screen="settings" aria-label="Settings" hidden>' +
      '<div class="navbar" aria-hidden="true">Settings</div>' +
      '<div class="scr-scroll" data-lenis-prevent><div class="set">' +
        '<h2>Settings</h2>' +
        '<h3 class="set-h">Tracer</h3>' +
        '<div class="set-card"><div class="set-preview">' + img('wide') +
          '<svg class="trace-svg" viewBox="0 0 402 132" preserveAspectRatio="none" aria-hidden="true"><path class="under" stroke-width="9" d="M201 118 L203 -10"/><path class="line" stroke-width="5" d="M201 118 L203 -10"/></svg></div>' +
          '<div class="swatches" role="radiogroup" aria-label="Tracer color">' +
            COLORS.map(function (c, i) { return '<button class="swatch" type="button" role="radio" aria-checked="' + (i === 0) + '" data-color="' + i + '" style="--c:' + c[1] + '"><i></i>' + c[0] + '</button>'; }).join('') +
          '</div></div>' +
        '<p class="set-foot">The line drawn over every shot. Lime reads best against sky and grass.</p>' +
        '<h3 class="set-h">Camera</h3>' +
        '<div class="set-card"><div class="set-row">Format<span class="v">1080p · 240 fps</span></div></div>' +
        '<h3 class="set-h">Permissions</h3>' +
        '<div class="set-card">' + perm.map(function (p) {
          return '<div class="set-row has-ico">' + p[1] + '<span class="tx" id="demo-p-' + p[0] + '">' + p[2] + '<small>' + p[3] + '</small></span>' +
            '<button class="switch" type="button" role="switch" aria-checked="true" aria-labelledby="demo-p-' + p[0] + '" data-toggle="' + p[0] + '"></button></div>';
        }).join('') + '</div>' +
        '<p class="set-foot">In the demo these switches only change here. On your iPhone, iOS asks once for each.</p>' +
        '<h3 class="set-h">Recordings</h3>' +
        '<div class="set-card"><div class="set-row"><span class="tx" id="demo-p-keep">Keep Full Recordings</span><button class="switch" type="button" role="switch" aria-checked="false" aria-labelledby="demo-p-keep" data-toggle="keep"></button></div></div>' +
        '<p class="set-foot">Keeps each whole session after shots are found. Recordings are large: turn this off to save space.</p>' +
        '<h3 class="set-h">Storage</h3>' +
        '<div class="set-card"><div class="set-row">Shots<span class="v" data-st-shots>0</span></div><div class="set-row">Sessions<span class="v" data-st-sessions>0</span></div>' +
          '<button class="set-row danger" type="button" data-delete-all>Delete All Shots</button></div>' +
        '<h3 class="set-h">Privacy</h3>' +
        '<div class="set-card"><div class="set-row has-ico">' + I.phone + 'Everything is processed on this iPhone</div><div class="set-row has-ico">' + I.lockO + 'No account, no uploads, no tracking</div><div class="set-row has-ico">' + I.wifiOff + 'Makes no network requests</div></div>' +
        '<div class="set-card" style="margin-top:28px"><button class="set-row" type="button" data-intro>Show the Intro Again' + '<span class="v">' + I.chevRsm + '</span></button><div class="set-row">Version<span class="v">Web demo</span></div></div>' +
      '</div></div></section>';
  }
  function recordHTML() {
    return '<section class="scr scr-record" data-screen="record" aria-label="Record" hidden>' +
      '<div class="rec-top"><button class="round glass-dark tap" type="button" data-rec-back aria-label="Back">' + I.chevL + '</button><span class="grow"></span>' +
        '<span class="capsule glass-dark fmt" aria-label="Format: 1080p at 240 frames per second"><span>1080p</span>240 fps</span>' +
        '<button class="round glass-dark tap sens" type="button" data-sensors aria-expanded="false" aria-label="Sensors">' + I.check + '</button></div>' +
      '<div class="rec-timer glass-dark" aria-hidden="true"><i class="dot"></i><b data-timer>0:00</b><small>240 fps</small></div>' +
      '<p class="rec-status" data-rec-status><i></i><span>Looking for the ball. You can start any time.</span></p>' +
      '<div class="rec-card" data-card>' + img('tall') +
        '<div class="rec-aim" data-aim><span class="target"></span>' +
          '<div class="ring" data-ring><span class="dash"></span><span class="solid"></span><span class="badge">' + I.check + '</span></div>' +
          '<span class="chip glass rec-chip" data-rec-chip>Looking for the ball…</span></div>' +
        '<span class="chip glass rec-swing" data-rec-swing></span>' +
      '</div>' +
      '<div class="sensors glass-dark" data-sensor-panel role="group" aria-label="Sensors">' +
        [['Camera', I.camera], ['Mic', I.mic], ['Motion', I.motion], ['Compass', I.compass], ['Location', I.location], ['LiDAR', I.lidar]].map(function (s) {
          return '<div><span>' + s[1] + '</span>' + s[0] + '<small>Ready</small></div>';
        }).join('') + '</div>' +
      '<button class="capsule glass-dark tap rec-find" type="button" data-find>' + I.cross + 'Find ball</button>' +
      '<button class="shutter" type="button" data-shutter aria-label="Start recording"><i></i></button>' +
      '</section>';
  }
  function procHTML() {
    return '<section class="scr scr-proc" data-screen="processing" aria-label="Finding your shots" hidden>' +
      '<div class="proc"><div class="proc-head"><span class="badge" data-proc-comet></span><div><h2>Finding your shots</h2><p>Every frame is checked on this iPhone.</p></div></div>' +
        '<div class="proc-count"><b data-proc-n>0</b><span data-proc-label>shots so far</span></div>' +
        '<div class="proc-bar"><i data-proc-bar></i></div>' +
        '<div class="proc-meta"><span data-proc-meta>Checking frames…</span><span class="on">' + I.lock + 'On this iPhone</span></div>' +
        '<h3>Just added</h3><div class="proc-grid" data-proc-grid></div></div>' +
      '<div class="proc-foot"><button class="btn-glass glass tap" type="button" data-proc-bg>Keep Going in the Background</button></div>' +
      '</section>';
  }
  function viewerHTML() {
    return '<section class="scr scr-viewer" data-screen="viewer" aria-label="Shot" hidden tabindex="-1">' +
      '<div class="v-stage" data-v-stage><div class="v-track" data-v-track></div></div>' +
      '<div class="v-chrome">' +
        '<div class="v-top"><button class="round glass tap" type="button" data-v-back aria-label="Back to Library">' + I.chevL + '</button>' +
          '<span class="v-title glass" data-v-title></span></div>' +
        '<button class="round glass tap v-arrow prev" type="button" data-v-prev aria-label="Previous shot">' + I.chevL + '</button>' +
        '<button class="round glass tap v-arrow next" type="button" data-v-next aria-label="Next shot">' + I.chevR + '</button>' +
        '<div class="v-scrub" data-v-scrub role="slider" tabindex="0" aria-label="Scrub through the shot" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="track"><span class="fillbar" data-v-fill></span></span><span class="knob" data-v-knob></span></div>' +
        '<div class="v-strip glass-dark"><p class="hd" data-v-strip-hd>Today</p><div class="row" data-v-strip data-lenis-prevent></div></div>' +
        '<div class="v-bar"><button class="round glass-dark tap fav" type="button" data-v-fav aria-pressed="false" aria-label="Favorite">' + I.heart + '</button>' +
          '<button class="round glass-dark tap play" type="button" data-v-play aria-label="Pause">' + I.pause + '</button><span class="grow"></span>' +
          '<button class="round glass-dark tap speed" type="button" data-v-speed aria-label="Playback speed 1×">1×</button>' +
          '<button class="round glass-dark tap" type="button" data-v-del aria-label="Delete shot">' + I.trash + '</button></div>' +
      '</div>' +
      '<span class="v-toast glass" data-v-toast aria-hidden="true"></span>' +
      '</section>';
  }
  function tutHTML() {
    return '<section class="scr scr-tut" data-screen="tutorial" aria-label="Introduction" hidden>' +
      '<div class="tut-top"><button class="round glass-dark tap" type="button" data-voice aria-pressed="false" aria-label="Unmute Comet">' + I.speakerOff + '</button>' +
        '<button class="capsule glass-dark tap" type="button" data-skip>Skip</button></div>' +
      '<div class="tut-stage"><button class="tut-comet" type="button" data-comet-btn aria-label="Comet. Tap him."><span class="comet-glow"></span><span class="flip" style="display:block;width:100%;height:100%"></span></button>' +
        '<div class="tut-bubble" data-bubble aria-live="polite"><b></b><span></span></div></div>' +
      '<div class="tut-card" data-tut-card></div>' +
      '<div class="tut-dots" aria-hidden="true">' + STEPS.map(function () { return '<i></i>'; }).join('') + '</div>' +
      '<div class="tut-foot"><button class="btn-lime tap" type="button" data-tut-next>Show Me</button></div>' +
      '</section>';
  }

  /* ================= Navigation ================= */
  var EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  function scr(name) { return $('[data-screen="' + name + '"]'); }
  function animate(node, frames, ms, easing) {
    if (!node.animate) return Promise.resolve();
    var a = node.animate(frames, { duration: ms, easing: easing || EASE, fill: 'both' });
    return a.finished.then(function () { a.cancel(); }, function () {});
  }
  function enter(node, kind) {
    if (reduce.matches || kind === 'fade') return animate(node, [{ opacity: 0 }, { opacity: 1 }], reduce.matches ? 140 : 220, 'ease-out');
    if (kind === 'cover') return animate(node, [{ transform: 'translateY(100%)' }, { transform: 'none' }], 560);
    if (kind === 'zoom') return animate(node, [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], 460);
    return animate(node, [{ transform: 'translateX(100%)' }, { transform: 'none' }], 520);
  }
  function leave(node, kind) {
    if (reduce.matches || kind === 'fade') return animate(node, [{ opacity: 1 }, { opacity: 0 }], reduce.matches ? 140 : 220, 'ease-out');
    if (kind === 'cover') return animate(node, [{ transform: 'none' }, { transform: 'translateY(100%)' }], 460, 'cubic-bezier(0.4, 0, 0.6, 1)');
    if (kind === 'zoom') return animate(node, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.92)' }], 300, 'cubic-bezier(0.4, 0, 1, 1)');
    return animate(node, [{ transform: 'none' }, { transform: 'translateX(100%)' }], 420);
  }
  function present(name, kind) {
    var node = scr(name);
    state.stack.push(name);
    node.style.zIndex = 50 + state.stack.length;
    node.hidden = false;
    syncInert();
    focusInto(node);
    return enter(node, kind);
  }
  function dismiss(name, kind) {
    var node = scr(name);
    var i = state.stack.lastIndexOf(name);
    if (i < 0) return Promise.resolve();
    state.stack.splice(i, 1);
    syncInert();
    return leave(node, kind).then(function () {
      if (state.stack.indexOf(name) < 0) node.hidden = true;
      if (hooks[name]) hooks[name]();
    });
  }
  var hooks = { record: function () { stopRecording(true); }, viewer: function () { viewerPauseAll(); app.classList.remove('is-bare'); }, tutorial: function () { tutStopVoice(); }, processing: function () { procCancel(); } };
  function syncInert() {
    var top = state.stack[state.stack.length - 1];
    var sheetOpen = !$('[data-sheet]').hidden;
    ['home', 'library', 'settings'].forEach(function (t) { var n = scr(t); setInert(n, sheetOpen || !!top || state.tab !== t); });
    setInert($('.tabbar'), sheetOpen || !!top);
    ['record', 'processing', 'viewer', 'tutorial'].forEach(function (n) { setInert(scr(n), sheetOpen || n !== top); });
  }
  function setInert(node, on) { if (on) node.setAttribute('inert', ''); else node.removeAttribute('inert'); }
  function focusInto(node) {
    if (!app.contains(document.activeElement)) return; // never pull focus from the page
    setTimeout(function () {
      var f = node.querySelector('button:not([disabled]), [tabindex="0"]');
      if (f) f.focus({ preventScroll: true });
    }, 30);
  }
  function announce(text) { var live = $('[data-live]'); live.textContent = ''; setTimeout(function () { live.textContent = text; }, 40); }

  function setTab(name, instant) {
    var prev = state.tab;
    state.tab = name;
    $$('.tabbar [data-tab]').forEach(function (b, i) {
      var on = b.getAttribute('data-tab') === name;
      b.setAttribute('aria-selected', on);
      if (on) $('.tabbar .pill').style.transform = 'translateX(' + (i * 100) + '%)';
    });
    ['home', 'library', 'settings'].forEach(function (t) { scr(t).hidden = t !== name; });
    syncInert();
    if (prev !== name && !instant) enter(scr(name), 'fade');
    if (name === 'home') showHomeHero();
    if (name === 'settings') renderSettings();
  }
  function wireTabs() {
    $$('.tabbar [data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-tab');
        if (t === state.tab) { var sc = $('.scr-scroll', scr(t)); if (sc) sc.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }); return; }
        setTab(t);
        announce(b.textContent);
      });
    });
    // Large titles collapse into a nav bar when they scroll away
    ['library', 'settings'].forEach(function (t) {
      var sc = $('.scr-scroll', scr(t)), bar = $('.navbar', scr(t));
      sc.addEventListener('scroll', function () { bar.classList.toggle('is-on', sc.scrollTop > 48); }, { passive: true });
    });
  }
  function goHome() {
    closeSheet();
    var top;
    while ((top = state.stack[state.stack.length - 1])) {
      if (state.stack.length === 1) { dismiss(top, top === 'viewer' ? 'zoom' : 'cover'); break; }
      state.stack.pop(); scr(top).hidden = true; if (hooks[top]) hooks[top]();
    }
    setTab('home', state.tab === 'home');
    announce('Home');
  }
  function wireHomeIndicator() {
    var ind = $('[data-home-ind]'), y0 = null;
    ind.addEventListener('pointerdown', function (e) { y0 = e.clientY; ind.setPointerCapture(e.pointerId); });
    ind.addEventListener('pointermove', function (e) {
      if (y0 === null) return;
      if (y0 - e.clientY > 14) { y0 = null; goHome(); }
    });
    ind.addEventListener('pointerup', function () { y0 = null; });
    ind.addEventListener('pointercancel', function () { y0 = null; });
    ind.addEventListener('click', function (e) { if (e.detail === 0) goHome(); }); // keyboard
  }

  /* ================= Home ================= */
  var heroAnim = 0;
  function showHomeHero() {
    if (!heroSynth) return;
    cancelAnimationFrame(heroAnim);
    if (reduce.matches) { heroSynth.render(heroSynth.duration); return; }
    var t0 = performance.now(), from = 0.6, to = 3.6;
    heroSynth.render(from);
    var step = function (now) {
      var k = Math.min(1, (now - t0) / 1700);
      var e = 1 - Math.pow(1 - k, 2.2);
      heroSynth.render(from + (to - from) * e);
      if (k < 1) heroAnim = requestAnimationFrame(step);
    };
    heroAnim = requestAnimationFrame(function (now) { t0 = now + 250; heroAnim = requestAnimationFrame(step); });
  }
  function wireHome() {
    $$('[data-start]').forEach(function (b) { b.addEventListener('click', openRecord); });
    $('[data-howto]').addEventListener('click', function () { openTutorial(); });
  }

  /* ================= Record ================= */
  var rec = { token: 0, timers: [], recording: false, startedAt: 0, tick: 0, played: 0, media: null, videos: null, synth: null };
  function recLater(ms, fn) { rec.timers.push(setTimeout(fn, ms)); }
  function recClear() { rec.timers.forEach(clearTimeout); rec.timers = []; }
  function recStatus(text) { $('[data-rec-status] span').textContent = text; }
  function recChip(html) { $('[data-rec-chip]').innerHTML = html; }
  function openRecord() {
    if (state.stack.indexOf('record') >= 0) return;
    var r = scr('record');
    resetRecordUI();
    // Example clips load only once a session is opened
    if (!rec.videos) {
      rec.videos = SHOTS.filter(function (s) { return s.kind === 'video'; }).map(function (s) { var m = new VideoMedia(s, false); $('[data-card]', r).insertBefore(m.node, $('[data-aim]', r)); return m; });
      rec.synth = new SynthMedia(makeSynth('tall', { width: 13, ball: false }), false);
      $('[data-card]', r).insertBefore(rec.synth.node, $('[data-aim]', r));
    }
    rec.videos.forEach(function (m) { m.load(); });
    present('record', 'cover').then(function () { findBall(); });
    announce('Record. Looking for the ball.');
  }
  function resetRecordUI() {
    var r = scr('record');
    rec.token++; recClear();
    r.classList.remove('is-locking', 'is-locked', 'is-recording');
    $('[data-sensor-panel]').classList.remove('is-open');
    $('[data-sensors]').setAttribute('aria-expanded', 'false');
    $('[data-timer]').textContent = '0:00';
    $('[data-shutter]').setAttribute('aria-label', 'Start recording');
    $('[data-rec-swing]').classList.remove('is-on');
    $('[data-aim]').style.opacity = '';
    recStatus('Looking for the ball. You can start any time.');
    recChip('Looking for the ball…');
    if (rec.synth) { rec.synth.unload(); rec.synth.node.classList.remove('is-on'); }
    if (rec.videos) rec.videos.forEach(function (m) { m.unload(); m.node.classList.remove('is-on'); });
  }
  function findBall() {
    var r = scr('record');
    recClear();
    r.classList.remove('is-locking', 'is-locked');
    recStatus('Looking for the ball. You can start any time.');
    recChip('Looking for the ball…');
    recLater(reduce.matches ? 900 : 1800, function () {
      r.classList.add('is-locking');
      recLater(560, lockBall);
    });
  }
  function lockBall() {
    var r = scr('record');
    r.classList.remove('is-locking'); r.classList.add('is-locked');
    recStatus('Ready. Step up and hit.');
    recChip(I.lock + 'Locked');
    announce('Ball locked. Ready.');
  }
  function wireRecord() {
    $('[data-rec-back]').addEventListener('click', function () { dismiss('record', 'cover'); });
    $('[data-find]').addEventListener('click', function () { findBall(); announce('Looking for the ball.'); });
    $('[data-sensors]').addEventListener('click', function () {
      var p = $('[data-sensor-panel]'), open = !p.classList.contains('is-open');
      p.classList.toggle('is-open', open);
      this.setAttribute('aria-expanded', open);
    });
    $('[data-card]').addEventListener('click', function () { // tapping the ball locks it, like the app
      var r = scr('record');
      if (!rec.recording && !r.classList.contains('is-locked')) { recClear(); r.classList.add('is-locking'); recLater(300, lockBall); }
    });
    $('[data-shutter]').addEventListener('click', function () { if (rec.recording) stopRecording(false); else startRecording(); });
  }
  function startRecording() {
    var r = scr('record');
    recClear();
    $('[data-sensor-panel]').classList.remove('is-open');
    $('[data-sensors]').setAttribute('aria-expanded', 'false');
    if (!r.classList.contains('is-locked')) lockBall();
    rec.recording = true; rec.played = 0; rec.startedAt = performance.now();
    r.classList.add('is-recording');
    $('[data-shutter]').setAttribute('aria-label', 'Stop recording');
    announce('Recording. Example swings are playing.');
    clearInterval(rec.tick);
    rec.tick = setInterval(function () { $('[data-timer]').textContent = fmtTime((performance.now() - rec.startedAt) / 1000); }, 250);
    runShots(++rec.token);
  }
  function playIn(media, token) {
    return new Promise(function (resolve) {
      var done = false, guard;
      var finish = function () { if (done) return; done = true; clearTimeout(guard); media.onend = null; resolve(); };
      media.onend = finish;
      media.currentTime = 0;
      media.playbackRate = 1;
      media.play();
      var check = function () { if (token !== rec.token) finish(); else guard = setTimeout(check, 400); };
      guard = setTimeout(check, 400);
      // safety net if a clip can't play
      setTimeout(function () { if (!done && media.currentTime < 0.05 && token === rec.token) finish(); }, 9000);
    });
  }
  async function runShots(token) {
    var swing = $('[data-rec-swing]'), aim = $('[data-aim]');
    await wait(900);
    for (var i = 0; i < SHOTS.length; i++) {
      if (token !== rec.token) return;
      var shot = SHOTS[i];
      var media = shot.kind === 'synth' ? rec.synth : rec.videos[i - 1];
      rec.played = i + 1;
      swing.textContent = 'Example swing ' + (i + 1) + ' of ' + SHOTS.length;
      swing.classList.add('is-on');
      media.node.classList.add('is-on');
      if (shot.kind === 'synth') { recLater(560, function () { aim.style.opacity = '0'; }); }
      else aim.style.opacity = '0';
      await playIn(media, token);
      if (token !== rec.token) return;
      await wait(shot.kind === 'synth' ? 500 : 250);
      if (token !== rec.token) return;
      media.node.classList.remove('is-on');
      aim.style.opacity = '';
      await wait(380);
      media.unload();
      await wait(650);
    }
    if (token !== rec.token) return;
    swing.textContent = 'All four played · tap stop';
  }
  function stopRecording(silent) {
    var wasRecording = rec.recording;
    rec.recording = false;
    rec.token++; recClear(); clearInterval(rec.tick);
    if (rec.synth) rec.synth.pause();
    if (rec.videos) rec.videos.forEach(function (m) { m.pause(); });
    if (silent || !wasRecording) return;
    var n = Math.max(1, rec.played);
    var r = scr('record');
    r.classList.remove('is-recording');
    // Record → Finding your shots
    var proc = scr('processing');
    state.stack.push('processing');
    proc.style.zIndex = 50 + state.stack.length;
    proc.hidden = false;
    syncInert();
    focusInto(proc);
    enter(proc, 'fade').then(function () {
      var i = state.stack.indexOf('record');
      if (i >= 0) state.stack.splice(i, 1);
      r.hidden = true;
      resetRecordUI();
      syncInert();
    });
    runProcessing(SHOTS.slice(0, n));
    announce('Finding your shots.');
  }

  /* ================= Finding your shots ================= */
  var proc = { timers: [], pending: null, anim: null };
  function procCancel() { proc.timers.forEach(clearTimeout); proc.timers = []; if (proc.anim) { proc.anim.cancel(); proc.anim = null; } }
  function runProcessing(list) {
    procCancel();
    var p = scr('processing'), grid = $('[data-proc-grid]', p), n = $('[data-proc-n]', p), bar = $('[data-proc-bar]', p), meta = $('[data-proc-meta]', p);
    var badge = $('[data-proc-comet]', p);
    if (!badge.firstChild) badge.appendChild(cometSVG());
    grid.innerHTML = ''; n.textContent = '0'; meta.textContent = 'Checking frames…';
    $('[data-proc-label]', p).textContent = 'shots so far';
    state.sessions++;
    var time = sessionTime(state.sessions);
    var entries = list.map(function (s) { return { uid: ++state.uid, shot: s, fav: false, time: time }; });
    proc.pending = entries;
    var gap = reduce.matches ? 500 : 820, D = 700 + entries.length * gap;
    bar.style.transform = 'scaleX(0)';
    if (bar.animate) { proc.anim = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: D, easing: 'cubic-bezier(0.3, 0.1, 0.3, 1)', fill: 'forwards' }); }
    else bar.style.transform = 'scaleX(1)';
    entries.forEach(function (e, k) {
      proc.timers.push(setTimeout(function () {
        n.textContent = String(k + 1);
        $('[data-proc-label]', p).textContent = k === 0 ? 'shot so far' : 'shots so far';
        var t = el('<div class="thumb is-new"></div>');
        t.appendChild(thumbArt(e.shot));
        t.appendChild(el('<span class="t-chip glass">' + e.time + '</span>'));
        var tr = el('<span class="tracing">' + I.spinner + 'Tracing</span>');
        t.appendChild(tr);
        grid.insertBefore(t, grid.firstChild);
        proc.timers.push(setTimeout(function () { tr.style.opacity = '0'; }, gap * 0.85));
      }, 450 + k * gap));
    });
    proc.timers.push(setTimeout(function () { meta.textContent = 'All checked · tracing 1 more'; }, D - 250));
    proc.timers.push(setTimeout(function () { meta.textContent = 'All done'; }, D + 500));
    proc.timers.push(setTimeout(finishProcessing, D + 1200));
  }
  function finishProcessing() {
    if (!proc.pending) return;
    var entries = proc.pending;
    proc.pending = null;
    procCancel();
    state.shots = entries.slice().concat(state.shots);
    state.favOnly = false;
    renderLibrary(entries.length);
    setTab('library', true);
    $('.scr-scroll', scr('library')).scrollTop = 0;
    dismiss('processing', 'cover');
    announce(entries.length + (entries.length === 1 ? ' shot' : ' shots') + ' added to your Library.');
  }
  function sessionTime(k) { var m = 36 + k * 2; return '9:' + String(Math.min(59, m)).padStart(2, '0') + ' AM'; }

  /* ================= Library ================= */
  function wireLibrary() {
    $('[data-proc-bg]').addEventListener('click', finishProcessing);
    var f = $('[data-fav-filter]');
    f.addEventListener('click', function () {
      state.favOnly = !state.favOnly;
      f.setAttribute('aria-pressed', state.favOnly);
      f.setAttribute('aria-label', state.favOnly ? 'Show all shots' : 'Show favorites only');
      renderLibrary();
      announce(state.favOnly ? 'Showing favorites' : 'Showing all shots');
    });
  }
  function visibleShots() { return state.favOnly ? state.shots.filter(function (e) { return e.fav; }) : state.shots; }
  function renderLibrary(fresh) {
    var body = $('[data-lib-body]'), list = visibleShots();
    var total = state.shots.length;
    $('[data-lib-count]').textContent = state.favOnly ? (list.length + (list.length === 1 ? ' favorite' : ' favorites')) : (total ? total + (total === 1 ? ' shot' : ' shots') : 'No shots yet');
    $('[data-fav-filter]').setAttribute('aria-pressed', state.favOnly);
    body.innerHTML = '';
    if (!list.length) {
      var empty = el(state.favOnly
        ? '<div class="lib-empty"><h3>No favorites yet</h3><p>Tap the heart on a shot and it shows up here.</p></div>'
        : '<div class="lib-empty"><h3>No shots yet</h3><p>Start a session, hit a few balls and stop. Every shot lands here, cut and traced.</p><button class="btn-lime tap" type="button">' + I.rec + 'Start Session</button></div>');
      if (!state.favOnly) { empty.insertBefore(cometSVG('comet'), empty.firstChild); empty.querySelector('button').addEventListener('click', openRecord); }
      body.appendChild(empty);
      return;
    }
    body.appendChild(el('<h3 class="lib-group">Today · ' + list.length + '</h3>'));
    var grid = el('<div class="lib-grid"></div>');
    list.forEach(function (e, i) {
      var b = el('<button class="thumb tap" type="button"></button>');
      b.setAttribute('aria-label', 'Shot ' + (i + 1) + ', ' + e.time + ', ' + e.shot.len.toFixed(1) + ' seconds' + (e.fav ? ', favorite' : ''));
      b.appendChild(thumbArt(e.shot));
      b.appendChild(el('<span class="t-chip glass">' + e.time + ' · ' + e.shot.len.toFixed(1) + 's</span>'));
      if (e.fav) b.appendChild(el('<span class="t-fav glass">' + I.heartFill + '</span>'));
      if (fresh && i < fresh && !reduce.matches) { b.classList.add('is-new'); b.style.animationDelay = (120 + i * 70) + 'ms'; }
      b.addEventListener('click', function () { openViewer(i); });
      grid.appendChild(b);
    });
    body.appendChild(grid);
  }

  /* ================= Shot viewer ================= */
  var vw = { list: [], i: 0, pages: [], raf: 0, drag: null, scrub: null, playing: true, toastT: 0 };
  function openViewer(i) {
    vw.list = visibleShots().slice();
    vw.i = i; vw.playing = true;
    buildViewer();
    present('viewer', 'zoom');
    goTo(i, true);
    loopViewer();
    announce('Shot ' + (i + 1) + ' of ' + vw.list.length + '. Swipe or use the arrow keys for the next shot.');
  }
  function buildViewer() {
    var track = $('[data-v-track]'), strip = $('[data-v-strip]');
    viewerPauseAll();
    track.innerHTML = ''; strip.innerHTML = '';
    vw.pages = vw.list.map(function (e, k) {
      var page = el('<div class="v-page"><div class="v-media"></div></div>');
      track.appendChild(page);
      var poster = e.shot.kind === 'video' ? el('<img src="' + e.shot.poster + '" alt="" draggable="false">') : null;
      if (poster) { poster.style.objectPosition = e.shot.pos; page.firstChild.appendChild(poster); }
      var t = el('<button class="thumb" type="button" aria-label="Shot ' + (k + 1) + '"></button>');
      t.appendChild(thumbArt(e.shot));
      t.addEventListener('click', function () { goTo(k); });
      strip.appendChild(t);
      return { node: page, box: page.firstChild, media: null, entry: e, thumb: t };
    });
    $('[data-v-strip-hd]').textContent = 'Today · ' + vw.list.length;
  }
  function ensureMedia(k) {
    var p = vw.pages[k];
    if (!p || p.media) return p && p.media;
    p.media = mediaFor(p.entry.shot, true, { width: 13, ball: false });
    p.box.appendChild(p.media.node);
    if (p.entry.shot.kind === 'synth') p.media.currentTime = 0;
    return p.media;
  }
  function viewerPauseAll() { cancelAnimationFrame(vw.raf); vw.pages.forEach(function (p) { if (p.media) p.media.pause(); }); }
  function curMedia() { var p = vw.pages[vw.i]; return p && p.media; }
  function goTo(k, instant) {
    if (k < 0 || k >= vw.pages.length) { setTrack(vw.i, false); return; }
    var prev = vw.pages[vw.i];
    if (prev && prev.media && k !== vw.i) prev.media.unload();
    vw.i = k;
    setTrack(k, !instant);
    var m = ensureMedia(k);
    ensureMedia(k + 1); ensureMedia(k - 1);
    if (m) {
      m.playbackRate = SPEEDS[state.speed][0];
      m.currentTime = 0;
      if (vw.playing) m.play(); else m.pause();
    }
    var e = vw.list[k];
    $('[data-v-title]').innerHTML = 'Today, ' + e.time + ' <span>' + (k + 1) + ' of ' + vw.list.length + '</span>';
    $('[data-v-prev]').disabled = k === 0;
    $('[data-v-next]').disabled = k === vw.list.length - 1;
    vw.pages.forEach(function (p, j) { p.thumb.setAttribute('aria-current', j === k ? 'true' : 'false'); });
    var row = $('[data-v-strip]'), th = vw.pages[k].thumb;
    row.scrollTo({ left: th.offsetLeft - row.clientWidth / 2 + th.offsetWidth / 2, behavior: instant || reduce.matches ? 'auto' : 'smooth' });
    syncFav(); syncPlay();
  }
  function setTrack(k, animated, dx) {
    var track = $('[data-v-track]');
    track.style.transition = animated && !reduce.matches ? 'transform 440ms ' + EASE : 'none';
    track.style.transform = 'translateX(' + (-k * W + (dx || 0)) + 'px)';
  }
  function syncFav() {
    var e = vw.list[vw.i], b = $('[data-v-fav]');
    if (!e) return;
    b.setAttribute('aria-pressed', e.fav);
    b.setAttribute('aria-label', e.fav ? 'Remove from favorites' : 'Favorite');
    b.innerHTML = e.fav ? I.heartFill : I.heart;
  }
  function syncPlay() {
    var b = $('[data-v-play]');
    b.innerHTML = vw.playing ? I.pause : I.play;
    b.setAttribute('aria-label', vw.playing ? 'Pause' : 'Play');
  }
  function loopViewer() {
    cancelAnimationFrame(vw.raf);
    var fill = $('[data-v-fill]'), knob = $('[data-v-knob]'), sl = $('[data-v-scrub]');
    var step = function () {
      var m = curMedia();
      if (m) {
        var p = Math.max(0, Math.min(1, m.currentTime / (m.duration || 1)));
        fill.style.transform = 'scaleX(' + p + ')';
        knob.style.left = (6 + p * 354) + 'px';
        sl.setAttribute('aria-valuenow', Math.round(p * 100));
        sl.setAttribute('aria-valuetext', m.currentTime.toFixed(1) + ' of ' + m.duration.toFixed(1) + ' seconds');
      }
      vw.raf = requestAnimationFrame(step);
    };
    vw.raf = requestAnimationFrame(step);
  }
  function toast(text) {
    var t = $('[data-v-toast]');
    t.textContent = text; t.classList.add('is-on');
    clearTimeout(vw.toastT);
    vw.toastT = setTimeout(function () { t.classList.remove('is-on'); }, 900);
  }
  function wireViewer() {
    var v = scr('viewer'), stage = $('[data-v-stage]');
    $('[data-v-back]').addEventListener('click', closeViewer);
    $('[data-v-prev]').addEventListener('click', function () { goTo(vw.i - 1); });
    $('[data-v-next]').addEventListener('click', function () { goTo(vw.i + 1); });
    $('[data-v-play]').addEventListener('click', function () {
      vw.playing = !vw.playing;
      var m = curMedia(); if (m) { if (vw.playing) m.play(); else m.pause(); }
      syncPlay();
    });
    $('[data-v-speed]').addEventListener('click', function () {
      state.speed = (state.speed + 1) % SPEEDS.length;
      var s = SPEEDS[state.speed];
      this.textContent = s[1];
      this.setAttribute('aria-label', 'Playback speed ' + s[1]);
      vw.pages.forEach(function (p) { if (p.media) p.media.playbackRate = s[0]; });
      toast(s[1] + ' speed');
      announce('Speed ' + s[1]);
    });
    $('[data-v-fav]').addEventListener('click', function () {
      var e = vw.list[vw.i]; if (!e) return;
      e.fav = !e.fav;
      syncFav();
      var b = this; b.classList.remove('pop'); void b.offsetWidth; if (e.fav && !reduce.matches) b.classList.add('pop');
      renderLibrary();
      announce(e.fav ? 'Added to favorites' : 'Removed from favorites');
    });
    $('[data-v-del]').addEventListener('click', function () {
      openSheet('<b>Delete this shot?</b>It’s removed from your Library. In this demo nothing is really deleted.', 'Delete Shot', deleteCurrent);
    });

    // Swipe between shots (Photos style); a short tap shows or hides the controls
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      vw.drag = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, mode: null, id: e.pointerId };
    });
    stage.addEventListener('pointermove', function (e) {
      var d = vw.drag; if (!d || d.id !== e.pointerId) return;
      var s = parseFloat(app.style.getPropertyValue('--s')) || 1;
      var dx = (e.clientX - d.x) / s, dy = (e.clientY - d.y) / s;
      if (!d.mode) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { d.mode = 'swipe'; try { stage.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
        else if (Math.abs(dy) > 10) { d.mode = 'scroll'; }
      }
      if (d.mode === 'swipe') {
        e.preventDefault();
        var edge = (vw.i === 0 && dx > 0) || (vw.i === vw.pages.length - 1 && dx < 0);
        d.dx = edge ? dx * 0.32 : dx;
        setTrack(vw.i, false, d.dx);
      }
    });
    var end = function (e) {
      var d = vw.drag; if (!d || d.id !== e.pointerId) return;
      vw.drag = null;
      var dt = performance.now() - d.t;
      if (d.mode === 'swipe') {
        var vel = d.dx / Math.max(1, dt);
        if (d.dx < -90 || vel < -0.45) goTo(vw.i + 1);
        else if (d.dx > 90 || vel > 0.45) goTo(vw.i - 1);
        else setTrack(vw.i, true);
      } else if (!d.mode && dt < 400 && e.type === 'pointerup') {
        app.classList.toggle('is-bare');
      }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', function (e) { if (vw.drag) { vw.drag.mode = vw.drag.mode === 'swipe' ? 'swipe' : 'scroll'; end(e); } });

    // Scrubber
    var sl = $('[data-v-scrub]');
    var seekTo = function (clientX) {
      var r = sl.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (clientX - r.left - 6 * (r.width / 378)) / (r.width * 354 / 378)));
      var m = curMedia(); if (m) m.currentTime = p * m.duration;
    };
    sl.addEventListener('pointerdown', function (e) {
      var m = curMedia(); if (!m) return;
      vw.scrub = { was: !m.paused };
      m.pause();
      sl.classList.add('is-drag');
      try { sl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      seekTo(e.clientX);
    });
    sl.addEventListener('pointermove', function (e) { if (vw.scrub) seekTo(e.clientX); });
    var stop = function () {
      if (!vw.scrub) return;
      var m = curMedia();
      if (m && vw.scrub.was && vw.playing) m.play();
      vw.scrub = null; sl.classList.remove('is-drag');
    };
    sl.addEventListener('pointerup', stop); sl.addEventListener('pointercancel', stop);
    sl.addEventListener('keydown', function (e) {
      var m = curMedia(); if (!m) return;
      var d = { ArrowLeft: -0.25, ArrowRight: 0.25, ArrowDown: -0.25, ArrowUp: 0.25 }[e.key];
      if (e.key === 'Home') { m.currentTime = 0; e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === 'End') { m.currentTime = m.duration; e.preventDefault(); e.stopPropagation(); return; }
      if (d !== undefined) { m.pause(); vw.playing = false; syncPlay(); m.currentTime = m.currentTime + d; e.preventDefault(); e.stopPropagation(); }
    });
    v.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { goTo(vw.i + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { goTo(vw.i - 1); e.preventDefault(); }
      else if (e.key === 'Escape') { closeViewer(); }
    });
  }
  function closeViewer() {
    renderLibrary();
    dismiss('viewer', 'zoom');
    announce('Library');
  }
  function deleteCurrent() {
    var e = vw.list[vw.i]; if (!e) return;
    state.shots = state.shots.filter(function (x) { return x !== e; });
    vw.list.splice(vw.i, 1);
    renderLibrary();
    if (!vw.list.length) { closeViewer(); return; }
    var k = Math.min(vw.i, vw.list.length - 1);
    buildViewer();
    vw.i = k;
    goTo(k, true);
    loopViewer();
    announce('Shot deleted');
  }

  /* ================= Action sheet ================= */
  var sheetFn = null, sheetReturn = null;
  function openSheet(msg, action, fn) {
    var sh = $('[data-sheet]');
    $('.msg', sh).innerHTML = msg;
    $('[data-sheet-ok]', sh).textContent = action;
    sheetFn = fn; sheetReturn = document.activeElement;
    sh.hidden = false;
    syncInert();
    if (!reduce.matches) { animate(sh, [{ opacity: 0 }, { opacity: 1 }], 200, 'ease-out'); animate($('.card', sh), [{ transform: 'translateY(60px)' }, { transform: 'none' }], 420); animate($('.cancel', sh), [{ transform: 'translateY(80px)' }, { transform: 'none' }], 460); }
    if (app.contains(sheetReturn)) setTimeout(function () { $('[data-sheet-cancel]', sh).focus({ preventScroll: true }); }, 30);
  }
  function closeSheet() {
    var sh = $('[data-sheet]');
    if (sh.hidden) return;
    sh.hidden = true; sheetFn = null;
    syncInert();
    if (sheetReturn && app.contains(sheetReturn) && !sheetReturn.closest('[inert]')) sheetReturn.focus({ preventScroll: true });
  }
  function wireSheet() {
    var sh = $('[data-sheet]');
    $('[data-sheet-ok]', sh).addEventListener('click', function () { var fn = sheetFn; closeSheet(); if (fn) fn(); });
    $('[data-sheet-cancel]', sh).addEventListener('click', closeSheet);
    sh.addEventListener('click', function (e) { if (e.target === sh) closeSheet(); });
    sh.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); } });
  }

  /* ================= Settings ================= */
  function renderSettings() {
    $('[data-st-shots]').textContent = state.shots.length;
    $('[data-st-sessions]').textContent = state.sessions;
    $$('[data-color]').forEach(function (b) { b.setAttribute('aria-checked', +b.getAttribute('data-color') === state.tracer); });
    $$('[data-toggle]').forEach(function (b) { b.setAttribute('aria-checked', !!state.toggles[b.getAttribute('data-toggle')]); });
    app.style.setProperty('--tracer', COLORS[state.tracer][1]);
  }
  function wireSettings() {
    $$('[data-color]').forEach(function (b) {
      b.addEventListener('click', function () { state.tracer = +b.getAttribute('data-color'); renderSettings(); announce('Tracer color ' + COLORS[state.tracer][0]); });
    });
    $$('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-toggle'); state.toggles[k] = !state.toggles[k]; b.setAttribute('aria-checked', state.toggles[k]); });
    });
    $('[data-delete-all]').addEventListener('click', function () {
      if (!state.shots.length) { announce('There are no shots to delete.'); return; }
      openSheet('<b>Delete every shot and its video?</b>This removes ' + state.shots.length + (state.shots.length === 1 ? ' shot' : ' shots') + ' from this demo.', 'Delete All Shots', function () {
        state.shots = []; renderLibrary(); renderSettings(); announce('All shots deleted');
      });
    });
    $('[data-intro]').addEventListener('click', function () { openTutorial(); });
  }

  /* ================= Comet's intro ================= */
  var tut = { i: 0, svg: null, audio: {}, voice: false, talkT: 0, faceT: 0, artMedia: null, finishing: false };
  function openTutorial() {
    if (state.stack.indexOf('tutorial') >= 0) return;
    var t = scr('tutorial');
    if (!tut.svg) { tut.svg = cometSVG(); $('.tut-comet .flip', t).appendChild(tut.svg); }
    tut.finishing = false;
    tutStep(0, true);
    present('tutorial', 'cover');
    announce('Introduction. ' + STEPS[0].line);
  }
  function tutStep(i, instant) {
    var t = scr('tutorial'), s = STEPS[i], left = i % 2 === 0;
    tut.i = i;
    var cometBtn = $('[data-comet-btn]', t), bubble = $('[data-bubble]', t);
    cometBtn.style.left = (left ? 22 : 232) + 'px';
    $('.flip', cometBtn).style.transform = left ? 'none' : 'scaleX(-1)';
    bubble.style.left = (left ? 186 : 20) + 'px';
    bubble.className = 'tut-bubble ' + (left ? 'right' : 'left');
    $('b', bubble).textContent = s.line;
    var ex = $('span', bubble); ex.textContent = s.extra; ex.hidden = !s.extra;
    $$('.tut-dots i', t).forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
    $('[data-tut-next]', t).textContent = i === STEPS.length - 1 ? 'Get Started' : (i === 0 ? 'Show Me' : 'Continue');
    renderArt(s.art, instant);
    if (!instant && !reduce.matches) {
      animate(bubble, [{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], 420);
      animate(cometBtn, [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)', offset: 0.4 }, { transform: 'translateY(0)' }], 620);
    }
    tutSay(s.voice);
  }
  function renderArt(kind, instant) {
    var card = $('[data-tut-card]');
    if (tut.artMedia) { tut.artMedia.pause(); tut.artMedia = null; }
    var art = el('<div class="tut-art"></div>');
    if (kind === 'range') art.innerHTML = img('tall', ' style="object-position:50% 70%"');
    else if (kind === 'tracer') {
      var sy = new SynthMedia(makeSynth('tall', { width: 16, ball: false }), false);
      art.appendChild(sy.node);
      sy.node.querySelector('img').style.objectPosition = '50% 60%';
      if (reduce.matches) sy.currentTime = sy.duration; else { sy.currentTime = 0.4; setTimeout(function () { sy.play(); }, instant ? 500 : 300); }
      sy.loop = false;
      tut.artMedia = sy;
      art.appendChild(el('<span class="chip glass" style="bottom:14px">Example</span>'));
    } else if (kind === 'placement') {
      art.innerHTML = '<img class="fill-img" src="/assets/img/range-dtl-900.webp" alt="" draggable="false" style="object-position:58% 50%"><span class="chip glass" style="bottom:14px">Behind you, on the target line</span>';
    } else if (kind === 'record') {
      art.innerHTML = '<div style="position:absolute;inset:0 0 74px;overflow:hidden">' + img('tall', ' style="object-position:50% 100%"') +
        '<div class="ring" style="left:118px;top:232px;width:44px;height:44px"><span class="solid" style="opacity:1"></span><span class="badge" style="transform:scale(1);width:18px;height:18px;right:-5px;top:-5px">' + I.check + '</span></div>' +
        '<span class="chip glass" style="top:186px;height:26px;font-size:12px">' + I.lock.replace('class="ico"', 'class="ico" style="width:12px;height:12px;color:#c6f23f"') + 'Locked</span>' +
        '<div class="tut-mini-top"><span class="round glass">' + I.chevL + '</span><span class="capsule glass">240 fps</span><span class="round glass" style="color:#c6f23f">' + I.check + '</span></div></div>' +
        '<div class="tut-mini-bar"><span class="shutter"><i></i></span></div>';
    } else if (kind === 'shots') {
      var g = el('<div class="tut-shots"></div>');
      SHOTS.forEach(function (s) { var th = el('<div class="thumb"></div>'); th.appendChild(thumbArt(s)); g.appendChild(th); });
      art.appendChild(g);
    } else if (kind === 'private') {
      art.innerHTML = img('tall', ' style="object-position:50% 60%;opacity:.35"') + '<div class="tut-private"><span class="lockbig glass">' + I.lock + '</span><span class="chip glass">On this iPhone</span></div>';
    }
    var old = card.firstElementChild;
    card.appendChild(art);
    if (old) {
      if (instant || reduce.matches) old.remove();
      else {
        animate(art, [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], 460);
        animate(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-40px)' }], 360).then(function () { old.remove(); });
      }
    }
  }
  function cometTap() {
    var btn = $('[data-comet-btn]'), svg = tut.svg;
    clearTimeout(tut.faceT);
    face(svg, 'faceClosed');
    tut.faceT = setTimeout(function () { face(svg, 'face'); }, 1000);
    if (reduce.matches) { animate($('.comet-glow', btn), [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], 700, 'ease-out'); glitter(btn, 6, true); return; }
    animate($('.flip', btn).parentNode === btn ? svg : svg, [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(6px) scale(1.08, 0.9)', offset: 0.12 },
      { transform: 'translateY(-44px) scale(0.96, 1.06)', offset: 0.45 },
      { transform: 'translateY(4px) scale(1.06, 0.93)', offset: 0.8 },
      { transform: 'translateY(0) scale(1, 1)' }
    ], 720, 'cubic-bezier(0.3, 0.7, 0.4, 1)');
    animate($('.comet-glow', btn), [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], 900, 'ease-out');
    setTimeout(function () { glitter(btn, 18, false); }, 220);
  }
  var STAR = 'M12 1.5Q13.6 10.4 22.5 12Q13.6 13.6 12 22.5Q10.4 13.6 1.5 12Q10.4 10.4 12 1.5Z';
  function glitter(btn, count, calm) {
    var t = scr('tutorial'), stage = $('.tut-stage', t);
    var cx = btn.offsetLeft + (btn.querySelector('.flip').style.transform ? 62 : 88), cy = btn.offsetTop + 52 + stage.offsetTop;
    for (var k = 0; k < count; k++) {
      var g = el('<span class="glitter"><svg viewBox="0 0 24 24">' + (k % 3 === 2
        ? '<circle cx="12" cy="12" r="6" fill="#c6f23f"/>'
        : '<path d="' + STAR + '" fill="#c6f23f" stroke="#2E4F1F" stroke-width="1.6" stroke-linejoin="round"/>') + '</svg></span>');
      var size = 10 + Math.random() * 14;
      g.style.left = cx + 'px'; g.style.top = cy + 'px'; g.style.width = g.style.height = size + 'px';
      t.appendChild(g);
      var a = (k / count) * Math.PI * 2 + Math.random() * 0.5, dist = calm ? 40 + Math.random() * 20 : 60 + Math.random() * 70;
      var dx = Math.cos(a) * dist, dy = Math.sin(a) * dist - (calm ? 0 : 20), rot = (Math.random() - 0.5) * 360;
      (function (node) {
        var frames = calm
          ? [{ opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.6)' }, { opacity: 1, offset: 0.4 }, { opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.6)' }]
          : [{ opacity: 1, transform: 'translate(0,0) scale(0) rotate(0deg)' }, { opacity: 1, transform: 'translate(' + dx * 0.7 + 'px,' + dy * 0.7 + 'px) scale(1.1) rotate(' + rot * 0.6 + 'deg)', offset: 0.45 }, { opacity: 0, transform: 'translate(' + dx + 'px,' + (dy + 26) + 'px) scale(.5) rotate(' + rot + 'deg)' }];
        animate(node, frames, calm ? 800 : 820 + Math.random() * 380, 'cubic-bezier(0.2, 0.7, 0.3, 1)').then(function () { node.remove(); });
      })(g);
    }
  }
  function tutSay(which) {
    tutStopVoice();
    if (!tut.voice || !which) return;
    var a = tut.audio[which];
    if (!a) { a = tut.audio[which] = new Audio('/assets/demo/voice/comet-' + which + '.m4a'); a.preload = 'auto'; }
    a.currentTime = 0;
    var p = a.play(); if (p) p.catch(function () {});
    var open = false;
    tut.talkT = setInterval(function () { open = !open; face(tut.svg, open ? 'faceTalk' : 'face'); }, 120);
    a.onended = function () { clearInterval(tut.talkT); face(tut.svg, 'face'); };
  }
  function tutStopVoice() {
    clearInterval(tut.talkT);
    Object.keys(tut.audio).forEach(function (k) { tut.audio[k].pause(); });
    if (tut.svg) face(tut.svg, 'face');
  }
  function tutFinish() {
    if (tut.finishing) return;
    tut.finishing = true;
    var t = scr('tutorial'), bubble = $('[data-bubble]', t);
    $('b', bubble).textContent = 'Let’s go!';
    $('span', bubble).hidden = true;
    tutSay('farewell');
    cometTap();
    setTimeout(function () { if (state.stack.indexOf('tutorial') >= 0) dismiss('tutorial', 'cover'); setTab('home', state.tab === 'home'); }, reduce.matches ? 700 : 1300);
  }
  function wireTutorial() {
    var t = scr('tutorial');
    $('[data-comet-btn]', t).addEventListener('click', cometTap);
    $('[data-skip]', t).addEventListener('click', function () { dismiss('tutorial', 'cover'); });
    $('[data-tut-next]', t).addEventListener('click', function () {
      if (tut.i >= STEPS.length - 1) tutFinish(); else { tutStep(tut.i + 1); announce(STEPS[tut.i].line + ' ' + STEPS[tut.i].extra); }
    });
    var vb = $('[data-voice]', t);
    vb.addEventListener('click', function () {
      tut.voice = !tut.voice;
      vb.setAttribute('aria-pressed', tut.voice);
      vb.setAttribute('aria-label', tut.voice ? 'Mute Comet' : 'Unmute Comet');
      vb.innerHTML = tut.voice ? I.speaker : I.speakerOff;
      if (tut.voice) tutSay(STEPS[tut.i].voice || (tut.i === 0 ? 'welcome' : null)); else tutStopVoice();
    });
  }

  /* ================= Restart, visibility ================= */
  function restart() {
    if (!app) { build(); return; }
    closeSheet();
    stopRecording(true);
    procCancel(); proc.pending = null;
    viewerPauseAll(); tutStopVoice();
    state.stack.slice().forEach(function (n) { scr(n).hidden = true; });
    var keepVoice = tut.voice;
    state = fresh();
    tut.voice = keepVoice;
    app.classList.remove('is-bare');
    resetRecordUI();
    $$('.scr-scroll').forEach(function (s) { s.scrollTop = 0; });
    $$('.navbar').forEach(function (n) { n.classList.remove('is-on'); });
    var sp = $('[data-v-speed]'); sp.textContent = '1×'; sp.setAttribute('aria-label', 'Playback speed 1×');
    renderLibrary(); renderSettings();
    setTab('home', true);
    enter(scr('home'), 'fade');
    announce('Demo restarted. Home screen.');
  }
  if (restartBtn) restartBtn.addEventListener('click', restart);

  // Build when the section comes near; pause playback while it's off screen.
  var paused = [];
  function pauseOffscreen() {
    paused = [];
    if (!app) return;
    var cands = [];
    if (rec.synth) cands.push(rec.synth);
    if (rec.videos) cands = cands.concat(rec.videos);
    vw.pages.forEach(function (p) { if (p.media) cands.push(p.media); });
    cands.forEach(function (m) { if (!m.paused) { m.pause(); paused.push(m); } });
  }
  function resumeOnscreen() { paused.forEach(function (m) { m.play(); }); paused = []; }
  if ('IntersectionObserver' in window) {
    var near = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { near.disconnect(); build(); }
    }, { rootMargin: '900px 0px' });
    near.observe(section);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) resumeOnscreen(); else pauseOffscreen(); });
    }, { threshold: 0 }).observe(root);
  } else build();
  reduce.addEventListener && reduce.addEventListener('change', function () { if (app) showHomeHero(); });
})();
