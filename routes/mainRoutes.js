import express from 'express';
import { getMain } from '../controllers/mainController.js';


const router = express.Router();
router.get('/',getMain); // Render the main page
export default router;