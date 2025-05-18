import axios from "axios";
import { LM_STUDIO_URL } from "../config/lmStudio.js";

// This function handles chat completion requests using the LM Studio API
export const handleChatCompletion = async (req, res) => {
    try {
        // Extract the prompt sent by the client
        const { prompt } = req.body;

        console.log("Prompt received in backend:", prompt);

        // If no prompt is provided, return a 400 error
        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt is required." });
        }

        // Build the payload to send to the LM Studio API
        const payload = {
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.2-1b-claude-3.7-sonnet-reasoning-distilled", // AI model to use
            max_tokens: 1000, // Maximum number of tokens in the response
            temperature: 0.7, // Controls creativity of the response
            stream: false, // Response is not streamed
        };

        // Log the payload being sent
        console.log("Sending payload to LM Studio:", JSON.stringify(payload, null, 2));

        // Send the POST request to the LM Studio API
        const response = await axios.post(LM_STUDIO_URL, payload, {
            timeout: 30000 // 30 seconds timeout
        });

        // Check if the response has the expected format
        if (!response.data.choices || !response.data.choices[0]) {
            throw new Error("Invalid response format from LM Studio");
        }

        // Extract the generated story from the response
        const story = response.data.choices[0].message.content;
        
        console.log("Story generated successfully");

        // Return the generated story to the client
        res.json({ 
            success: true, 
            choices: [{
                message: { content: story }
            }]
        });

    } catch (error) {
        // Log any error that occurs during the process
        console.error("Error in chat completion:", error.response?.data || error.message);
        let errorMessage = "Error generating story. Please try again.";
        // Specific message for timeout
        if (error.code === 'ECONNABORTED') {
            errorMessage = "The story generation took too long. Please try again.";
        // Specific message for service unavailable
        } else if (error.response?.status === 503) {
            errorMessage = "The AI service is currently unavailable. Please try again later.";
        }

        // Return a 500 error to the client with an appropriate message
        res.status(500).json({
            success: false,
            message: errorMessage,
            technicalError: error.message
        });
    }
};