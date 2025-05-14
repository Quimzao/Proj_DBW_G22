import User from "../models/user.js";

export const showHistory = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('history', { user, history: user.gameHistory || [] });
};