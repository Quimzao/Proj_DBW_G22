import User from "../models/user.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Get the current directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Multer configuration for file uploads (profile pictures)
const storage = multer.diskStorage({
    // Set the destination folder for uploads
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../public/uploads/profile-pictures');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure the folder exists
        cb(null, uploadPath);
    },
    // Set the filename for the uploaded file
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer upload middleware with file type and size restrictions
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Only allow image files
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
    }
}).single('profilePicture');

// List of predefined avatar image paths
const DEFAULT_AVATARS = [
    '/images/avatars/avatar1.png',
    '/images/avatars/avatar2.png',
    '/images/avatars/avatar3.png',
    '/images/avatars/avatar4.png',
    '/images/avatars/avatar5.png',
    '/images/avatars/avatar6.png',
    '/images/avatars/avatar7.png',
    '/images/avatars/avatar8.png',
    '/images/avatars/avatar9.png',
    '/images/avatars/avatar10.png',
    '/images/avatars/avatar11.png',
    '/images/avatars/avatar12.png'
];

// Controller to render the profile page, passing user info and available avatars
export const getProfile = (req, res) => {
    res.render('profile', {
        user: req.user,
        DEFAULT_AVATARS
    });
};

// Controller to handle profile updates (username, email, avatar, password)
export const updateProfile = async (req, res) => {
    try {
        // Handle file upload and form data
        upload(req, res, async function (err) {
            if (err) {
                // Handle upload errors (file type, size, etc.)
                console.error('Error during file upload:', err.message);
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({ 
                        success: false, 
                        message: err.message 
                    });
                }
                return res.redirect(`/profile?error=${encodeURIComponent(err.message)}`);
            }

            // Extract form fields from the request
            const { username, email, currentPassword, newPassword, confirmPassword, selectedAvatar } = req.body;
            const user = await User.findById(req.user._id);

            // Update username and email if provided
            user.username = username || user.username;
            user.email = email || user.email;

            // If a predefined avatar is selected, update the profile picture
            if (selectedAvatar && DEFAULT_AVATARS.includes(selectedAvatar)) {
                user.profilePicture = selectedAvatar;
            }

            // If a custom image was uploaded, update the profile picture
            if (req.file) {
                // Remove the previous custom image if it exists and is not a default avatar
                if (user.profilePicture && !DEFAULT_AVATARS.includes(user.profilePicture)) {
                    const oldPath = path.join(__dirname, '../../public', user.profilePicture);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                user.profilePicture = '/uploads/profile-pictures/' + req.file.filename;
            }

            // If a new password is provided, validate and update it
            if (newPassword) {
                // Check if the current password is correct
                if (!(await user.authenticate(currentPassword))) {
                    const message = 'Current password is incorrect';
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(400).json({ success: false, message });
                    }
                    return res.redirect(`/profile?error=${encodeURIComponent(message)}`);
                }

                // Check if the new passwords match
                if (newPassword !== confirmPassword) {
                    const message = 'New passwords do not match';
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(400).json({ success: false, message });
                    }
                    return res.redirect(`/profile?error=${encodeURIComponent(message)}`);
                }

                // Set the new password
                await new Promise((resolve, reject) => {
                    user.setPassword(newPassword, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            }

            // Save the updated user information to the database
            await user.save();

            // Prepare response data for AJAX requests
            const responseData = {
                success: true,
                profilePicture: user.profilePicture,
                username: user.username
            };

            // Update the session with the new user data
            req.login(user, (err) => {
                if (err) {
                    console.error('Error updating session:', err);
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error updating session' 
                        });
                    }
                    return res.redirect(`/profile?error=${encodeURIComponent('Error updating session')}`);
                }

                // If the request is AJAX, send JSON response; otherwise, redirect with success message
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.json(responseData);
                } else {
                    return res.redirect(`/profile?success=${encodeURIComponent('Profile updated successfully')}`);
                }
            });
        });
    } catch (error) {
        // Handle unexpected errors
        console.error('Profile update error:', error.message);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
        return res.redirect(`/profile?error=${encodeURIComponent(error.message)}`);
    }
};