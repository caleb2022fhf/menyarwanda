
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

    let currentUser = null;
    let currentServiceId = null;
    let currentSessionId = null;
    let currentAiSessionId = null;
    let aiExpiresAt = null;

    let youtubePlayer = null;
    let heartbeatTimer = null;
    let aiCountdownTimer = null;

    let playerCompleted = false;
    let loadingService = false;
    let finishingAiSession = false;
    let lastFinishAttempt = 0;

    function showMessage(text, color = "#ff5555") {
        if (!message) return;
        message.textContent = text;
        message.style.color = color;
    }

    function escapeHTML(value) {
        return String(value || "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function setAIEnabled(enabled) {
        if (aiQuestion) aiQuestion.disabled = !enabled;
        if (aiSendButton) aiSendButton.disabled = !enabled;
    }

    function addAIMessage(text, sender = "assistant", language = "rw") {
        if (!aiMessages) return;

        const bubble = document.createElement("div");
        bubble.className = `ai-message ${sender}`;

        const messageText = document.createElement("div");
        messageText.textContent = text;
        bubble.appendChild(messageText);

        if (sender === "assistant") {
            const speakButton = document.createElement("button");
            speakButton.type = "button";
            speakButton.textContent = "🔊 Listen";
            speakButton.style.display = "block";
            speakButton.style.marginTop = "10px";
            speakButton.style.padding = "8px 14px";
            speakButton.style.borderRadius = "8px";
            speakButton.style.cursor = "pointer";

            speakButton.addEventListener("click", async () => {
                speakButton.disabled = true;
                speakButton.textContent = "Playing...";

                try {
                    await speakAIMessage(text, language);
                } catch (error) {
                    console.error("Voice error:", error);
                    if (aiStatus) {
                        aiStatus.textContent =
                            "Unable to play the voice. Please try again.";
                    }
                } finally {
                    speakButton.disabled = false;
                    speakButton.textContent = "🔊 Listen";
                }
            });

            bubble.appendChild(speakButton);
        }

        aiMessages.appendChild(bubble);
        aiMessages.scrollTop = aiMessages.scrollHeight;

        return bubble;
    }

    function splitTextIntoChunks(text, maxLength = 450) {
        const sentences = text
            .replace(/\s+/g, " ")
            .trim()
            .match(/[^.!?。؟]+[.!?。؟]?/g) || [text];

        const chunks = [];
        let current = "";

        sentences.forEach(sentence => {
            const cleanSentence = sentence.trim();
            if (!cleanSentence) return;

            const next = current
                ? `${current} ${cleanSentence}`
                : cleanSentence;

            if (next.length > maxLength) {
                if (current) chunks.push(current);
                current = cleanSentence;
            } else {
                current = next;
            }
        });

        if (current) chunks.push(current);

        return chunks;
    }

    async function speakAIMessage(text, language = "rw") {
        const chunks = splitTextIntoChunks(text);

        if (!chunks.length) {
            throw new Error("There is no text to read.");
        }

        if (window.menyarwandaAudio) {
            window.menyarwandaAudio.pause();
            window.menyarwandaAudio.currentTime = 0;
            window.menyarwandaAudio = null;
        }

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        if (language === "rw") {
            for (let i = 0; i < chunks.length; i++) {
                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        text: chunks[i],
                        language: "rw"
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.audioUrl) {
                    throw new Error(
                        data.message || "Could not generate Kinyarwanda voice."
                    );
                }

                const audio = new Audio(data.audioUrl);
                window.menyarwandaAudio = audio;

                await new Promise((resolve, reject) => {
                    audio.onended = resolve;
                    audio.onerror = () => reject(
                        new Error("Voice playback failed.")
                    );
                    audio.play().catch(reject);
                });
            }

            return;
        }

        if (!("speechSynthesis" in window)) {
            throw new Error("Your browser does not support voice.");
        }

        const languageCodes = {
            en: "en-US",
            fr: "fr-FR"
        };

        for (const chunk of chunks) {
            await new Promise((resolve, reject) => {
                const speech = new SpeechSynthesisUtterance(chunk);

                speech.lang = languageCodes[language] || "en-US";
                speech.rate = 0.85;
                speech.pitch = 1;
                speech.onend = resolve;
                speech.onerror = () => reject(
                    new Error("Browser voice playback failed.")
                );

                window.speechSynthesis.speak(speech);
            });
        }
    }

    function getYouTubeId(value) {
        try {
            const url = new URL(value);
            let videoId = "";

            if (
                url.hostname === "youtu.be" ||
                url.hostname === "www.youtu.be"
            ) {
                videoId = url.pathname.split("/").filter(Boolean)[0] || "";
            } else if (
                [
                    "youtube.com",
                    "www.youtube.com",
                    "m.youtube.com",
                    "music.youtube.com"
                ].includes(url.hostname)
            ) {
                if (url.pathname === "/watch") {
                    videoId = url.searchParams.get("v") || "";
                } else {
                    const parts = url.pathname.split("/").filter(Boolean);

                    if (["embed", "shorts", "live"].includes(parts[0])) {
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

    function loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            return Promise.resolve();
        }

        if (window.youtubeAPIReady) {
            return window.youtubeAPIReady;
        }

        window.youtubeAPIReady = new Promise((resolve, reject) => {
            const oldCallback = window.onYouTubeIframeAPIReady;

            window.onYouTubeIframeAPIReady = () => {
                if (typeof oldCallback === "function") {
                    oldCallback();
                }
                resolve();
            };

            const existingScript = document.querySelector(
                'script[src="https://www.youtube.com/iframe_api"]'
            );

            if (!existingScript) {
                const script = document.createElement("script");
                script.src = "https://www.youtube.com/iframe_api";
                script.onerror = () => reject(
                    new Error("Unable to load YouTube Player API.")
                );
                document.head.appendChild(script);
            }

            setTimeout(() => {
                if (!(window.YT && window.YT.Player)) {
                    reject(new Error("YouTube Player API timed out."));
                }
            }, 20000);
        });

        return window.youtubeAPIReady;
    }

    function stopHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function stopAiCountdown() {
        if (aiCountdownTimer) {
            clearInterval(aiCountdownTimer);
            aiCountdownTimer = null;
        }
    }

    async function sendHeartbeat(isPlaying) {
        if (!currentSessionId || !youtubePlayer || playerCompleted) {
            return;
        }

        try {
            const position = Math.floor(
                youtubePlayer.getCurrentTime() || 0
            );

            const duration = Math.floor(
                youtubePlayer.getDuration() || 0
            );

            if (!duration) return;

            const { error } = await db.rpc(
                "record_video_heartbeat",
                {
                    p_session_id: currentSessionId,
                    p_position_seconds: position,
                    p_duration_seconds: duration,
                    p_is_playing: isPlaying
                }
            );

            if (error) {
                console.error("Heartbeat error:", error);
            }
        } catch (error) {
            console.error("Heartbeat error:", error);
        }
    }

    async function sendFinalHeartbeat() {
        if (!currentSessionId || !youtubePlayer) return;

        const position = Math.floor(
            youtubePlayer.getCurrentTime() || 0
        );

        const duration = Math.floor(
            youtubePlayer.getDuration() || 0
        );

        if (!duration) return;

        const { error } = await db.rpc(
            "record_video_heartbeat",
            {
                p_session_id: currentSessionId,
                p_position_seconds: position,
                p_duration_seconds: duration,
                p_is_playing: true
            }
        );

        if (error) throw error;
    }

    async function startHeartbeat() {
        stopHeartbeat();

        heartbeatTimer = setInterval(async () => {
            if (!youtubePlayer || playerCompleted) return;

            const state = youtubePlayer.getPlayerState();

            await sendHeartbeat(state === YT.PlayerState.PLAYING);
        }, 15000);
    }

    function showAiLearningPanel() {
        if (!videosList) return;

        videosList.innerHTML = `
            <div class="card empty-state">
                <h3>Video completed successfully!</h3>
                <p>Your 10-minute MENYARWANDA AI learning session has started.</p>
                <p>Ask questions about anything you did not understand in the video.</p>
                <h3 id="ai-countdown-display"
                    style="color:#00c8ff;margin-top:18px;">
                    10:00
                </h3>
            </div>
        `;
    }

    function updateAiCountdown() {
        if (!currentAiSessionId || !aiExpiresAt) return;

        const remaining = Math.max(
            0,
            Math.ceil((aiExpiresAt - Date.now()) / 1000)
        );

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        const display = document.getElementById("ai-countdown-display");

        const countdownText =
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;

        if (display) {
            display.textContent = countdownText;
        }

        if (aiStatus) {
            aiStatus.textContent =
                remaining > 0
                    ? `MENYARWANDA AI session time remaining: ${countdownText}`
                    : "Your AI learning time has ended. Submitting attendance...";
        }

        if (remaining <= 0) {
            setAIEnabled(false);

            if (
                !finishingAiSession &&
                Date.now() - lastFinishAttempt > 5000
            ) {
                finishAiLearningSession();
            }
        }
    }

    async function startAiCountdown(expiresAt) {
        stopAiCountdown();

        aiExpiresAt = new Date(expiresAt).getTime();

        if (!Number.isFinite(aiExpiresAt)) {
            throw new Error("Invalid AI session expiry time.");
        }

        setAIEnabled(true);

        if (aiStatus) {
            aiStatus.textContent =
                "Your 10-minute MENYARWANDA AI session is active.";
        }

        updateAiCountdown();

        aiCountdownTimer = setInterval(() => {
            updateAiCountdown();
        }, 1000);
    }

    async function finishAiLearningSession() {
        if (!currentAiSessionId || finishingAiSession) return;

        if (Date.now() < aiExpiresAt) return;

        finishingAiSession = true;
        lastFinishAttempt = Date.now();

        setAIEnabled(false);

        try {
            const { data, error } = await db.rpc(
                "finish_ai_learning_session",
                {
                    p_session_id: currentAiSessionId
                }
            );

            if (error) throw error;

            if (data !== true) {
                throw new Error(
                    "Attendance could not be confirmed."
                );
            }

            stopAiCountdown();

            currentAiSessionId = null;
            aiExpiresAt = null;

            if (aiStatus) {
                aiStatus.textContent =
                    "Your 10-minute session is complete. Your attendance has been recorded.";
            }

            addAIMessage(
                "Your 10-minute learning session is complete. Your attendance has been recorded. You can continue learning when the next day arrives.",
                "assistant",
                "rw"
            );

            showMessage(
                "Your attendance has been recorded successfully.",
                "#00c8ff"
            );

            const completedService = currentServiceId;

            await loadServiceVideo(completedService);

        } catch (error) {
            console.error("AI session completion error:", error);

            if (aiStatus) {
                aiStatus.textContent =
                    "Attendance submission failed. Retrying automatically...";
            }

        } finally {
            finishingAiSession = false;
        }
    }

    async function startAiLearningSession(videoId) {
        const { data, error } = await db.rpc(
            "start_ai_learning_session",
            {
                p_video_id: videoId
            }
        );

        if (error) throw error;

        const session = Array.isArray(data) ? data[0] : data;

        if (!session || !session.session_id || !session.expires_at) {
            throw new Error(
                "MENYARWANDA AI session could not be started."
            );
        }

        currentAiSessionId = session.session_id;

        showAiLearningPanel();

        addAIMessage(
            "Congratulations! You have completed the video. You now have 10 minutes to ask me questions about the lesson. What would you like me to explain?",
            "assistant",
            "rw"
        );

        await startAiCountdown(session.expires_at);
    }

    async function completeCurrentVideo() {
        if (playerCompleted || !currentSessionId || !youtubePlayer) {
            return;
        }

        playerCompleted = true;
        stopHeartbeat();

        const completedVideoSessionId = currentSessionId;
        const completedService = currentServiceId;

        const finishPosition = Math.floor(
            youtubePlayer.getCurrentTime() || 0
        );

        try {
            await sendFinalHeartbeat();

            const { error } = await db.rpc(
                "complete_video_watch_session",
                {
                    p_session_id: completedVideoSessionId,
                    p_final_position_seconds: finishPosition
                }
            );

            if (error) throw error;

            currentSessionId = null;
            youtubePlayer = null;

            showMessage(
                "Video completed. Starting your AI learning session...",
                "#00c8ff"
            );

            await startAiLearningSession(
                window.currentLearningVideoId
            );

        } catch (error) {
            console.error("Video completion error:", error);

            playerCompleted = false;
            currentSessionId = completedVideoSessionId;
            currentServiceId = completedService;

            showMessage(
                error.message ||
                "Video completion could not be confirmed. Please try again."
            );
        }
    }

    async function startVideoSession(video) {
        const { data, error } = await db.rpc(
            "start_video_watch_session",
            {
                p_video_id: video.video_id
            }
        );

        if (error) throw error;

        currentSessionId = data;

        return data;
    }

    async function createVideoPlayer(video) {
        const youtubeId = getYouTubeId(video.youtube_url);

        if (!youtubeId) {
            throw new Error("This video has an invalid YouTube link.");
        }

        await loadYouTubeAPI();

        const playerContainer = document.getElementById("youtube-player");

        if (!playerContainer) {
            throw new Error("Video player container was not found.");
        }

        youtubePlayer = new YT.Player("youtube-player", {
            videoId: youtubeId,

            playerVars: {
                autoplay: 0,
                controls: 1,
                rel: 0,
                playsinline: 1,
                modestbranding: 1
            },

            events: {
                onReady: async () => {
                    showMessage(
                        "Your lesson is ready. Watch the video to completion.",
                        "#00c8ff"
                    );

                    await startHeartbeat();
                },

                onStateChange: async event => {
                    if (playerCompleted) return;

                    if (event.data === YT.PlayerState.PLAYING) {
                        await sendHeartbeat(true);
                    }

                    if (event.data === YT.PlayerState.PAUSED) {
                        await sendHeartbeat(false);
                    }

                    if (event.data === YT.PlayerState.ENDED) {
                        await completeCurrentVideo();
                    }
                },

                onError: event => {
                    console.error("YouTube Player error:", event.data);

                    showMessage(
                        "The YouTube video could not be played. Please try again."
                    );
                }
            }
        });
    }

    function showNoVideo(text) {
        if (!videosList) return;

        videosList.innerHTML = "";

        const empty = document.createElement("div");
        empty.className = "card empty-state";
        empty.textContent = text;

        videosList.appendChild(empty);
    }

    async function loadServiceVideo(serviceId) {
        if (loadingService) return;

        loadingService = true;
        currentServiceId = serviceId;
        currentSessionId = null;
        playerCompleted = false;

        stopHeartbeat();

        if (youtubePlayer && typeof youtubePlayer.destroy === "function") {
            youtubePlayer.destroy();
        }

        youtubePlayer = null;

        showNoVideo("Checking your learning progress...");

        try {
            const { data, error } = await db.rpc(
                "get_my_next_service_video",
                {
                    p_service_id: serviceId
                }
            );

            if (error) throw error;

            const video = Array.isArray(data) ? data[0] : data;

            if (!video) {
                showNoVideo(
                    "You have completed today's learning. Your next learning day will be available tomorrow."
                );

                return;
            }

            const { data: attendanceCount, error: attendanceError } =
                await db.rpc(
                    "get_student_service_attendance",
                    {
                        p_student_id: currentUser.id,
                        p_service_id: serviceId
                    }
                );

            if (attendanceError) throw attendanceError;

            const card = document.createElement("article");
            card.className = "card video-card";

            const details = document.createElement("div");
            details.className = "video-details";

            const heading = document.createElement("h3");
            heading.textContent = video.video_title;

            const day = document.createElement("p");
            day.className = "muted";
            day.style.marginTop = "8px";
            day.textContent = `Learning Day ${video.learning_day}`;

            const description = document.createElement("p");
            description.className = "muted video-description";
            description.style.marginTop = "10px";
            description.textContent =
                video.video_description || "No description available.";

            const progress = document.createElement("p");
            progress.style.marginTop = "12px";
            progress.style.color = "#00c8ff";
            progress.textContent =
                `Completed Attendance: ${attendanceCount || 0}`;

            const player = document.createElement("div");
            player.id = "youtube-player";
            player.className = "video-frame";

            details.appendChild(heading);
            details.appendChild(day);
            details.appendChild(description);
            details.appendChild(progress);

            card.appendChild(player);
            card.appendChild(details);

            videosList.innerHTML = "";
            videosList.appendChild(card);

            window.currentLearningVideoId = video.video_id;

            await startVideoSession(video);
            await createVideoPlayer(video);

        } catch (error) {
            console.error("Learning video error:", error);

            showNoVideo(
                error.message ||
                "Unable to load your learning video. Please try again."
            );

        } finally {
            loadingService = false;
        }
    }

    async function loadCourses(userId) {
        coursesList.innerHTML = "Loading your services...";

        const { data: enrollments, error } = await db
            .from("enrollments")
            .select(`
                service_id,
                digital_services (
                    id,
                    name,
                    description
                )
            `)
            .eq("student_id", userId);

        if (error) throw error;

        coursesList.innerHTML = "";

        if (!enrollments || enrollments.length === 0) {
            coursesList.textContent =
                "You have not enrolled in any Digital Services yet.";

            showNoVideo(
                "Enroll in a Digital Service to access your learning videos."
            );

            return;
        }

        const uniqueServices = new Map();

        enrollments.forEach(enrollment => {
            const service = enrollment.digital_services;

            if (service && service.id) {
                uniqueServices.set(service.id, service);
            }
        });

        if (uniqueServices.size === 0) {
            coursesList.textContent =
                "Your enrolled services could not be loaded.";

            return;
        }

        uniqueServices.forEach(service => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.marginTop = "12px";

            const title = document.createElement("h3");
            title.textContent = service.name;

            const description = document.createElement("p");
            description.className = "muted";
            description.style.marginTop = "8px";
            description.textContent =
                service.description || "Learning service";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "primary-btn";
            button.style.marginTop = "14px";
            button.textContent = "Open My Learning";

            button.addEventListener("click", async () => {
                document.querySelectorAll(
                    "#courses-list button"
                ).forEach(item => {
                    item.disabled = false;
                    item.textContent = "Open My Learning";
                });

                button.disabled = true;
                button.textContent = "Loading...";

                await loadServiceVideo(service.id);

                button.disabled = false;
                button.textContent = "Open My Learning";
            });

            card.appendChild(title);
            card.appendChild(description);
            card.appendChild(button);

            coursesList.appendChild(card);
        });

        const firstService = uniqueServices.values().next().value;

        if (firstService) {
            await loadServiceVideo(firstService.id);
        }
    }

    async function sendAIQuestion(question, language = "rw") {
        if (!currentAiSessionId || !aiExpiresAt) {
            throw new Error(
                "You can ask MENYARWANDA AI after completing your video."
            );
        }

        if (Date.now() >= aiExpiresAt) {
            setAIEnabled(false);
            await finishAiLearningSession();

            throw new Error(
                "Your 10-minute AI learning session has ended."
            );
        }

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
                question,
                language,
                ai_session_id: currentAiSessionId
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
            if (response.status === 403) {
                setAIEnabled(false);
                stopAiCountdown();
            }

            throw new Error(
                data.error || "MENYARWANDA AI connection failed."
            );
        }

        if (!data.answer) {
            throw new Error(
                "MENYARWANDA AI returned no answer."
            );
        }

        return data.answer;
    }

    if (aiForm) {
        setAIEnabled(false);

        if (aiStatus) {
            aiStatus.textContent =
                "Complete your learning video to unlock the 10-minute AI session.";
        }

        aiForm.addEventListener("submit", async event => {
            event.preventDefault();

            const question = aiQuestion.value.trim();
            const language = aiLanguage ? aiLanguage.value : "rw";

            if (!question) return;

            if (!currentAiSessionId) {
                aiStatus.textContent =
                    "Complete your video before asking MENYARWANDA AI.";
                return;
            }

            if (question.length > 5000) {
                aiStatus.textContent =
                    "Your question is too long. Please shorten it.";
                return;
            }

            if (Date.now() >= aiExpiresAt) {
                setAIEnabled(false);
                await finishAiLearningSession();
                return;
            }

            addAIMessage(question, "user");
            aiQuestion.value = "";

            aiSendButton.disabled = true;
            aiSendButton.textContent = "Thinking...";

            aiStatus.textContent =
                "MENYARWANDA AI is preparing your answer...";

            try {
                const answer = await sendAIQuestion(question, language);

                addAIMessage(answer, "assistant", language);

                if (currentAiSessionId && Date.now() < aiExpiresAt) {
                    aiStatus.textContent =
                        "MENYARWANDA AI is ready.";
                }

            } catch (error) {
                console.error("MENYARWANDA AI error:", error);

                addAIMessage(
                    "Sorry, I could not answer your question. Please try again.",
                    "assistant"
                );

                aiStatus.textContent =
                    error.message || "MENYARWANDA AI connection failed.";

            } finally {
                aiSendButton.textContent = "Send";

                if (
                    currentAiSessionId &&
                    Date.now() < aiExpiresAt
                ) {
                    aiSendButton.disabled = false;
                    aiQuestion.disabled = false;
                } else {
                    setAIEnabled(false);
                }

                aiQuestion.focus();
            }
        });
    }

    if (!db) {
        showMessage("Database connection is unavailable.");
        return;
    }

    try {
        const { data: sessionData, error: sessionError } =
            await db.auth.getSession();

        if (sessionError) throw sessionError;

        const session = sessionData.session;

        if (!session) {
            window.location.replace("login.html");
            return;
        }

        currentUser = session.user;

        const { data: profile, error: profileError } = await db
            .from("profiles")
            .select("full_name, role")
            .eq("id", currentUser.id)
            .single();

        if (profileError) throw profileError;

        if (profile.role !== "student") {
            window.location.replace("login.html");
            return;
        }

        const name = profile.full_name || "Student";

        studentName.textContent = name;
        welcomeName.textContent = name;

        const headings = document.querySelectorAll(
            "h2.section-heading"
        );

        if (headings[0]) {
            headings[0].textContent = "My Digital Services";
        }

        if (headings[1]) {
            headings[1].textContent = "My Next Learning Video";
        }

        await loadCourses(currentUser.id);

        showMessage("Your dashboard is ready.", "#00c8ff");

        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Logging out...";

            stopHeartbeat();
            stopAiCountdown();

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
            error.message ||
            "Unable to load your dashboard. Please try again."
        );
    }
});
