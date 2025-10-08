let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
let isTyping = false;
let textProgress = 0;
let typingTimer = null;

let gameState = "story";
let isSceneLocked = false;
let lastCraftedSentence = "";

let isWalkingSoundPlayingOnMap = false;
let previousEnterableLocation = null;

let animationFrame = 0;
const animationSpeed = 2;
let lastDirection = "right";


let mapMessage = null;
let mapMessageTimer = null;

const soundSpot = [
        {xP: 25, yP: 95, radiusP: 10, soundId: 5, hasPlayed:false},
        {xP: 30, yP: 85, radiusP: 10, soundId: 6, hasPlayed:false},
        {xP: 45, yP: 95, radiusP: 10, soundId: 6, hasPlayed:false},
        {xP: 55, yP: 55, radiusP: 10, soundId: 5, hasPlayed:false},
        {xP: 70, yP: 55, radiusP: 10, soundId: 6, hasPlayed:false},
];

const typeSound = new Audio("sounds/piko.mp3");
typeSound.volume=0.5;
typeSound.loop = false;

function playTypeSound() {
        const se = typeSound.cloneNode(true);
        se.volume = typeSound.volume;
        se.play().catch(() => {});
}

function stopTypeSound() {
        typeSound.pause();
        typeSound.currentTime = 0;
}

let imageState = new Array(2046).fill(null).map(() => ({
        xP: null, yP: null, wP: null, hP: null,
        x: null, y: null, w: 0, h: 0,
        destXP: null, destYP: null,
        destX: null, destY: null, speedP: 0,
        moving: false,
        onArrive: null,
        walkSound: null
}));

let mapPlayer = {
        char: "mc",
        img: 0,
        xP: 10,
        yP: 70,
        wP: 8,
        hP: null,
        speedP: 0.8,
        animation: [2, 3, 2, 4],
        standingImg: 0,
}

const mapLocations = [
        {
                spot: "sulanya hapo",
                img: 13,
                xP: 7, yP: 10, wP: 20,
                entryScene: () => {
                        if (mission2 === "issued") {
                                return "closed";
                        }
                        if (mission1 === "issued") {
                                return 62;
                        } else {
                                return 58;
                        }
                }
        },
        {
                spot: "mokuno",
                img: 14,
                xP: 65, yP: 5, wP: 17,
                entryScene: () => {
                        if (mission2 === "issued") {
                                return "closed";
                        }
                        if(mission1 === "issued" && haveTiyao === false) {
                                return 73;
                        } else if (mission1 === "issued" && haveTiyao === true){
                                return 79;
                        } else {
                                return 33;
                        }
                }
        },
        {
                spot: "sulanyao",
                img: 21,
                xP: 42, yP: 4, wP: 15,
                entryScene: () => {
                        if (mission2 === "issued") {
                                return 108;
                        } else {
                                return "closed";
                        }
                }
        },
];

let currentEnterableLocation = null;
const keyPressed = {};

function resizeCanvas() {
        canvas.width = window.innerWidth * 0.8;
        canvas.height = canvas.width * 0.6;
}

function toPx(xPercent, yPercent){
        return {
                x: canvas.width * xPercent / 100,
                y: canvas.height * yPercent / 100
        }
}

function drawStory() {
        if(!currentScene) return;
        context.clearRect(0,0, canvas.width, canvas.height);
  
        if(currentScene) drawBackground(currentScene.bg);

        currentChars.forEach(c => {
                move(c.img);
                drawImage(c.img, c.xP, c.yP, c.wP, c.hP);
        })

        if(currentScene && currentScene.text) {
                context.font = `${currentScene.text.weight ?? 400} ${currentScene.text.size ?? canvas.height * 0.05}px ${currentScene.text.font ?? "'Press Start 2P', 'DotGothic16', system-ui"}`;
                context.fillStyle =
                currentScene.text.char == "te" ? "#2c2e97" :
                currentScene.text.char == "cf" ? "#000000" :
                currentScene.text.char == "god" ?"#005bd2ff": "#9c3115";
                context.textAlign = currentScene.text.align ?? "center";
                context.textBaseline = currentScene.text.baseline ?? "middle";

                const content = currentScene.text.content ?? "";

                const textX = canvas.width / 2;
                const textY = canvas.height * 0.9;
                const welcometo = "Welcome aboard the Japan Airline's fl"
                const partial = content.slice(0, textProgress);

                context.fillText(partial, textX, textY);
        }

        if (!isTyping && currentScene?.clickable !== false && !currentChars.some(c => imageState[c.img].moving)) {
                drawArrow();
        }

        showIcon();
        // console.log(`isTyping is ${isTyping}, currentScene.clickable is ${currentScene?.clickable}, moving is ${currentChars.some(c => imageState[c.img].moving)}`);
}       

function drawMap() {
        context.clearRect(0,0, canvas.width, canvas.height);
        if(mission2 == "issued") {
                drawBackground(1008);
        }else{
                drawBackground(1004);
        }

        mapLocations.forEach(loca => {
                drawImage(loca.img, loca.xP, loca.yP, loca.wP, null);
        })

        if (imageLoaded[mapPlayer.img]) {
                const playerImgData = imageState[mapPlayer.img];
                let imgToDraw = image[mapPlayer.img];

                const pWP = mapPlayer.wP ?? 10;
                let pW = canvas.width * pWP / 100;
                let pH;

                if(mapPlayer.hP !== null) {
                        pH = canvas.height * mapPlayer.hP / 100;
                } else {
                        const aspectRatio = imgToDraw.height/ imgToDraw.width || 1;
                        pH = pW * aspectRatio;
                }
                playerImgData.w = pW;
                playerImgData.h = pH;


                let drawX = toPx(mapPlayer.xP, 0).x - (pW/ 2);
                let drawY = toPx(0, mapPlayer.yP).y - pH;

                context.save();

                if(lastDirection === "left") {
                        context.translate(drawX + pW, 0);
                        context.scale(-1, 1);
                        drawX = 0;
                }

                context.drawImage(imgToDraw, drawX, drawY, pW, pH);

                context.restore();
        }

        if(currentEnterableLocation) {
                context.save();
                context.fillStyle = "white";
                context.strokeStyle = "black";
                context.lineWidth = 5;
                context.font = `bold ${canvas.height * 0.05}px 'Press Start 2P', system-ui`;
                context.textAlign = "center";
                const text = `[Enter] tend ten ${currentEnterableLocation.spot}`;
                context.strokeText(text,canvas.width /2, canvas.height * 0.9);
                context.fillText(text, canvas.width / 2, canvas.height * 0.9);
                context.restore();
        }

        if (mapMessage) {
                context.save();
                context.fillStyle = "white";
                context.strokeStyle = "red";
                context.lineWidth = 8;
                context.font = `bold ${canvas.height * 0.1}px 'Press Start 2P', system-ui`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.strokeText(mapMessage, canvas.width / 2, canvas.height / 2);
                context.fillText(mapMessage, canvas.width / 2, canvas.height / 2);
                context.restore();
        }

        showIcon();
}

