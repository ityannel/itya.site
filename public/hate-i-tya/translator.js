// i-tya dictionary translator panel (talks to the i-tya-dictionary API).
//  - Japanese -> i-tya (POST /api/translate with dryRun:true so nothing is saved)
//  - i-tya -> Japanese (POST /api/reverse-translate)
//  - voice-first: one mic button; speak and it translates (Chrome SpeechRecognition),
//    with a small keyboard fallback. Direction is auto-detected.
//  - word meanings for the wordbook via GET /api/dictionary?search=...
// All API text is inserted with textContent only.

const DICT_API = "https://i-tya-dictionary.onrender.com";
const TRANSLATE_MAX_CHARS = 80;
const TRANSLATE_SESSION_LIMIT = 20;   // per page load (be kind to the shared AI quota)
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

// ---------- panel UI (kept deliberately minimal: one mic button) ----------
const TR_FONT_JA = "'DotGothic16', system-ui";
const TR_FONT_PIXEL = "'Press Start 2P', system-ui";
const MIC_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;

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

function initTranslator() {
        if (document.getElementById("translator-button")) return;
        const btn = mk("button", {
                position: "fixed", top: "10px", right: "10px", width: "50px", height: "50px", padding: "9px",
                boxSizing: "border-box", cursor: "pointer", zIndex: "9000",
                backgroundColor: "rgba(0,0,0,0.55)", border: "2px solid white", borderRadius: "10px",
        });
        btn.id = "translator-button";
        btn.title = "話して翻訳";
        btn.innerHTML = MIC_SVG;           // static SVG only, no API data
        btn.onclick = openTranslator;
        document.body.appendChild(btn);
}

