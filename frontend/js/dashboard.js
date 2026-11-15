
"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const db = window.MENYARWANDA_DB;

    const studentName = document.getElementById("student-name");
    const welcomeName = document.getElementById("welcome-name");
    const coursesList = document.getElementById("courses-list");
    const message = document.getElementById("dashboard-message");
    const logoutButton = document.getElementById("logout-button");

    function showMessage(text, color = "#ff5555") {
        message.textContent = text;
        message.style.color = color;
    }

    if (!db) {
        showMessage("Database connection is unavailable.");
        return;
    }

    try {

        // Check logged-in user
        const { data: sessionData, error: sessionError } =
            await db.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const session = sessionData.session;

        if (!session) {
            window.location.replace("login.html");
            return;
        }

        const user = session.user;

        // Load student profile
        const { data: profile, error: profileError } =
            await db
                .from("profiles")
                .select("full_name, role")
                .eq("id", user.id)
                .single();

        if (profileError) {
            throw profileError;
        }

        const name = profile.full_name || "Student";

        studentName.textContent = name;
        welcomeName.textContent = name;

        // Load student's enrolled courses
        const { data: enrollments, error: enrollmentError } =
            await db
                .from("enrollments")
                .select(`
                    course_id,
                    courses (
                        id,
                        title,
                        description
                    )
                `)
                .eq("student_id", user.id);

        if (enrollmentError) {
            throw enrollmentError;
        }

        coursesList.innerHTML = "";

        if (!enrollments || enrollments.length === 0) {

            coursesList.textContent =
                "You have not enrolled in any courses yet.";

        } else {

            enrollments.forEach((enrollment) => {

                const course = enrollment.courses;

                if (!course) return;

                const card = document.createElement("div");

                card.className = "card";
                card.style.marginTop = "12px";

                const title = document.createElement("h3");
                title.textContent = course.title;

                const description = document.createElement("p");
                description.className = "muted";
                description.style.marginTop = "8px";
                description.textContent =
                    course.description || "No course description available.";

                card.appendChild(title);
                card.appendChild(description);

                coursesList.appendChild(card);

            });

        }

        showMessage("Your dashboard is ready.", "#00c8ff");

        // Logout
        logoutButton.addEventListener("click", async () => {

            logoutButton.disabled = true;
            logoutButton.textContent = "Logging out...";

            const { error } = await db.auth.signOut();

            if (error) {
                console.error("Logout error:", error);
                showMessage("Unable to logout. Please try again.");
                logoutButton.disabled = false;
                logoutButton.textContent = "Logout";
                return;
            }

            window.location.replace("login.html");

        });

    } catch (error) {

        console.error("Dashboard error:", error);

        showMessage(
            "Unable to load your dashboard. Please try again."
        );

    }

});