function handleMapEntry() {
        if (!currentEnterableLocation) return;

        let targetScene;
        if (typeof currentEnterableLocation.entryScene === 'function') {
                targetScene = currentEnterableLocation.entryScene();
        } else {
                targetScene = currentEnterableLocation.entryScene;
        }

        if (targetScene === "closed") {
                mapMessage = "Mi ieten...";
                playSound(22)
                clearTimeout(mapMessageTimer);
                mapMessageTimer = setTimeout(() => {
                mapMessage = null;
                }, 1500);
        } else if (typeof targetScene === "number" && scenes[targetScene]) {
                playSound(2);
                stopSoundType("bgm");
                if (isWalkingSoundPlayingOnMap) {
                        stopSoundType("walk");
                        isWalkingSoundPlayingOnMap = false;
                }
                gameState = "story";
                currentChars = [];
                showScene(targetScene);
                currentEnterableLocation = null;
        }
}

function gameLoop() {
        if (gameState === "story") {
                drawStory();
        } else if (gameState === "map") {
                updateMapPlayer();
                drawMap();
        }
}



let image = new Array(256);
let imageLoaded = new Array(256);

function loadImage(n, filename){
        imageLoaded[n] = false;
        image[n] = new Image();
        image[n].onload = () => {
                imageLoaded[n] = true;
                console.log(`Image ${n} loaded successfully`);
        }

        image[n].src = filename;
}

function drawImage(n, xP, yP, wP, hP){
        if (!imageLoaded[n]) return; 

        const img = image[n];
        const state = imageState[n];

        if (xP !== undefined) state.xP = xP;
        if (yP !== undefined) state.yP = yP;
        if (wP !== undefined) state.wP = wP;
        if (hP !== undefined) state.hP = hP;

        if(!state.moving) {
                state.x = canvas.width * (state.xP ?? 0) /100;
                state.y = canvas.height * (state.yP ?? 0) /100;
        }

        state.wP = (state.wP == null) ? 10 : state.wP;

//     if (xP !== undefined && state.destX === null) {
//         state.x = canvas.width * state.xP / 100;
//         state.y = canvas.height * state.yP / 100;
//     }

        const dWidth = canvas.width * state.wP / 100;
        let dHeight;

        if(state.hP !== null) {
                dHeight = canvas.height * state.hP / 100;
        } else {
                const aspectRatio = img.height / img.width || 1;
                dHeight = dWidth * aspectRatio;
        }

        state.w = dWidth;
        state.h = dHeight;

        context.save();
        if(state.alpha !== undefined) context.globalAlpha = state.alpha;
        context.drawImage(img, state.x, state.y, dWidth, dHeight);
        context.restore();
};


function drawBackground(nb){
        if (!imageLoaded[nb]) return;

        const img = image[nb];
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;

        let realWidth, realHeight;

        if (canvasAspect > imgAspect) {
                realWidth = canvas.width;
                realHeight = canvas.width / imgAspect;
        } else {
                realHeight = canvas.height;
                realWidth = canvas.height * imgAspect;
        }

        const realX = (canvas.width - realWidth) / 2;
        const realY = (canvas.height - realHeight) / 2;

        context.drawImage(img, realX, realY, realWidth, realHeight);
}

const surfaceSound = {
        grass: 1,
        floor: 14,
        ishi: 23
}

function setDest(charName, destXP, destYP, speedP, surface, callback){
        const c = currentChars.find(ch => ch.char === charName);
        if(!c) return;

        const state = imageState[c.img];

        if(state.walkSound) {
                state.walkSound.pause();
                state.walkSound.currentTime = 0;
                state.walkSound = null;
        }

        if(surface && surfaceSound[surface]){
                const soundId = surfaceSound[surface];
                state.walkSound = playSound(soundId, { loop: true, type: 'walk' });
        }
        state.destXP = destXP;
        state.destYP = destYP;
        state.destX = canvas.width * destXP / 100;
        state.destY = canvas.height * destYP / 100;
        state.speedP = speedP ?? 1;
        state.entering = true;
        state.moving = true;
        state.onArrive = (typeof callback === "function" ) ? callback : null;

        // const moveStep = () => {
        //         if(!state.entering) return;

        //         const dx = state.destX - state.x;
        //         const dy = state.destY - state.y;

        //         const dist = Math.sqrt(dx*dx + dy*dy);

        //         if(dist < 1) {
        //                 state.x = state.destX;
        //                 state.y = state.destY;
        //                 state.entering = false;
        //                 if (callback) callback();
        //                 return;
        //         }

        //         state.x += dx * 0.1 * state.speedP;
        //         state.y += dy * 0.1 *state.speedP;

        //         requestAnimationFrame(moveStep);
        // }

        // moveStep();
}

