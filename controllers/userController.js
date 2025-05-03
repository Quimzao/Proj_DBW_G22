import User from "../models/user.js";

const userGet = (req, res) => {
    res.render('signup');
};

const userPost = async (req, res) => {
    const { email, username, password } = req.body;
    
    // Check if required fields are present
    if (!email || !username || !password) {
        return res.status(400).send("All fields are required.");
    }

    // Server-side password validation
    const hasMinLength = password.length >= 8;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasMinLength || !hasSpecialChar) {
        return res.status(400).send("Password must be at least 8 characters long and contain special characters.");
    }

    try {
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).send("A user with this email already exists.");
            } else {
                return res.status(400).send("A user with this username already exists.");
            }
        }

        const user = new User({ email, username });
        await User.register(user, password);
        
        res.sendStatus(200);
    } catch (err) {
        console.error("Error during User.register:", err);
        res.status(500).send("Error during signup. Please try again.");
    }
};

const checkUsername = async (req, res) => {
    try {
        const { username, email } = req.body;
        
        // Check if we're checking username or email
        if (username) {
            const existingUser = await User.findOne({ username });
            return res.json({ exists: !!existingUser, field: 'username' });
        } else if (email) {
            const existingUser = await User.findOne({ email });
            return res.json({ exists: !!existingUser, field: 'email' });
        }
        
        res.status(400).json({ error: "No field to check provided" });
    } catch (err) {
        console.error("Error checking user:", err);
        res.status(500).json({ error: "Error checking user" });
    }
};

const loginGet = async (req, res) => {
    res.render('login');
};

const loginPostRedirect = (req, res) => {
    if (req.isAuthenticated()) {
        console.log("Login successful for user:", req.user);
        res.redirect("/intro");
    } else {
        console.log("Login failed");
        res.redirect("/login");
    }
};

const logout = (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
}

export { userGet, userPost, loginGet, loginPostRedirect, logout, checkUsername };