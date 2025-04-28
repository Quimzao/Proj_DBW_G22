import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    profilePic: {
        type: String,
        default: function() {
            const avatars = [
                '/images/avatars/avatar1.png',
                '/images/avatars/avatar2.png',
                '/images/avatars/avatar3.png',
                '/images/avatars/avatar4.png'
            ];
            return avatars[Math.floor(Math.random() * avatars.length)];
        }
    },
});

userSchema.plugin(passportLocalMongoose);

export default mongoose.model("User", userSchema);