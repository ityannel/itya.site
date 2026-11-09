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
// Turn the mic on once; it keeps listening. Each spoken phrase is
//   (1) shown as a small subtitle with its i-tya translation, and
//   (2) answered by the character in the scene (AI reaction, validated by the server).
// Disabled during quizzes so a translation can never give the answer away.

const VOICE_KEY = "itya_voice";
const NPC_SESSION_LIMIT = 40;
const NPC_SPEAKERS = ["te", "cf", "god"];
const NPC_COLORS = { te: "#2c2e97", cf: "#000000", god: "#005bd2" };
// expression images per character (ids as loaded in main.js); only these may be chosen
const NPC_EXPR = {
        te: { normal: 5, smile: 6, angry: 7, puzzled: 12 },
        cf: { normal: 8, smile: 10, angry: 20, puzzled: 15 },
        god: {},
};
const TR_FONT_JA = "'DotGothic16', system-ui";
const TR_FONT_PIXEL = "'Press Start 2P', system-ui";
const MIC_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
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
let subtitleTimer = null;
let bubbleTimer = null;
let reaction = null;      // {c, prevImg, baseX, baseY, timers:[]}

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

// ----- subtitle (top centre) -----
function showSubtitle(heard, itya, color) {
        let box = document.getElementById("voice-subtitle");
        if (!box) {
                box = mk("div", {
                        position: "fixed", top: "10px", left: "50%", transform: "translateX(-50%)", zIndex: "8000",
                        maxWidth: "70%", textAlign: "center", padding: "8px 14px", borderRadius: "10px",
                        backgroundColor: "rgba(0,0,0,0.65)", color: "white", pointerEvents: "none",
                });
                box.id = "voice-subtitle";
                box.append(mk("div", { fontFamily: TR_FONT_JA, fontSize: "16px", opacity: "0.85", wordBreak: "break-word" }),
                           mk("div", { fontFamily: TR_FONT_PIXEL, fontSize: "18px", marginTop: "6px", lineHeight: "1.5", wordBreak: "break-word" }));
                document.body.appendChild(box);
        }
        box.firstChild.textContent = heard || "";
        box.lastChild.textContent = itya || "";
        box.lastChild.style.color = color || "white";
        box.style.display = "block";
        clearTimeout(subtitleTimer);
        subtitleTimer = setTimeout(() => { box.style.display = "none"; }, 7000);
}

// ----- character reaction: bubble + expression + small motion -----
// put the character back exactly as scripted (expression + position); leaves the bubble alone
function revertExpression() {
        if (!reaction) return;
        reaction.timers.forEach(clearTimeout);
        const { c, prevImg, baseX, baseY } = reaction;
        c.img = prevImg; c.xP = baseX; c.yP = baseY;
        reaction = null;
}

// full reset (scene change): bubble + expression
function cancelReaction() {
        clearTimeout(bubbleTimer);
        const b = document.getElementById("npc-bubble");
        if (b) b.remove();
        revertExpression();
}

function showBubble(reply, speaker) {
        const old = document.getElementById("npc-bubble"); if (old) old.remove();
        const rect = canvas.getBoundingClientRect();
        const bubble = mk("div", {
                position: "fixed", left: `${rect.left + rect.width / 2}px`, top: `${rect.top + rect.height * 0.8}px`,
                transform: "translate(-50%, -100%)", zIndex: "8000", maxWidth: `${Math.max(240, rect.width * 0.8)}px`,
                backgroundColor: "rgba(255,255,255,0.94)", border: "3px solid #000", borderRadius: "12px",
                padding: "10px 16px", textAlign: "center", cursor: "pointer",
        });
        bubble.id = "npc-bubble";
        bubble.append(
                mk("div", { fontFamily: TR_FONT_PIXEL, fontSize: `${Math.max(12, rect.height * 0.04)}px`, lineHeight: "1.6", color: NPC_COLORS[speaker] || "#000", wordBreak: "break-word" }, reply.itya),
                mk("div", { fontFamily: TR_FONT_JA, fontSize: `${Math.max(11, rect.height * 0.026)}px`, color: "#555", marginTop: "4px" }, reply.ja));
        bubble.onclick = () => bubble.remove();
        document.body.appendChild(bubble);
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => bubble.remove(), 9000);
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
                showBubble(j, speaker);
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
        if (inQuiz()) { showSubtitle("クイズ中は翻訳できません", ""); return; }
        if (translatorBusy || now - lastHandledAt < TRANSLATE_COOLDOWN_MS) return;
        if (translateCount >= TRANSLATE_SESSION_LIMIT) { showSubtitle("たくさん使ってくれてありがとう。続きはまた後で。", ""); return; }
        lastHandledAt = now;
        window.dispatchEvent(new Event("pointerdown"));   // counts as activity for the idle reset

        const direction = detectDirection(text);
        showSubtitle(text, "...");

        // character reaction (only when Japanese was spoken and someone is in the scene)
        if (direction === "toItya" && gameState === "story" && npcCount < NPC_SESSION_LIMIT) {
                const speaker = (currentScene && currentScene.text && NPC_SPEAKERS.includes(currentScene.text.char))
                        ? currentScene.text.char
                        : (currentChars.find(c => NPC_SPEAKERS.includes(c.char)) || {}).char;
                if (speaker) { npcCount++; fetchNpcReaction(speaker, text, currentSceneIndex); }
        }

        translatorBusy = true;
        callTranslate(direction, text).then(r => {
                translatorBusy = false;
                lastTranslateAt = Date.now();
                if (r.ok) {
                        translateCount++;
                        const hasNew = direction === "toItya" && (r.data.breakdown || []).some(b => b.status === "new");
                        showSubtitle(text, r.data.translation, hasNew ? "#f1c40f" : "white");   // yellow = AI-proposed word
                } else {
                        const msgs = { limit: `混み合っています。${r.retryAfter} 秒ほど待ってね。`, overload: "混み合っています。少し待ってね。",
                                empty: "うまく訳せませんでした。", network: "辞書につながりません。ゲームは続けられます。" };
                        showSubtitle(text, msgs[r.kind] || msgs.network, "#ff9b9b");
                }
        });
}

