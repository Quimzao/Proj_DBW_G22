// Import express framework
import express from "express";
// Import the chat completion handler from the controller
import { handleChatCompletion } from "../controllers/chatController.js";

// Create a new router instance
const router = express.Router();

// Define a POST route for chat completion requests
router.post("/", handleChatCompletion);

// Export the router to be used in the main app
export default router;