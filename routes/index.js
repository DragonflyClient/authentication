var express = require('express');
var router = express.Router();
const nodemailer = require('nodemailer');
const app = require('../app');
const Email = require('../models/Email');
const Account = require('../models/Account');
const md5 = require('md5')
const moment = require('moment');
const { enable } = require('../app');

require('dotenv/config')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('register');
});

// Create verification
router.post('/', async (req, res) => {
  const email = await req.body.email

  const newEmail = new Email({
    email: email,
    code: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    expiresAt: Date.now() + 5 * 60000
  })
  if (!validateEmail(email)) return res.status(400).send({ message: "Please enter a valid email address" })

  Account.findOne({ email: email })
    .then(account => {
      console.log(account)
      if (account) return res.status(400).send({ message: "An account with this email address has already been created" })

      Email.findOne({ email: email })
        .then(email => {
          console.log(email)
          if (email) {
            if (new Date().toISOString() > new Date(email.expiresAt).toISOString()) {
              Email.findOneAndDelete({ email: email })
                .then(console.log('DELETED'))
            } else {
              return res.status(400).send({ emailStatus: email.status, message: "This email address has already been used to sign up" })
            }
          }

          newEmail.save()
            .then(async email => {
              console.log(email)
              console.log(email.code, "CODEE")
              await sendEmail(email.code, email.email)
              res.status(201).send({ message: "Successfully started verification process." })
            })
            .catch(err => console.log(err))
        })
    })
})

// Check email hash and verification code + send back email
router.get('/verify/:email/:code', async (req, res) => {
  const { email, code } = req.params
  console.log(email, code)
  Email.findOne({ code: code })
    .then(async mail => {
      console.log(mail)
      if (!mail) return res.status(400).render("error", { message: "Email not in verification process" }) // res.status(400).send("Email not in verification process", err)
      if (new Date().toISOString() > new Date(mail.expiresAt).toISOString()) {
        await Email.findOneAndDelete({ code: code })
          .catch(err => console.error(err))
        return res.status(400).render("error", { message: "Email verification code expired" }) // Email verification code expired
      }


      Email.findOneAndUpdate({ email: mail.email }, { status: "confirmed" })
        .then(updatedEmail => {
          console.log(updatedEmail)
          res.status(200).render('verify', { email: updatedEmail.email })
        })
    })
})

// Final account creation
router.post('/verify/:email/:code', async (req, res) => {
  const { email, code } = req.params
  const username = req.body.user
  const password = req.body.password

  console.log(req.body)

  Email.findOne({ code: code })
    .then(mail => {
      console.log(mail)
      if (!mail || md5(mail.email) !== email) return res.status(400).render("error", { message: "Email not in verification process" }) // Email not in verification process
      if (new Date().toISOString() > new Date(mail.expiresAt).toISOString()) return res.status(400).render("error", { message: "Email verification code expired" }) // Email verification code expired
      if (mail.status === "confirmed") {
        const newAccount = new Account({
          email: mail.email,
          name: username,
          password
        })
        Account.findOne({ email: mail.email }, async function (err, account) {
          if (err) console.log(error)
          console.log(account)
          if (account) return res.status(400).send("An account with this email has already been created")
          newAccount.save(async function (createdAccount) {
            console.log(createdAccount)
            Email.findOneAndUpdate({ email: mail.email }, { status: "account-created" }, async function (err) {
              if (err) return res.status(500).render("error", { message: "Error while finding email" }) // res.status(500).send("Error while finding email", err)
            })
            res.status(201).render("success", { message: "Registration completed. Account successfully created" }) // res.status(201).send("Registration completed. Account successfully created")
          })
        })
      } else if (mail.status === "account-created") {
        console.log(mail.status)
        res.status(400).render("error", { message: "An account with this email address has already been created" }) // res.status(400).send("An account with this email address has already been created")
      }
    })
})

const drgnNoreplyEmail = {
  user: process.env.DRGN_NOREPLY_EMAIL_USERNAME,
  password: process.env.DRGN_NOREPLY_EMAIL_PASSWORD
}

// Send email with nodemailer
async function sendEmail(code, receiver) {
  console.log(code, "CODE")
  console.log(receiver, 'RECEIVER EMAIL')
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    pool: true,
    host: 'cmail01.mc-host24.de',
    port: 25,
    secure: false, // true for 465, false for other ports
    auth: {
      user: drgnNoreplyEmail.user, // generated ethereal user
      pass: drgnNoreplyEmail.password // generated ethereal password
    }
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: `"Dragonfly" ${drgnNoreplyEmail.user}`, // sender address
    bcc: `${receiver}`, // list of receivers
    subject: 'Account Creation', // Subject line
    text: `Please verify your account.`,
    html: `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <h2>Please verify your account by clicking on the following link</h2>
    Click http://localhost:3000/verify/${md5(receiver)}/${code}
</body>

</html>
` // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('EMAIL SENT')
    console.log(moment().format('MMMM Do YYYY, h:mm:ss a') + " | " + `Message sent! Accepted Emails: ${info.accepted}, Rejected Emails: ${info.rejected}, Message time: ${info.messageTime}`);
  });
}

function validateEmail(email) {
  if (/(.+)@(.+){2,}\.(.+){2,}/.test(email)) {
    console.log("Valid Email", email)
    return true
  } else {
    console.log("Invalid Email", email)
    return false
  }
}

module.exports = router;
