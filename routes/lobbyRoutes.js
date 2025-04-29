import express from 'express';
import { showIntro, showLobby } from '../controllers/lobbyController.js';
import userLoggedIn from "../middleware/loggedIn.js";

const router = express.Router();

router.get("/intro", userLoggedIn, showIntro);
router.get("/lobby", userLoggedIn, showLobby);
router.get("/", userLoggedIn, showLobby);

export default router;