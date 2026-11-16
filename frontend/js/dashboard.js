
"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const db = window.MENYARWANDA_DB;

    const studentName = document.getElementById("student-name");
    const welcomeName = document.getElementById("welcome-name");
    const coursesList = document.getElementById("courses-list");
    const videosList = document.getElementById("videos-list");
    const message = document.getElementById("dashboard-message");
    const logoutButton = document.getElementById("logout-button");

    const aiForm = document.getElementById("ai-form");
    const aiQuestion = document.getElementById("ai-question");
    const aiMessages = document.getElementById("ai-messages");
    const aiSendButton = document.getElementById("ai-send-button");
    const aiLanguage = document.getElementById("ai-language");
    const aiStatus = document.getElementById("ai-status");

    function showMessage(text, color = "#ff5555") {
        if (!message) return;

        message.textContent = text;
        message.style.color = color;
    }

    function addAIMessage(text, sender = "assistant") {

        if (!aiMessages) return;

        const bubble = document.createElement("div");

        bubble.className = `ai-message ${sender}`;
        bubble.textContent = text;

        aiMessages.appendChild(bubble);
        aiMessages.scrollTop = aiMessages.scrollHeight;

        return bubble;
    }

    function getYouTubeId(value) {

        try {

            const url = new URL(value);
            let videoId = "";

            if (
                url.hostname === "youtu.be" ||
                url.hostname === "www.youtu.be"
            ) {

                videoId =
                    url.pathname.split("/").filter(Boolean)[0] || "";

            } else if (
                url.hostname === "youtube.com" ||
                url.hostname === "www.youtube.com" ||
                url.hostname === "m.youtube.com" ||
                url.hostname === "music.youtube.com"
            ) {

                if (url.pathname === "/watch") {

                    videoId = url.searchParams.get("v") || "";

                } else {

                    const parts =
                        url.pathname.split("/").filter(Boolean);

                    if (
                        ["embed", "shorts", "live"].includes(parts[0])
                    ) {
                        videoId = parts[1] || "";
                    }
                }
            }

            return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
                ? videoId
                : null;

        } catch (error) {

            return null;

        }
    }

    async function loadCourses(userId) {

        const { data: enrollments, error } = await db
            .from("enrollments")
            .select(`
                course_id,
                courses (
                    id,
                    title,
                    description
                )
            `)
            .eq("student_id", userId);

        if (error) {
            throw error;
        }

        coursesList.innerHTML = "";

        if (!enrollments || enrollments.length === 0) {

            coursesList.textContent =
                "You have not enrolled in any courses yet.";

            return;
        }

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
                course.description ||
                "No course description available.";

            card.appendChild(title);
            card.appendChild(description);

            coursesList.appendChild(card);

        });
    }

    async function loadVideos() {

        videosList.innerHTML = `
            <div class="card empty-state">
                Loading learning videos...
            </div>
        `;

        const { data: videos, error } = await db
            .from("menyarwanda_videos")
            .select(`
                id,
                title,
                description,
                youtube_url,
                thumbnail_url,
                created_at
            `)
            .eq("published", true)
            .order("created_at", { ascending: false });

        if (error) {

            console.error("Videos loading error:", error);

            videosList.innerHTML = `
                <div class="card empty-state">
                    Unable to load learning videos.
                    Please refresh the page.
                </div>
            `;

            return;
        }

        videosList.innerHTML = "";

        if (!videos || videos.length === 0) {

            videosList.innerHTML = `
                <div class="card empty-state">
                    No learning videos are available yet.
                </div>
            `;

            return;
        }

        videos.forEach((video) => {

            const videoId = getYouTubeId(video.youtube_url);

            const card = document.createElement("article");
            card.className = "card video-card";

            if (videoId) {

                const iframe = document.createElement("iframe");

                iframe.className = "video-frame";

                iframe.src =
                    `https://www.youtube-nocookie.com/embed/${videoId}`;

                iframe.title = video.title || "Learning video";

                iframe.allow =
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

                iframe.allowFullscreen = true;
                iframe.loading = "lazy";

                card.appendChild(iframe);

            } else {

                const invalid = document.createElement("div");

                invalid.className = "empty-state";
                invalid.textContent = "This video link is invalid.";

                card.appendChild(invalid);
            }

            const details = document.createElement("div");
            details.className = "video-details";

            const title = document.createElement("h3");
            title.textContent = video.title || "Untitled video";

            const description = document.createElement("p");
            description.className = "muted video-description";

            description.textContent =
                video.description || "No description available.";

            details.appendChild(title);
            details.appendChild(description);

            card.appendChild(details);
            videosList.appendChild(card);

        });
    }

    // MENYARWANDA AI CONNECTION
    async function sendAIQuestion(question) {

        const { data: sessionData, error: sessionError } =
            await db.auth.getSession();

        if (sessionError || !sessionData.session) {

            throw new Error(
                "Please login again to use MENYARWANDA AI."
            );
        }

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization":
                    `Bearer ${sessionData.session.access_token}`
            },

            body: JSON.stringify({
                question: question,
                language: aiLanguage.value
            })

        });

        let data;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error(
                "Invalid response from MENYARWANDA AI server."
            );
        }

        if (!response.ok) {

            throw new Error(
                data.error ||
                "MENYARWANDA AI connection failed."
            );
        }

        if (!data.answer) {

            throw new Error(
                "MENYARWANDA AI returned no answer."
            );
        }

        return data.answer;
    }

    // AI QUESTION SUBMISSION
    if (aiForm) {

        aiForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            const question = aiQuestion.value.trim();

            if (!question) {
                return;
            }

            if (question.length > 5000) {

                aiStatus.textContent =
                    "Your question is too long. Please shorten it.";

                return;
            }

            addAIMessage(question, "user");

            aiQuestion.value = "";

            aiSendButton.disabled = true;
            aiSendButton.textContent = "Thinking...";

            aiStatus.textContent =
                "MENYARWANDA AI is preparing your answer...";

            try {

                const answer = await sendAIQuestion(question);

                addAIMessage(answer, "assistant");

                aiStatus.textContent =
                    "MENYARWANDA AI is ready.";

            } catch (error) {

                console.error("MENYARWANDA AI error:", error);

                addAIMessage(
                    "Sorry, I could not answer your question. Please try again.",
                    "assistant"
                );

                aiStatus.textContent =
                    error.message ||
                    "MENYARWANDA AI connection failed.";

            } finally {

                aiSendButton.disabled = false;
                aiSendButton.textContent = "Send";
                aiQuestion.focus();

            }

        });
    }

    // CHECK LOGGED-IN USER
    if (!db) {

        showMessage("Database connection is unavailable.");
        return;
    }

    try {

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

        await loadCourses(user.id);

        await loadVideos();

        showMessage("Your dashboard is ready.", "#00c8ff");

        // LOGOUT
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
