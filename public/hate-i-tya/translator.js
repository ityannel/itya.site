// Voice / translation helper for the game. Talks to the i-tya-dictionary (Swa-iTya) backend's game
// endpoints. Everything spoken or translated uses words that exist in the dictionary right now
// ("Oi" is the one game word kept as is), so when the dictionary grows the game can say more.
//  - Japanese -> i-tya           POST /api/game-translate
//  - i-tya -> Japanese           POST /api/game-reverse
//  - character reactions          POST /api/npc
//  - hands-free voice mode (Chrome SpeechRecognition) with a small typed fallback (T key)
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

// returns {ok:true, data} or {ok:false, kind:'overload'|'limit'|'network'|'empty'|'nowords', retryAfter?}
async function callTranslate(direction, sentence) {
        const url = direction === "toItya" ? `${DICT_API}/api/game-translate` : `${DICT_API}/api/game-reverse`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TRANSLATE_TIMEOUT_MS);
        try {
                const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sentence }),
                        signal: ctrl.signal,
                });
                if (res.status === 429) {
                        const j = await res.json().catch(() => ({}));
                        return { ok: false, kind: "limit", retryAfter: j.retryAfter || Number(res.headers.get("retry-after")) || 60 };
                }
                if (res.status === 503) return { ok: false, kind: "overload" };
                if (!res.ok) return { ok: false, kind: "network" };
                const data = await res.json();
                if (!data || data.ok === false) return { ok: false, kind: data && data.reason === "no_words" ? "nowords" : "empty" };
                if (!data.translation) return { ok: false, kind: "empty" };
                return { ok: true, data };
        } catch (e) {
                return { ok: false, kind: "network" };
        } finally {
                clearTimeout(timer);
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

function mk(tag, styles, text) {
        const el = document.createElement(tag);
        if (styles) Object.assign(el.style, styles);
        if (text !== undefined) el.textContent = text;
        return el;
}

// used by the game's key handlers: don't drive the game while typing here
function isTranslatorTyping() {
        const a = document.activeElement;
        return !!a && a.id === "typed-input";
}

// The player can talk only in scenes the author flagged with  talk: true  in scene.js.
// Everywhere else the mic icon is hidden and the microphone is OFF.
function talkAllowed() {
        return gameState === "story" && !!currentScene && currentScene.talk === true;
}

function inQuiz() { return !!document.getElementById("quiz-container"); }

function canvasScale() {
        const rect = canvas.getBoundingClientRect();
        return { rect, k: rect.width / canvas.width };
}

function removeEl(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
}

// ----- spoken lines: no bubbles, no boxes -----
// What you say (in i-tya) and the character's answer are drawn by the game itself, in the same
// plain style as the story text, one after the other, and then the scripted line comes back.
// drawStory() in function1.js draws `voiceLine` in place of the scripted line.
let voiceLine = null;            // {text, color}
const voiceQueue = [];
let voiceLineTimer = null;
let utteranceGen = 0;            // bumped when the scene changes, so late replies are dropped

function nextVoiceLine() {
        clearTimeout(voiceLineTimer);
        const it = voiceQueue.shift();
        if (!it) { voiceLine = null; return; }
        voiceLine = { text: it.text, color: it.color };
        if (it.onStart) it.onStart();
        voiceLineTimer = setTimeout(nextVoiceLine, it.ms);
}

function pushVoiceLine(text, color, ms, onStart) {
        voiceQueue.push({ text, color, ms: ms || Math.min(5000, 1800 + String(text).length * 80), onStart });
        if (!voiceLine) nextVoiceLine();
}

function clearVoiceLine() {
        clearTimeout(voiceLineTimer);
        voiceQueue.length = 0;
        voiceLine = null;
}

// symbols only, no words: "?" = could not say it, "…" = busy, "×" = microphone unavailable
function showNote(symbol) { clearVoiceLine(); pushVoiceLine(symbol, "#000000", 1400); }

// ----- character reaction: expression + small motion -----
// put the character back exactly as scripted (expression + position)
function revertExpression() {
        if (!reaction) return;
        reaction.timers.forEach(clearTimeout);
        const { c, prevImg, baseX, baseY } = reaction;
        c.img = prevImg; c.xP = baseX; c.yP = baseY;
        reaction = null;
}

// full reset (scene change / quiz): spoken line + expression, and ignore replies still on their way
function cancelReaction() {
        utteranceGen++;
        clearVoiceLine();
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

async function fetchNpcReply(speaker, text) {
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
                if (!res.ok) return null;
                const j = await res.json();
                return (j && j.ok && j.itya) ? j : null;
        } catch (e) { return null; }   // keep the scripted line
}

// ----- one spoken (or typed) phrase -----
function handleUtterance(raw, confidence, typed) {
        const text = String(raw || "").trim().slice(0, TRANSLATE_MAX_CHARS);
        if (text.length < 2) return;
        if (!typed && confidence !== undefined && confidence > 0 && confidence < 0.5) return;   // probably noise
        const now = Date.now();
        if (text === lastUtter && now - lastUtterAt < 4000) return;
        lastUtter = text; lastUtterAt = now;
        if (inQuiz() || !talkAllowed()) return;   // only in talk scenes; never during quizzes
        if (translatorBusy || now - lastHandledAt < TRANSLATE_COOLDOWN_MS) return;
        if (translateCount >= TRANSLATE_SESSION_LIMIT) { showNote("…"); return; }
        // the game speaks i-tya only: a latin-letter line is not a Japanese sentence to translate
        if (/^[\x00-\x7F\s]+$/.test(text)) { showNote("?"); return; }
        lastHandledAt = now;
        window.dispatchEvent(new Event("pointerdown"));   // counts as activity for the idle reset

        // a new phrase replaces whatever was still being shown from the last one
        const gen = ++utteranceGen;
        clearVoiceLine();
        revertExpression();
        const speaker = (currentScene && currentScene.text && NPC_SPEAKERS.includes(currentScene.text.char))
                ? currentScene.text.char
                : (currentChars.find(c => NPC_SPEAKERS.includes(c.char)) || {}).char;

        translatorBusy = true;
        const saying = callTranslate("toItya", text).then(r => { translatorBusy = false; lastTranslateAt = Date.now(); return r; });
        let answering = Promise.resolve(null);
        if (speaker && gameState === "story" && npcCount < NPC_SESSION_LIMIT) { npcCount++; answering = fetchNpcReply(speaker, text); }

        // 1) what you said, in i-tya, in your colour
        saying.then(r => {
                if (gen !== utteranceGen) return;
                if (r.ok) { translateCount++; pushVoiceLine(r.data.translation, CHAR_COLORS.mc); }
                else showNote({ limit: "…", overload: "…", network: "…", empty: "?", nowords: "?" }[r.kind] || "…");
        });
        // 2) then the character's answer, in theirs (with the expression / small movement)
        Promise.all([saying, answering]).then(([, j]) => {
                if (gen !== utteranceGen || !j || inQuiz() || gameState !== "story") return;
                pushVoiceLine(j.itya, CHAR_COLORS[speaker] || "#000000", null, () => playReaction(speaker, j.emotion, j.move));
        });
}

// ----- continuous recognition with automatic restart -----
function setVoiceUI() {
        const btn = document.getElementById("translator-button");
        if (!btn) return;
        btn.title = "";
        const dot = document.getElementById("voice-dot");
        if (dot) dot.style.display = voiceWanted ? "block" : "none";
}

function startVoice() {
        if (!SpeechRec) { showNote("×"); toggleTypedBar(true); return; }
        voiceWanted = true; setVoiceUI();
        try { localStorage.setItem(VOICE_KEY, "1"); } catch (e) {}
        if (recognition || !talkAllowed()) return;   // the mic only opens in talk scenes
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
                        showNote("×");
                        toggleTypedBar(true);
                }
        };
        r.onend = () => {
                recognition = null;
                if (!voiceWanted) return;
                quickEnds = (Date.now() - startedAt < 1500) ? quickEnds + 1 : 0;
                if (quickEnds >= 5) {             // keeps failing: stop instead of looping forever
                        voiceWanted = false; setVoiceUI();
                        showNote("×");
                        toggleTypedBar(true);
                        return;
                }
                restartTimer = setTimeout(startVoice, Math.min(10000, 300 * Math.pow(2, quickEnds)));
        };
        recognition = r;
        try { r.start(); } catch (e) { recognition = null; }
}

// close the microphone but remember that the player wants voice (it reopens in the next talk scene)
function pauseListening() {
        clearTimeout(restartTimer);
        const r = recognition; recognition = null;
        if (r) { r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
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
        if (!talkAllowed()) return;
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

// show the icon and open the mic only in talk scenes; hide everything during quizzes / the wordbook / loading
function syncVoiceUI() {
        const busy = inQuiz() || !!document.getElementById("wordbook-overlay") || !!document.getElementById("loading-overlay");
        const allowed = talkAllowed() && !busy;
        const btn = document.getElementById("translator-button");
        if (btn) btn.style.display = allowed ? "block" : "none";
        if (!allowed) {
                pauseListening();
                removeEl("typed-bar");
                if (busy) { clearVoiceLine(); revertExpression(); }
        } else if (voiceWanted && !recognition) {
                startVoice();   // came back to a talk scene: reopen the mic by itself
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
                if (e.ctrlKey || e.metaKey || e.altKey || isTranslatorTyping() || inQuiz() || !talkAllowed()) return;
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
