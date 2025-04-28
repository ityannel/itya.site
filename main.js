document.addEventListener("DOMContentLoaded", function () {

    //ボタンを表示するニダ
    setTimeout(function () {
        document.querySelectorAll(".btn").forEach((element) => {
            element.style.transition = "all 0.2s ease-out";
            element.style.opacity = "1";
        });
    }, 500);
});

//ロード処理終わったら1000msで消すニダ
const end_loader = () => {
    const trans = document.getElementById("loader");
    trans.style.transition = "all 0.6s ease-out";
    trans.style.opacity = "0";
    setTimeout(() => {
      trans.style.display = "none";
    }, 1000);
};
  
//0.7/1しかいにはいったら○○afterをぶわっと表示させるニダ
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const targetSelector = entry.target.getAttribute("data-show");
            const targetEl = document.querySelector(targetSelector);
            if (targetEl) {
                setTimeout(() => {
                targetEl.classList.add("visible");
                }, 500);
            }
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.7
});

document.querySelectorAll(".fade-trigger").forEach((el) => {
    observer.observe(el);
});

//スクロールしても#○○付けないニダ
document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetSelector = btn.getAttribute("data-scroll");
        const targetEl = document.querySelector(targetSelector);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth"});
            history.replaceState(null,null,location.pathname);
        }
    })
})

//
window.addEventListener("load", () => {
    scrollTo(0, 0);
    setTimeout(() => {
        end_loader();

        const canvas = document.getElementById("skin-canvas");
        if (!canvas) return;

        const skins = [
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-skin.png",
            "img/itya-sunglass.png",
            "img/itya-colorful.png",
            "img/itya-skin-hanten.png"
        ];

        const animations = [
            new skinview3d.WalkingAnimation(),
            new skinview3d.RunningAnimation(),
            new skinview3d.IdleAnimation(),
            new skinview3d.IdleAnimation(),
            new skinview3d.IdleAnimation(),
            new skinview3d.IdleAnimation(),
            new skinview3d.IdleAnimation(),
            new skinview3d.IdleAnimation()
        ]

        const choosedSkin = skins[Math.floor(Math.random() * skins.length)];
        const choosedAnimations = animations[Math.floor(Math.random() * animations.length)];

        const viewer = new skinview3d.SkinViewer({
            canvas: canvas,
            width: 600,
            height: 600,
            skin: choosedSkin
        });

        viewer.controls.enableZoom = false;
        viewer.animation = choosedAnimations;
        viewer.animation.speed = 1;

        let autoRotate = true;
        let targetRotation = 0;

        const animateRotation = () => {
            if (autoRotate) {
                targetRotation += 0.01;
            }
            viewer.playerObject.rotation.y += (targetRotation - viewer.playerObject.rotation.y) * 0.1;
            requestAnimationFrame(animateRotation);
        };

        animateRotation();

        

        let scrollTimeout = null;
        window.addEventListener("scroll", () => {
            autoRotate = false;
            targetRotation = window.scrollY * 0.01;

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                autoRotate = true;
            }, 1000);
        });

        if (location.hash) {
            history.replaceState(null, null, location.pathname);
        }
    }, 500);
});
