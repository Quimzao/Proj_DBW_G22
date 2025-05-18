// Import express framework
import express from "express";
// Import controller functions for user authentication and management
import {
    userGet,
    userPost,
    loginGet,
    loginPostRedirect,
    logout,
    checkUsername
} from "../controllers/userController.js";
// Import passport for authentication
import passport from "passport";

// Create a new router instance
const router = express.Router();

// Signup routes
router.get("/signup", userGet);         // Show signup page
router.post("/signup", userPost);       // Handle signup form submission

// Username availability check (new route)
router.post("/check-username", checkUsername); // Check if username is available (AJAX)

// Login routes
router.get("/login", loginGet);         // Show login page
router.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/login",      // Redirect to login page on failure
        failureMessage: true,           // Enable failure messages
    }),
    loginPostRedirect                   // Redirect on successful login
);

// Logout route
router.get("/logout", logout);          // Log the user out

// Export the router to be used in the main app
export default router;