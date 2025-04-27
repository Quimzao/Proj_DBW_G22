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

export const updateProfile = async (req, res) => {
    try {
        // Logic to update the profile, including image upload and validations
        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/profile');
    }
};