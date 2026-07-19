import NodemailerLibrary from "./mailer"

const emailLibrary = new NodemailerLibrary()

export default async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
) {
  try {
    await emailLibrary.sendEmail(
      "ElectricS01.com <support@electrics01.com>",
      email,
      `Hi ${username}, Verify your email address`,
      `Hi ${username},\nPlease click the link below to verify your email address:\nhttps://electrics01.com/verify?token=${token}\n\nIf you did not request this email, please ignore it.\n\nThanks,\nElectrics01 Support Team`
    )
  } catch (e) {
    console.log("Error occurred while sending email:", e)
  }
}
