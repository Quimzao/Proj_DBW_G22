// Import express framework
import express from "express";
// Import the controller function to show user history
import { showHistory } from "../controllers/historyController.js";
// Import middleware to check if user is authenticated
import isAuthenticated from "../middleware/loggedIn.js";

// Create a new router instance
const router = express.Router();

// Define a GET route for the history page, protected by authentication middleware
router.get("/", isAuthenticated, showHistory);

// Export the router to be used in the main app
export default router;