function move(n){
        const state = imageState[n];
        if(!state || !state.moving) return;

        // if (state.destX === null) return;
        const speedPx = Math.max(1, canvas.width * state.speedP / 100);
        const sx = (state.x == null) ? 0 : state.x;
        const sy = (state.y == null) ? 0 : state.y;
        let dx = state.destX - state.x;
        let dy = state.destY - state.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

 // if (distance < speedPx) {
        //         state.x = state.destX;
        //         state.y = state.destY;
        //         state.destXP  = null;
        //         state.destYP = null;
        //         state.destX = null;
        //         state.destY = null;
        // } else {
        //         state.x += (dx / distance) * speedPx;
        //         state.y += (dy / distance) * speedPx;
        // }

        if(distance <= speedPx || distance === 0) {
                state.x = state.destX;
                state.y = state.destY;
                state.moving = false;;

                if(state.walkSound) {
                        state.walkSound.pause();
                        state.walkSound.currentTime = 0;
                        state.walkSound = null;
                }

                const charObj = currentChars.find(c => c.img === n);
                if(charObj){
                        charObj.xP = state.destXP;
                        charObj.yP = state.destYP;
                }

                // state.xP = state.destXP != null ? state.destXP : (state.x / canvas.width) * 100;
                // state.yP = state.destYP != null ? state.destYP : (state.y / canvas.height) * 100;

                if (typeof state.onArrive === "function") {
                        const cb = state.onArrive;
                        state.onArrive = null;
                        cb();

                }
                return;
        }

        state.x += (dx/distance) * speedPx;
        state.y += (dy /distance) * speedPx;

        state.xP = (state.x / canvas.width) * 100;
        state.yP = (state.y / canvas.height) * 100;
        
}

function fadeIn(duration = 1000, callback){
        isSceneLocked = true;
        let start = null;

        const step = (now) => {
                if (!start) start = now;
                const elapsed = now - start;

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.globalAlpha = Math.min(elapsed/duration, 1);

                drawBackground(currentScene.bg);
                currentChars.forEach(c => drawImage( c.img, c.xP, c.yP, c.wP,c.hP));

                if(elapsed < duration) {
                        requestAnimationFrame(step)
                } else {
                        context.globalAlpha = 1;
                        isSceneLocked = false;
                        if (callback) callback();
                }
        }

        requestAnimationFrame(step);
}

function crossfade(duration = 1000, callback) {
        isSceneLocked = true;
        const prevBgId = scenes[currentSceneIndex - 1]?.bg;
        const newBgId = currentScene.bg;

        if(prevBgId === undefined) {
                fadeIn(duration, callback);
                return;
        }

        let start = null;

        const step = (now) => {
                if (!start) start = now;
                const ok = now - start;
                const progress = Math.min(ok / duration,1);

                context.clearRect(0, 0, canvas.width, canvas.height);

                context.globalAlpha = 1;
                drawBackground(prevBgId);

                context.globalAlpha = progress;
                drawBackground(newBgId);
                currentChars.forEach(c => drawImage(c.img, c.xP, c.yP, c.wP, c.hP));

                if(progress < 1) {
                        requestAnimationFrame(step);
                } else {
                        context.globalAlpha = 1;
                        isSceneLocked= false;
                        if (callback) callback();
                }
        }
        requestAnimationFrame(step);
}

// Sound system
let sound = new Array(256);
let soundLoaded = new Array(256);

function loadSound(n, filename){
        return new Promise((resolve, reject) => {
                soundLoaded[n] = false;
                sound[n] = new Audio();
                
                sound[n].addEventListener('canplaythrough', () => {
                        soundLoaded[n] = true;
                        console.log(`Sound ${n} loaded successfully`);
                        resolve();
                }, { once: true });
                
                sound[n].addEventListener('error', (e) => {
                        console.error(`Failed to load sound ${n}:`, e);
                        reject(new Error(`Failed to load sound ${n}`));
                }, { once: true });
                
                sound[n].src = filename;
                sound[n].load();
        });
}
let playingSounds = [];

function playSound(id, options, callback) {
        if (typeof options === 'function') {
                callback = options;
                options = {};
        } else {
                options = options || {}; 
        }

        const { loop = false, type = "se"} = options;
        const base = sound[id];
        
        if (!base) {
                if (typeof callback === 'function') {
                setTimeout(callback, 0);
                }
                return null;
        }

        const audio = (type === "bgm") ? base : (base.cloneNode ? base.cloneNode(true) : base);
        audio.loop = !!loop;
        audio.currentTime = 0;
        
        if (typeof callback === 'function' && !audio.loop) {
                audio.addEventListener('ended', callback, { once: true });
                audio.addEventListener('error', callback, { once: true });
        }
        
        audio.play().catch(() => {
                if (typeof callback === 'function' && !audio.loop) {
                audio.dispatchEvent(new Event('error'));
                }
        });

        playingSounds.push({ id, audio, type });
        return audio;
}

function stopSoundType(type) {
        playingSounds = playingSounds.filter(ps => {
                if(ps.type === type) {
                        try{
                                ps.audio.pause();
                                ps.audio.currentTime = 0;
                        } catch (e) {}
                        return false;
                }
                return true;
        })
}

function stopAllSounds() {
        playingSounds.forEach(ps => {
                try {ps.audio.pause(); ps.audio.currentTime = 0;} catch (e) {};
        });
        playingSounds = [];
}
let currentChars = [];

