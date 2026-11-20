
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API key is missing."
            });
        }

        const supabaseUrl = "https://ewqdwmrxklqglqkylxgo.supabase.co";
        const supabaseKey =
            process.env.SUPABASE_ANON_KEY ||
            "sb_publishable_nx7hYVOX0Tz1-ewVTns7lw_WFwYrhDd";

        const authHeader = req.headers.authorization || "";
        const accessToken = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!accessToken) {
            return res.status(401).json({
                error: "Please login to use MENYARWANDA AI."
            });
        }

        // Verify the student's login
        const authResponse = await fetch(
            `${supabaseUrl}/auth/v1/user`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        if (!authResponse.ok) {
            return res.status(401).json({
                error: "Your login session is invalid. Please login again."
            });
        }

        const user = await authResponse.json();

        if (!user?.id) {
            return res.status(401).json({
                error: "Unable to verify your account."
            });
        }

        const {
            question,
            language = "rw",
            ai_session_id
        } = req.body || {};

        if (
            typeof question !== "string" ||
            !question.trim() ||
            question.length > 5000
        ) {
            return res.status(400).json({
                error: "Please enter a valid question."
            });
        }

        if (
            typeof ai_session_id !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ai_session_id)
        ) {
            return res.status(400).json({
                error: "A valid AI learning session is required."
            });
        }

        // Check that the student has an active AI session
        // and that the 10-minute period has not expired.
        const sessionParams = new URLSearchParams({
            select: "id,student_id,video_id,service_id,expires_at,status",
            id: `eq.${ai_session_id}`,
            student_id: `eq.${user.id}`,
            status: "eq.active",
            expires_at: `gt.${new Date().toISOString()}`,
            limit: "1"
        });

        const sessionResponse = await fetch(
            `${supabaseUrl}/rest/v1/ai_learning_sessions?${sessionParams.toString()}`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json"
                }
            }
        );

        if (!sessionResponse.ok) {
            console.error(
                "AI session validation error:",
                await sessionResponse.text()
            );

            return res.status(500).json({
                error: "Could not verify your AI learning session."
            });
        }

        const sessions = await sessionResponse.json();

        if (!Array.isArray(sessions) || sessions.length === 0) {
            return res.status(403).json({
                error: "Your 10-minute AI learning session has expired or is not active."
            });
        }

        const languages = {
            rw: "Kinyarwanda",
            en: "English",
            fr: "French"
        };

        const selectedLanguage = languages[language] || "Kinyarwanda";

        const systemInstruction = `
You are MENYARWANDA, a friendly and intelligent AI educational assistant.

CURRENT LEARNING SESSION:
- The student has completed watching their assigned daily learning video.
- The student is now in a 10-minute question and answer session.
- Help the student understand things they did not hear, understand,
  or remember from the video.
- Answer questions clearly and patiently.
- Give examples when they help explain the answer.
- Do not generate quizzes, examinations, scores, or marks.
- Do not tell the student that they have passed or failed.
- If a question is unrelated to the learning video, politely guide
  the student back to the topic of the video.

YOUR KNOWLEDGE:
- Explain school subjects, mathematics, science and technology.
- Explain Rwanda traffic laws, road signs and road safety.
- Explain agriculture, crop production and livestock.
- Give practical explanations relevant to Rwanda and East Africa.

ACCURACY:
- Never invent facts, laws, statistics or legal penalties.
- Never invent medical or veterinary medicine dosages.
- Be honest when information is uncertain.
- Ask a useful clarification when necessary.

LANGUAGE:
- Always respond in ${selectedLanguage}.
- Use clear and natural language.
- Do not change language unless requested.

IMPORTANT:
- Answer only the current question.
- Do not assume access to previous conversations.
- Do not claim that conversations are saved.
- Do not create quizzes or give marks.
`;

        const geminiResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" +
            encodeURIComponent(apiKey),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: question.trim() }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1500
                    }
                })
            }
        );

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error("Gemini API error:", data);

            return res.status(502).json({
                error: "MENYARWANDA AI could not process your question."
            });
        }

        const answer = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!answer) {
            return res.status(502).json({
                error: "MENYARWANDA AI returned no answer."
            });
        }

        return res.status(200).json({ answer });

    } catch (error) {
        console.error("MENYARWANDA AI error:", error);

        return res.status(500).json({
            error: "MENYARWANDA AI is temporarily unavailable."
        });
    }
}
