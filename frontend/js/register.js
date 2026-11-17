
"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const db = window.MENYARWANDA_DB;

    const form = document.getElementById("register-form");
    const button = document.getElementById("register-button");
    const message = document.getElementById("register-message");
    const servicesList = document.getElementById("services-list");

    const fullNameInput = document.getElementById("full-name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const pinInput = document.getElementById("pin");
    const confirmPinInput = document.getElementById("confirm-pin");

    let servicesLoaded = false;
    let submitting = false;

    function showMessage(text, color) {
        message.textContent = text;
        message.style.color = color;
    }

    function updateButton() {
        button.disabled = !servicesLoaded || submitting;
    }

    async function loadServices() {

        if (!db) {
            servicesList.textContent = "Database connection is unavailable.";
            showMessage("Database connection is unavailable.", "#ff5555");
            return;
        }

        try {

            const { data, error } = await db
                .from("digital_services")
                .select("id, name, description, category, price, currency")
                .eq("is_active", true)
                .order("name", { ascending: true });

            if (error) {
                throw error;
            }

            servicesList.replaceChildren();

            if (!data || data.length === 0) {
                servicesList.textContent = "No active services are currently available.";
                showMessage(
                    "No services are available for registration right now.",
                    "#ff5555"
                );
                return;
            }

            data.forEach(service => {

                const label = document.createElement("label");
                label.className = "service-option";

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "service_id";
                radio.value = service.id;
                radio.required = true;

                const content = document.createElement("span");

                const name = document.createElement("span");
                name.className = "service-name";
                name.textContent = service.name;

                const description = document.createElement("span");
                description.className = "service-description";
                description.textContent =
                    service.description || service.category || "Available Digital Service";

                content.appendChild(name);
                content.appendChild(description);

                if (service.price !== null && service.price !== undefined) {

                    const extra = document.createElement("span");
                    extra.className = "service-extra";

                    extra.textContent =
                        Number(service.price).toLocaleString() +
                        " " +
                        (service.currency || "");

                    content.appendChild(extra);
                }

                label.appendChild(radio);
                label.appendChild(content);

                servicesList.appendChild(label);

            });

            servicesLoaded = true;
            updateButton();

        } catch (error) {

            console.error("Services loading error:", error);

            servicesList.textContent =
                "Unable to load services. Please refresh the page.";

            showMessage(
                error.message || "Could not load Digital Services.",
                "#ff5555"
            );
        }
    }

    await loadServices();

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!db) {
            showMessage(
                "Database connection is unavailable. Please try again.",
                "#ff5555"
            );
            return;
        }

        if (!servicesLoaded) {
            showMessage(
                "Services are not ready. Please refresh the page.",
                "#ff5555"
            );
            return;
        }

        const selectedService = form.querySelector(
            'input[name="service_id"]:checked'
        );

        if (!selectedService) {
            showMessage(
                "Please select one Digital Service.",
                "#ff5555"
            );
            return;
        }

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.trim();
        const pin = pinInput.value;
        const confirmPin = confirmPinInput.value;
        const serviceId = selectedService.value;

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

        if (
            pin.length < 8 ||
            !/[A-Za-z]/.test(pin) ||
            !/[0-9]/.test(pin)
        ) {
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

        submitting = true;
        updateButton();

        button.textContent = "Creating account...";
        showMessage("Please wait...", "#00c8ff");

        try {

            const { data, error } = await db.auth.signUp({

                email: email,

                password: pin,

                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                        service_id: serviceId
                    }
                }

            });

            if (error) {
                throw error;
            }

            if (data.session) {

                showMessage(
                    "Account created successfully! Your selected service has been enrolled. Redirecting to login...",
                    "#00c8ff"
                );

                form.reset();

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2500);

            } else {

                showMessage(
                    "Registration received! Your selected service has been saved. Check your email to verify your account, then log in.",
                    "#00c8ff"
                );

                form.reset();
            }

        } catch (error) {

            console.error("Registration error:", error);

            showMessage(
                error.message || "Registration failed. Please try again.",
                "#ff5555"
            );

        } finally {

            submitting = false;
            button.textContent = "Create Account";
            updateButton();

        }

    });

});

