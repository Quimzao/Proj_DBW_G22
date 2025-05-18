// Import express framework
import express from 'express';
// Import controller functions for intro and lobby pages
import { showIntro, showLobby } from '../controllers/lobbyController.js';
// Import middleware to check if user is authenticated
import userLoggedIn from "../middleware/loggedIn.js";

// Create a new router instance
const router = express.Router();

// Define a GET route for the intro page, protected by authentication middleware
router.get("/intro", userLoggedIn, showIntro);
// Define a GET route for the lobby page, protected by authentication middleware
router.get("/lobby", userLoggedIn, showLobby);
// Define a GET route for the root path, also shows the lobby, protected by authentication middleware
router.get("/", userLoggedIn, showLobby);

// Export the router to be used in the main app
export default router;