// i-tya dictionary translator panel (talks to the i-tya-dictionary API).
//  - Japanese -> i-tya (POST /api/translate with dryRun:true so nothing is saved)
//  - i-tya -> Japanese (POST /api/reverse-translate)
//  - hands-free voice mode (Chrome SpeechRecognition): subtitle + AI character reaction
//    (POST /api/npc), with a small typed fallback. Direction is auto-detected.
//  - word meanings for the wordbook via GET /api/dictionary?search=...
// All API text is inserted with textContent only.

const DICT_API = "https://i-tya-dictionary.onrender.com";
const TRANSLATE_MAX_CHARS = 80;
const TRANSLATE_SESSION_LIMIT = 60;   // per page load (be kind to the shared AI quota)
const TRANSLATE_COOLDOWN_MS = 2500;
const TRANSLATE_TIMEOUT_MS = 90 * 1000; // the server may need to wake up first

let translateCount = 0;
let lastTranslateAt = 0;
let translatorBusy = false;

// ---------- warm up (Render may be asleep) ----------
function warmUpDictionary() {
        fetch(`${DICT_API}/api/trivias`).catch(() => {});
}

// ---------- SSE / JSON response reader ----------
async function readTranslateResponse(res) {
        const type = res.headers.get("content-type") || "";
        if (type.includes("application/json")) return await res.json();

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let result = null;
        const handleBlock = (block) => {
                const dataLines = block.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim());
                for (const d of dataLines) {
                        if (!d) continue;
                        try {
                                const obj = JSON.parse(d);
                                if (obj && obj.result) result = obj.result;
                        } catch (e) { /* partial chunk, ignore */ }
                }
        };
        for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buffer.indexOf("\n\n")) >= 0) {
                        handleBlock(buffer.slice(0, idx));
                        buffer = buffer.slice(idx + 2);
                }
        }
        if (buffer.trim()) handleBlock(buffer);
        return result;
}

// returns {ok:true, data} or {ok:false, kind:'overload'|'limit'|'network'|'empty', retryAfter?}
async function callTranslate(direction, sentence) {
        const url = direction === "toItya" ? `${DICT_API}/api/translate` : `${DICT_API}/api/reverse-translate`;
        const body = direction === "toItya" ? { sentence, dryRun: true } : { sentence };
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TRANSLATE_TIMEOUT_MS);
        try {
                const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                        signal: ctrl.signal,
                });
                if (res.status === 429) {
                        const j = await res.json().catch(() => ({}));
                        return { ok: false, kind: "limit", retryAfter: j.retryAfter || Number(res.headers.get("retry-after")) || 60 };
                }
                if (res.status === 503) return { ok: false, kind: "overload" };
                if (!res.ok) return { ok: false, kind: "network" };
                const data = await readTranslateResponse(res);
                if (!data || !data.translation) return { ok: false, kind: "empty" };
                return { ok: true, data };
        } catch (e) {
                return { ok: false, kind: "network" };
        } finally {
                clearTimeout(timer);
        }
}

// ---------- wordbook meanings ----------
const wordMeaningCache = {};   // word(lowercase) -> string | null

async function lookupWordMeaning(word) {
        const key = String(word).toLowerCase();
        if (key in wordMeaningCache) return wordMeaningCache[key];
        try {
                const res = await fetch(`${DICT_API}/api/dictionary?page=1&search=${encodeURIComponent(key)}`);
                if (!res.ok) return null;
                const json = await res.json();
                const hit = (json.words || []).find(w => String(w.word).toLowerCase() === key);
                wordMeaningCache[key] = hit ? (hit.meaning || null) : null;
                return wordMeaningCache[key];
        } catch (e) {
                return null; // do not cache failures
        }
}

// ---------- hands-free voice mode ----------
// Turn the mic on once; it keeps listening. Each phrase you say appears as a speech
// bubble above your character (with its i-tya), and the character you are talking to
// answers in an identical bubble above their head. Same look as the game: paper-white
// boxes with a black marker outline, Press Start 2P for i-tya, DotGothic16 for Japanese.
// Disabled during quizzes so a translation can never give the answer away.

