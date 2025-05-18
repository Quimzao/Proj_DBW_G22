// Import express framework
import express from 'express';
// Import the controller function to render the main page
import { getMain } from '../controllers/mainController.js';

// Create a new router instance
const router = express.Router();

// Define a GET route for the root path to render the main page
router.get('/', getMain); // Render the main page

// Export the router to be used in the main app
export default router;