function setChar(chars) {
        const  prev = currentChars;
        chars = chars ?? [];
        currentChars = chars.map (c => {
                const previewForChar = prev.find(p => p.char === c.char);
                const imgId = (c.img ?? previewForChar?.img);


                if(imgId == null) {
                        throw new Error(`setChar: img is undifined!!!!!!!!`);
                }

                const obj = {
                        char: c.char,
                        img: imgId,
                        xP: c.xP ?? previewForChar?.xP ?? 0,
                        yP: c.yP ?? previewForChar?.yP ?? 0,
                        wP: c.wP ?? previewForChar?.wP ?? 10,
                        hP: c.hP ?? previewForChar?.hP ?? null
                };

                const state = imageState[imgId];

                state.moving = false;
                state.destX = null;
                state.destY = null;
                state.onArrive = null;
                
                state.xP = obj.xP;
                state.yP = obj.yP;

                // if(state.x === null || state.y === null) {
                        state.x = canvas.width * obj.xP / 100;
                        state.y = canvas.height * obj.yP / 100;
                // }
                state.wP = obj.wP;
                state.hP = obj.hP;

                // const enterFrom = c.enterFrom ?? c.jfkdsal;jkfdl;sajfkdsl;ajfkdla;jfkdsal;fjdksal;jfdksal;fjksdal;jfdk;sa;

                // if(enterFrom) {
                //         state.jfkdsal;jkfdl;sajfkdsl;ajfkdla;jfkdsal;fjdksal;jfdksal;fjksdal;jfdk;sa = true;
                //         state.y = canvas.height * obj.yP / 100;
                //         if(c.enterFrom === "right") {
                //                 state.x = canvas.width + 10;
                //         } else if (c.enterFrom === "left") {
                //                 state.x = 0 - 10;
                //         }
                // } else {
                //         state.jfkdsal;jkfdl;sajfkdsl;ajfkdla;jfkdsal;fjdksal;jfdksal;fjksdal;jfdk;sa = false;
                        // state.x = canvas.width * state.xP / 100;
                        // state.y = canvas.height * state.yP / 100;
                // }

                // if(enterFrom) {
                //         setDest(obj.char, obj.xP, obj.yP, c.speed ?? 1);
                // }

                if(c.enterFrom) {
                        if(c.enterFrom === "right") {
                                state.x = canvas.width + 10;
                        } else if(c.enterFrom === "left") {
                                state.x = - 10
                        } else {
                                state.x = canvas.width * state.xP / 100;
                        }
                        state.y = canvas.height * state.yP / 100;
                } else {
                        state.x = canvas.width * state.xP / 100;
                        state.y = canvas.height * state.yP / 100;
                }

                return obj;
        });
}

let currentSceneIndex = 0;
let currentScene = null;

function cleanUpScene() {
        stopSoundType("se");
        stopSoundType("me");

        if(typingTimer) {
                clearInterval(typingTimer);
                typingTimer = null;
        }
        stopTypeSound()
}

function updateDebugUI() {
        const label = document.getElementById("scene-label");
        if (label) {
                label.innerText = `Scene: ${currentSceneIndex}`;
        }
        const slider = document.querySelector("#debug-ui input[type=range]");
        if (slider) {
                slider.value = currentSceneIndex;
        }
}

function startLoading(callback) {

        const loadingScreen = document.createElement("div");
        Object.assign(loadingScreen.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'black',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: '10000',
                color: 'white',
                fontSize: '32px',
                fontFamily: "'Press Start 2P', system-ui",
        });

        document.body.appendChild(loadingScreen);


        let frameCount = 0;
        const totalFrames = 9;

        const animationInterval = setInterval(() => {
                const dotCount = (frameCount % 3) + 1;
                loadingScreen.textContent = ".".repeat(dotCount);

                frameCount++;

                if(frameCount >= totalFrames) {
                        clearInterval(animationInterval);

                        if(callback) callback();

                        setTimeout(() => {
                                loadingScreen.remove();
                        })
                }
        }, 500);
}

let mission0 = "unissued";
let mission1 = "unissued";
let mission2 = "unissued";
let haveTiyao = false;

function showScene(index){
        // console.log(`--- Trying to display Scene${index}--`);
        // if (!scenes[index]) {
        //         console.error(`Error! Couldn't find Scene${index}`);
        //         return;
        // }
        // console.log("Now Scene Data:", scenes[index]);
        cleanUpScene();

        currentSceneIndex = index;
        currentScene = scenes[index];

        const newBgmId = currentScene.bgm;
        const currentBgm = playingSounds.find(s => s.type === "bgm");

        if(currentBgm && (currentBgm.id !== newBgmId || newBgmId === null)){
                stopSoundType("bgm");
        }

        if(newBgmId !== null && (!currentBgm || currentBgm.id !== newBgmId)) {
                playSound(newBgmId, {type : "bgm", loop: true});
        }

        if (typingTimer) {
                clearTimeout(typingTimer);
                typingTimer = null;
        }
        isTyping = false;
        textProgress = 0;

        setChar(currentScene.char ?? []);

        if (currentScene.action) currentScene.action();

        const moving = currentChars.some(c => imageState[c.img].moving);

        const displayTextOrNext = () => {
                // if (currentScene.text) drawTextRPG(currentScene.text, nextScene);
                // else nextScene();
                if(currentScene.text) {
                        drawTextRPG(currentScene.text);
                }
        }

        if (moving) {
                const wait = () => {
                        const stillMoving = currentChars.some(c =>imageState[c.img].moving);
                        if(stillMoving) requestAnimationFrame(wait);
                        else displayTextOrNext();
                }
                wait();
        } else {
                displayTextOrNext();
        }

        if(typeof updateDebugUI === "function") updateDebugUI();
}

function nextScene(){
        const current = scenes[currentSceneIndex];

        const nextTarget = current.next;

        if(nextTarget === undefined) {
                showScene(currentSceneIndex + 1);
                return;
        }

        let targetIndex;

        if (typeof nextTarget === "function"){
                targetIndex = nextTarget();
        } else {
                targetIndex = nextTarget;
        }

        if(typeof targetIndex === "number" && scenes[targetIndex]) {
                showScene(targetIndex);
        } else {
                console.error("Couldn't get vaild property from next!!!");
        }
}

