
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

    const status = document.getElementById("connection-status");

    if (window.MENYARWANDA_DB) {

        if (status) {
            status.textContent = "MENYARWANDA database client initialized.";
            status.style.color = "#00c8ff";
        }

        console.log("MENYARWANDA Supabase client initialized.");

    } else {

        if (status) {
            status.textContent = "Database client unavailable.";
            status.style.color = "#ff5555";
        }

        console.error("MENYARWANDA Supabase client is unavailable.");

    }

});
