import axios from "axios";
import { LM_STUDIO_URL } from "../config/lmStudio.js";

export const handleChatCompletion = async (req, res) => {
    try {
        const { prompt } = req.body; // Extract the prompt from the request body

        console.log("Prompt received in backend:", prompt); // Debugging: Log the prompt

        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt is required." });
        }

        const payload = {
            messages: [
                {
                    role: "user", // The role of the sender (e.g., "user")
                    content: prompt, // The user's input
                },
            ],
            model: "llama-3.2-1b-claude-3.7-sonnet-reasoning-distilled",
            max_tokens: 100,
            temperature: 0.7,
            stream: false,
        };

        console.log("Sending payload to LM Studio:", payload);

        const lmResponse = await axios.post(LM_STUDIO_URL, payload);

        console.log("Response from LM Studio:", lmResponse.data);

        res.json({ success: true, response: lmResponse.data });
    } catch (error) {
        console.error("Error in chat completion:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.error || "Error connecting to LM Studio",
        });
    }
};