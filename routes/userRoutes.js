import express from "express";
import {
    userGet,
    userPost,
    loginGet,
    loginPostRedirect,
    logout,
} from "../controllers/userController.js";
import passport from "passport";

const router = express.Router();

router.get("/signup", userGet);
router.post("/signup", userPost);
router.get("/login", loginGet);
router.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureMessage: true, // Enable failure messages
    }),
    loginPostRedirect
);
router.get("/logout", logout);
export default router;
