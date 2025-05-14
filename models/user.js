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
    profilePicture: {
        type: String,
        default: "/images/avatars/avatar1.png", // Default avatar
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    gameHistory: [
        {
            date: { type: Date, default: Date.now },
            roomCode: String,
            prompt: String,
            generatedText: String,
            upvotes: Number,
            downvotes: Number
        }
    ]
});

userSchema.plugin(passportLocalMongoose);

export default mongoose.model("User", userSchema);