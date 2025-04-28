import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import isAuthenticated from "../middleware/loggedIn.js";

const router = express.Router();

// Route to display the profile
router.get("/", isAuthenticated, getProfile);

// Route to update the profile
router.post("/update", isAuthenticated, updateProfile);

export default router;