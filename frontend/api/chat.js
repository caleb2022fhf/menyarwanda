
"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");

const ALLOWED_ORIGINS = [
    "https://menyarwanda-frontend.vercel.app"
];

module.exports = async function handler(req, res) {
    const origin = req.headers.origin;

    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing.");

            return res.status(500).json({
                error: "AI configuration is missing."
            });
        }

        const { question, language } = req.body || {};

        if (
            typeof question !== "string" ||
            !question.trim() ||
            question.length > 4000
        ) {
            return res.status(400).json({
                error: "Please enter a valid question."
            });
        }

        const languages = {
            rw: "Kinyarwanda",
            en: "English",
            fr: "French"
        };

        const selectedLanguage = languages[language] || "Kinyarwanda";

        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `
You are MENYARWANDA AI, an educational assistant.

Your responsibilities:
1. Greet users politely and naturally.
2. Teach Rwanda traffic laws and road signs.
3. Help students prepare for driving examinations.
4. Explain road safety and driving education.
5. Answer questions about agriculture and livestock.
6. Help students understand their school lessons.

Always answer in ${selectedLanguage}.

Be friendly, accurate, clear and educational.
For Rwanda traffic laws, do not invent legal articles,
penalties or regulations. If uncertain, say so and
recommend checking official Rwanda government sources.

If a user greets you, respond with a friendly greeting.
Do not claim to be a human.
Do not claim that you have saved conversations.
`
        });

        const result = await model.generateContent(question);
        const answer = result.response.text();

        return res.status(200).json({
            answer: answer
        });

    } catch (error) {
        console.error("MENYARWANDA AI request failed:", error.message);

        return res.status(500).json({
            error: "AI service is temporarily unavailable."
        });
    }
};
