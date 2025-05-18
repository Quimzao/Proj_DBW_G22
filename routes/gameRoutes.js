// Import express framework
import express from 'express';
// Import the showGame controller function
import { showGame } from '../controllers/gameController.js';

// Create a new router instance
const router = express.Router();

// Define a GET route for the game page
router.get('/', showGame);

// Export the router to be used in the main app
export default router;