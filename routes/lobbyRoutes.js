import express from 'express';
import { getlobby } from '../controllers/lobbyController.js';
import userLoggedIn from "../middleware/loggedIn.js";

const router = express.Router();

router.get("/", userLoggedIn, (req, res) => {
    getlobby(req,res); // Render the main page only if logged in
});

export default router; 