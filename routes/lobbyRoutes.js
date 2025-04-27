import express from 'express';
import { getlobby } from '../controllers/lobbyController.js';
const router = express.Router();
router.get('/', getlobby);
export default router; 