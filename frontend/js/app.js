
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

document.addEventListener("DOMContentLoaded", async () => {

    document.documentElement.dataset.platform = "menyarwanda";

    const status = document.getElementById("connection-status");

    console.log("MENYARWANDA platform initialized.");

    if (!window.MENYARWANDA_DB) {
        if (status) {
            status.textContent = "Database connection failed.";
            status.style.color = "#ff5555";
        }

        console.error("Supabase client is not available.");
        return;
    }

    try {
        const { error } = await window.MENYARWANDA_DB
            .from("connection_test")
            .select("*")
            .limit(1);

        if (error && error.code !== "42P01") {
            throw error;
        }

        if (status) {
            status.textContent = "Supabase client connected successfully.";
            status.style.color = "#00c8ff";
        }

        console.log("Supabase client initialized successfully.");

    } catch (error) {
        if (status) {
            status.textContent = "Database test needs configuration.";
            status.style.color = "#ffb347";
        }

        console.error("Supabase test:", error.message);
    }

});
