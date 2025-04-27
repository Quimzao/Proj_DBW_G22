import passport from "passport";
import localStrategy from "passport-local";
import User from "../models/user.js";

const configurePassport = () => {
    passport.use(
        new localStrategy(
            { usernameField: "username" }, // Use "username" for the input field name
            async (username, password, done) => {
                try {
                    // Check if the user exists by email or username
                    const foundUser = await User.findOne({
                        $or: [{ email: username }, { username: username }],
                    });

                    if (!foundUser) {
                        return done(null, false, { message: "Invalid email or username." });
                    }

                    // Use the authenticate method provided by passport-local-mongoose
                    const { user, error } = await User.authenticate()(foundUser.username, password);
                    if (error || !user) {
                        return done(null, false, { message: "Incorrect password." });
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
};

export default configurePassport;