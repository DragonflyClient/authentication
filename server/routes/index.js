const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const Email = require('../models/Email');
const Account = require('../models/Account');
const PasswordReset = require('../models/PasswordReset')

const md5 = require('md5')
const moment = require('moment');
const axios = require('axios').default;
const rateLimit = require('express-rate-limit')
const { nanoid } = require('nanoid')

const PROD_EMAIL_URL = "https://playdragonfly.net/register/verify"
const PROD_PW_RESET_URL = "https://playdragonfly.net/new-password"

require('dotenv/config')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('register');
});

// Create verification
router.post('/register', rateLimit({ windowMs: 60 * 1000, max: 7, message: { status: 429, message: "Too many requests. Please try again later.", } }), async (req, res) => {
  const email = await req.body.email

  const newEmail = new Email({
    email: email,
    code: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    expiresAt: Date.now() + 10 * 60000
  })
  if (!validateEmail(email)) return res.status(400).send({ message: "Please enter a valid email address" })

  Account.findOne({ email: email })
    .then(account => {
      console.log(account)
      if (account) return res.status(400).send({ message: "An account with this email address has already been created" })

      Email.findOne({ email: email })
        .then(async email => {
          console.log(email)
          if (email) {
            if (new Date().toISOString() > new Date(email.expiresAt).toISOString() && email.status === "pending") {
              Email.findOneAndDelete({ email: email, status: "pending" })
                .catch(err => {
                  console.log(err)
                  res.send(err)
                })
            } else {
              return res.status(400).send({ emailStatus: email.status, message: "This email address has already been used to sign up. If you think this is an error, please contact our support." })
            }
          }

          try {
            console.log(newEmail.code, newEmail.email, "pre-send")
            await sendEmail(newEmail.code, newEmail.email)

            newEmail.save()
              .then(async email => {
                console.log(email)
              })
              .catch(err => console.log(err))

            res.status(201).send({ message: "Successfully started verification process. If you have not received an email within the next 7 minutes, please try again or contact support." })
          } catch (error) {
            res.status(500).send({ message: error.message })
          }
        })
    })
})

// Check email hash and verification code + send back email
router.get('/verify/:email/:code', async (req, res) => {
  const { email, code } = req.params
  console.log(email, code, "PREE")
  Email.findOne({ code: code })
    .then(async mail => {
      console.log(mail, "FULL MAIl")

      if (!mail) return res.status(400).send({ errorId: 48312, message: "Email not in verification process" })
      if (md5(mail.email) !== email) return res.status(400).send({ message: "Error" })
      if (mail.status === "pending") {
        if (new Date().toISOString() > new Date(mail.expiresAt).toISOString()) {
          await Email.findOneAndDelete({ code: code })
            .catch(err => console.error(err))
          return res.status(400).send({ errorId: 22836, message: "Email verification code expired" }) // Email verification code expired
        }

        Email.findOneAndUpdate({ email: mail.email }, { status: "confirmed" })
          .then(updatedEmail => {
            console.log(updatedEmail)
            res.status(200).send({ email: updatedEmail.email })
            // res.status(200).render('verify', { email: updatedEmail.email })
          })
      } else if (mail.status === "confirmed") {
        res.status(200).send({ email: mail.email })
      } else if (mail.status === "account_created") {
        res.status(500).send({ errorId: 34718, message: "Account already created" })
      }

    })
})

// Final account creation
router.post('/verify/:email/:code', rateLimit({ windowMs: 60 * 1000, max: 10, message: { status: 429, message: "Too many requests. Please try again later.", } }), async (req, res) => {
  const { code } = req.params
  const email = req.body.email
  const username = req.body.user
  const password = req.body.password

  console.log(req.body, code, email)
  axios.post("https://api.playdragonfly.net/v1/authentication/register", {
    email: email,
    code: code,
    username: username,
    password: password
  }).then(response => {
    console.log(response.data)
    if (response.status === 200 && response.data.success)
      res.cookie('dragonfly-token', response.data.token, { httpOnly: true, secure: true, expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), domain: "playdragonfly.net", path: '/', sameSite: "lax" });
    res.send({ successId: 45834, message: "Account successfully created", data: response.data })
  }).catch(err => {
    console.log(err.response.data)
    res.send(err.response.data)
  })
})

