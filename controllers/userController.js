import User from "../models/user.js";

const userGet =(req, res) => {
    res.render('signup');
};

const userPost = async (req, res) => {
    const { email, username, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("A user with this email already exists.");
        }

        const user = new User({ email, username });
        console.log("Signup data received:", req.body);

        await User.register(user, password);
        console.log("User registered successfully");

        res.redirect("/login");
    } catch (err) {
        console.error("Error during User.register:", err);
        res.send("Error during signup. Please try again.");
    }
};

const loginGet = async (req, res) => {
    res.render('login');
};

const loginPostRedirect = (req, res) => {
    if (req.isAuthenticated()) {
        console.log("Login successful for user:", req.user);
        res.redirect("/"); // Redirect to the main page
    } else {
        console.log("Login failed");
        res.redirect("/login"); // Redirect back to login on failure
    }
};

const logout = (req, res, next) => {
    req.logout( function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
}

export { userGet, userPost, loginGet, loginPostRedirect, logout };