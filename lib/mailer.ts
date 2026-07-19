import nodemailer, { Transporter } from "nodemailer"
import * as process from "node:process"

interface MailOptions {
  from: string
  to: string
  subject: string
  text: string
}

class NodemailerLibrary {
  private transporter: Transporter

  constructor() {
    const options =
      process.env.EMAIL_SERVICE === "smtp.mail.me.com"
        ? {
            auth: {
              pass: process.env.EMAIL_PASSWORD,
              user: process.env.EMAIL_USERNAME
            },
            service: "icloud"
          }
        : {
            auth: {
              pass: process.env.EMAIL_PASSWORD,
              user: process.env.EMAIL_USERNAME
            },
            host: process.env.EMAIL_SERVICE,
            port: Number(process.env.EMAIL_PORT),
            secure: process.env.EMAIL_SECURE === "true"
          }

    this.transporter = nodemailer.createTransport(options)
  }

  async sendEmail(from: string, to: string, subject: string, text: string) {
    const mailOptions: MailOptions = {
      from,
      subject,
      text,
      to
    }

    return await this.transporter.sendMail(mailOptions)
  }
}

export default NodemailerLibrary