function openTranslator() {
        if (document.getElementById("translator-overlay")) return;

        const overlay = mk("div", {
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%", zIndex: "15000",
                backgroundColor: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "18px",
                padding: "20px", boxSizing: "border-box", color: "white", textAlign: "center", fontFamily: TR_FONT_JA,
        });
        overlay.id = "translator-overlay";

        const heard = mk("div", { fontSize: "20px", minHeight: "28px", opacity: "0.8", maxWidth: "90%", wordBreak: "break-word" });
        const result = mk("div", { fontSize: "clamp(22px, 4vw, 40px)", minHeight: "56px", maxWidth: "90%", lineHeight: "1.5", wordBreak: "break-word" });
        const note = mk("div", { fontSize: "12px", opacity: "0.6", minHeight: "16px" });

        const mic = mk("button", {
                width: "96px", height: "96px", padding: "24px", boxSizing: "border-box", cursor: "pointer",
                backgroundColor: "rgba(255,255,255,0.12)", border: "4px solid white", borderRadius: "50%",
                transition: "background-color 0.2s",
        });
        mic.innerHTML = MIC_SVG;

        const bottom = mk("div", { display: "flex", gap: "14px", alignItems: "center" });
        const keyBtn = mk("button", {
                width: "44px", height: "44px", cursor: "pointer", fontSize: "20px", color: "white",
                backgroundColor: "rgba(255,255,255,0.12)", border: "2px solid white", borderRadius: "8px",
        }, "⌨");
        keyBtn.title = "文字で入力";
        const closeBtn = mk("button", {
                padding: "10px 22px", fontFamily: TR_FONT_PIXEL, fontSize: "16px", cursor: "pointer",
                color: "#2c3e50", backgroundColor: "#f1c40f", border: "none", borderRadius: "5px",
        }, "ie");
        bottom.append(keyBtn, closeBtn);

        const typeRow = mk("div", { display: "none", width: "100%", maxWidth: "520px" });
        const input = mk("input", {
                width: "100%", boxSizing: "border-box", padding: "12px", fontFamily: TR_FONT_JA, fontSize: "20px",
                borderRadius: "8px", border: "2px solid #888", backgroundColor: "white", color: "#222", textAlign: "center",
        });
        input.type = "text";
        input.maxLength = TRANSLATE_MAX_CHARS;
        input.placeholder = "日本語 / i-tya";
        typeRow.appendChild(input);

        overlay.append(heard, result, note, mic, typeRow, bottom);
        document.body.appendChild(overlay);

        // ----- helpers -----
        let recognition = null;
        let gotSpeech = false;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const stopMic = () => {           // silent stop (used when closing)
                const r = recognition; recognition = null;
                if (r) { r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
                mic.style.backgroundColor = "rgba(255,255,255,0.12)";
        };
        const onKey = (e) => { if (e.key === "Escape") close(); };
        function close() {
                stopMic();
                document.removeEventListener("keydown", onKey, true);
                overlay.remove();
        }
        document.addEventListener("keydown", onKey, true);
        closeBtn.onclick = close;
        overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

        const showTyping = () => { typeRow.style.display = "block"; input.focus(); };
        keyBtn.onclick = showTyping;
        input.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(input.value); }
        });

        const say = (msg, color) => { note.textContent = msg; note.style.color = color || "white"; };

        async function submit(raw) {
                const text = String(raw || "").trim().slice(0, TRANSLATE_MAX_CHARS);
                if (!text || translatorBusy) return;
                if (translateCount >= TRANSLATE_SESSION_LIMIT) { say("たくさん使ってくれてありがとう。続きはまた後で。", "#ffd27f"); return; }
                const wait = TRANSLATE_COOLDOWN_MS - (Date.now() - lastTranslateAt);
                if (wait > 0) { say("少し待ってね", "#ffd27f"); return; }

                const direction = detectDirection(text);
                heard.textContent = text;
                result.textContent = "...";
                result.style.fontFamily = TR_FONT_PIXEL;
                say("");
                translatorBusy = true;
                const r = await callTranslate(direction, text);
                translatorBusy = false;
                lastTranslateAt = Date.now();
                if (!document.getElementById("translator-overlay")) return;   // closed meanwhile

                if (r.ok) {
                        translateCount++;
                        result.style.fontFamily = direction === "toItya" ? TR_FONT_PIXEL : TR_FONT_JA;
                        result.textContent = r.data.translation;
                        const hasNew = direction === "toItya" && (r.data.breakdown || []).some(b => b.status === "new");
                        say(hasNew ? "※ 辞書にまだない語の案を含みます" : "", "#f1c40f");
                } else {
                        result.textContent = "";
                        const msgs = {
                                limit: `混み合っています。${r.retryAfter} 秒ほど待ってね。`,
                                overload: "混み合っています。少し待ってね。",
                                empty: "うまく訳せませんでした。言い方を変えてみてね。",
                                network: "辞書につながりません。ゲームはそのまま続けられます。",
                        };
                        say(msgs[r.kind] || msgs.network, "#ff9b9b");
                }
        }

        // ----- voice: tap the mic, speak, it translates by itself -----
        function listen() {
                if (!SpeechRec) { say("このブラウザでは声が使えません。⌨で入力してね。"); showTyping(); return; }
                if (recognition) { try { recognition.stop(); } catch (e) {} return; }   // tap again = "done talking"
                recognition = new SpeechRec();
                recognition.lang = "ja-JP";
                recognition.interimResults = true;
                recognition.continuous = false;
                gotSpeech = false;
                mic.style.backgroundColor = "#c0392b";
                heard.textContent = "";
                say("話してください", "#9be7ff");
                let finalText = "";
                recognition.onresult = (ev) => {
                        let t = "";
                        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
                        finalText = t; gotSpeech = true;
                        heard.textContent = t;
                };
                recognition.onerror = (ev) => {
                        if (ev.error === "aborted") return;
                        const msgs = {
                                "not-allowed": "マイクが許可されていません。⌨で入力してね。",
                                "service-not-allowed": "マイクが許可されていません。⌨で入力してね。",
                                "audio-capture": "マイクが見つかりません。⌨で入力してね。",
                                "no-speech": "聞こえませんでした。もう一度どうぞ。",
                                "network": "音声認識につながりません。⌨で入力してね。",
                        };
                        say(msgs[ev.error] || "声がうまく聞けませんでした。⌨で入力してね。", "#ff9b9b");
                        if (ev.error !== "no-speech") showTyping();
                };
                recognition.onend = () => {
                        recognition = null;
                        mic.style.backgroundColor = "rgba(255,255,255,0.12)";
                        if (gotSpeech && finalText.trim()) submit(finalText);
                };
                try { recognition.start(); } catch (e) { recognition = null; showTyping(); }
        }
        mic.onclick = listen;

        // first open: a tiny privacy note, then start listening right away
        say(SpeechRec ? "声はChromeの音声認識（Google）で処理されます" : "", "rgba(255,255,255,0.6)");
        listen();
}
