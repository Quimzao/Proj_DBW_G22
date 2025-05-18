// Import express framework
import express from "express";
// Import controller functions for getting and updating the profile
import { getProfile, updateProfile } from "../controllers/profileController.js";
// Import middleware to check if user is authenticated
import isAuthenticated from "../middleware/loggedIn.js";

// Create a new router instance
const router = express.Router();

// Route to display the profile page, protected by authentication middleware
router.get("/", isAuthenticated, getProfile);

// Route to update the profile, protected by authentication middleware
router.post("/update", isAuthenticated, updateProfile);

// Export the router to be used in the main app
export default router;