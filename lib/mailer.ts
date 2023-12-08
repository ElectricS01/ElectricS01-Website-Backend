import nodemailer, { Transporter } from "nodemailer"
import config from "../config/main.json"

interface MailOptions {
  from: string
  to: string
  subject: string
  text: string
}

class NodemailerLibrary {
  private transporter: Transporter

  constructor() {
    const options = {
      auth: {
        pass: config.emailPassword,
        user: config.emailUsername
      },
      host: config.emailService,
      port: Number(config.emailPort),
      secure: config.emailSecure === "true"
    }

    this.transporter = nodemailer.createTransport(options)
  }

  sendEmail(
    from: string,
    to: string,
    subject: string,
    text: string
  ): Promise<string> {
    const mailOptions: MailOptions = {
      from,
      subject,
      text,
      to
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

export default NodemailerLibrary