function showQuiz ({question, options, onAnswer, mode = "quiz", vocabulary = [], correctAnswers = []}) {
        const oldStyle = document.getElementById("quiz-animation");
        if(!oldStyle) {
                const style = document.createElement("style");
                style.id = "quiz-animation";
                style.innerHTML = `
                @keyframes shake{
                        10%, 90% {transform: translate3d(-1px, 0,0);}
                        20%, 80% {transform: translate3d(2px, 0, 0)}
                        30%, 50%, 70% {transform: translate3d(-4px, 0, 0)}
                        40%, 60% {transform: translate3d(4px, 0, 0)}
                }
                .shake {
                        animation: shake 0.5s cubic-bezier(.36, .07, .19, .97) both;
                }`
                document.head.appendChild(style);
        }
        const oldQuiz = document.getElementById("quiz-container");
        if (oldQuiz) oldQuiz.remove();

        const container = document.createElement("div");
        container.id = "quiz-container";
        Object.assign(container.style, {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height:"100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.75)",
                fontFamily: "'Press Start 2P', system-ui",
                opacity: "0",
                transition: "opacity 0.5s ease-in-out",
                zIndex: "1000"
        });
        setTimeout(() => {container.style.opacity = "1"}, 10);

        let sentenceDisplay = document.createElement("div");
        let currentSentence = "";

        if(mode === "craft"){
                sentenceDisplay = document.createElement("div");
                Object.assign(sentenceDisplay.style, {
                        minHeight: "50px",
                        width: "80%",
                        maxWidth: "800px",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        border: "3px solid #333",
                        borderRadius: "10px",
                        padding: "15px",
                        marginBottom: "20px",
                        fontSize: "24px",
                        color: "#333",
                        textAlign: "center",
                        fontFamily: "'Press Start 2P','DotGothic16', system-ui",
                        boxSizing: "border-box"
                })
                sentenceDisplay.innerText = "[  ]";
                container.appendChild(sentenceDisplay);
        }

        const q = document.createElement("div");
        q.innerText = question;
        Object.assign(q.style, {
                fontSize: "36px",
                fontWeight : "bold",
                color: "white",
                marginBottom: "10px"
        });
        container.appendChild(q);

        const opts = document.createElement("div");
        Object.assign(opts.style, {
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "30px",
                width: "90%",
                maxWidth: "800px",
        });

        const itemsToShow = (mode === "craft") ? vocabulary : options;

        itemsToShow.forEach((opt, index) => {
                const card = document.createElement("div");
                Object.assign(card.style, {
                        display:"flex",
                        flexDirection: "column",
                        position: "relative",
                        cursor: "pointer",
                        transition: "transform 0.2s ease",
                        textAlign: "center"
                });
                card.onmouseover = () => {
                        card.style.transform = "scale(1.08)";
                }
                card.onmouseout = () => {
                        card.style.transform = "scale(1)";
                }

                if(mode === "quiz" && opt.img) {
                        const img = document.createElement("img");
                        img.src = opt.img;
                        Object.assign(img.style, {
                                width: "180px", height: "120px",
                                objectFit: "cover",
                                border: "5px solid white",
                                borderRadius: "15px",
                                backgroundColor: "white",
                        });
                        card.appendChild(img);
                }

                const textContent = (mode === "craft") ? opt : opt.text;
                if(textContent) {
                        const text = document.createElement("p");
                        text.innerText = textContent;
                        Object.assign(text.style, {
                                color: "#333",
                                fontSize: "20px",
                                margin: "10px",
                                padding: "10px",
                                backgroundColor: "white",
                                borderRadius: opt.img ? "0" : "15px",
                                minWidth: "180px",
                                boxSizing: "border-box",
                        });
                        card.appendChild(text);
                }

                card.onclick = () => {
                        if(mode === "quiz"){
                                if (opt.correct) {
                                        container.style.opacity = "0";
                                        setTimeout(() => {
                                                container.remove();
                                                onAnswer(opt.correct);
                                        }, 500);
                                } else {
                                        playSound(4);
                                        card.classList.add("shake");
                                        card.style.pointerEvents = "none";
                                        card.style.cursor = "not-allowed";

                                        const overlay = document.createElement("div");
                                        Object.assign(overlay.style, {
                                                position: "absolute", top: "0", left: "0",
                                                width: "100%", height: "100%",
                                                backgroundColor: "rgba(40, 0, 0, 0.6)",
                                                borderRadius: "15px",
                                                display: "flex", alignItems: "center", justifyContent: "center"
                                        });

                                        const xMark = document.createElement("div");
                                        xMark.innerText = "×";
                                        Object.assign(xMark.style, {
                                                fontSize: "80px", color: "#ff4d4d",
                                        });

                                        overlay.appendChild(xMark);
                                        card.appendChild(overlay);
                                        setTimeout(() => {
                                                card.classList.remove("shake");
                                        }, 500);
                                }
                        } else if (mode === "craft") {
                                playSound(2);
                                currentSentence += (currentSentence ? " " : "") + opt;
                                sentenceDisplay.innerText = `[ ${currentSentence} ]`
                        }
                };
                opts.appendChild(card);
        });
        container.appendChild(opts);
        
        if (mode === "craft") {
                const actionButtons = document.createElement("div");
                Object.assign(actionButtons.style , {
                        display: "flex",
                        gap :"20px",
                        marginTop: "25px"
                });

                const createButton = (text, onClick) => {
                        const btn = document.createElement("button");
                        btn.innerText = text;
                        Object.assign(btn.style, {
                                padding: "12px    25px",
                                fontFamily: "'Press Start 2P','DotGothic16', system-ui",
                                fontSize: "16px",
                                color: "white",
                                backgroundColor: "#3498db",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "background-color 0.2s"
                        })
                        btn.onmouseover = () => { btn.style.backgroundColor = "#2980b9"};
                        btn.onmouseout = () => {btn.style.backgroundColor = "#3497db"};
                        btn.onclick = onClick;
                        return btn;
                };
                
                const completeButton = createButton("Bon!", () => {
                        const isCorrect = correctAnswers.includes(currentSentence.trim());

                        if (isCorrect) {
                                lastCraftedSentence = currentSentence.trim();
                                container.style.opacity = "0";
                                setTimeout(() => {
                                        container.remove();
                                        if(onAnswer) onAnswer(true);
                                }, 500);
                        } else {
                                playSound(4);

                                if(sentenceDisplay) {
                                        sentenceDisplay.classList.add("shake");
                                        setTimeout(() => {
                                                sentenceDisplay.classList.remove("shake");
                                        }, 500)
                                }
                        }
                });

                const backspaceButton = createButton("Iebon!", () => {
                        let words = currentSentence.split(" ").filter(w => w);
                        words.pop();
                        currentSentence = words.join(" ");
                        sentenceDisplay.innerText = currentSentence ? `[ ${currentSentence} ]` : "[  ]";
                });

                actionButtons.appendChild(backspaceButton);
                actionButtons.appendChild(completeButton);
                container.appendChild(actionButtons);
        }

        document.body.appendChild(container);
}

