const nodemailer = require("nodemailer")
const config = require("../config/main.json")

class nodemailerLibrary {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.emailService,
      auth: {
        user: config.emailUsername,
        pass: config.emailPassword
      },
      port: config.emailPort,
      secure: config.emailSecure
    })
  }

  sendEmail(from, to, subject, text) {
    const mailOptions = {
      from,
      to,
      subject,
      text
    }

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error)
        } else {
          resolve(info)
        }
      })
    })
  }
}

module.exports = nodemailerLibrary
