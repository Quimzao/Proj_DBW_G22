import axios from "axios";
import { LM_STUDIO_URL } from "../config/lmStudio.js";

export const handleChatCompletion = async (req, res) => {
    try {
        const { prompt } = req.body;

        console.log("Prompt received in backend:", prompt);

        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt is required." });
        }

        const payload = {
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.2-1b-claude-3.7-sonnet-reasoning-distilled",
            max_tokens: 1000, // Aumentei para histórias mais longas
            temperature: 0.7,
            stream: false,
        };

        console.log("Sending payload to LM Studio:", JSON.stringify(payload, null, 2));

        const response = await axios.post(LM_STUDIO_URL, payload, {
            timeout: 30000 // 30 segundos timeout
        });

        if (!response.data.choices || !response.data.choices[0]) {
            throw new Error("Invalid response format from LM Studio");
        }

        const story = response.data.choices[0].message.content;
        
        console.log("Story generated successfully");
        res.json({ 
            success: true, 
            response: {
                choices: [{
                    message: { content: story }
                }]
            }
        });

    } catch (error) {
        console.error("Error in chat completion:", error.response?.data || error.message);
        
        // Mensagem mais amigável para o usuário
        let errorMessage = "Error generating story. Please try again.";
        if (error.code === 'ECONNABORTED') {
            errorMessage = "The story generation took too long. Please try again.";
        } else if (error.response?.status === 503) {
            errorMessage = "The AI service is currently unavailable. Please try again later.";
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            technicalError: error.message
        });
    }
};