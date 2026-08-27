import argon2 from "argon2"
import { Request, Response } from "express"
import { TOTP } from "otpauth"
import { RequestUser } from "../types/express"
import { isEmail } from "validator"
import Chats from "../models/chats"
import ChatAssociations from "../models/chatAssociations"
import Users from "../models/users"

export const validateString = function (
  req: Request,
  res: Response,
  field: string,
  display: string
): boolean {
  if (!req.body[field]) {
    res.status(400).json({
      message: `${display} is required`
    })
    return false
  }

  if (typeof req.body[field] !== "string") {
    res.status(400).json({
      message: `${display} must be a string`
    })
    return false
  }

  return true
}

export const validateStringLength = function (
  req: Request,
  res: Response,
  field: string,
  display: string,
  max: number,
  min: number = 1
): boolean {
  if (!validateString(req, res, field, display)) return false

  req.body[field] = req.body[field].trim()

  if (req.body[field].length < min) {
    res.status(400).json({
      message: `${display} is too short`
    })
    return false
  }

  if (req.body[field].length > max) {
    res.status(400).json({
      message: `${display} is too long`
    })
    return false
  }

  return true
}

export const validateExactLength = function (
  req: Request,
  res: Response,
  field: string,
  display: string,
  length: number
): boolean {
  if (!validateString(req, res, field, display)) return false

  req.body[field] = req.body[field].trim()

  if (req.body[field].length !== length) {
    res.status(400).json({
      message: `${display} must be ${length} characters long`
    })
    return false
  }

  return true
}

export const validateUsername = function (
  req: Request,
  res: Response
): boolean {
  return validateStringLength(req, res, "username", "Username", 50)
}

export const validateEmail = function (req: Request, res: Response): boolean {
  if (!validateString(req, res, "email", "Email")) return false

  req.body.email = req.body.email.trim()

  if (req.body.email.length === 0) {
    res.status(400).json({
      message: "Email is required"
    })
    return false
  }

  if (!isEmail(req.body.email)) {
    res.status(400).json({
      message: "Invalid email"
    })
    return false
  }

  return true
}

export const validatePassword = function (
  req: Request,
  res: Response
): boolean {
  return validateStringLength(req, res, "password", "Password", 255, 4)
}

export const validatePublicKey = function (
  req: Request,
  res: Response
): boolean {
  if (!validateString(req, res, "publicKey", "Public Key")) return false

  req.body.publicKey = req.body.publicKey.trim()

  if (req.body.publicKey.length !== 44) {
    res.status(400).json({
      message: "Invalid public key"
    })
    return false
  }

  return true
}

export const validatePrivateKey = function (
  req: Request,
  res: Response
): boolean {
  return validateStringLength(req, res, "privateKey", "Private Key", 1024, 32)
}

export const isAllowedToMessage = async function (
  req: RequestUser,
  res: Response
): Promise<Chats | undefined> {
  if (!req.body.chatId) {
    res.status(400).json({
      message: "Chat not specified"
    })
    return
  }
  const chat = await Chats.findOne({
    include: [
      {
        model: ChatAssociations,
        required: false,
        where: {
          userId: req.user.id
        }
      }
    ],
    where: {
      id: req.body.chatId
    }
  })

  if (!chat) {
    res.status(400).json({
      message: "Chat does not exist"
    })
    return
  }

  if (!chat.association) {
    res.status(403).json({
      message: "You do not have access to this chat"
    })
    return
  }

  if (chat.requireVerification && !req.user.emailVerified) {
    res.status(400).json({
      message: "User not verified"
    })
    return
  }

  return chat
}

export const verifyUserPassword = async function (
  req: Request,
  res: Response,
  user: Users
): Promise<boolean> {
  if (!validatePassword(req, res)) return false

  if (!(await argon2.verify(user?.password, req.body.password))) {
    res.status(400).json({
      message: "Incorrect password"
    })
    return false
  }

  return true
}

export const verifyPassword = async function (
  req: RequestUser,
  res: Response
): Promise<boolean> {
  return await verifyUserPassword(req, res, req.user)
}

export const verifyUserOtp = function (
  req: Request,
  res: Response,
  user: Users
): boolean {
  if (!user.otpVerified) return true
  if (!validateExactLength(req, res, "token", "2FA code", 6)) return false

  const totp = new TOTP({
    algorithm: "SHA256",
    secret: user.otpSecret
  })

  if (totp.validate({ token: req.body.token, window: 1 }) === null) {
    res.status(401).json({ message: "2FA code is invalid" })
    return false
  }

  return true
}

export const verifyOtp = function (req: RequestUser, res: Response): boolean {
  return verifyUserOtp(req, res, req.user)
}
