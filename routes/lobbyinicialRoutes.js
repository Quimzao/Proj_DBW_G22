import express from 'express';
import { getlobbyinicial } from '../controllers/lobbyinicialController.js';
const router = express.Router();
router.get('/', getlobbyinicial);
export default router;