const VOICE_KEY = "itya_voice";
const NPC_SESSION_LIMIT = 40;
const NPC_SPEAKERS = ["te", "cf", "god"];
// text colours = the game's own dialogue colours (see drawStory)
const CHAR_COLORS = { mc: "#9c3115", te: "#2c2e97", cf: "#000000", god: "#005bd2" };
// expression images per character (ids as loaded in main.js); only these may be chosen
const NPC_EXPR = {
        te: { normal: 5, smile: 6, angry: 7, puzzled: 12 },
        cf: { normal: 8, smile: 10, angry: 20, puzzled: 15 },
        god: {},
};
const TR_FONT_JA = "'DotGothic16', system-ui";
const TR_FONT_PIXEL = "'Press Start 2P', system-ui";
// hand-drawn white marker line mic (same feel as the notebook icon next to it)
const MIC_SVG = `<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9c0-3.2 2.4-5.3 5.2-5.1 2.9.2 4.9 2.3 4.8 5.3l-.2 12.6c0 3.1-2.2 5.4-5 5.3-2.9-.1-5-2.3-4.9-5.4z"/><path d="M11.5 22c.3 7.6 5.2 12.2 12.6 12.3 7.5.1 12.2-5 12.4-12.4"/><path d="M24.2 34.6l-.3 9M17.5 44.4c4.2-.9 9.4-1 13.6.1"/><path id="voice-dot" d="M37 6.5c2.6-.6 5.2 1.2 5.3 3.7.2 2.6-1.8 4.6-4.2 4.7-2.5.1-4.6-1.8-4.6-4.2" stroke="#ff4d4d" fill="#ff4d4d" style="display:none"/></svg>`;
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

let voiceWanted = false;
let recognition = null;
let restartTimer = null;
let quickEnds = 0;
let startedAt = 0;
let npcCount = 0;
let lastUtter = "";
let lastUtterAt = 0;
let lastHandledAt = 0;
let reaction = null;      // {c, prevImg, baseX, baseY, timers:[]}
const bubbleTimers = {};

function mk(tag, styles, text) {
        const el = document.createElement(tag);
        if (styles) Object.assign(el.style, styles);
        if (text !== undefined) el.textContent = text;
        return el;
}

// Japanese (or anything non-ASCII) -> i-tya;  plain latin letters -> Japanese
function detectDirection(text) {
        return /^[\x00-\x7F\s]+$/.test(text) ? "toJa" : "toItya";
}

// used by the game's key handlers: don't drive the game while typing here
function isTranslatorTyping() {
        const a = document.activeElement;
        return !!a && a.id === "typed-input";
}

function inQuiz() { return !!document.getElementById("quiz-container"); }

// ----- speech bubbles (one look for everyone) -----
function canvasScale() {
        const rect = canvas.getBoundingClientRect();
        return { rect, k: rect.width / canvas.width };
}

function removeBubble(id) {
        clearTimeout(bubbleTimers[id]);
        const el = document.getElementById(id);
        if (el) el.remove();
}

// big = main line (i-tya), small = Japanese. who: mc | te | cf | god
function buildBubble(id, big, small, who) {
        removeBubble(id);
        const { rect } = canvasScale();
        const color = CHAR_COLORS[who] || "#000";
        const el = mk("div", {
                position: "fixed", left: "0", top: "0", zIndex: "8000", boxSizing: "border-box",
                maxWidth: `${Math.max(150, rect.width * 0.36)}px`, padding: "5px 10px",
                backgroundColor: "#fff", border: "3px solid #000", borderRadius: "15px",
                textAlign: "center", cursor: "pointer", visibility: "hidden",
        });
        el.id = id;
        const bigEl = mk("div", { fontFamily: TR_FONT_PIXEL, fontSize: `${Math.max(10, rect.height * 0.032)}px`, lineHeight: "1.45", color, wordBreak: "break-word" }, big);
        const smallEl = mk("div", { fontFamily: TR_FONT_JA, fontSize: `${Math.max(11, rect.height * 0.026)}px`, color: "#555", marginTop: "2px", lineHeight: "1.3", wordBreak: "break-word" }, small);
        const tail = mk("div", { position: "absolute", bottom: "-9px", width: "14px", height: "14px", backgroundColor: "#fff",
                borderRight: "3px solid #000", borderBottom: "3px solid #000", transform: "rotate(45deg)" });
        tail.className = "bubble-tail";
        el.append(bigEl, smallEl, tail);
        el.onclick = () => removeBubble(id);
        document.body.appendChild(el);
        el.__big = bigEl; el.__small = smallEl; el.__who = who;
        bubbleTimers[id] = setTimeout(() => removeBubble(id), 9000);
        return el;
}

