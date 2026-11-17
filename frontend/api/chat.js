
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

        const authHeader = req.headers.authorization || "";
        const accessToken = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!accessToken) {
            return res.status(401).json({
                error: "Please login to use MENYARWANDA AI."
            });
        }

        const authResponse = await fetch(
            "https://ewqdwmrxklqglqkylxgo.supabase.co/auth/v1/user",
            {
                headers: {
                    "apikey": "sb_publishable_nx7hYVOX0Tz1-ewVTns7lw_WFwYrhDd",
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

        if (!authResponse.ok) {
            return res.status(401).json({
                error: "Your login session is invalid. Please login again."
            });
        }

        const { question, language = "rw" } = req.body || {};

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

        const selectedLanguage = languages[language] || "Kinyarwanda";

        const systemInstruction = `
You are MENYARWANDA, a friendly and intelligent AI educational assistant.

PERSONALITY:
- Greet users naturally.
- Be friendly, respectful and conversational.
- Answer general knowledge questions.
- Introduce yourself as MENYARWANDA when asked.

YOUR ABILITIES:

1. SCHOOL LEARNING:
- Help students understand school subjects.
- Explain mathematics, science, technology, languages and other subjects.
- Provide examples and step-by-step explanations.
- Create revision questions, exercises and answers.
- Help students prepare for examinations.
- Use simple explanations suitable for the learner.

2. RWANDA DRIVING EDUCATION:
- Explain Rwanda traffic laws and road signs.
- Teach road safety and driving rules.
- Help students prepare for driving examinations.
- Never invent legal articles, fines or penalties.
- Give priority to official Rwanda driving documents.
- State clearly when an exact legal rule is uncertain.

3. AGRICULTURE:
- Explain crop production, planting, irrigation, soil fertility,
  fertilizers, pests, diseases, harvesting and storage.
- Give practical advice relevant to Rwanda and East Africa.
- Never invent pesticide doses or fertilizer application rates.

4. LIVESTOCK:
- Explain cattle, goats, sheep, pigs, poultry, rabbits,
  fish farming and beekeeping.
- Explain feeding, breeding, housing and disease prevention.
- Recommend a veterinarian for serious animal diseases.
- Never invent veterinary medicine dosages.

5. AGRICULTURAL BUSINESS:
- Help users plan farming projects.
- Explain budgets, production costs, marketing and profitability.

ACCURACY:
- Never invent facts, laws, statistics or medical/veterinary doses.
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