// function drawTextRPG(textObj, callback) {
//         const content = textObj.content ?? "";
//         const highlights = textObj.highlights ?? [];

//         // if(!textObj) {
//         //         if (typeof callback === "function") callback();
//         //         return;
//         // }
//         // const content = textObj.content ?? "";
//         // const interval = textObj.interval ?? 50;

//         // if (typingTimer) {
//         //         clearTimeout(typingTimer);
//         //         typingTimer = null;
//         // }
//         textProgress = 0;

//         // playTypeSound();

//         function step() {
//                 playTypeSound();
//                 textProgress++;

//                 context.font = `${textObj.weight ?? 400} ${textObj.size ?? canvas.height * 0.05}px ${textObj.font ?? "'Press Start 2P', system-ui"}`;
//                 context.textAlign = textObj.align ?? "center";
//                 context.textBaseline = textObj.baseline ?? "middle";

//                 const textX = canvas.width / 2;
//                 const textY = canvas.height - 40;
                

//                 let x = textX - context.measureText(content.slice(0, textProgress)).width/2;
//                 for(let i = 0; i < textProgress; i++) {
//                         const char = content[i];
//                         const hl = highlights.find(h => i >= h.start && i < h.end);

//                         if(hl) {
//                                 context.fillStyle = hl.color ?? "red";
//                                 if(hl.background) {
//                                         const w = context.measureText(char).width;
//                                         context.fillRect(x, textY - textObj.size / 2, w, textObj.size);
//                                 }
//                         } else {
//                                 context.fillStyle = "black";
//                         }
//                         context.fillText(char, x, textY);
//                         x += context.measureText(char).width;
//                 }

//                 if (textProgress < content.length) {
//                         typingTimer = setTimeout(step, textObj.interval ?? 50);
//                 } else {
//                         isTyping = false;
//                         stopTypeSound();
//                         typingTimer = null;
//                         if (typeof callback === "function") callback();
//                 }
//         //         playTypeSound();
//         //         if(textProgress < content.length) {
//         //                 typingTimer = setTimeout(step, interval);
//         //         } else {
//         //                 isTyping = false;
//         //                 stopTypeSound();
//         //                 typingTimer = null;
//         //                 if (typeof callback === "function") callback();
//         //         }
//         }

//         step();
// }

function drawTextRPG(textObj, callback) {
        if (typingTimer) clearTimeout(typingTimer);
        isTyping = true;
        isSceneLocked = true;
        textProgress = 0;

        function step() {
                textProgress++;
                playTypeSound();
                if(textProgress < textObj.content.length) {
                        typingTimer = setTimeout(step, textObj.interval ?? 50);
                } else {
                        isTyping = false;
                        typingTimer = null;
                        isSceneLocked = false;
                        if(typeof callback === "function") callback();
                }
        }

        step();
}

let wordbookData = [];

function answerCorrect(wordData) {
        playSound(3);
        if(!wordbookData.some(item => item.word === wordData.word)) {
                wordbookData.push(wordData);
        }

        let book = document.getElementById("wordbook");
        if (!book){
                book = document.createElement("div");
                book.id = "wordbook";
                Object.assign(book.style, {
                        position: "fixed",
                        top: "10px",
                        left: "10px",
                        width: "50px",
                        height: "50px",
                        backgroundImage: "url('images/book.png')",
                        backgroundSize: "contain",
                        cursor: "pointer"
                });
                document.body.appendChild(book);
                book.onclick = () => showWordBook();
        }
        const word = document.createElement("div");
        word.innerText = wordData.word;

        Object.assign(word.style, {
                position:"fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) scale(1.2)",
                fontFamily: "'Press Start 2P', system-ui",
                fontSize: "36px",
                color: "#000000ff",
                zIndex: "1001",
                transition: "all 1s cubic-bezier(0.55, 0.085, 0.68, 0.53)"
        });

        document.body.appendChild(word);

        setTimeout(() => {
                const bookRect = book.getBoundingClientRect();
                const endX = bookRect.left + bookRect.width  / 2;
                const endY = bookRect.top + bookRect.height / 2;

                word.style.top = `${endY}px`;
                word.style.left = `${endX}px`;
                word.style.transform = "translate(-50%,-50%) scale(0)";
                word.style.opacity = "0.5";
        }, 50);
        setTimeout(() => word.remove(), 1200);
}

// function answerWrong(){
//         playSound(4);
//         const overLay = document.createElement("div");
//         Object.assign(overlay.style, {
//                 position: "fixed",
//                 top: "0",
//                 left: "0",
//                 width: "100%",
//                 height: "100%",
//                 backgroundColor: "rgba(255, 50, 50, 0.7)",
//                 zIndex: 2000,
//                 animation: "flash-out 0.4s ease-in-out forwards"
//         });

//         const style = document.createElement("style");
//         style.innerHTML = `
//         @keyframes flash-out {
//         0% {opacity: 1;}
//         100% {opacity: 0;}
//         }`;

//         document.head.appendChild(style);
//         document.body.appendChild(overlay);

//         setTimeout(() => {
//                 overlay.remove();
//                 style.remove();
//                 showScene(currentSceneIndex);
//         }, 500)
// }