function charBox(who) {
        const c = currentChars.find(x => x.char === who);
        const { rect, k } = canvasScale();
        if (c && imageState[c.img] && imageState[c.img].w) {
                const st = imageState[c.img];
                return { cx: rect.left + (st.x + st.w / 2) * k, top: rect.top + st.y * k, bottom: rect.top + (st.y + st.h) * k };
        }
        return null;
}

// Placement rules (so nothing ever covers a face or the story text):
//  - NPC bubble: above the speaker's head;  your bubble: below your character's feet
//  - if there is black margin around the frame (phones in portrait), bubbles go there instead
//  - always clamped inside the screen; falls back to stacking above if "below" would touch the story text
function placeBubble(el, who, opts) {
        opts = opts || {};
        const { rect } = canvasScale();
        const w = el.offsetWidth, h = el.offsetHeight;
        const tail = el.querySelector(".bubble-tail");
        const setTail = (dir, x) => {
                if (dir === "none") { tail.style.display = "none"; return; }
                tail.style.display = "block";
                tail.style.left = `${Math.min(Math.max(x, 14), w - 28)}px`;
                if (dir === "down") { Object.assign(tail.style, { top: "auto", bottom: "-9px", borderTop: "none", borderLeft: "none", borderRight: "3px solid #000", borderBottom: "3px solid #000" }); }
                else { Object.assign(tail.style, { bottom: "auto", top: "-9px", borderRight: "none", borderBottom: "none", borderTop: "3px solid #000", borderLeft: "3px solid #000" }); }
        };
        const clampX = (x) => Math.min(Math.max(x, 8), window.innerWidth - w - 8);
        const marginRoom = rect.top >= 120;   // portrait phones: black space above/below the frame

        if (marginRoom) {
                const left = clampX(rect.left + rect.width / 2 - w / 2);
                const top = (who === "mc") ? rect.bottom + 8 : Math.max(8, rect.top - h - 8);
                el.style.left = `${left}px`; el.style.top = `${top}px`; setTail("none");
                el.style.visibility = "visible";
                return;
        }
        const box = charBox(who) || { cx: rect.left + rect.width * (who === "mc" ? 0.3 : 0.65), top: rect.top + rect.height * 0.45, bottom: rect.top + rect.height * 0.7 };
        const left = Math.min(Math.max(box.cx - w / 2, rect.left + 8), rect.right - w - 8);
        const storyLine = rect.top + rect.height * 0.865;   // the game's dialogue text lives below this
        let top, dir;
        if (who === "mc" && box.bottom + 16 + h <= storyLine) { top = box.bottom + 16; dir = "up"; }
        else {
                top = Math.max(box.top - h - 16, rect.top + 8); dir = "down";
                if (opts.avoid) {
                        const a = opts.avoid.getBoundingClientRect();
                        const overlap = left < a.right && left + w > a.left && top < a.bottom && top + h > a.top;
                        if (overlap) top = Math.max(rect.top + 8, a.top - h - 12);
                }
        }
        el.style.left = `${left}px`; el.style.top = `${top}px`;
        setTail(dir, box.cx - left - 7);
        el.style.visibility = "visible";
}

// small notice (errors, hints): same box, top centre of the frame
function showNote(msg) {
        const { rect } = canvasScale();
        removeBubble("voice-note");
        const el = mk("div", {
                position: "fixed", left: `${rect.left + rect.width / 2}px`, top: `${rect.top + 10}px`, transform: "translateX(-50%)",
                zIndex: "8000", maxWidth: `${rect.width * 0.8}px`, padding: "6px 14px", boxSizing: "border-box",
                backgroundColor: "#fff", border: "3px solid #000", borderRadius: "15px", textAlign: "center",
                fontFamily: TR_FONT_JA, fontSize: `${Math.max(12, rect.height * 0.028)}px`, color: "#222", pointerEvents: "none",
        }, msg);
        el.id = "voice-note";
        document.body.appendChild(el);
        bubbleTimers["voice-note"] = setTimeout(() => removeBubble("voice-note"), 4500);
}

