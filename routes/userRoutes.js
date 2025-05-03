import express from "express";
import {
    userGet,
    userPost,
    loginGet,
    loginPostRedirect,
    logout,
    checkUsername
} from "../controllers/userController.js";
import passport from "passport";

const router = express.Router();

// Signup routes
router.get("/signup", userGet);
router.post("/signup", userPost);

// Username availability check (new route)
router.post("/check-username", checkUsername);

// Login routes
router.get("/login", loginGet);
router.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureMessage: true, // Enable failure messages
    }),
    loginPostRedirect
);

// Logout route
router.get("/logout", logout);

export default router;