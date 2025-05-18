import User from "../models/user.js";

// Controller function to display the user's game history page
export const showHistory = async (req, res) => {
    // Find the user in the database by their ID from the request
    const user = await User.findById(req.user._id);
    // Render the 'history' view, passing the user and their game history (or an empty array if none)
    res.render('history', { user, history: user.gameHistory || [] });
};