
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("register-form");
    const button = document.getElementById("register-button");
    const message = document.getElementById("register-message");

    const fullNameInput = document.getElementById("full-name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const pinInput = document.getElementById("pin");
    const confirmPinInput = document.getElementById("confirm-pin");

    function showMessage(text, color) {
        message.textContent = text;
        message.style.color = color;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!window.MENYARWANDA_DB) {
            showMessage(
                "Database connection is unavailable. Please try again.",
                "#ff5555"
            );
            return;
        }

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.trim();
        const pin = pinInput.value;
        const confirmPin = confirmPinInput.value;

        if (fullName.length < 3) {
            showMessage("Please enter your full name.", "#ff5555");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage("Enter a valid email address.", "#ff5555");
            return;
        }

        if (phone.length < 7) {
            showMessage("Enter a valid phone number.", "#ff5555");
            return;
        }

        if (pin.length < 8 || !/[A-Za-z]/.test(pin) || !/[0-9]/.test(pin)) {
            showMessage(
                "PIN must have at least 8 characters, including letters and numbers.",
                "#ff5555"
            );
            return;
        }

        if (pin !== confirmPin) {
            showMessage("PINs do not match.", "#ff5555");
            return;
        }

        button.disabled = true;
        button.textContent = "Creating account...";

        showMessage("Please wait...", "#00c8ff");

        try {

            const { data, error } =
                await window.MENYARWANDA_DB.auth.signUp({
                    email: email,
                    password: pin,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: phone
                        }
                    }
                });

            if (error) {
                throw error;
            }

            if (data.session) {
                showMessage(
                    "Account created successfully! Redirecting to login...",
                    "#00c8ff"
                );

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1800);

            } else {
                showMessage(
                    "Registration received. Check your email if verification is required, then log in.",
                    "#00c8ff"
                );
            }

            form.reset();

        } catch (error) {

            console.error("Registration error:", error);

            showMessage(
                error.message || "Registration failed. Please try again.",
                "#ff5555"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Create Account";

        }

    });

});
