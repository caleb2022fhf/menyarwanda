
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            message: "Method not allowed."
        });
    }

    try {
        const { text, language = "rw" } = req.body || {};

        if (
            typeof text !== "string" ||
            !text.trim() ||
            text.length > 5000
        ) {
            return res.status(400).json({
                message: "Please provide valid text."
            });
        }

        if (language !== "rw") {
            return res.status(400).json({
                message: "This endpoint supports Kinyarwanda only."
            });
        }

        const response = await fetch(
            "https://api.pindo.io/ai/tts/rw/public",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text.trim(),
                    speech_rate: 0.9
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.data?.generated_audio_url) {
            console.error("Pindo TTS error:", data);

            return res.status(502).json({
                message: "Could not generate Kinyarwanda speech."
            });
        }

        const audioUrl = new URL(
            data.data.generated_audio_url,
            "https://api.pindo.io/"
        ).href;

        return res.status(200).json({ audioUrl });

    } catch (error) {
        console.error("MENYARWANDA TTS error:", error);

        return res.status(500).json({
            message: "Text-to-Speech failed."
        });
    }
}
