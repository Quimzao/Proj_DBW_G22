import express from 'express';
import { showIntro, showLobby } from '../controllers/lobbyController.js';
import userLoggedIn from "../middleware/loggedIn.js";

const router = express.Router();

router.get("/intro", userLoggedIn, showIntro);
// Adicione esta nova rota
router.get("/lobby", userLoggedIn, showLobby);
// Mantenha a rota raiz se necessário
router.get("/", userLoggedIn, showLobby);

export default router;