// ----- character reaction: expression + small motion -----
// put the character back exactly as scripted (expression + position); leaves the bubbles alone
function revertExpression() {
        if (!reaction) return;
        reaction.timers.forEach(clearTimeout);
        const { c, prevImg, baseX, baseY } = reaction;
        c.img = prevImg; c.xP = baseX; c.yP = baseY;
        reaction = null;
}

// full reset (scene change / quiz): bubbles + expression
function cancelReaction() {
        ["player-bubble", "npc-bubble", "voice-note"].forEach(removeBubble);
        revertExpression();
}

function playReaction(speaker, emotion, move) {
        const c = currentChars.find(x => x.char === speaker);
        if (!c || imageState[c.img].moving) return;
        revertExpression();
        reaction = { c, prevImg: c.img, baseX: c.xP, baseY: c.yP, timers: [] };
        const r = reaction;
        const later = (fn, ms) => r.timers.push(setTimeout(fn, ms));
        const id = (NPC_EXPR[speaker] || {})[emotion];
        if (id !== undefined && imageLoaded[id]) c.img = id;
        if (move === "hop") {
                [[0, -3], [160, 0], [300, -2], [430, 0]].forEach(([t, dy]) => later(() => { c.yP = r.baseY + dy; }, t));
        } else if (move === "shake") {
                for (let i = 0; i < 6; i++) later(() => { c.xP = r.baseX + (i % 2 ? -1 : 1); }, i * 60);
                later(() => { c.xP = r.baseX; }, 380);
        }
        later(() => { if (reaction === r) revertExpression(); }, 4500);   // back to the scripted look
}

async function fetchNpcReaction(speaker, text, sceneIdx) {
        try {
                const res = await fetch(`${DICT_API}/api/npc`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                                speaker,
                                scene_text: (currentScene && currentScene.text && currentScene.text.content) || "",
                                player_ja: text,
                                known_words: (typeof wordbookData !== "undefined" ? wordbookData : []).map(w => w.word),
                        }),
                });
                if (!res.ok) return;
                const j = await res.json();
                if (!j || !j.ok || !j.itya || !j.ja) return;
                if (currentSceneIndex !== sceneIdx || inQuiz() || gameState !== "story") return;   // scene moved on
                const el = buildBubble("npc-bubble", j.itya, j.ja, speaker);
                placeBubble(el, speaker, { avoid: document.getElementById("player-bubble") });
                playReaction(speaker, j.emotion, j.move);
        } catch (e) { /* keep the scripted line */ }
}

