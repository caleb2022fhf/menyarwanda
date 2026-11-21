
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
            language = "rw"
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

        // Verify the student's 40-minute server-side learning session
        const sessionResponse = await fetch(
            `${supabaseUrl}/rest/v1/rpc/get_my_learning_session`,
            {
                method: "POST",
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            }
        );

        if (!sessionResponse.ok) {
            console.error(
                "Learning session validation error:",
                await sessionResponse.text()
            );

            return res.status(403).json({
                error: "Your learning session could not be verified. Please login again."
            });
        }

        const sessionData = await sessionResponse.json();

        const session = Array.isArray(sessionData)
            ? sessionData[0]
            : sessionData;

        if (
            !session ||
            session.session_status !== "active" ||
            Number(session.remaining_seconds) <= 0
        ) {
            return res.status(403).json({
                error: "Your 40-minute learning session has expired. Please come back tomorrow."
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

- The student has an active 40-minute learning session.
- The session starts when the student successfully logs in.
- The student can ask questions throughout the entire session.
- The student does NOT need to watch or complete a video before asking questions.
- Help the student learn, understand and practice educational topics.
- Answer questions clearly and patiently.
- Give examples when they help explain the answer.

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
- Do not claim that the student must complete a video first.
- Do not create quizzes or give marks unless the student asks for learning exercises.
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
