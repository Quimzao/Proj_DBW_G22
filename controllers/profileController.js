export const getProfile = (req, res) => {
    res.render('profile', { 
        user: {
            username: req.user.username,
            email: req.user.email,
            profilePic: req.user.profilePicture,
            createdAt: req.user.createdAt
        }
    });
};

import User from "../models/user.js"; // Assuming this is your User model

export const updateProfile = async (req, res) => {
    try {
        const { username, currentPassword, newPassword, confirmPassword } = req.body;

        // Find the user in the database
        const user = await User.findById(req.user._id);

        // Update username if provided and different
        if (username && username !== user.username) {
            user.username = username;
        }

        // Handle password change
        if (currentPassword || newPassword || confirmPassword) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new Error("All password fields are required.");
            }

            // Verify the current password
            const isMatch = await user.authenticate(currentPassword);
            if (!isMatch) {
                throw new Error("Current password is incorrect.");
            }

            // Check if new password matches confirmation
            if (newPassword !== confirmPassword) {
                throw new Error("New password and confirmation do not match.");
            }

            // Update the password (encryption handled by the User model)
            await new Promise((resolve, reject) => {
                user.setPassword(newPassword, (err) => {
                    if (err) return reject(err);
                    console.log("Password updated successfully");
                    resolve();
                });
            });
        }

        // Save the updated user
        await user.save();

        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating profile:", error.message);
        res.redirect("/profile");
    }
};