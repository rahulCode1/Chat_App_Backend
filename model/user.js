const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })



UserSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password)
}


const User = mongoose.model("User", UserSchema)
module.exports = User