import express from 'express';
import { getlobbyfinder } from '../controllers/lobbyfinderController.js';
const router = express.Router();
router.get('/', getlobbyfinder);
export default router; 