function showWordBook(){
        const old = document.getElementById("wordbook-overlay");
        if(old) return;

        const overlay = document.createElement("div");
        overlay.id = "wordbook-overlay";
        Object.assign(overlay.style, {
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                backgroundColor: "rgba(0,0,0,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: "2000", opacity: "0", transition: "opacity 0.3s ease-in-out",
                padding: "20px", boxSizing: "border-box"
        });

        const panel = document.createElement("div");
        Object.assign(panel.style, {
                width: "90%", maxWidth: "600px", height: "90%",
                backgroundColor: "rgba(10, 10, 10, 0.7)",
                border: "5px solid white",
                borderRadius: "15px",
                display: "flex", flexDirection: "column",
                padding: "25px",
                fontFamily: "'Press Start 2P', system-ui",
                transform: "scale(0.95)", transition: "transform 0.3s ease-in-out",
                boxSizing: "border-box"
        })

        const listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
                flex: "1",
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "20px",
                padding:"10px",
        });

        if(wordbookData.length === 0) {
                const emptyMessage = document.createElement("p");
                emptyMessage.innerText = "Ie petao...";
                Object.assign(emptyMessage.style, {color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: "50px"});
                listContainer.appendChild(emptyMessage);
        } else {
                wordbookData.forEach(item => {
                        const entry = document.createElement("div");
                        Object.assign(entry.style, {
                                display: "flex",
                                flexDirection: "column",
                                aspectRatio: "3 / 4",
                                backgroundColor: "rgba(255,255,255,0.3)",
                                borderRadius: "8px",
                                padding: "10px",
                                boxSizing: "border-box",
                                overflow: "hidden",
                        });

                        const img = document.createElement("img");
                        img.src = item.img;
                        Object.assign(img.style, {
                                width: "100%",
                                height: "75%",
                                objectFit: "cover",
                                borderRadius: "5px",
                                marginBottom: "auto",
                        });

                        const wordText = document.createElement("p");
                        wordText.innerText = `${item.word}`;
                        Object.assign(wordText.style, {
                                color: "white",
                                fontSize: "16px",
                                margin: "0",
                                textAlign: "center",
                                paddingTop: "10px",
                                height: "25%",
                        });

                        entry.appendChild(img);
                        entry.appendChild(wordText);
                        listContainer.appendChild(entry);
                });

        }

        const closeButton = document.createElement("button");
        closeButton.innerText = "ie";
        Object.assign(closeButton.style, {
                marginTop: "20px", padding: "10px 20px",
                fontFamily: "'Press Start 2P', system-ui",
                fontSize: "16px",
                color: "#2c3e50", backgroundColor: "#f1c40f",
                border: "none", borderRadius: "5px", cursor: "pointer",
                alignSelf: "center",
        })

        const closeWordBook = () => {
                overlay.style.opacity = "0";
                panel.style.transform = "scale(0.9)";
                setTimeout(() => overlay.remove(), 300);
        }

        closeButton.onclick = closeWordBook;

        overlay.onclick = (e) => {
                if(e.target === overlay) closeWordBook();
        }

        panel.appendChild(listContainer);
        panel.appendChild(closeButton);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        setTimeout(() => {
                overlay.style.opacity = "1";
                panel.style.transform = "scale(1)";
        }, 10);
}

function drawArrow() {
        const size = canvas.width / 100;
        const x = canvas.width - canvas.width * 0.1;
        const yBase = canvas.height - canvas.height * 0.1;
        const offset = Math.sin(Date.now() / 200) * 3;
        context.fillStyle = "black";

        context.beginPath();
        context.moveTo(x, yBase + offset);
        context.lineTo(x - size, yBase - size + offset);
        context.lineTo(x + size, yBase - size + offset);
        context.closePath();
        context.fill(); 
}

function waitMovingAndShowText(textObj) {
    const check = () => {
        const moving = currentChars.some(c => imageState[c.img].moving);
        if(moving) {
                requestAnimationFrame(check);
        } else {
                drawTextRPG(textObj);
        }
    };
    check();
}

function resizeHandle(){
        resizeCanvas();
        for (let i = 0; i < imageState.length; i++) {
                const state = imageState[i];
                if (state.xP !== null) {
                        state.x = canvas.width * state.xP / 100;
                        state.y = canvas.height * state.yP / 100;
                        if (state.destXP !== null) {
                                state.destX = canvas.width * state.destXP / 100;
                                state.destY = canvas.height * state.destYP / 100;
                        }
                }
        }
}
function handleStoryClick() {
        const moving = currentChars.some(c => imageState[c.img].moving);
        if(isSceneLocked||moving) return;
        
        if(currentScene?.clickable === false) return;
                if(isTyping){
                        textProgress = currentScene.text.content.length;
                        if(typingTimer) clearTimeout(typingTimer);
                        typingTimer = null;
                        setTimeout(() => {isTyping = false;}, 50);
                } else {
                        playSound(2);
                        nextScene();
                }
}

// function StoryClick() {
//         const rect = canvas.getBoundingClientRect();
//         const clickX = event.clientX - rect.left;
//         const clickY = event.clientY - rect.top;

//         console.log(`Map clicked at: ${clickX}, ${clickY}`)
// }

function updateMapPlayer() {
        let moving = false;
        let nextX = mapPlayer.xP;
        let nextY = mapPlayer.yP;

        if (keyPressed["arrowup"] || keyPressed["w"]) {
                nextY -= mapPlayer.speedP;
                moving = true;
        }
        if (keyPressed["arrowdown"] || keyPressed["s"]) {
                nextY += mapPlayer.speedP;
                moving = true;
        }
        if (keyPressed["arrowleft"] || keyPressed["a"]) {
                nextX -= mapPlayer.speedP;
                moving = true;
                lastDirection = 'left';
        }
        if (keyPressed["arrowright"] || keyPressed["d"]) {
                nextX += mapPlayer.speedP;
                moving = true;
                lastDirection = 'right';
        }

        const collisionResult = buildingButsukari(nextX, nextY);

        if (!collisionResult.moveBlocked) {
                mapPlayer.xP = nextX;
                mapPlayer.yP = nextY;
        }

        currentEnterableLocation = collisionResult.enterableLocation;
        if (previousEnterableLocation !== currentEnterableLocation) {
                if (currentEnterableLocation !== null) {
                playSound(7);
                }
        }
        previousEnterableLocation = currentEnterableLocation;
        
        if (moving && !collisionResult.moveBlocked) {
                animationFrame++;
                if (animationFrame >= mapPlayer.animation.length * animationSpeed) {
                animationFrame = 0;
                }
                const currentAnimIndex = Math.floor(animationFrame / animationSpeed);
                mapPlayer.img = mapPlayer.animation[currentAnimIndex];

                if (!isWalkingSoundPlayingOnMap) {
                playSound(15, { type: 'walk', loop: true });
                isWalkingSoundPlayingOnMap = true;
                }
        } else {
                animationFrame = 0;
                mapPlayer.img = mapPlayer.standingImg;
                if (isWalkingSoundPlayingOnMap) {
                stopSoundType('walk');
                isWalkingSoundPlayingOnMap = false;
                }
        }

        mapPlayer.xP = Math.max(0, Math.min(100 - mapPlayer.wP, mapPlayer.xP));
        mapPlayer.yP = Math.max(0, Math.min(100 - mapPlayer.hP, mapPlayer.yP));
        checkPetyakutya();
}