// Send reset email
router.post('/reset-password/:email', rateLimit({ windowMs: 60 * 1000, max: 5, message: { status: 429, message: "Too many requests. Please try again later.", } }), async (req, res) => {
  const { email } = req.params
  console.log(email)

  const resetCode = nanoid()
  console.log(resetCode, "code")

  const newPasswordReset = new PasswordReset({
    email: email,
    code: resetCode,
    expiresAt: Date.now() + 5 * 60000
  })

  const accountResult = await Account.findOne({ email: email })
  const passwordResetResult = await PasswordReset.findOne({ email: email })
  console.log(passwordResetResult)
  if (accountResult && accountResult.email) {
    if (!passwordResetResult) {

      const resetSave = await newPasswordReset.save()
      console.log(resetSave)
      await sendEmail(resetCode, accountResult.email, "reset")
      res.send({ message: 'Success', email: accountResult.email })

    } else if (new Date().toISOString() > new Date(passwordResetResult.expiresAt).toISOString()) {
      console.log(new Date().toISOString() > new Date(passwordResetResult.expiresAt).toISOString(), new Date().toISOString(), new Date(passwordResetResult.expiresAt).toISOString())
      const pwResult = await PasswordReset.findOne({ email: email })

      if (pwResult) {
        await PasswordReset.findOneAndDelete({ email: pwResult.email })
        const savedPasswordReset = await newPasswordReset.save()
        await sendEmail(resetCode, accountResult.email, "reset")
        res.send({ message: 'Successfully created reset link', email: savedPasswordReset.email })
      }
    } else {
      res.send({ error: "Already sent password reset link" })
    }
  } else {
    res.send({ error: `Account with email "${email}" not found` })
  }
})

// Validate link
router.get('/reset-password/:email/:code', async (req, res) => {
  const { email, code } = req.params
  const passwordReset = await PasswordReset.findOne({ code: code })
  if (passwordReset) {
    if (md5(passwordReset.email) !== email) return res.status(400).send({ errorId: 38942, message: "An internal exception occurred. Please try again later" })
    if (new Date().toISOString() > new Date(passwordReset.expiresAt).toISOString()) return res.status(400).send({ errorId: 28476, message: "Password reset link expired." })
    return res.status(200).send({ message: "Reset link valid", email: passwordReset.email })
  } else {
    res.status(400).send({ errorId: 98434, message: "Reset link invalid" })
  }
})


// Set new password
router.post('/new-password/:email/:code', async (req, res) => {
  const { email, code } = req.params
  const password = req.body.password
  console.log(req.body)
  const passwordReset = await PasswordReset.findOne({ code: code })
  if (passwordReset) {
    if (md5(passwordReset.email) !== email) return res.status(400).send({ errorId: 38942, message: "An internal exception occurred. Please try again later" })
    if (new Date().toISOString() > new Date(passwordReset.expiresAt).toISOString()) return res.status(400).send({ errorId: 28476, message: "Password reset link expired." })

    console.log(email, code, password)
    if (!validatePassword(password)) return res.status(200).send({ error: "The password must have between 10 and 30 characters" })
    const hash = bcrypt.hashSync(password, 12)
    const updatedAccount = await Account.findOneAndUpdate({ email: passwordReset.email }, { password: hash })
    const deletePasswordReset = await PasswordReset.findOneAndDelete({ email: passwordReset.email })
    console.log(password, hash)
    console.log(deletePasswordReset, "DELETE PW RESET")
    res.send({ successId: 21734, message: "Successfully updated account", updatedAccount })
  } else {
    res.status(400).send({ errorId: 98434, message: "Reset link invalid" })
  }
})

const drgnNoreplyEmail = {
  user: process.env.DRGN_NOREPLY_EMAIL_USERNAME,
  password: process.env.DRGN_NOREPLY_EMAIL_PASSWORD
}

