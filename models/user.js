var mongoose = require("mongoose");

var userSchema = mongoose.Schema({
    Uname:string,
    Pword:string,
    Email:string,
    Admin:boolean,
});

module.exports = mongoose.model("User", userSchema);