import express from 'express';
import { getMain } from '../controllers/mainContoller.js';
const router = express.Router();
router.get('/', getMain);
export default router; 