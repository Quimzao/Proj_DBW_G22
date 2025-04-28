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
    '/images/avatars/avatar4.png'
];

export const getProfile = (req, res) => {
    res.render('profile', { 
        user: {
            username: req.user.username,
            email: req.user.email,
            profilePic: req.user.profilePicture || DEFAULT_AVATARS[0],
            createdAt: req.user.createdAt
        }
    });
};

export const updateProfile = async (req, res) => {
    try {
        upload(req, res, async function(err) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('/profile');
            }

            const { username, email, currentPassword, newPassword, confirmPassword } = req.body;
            const user = await User.findById(req.user._id);
            
            // Atualizar informações básicas
            user.username = username || user.username;
            user.email = email || user.email;
            
            // Verificar se foi selecionado um avatar pré-definido
            if (req.body.selectedAvatar && DEFAULT_AVATARS.includes(req.body.selectedAvatar)) {
                // Remover imagem personalizada anterior se existir
                if (user.profilePicture && !DEFAULT_AVATARS.includes(user.profilePicture)) {
                    const oldPath = path.join(__dirname, '../../public', user.profilePicture);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                user.profilePicture = req.body.selectedAvatar;
            }
            
            // Processar upload de imagem personalizada
            if (req.file) {
                // Remover imagem anterior se existir
                if (user.profilePicture && !DEFAULT_AVATARS.includes(user.profilePicture)) {
                    const oldPath = path.join(__dirname, '../../public', user.profilePicture);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                user.profilePicture = '/uploads/profile-pictures/' + req.file.filename;
            }
            
            // Atualizar senha se fornecida
            if (newPassword) {
                if (!(await user.authenticate(currentPassword))) {
                    req.flash('error', 'Current password is incorrect');
                    return res.redirect('/profile');
                }
                
                if (newPassword !== confirmPassword) {
                    req.flash('error', 'New passwords do not match');
                    return res.redirect('/profile');
                }
                
                await new Promise((resolve, reject) => {
                    user.setPassword(newPassword, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            }
            
            await user.save();
            req.flash('success', 'Profile updated successfully');
            res.redirect('/profile');
        });
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error', error.message);
        res.redirect('/profile');
    }
};