
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginButton = document.getElementById("login-button");
    const loginMessage = document.getElementById("login-message");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const pin = document.getElementById("pin").value;
        const db = window.MENYARWANDA_DB;

        if (!db) {
            loginMessage.textContent = "Database connection unavailable.";
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";
        loginMessage.textContent = "";

        try {
            const { data, error } = await db.auth.signInWithPassword({
                email,
                password: pin
            });

            if (error) {
                throw error;
            }

            const { data: profile, error: profileError } = await db
                .from("profiles")
                .select("role, is_allowed")
                .eq("id", data.user.id)
                .single();

            if (profileError || !profile) {
                await db.auth.signOut();
                throw new Error("Unable to verify your account.");
            }

            if (profile.role === "admin") {
                window.location.replace("admin.html");
                return;
            }

            if (profile.role === "student") {
                if (profile.is_allowed !== true) {
                    await db.auth.signOut();
                    throw new Error(
                        "Your account access has not been approved. Please contact the administrator."
                    );
                }

                const { data: sessionData, error: sessionError } =
                    await db.rpc("start_student_learning_session");

                if (sessionError) {
                    await db.auth.signOut();
                    throw sessionError;
                }

                if (!sessionData || sessionData.length === 0) {
                    await db.auth.signOut();
                    throw new Error(
                        "Unable to start your 40-minute learning session."
                    );
                }

                window.location.replace("dashboard.html");
                return;
            }

            await db.auth.signOut();
            throw new Error("Your account role is not recognized.");

        } catch (error) {
            loginMessage.textContent =
                error.message === "Invalid login credentials"
                    ? "Incorrect email or PIN."
                    : error.message || "Login failed. Please try again.";

            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    });
});
