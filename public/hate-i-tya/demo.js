// demo.js — open-campus mode.   Usage: index.html?demo=1
//
// What it does (nothing here runs unless ?demo=1 is in the URL):
//   1. A ~3-minute route through the story using only scenes whose i-tya is already
//      in the dictionary's language (no old-language lines, no map, no long monologue).
//   2. A new ending that ties into the story: the old man's first question
//      "Pa a i nyu?" (scene 4, which the hero could not answer) is asked again.
//      The visitor enters their own name, it is turned into an i-tya proper noun
//      (offline, see itya-name.js) and the hero finally answers: "Ma swa <Name> ana."
//   3. A shareable card: name + the sentence they built + words they learned.
//   4. Kiosk behaviour: no microphone, no server calls, Space-skip disabled,
//      automatic reset for the next visitor (see main.js).
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo') && params.get('demo') !== '0';
  window.DEMO_MODE = DEMO;
  if (!DEMO) return;

  // ---------------------------------------------------------------------------
  // 1. Route.  Each entry is a scene INDEX (position in `scenes`).
  //    Every scene on it shows only dictionary-language i-tya, game-owned words
  //    (hapo / mokuno / oi) or the author's own Japanese for the god.
  // ---------------------------------------------------------------------------
  const INTRO_ASK = scenes.length;        // god asks "Pa a i nyu?"
  const INTRO_ENTER = INTRO_ASK + 1;      // name entry (no text, not clickable)
  const INTRO_ANSWER = INTRO_ASK + 2;     // hero answers with the name
  const INTRO_PRAISE = INTRO_ASK + 3;     // god reacts
  const INTRO_CARD = INTRO_ASK + 4;       // the card

  const ROUTE = [
    0, 1, 2, 3, 4, 5,                     // wake up, the old man asks "Pa a i nyu?" (hero cannot answer)
    9, 10, 11, 12, 13, 14, 15, 16,        // village, quiz "hapo"
    22, 23, 24, 25, 26, 27,               // ice cream, quiz
    33, 34, 36, 38, 39, 40, 41,           // canteen, quiz "Ma pati ..."
    46, 47, 48,                           // quiz "Hukapata"
    108, 110, 111, 113, 114, 115, 116, 117, // the cave, the god
    129, 130, 133, 134, 135, 136,         // "words will save the world" -> build a sentence
    INTRO_ASK, INTRO_ENTER, INTRO_ANSWER, INTRO_PRAISE, INTRO_CARD,
  ];
  const DEMO_NEXT = {};
  for (let i = 0; i < ROUTE.length - 1; i++) DEMO_NEXT[ROUTE[i]] = ROUTE[i + 1];

  const originalNextScene = nextScene;
  nextScene = function () {                // scene actions call nextScene() by name
    const to = DEMO_NEXT[currentSceneIndex];
    if (to !== undefined && scenes[to]) { showScene(to); return; }
    originalNextScene();
  };

  // Space x3 normally skips 5 scenes, which would break the route.  Keep Space as "advance".
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    if (document.getElementById('itya-name-overlay') || document.getElementById('itya-card-overlay')) {
      e.stopImmediatePropagation();
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (typeof gameState !== 'undefined' && gameState === 'story') handleStoryClick();
  }, true);

  // ---------------------------------------------------------------------------
  // 2. New scenes (appended; the normal game never sees them)
  // ---------------------------------------------------------------------------
  const INTRO_TEMPLATE = (name) => `Ma swa ${name} ana.`;   // "my name: <Name> exists" (the dictionary translator's own form)
  const PRAISE_LINE = 'Pa hati nu!';                       // "you have come to know!"
  const intro = { kana: '', name: '' };

  scenes.push({
    scene: 143, bg: 1009,
    char: [{ char: 'mc', img: 0 }, { char: 'god' }],
    text: { content: 'Pa a i nyu?', char: 'god' },
    action: () => {}
  });
  scenes.push({
    scene: 144, bg: 1009,
    char: [{ char: 'mc', img: 0 }, { char: 'god' }],
    text: null, clickable: false,
    action: () => {
      openNameEntry((result) => {
        intro.kana = result.kana;
        intro.name = result.name;
        scenes[INTRO_ANSWER].text.content = INTRO_TEMPLATE(result.name);
        try { playSound(3); } catch (e) {}
        setTimeout(() => nextScene(), 400);
      });
    }
  });
  scenes.push({
    scene: 145, bg: 1009,
    char: [{ char: 'mc', img: 2 }, { char: 'god' }],
    text: { content: INTRO_TEMPLATE('...'), char: 'mc' },
    action: () => {}
  });
  scenes.push({
    scene: 146, bg: 1009,
    char: [{ char: 'mc', img: 0 }, { char: 'god' }],
    text: { content: PRAISE_LINE, char: 'god' },
    action: () => {}
  });
  scenes.push({
    scene: 147, bg: 1009,
    char: [{ char: 'mc', img: 0 }, { char: 'god' }],
    text: null, clickable: false,
    action: () => { setTimeout(showCard, 300); }
  });

  // ---------------------------------------------------------------------------
  // 3. Name entry (a "name your hero" screen: touch-friendly kana grid + keyboard)
  // ---------------------------------------------------------------------------
  const FONT_PIXEL = "'Press Start 2P', 'DotGothic16', system-ui";
  const FONT_KANA = "'DotGothic16', 'Press Start 2P', system-ui";
  const MAX_LEN = 8;

  function injectStyle() {
    if (document.getElementById('itya-demo-style')) return;
    const st = document.createElement('style');
    st.id = 'itya-demo-style';
    st.textContent = `
      .itya-ov { position: fixed; inset: 0; z-index: 25000; display: flex; align-items: center; justify-content: center;
                 background: rgba(8,10,26,.94); color: #fff; font-family: ${FONT_PIXEL}; box-sizing: border-box; padding: 2vh 2vw; }
      .itya-panel { display: flex; gap: 3vw; align-items: center; justify-content: center; width: 100%; max-width: 1100px; }
      .itya-left { flex: 1 1 46%; display: flex; flex-direction: column; align-items: center; gap: 2.4vh; min-width: 0; }
      .itya-q { color: #8fb8ff; font-size: clamp(16px, 3.4vh, 30px); }
      .itya-kana { min-height: 1.4em; font-family: ${FONT_KANA}; font-size: clamp(28px, 7vh, 64px); letter-spacing: .08em;
                   border-bottom: 3px solid #fff; padding: 0 .4em .1em; min-width: 6em; text-align: center; white-space: nowrap; }
      .itya-kana .cur { animation: itya-blink 1s steps(1) infinite; opacity: .9; }
      @keyframes itya-blink { 50% { opacity: 0; } }
      .itya-arrow { color: #888; font-size: clamp(14px, 2.6vh, 22px); }
      .itya-name { color: #ffd35a; font-size: clamp(20px, 5.4vh, 46px); min-height: 1.3em; text-align: center; word-break: break-all; }
      .itya-name.empty { color: #55506a; }
      .itya-grid { flex: 1 1 54%; display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(3px, .8vh, 8px); max-width: 520px; }
      .itya-key { font-family: ${FONT_KANA}; font-size: clamp(16px, 3.6vh, 30px); height: clamp(30px, 6.2vh, 54px);
                  background: #1c2142; color: #fff; border: 2px solid #4a5290; border-radius: 6px; cursor: pointer; padding: 0; }
      .itya-key:hover { background: #2b3366; }
      .itya-key:active { background: #ffd35a; color: #000; }
      .itya-key.ctl { background: #2a1c3e; border-color: #7a4aa0; }
      .itya-btn { font-family: ${FONT_PIXEL}; font-size: clamp(14px, 2.8vh, 24px); padding: 1.2vh 2.4vw; background: #ffd35a; color: #000;
                  border: 0; border-radius: 8px; cursor: pointer; }
      .itya-btn:disabled { background: #3a3850; color: #77738c; cursor: default; }
      .itya-btn.alt { background: #2b3366; color: #fff; }
      @media (max-aspect-ratio: 1/1) { .itya-panel { flex-direction: column; } .itya-grid { max-width: 92vw; } }
    `;
    document.head.appendChild(st);
  }

  // dakuten / handakuten / small-kana helpers
  const UNV = 'かきくけこさしすせそたちつてとはひふへほう';
  const VOI = 'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ';
  const SEMI = { 'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ' };
  const SEMI_FROM_VOI = { 'ば': 'ぱ', 'び': 'ぴ', 'ぶ': 'ぷ', 'べ': 'ぺ', 'ぼ': 'ぽ' };
  const BIG = 'あいうえおやゆよつわ';
  const SMALL = 'ぁぃぅぇぉゃゅょっゎ';

  function applyDakuten(ch) {
    let i = UNV.indexOf(ch); if (i >= 0) return VOI[i];
    i = VOI.indexOf(ch); if (i >= 0) return UNV[i];
    for (const k in SEMI) if (SEMI[k] === ch) return Object.keys(SEMI_FROM_VOI).find(v => SEMI_FROM_VOI[v] === ch);
    return ch;
  }
  function applyHandakuten(ch) {
    if (SEMI[ch]) return SEMI[ch];
    if (SEMI_FROM_VOI[ch]) return SEMI_FROM_VOI[ch];
    for (const k in SEMI) if (SEMI[k] === ch) return k;
    return ch;
  }
  function applySmall(ch) {
    let i = BIG.indexOf(ch); if (i >= 0) return SMALL[i];
    i = SMALL.indexOf(ch); if (i >= 0) return BIG[i];
    return ch;
  }

  const KEY_ROWS = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
                    'はひふへほ', 'まみむめも', 'やゆよわん', 'らりるれろ'];

  function click() { try { playSound(2); } catch (e) {} }

  function openNameEntry(onDone) {
    injectStyle();
    const old = document.getElementById('itya-name-overlay'); if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'itya-name-overlay';
    ov.className = 'itya-ov';
    ov.innerHTML = `
      <div class="itya-panel">
        <div class="itya-left">
          <div class="itya-q">Pa a i nyu?</div>
          <div class="itya-kana" id="itya-in-kana"></div>
          <div class="itya-arrow">&#9660;</div>
          <div class="itya-name empty" id="itya-in-name">&nbsp;</div>
          <button class="itya-btn" id="itya-in-ok" disabled>OK</button>
        </div>
        <div class="itya-grid" id="itya-in-grid"></div>
      </div>`;
    document.body.appendChild(ov);

    let buf = [];
    const kanaEl = ov.querySelector('#itya-in-kana');
    const nameEl = ov.querySelector('#itya-in-name');
    const okBtn = ov.querySelector('#itya-in-ok');
    const grid = ov.querySelector('#itya-in-grid');

    function refresh() {
      kanaEl.innerHTML = (buf.join('') || '&nbsp;') + '<span class="cur">_</span>';
      const name = window.ItyaName ? window.ItyaName.toItyaName(buf.join('')) : '';
      nameEl.textContent = name || ' ';
      nameEl.classList.toggle('empty', !name);
      okBtn.disabled = !name;
    }
    function push(ch) { if (buf.length < MAX_LEN) buf.push(ch); refresh(); }
    function back() { buf.pop(); refresh(); }
    function modLast(fn) { if (buf.length) buf[buf.length - 1] = fn(buf[buf.length - 1]); refresh(); }
    function finish() {
      const name = window.ItyaName.toItyaName(buf.join(''));
      if (!name) return;
      document.removeEventListener('keydown', onKey, true);
      ov.remove();
      onDone({ kana: buf.join(''), name });
    }

    function addKey(label, handler, cls) {
      const b = document.createElement('button');
      b.className = 'itya-key' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.addEventListener('click', (e) => { e.stopPropagation(); click(); handler(); });
      grid.appendChild(b);
    }
    for (const row of KEY_ROWS) for (const ch of row) addKey(ch, () => push(ch));
    addKey('゛', () => modLast(applyDakuten), 'ctl');    // ゛
    addKey('゜', () => modLast(applyHandakuten), 'ctl'); // ゜
    addKey('小', () => modLast(applySmall), 'ctl');      // 小
    addKey('ー', () => push('ー'), 'ctl');
    addKey('⌫', back, 'ctl');                           // ⌫
    okBtn.addEventListener('click', (e) => { e.stopPropagation(); finish(); });

    function onKey(e) {
      if (e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); back(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(); }
      else if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); e.stopPropagation(); push(e.key.toLowerCase());
      }
    }
    document.addEventListener('keydown', onKey, true);
    refresh();
  }

  // ---------------------------------------------------------------------------
  // 4. The card + take-home QR code  (drawing lives in card.js, shared with card.html)
  // ---------------------------------------------------------------------------
  function cardData() {
    return {
      name: intro.name, kana: intro.kana,
      built: typeof lastCraftedSentence !== 'undefined' ? lastCraftedSentence : '',
      words: (typeof wordbookData !== 'undefined' ? wordbookData : []).map(w => w.word),
    };
  }
  const loadedImg = (id) => (typeof imageLoaded !== 'undefined' && imageLoaded[id]) ? image[id] : null;

  // The QR must point at the PUBLIC site (a kiosk running on localhost is useless to a phone).
  // Staff can override with ?qrbase=https://host/path/hate-i-tya/  (trailing slash required).
  function qrBase() {
    const b = params.get('qrbase');
    return b && /^https?:\/\/[^\s]+\/$/.test(b) ? b : ItyaCard.PUBLIC_BASE;
  }

  // black on white with a 4-module quiet zone; null if the QR library is missing or the text is too long
  function makeQr(text) {
    try {
      const q = qrcode(0, 'M');           // type 0 = pick the smallest version that fits
      q.addData(text); q.make();
      const n = q.getModuleCount(), cell = Math.max(4, Math.floor(640 / (n + 8)));
      const c = document.createElement('canvas');
      c.width = c.height = (n + 8) * cell;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) ctx.fillRect((k + 4) * cell, (r + 4) * cell, cell, cell);
      c.dataset.modules = String(n); c.dataset.cell = String(cell);
      return c;
    } catch (e) { console.warn('QR could not be made', e); return null; }
  }

  function showCard() {
    injectStyle();
    const old = document.getElementById('itya-card-overlay'); if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'itya-card-overlay';
    ov.className = 'itya-ov';
    const portrait = innerHeight > innerWidth;
    ov.style.flexDirection = portrait ? 'column' : 'row';
    ov.style.gap = portrait ? '2vh' : '4vw';

    const data = cardData();
    const card = ItyaCard.draw(data, { bg: loadedImg(1003), hero: loadedImg(0), teacher: loadedImg(5) });
    card.style.maxHeight = portrait ? '50vh' : '88vh'; card.style.maxWidth = portrait ? '90vw' : '46vw';
    card.style.width = 'auto'; card.style.height = 'auto';
    card.style.borderRadius = '14px'; card.style.boxShadow = '0 0 40px rgba(255,211,90,.25)';
    ov.appendChild(card);

    const side = document.createElement('div');
    side.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2.4vh';
    const url = ItyaCard.shareUrl(data, qrBase());
    const qr = makeQr(url);
    if (qr) {
      const hint = document.createElement('div');                 // phone icon + arrow: no words needed
      hint.textContent = '📱 ▼';
      hint.style.cssText = 'font-size:clamp(22px,5vh,44px)';
      qr.style.cssText = `width:${portrait ? 'min(38vh,70vw)' : 'min(52vh,34vw)'};height:auto;image-rendering:pixelated;border-radius:8px;background:#fff`;
      side.appendChild(hint); side.appendChild(qr);
    } else {
      // safety net: if the QR cannot be made, fall back to saving the picture
      const save = document.createElement('button');
      save.className = 'itya-btn alt'; save.textContent = '⬇ PNG';
      save.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a'); a.href = card.toDataURL('image/png'); a.download = 'my-itya.png';
        document.body.appendChild(a); a.click(); a.remove();
      });
      side.appendChild(save);
    }
    const again = document.createElement('button');
    again.className = 'itya-btn'; again.textContent = 'Oi!';
    again.addEventListener('click', (e) => { e.stopPropagation(); location.reload(); });
    side.appendChild(again);
    ov.appendChild(side);

    document.body.appendChild(ov);
    window.__demo.shareUrl = url;
    try { playSound(21); } catch (e) {}
  }

  // for tests / staff: window.__demo.showCard(), window.__demo.intro, window.__demo.shareUrl
  window.__demo = { ROUTE, DEMO_NEXT, intro, showCard, openNameEntry, shareUrl: '', scenesAdded: [INTRO_ASK, INTRO_ENTER, INTRO_ANSWER, INTRO_PRAISE, INTRO_CARD] };
})();
