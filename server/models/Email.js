const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
	uuid: {
		type: String
	},
	email: {
		type: String,
		required: true
	},
	code: {
		type: String,
		required: true
	},
	partner: {
		type: String
	},
	status: {
		type: String,
		required: true,
		default: 'pending'
	},
	expiresAt: {
		type: Number,
		required: true
	}
});

const Email = mongoose.model('Email', EmailSchema, 'email-verification');

module.exports = Email;