// ----- one spoken (or typed) phrase -----
function handleUtterance(raw, confidence, typed) {
        const text = String(raw || "").trim().slice(0, TRANSLATE_MAX_CHARS);
        if (text.length < 2) return;
        if (!typed && confidence !== undefined && confidence > 0 && confidence < 0.5) return;   // probably noise
        const now = Date.now();
        if (text === lastUtter && now - lastUtterAt < 4000) return;
        lastUtter = text; lastUtterAt = now;
        if (inQuiz()) return;   // quizzes are voice-free (the mic icon is hidden too)
        if (translatorBusy || now - lastHandledAt < TRANSLATE_COOLDOWN_MS) return;
        if (translateCount >= TRANSLATE_SESSION_LIMIT) { showNote("たくさん使ってくれてありがとう。続きはまた後で。"); return; }
        lastHandledAt = now;
        window.dispatchEvent(new Event("pointerdown"));   // counts as activity for the idle reset

        const direction = detectDirection(text);
        // your own bubble first; the i-tya line fills in when the translation arrives
        const mine = buildBubble("player-bubble", "...", text, "mc");
        placeBubble(mine, "mc");
        removeBubble("npc-bubble");

        // character reaction (only when Japanese was spoken and someone is in the scene)
        if (direction === "toItya" && gameState === "story" && npcCount < NPC_SESSION_LIMIT) {
                const speaker = (currentScene && currentScene.text && NPC_SPEAKERS.includes(currentScene.text.char))
                        ? currentScene.text.char
                        : (currentChars.find(c => NPC_SPEAKERS.includes(c.char)) || {}).char;
                if (speaker) { npcCount++; fetchNpcReaction(speaker, text, currentSceneIndex); }
        }

        translatorBusy = true;
        const sceneIdx = currentSceneIndex;
        callTranslate(direction, text).then(r => {
                translatorBusy = false;
                lastTranslateAt = Date.now();
                const el = document.getElementById("player-bubble");
                if (!el || currentSceneIndex !== sceneIdx) return;
                if (r.ok) {
                        translateCount++;
                        const hasNew = direction === "toItya" && (r.data.breakdown || []).some(b => b.status === "new");
                        el.__big.textContent = r.data.translation;
                        el.__big.style.fontFamily = direction === "toItya" ? TR_FONT_PIXEL : TR_FONT_JA;
                        el.__small.textContent = text;
                        if (hasNew) el.__small.textContent = `${text}（辞書にない語の案を含みます）`;
                } else {
                        const msgs = { limit: `混み合っています。${r.retryAfter} 秒ほど待ってね。`, overload: "混み合っています。少し待ってね。",
                                empty: "うまく訳せませんでした。", network: "辞書につながりません。ゲームは続けられます。" };
                        removeBubble("player-bubble");
                        showNote(msgs[r.kind] || msgs.network);
                        return;
                }
                placeBubble(el, "mc");
                const npc = document.getElementById("npc-bubble");
                if (npc) placeBubble(npc, npc.__who, { avoid: el });
        });
}

// ----- continuous recognition with automatic restart -----
function setVoiceUI() {
        const btn = document.getElementById("translator-button");
        if (!btn) return;
        btn.title = (voiceWanted ? "声の翻訳：オン（押すとオフ）" : "声の翻訳：オフ（押すとオン）") + "  [Tで文字入力]  ※声はChromeの音声認識（Google）で処理されます";
        const dot = document.getElementById("voice-dot");
        if (dot) dot.style.display = voiceWanted ? "block" : "none";
}

function startVoice() {
        if (!SpeechRec) { showNote("このブラウザでは声が使えません。Tキーで文字入力できます"); toggleTypedBar(true); return; }
        voiceWanted = true; setVoiceUI();
        try { localStorage.setItem(VOICE_KEY, "1"); } catch (e) {}
        if (recognition) return;
        const r = new SpeechRec();
        r.lang = "ja-JP"; r.continuous = true; r.interimResults = false;
        startedAt = Date.now();
        r.onresult = (ev) => {
                for (let i = ev.resultIndex; i < ev.results.length; i++) {
                        const res = ev.results[i];
                        if (res.isFinal) handleUtterance(res[0].transcript, res[0].confidence, false);
                }
        };
        r.onerror = (ev) => {
                if (["not-allowed", "service-not-allowed", "audio-capture"].includes(ev.error)) {
                        voiceWanted = false; setVoiceUI();
                        try { localStorage.removeItem(VOICE_KEY); } catch (e) {}
                        showNote(ev.error === "audio-capture" ? "マイクが見つかりません。文字で入力してね" : "マイクが許可されていません。文字で入力してね");
                        toggleTypedBar(true);
                }
        };
        r.onend = () => {
                recognition = null;
                if (!voiceWanted) return;
                quickEnds = (Date.now() - startedAt < 1500) ? quickEnds + 1 : 0;
                if (quickEnds >= 5) {             // keeps failing: stop instead of looping forever
                        voiceWanted = false; setVoiceUI();
                        showNote("声がうまく聞けません。文字で入力してね");
                        toggleTypedBar(true);
                        return;
                }
                restartTimer = setTimeout(startVoice, Math.min(10000, 300 * Math.pow(2, quickEnds)));
        };
        recognition = r;
        try { r.start(); } catch (e) { recognition = null; }
}

