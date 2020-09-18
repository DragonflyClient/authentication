const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Email = require('../models/Email');
const Account = require('../models/Account');
const md5 = require('md5')
const moment = require('moment');
const axios = require('axios').default;
const rateLimit = require('express-rate-limit')

const PROD_EMAIL_URL = "https://playdragonfly.net/register/verify"

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
    expiresAt: Date.now() + 5 * 60000
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
            await sendEmail(newEmail.code, newEmail.email)

            newEmail.save()
              .then(async email => {
                console.log(email)
              })
              .catch(err => console.log(err))

            res.status(201).send({ message: "Successfully started verification process. Please check your emails" })
          } catch (error) {
            res.status(500).send({ message: error.message })
          }
        })
    })
})

// Check email hash and verification code + send back email
router.get('/verify/:email/:code', async (req, res) => {
  const { email, code } = req.params
  Email.findOne({ code: code })
    .then(async mail => {

      if (md5(mail.email) !== email) return res.status(400).send({ message: "Error" })
      if (!mail) return res.status(400).send({ errorId: 48312, message: "Email not in verification process" })
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
    res.send(response.data)
  }).catch(err => {
    console.log(err.response.data)
    res.send(err.response.data)
  })
})


const drgnNoreplyEmail = {
  user: process.env.DRGN_NOREPLY_EMAIL_USERNAME,
  password: process.env.DRGN_NOREPLY_EMAIL_PASSWORD
}

// Send email with nodemailer
function sendEmail(code, receiver) {
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
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email</title>
    <link rel="shortcut icon" href="https://cdn.icnet.dev/web/drgn/assets/img/svg/Dragon.svg" type="image/x-icon">
    <link
        href="https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Rubik:ital,wght@0,400;0,700;1,300;1,400&display=swap"
        rel="stylesheet">
    <style>
        body {
            background-color: #333333;
            color: #ffffff;
            padding: 20px;
            font-family: Rubik, sans-serif;
            font-size: 22px;
        }
        p {
            font-size: 21px;
        }
        h2 {
            font-weight: 500;
            font-size: 26px;
        }
        a {
            color: #EF852E;
        }
        .notice {
          color: gray;
          font-size: 1.1rem;
        }
        .privacy-link {
          color: #EF852E !important;
        }
        .img-cont {
            background-color: #f3f3f3;
            margin: 0 auto;
            width: 100%;
            max-width: 800px;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
        }
        img {
            padding: 10px 20px;
        }
        .text-container {
            width: 100%;
            max-width: 800px;
            height: auto;
            margin: 0 auto;
            background-color: #ffffff;
            color: #333333;
        }
        .text-container .inner {
            padding: 10px 20px;
        }
        .key {
            display: inline-block;
            background-color: #f0eeec;
            color: #8d8a8a;
            padding: 8px 12px;
            font-family: 'Roboto Mono', monospace;
            font-size: 1.1rem;
            box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.25);
        }
        .cta {
            color: #FFFFFF;
            background-color: #EF852E;
            font-size: 20px;
            display: inline-block;
            border-radius: 3px;
            box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.25);
        }
        .cta a {
            color: #ffffff;
            text-decoration: none;
            display: block;
            font-size: 20px;
            padding: 8px 12px;
        }
        footer {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            color: #333333;
            border-bottom-left-radius: 5px;
            border-bottom-right-radius: 5px;
            text-align: center;
        }
        footer p {
            margin: 0;
            margin-top: 10px;
            color: #333333;
        }
        .f-inner {
            padding: 20px;
        }
        .socials {
            padding: 0;
            margin: 0;
        }
        .socials li {
            display: inline-block;
            margin: 10px 15px; 
        }
        footer .socials {
            display: inline-block;
            margin: 0 auto;
            margin-bottom: 15px;
        }
        .socials a {
            color: #646262;
            font-size: 20px;
        }
        
        @media (max-width: 500px) {
            p {
                font-size: 15px;
            }
            h2 {
                font-size: 20px;
            }
            span {
                font-size: 15px;
            }
            .cta a {
                font-size: 16px;
            }
            .socials li {
                margin-bottom: 0;
            }
            .socials a {
                color: #646262;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="img-cont">
            <img class="logo" src="https://cdn.icnet.dev/web/drgn/assets/img/svg/Dragon.png" alt="logo" width="200px">
        </div>
        <div class="text-container">
            <div class="inner">
                <h2>Please verify your email address!</h2>
                <p>In order to complete the registration of your Dragonfly account, you have to verify your email address, you do this by pressing the button below.</p>
                
                <p class="notice">By registering a Dragonfly Account, you accept Inception Cloud's <a class="privacy-link" href="https://inceptioncloud.net/en/privacy">privacy policy</a> and agree that
                  your personal data will be stored indefinitely. Your data will be stored securely and will not be passed on to third parties.</p>
                <br>
                <div class="cta">
                    <a href="${PROD_EMAIL_URL}?r=${md5(receiver)}&c=${code}">Register now</a>
                </div>
            </div>
        </div>
        <footer>
            <div class="f-inner">
                <ul class="socials">
                    <li><a href="https://icnet.dev/insta">
                            Instagram
                        </a></li>
                     &#45;
                    <li><a href="https://icnet.dev/twitter">
                            Twitter
                        </a></li>
                     &#45;
                    <li><a href="https://icnet.dev/discord">
                            Discord
                        </a></li>
                </ul>
                <p>&copy; 2020 Inception Cloud Network
                </p>
            </div>
        </footer>    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/js/all.min.js"></script>
</body>
</html>
` // html body
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

module.exports = router;
