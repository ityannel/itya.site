document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        let element = document.getElementById("moreBtn");
        element.style.transition = "opacity 1s ease-out";
        element.style.opacity = "1";
    },1000);
});