function buildingButsukari(checkXP, checkYP) {
        let moveBlocked = false;
        let foundEnterableLocation = null;

        const playerPosition = toPx(checkXP, checkYP);
        const playerState = imageState[mapPlayer.standingImg];
        const playerW = playerState.w;
        const playerH = playerState.h;

        const playerHitbox = {
                x: playerPosition.x - (playerW * 0.2),
                y: playerPosition.y - (playerH * 0.2),
                w: playerW * 0.4,
                h: playerH * 0.2
        };

        for (const location of mapLocations) {
                const locationPosition = toPx(location.xP, location.yP);
                const locationState = imageState[location.img];
                const locationW = locationState.w;
                const locationH = locationState.h;

                const locationHitbox = {
                        x: locationPosition.x,
                        y: locationPosition.y,
                        w: locationW,
                        h: locationH
                };

                if(isOverlapping(playerHitbox, locationHitbox)) {
                        foundEnterableLocation = location;
                }

                // const collisionHitBox = {
                //         x: locationPosition.x + locationW * 0.1,
                //         y: locationPosition.y + locationH * 0.6,
                //         w: locationW * 0.8,
                //         h: locationH * 0.4
                // }

                // if(isOverlapping(playerHitbox, collisionHitBox)) {
                //         moveBlocked = true;
                // }

        }

        return { moveBlocked, enterableLocation: foundEnterableLocation };
}

function isOverlapping(boxA, boxB) {
        return(
                boxA.x < boxB.x + boxB.w && boxA.x + boxA.w > boxB.x && 
                boxA.y < boxB.y + boxB.h && boxA.y + boxA.h > boxB.y
        );
}

function checkPetyakutya() {
        if(mission2 == "issued") return;

        const playerPosition = toPx(mapPlayer.xP, mapPlayer.yP);

        soundSpot.forEach(spot => {
                const spotPosition = toPx(spot.xP, spot.yP);
                const radiusPx = canvas.width * spot.radiusP / 100;

                const dx = playerPosition.x - spotPosition.x;
                const dy = playerPosition.y - spotPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if(distance <= radiusPx) {
                        if(!spot.hasPlayed) {
                                playSound(spot.soundId);
                                spot.hasPlayed = true;
                        }
                } else {
                        spot.hasPlayed = false;
                }
        })
}

canvas.addEventListener("click", (event) => {
        if(gameState === "story") {
                handleStoryClick();
        } else if (gameState === "map") {
                handleMapClick(event);
        }
})

let spacePressCount =0;
let spacePressTimer = null;

window.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
                event.preventDefault();

                if (gameState === "story") {
                        spacePressCount++;

                        clearTimeout(spacePressTimer);
                        if (spacePressCount >= 3) {

                                const targetIndex = Math.min(scenes.length - 1, currentSceneIndex + 5);
                                showScene(targetIndex);
                                
                                spacePressCount = 0;
                        } else {
                                handleStoryClick();
                        }

                        spacePressTimer = setTimeout(() => {
                                spacePressCount = 0;
                        }, 300);
                        
                } else if (gameState === "map") {
                // if (currentEnterableLocation) {
                //         let targetScene;

                //         if (typeof currentEnterableLocation.entryScene === 'function') {
                //                 targetScene = currentEnterableLocation.entryScene();
                //         } else {
                //                 targetScene = currentEnterableLocation.entryScene;
                //         }

                //         playSound(2);
                //         stopSoundType("bgm");
                //         if (isWalkingSoundPlayingOnMap) {
                //                 stopSoundType("walk");
                //                 isWalkingSoundPlayingOnMap = false;
                //         }
                //         gameState = "story";
                //         showScene(targetScene);
                //         currentEnterableLocation = null;
                //         }
                // }

                handleMapEntry();
        }
}});

function showIcon() {
        if(mission1 == "issued") {
                drawImage(19, 5, 5, 5);
        }
        if(mission0 == "issued") {
                drawImage(19, 5, 5, 5);
        }
        if(mission2 == "issued") {
                drawImage(19, 5, 5, 5);
        }
        if(haveTiyao == true) {
                drawImage(18, 10, 5, 5);
        }
}



resizeHandle();
window.addEventListener("resize", resizeHandle);

window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keyPressed[key] = true;

        if(gameState === "map") {
                if(key === "enter" && currentEnterableLocation) {
                        handleMapEntry();
                }

                if(["arrowup", "w", "arrowdown", "s", "arrowleft","a", "arrowright", "d"].includes(key)){
                        if(!isWalkingSoundPlayingOnMap){
                                playSound(1, {type: "walk", loop: true});
                                isWalkingSoundPlayingOnMap = true;
                        }
                }
        }
});

window.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        keyPressed[key] = false;

        if(gameState === "map"){
                const isAnyMoveKeyPressed =
                keyPressed["arrowup"] || keyPressed["w"] ||
                keyPressed["arrowdown"] || keyPressed["s"] ||
                keyPressed["arrowleft"] || keyPressed["a"] ||
                keyPressed["arrowright"] || keyPressed["d"];

                if (!isAnyMoveKeyPressed && isWalkingSoundPlayingOnMap) {
                        stopSoundType("walk");
                        isWalkingSoundPlayingOnMap = false;
                } 
        }
})