// Send email with nodemailer
function sendEmail(code, receiver, emailType) {
  return new Promise((resolve, reject) => {

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

    const passwordReset = `
    <!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>Email</title> <link rel="shortcut icon" href="https://cdn.icnet.dev/web/drgn/assets/img/svg/Dragon.svg" type="image/x-icon"> <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Rubik:ital,wght@0,400;0,700;1,300;1,400&display=swap" rel="stylesheet"> <style>body{background-color: #333333; color: #ffffff; padding: 20px; font-family: Rubik, sans-serif; font-size: 22px;}p{font-size: 21px;}h2{font-weight: 500; font-size: 26px;}a{color: #EF852E !important;}.notice{color: gray; font-size: 1.1rem;}.privacy-link{color: #EF852E !important;}.img-cont{background-color: #f3f3f3; margin: 0 auto; width: 100%; max-width: 800px; border-top-left-radius: 5px; border-top-right-radius: 5px;}img{padding: 10px 20px;}.text-container{width: 100%; max-width: 800px; height: auto; margin: 0 auto; background-color: #ffffff; color: #333333;}.text-container .inner{padding: 10px 20px;}.key{display: inline-block; background-color: #f0eeec; color: #8d8a8a; padding: 8px 12px; font-family: 'Roboto Mono', monospace; font-size: 1.1rem; box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.25);}.cta{color: #FFFFFF; background-color: #EF852E; font-size: 20px; display: inline-block; border-radius: 3px; box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.25);}.cta a{color: #ffffff; text-decoration: none; display: block; font-size: 20px; padding: 8px 12px;}footer{width: 100%; max-width: 800px; margin: 0 auto; color: #333333; border-bottom-left-radius: 5px; border-bottom-right-radius: 5px; text-align: center;}footer p{margin: 0; margin-top: 10px; color: #333333;}.f-inner{padding: 20px;}.socials{padding: 0; margin: 0;}.socials li{display: inline-block; margin: 10px 15px;}footer .socials{display: inline-block; margin: 0 auto; margin-bottom: 15px;}.socials a{color: #646262; font-size: 20px;}@media (max-width: 500px){p{font-size: 15px;}h2{font-size: 20px;}span{font-size: 15px;}.cta a{font-size: 16px;}.socials li{margin-bottom: 0;}.socials a{color: #646262; font-size: 16px;}}</style></head><body> <div class="wrapper"> <div class="img-cont"> <img class="logo" src="https://cdn.icnet.dev/web/drgn/assets/img/svg/Dragon.png" alt="logo" width="200px"> </div><div class="text-container"> <div class="inner"> <h2>Reset password!</h2> <p> Don't worry, you can reset your Dragonfly password by clicking the link below: <a href="${PROD_PW_RESET_URL}?r=${md5(receiver)}&c=${code}">Reset password</a> <br><br>If you have not requested to reset your password, simply delete this email and continue enjoying your music! <br>Best wishes The Dragonfly team </p></div></div><footer> <div class="f-inner"> <ul class="socials"> <li><a href="https://icnet.dev/insta"> Instagram </a></li>&#45; <li><a href="https://icnet.dev/twitter"> Twitter </a></li>&#45; <li><a href="https://icnet.dev/discord"> Discord </a></li></ul> <p>&copy; 2020 Inception Cloud Network </p></div></footer> </div><script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/js/all.min.js"></script></body></html>
    `
    const subjectPasswordReset = "Password reset"

    const verifyAccount = `
    <!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>Email</title> <link rel="shortcut icon" href="https://cdn.icnet.dev/web/drgn/assets/img/svg/Dragon.svg" type="image/x-icon"> <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Rubik:ital,wght@0,400;0,700;1,300;1,400&display=swap" rel="stylesheet"> <style>body{background-color: #333333; color: #ffffff; padding: 20px; font-family: Rubik, sans-serif; font-size: 22px;}p{font-size: 21px;}h2{font-weight: 500; font-size: 26px;}a{color: #EF852E;}.notice{color: gray; font-size: 1.1rem;}.privacy-link{color: #EF852E !important;}.img-cont{background-color: #f3f3f3; margin: 0 auto; width: 100%; max-width: 800px; border-top-left-radius: 5px; border-top-right-radius: 5px;}img{padding: 10px 20px;}.text-container{width: 100%; max-width: 800px; height: auto; margin: 0 auto; background-color: #ffffff; color: #333333;}.text-container .inner{padding: 10px 20px;}.key{display: inline-block; background-color: #f0eeec; color: #8d8a8a; padding: 8px 12px; font-family: 'Roboto Mono', monospace; font-size: 1.1rem; box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.25);}.cta{color: #FFFFFF; background-color: #EF852E; font-size: 20px; display: inline-block; border-radius: 3px; box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.25);}.cta a{color: #ffffff; text-decoration: none; display: block; font-size: 20px; padding: 8px 12px;}footer{width: 100%; max-width: 800px; margin: 0 auto; color: #333333; border-bottom-left-radius: 5px; border-bottom-right-radius: 5px; text-align: center;}footer p{margin: 0; margin-top: 10px; color: #333333;}.f-inner{padding: 20px;}.socials{padding: 0; margin: 0;}.socials li{display: inline-block; margin: 10px 15px;}footer .socials{display: inline-block; margin: 0 auto; margin-bottom: 15px;}.socials a{color: #646262; font-size: 20px;}@media (max-width: 500px){p{font-size: 15px;}h2{font-size: 20px;}span{font-size: 15px;}.cta a{font-size: 16px;}.socials li{margin-bottom: 0;}.socials a{color: #646262; font-size: 16px;}}</style></head><body> <div class="wrapper"> <div class="img-cont"> <img class="logo" src="https://cdn.icnet.dev/web/drgn/assets/img/svg/Dragon.png" alt="logo" width="200px"> </div><div class="text-container"> <div class="inner"> <h2>Please verify your email address!</h2> <p>In order to complete the registration of your Dragonfly account, you have to verify your email address, you do this by pressing the button below.</p><p class="notice">By registering a Dragonfly Account, you accept Inception Cloud's <a class="privacy-link" href="https://inceptioncloud.net/en/privacy">privacy policy</a> and agree that your personal data will be stored indefinitely. Your data will be stored securely and will not be passed on to third parties.</p><br><div class="cta"> <a href="${PROD_EMAIL_URL}?r=${md5(receiver)}&c=${code}">Register now</a> </div></div></div><footer> <div class="f-inner"> <ul class="socials"> <li><a href="https://icnet.dev/insta"> Instagram </a></li>&#45; <li><a href="https://icnet.dev/twitter"> Twitter </a></li>&#45; <li><a href="https://icnet.dev/discord"> Discord </a></li></ul> <p>&copy; 2020 Inception Cloud Network </p></div></footer> </div><script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/js/all.min.js"></script></body></html>
    `
    const subjectVerifyAccount = "Account creation"

    let email = verifyAccount;
    let subject = subjectVerifyAccount

    if (emailType === "reset") {
      email = passwordReset;
      subject = subjectPasswordReset
    } else {
      subject = subjectVerifyAccount
    }
    console.log(subject + " | Subject | " + emailType + " | Email type")

    // setup email data with unicode symbols
    let mailOptions = {
      from: `"Dragonfly" ${drgnNoreplyEmail.user}`, // sender address
      to: `${receiver}`, // list of receivers
      subject: subject, // Subject line
      text: `Please verify your account or reset your password. At ${PROD_EMAIL_URL}?r=${md5(receiver)}&c=${code}`,
      html: email

      // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("ERROR")
        reject(error)
        return
      }
      console.log('EMAIL SENT')
      console.log(moment().format('MMMM Do YYYY, h:mm:ss a') + " | " + `Message sent! Accepted Emails: ${info.accepted}, Rejected Emails: ${info.rejected}, Message time: ${info.messageTime}`);
      resolve()
    });
  })
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

function validatePassword(pw) {
  const password = pw.toString().length
  if (password >= 10 && password <= 30) {
    return true
  } else {
    return false
  }
}

module.exports = router;
