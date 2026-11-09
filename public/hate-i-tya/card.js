// card.js — the "my i-tya" card, shared by the game (demo.js) and the phone page (card.html).
//   ItyaCard.draw(data, imgs)      -> <canvas> 960x1200
//   ItyaCard.shareUrl(data, base)  -> URL for the QR code.  The data lives after "#", which
//                                     browsers never send to the server, so names stay on the device.
//   ItyaCard.parseHash(hash)       -> sanitised data back from "#n=..&k=..&s=..&w=.."
(function (root) {
  'use strict';

  var FONT_PIXEL = "'Press Start 2P', 'DotGothic16', system-ui";
  var FONT_KANA = "'DotGothic16', 'Press Start 2P', system-ui";
  // where the phone page lives (QR codes must point at the public site, not at the kiosk's localhost)
  var PUBLIC_BASE = 'https://ityannel.github.io/itya.site/hate-i-tya/';

  // ---- data: sanitise everything (it can come from a URL) ----
  function clean(d) {
    d = d || {};
    var name = String(d.name || '').replace(/[^A-Za-z]/g, '').slice(0, 24);
    var kana = Array.from(String(d.kana || '')).filter(function (c) { return /[぀-ヿー]/.test(c); }).slice(0, 8).join('');
    var built = String(d.built || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    var words = (Array.isArray(d.words) ? d.words : []).map(function (w) { return String(w).toLowerCase().replace(/[^a-z]/g, '').slice(0, 20); })
      .filter(Boolean).slice(0, 10);
    return { name: name, kana: kana, built: built, words: words };
  }

  function buildHash(data) {
    var d = clean(data), parts = ['n=' + encodeURIComponent(d.name)];
    if (d.kana) parts.push('k=' + encodeURIComponent(d.kana));
    if (d.built) parts.push('s=' + d.built.replace(/ /g, '+'));
    if (d.words.length) parts.push('w=' + d.words.join('.'));
    return '#' + parts.join('&');
  }

  function parseHash(hash) {
    var p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    return clean({ name: p.get('n'), kana: p.get('k'), built: p.get('s'), words: (p.get('w') || '').split('.') });
  }

  function shareUrl(data, base) {
    return (base || PUBLIC_BASE) + 'card.html' + buildHash(data);
  }

  // ---- drawing ----
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fitFont(ctx, text, maxWidth, startPx, family) {
    var px = startPx;
    for (; px > 12; px -= 2) { ctx.font = px + 'px ' + family; if (ctx.measureText(text).width <= maxWidth) break; }
    return px;
  }
  function drawImg(ctx, img, x, y, w, h) {
    try { if (img && img.width) ctx.drawImage(img, x, y, w, h); } catch (e) {}
  }
  function sentenceCase(s) {
    s = (s || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    s = s[0].toUpperCase() + s.slice(1);
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  // imgs: { bg, hero, teacher } — already-loaded HTMLImageElements (any may be missing)
  function draw(data, imgs) {
    var d = clean(data); imgs = imgs || {};
    var W = 960, H = 1200;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#0b0e24'; ctx.fillRect(0, 0, W, H);
    if (imgs.bg && imgs.bg.width) {
      var s = Math.max(W / imgs.bg.width, H / imgs.bg.height);
      ctx.drawImage(imgs.bg, (W - imgs.bg.width * s) / 2, (H - imgs.bg.height * s) / 2, imgs.bg.width * s, imgs.bg.height * s);
    }
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(8,10,30,.55)'); g.addColorStop(0.5, 'rgba(8,10,30,.72)'); g.addColorStop(1, 'rgba(8,10,30,.92)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#ffd35a'; ctx.lineWidth = 6; roundRect(ctx, 24, 24, W - 48, H - 48, 28); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,211,90,.35)'; ctx.lineWidth = 2; roundRect(ctx, 40, 40, W - 80, H - 80, 20); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
    ctx.font = '46px ' + FONT_PIXEL; ctx.fillText('Hate i-tya?', W / 2, 120);
    ctx.shadowBlur = 0;

    drawImg(ctx, imgs.hero, W / 2 - 250, 190, 230, 300);
    drawImg(ctx, imgs.teacher, W / 2 + 20, 190, 230, 300);

    ctx.fillStyle = '#9fc1ff'; ctx.font = '34px ' + FONT_PIXEL; ctx.fillText('Ma swa', W / 2, 560);
    var name = d.name || 'Ma';
    ctx.fillStyle = '#ffd35a';
    var px = fitFont(ctx, name, W - 160, 120, FONT_PIXEL);
    ctx.font = px + 'px ' + FONT_PIXEL; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 10;
    ctx.fillText(name, W / 2, 650); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '40px ' + FONT_KANA;
    if (d.kana) ctx.fillText(d.kana, W / 2, 735);
    ctx.fillStyle = '#9fc1ff'; ctx.font = '34px ' + FONT_PIXEL; ctx.fillText('ana.', W / 2, 800);

    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(120, 860); ctx.lineTo(W - 120, 860); ctx.stroke();

    var built = sentenceCase(d.built);
    if (built) {
      ctx.fillStyle = '#fff';
      var p2 = fitFont(ctx, built, W - 200, 44, FONT_PIXEL);
      ctx.font = p2 + 'px ' + FONT_PIXEL; ctx.fillText(built, W / 2, 925);
    }

    if (d.words.length) {
      ctx.font = '26px ' + FONT_PIXEL;
      var gap = 18, padX = 22, chipH = 54;
      var widths = d.words.map(function (w) { return ctx.measureText(w).width + padX * 2; });
      var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (d.words.length - 1);
      var x = (W - total) / 2, y = 1010;
      d.words.forEach(function (w, i) {
        ctx.fillStyle = 'rgba(255,211,90,.18)'; roundRect(ctx, x, y, widths[i], chipH, 14); ctx.fill();
        ctx.strokeStyle = '#ffd35a'; ctx.lineWidth = 2; roundRect(ctx, x, y, widths[i], chipH, 14); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText(w, x + widths[i] / 2, y + chipH / 2 + 2);
        x += widths[i] + gap;
      });
    }

    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '20px ' + FONT_PIXEL;
    ctx.fillText('i-tya-dictionary.vercel.app', W / 2, 1125);
    return c;
  }

  var api = { draw: draw, clean: clean, buildHash: buildHash, parseHash: parseHash, shareUrl: shareUrl, PUBLIC_BASE: PUBLIC_BASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ItyaCard = api;
})(typeof window !== 'undefined' ? window : this);
