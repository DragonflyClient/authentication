const mongoose = require('mongoose')


const PasswordResetSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Number,
        required: true
    }
})

const PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema, "password-resets");

module.exports = PasswordReset;