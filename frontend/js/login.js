
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("login-form");
    const button = document.getElementById("login-button");
    const message = document.getElementById("login-message");

    const emailInput = document.getElementById("email");
    const pinInput = document.getElementById("pin");

    function showMessage(text, color) {
        message.textContent = text;
        message.style.color = color;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!window.MENYARWANDA_DB) {
            showMessage(
                "Database connection is unavailable.",
                "#ff5555"
            );
            return;
        }

        const email = emailInput.value.trim().toLowerCase();
        const pin = pinInput.value;

        if (!email || !pin) {
            showMessage(
                "Please enter your email and PIN.",
                "#ff5555"
            );
            return;
        }

        button.disabled = true;
        button.textContent = "Logging in...";

        showMessage("Checking your account...", "#00c8ff");

        try {

            const { data, error } =
                await window.MENYARWANDA_DB.auth.signInWithPassword({
                    email: email,
                    password: pin
                });

            if (error) {
                throw error;
            }

            if (!data.session || !data.user) {
                throw new Error("Login session could not be created.");
            }

            showMessage(
                "Login successful! Opening your dashboard...",
                "#00c8ff"
            );

            window.location.href = "dashboard.html";

        } catch (error) {

            console.error("Login error:", error);

            showMessage(
                "Invalid email or PIN. Please try again.",
                "#ff5555"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Login";

        }

    });

});
