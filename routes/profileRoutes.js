import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import ensureAuthenticated from "../middleware/loggedIn.js";

const router = express.Router();

// Route to display the profile
router.get("/", ensureAuthenticated, getProfile);

// Route to update the profile
router.post("/update", ensureAuthenticated, updateProfile);

export default router;