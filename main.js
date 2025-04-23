document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        const elements = document.querySelectorAll(".btn");
        elements.forEach((element) => {
            element.style.transition = "opacity 1s ease-out";
            element.style.opacity = "1";
        })
    }, 500);
});

const end_loader = () => {
    const trans = document.getElementById("loader");
    trans.style.transition = "opacity 0.6s ease-out"
    trans.style.opacity = "0";
    setTimeout(function () {trans.style.display = "none";}, 1000)
}

const nameafter = document.getElementById("nameafter");
const namebefore = document.getElementById("namebefore");

const displayNameDescription = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting){
            setTimeout(() => {
                nameafter.style.opacity = "1";
            }, 1000);

            displayNameDescription.unobserve(entry.namebefore);
        }
    });
}, {
    threshold: 0.7
});

displayNameDescription.observe(namebefore); 

window.onload = () => {
    scrollTo(0,0);
    setTimeout(end_loader, 500);
}
