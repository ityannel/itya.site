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

async function init(){
        await Promise.all([
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
                loadSound(1000, 'sounds/intropop.mp3'),
                loadSound(1001, 'sounds/birds.m4a'),
                loadSound(1002, 'sounds/map.mp3'),
                loadSound(1003, 'sounds/mokuno.mp3'),
                loadSound(1004, 'sounds/ikukan.mp3'),
                loadSound(1005, 'sounds/oi.mp3'),

                loadSound(0, 'sounds/piko2.mp3'),
                loadSound(1, 'sounds/walk.mp3'),
                loadSound(2, 'sounds/pon.mp3'),
                loadSound(3, 'sounds/jan.mp3'),
                loadSound(4, 'sounds/boon.mp3'),
                loadSound(5, 'sounds/petyataka.mp3'),
                loadSound(6, 'sounds/petyahiku.mp3'),
                loadSound(7, 'sounds/peta.mp3'),
                loadSound(8, 'sounds/ryori1.mp3'),
                loadSound(9, 'sounds/ryori2.mp3'),
                loadSound(10, 'sounds/ryori3.mp3'),
                loadSound(11, 'sounds/ryori4.mp3'),
                loadSound(12, 'sounds/ryori5.mp3'),
                loadSound(13, 'sounds/ryori6.mp3'),
                loadSound(14, 'sounds/walkAspha.mp3'),
                loadSound(15, 'sounds/tiyao.mp3'),
                loadSound(16, 'sounds/welcome.mp3'),
                loadSound(17, 'sounds/ryori21.mp3'),
                loadSound(18, 'sounds/ryori22.mp3'),
                loadSound(19, 'sounds/ryori23.mp3'),
                loadSound(20, 'sounds/kirari-n.mp3'),
                loadSound(21, 'sounds/seiko.mp3'),
                loadSound(22, 'sounds/bu.mp3'),
                loadSound(23, 'sounds/walkIshi.mp3'),
                loadSound(24, 'sounds/ga-ga-ga.mp3'),
        ]);

        sound[1001].volume = 0.3;

        soundReady = true;

        gameLoop();

        // currentScene = scenes[currentSceneIndex];

        // setChar(currentScene.char ?? []);

        // if (currentScene.action) {
        //     currentScene.action(nextScene);
        // }
        showScene(0);
// //↘Made by ChatGPT
//     function createDebugUI() {
//         const debugUI = document.createElement("div");
//         debugUI.id = "debug-ui";
//         debugUI.style.position = "fixed";
//         debugUI.style.top = "10px";
//         debugUI.style.right = "10px";
//         debugUI.style.padding = "10px 15px";
//         debugUI.style.background = "rgba(0, 0, 0, 0.6)";
//         debugUI.style.color = "#fff";
//         debugUI.style.fontFamily = "monospace";
//         debugUI.style.borderRadius = "12px";
//         debugUI.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
//         debugUI.style.zIndex = "9999";
//         debugUI.style.textAlign = "center";
//         debugUI.style.minWidth = "150px";
//         const sceneLabel = document.createElement("div");
//         sceneLabel.id = "scene-label";
//         sceneLabel.style.fontSize = "16px";
//         sceneLabel.style.marginBottom = "8px";
//         sceneLabel.innerText = `Scene: ${currentSceneIndex}`;
//         debugUI.appendChild(sceneLabel);

//   // スライダー
//         const slider = document.createElement("input");
//         slider.type = "range";
//         slider.min = 0;
//         slider.max = scenes.length - 1;
//         slider.value = currentSceneIndex;
//         slider.style.width = "100%";
//         slider.oninput = (e) => {
//             const index = parseInt(e.target.value, 10);
//             showScene(index);
//             updateDebugUI();
//         };
//         debugUI.appendChild(slider);

//   // 次/前 ボタン
//         const btnPrev = document.createElement("button");
//         btnPrev.innerText = "◀ Prev";
//         btnPrev.style.margin = "5px";
//         btnPrev.style.padding = "5px 10px";
//         btnPrev.style.borderRadius = "8px";
//         btnPrev.style.border = "none";
//         btnPrev.style.cursor = "pointer";
//         btnPrev.style.background = "#444";
//         btnPrev.style.color = "#fff";
//         btnPrev.onclick = () => {
//             showScene(Math.max(0, currentSceneIndex - 1));
//             updateDebugUI();
//         };
//         debugUI.appendChild(btnPrev);

//         const btnNext = document.createElement("button");
//         btnNext.innerText = "Next ▶";
//         btnNext.style.margin = "5px";
//         btnNext.style.padding = "5px 10px";
//         btnNext.style.borderRadius = "8px";
//         btnNext.style.border = "none";
//         btnNext.style.cursor = "pointer";
//         btnNext.style.background = "#444";
//         btnNext.style.color = "#fff";
//         btnNext.onclick = () => {
//             showScene(Math.min(scenes.length - 1, currentSceneIndex + 1));
//             updateDebugUI();
//         };
//         debugUI.appendChild(btnNext);

//         document.body.appendChild(debugUI);
//     }

//     createDebugUI();
    loop();

}


init();
