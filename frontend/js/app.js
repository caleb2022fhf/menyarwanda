
"use strict";

const MENYARWANDA = {
    name: "MENYARWANDA",
    version: "1.0.0",

    modules: {
        authentication: true,
        learning: true,
        attendance: true,
        menyaAI: true,
        videoHub: true,
        digitalServices: true,
        payments: true,
        administration: true
    }
};

window.MENYARWANDA = MENYARWANDA;

document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.platform = "menyarwanda";

    console.log("MENYARWANDA platform initialized.");
});