function stopVoice() {
        voiceWanted = false; clearTimeout(restartTimer);
        try { localStorage.removeItem(VOICE_KEY); } catch (e) {}
        const r = recognition; recognition = null;
        if (r) { r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
        setVoiceUI();
}

// no on-screen text when toggling: the red dot on the icon is the only indicator
function toggleVoice() {
        if (voiceWanted) stopVoice();
        else startVoice();
}

// ----- tiny typed fallback (T key) -----
function toggleTypedBar(forceOpen) {
        const old = document.getElementById("typed-bar");
        if (old) { if (forceOpen !== true) old.remove(); return; }
        const { rect } = canvasScale();
        const bar = mk("div", { position: "fixed", left: `${rect.left + rect.width / 2}px`, top: `${rect.top + 52}px`, transform: "translateX(-50%)",
                zIndex: "8500", width: `${Math.min(420, rect.width * 0.8)}px` });
        bar.id = "typed-bar";
        const input = mk("input", {
                width: "100%", boxSizing: "border-box", padding: "8px 12px", fontFamily: TR_FONT_JA, fontSize: `${Math.max(13, rect.height * 0.03)}px`,
                borderRadius: "15px", border: "3px solid #000", backgroundColor: "#fff", color: "#222", textAlign: "center", outline: "none",
        });
        input.id = "typed-input"; input.type = "text"; input.maxLength = TRANSLATE_MAX_CHARS;
        input.placeholder = "日本語 / i-tya  (Enter)";
        input.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Escape") { bar.remove(); return; }
                if (e.key === "Enter" && !e.isComposing) {
                        e.preventDefault();
                        const v = input.value; input.value = "";
                        handleUtterance(v, undefined, true);
                }
        });
        bar.appendChild(input);
        document.body.appendChild(bar);
        input.focus();
}

// keep the extra UI out of the way of quizzes / the wordbook / loading
function syncVoiceUI() {
        const busy = inQuiz() || !!document.getElementById("wordbook-overlay") || !!document.getElementById("loading-overlay");
        const btn = document.getElementById("translator-button");
        if (btn) btn.style.display = busy ? "none" : "block";
        if (busy) {
                ["player-bubble", "npc-bubble", "voice-note", "typed-bar"].forEach(removeBubble);
                revertExpression();
        }
}

function initTranslator() {
        if (document.getElementById("translator-button")) return;

        // one icon, same corner logic as the notebook icon on the other side
        const btn = mk("button", {
                position: "fixed", top: "10px", right: "10px", width: "50px", height: "50px", padding: "4px",
                boxSizing: "border-box", cursor: "pointer", zIndex: "9000", background: "none", border: "none",
        });
        btn.id = "translator-button";
        btn.innerHTML = MIC_SVG;             // static SVG only
        btn.onclick = toggleVoice;
        document.body.appendChild(btn);
        setVoiceUI();
        setInterval(syncVoiceUI, 250);

        // T = type instead of speak
        window.addEventListener("keydown", (e) => {
                if (e.key !== "t" && e.key !== "T") return;
                if (e.ctrlKey || e.metaKey || e.altKey || isTranslatorTyping() || inQuiz()) return;
                if (document.getElementById("wordbook-overlay") || document.getElementById("idle-overlay")) return;
                e.preventDefault();
                toggleTypedBar();
        });

        // an NPC reaction must never leak into another scene
        if (typeof showScene === "function" && !window.__ityaShowSceneWrapped) {
                window.__ityaShowSceneWrapped = true;
                const original = showScene;
                showScene = function () { cancelReaction(); return original.apply(this, arguments); };
        }

        // zero-press start: ?voice=1, or the mic was on earlier in this browser.
        // Browsers want one user gesture first, so it arms on the first click/key.
        let armed = false;
        try { armed = new URLSearchParams(location.search).get("voice") === "1" || localStorage.getItem(VOICE_KEY) === "1"; } catch (e) {}
        if (armed && SpeechRec) {
                const arm = () => { window.removeEventListener("pointerdown", arm, true); window.removeEventListener("keydown", arm, true); startVoice(); };
                window.addEventListener("pointerdown", arm, true);
                window.addEventListener("keydown", arm, true);
        }
}
