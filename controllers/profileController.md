import User from "../models/user.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração do Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../public/uploads/profile-pictures');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('profilePicture');

// Avatares pré-definidos
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

export const getProfile = (req, res) => {
    res.render('profile', {
        user: req.user,
        DEFAULT_AVATARS
    });
};

export const updateProfile = async (req, res) => {
    try {
        upload(req, res, async function (err) {
            if (err) {
                console.error('Error during file upload:', err.message);
                return res.redirect(`/profile?error=${encodeURIComponent(err.message)}`);
            }

            const { username, email, currentPassword, newPassword, confirmPassword, selectedAvatar } = req.body;
            console.log('Selected Avatar:', selectedAvatar);
            const user = await User.findById(req.user._id);

            // Update basic information
            user.username = username || user.username;
            user.email = email || user.email;

            // Check if a predefined avatar was selected
            if (selectedAvatar && DEFAULT_AVATARS.includes(selectedAvatar)) {
                user.profilePicture = selectedAvatar; // Save the selected avatar
            }

            // Process custom image upload
            if (req.file) {
                // Remove previous custom image if it exists
                if (user.profilePicture && !DEFAULT_AVATARS.includes(user.profilePicture)) {
                    const oldPath = path.join(__dirname, '../../public', user.profilePicture);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                user.profilePicture = '/uploads/profile-pictures/' + req.file.filename;
            }

            // Update password if provided
            if (newPassword) {
                if (!(await user.authenticate(currentPassword))) {
                    console.error('Current password is incorrect');
                    return res.redirect(`/profile?error=${encodeURIComponent('Current password is incorrect')}`);
                }

                if (newPassword !== confirmPassword) {
                    console.error('New passwords do not match');
                    return res.redirect(`/profile?error=${encodeURIComponent('New passwords do not match')}`);
                }

                await new Promise((resolve, reject) => {
                    user.setPassword(newPassword, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            }

            await user.save();
            console.log('Profile updated successfully');
            console.log("User profilePicture:", req.user.profilePicture);
            res.redirect(`/profile?success=${encodeURIComponent('Profile updated successfully')}`);
        });
    } catch (error) {
        console.error('Profile update error:', error.message);
        res.redirect(`/profile?error=${encodeURIComponent(error.message)}`);
    }
};