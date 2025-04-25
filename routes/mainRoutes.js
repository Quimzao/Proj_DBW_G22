import express from 'express';
import { getMain } from '../controllers/mainController.js';
import userLoggedIn from "../middleware/loggedIn.js";

const router = express.Router();

router.get("/", userLoggedIn, (req, res) => {
    getMain(req,res); // Render the main page only if logged in
});

export default router;