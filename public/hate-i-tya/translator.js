// i-tya dictionary translator panel (talks to the i-tya-dictionary API).
//  - Japanese -> i-tya (POST /api/translate with dryRun:true so nothing is saved)
//  - i-tya -> Japanese (POST /api/reverse-translate)
//  - voice input via the browser's SpeechRecognition (Chrome), text input as fallback
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

// ---------- panel UI ----------
const TR_FONT = "'DotGothic16', 'Press Start 2P', system-ui";

function mk(tag, styles, text) {
        const el = document.createElement(tag);
        if (styles) Object.assign(el.style, styles);
        if (text !== undefined) el.textContent = text;
        return el;
}

function isTypingTarget(t) {
        return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

function initTranslator() {
        if (document.getElementById("translator-button")) return;
        const btn = mk("button", {
                position: "fixed", top: "10px", right: "10px", zIndex: "9000",
                padding: "10px 14px", fontFamily: TR_FONT, fontSize: "16px", cursor: "pointer",
                color: "white", backgroundColor: "rgba(0,0,0,0.65)", border: "2px solid white", borderRadius: "10px",
        }, "翻訳");
        btn.id = "translator-button";
        btn.title = "日本語とi-tya語を翻訳する";
        btn.onclick = openTranslator;
        document.body.appendChild(btn);
}

function openTranslator() {
        if (document.getElementById("translator-overlay")) return;
        let direction = "toItya";

        const overlay = mk("div", {
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%", zIndex: "15000",
                backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
                padding: "16px", boxSizing: "border-box", fontFamily: TR_FONT, color: "white",
        });
        overlay.id = "translator-overlay";

        const panel = mk("div", {
                width: "100%", maxWidth: "640px", maxHeight: "100%", overflowY: "auto",
                backgroundColor: "rgba(10,10,10,0.9)", border: "4px solid white", borderRadius: "14px",
                padding: "20px", boxSizing: "border-box",
        });

        panel.appendChild(mk("div", { fontSize: "22px", marginBottom: "12px" }, "翻訳"));

        // direction tabs
        const tabs = mk("div", { display: "flex", gap: "8px", marginBottom: "12px" });
        const tabStyle = (active) => ({
                flex: "1", padding: "10px", fontFamily: TR_FONT, fontSize: "15px", cursor: "pointer",
                color: active ? "#2c3e50" : "white", backgroundColor: active ? "#f1c40f" : "rgba(255,255,255,0.15)",
                border: "none", borderRadius: "8px",
        });
        const tabA = mk("button", tabStyle(true), "日本語 → i-tya語");
        const tabB = mk("button", tabStyle(false), "i-tya語 → 日本語");
        tabs.append(tabA, tabB);
        panel.appendChild(tabs);

        const input = mk("textarea", {
                width: "100%", height: "84px", boxSizing: "border-box", resize: "none",
                fontFamily: TR_FONT, fontSize: "18px", padding: "10px", borderRadius: "8px",
                border: "2px solid #888", backgroundColor: "white", color: "#222",
        });
        input.maxLength = TRANSLATE_MAX_CHARS;
        input.placeholder = "言いたい言葉を入力（または🎤で話す）";
        panel.appendChild(input);

        const row = mk("div", { display: "flex", gap: "8px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" });
        const goBtn = mk("button", {
                padding: "10px 22px", fontFamily: TR_FONT, fontSize: "18px", cursor: "pointer",
                color: "white", backgroundColor: "#3498db", border: "none", borderRadius: "8px",
        }, "翻訳する");
        const micBtn = mk("button", {
                padding: "10px 16px", fontFamily: TR_FONT, fontSize: "18px", cursor: "pointer",
                color: "white", backgroundColor: "#c0392b", border: "none", borderRadius: "8px",
        }, "🎤 話す");
        const counter = mk("span", { marginLeft: "auto", fontSize: "13px", opacity: "0.7" }, "");
        row.append(goBtn, micBtn, counter);
        panel.appendChild(row);

        const notice = mk("div", { marginTop: "8px", fontSize: "12px", opacity: "0.65", lineHeight: "1.6" },
                "🎤は話した音声をChrome（Google）の音声認識に送ります。使いたくない場合は文字で入力してください。");
        panel.appendChild(notice);

        const status = mk("div", { marginTop: "14px", minHeight: "24px", fontSize: "15px", lineHeight: "1.7" });
        panel.appendChild(status);
        const resultBox = mk("div", { marginTop: "6px" });
        panel.appendChild(resultBox);

        const closeBtn = mk("button", {
                display: "block", margin: "18px auto 0", padding: "10px 24px", fontFamily: TR_FONT, fontSize: "16px",
                cursor: "pointer", color: "#2c3e50", backgroundColor: "#f1c40f", border: "none", borderRadius: "8px",
        }, "ie");
        panel.appendChild(closeBtn);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        input.focus();

        // ----- helpers -----
        let recognition = null;
        const stopMic = () => { try { recognition && recognition.stop(); } catch (e) {} recognition = null; };
        const close = () => {
                stopMic();
                document.removeEventListener("keydown", onKey, true);
                overlay.remove();
        };
        const onKey = (e) => { if (e.key === "Escape") close(); };
        document.addEventListener("keydown", onKey, true);
        closeBtn.onclick = close;
        overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

        const setStatus = (msg, color) => { status.textContent = msg; status.style.color = color || "white"; };
        const updateCounter = () => { counter.textContent = `残り ${Math.max(0, TRANSLATE_SESSION_LIMIT - translateCount)} 回`; };
        updateCounter();

        const setDirection = (d) => {
                direction = d;
                Object.assign(tabA.style, tabStyle(d === "toItya"));
                Object.assign(tabB.style, tabStyle(d === "toJa"));
                input.placeholder = d === "toItya" ? "言いたい言葉を入力（または🎤で話す）" : "i-tya語の文を入力";
                micBtn.style.display = (d === "toItya" && SpeechRec) ? "" : "none";
                notice.style.display = (d === "toItya" && SpeechRec) ? "" : "none";
                resultBox.textContent = ""; setStatus("");
        };
        tabA.onclick = () => setDirection("toItya");
        tabB.onclick = () => setDirection("toJa");

        // ----- voice input (Chrome) -----
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) { micBtn.style.display = "none"; notice.style.display = "none"; }
        micBtn.onclick = () => {
                if (!SpeechRec) return;
                if (recognition) { stopMic(); micBtn.textContent = "🎤 話す"; return; }
                recognition = new SpeechRec();
                recognition.lang = "ja-JP";
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;
                recognition.continuous = false;
                micBtn.textContent = "■ 止める";
                setStatus("聞いています…話してください", "#9be7ff");
                recognition.onresult = (ev) => {
                        let text = "";
                        for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
                        input.value = text.slice(0, TRANSLATE_MAX_CHARS);
                };
                recognition.onerror = (ev) => {
                        const msgs = {
                                "not-allowed": "マイクが許可されていません。ブラウザのマイク設定を確認するか、文字で入力してください。",
                                "service-not-allowed": "マイクが許可されていません。文字で入力してください。",
                                "no-speech": "声が聞こえませんでした。もう一度試してください。",
                                "audio-capture": "マイクが見つかりません。文字で入力してください。",
                                "network": "音声認識に接続できません。文字で入力してください。",
                        };
                        setStatus(msgs[ev.error] || "音声認識でエラーが出ました。文字で入力してください。", "#ff9b9b");
                };
                recognition.onend = () => {
                        recognition = null;
                        micBtn.textContent = "🎤 話す";
                        if (input.value.trim() && status.style.color !== "rgb(255, 155, 155)") {
                                setStatus("「翻訳する」を押してください", "white");
                        }
                };
                try { recognition.start(); } catch (e) { recognition = null; micBtn.textContent = "🎤 話す"; }
        };

        // ----- translate -----
        const render = (data) => {
                resultBox.textContent = "";
                const main = mk("div", {
                        fontSize: "24px", padding: "12px", backgroundColor: "rgba(255,255,255,0.12)",
                        borderRadius: "8px", marginBottom: "10px", wordBreak: "break-word",
                }, data.translation);
                resultBox.appendChild(main);
                const items = Array.isArray(data.breakdown) ? data.breakdown : [];
                items.forEach(it => {
                        const left = direction === "toItya" ? it.japanese : it.itya;
                        const right = direction === "toItya" ? it.itya : it.japanese;
                        const meaning = direction === "toItya"
                                ? [it.meaning_noun, it.meaning_verb].filter(Boolean)[0]
                                : it.role;
                        const line = mk("div", { fontSize: "14px", lineHeight: "1.7", padding: "6px 4px", borderBottom: "1px solid rgba(255,255,255,0.15)" });
                        line.appendChild(mk("span", { opacity: "0.8" }, `${left ?? ""} → `));
                        line.appendChild(mk("strong", { fontSize: "16px" }, `${right ?? ""}`));
                        if (meaning) line.appendChild(mk("div", { fontSize: "12px", opacity: "0.65" }, meaning));
                        if (direction === "toItya" && it.status === "new")
                                line.appendChild(mk("div", { fontSize: "11px", color: "#f1c40f" }, "※ 辞書にまだない新しい語の案です（保存はされません）"));
                        resultBox.appendChild(line);
                });
        };

        const doTranslate = async () => {
                if (translatorBusy) return;
                const text = input.value.trim();
                if (!text) { setStatus("言葉を入力してください", "#ffd27f"); return; }
                if (translateCount >= TRANSLATE_SESSION_LIMIT) { setStatus("この端末での翻訳回数の上限に達しました。", "#ff9b9b"); return; }
                const wait = TRANSLATE_COOLDOWN_MS - (Date.now() - lastTranslateAt);
                if (wait > 0) { setStatus(`少し待ってね（あと ${Math.ceil(wait / 1000)} 秒）`, "#ffd27f"); return; }

                translatorBusy = true; goBtn.disabled = true; goBtn.style.opacity = "0.5";
                resultBox.textContent = "";
                setStatus("翻訳中…（辞書サーバーが眠っていると、最初は1分ほどかかることがあります）", "#9be7ff");
                const r = await callTranslate(direction, text);
                translatorBusy = false; goBtn.disabled = false; goBtn.style.opacity = "1";
                lastTranslateAt = Date.now();
                if (!document.getElementById("translator-overlay")) return; // closed meanwhile

                if (r.ok) {
                        translateCount++; updateCounter();
                        setStatus("");
                        render(r.data);
                } else if (r.kind === "limit") {
                        setStatus(`混み合っています。${r.retryAfter} 秒ほど待ってからもう一度。`, "#ff9b9b");
                } else if (r.kind === "overload") {
                        setStatus("辞書が混み合っています。少し待ってからもう一度。", "#ff9b9b");
                } else if (r.kind === "empty") {
                        setStatus("うまく翻訳できませんでした。言い方を変えてみてください。", "#ff9b9b");
                } else {
                        setStatus("辞書に接続できませんでした。ゲームはそのまま続けられます。", "#ff9b9b");
                }
        };
        goBtn.onclick = doTranslate;
        input.addEventListener("keydown", (e) => {
                e.stopPropagation(); // keep typing away from the game's key handlers
                if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); doTranslate(); }
        });
}
