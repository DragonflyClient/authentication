const mongoose = require('mongoose')

const AccountSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

const Account = mongoose.model('Account', AccountSchema, "accounts");

module.exports = Account;