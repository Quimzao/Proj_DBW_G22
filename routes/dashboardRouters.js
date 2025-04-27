import express from 'express';
import { getdashboard } from '../controllers/dashboardController.js';
const router = express.Router();
router.get('/', getdashboard);
export default router; 