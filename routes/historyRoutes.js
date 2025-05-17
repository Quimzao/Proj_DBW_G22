import express from "express";
import { showHistory } from "../controllers/historyController.js";
import isAuthenticated from "../middleware/loggedIn.js";

const router = express.Router();
router.get("/", isAuthenticated, showHistory);
export default router;