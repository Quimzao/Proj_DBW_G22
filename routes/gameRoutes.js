import express from 'express';
import { showGame } from '../controllers/gameController.js';

const router = express.Router();

router.get('/', showGame);

export default router;