
"use strict";

const { GoogleGenAI } = require("@google/genai");

const SUPABASE_URL =
    "https://ewqdwmrxklqglqkylxgo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_nx7hYVOX0Tz1-ewVTns7lw_WFwYrhDd";

module.exports = async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    try {
        // Check Supabase login token
        const authorization = req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Please login to use MENYARWANDA AI."
            });
        }

        const accessToken = authorization.slice(7);

        const authResponse = await fetch(
            `${SUPABASE_URL}/auth/v1/user`,
            {
                headers: {
                    apikey: SUPABASE_PUBLISHABLE_KEY,
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        if (!authResponse.ok) {
            return res.status(401).json({
                error: "Your session is invalid. Please login again."
            });
        }

        // Check Gemini API key
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API key is not configured in Vercel."
            });
        }

        const { question, language } = req.body || {};

        if (
            typeof question !== "string" ||
            !question.trim() ||
            question.length > 5000
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

        const selectedLanguage =
            languages[language] || "Kinyarwanda";

        const ai = new GoogleGenAI({
            apiKey: apiKey
        });

        const systemInstruction = `
You are MENYARWANDA AI, a friendly educational assistant
for students and people in Rwanda.

YOUR RESPONSIBILITIES:

1. GREETINGS
- Respond naturally to greetings such as Hello, Hi,
  Muraho, Mwaramutse, Mwiriwe and Bonjour.
- Be polite, friendly and welcoming.

2. RWANDA TRAFFIC LAWS
- Explain road traffic rules in Rwanda.
- Teach road signs, road markings and traffic lights.
- Explain road safety and responsible driving.
- Help students prepare for driving examinations.
- Never invent laws, legal articles, fines or penalties.
- If uncertain about a legal detail, say so and recommend
  checking official Rwanda government sources.

3. EDUCATION
- Explain lessons in simple language.
- Give examples and practice questions.
- Help students understand difficult topics.

4. AGRICULTURE AND LIVESTOCK
- Answer questions about crop farming, soil,
  animal care, livestock feeding and farming practices.
- Give safe and practical educational advice.

5. GENERAL QUESTIONS
- Answer other useful educational questions politely.
- If a question is outside your knowledge, be honest.

LANGUAGE:
Always answer in ${selectedLanguage}.

STYLE:
Use clear explanations, useful examples and a friendly tone.
Do not pretend to be a human.
Do not claim that conversations are saved.
Do not assume previous conversations because every
question is independent.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: question.trim(),
            config: {
                systemInstruction: systemInstruction
            }
        });

        const answer = response.text;

        if (!answer) {
            throw new Error("Gemini returned an empty answer.");
        }

        return res.status(200).json({
            answer: answer
        });

    } catch (error) {

        console.error(
            "MENYARWANDA AI error:",
            error.message
        );

        return res.status(500).json({
            error: "MENYARWANDA AI is temporarily unavailable. Please try again."
        });
    }
};
