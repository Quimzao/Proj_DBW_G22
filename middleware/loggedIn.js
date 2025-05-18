// Middleware to check if the user is authenticated
const userLoggedIn = (req, res, next) => {
    // If the user is not authenticated, redirect to the home (login) page
    if (!req.isAuthenticated()) {
        console.log("Nope, access denied!"); // Log for debugging
        return res.redirect("/");
    }
    // If authenticated, proceed to the next middleware or route handler
    next();
};

export default userLoggedIn;