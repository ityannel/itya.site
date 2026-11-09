const FPS = 30;
let startTime, endTime, totalTime;
let soundReady = false;


function loop(){
        startTime = Date.now();
        gameLoop();

        // console.log(scenes[currentSceneIndex]);
        // console.log(`Scene${currentScene.scene}`);
        // console.log(currentChars[1]);

        endTime = Date.now();
        totalTime = endTime - startTime;
        const delay = Math.max(1, parseInt(1000 / FPS) - totalTime)
        setTimeout(loop, delay);
};

// ---------- overlay helpers (loading / start / idle) ----------
const UI_FONT = "'Press Start 2P', 'DotGothic16', system-ui";

function makeOverlay(id) {
        const old = document.getElementById(id);
        if (old) old.remove();
        const el = document.createElement("div");
        el.id = id;
        Object.assign(el.style, {
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.92)", color: "white", textAlign: "center",
                fontFamily: UI_FONT, zIndex: "20000", padding: "20px", boxSizing: "border-box",
        });
        document.body.appendChild(el);
        return el;
}

// ---------- idle reset (for unattended open-campus booths) ----------
const IDLE_WARN_MS = 150 * 1000;   // ask "still there?" after 2.5 min without input
const IDLE_RESET_MS = 15 * 1000;   // go back to the start if nobody answers
let idleWarnTimer = null;
let idleResetTimer = null;

function startIdleWatch() {
        const showIdleWarning = () => {
                const el = makeOverlay("idle-overlay");
                el.style.zIndex = "30000";
                el.style.cursor = "pointer";
                el.style.fontSize = "18px";
                el.style.lineHeight = "2";
                el.innerHTML = "Yu un ten?<br>(まだ遊んでいますか？ クリックで続けます)";
                idleResetTimer = setTimeout(() => location.reload(), IDLE_RESET_MS);
        };
        const reset = () => {
                clearTimeout(idleWarnTimer);
                clearTimeout(idleResetTimer);
                const warn = document.getElementById("idle-overlay");
                if (warn) warn.remove();
                idleWarnTimer = setTimeout(showIdleWarning, IDLE_WARN_MS);
        };
        ["click", "keydown", "pointerdown", "touchstart"].forEach(ev =>
                window.addEventListener(ev, reset, { passive: true, capture: true }));
        reset();
}

// ---------- start screen with a short how-to ----------
function showStartScreen() {
        return new Promise(resolve => {
                const el = makeOverlay("start-overlay");
                el.style.cursor = "pointer";
                el.style.overflowY = "auto";
                const iz = "margin:0 0 14px;font-family:'Press Start 2P',system-ui;font-size:0.6em;line-height:2";
                el.innerHTML = `
                        <div style="font-size:clamp(24px,5vw,48px);margin-bottom:24px;">Hate i-tya?</div>
                        <div style="font-family:'DotGothic16',system-ui;font-size:clamp(14px,2.2vw,20px);line-height:1.9;max-width:640px;">
                                <p style="margin:0 0 14px">架空言語「i-tya語」を学ぶノベルゲームです。</p>
                                <p style="margin:0">画面の右下に三角形が出ている間、クリックでストーリーが進みます。</p>
                                <p style="${iz}">Ge un und yu pon und tend sulanyao.</p>
                                <p style="margin:0">途中でクイズが現れます。正解を見つけてください。</p>
                                <p style="${iz}">Und sunya-iesunya un i. Zin yanya.</p>
                                <p style="margin:0">単語帳は、一回目のクイズの後から左上に現れます。</p>
                                <p style="${iz}">B un saozip ba sunya-iesunya.</p>
                                <p style="margin:0">マップでは矢印キー（または WASD）で移動し、Enter で入ります。</p>
                                <p style="margin:0">音が出ます。</p>
                        </div>
                        <div id="start-prompt" style="margin-top:32px;font-size:clamp(14px,2.4vw,22px);">Pon (CLICK TO START)</div>`;
                const blink = setInterval(() => {
                        const p = document.getElementById("start-prompt");
                        if (p) p.style.opacity = (Date.now() % 1200 < 800) ? "1" : "0.3";
                }, 150);
                const go = () => {
                        clearInterval(blink);
                        window.removeEventListener("keydown", onKey);
                        el.remove();
                        resolve();
                };
                const onKey = (e) => {
                        if (e.key === "Enter" || e.code === "Space") {
                                e.preventDefault();
                                go();
                        }
                };
                el.addEventListener("click", go, { once: true });
                window.addEventListener("keydown", onKey);
        });
}

