import express from "express";
import { handleChatCompletion } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", handleChatCompletion);

export default router;