const mongoose = require('mongoose')

const EmailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: "pending"
    },
    expiresAt: {
        type: Number,
        required: true
    }
})

const Email = mongoose.model('Email', EmailSchema, "emails");

module.exports = Email;