async function init(){
        // wake the dictionary server up while assets load (it may be asleep)
        if (typeof warmUpDictionary === "function") warmUpDictionary();

        // loading screen with progress
        const loading = makeOverlay("loading-overlay");
        loading.style.fontSize = "20px";
        const TOTAL_SOUNDS = 31;
        let loadedSounds = 0;
        const renderProgress = () => {
                loading.textContent = `Loading... ${Math.round(loadedSounds / TOTAL_SOUNDS * 100)}%`;
        };
        renderProgress();
        const trackSound = (n, file) => loadSound(n, file).then(() => { loadedSounds++; renderProgress(); });

        await Promise.all([
                // fonts (don't wait forever if Google Fonts is blocked)
                Promise.race([
                        Promise.all([
                                document.fonts.load("16px 'Press Start 2P'"),
                                document.fonts.load("16px 'DotGothic16'"),
                        ]).catch(() => {}),
                        new Promise(r => setTimeout(r, 3000)),
                ]),
//for Backgrounds from 1000=~~~~~
                loadImage(1000, 'images/bgbefore.jpg'),
                loadImage(1001, 'images/bgtitle.jpg'),
                loadImage(1002, 'images/bgForest.jpg'),
                loadImage(1003, 'images/bgVillege.jpg'),
                loadImage(1004, 'images/bgMap.jpg'),
                loadImage(1005, 'images/bgmokuno.jpg'),
                loadImage(1006, 'images/bgTehosue.jpg'),
                loadImage(1007, 'images/itadakimasu.jpg'),
                loadImage(1008, 'images/bgMuzin.jpg'),
                loadImage(1009, 'images/dokutsu.jpg'),
                loadImage(1010, 'images/white.png'),
                loadImage(1011, 'images/bgLast.jpg'),
                //for images
                loadImage(0, 'images/mcNormal.png'),
                loadImage(1, 'images/mcLying.png'),
                loadImage(2, 'images/mcRunning0.png'),
                loadImage(3, 'images/mcRunning1.png'),
                loadImage(4, 'images/mcRunning2.png'),
                loadImage(17, 'images/mcAse.png'),
                loadImage(11, 'images/mcQues.png'),
                loadImage(5, 'images/teNormal.png'),
                loadImage(6, 'images/teSmiling.png'),
                loadImage(7, 'images/teAngry.png'),
                loadImage(12, 'images/teHen.png'),
                loadImage(8, 'images/cfNormal.png'),
                loadImage(9, 'images/cfIndic.png'),
                loadImage(10, 'images/cfSmiling.png'),
                loadImage(15, 'images/cfLooking.png'),
                loadImage(16, 'images/cfAisklitt.png'),
                loadImage(20, 'images/cfIkari.png'),
                loadImage(22, 'images/kami.png'),
                

                loadImage(13, 'images/tehouse.jpg'),
                loadImage(14, 'images/mokuno.jpg'),
                loadImage(18, 'images/tiyaoicon.png'),
                loadImage(19, 'images/mission.png'),
                loadImage(21, 'images/sulanyao.jpg'),

                //forBGM
                trackSound(1000, 'sounds/intropop.mp3'),
                trackSound(1001, 'sounds/birds.m4a'),
                trackSound(1002, 'sounds/map.mp3'),
                trackSound(1003, 'sounds/mokuno.mp3'),
                trackSound(1004, 'sounds/ikukan.mp3'),
                trackSound(1005, 'sounds/oi.mp3'),

                trackSound(0, 'sounds/piko2.mp3'),
                trackSound(1, 'sounds/walk.mp3'),
                trackSound(2, 'sounds/pon.mp3'),
                trackSound(3, 'sounds/jan.mp3'),
                trackSound(4, 'sounds/boon.mp3'),
                trackSound(5, 'sounds/petyataka.mp3'),
                trackSound(6, 'sounds/petyahiku.mp3'),
                trackSound(7, 'sounds/peta.mp3'),
                trackSound(8, 'sounds/ryori1.mp3'),
                trackSound(9, 'sounds/ryori2.mp3'),
                trackSound(10, 'sounds/ryori3.mp3'),
                trackSound(11, 'sounds/ryori4.mp3'),
                trackSound(12, 'sounds/ryori5.mp3'),
                trackSound(13, 'sounds/ryori6.mp3'),
                trackSound(14, 'sounds/walkAspha.mp3'),
                trackSound(15, 'sounds/tiyao.mp3'),
                trackSound(16, 'sounds/welcome.mp3'),
                trackSound(17, 'sounds/ryori21.mp3'),
                trackSound(18, 'sounds/ryori22.mp3'),
                trackSound(19, 'sounds/ryori23.mp3'),
                trackSound(20, 'sounds/kirari-n.mp3'),
                trackSound(21, 'sounds/seiko.mp3'),
                trackSound(22, 'sounds/bu.mp3'),
                trackSound(23, 'sounds/walkIshi.mp3'),
                trackSound(24, 'sounds/ga-ga-ga.mp3'),

        ]);

        loading.remove();

        // most browsers need a click before audio can play
        await showStartScreen();

        if (sound[1001]) sound[1001].volume = 0.3;

        soundReady = true;

        gameLoop();

        // staff shortcut: index.html?scene=N starts from scene N
        const startParam = parseInt(new URLSearchParams(location.search).get("scene"), 10);
        const startIndex = (Number.isInteger(startParam) && scenes[startParam]) ? startParam : 0;
        showScene(startIndex);

        loop();
        startIdleWatch();
        if (typeof initTranslator === "function") initTranslator();
}


init();