// ----- continuous recognition with automatic restart -----
function setVoiceUI() {
        const btn = document.getElementById("translator-button");
        if (!btn) return;
        btn.style.borderColor = voiceWanted ? "#ff4d4d" : "white";
        btn.style.boxShadow = voiceWanted ? "0 0 10px #ff4d4d" : "none";
        btn.title = voiceWanted ? "声の翻訳：オン（押すとオフ）" : "声の翻訳：オフ（押すとオン）";
        const dot = document.getElementById("voice-dot");
        if (dot) dot.style.display = voiceWanted ? "block" : "none";
}

function startVoice() {
        if (!SpeechRec) { showSubtitle("このブラウザでは声が使えません。⌨で入力してね。", ""); return; }
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
                        showSubtitle(ev.error === "audio-capture" ? "マイクが見つかりません。⌨で入力してね。"
                                : "マイクが許可されていません。⌨で入力してね。", "");
                }
        };
        r.onend = () => {
                recognition = null;
                if (!voiceWanted) return;
                quickEnds = (Date.now() - startedAt < 1500) ? quickEnds + 1 : 0;
                if (quickEnds >= 5) {             // keeps failing: stop instead of looping forever
                        voiceWanted = false; setVoiceUI();
                        showSubtitle("声がうまく聞けません。⌨で入力してね。", "");
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

function toggleVoice() {
        if (voiceWanted) { stopVoice(); showSubtitle("声の翻訳をオフにしました", ""); }
        else {
                startVoice();
                showSubtitle("聞いています。話しかけてみてね", "");
                // tiny privacy note, once per page load
                setTimeout(() => showSubtitle("声はChromeの音声認識（Google）で処理されます", ""), 2500);
        }
}

// ----- tiny typed fallback -----
function toggleTypedBar() {
        const old = document.getElementById("typed-bar");
        if (old) { old.remove(); return; }
        const bar = mk("div", { position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", zIndex: "9001", width: "min(420px, 80%)" });
        bar.id = "typed-bar";
        const input = mk("input", {
                width: "100%", boxSizing: "border-box", padding: "10px", fontFamily: TR_FONT_JA, fontSize: "18px",
                borderRadius: "8px", border: "2px solid #888", backgroundColor: "white", color: "#222", textAlign: "center",
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

function initTranslator() {
        if (document.getElementById("translator-button")) return;
        const style = document.createElement("style");
        style.textContent = "@keyframes voicepulse{0%,100%{opacity:1}50%{opacity:.25}}";
        document.head.appendChild(style);

        const btn = mk("button", {
                position: "fixed", top: "10px", right: "10px", width: "50px", height: "50px", padding: "9px",
                boxSizing: "border-box", cursor: "pointer", zIndex: "9000",
                backgroundColor: "rgba(0,0,0,0.55)", border: "2px solid white", borderRadius: "10px",
        });
        btn.id = "translator-button";
        btn.innerHTML = MIC_SVG;             // static SVG only
        const dot = mk("span", { position: "absolute", top: "4px", right: "4px", width: "9px", height: "9px", borderRadius: "50%",
                backgroundColor: "#ff4d4d", display: "none", animation: "voicepulse 1.2s infinite" });
        dot.id = "voice-dot";
        btn.appendChild(dot);
        btn.onclick = toggleVoice;
        document.body.appendChild(btn);

        const kb = mk("button", { position: "fixed", top: "66px", right: "10px", width: "50px", height: "28px", cursor: "pointer", zIndex: "9000",
                fontSize: "16px", color: "white", backgroundColor: "rgba(0,0,0,0.55)", border: "2px solid white", borderRadius: "8px", padding: "0" }, "⌨");
        kb.title = "文字で入力";
        kb.onclick = toggleTypedBar;
        document.body.appendChild(kb);

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
