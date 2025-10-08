/*
1. 明転....若者が森の中で目覚める
2.  若者says「.....?」
3. someone walk from the forest ... 若者says 「....!!」
4. someone was a 老人 老人says「?hate yu un sunya」
5. 若者 says 「×●■×※БГΖ」
6. 老人 says「?hate, hate yu iepetan i-tya」
7. 若者 says　「Γ侃※§λ!!」
8. 老人 says 「ten hapo, tame」
9. 老人 says 「!hapo」
10. 老人 says 「und yu yanya ietend petan i-tya!」
11. -タイトル表示、 hate itya!-*/

const scenes = [
        {
                scene: 0,
                bg: 1000,
                char: null,
                text: null,
                action: () => {
                }
        },
        {
                scene: 1,
                bg: 1002,
                bgm: 1001,
                char: [{char:"mc", img:1, xP:28, yP:56}],
                text: null,
                clickable: false,
                action: () => {
                        fadeIn(5000, () => {
                                setTimeout(() => nextScene(), 1000);
                        })
                }
        },
        {
                scene: 2,
                bg: 1002,
                char: [{char:"mc"}],
                text: { content: "......?" },
                action: () => {}
        },
        {
                scene: 3,
                bg: 1002,
                char: [
                        {char:"mc"},
                        {char: "te", img: 5, xP: 100, yP: 56}
                ],
                text: null,
                clickable: false,
                action: () => {
                        setDest("te", 50, 56, 1, "grass", () => {
                                setTimeout(() =>{
                                        nextScene();
                                }, 1000);
                        });
                }
        },
        {
                scene: 4,
                bg: 1002,
                char: [{char:"mc"},
                        { char: "te"}],
                text: { content: "Hate yu un sunya?", char: "te"},
                action: () => {}
        },
        {
                scene: 5,
                bg: 1002,
                char: [{char:"mc", img: 0},
                        { char: "te"}],
                text: {content: "Γ侃※●■Δ!!"},
                action: () => {}
        },
        {
                scene: 6,
                bg: 1002,
                char: [{char:"mc"},
                        { char: "te"}],
                text: {content: "Ten hapo,tame", char: "te"},
                hl: {start: 4, end: 7},
                action: () => {}
        },
        {
                scene: 7,
                bg: 1002,
                char: [{char:"mc", img:11},
                        { char: "te"}],
                text: null,
                action: () => {}
        },
        {
                scene: 8,
                bg: 1002,
                char: [{char:"mc"},
                        { char: "te"}],
                text: {content: "Ha...... po.......", char: "te"},
                action: () => {}
        },
        {
                scene: 9,
                bg: 1002,
                bgm: 1000,
                char: [{char:"mc"}, { char: "te"}],
                text: null,
                clickable: false,
                action: () => {
                        setDest("te", 100, 56, 1, "grass", () => {
                                setDest("mc", 100, 56, 1, "grass", () => {
                                        sound.currentTime = 0;
                                        setTimeout(() => nextScene(), 2000);
                                })
                        });
                }
        },
        {
                scene: 10,
                bg: 1001,
                bgm: 1000,
                char: [],
                text: null,
                action: () => {
                        crossfade(5000)
                }
        },
        {
                scene: 11,
                bg: 1003,
                bgm: null,
                char: [{char:"mc", img: 2, xP: 0, yP: 56},
                        {char:"te", img: 5, xP: 0, yP: 46}],
                text: null,
                action: () => {
                        fadeIn(2000);
                        setDest("te", 50, 46, 1, "grass");
                        setDest("mc", 40, 56, 0.8, "grass");
                }
        },
        {
                scene: 12,
                bg: 1003,
                char: [{char:"mc", img: 0},
                        {char:"te"}],
                text: {content: "Ge un hapo!", char: "te"},
                action: () => {}
        },
        {
                scene: 13,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "hapo",
                                options: [
                                        {img: "images/riv.jpg", correct: false},
                                        {img: "images/mou.jpg", correct: false},
                                        {img: "images/vil.jpg", correct: true}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                answerCorrect({
                                                        word: "hapo",
                                                        img: "images/vil.jpg"
                                                });
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene: 14,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te", img: "6"}],
                text: {content: "Oi!", char: "te"},
                action: () => {}
        },
        {
                scene: 15,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te"}],
                text: {content: 'Yu shin "hapo".', char: "te"},
                action: () => {}
        },
        {
                scene: 16,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te", img: "5"}],
                text: {content: "Mi ieshin hate yu un hoo...?", char: "te"},
                action: () => {}
        },
        {
                scene: 17,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te"}],
                text: {content: "Shin i-tya.", char: "te"},
                action: () => {}
        },
        {
                scene: 18,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te", img:"7"}],
                text: {content: "Lanya petan tend waleo.", char: "te"},
                action: () => {}
        },
        {
                scene: 19,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "petan...",
                                options: [
                                        {text: "Ie...", correct: false},
                                        {text: "Oi!", correct: true},
                                        {text: "Okay", correct: false}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene: 20,
                bg: 1003,
                char: [{char:"mc", img: "2"},
                        {char:"te", img:"5"}],
                text: {content: "Oi!"},
                clickable: false,
                action: () => {
                        setTimeout(() => {
                                nextScene();
                        }, 1000);
                }
        },
        {
                scene: 21,
                bg: 1003,
                char: [{char:"mc", img: "0"},
                        {char:"te", img:"6"}],
                text: null,
                action: () => {}
        },
        {
                scene: 22,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te", img:"5"}],
                text: {content: "Ba, mokun.", char:"te"},
                action: () => {}
        },
        {
                scene: 23,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te", img:"5"}],
                text: {content: "Ten mokuno und mokun!", char:"te"},
                action: () => {}
        },
        {
                scene:24,
                bg: 1003,
                char:[
                        {char: "mc"},
                        {char:"te", img: "7"}
                ],
                text: {content: "Aisklitt...mokun aisklitt", char: "te"},
                action: () => {}
        },
        {
                scene:25,
                bg: 1003,
                char:[
                        {char: "mc"},
                        {char:"te", img: "6"}
                ],
                text: {content: "Ge un yanya😁", char: "te"},
                action: () => {}
        },
        {
                scene: 26,
                bg: 1003,
                char: [{char:"mc"},
                        {char:"te", img: "5"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "ten...",
                                options: [
                                        {text: "aisklitt", correct: true},
                                        {text: "hapo", correct: false},
                                        {text: "oi!", correct: false}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:27,
                bg: 1003,
                char:[
                        {char: "mc", img: "2"},
                        {char:"te", img:"5"}
                ],
                text: {content: "Ten aisklitt!"},
                clickable: false,
                action: () => {
                        setTimeout(() => {
                                nextScene();
                        }, 1000);
                }
        },
        {
                scene:28,
                bg: 1003,
                char:[
                        {char: "mc", img: "0"},
                        {char:"te", img:"6"}
                ],
                text: null,
                action: () => {}
        },
        {
                scene:29,
                bg: 1003,
                char:[
                        {char: "mc", img: "0"},
                        {char:"te", img:"5"}
                ],
                text: {content: "Zipo, ten aisklitt...!", char:"te"},
                action: () => {
                        mission0 = "issued";
                        playSound(20);
                }
        },
        {
                scene:30,
                bg: 1003,
                char:[
                        {char: "mc"},
                        {char:"te"}
                ],
                text: null,
                clickable: false,
                action: () => {
                        setDest("te", 40, 46, 1.2, "grass", () => {
                                setDest("te", 40, -20, 1.2, "grass",() => setTimeout(() => nextScene(), 2000))
                        })
                }
        },
        {
                scene:31,
                bg: 1003,
                char:[
                        {char: "mc", img:"3"}
                ],
                text: {content: "(mi, ten, aisklitt...)"},
                action: () => {
                }
        },
        {
                scene:32,
                bg: 1003,
                char:[
                        {char: "mc"}
                ],
                text: null,
                clickable: false,
                action: () => {
                        startLoading(() =>{
                                stopSoundType("bgm");
                                playSound(1002, {type: "bgm", loop: true});
                                gameState = "map";
                                mapPlayer.xP = 30;
                                mapPlayer.yP = 85;
                        });
                }
        },
        //ここからレストランですよ
        {
                scene:33,
                bg: 1005,
                char:[
                        {char: "mc", img: 2, xP: 0, yP: 60}
                ],
                text: null,
                clickable: false,
                action: () => {
                        startLoading(() => {
                                setDest("mc", 40, 60, 1, "floor",() =>{
                                        setTimeout(() => {nextScene()}, 2000);
                                })
                        })
                }
        },
        {
                scene:34,
                bg: 1005,
                char:[
                        {char: "mc", img: "0"}
                ],
                text: {content: "......"},
                action: () => {
                }
        },
        {
                scene:35,
                bg: 1005,
                char:[
                        {char: "mc", img: "2"}
                ],
                text: {content: "...O-----i!"},
                action: () => {
                }
        },
        {
                scene:36,
                bg: 1005,
                char:[
                        {char: "mc", img: "2"},
                        {char: "cf", img: "8", xP: 100, yP: 60}
                ],
                text: null,
                clickable: false,
                action: () => {
                        setDest("cf", 55, 60, 1, "floor", () => {
                                setTimeout(() => nextScene(), 1000)
                                mission0 = "completed";
                                playSound(21);
                        });
                }
        },
        {
                scene:37,
                bg: 1005,
                char:[
                        {char: "mc", img: "0"},{char:"cf"}
                ],
                text: {content: "Hate? Mi iezin yu ge zip d.", char: "cf"},
                action: () => {}
        },{
                scene:38,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: "15"}
                ],
                text: {content: "Ba, hate yu mokun haa?", char: "cf"},
                action: () => {}
        },
        {
                scene: 39,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "mokun...",
                                options: [
                                        {text: "aisklitt", correct: true},
                                        {text: "haksuitt", correct: false},
                                        {text: "mokuno", correct: false}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:40,
                bg: 1005,
                char:[
                        {char: "mc", img: "2"},{char:"cf", img: "10"}
                ],
                text: {content: "Mi mokun aisklitt!!"},
                action: () => {}
        },
        {
                scene:41,
                bg: 1005,
                char:[
                        {char: "mc", img: "0"},{char:"cf", img: "9"}
                ],
                text: {content: "Aisklitt..😂", char: "cf"},
                action: () => {}
        },
        {
                scene:42,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: "15"}
                ],
                text: {content: "Mi bon ge, oon", char: "cf"},
                action: () => {
                }
        },
        {
                scene:43,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"}
                ],
                text: null,
                clickable: false,
                action: () => {
                        setDest("cf", 100, 60, 1, "floor", () => {
                                nextScene();
                        });
                }
        },
        {
                scene:44,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"}
                ],
                text: null,
                clickable: false,

                //ここからした恥ずかしいので見ないでください😇
                action: () => {
                        playSound(8, () =>{
                                playSound(9, () => {
                                        //playSound(10, () => {
                                                playSound(11, () => {
                                                        playSound(12, () => {
                                                                playSound(13, () => {
                                                                        nextScene();
                                                                })
                                                        })
                                                })
                                        //})
                                })
                        })
                }
        },
        {
                scene:45,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: "16"}
                ],
                text: null,
                clickable: false,
                action: () => {
                        setDest("cf", 60, 60, 1, "floor", () => {
                                nextScene();
                        });
                }
        },
        {
                scene:46,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"}
                ],
                text: {content:"Aisklitt! Mokun!", char:"cf"},
                action: () => {
                }
        },
        {
                scene: 47,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Aisklitt",
                                options: [
                                        {img: "images/Ramett.jpg", correct: false},
                                        {img: "images/Aisklitt.jpg", correct: true},
                                        {img: "images/yanya.jpg", correct: false}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                answerCorrect({
                                                        word: "aisklitt",
                                                        img: "images/Aisklitt.jpg"
                                                });
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },

        {
                scene:48,
                bg: 1005,
                char:[
                        {char: "mc", img:"4"},{char:"cf", img:"8"}
                ],
                clickable: false,
                text: {content:"Oi! Aisklitt!"},
                action: () => {
                        setTimeout(() => nextScene(), 2000);
                }
        },
        {
                scene:49,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"10"}
                ],
                text: null,
                action: () => {
                }
        },
        {
                scene:50,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"9"}
                ],
                text: {content: "Yanya?", char:"cf"},
                action: () => {
                }
        },
        {
                scene:51,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"}
                ],
                text: {content: "Bi, tiyao.", char:"cf"},
                action: () => {
                }
        },
        
        {
                scene:52,
                bg: 1005,
                char:[
                        {char: "mc", img:"11"},{char:"cf"}
                ],
                text: {content: "....?"},
                action: () => {
                }
        },
        {
                scene: 53,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Tiyao",
                                options: [
                                        {img: "images/pikano.jpg", correct: false},
                                        {img: "images/Yanya.jpg", correct: false},
                                        {img: "images/tiyao.jpg", correct: true}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                answerCorrect({
                                                        word: "tiyao",
                                                        img: "images/tiyao.jpg"
                                                });
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:54,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"10"}
                ],
                text: {content: "Tiyao, tiyao!", char: "cf"},
                action: () => {
                        mission1 = "issued";
                        playSound(20);
                }
        },
        {
                scene: 55,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "petan...",
                                options: [
                                        {text: "Ieoi! Mi iepon yu tiyao", correct: false},
                                        {text: "o, oi😥", correct: true},
                                        {text: "Kurosie", correct: false}
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene: 56,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: {content: "Ba, oi..."},
                action: () => {
                }
        },
        {
                scene: 57,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                action: () => {
                        startLoading(() => {
                                stopSoundType("bgm");
                                playSound(1002, {type: "bgm", loop: true});
                                gameState = "map";
                                mapPlayer.xP = 80;
                                mapPlayer.yP = 20;
                        })
                }
        },
        //以下ミッション出る前後老人の家に尋ねた時の動作
        {
                scene:58,
                bg: 1006,
                char:[
                        {char: "mc", img: "2", xP: 100, yP: 60},{char: "te", img: "5", xP: 20, yP: 45}
                ],
                text: null,
                clickable: false,
                action: () => {
                        startLoading(() => {
                                setDest("mc", 60, 60, 1, "floor", () =>{
                                        setTimeout(() => {nextScene()
                                        }, 2000);
                                })
                        })
                }
        },
        {
                scene:59,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"6"}
                ],
                text: {content: "Oi!", char:"te"},
                action: () => {
                }
        },
        {
                scene:60,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"7"}
                ],
                text: {content: "Ba, mokun aisklitt!", char:"te"},
                action: () => {
                }
        },
        {
                scene: 61,
                bg: 1006,
                char: [
                        {char: "mc"},
                        {char: "te", img: 5}
                ],
                text: {content: "Ten mokuno ba!", char: "te"},
                clickable: false,
                action: () => {
                        setTimeout(() => {
                                startLoading(() => {
                                        stopSoundType("bgm");
                                        playSound(1002, {type: "bgm", loop: true});
                                        gameState = "map";
                                        mapPlayer.xP = 30;
                                        mapPlayer.yP = 20;
                                });
                        }, 3000);
                }
        },
        //以下ミッション発出後に家に音連れた時
        {
                scene:62,
                bg: 1006,
                char:[
                        {char: "mc", img: "0", xP: 100, yP: 60},{char: "te", img: "5", xP: 20, yP: 50}
                ],
                text: null,
                clickable: false,
                action: () => {
                        startLoading(() => {
                                setDest("mc", 60, 60, 1, "floor", () =>{
                                        setTimeout(() => {nextScene()
                                        }, 2000);
                                })
                        })
                }
        },
        {
                scene:63,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"6"}
                ],
                text: {content: "Oi!", char:"te"},
                action: () => {
                }
        },
        {
                scene:64,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"5"}
                ],
                text: {content: "Ten mokuno?", char:"te"},
                action: () => {
                }
        },
        {
                scene: 65,
                bg: 1006,
                char: [{char:"mc"},
                        {char:"te"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Ten mokuno?",
                                options: [
                                        {text: "Ieoi!", correct: false},
                                        {text: "Oi!", correct: true},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:66,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"6"}
                ],
                text: {content: "Yanya!", char:"te"},
                action: () => {
                }
        },
        {
                scene:67,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"5"}
                ],
                text: {content: "Hate yu ten mi hee?", char:"te"},
                action: () => {
                }
        },
        {
                scene: 68,
                bg: 1006,
                char: [{char:"mc"},
                        {char:"te"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Hate hee?",
                                options: [
                                        {text: "Aisklitt!", correct: false},
                                        {text: "Tiyao!", correct: true},
                                        {text: "Mokuno!", correct: false},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:69,
                bg: 1006,
                char:[
                        {char: "mc", img: "3"},{char: "te", img:"7"}
                ],
                text: {content: "Tiyao!!!",},
                action: () => {
                }
        },
        {
                scene:70,
                bg: 1006,
                char:[
                        {char: "mc", img: "0"},{char: "te", img:"6"}
                ],
                text: {content: "Mi ieshin ten tiyao, oi-oi!", char:"te"},
                action: () => {
                }
        },
        {
                scene:71,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"5"}
                ],
                text: {content: "Mi ten!!", char:"te"},
                action: () => {
                        haveTiyao = true;
                        playSound(15);
                }
        },
        {
                scene:72,
                bg: 1006,
                char:[
                        {char: "mc"},{char: "te", img:"7"}
                ],
                text: {content: "Bi, ten mokuno und ten tiyao ge!", char:"te"},
                clickable: false,
                action: () => {
                        setTimeout(() => {
                                startLoading(() => {
                                        stopSoundType("bgm");
                                        playSound(1002, {type: "bgm", loop: true});
                                        gameState = "map";
                                        mapPlayer.xP = 30;
                                        mapPlayer.yP = 20;
                                })
                        }, 3500);
                }
        },
        //レストランお金もらう前に来やがった
        {
                scene:73,
                bg: 1005,
                char:[
                        {char: "mc", img: 2, xP: 0, yP: 60}, {char: "cf", img: "8", xP: 55, yP: 60}
                ],
                text: null,
                clickable: false,
                action: () => {
                        startLoading(() => {
                                setDest("mc", 40, 60, 1, "floor",() =>{
                                        setTimeout(() => {nextScene()}, 2000);
                                })
                        })
                }
        },
        {
                scene:74,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"10"}
                ],
                text: {content: "Tiyao, tiyao!", char: "cf"},
                action: () => {
                }
        },
        {
                scene:75,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"10"}
                ],
                text: {content: "Ten tiyao?", char: "cf"},
                action: () => {
                }
        },
        {
                scene: 76,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Hate ten tiyao?",
                                options: [
                                        {text: "Oi", correct: false},
                                        {text: "Ieoi...", correct: true},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:77,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"20"}
                ],
                text: {content: "Hate????? Tiyao!!! Tiyao, tiyao!!!!!", char: "cf"},
                action: () => {
                }
        },
        {
                scene:78,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"}
                ],
                text: null,
                action: () => {
                        startLoading(() => {
                                stopSoundType("bgm");
                                playSound(1002, {type: "bgm", loop: true});
                                gameState = "map";
                                mapPlayer.xP = 80;
                                mapPlayer.yP = 20;
                        })
                }
        },
        //お金もらって再来店！
        {
                scene:79,
                bg: 1005,
                char:[
                        {char: "mc", img: 2, xP: 0, yP: 60}, {char: "cf", img: "8", xP: 55, yP: 60}
                ],
                text: null,
                clickable: false,
                action: () => {
                        startLoading(() => {
                                setDest("mc", 40, 60, 1, "floor",() =>{
                                        setTimeout(() => {nextScene()}, 2000);
                                })
                        })
                }
        },
        {
                scene:80,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"10"}
                ],
                text: {content: "Tiyao, tiyao!", char: "cf"},
                action: () => {
                }
        },
        {
                scene:81,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img:"8"}
                ],
                text: {content: "Bi, bi, ten tiyao, tame?", char: "cf"},
                action: () => {
                }
        },
        {
                scene: 82,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Hate ten tiyao?",
                                options: [
                                        {text: "Oi!", correct: true},
                                        {text: "Ieoi", correct: false},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:83,
                bg: 1005,
                char:[
                        {char: "mc", img: "2"},{char:"cf"}
                ],
                clickable: false,
                text: {content: "Oi!", char: "mc"},
                action: () => {
                        setTimeout(() => nextScene(), 1000)
                }
        },
        {
                scene:84,
                bg: 1005,
                char:[
                        {char: "mc", img: "2"},{char:"cf", img:"10"}
                ],
                text: null,
                action: () => {
                }
        },
        {
                scene:85,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: "9"}
                ],
                text: {content: "Ba, ten mi tiyao!"},
                action: () => {
                        setTimeout(() => {
                                haveTiyao = false;
                                playSound(15);
                                mission1 = "completed";
                                playSound(21);
                        }, 2000);
                }
        },
        {
                scene: 86,
                bg: 1005,
                char: [
                        {char: "mc"},
                        {char: "cf"}, 
                        {char: "te", img: "5", xP: -10, yP: 60}
                ],
                clickable: false,

                text: null,
                action: () => {
                        playSound(16, () => {
                                setDest("te", 30, 60, 1, "floor", () => {
                                        setTimeout(() => {
                                                nextScene();
                                        }, 500);
                                });
                        });
                }
        },
        {
                scene:87,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"},{char: "te", img: 6}
                ],
                text: {content: "Oi!", char: "te"},
                action: () => {
                }
        },
        {
                scene:88,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf"},{char: "te", img: 5}
                ],
                text: {content: "Hate mokun yu?", char: "te"},
                action: () => {
                }
        },
        {
                scene: 89,
                bg: 1005,
                char: [{char:"mc"},
                        {char:"cf"},
                {char: "te"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Hate mokun ge?",
                                options: [
                                        {text: "Oi!", correct: true},
                                        {text: "Ieoi", correct: false},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:90,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: 10},{char: "te", img: 6}
                ],
                text: {content: "Yanya! Bono, bon!", char: "te"},
                action: () => {
                }
        },
        {
                scene:91,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: 9},{char: "te", img: 5}
                ],
                text: {content: "Oi!", char: "cf"},
                action: () => {
                }
        },
        {
                scene:92,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: 9},{char: "te"}
                ],
                text: null,
                clickable: false,
                action: () => {
                        setDest("cf", 100, 60, 1, "floor", () => {
                                nextScene();
                        })
                }
        },
        {
                scene:93,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: 9},{char: "te"}
                ],
                text: null,
                clickable: false,
                action: () => {
                        playSound(8, () =>{
                                playSound(9, () => {
                                        playSound(10, () => {
                                                nextScene();
                                        })
                                })
                        })
                }
        },
        {
                scene:94,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: 9},{char: "te"}
                ],
                clickable: false,
                text: {content: "Oi, pon tend!", char:"cf"},
                action: () => {
                        setTimeout(() => nextScene(), 1000)
                }
        },
        {
                scene:95,
                bg: 1005,
                char:[
                        {char: "mc"},{char:"cf", img: 9},{char: "te"}
                ],
                text: null,
                action: () => {
                        setDest("te", 30, 35, 1.2, "floor");
                        setDest("mc", 10, 55, 0.8, "floor");
                        playSound(11, () => {
                                playSound(12, () => {
                                        playSound(13, () => {
                                                nextScene();
                                        })
                                })
                        })
                }
        },
        {
                scene:96,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:10, xP : 40, yP:40},{char: "te"}
                ],
                text: null,
                action: () => {
                        crossfade(4000);
                }
        },
        {
                scene:97,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:10, xP : 40, yP:35},{char: "te"}
                ],
                clickable: false,
                text: {content: "Shabatt, Ramett, und Aiskitt!", char: "cf"},
                action: () => {
                        setTimeout(() => nextScene(), 3000)
                }
        },
        {
                scene:98,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:10, xP : 40, yP:35},{char: "te", img: 5}
                ],
                text: {content: "Mokun!", char: "te"},
                action: () => {
                }
        },
        {
                scene:99,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:10, xP : 40, yP:35},{char: "te", img: 5}
                ],
                clickable: false,
                text: null,
                action: () => {
                        playSound(17, () => {
                                playSound(18, () => {
                                        playSound(19, () => {
                                                nextScene();
                                        })
                                })
                        })
                }
        },
        {
                scene:100,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:10, xP : 40, yP:35},{char: "te", img: 7}
                ],
                text: {content: "Iesulanya, yu ielanya shin lano...", char: "te"},
                action: () => {
                }
        },
        {
                scene:101,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:15, xP : 40, yP:35},{char: "te", img: 5}
                ],
                text: {content: "Mi uun ge...", char: "cf"},
                action: () => {
                }
        },
        {
                scene:102,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:15, xP : 40, yP:35},{char: "te", img: 7}
                ],
                text: {content: "Ten sulayao. ", char: "te"},
                action: () => {
                        mission2 = "issued";
                        playSound(20);
                }
        },
        {
                scene:103,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:15, xP : 40, yP:35},{char: "te", img: 6}
                ],
                text: {content:"Ge un shino.", char: "te"},
                action: () => {
                }
        },
        {
                scene: 104,
                bg: 1007,
                char: [{char:"mc"},
                        {char:"cf"},
                        {char: "te"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "Ten sulayao?",
                                options: [
                                        {text: "Oi..", correct: true},
                                        {text: "Oi!", correct: true},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:105,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:15, xP : 40, yP:35},{char: "te", img: 6}
                ],
                text: {content:"Ba, oi, hapo.", char: "cf"},
                action: () => {

                }
        },
        {
                scene:106,
                bg: 1007,
                char:[
                        {char: "mc"},{char:"cf", img:15, xP : 40, yP:35},{char: "te", img: 6}
                ],
                text: {content:"Hapo, yame.", char: "te"},
                action: () => {

                }
        },   
        {
                scene:107,
                bg: 1007,
                char:[
                        {char: "mc"}, {char: "te"},{char:"cf"}
                ],
                text: null,
                clickable:false,
                action: () => {
                        setTimeout(() => {
                                startLoading(() => {
                                        stopSoundType("bgm");
                                        gameState = "map";
                                        mapPlayer.xP = 80;
                                        mapPlayer.yP = 20;
                                })
                        })
                }
        },
        // {
        //         scene:72,
        //         bg: 1006,
        //         char:[
        //                 {char: "mc"},{char: "te", img:"7"}
        //         ],
        //         text: {content: "Bi, ten mokuno und ten tiyao ge!", char:"te"},
        //         clickable: false,
        //         action: () => {
        //                 setTimeout(() => {
        //                         startLoading(() => {
        //                                 stopSoundType("bgm");
        //                                 playSound(1002, {type: "bgm", loop: true});
        //                                 gameState = "map";
        //                                 mapPlayer.xP = 30;
        //                                 mapPlayer.yP = 20;
        //                         })
        //                 }, 3500);
        //         }
        // },
        // {
        //         scene:73,
        //         bg: 1005,
        //         char:[
        //                 {char: "mc", img: 2, xP: 0, yP: 60}, {char: "cf", img: "8", xP: 55, yP: 60}
        //         ],
        //         text: null,
        //         clickable: false,
        //         action: () => {
        //                 startLoading(() => {
        //                         setDest("mc", 40, 60, 1, "floor",() =>{
        //                                 setTimeout(() => {nextScene()}, 2000);
        //                         })
        //                 })
        //         }
        // },
        {
                scene:108,
                bg: 1009,
                char:[
                        {char: "mc", img: 2, xP: -10, yP: 80},
                ],
                text: null,
                action: () => {
                        startLoading(() => {
                                setDest("mc", 10, 70, 1, "ishi", () => {
                                        setTimeout(() => {playSound(21);mission2 = "completed";nextScene()}, 2000);
                                });
                        })
                }       
        },
        {
                scene:109,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},
                ],
                text: {content: "O----i!"},
                action: () => {
                }       
        },
        {
                scene:110,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god", img:22, xP: 45, yP: -10, wP: 35}
                ],
                clickable: false,
                action: () => {
                        playSound(24);
                        setDest("god", 45, 30, 0.5, null, () => nextScene());
                }       
        },
        {
                scene:111,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "若者よ...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:112,
                bg: 1009,
                char:[
                        {char: "mc", img: "11"},{char: "god"},
                ],
                text: null,
                action: () => {
                }       
        },
        {
                scene:113,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "よく、ここまで来たな...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:114,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "老人とはうまくやれたか？", char: "god"},
                action: () => {
                }       
        },
        {
                scene: 115,
                                bg: 1009,
                char: [{char:"mc"},
                        {char:"god"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "",
                                options: [
                                        {text: "な、なぜ日本語を...?", correct: true},
                                        {text: "は、はい...", correct: true},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:116,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "君の言葉をしゃべれる理由か...?", char: "god"},
                action: () => {
                }       
        },
        {
                scene:117,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "君と、話をするために、君のことをすべて調べたのじゃ。", char: "god"},
                action: () => {
                }       
        },
        {
                scene:118,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "この村に来てからのことも...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:119,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "この世界の言葉からは、『意味』が失われつつあるんじゃ。", char: "god"},
                action: () => {
                }       
        },
        {
                scene:120,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "人々は、互いに対話で意味を理解しようとしないのじゃ。", char: "god"},
                action: () => {
                }       
        },
        {
                scene:121,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "だから、世界は崩壊しかかっているのじゃ！", char: "god"},
                action: () => {
                }       
        },
        {
                scene:122,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "戦争、環境問題、地球温暖化...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:123,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "よく考えてみるのじゃ...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:124,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "世界で起こっている大半のことは、", char: "god"},
                action: () => {
                }       
        },
        {
                scene:125,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "対話が足りないからではないのじゃ？", char: "god"},
                action: () => {
                }       
        },
        {
                scene:126,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "わしはこの世界を作ったのじゃが...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:127,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "どういうわけか、わしの言うことは届かなかった...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:128,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "だから、この世界を救うのは、わしの命令なんかじゃない...", char: "god"},
                action: () => {
                }       
        },
        {
                scene:129,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "ことばが救うのじゃ！", char: "god"},
                action: () => {
                }       
        },
        {
                scene:130,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "だから、君をこの言葉の通じない、平和な世界へ送り込んだのじゃ！", char: "god"},
                action: () => {
                }       
        },
        {
                scene: 131,
                                bg: 1009,
                char: [{char:"mc"},
                        {char:"god"}],
                text: null,
                clickable: false,
                action: () => {
                        showQuiz({
                                question: "",
                                options: [
                                        {text: "ぼ、僕もそう思います！", correct: true},
                                        {text: "黙れ！！！（笑）", correct: false},
                                ],
                                onAnswer: (correct) => {
                                        if(correct) {
                                                playSound(3);
                                                setTimeout(() => {
                                                        nextScene();
                                                }, 1500);
                                        }
                                }
                        })
                }
        },
        {
                scene:132,
                bg: 1009,
                char:[
                        {char: "mc", img: "2"},{char: "god"},
                ],
                text: {content: "ぼ、僕もそう思います！", char: "mc"},
                action: () => {
                }       
        },
        {
                scene:133,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "腕試しとして", char: "god"},
                action: () => {
                }       
        },
        {
                scene:134,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                text: {content: "この世界で何かあったことを教えてくれないかの？", char: "god"},
                action: () => {
                }       
        },
        {
                scene:135,
                bg: 1009,
                text:null,
                clickable:false,
                char:[
                        {char: "mc", img: "0"},{char: "god"},
                ],
                action: () => {
                        showQuiz({
                                mode: "craft",
                                question: "",
                                vocabulary: ["mi", "yu", "sulanya", "mokun", "aisklitt", "tiyao", "yanya", "mokuno", "hapo", "Ba", "bono"],
                                correctAnswers: [
                                        "mi mokun aisklitt",
                                        "yu mokun aisklitt",
                                        "sulanya mokun aisklitt",
                                        "mi ten tiyao bono",
                                        "sulanya ten tiyao mi",
                                        "Ba mi mokun aisklitt",
                                        "mi ten hapo",
                                        "sulanya ten hapo",
                                        "mi ten mokuno",
                                        "sulanya ten mokuno",
                                        "yu ten mokuno",
                                        "sulanya yanya",
                                        "mi yanya",
                                        "yu yanya",
                                ],
                                onAnswer: (isCorrect) => {
                                        if (isCorrect) {
                                        scenes[136].text.content = `${lastCraftedSentence}`;
                                        playSound(3);
                                        nextScene();
                                        }
                                }
                        })
                }       
        },
        {
                scene: 136,
                bg: 1009,
                char:[
                        {char: "mc", img: "2"},
                        {char: "god"},],
                text: {content: "", char: "mc"},
                action: () => {}
        },
        {
                scene: 137,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},
                        {char: "god"},],
                text: {content: "Yanya.", char: "god"},
                action: () => {}
        },
        {
                scene: 138,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},
                        {char: "god"},],
                text: {content: "Yu ten ietend...", char: "god"},
                action: () => {}
        },
        {
                scene: 139,
                bg: 1009,
                char:[
                        {char: "mc", img: "0"},
                        {char: "god"},],
                text: {content: "Tame, tame, ten ao hapo.", char: "god"},
                action: () => {}
        },
        {
                scene: 140,
                bg: 1010,
                char: [],
                text: null,
                clickable: false,
                action: () => {
                        stopAllSounds();
                        
                        playSound(1004, {type: "bgm", loop: true}); 

                        let start = null;
                        const duration = 3000;

                        function fade(timestamp) {
                        if (!start) start = timestamp;
                        const elapsed = timestamp - start;
                        const alpha = Math.min(elapsed / duration, 1);
                        context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        context.fillRect(0, 0, canvas.width, canvas.height);

                        if (alpha < 1) {
                                requestAnimationFrame(fade);
                        } else {
                                setTimeout(() => nextScene(), 2000); 
                        }
                        }
                        requestAnimationFrame(fade);
                }
        },
        {
                scene: 139,
                bg: 1010,
                bgm: 1004,
                char:null,
                text: {content: "Yu shin 'Hate i-tya?', tame?", char: "god"},
                action: () => {}
        },
        {
                scene: 140,
                bg: 1011,
                bgm: 1005,
                char:null,
                text: null,
                clickable: false,
                action: () => {}
        },
];