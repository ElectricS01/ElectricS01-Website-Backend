import argon2 from "argon2"
import { Request, Response } from "express"
import { RequestUser } from "../types/express"

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

export default async function verifyPassword(
  req: RequestUser,
  res: Response
): Promise<boolean> {
  if (!validateString(req, res, "password", "Password")) return false

  if (!(await argon2.verify(req.user.password, req.body.password))) {
    res.status(400).json({
      message: "Incorrect password"
    })
    return false
  }

  return true
}

export const validateUsername = function (
  req: Request,
  res: Response
): boolean {
  if (!validateString(req, res, "username", "Username")) return false

  req.body.username = req.body.username.trim()

  if (req.body.username.length === 0) {
    res.status(400).json({
      message: "Username is required"
    })
    return false
  }

  if (req.body.username.length > 50) {
    res.status(400).json({
      message: "Username is too long"
    })
    return false
  }

  return true
}

export const validatePassword = function (
  req: Request,
  res: Response
): boolean {
  if (!validateString(req, res, "password", "Password")) return false

  req.body.password = req.body.password.trim()

  if (req.body.password.length === 0) {
    res.status(400).json({
      message: "Password is required"
    })
    return false
  }

  if (req.body.password.length > 255) {
    res.status(400).json({
      message: "Password is too long"
    })
    return false
  }

  return true
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
  if (!validateString(req, res, "privateKey", "Private Key")) return false

  req.body.privateKey = req.body.privateKey.trim()

  if (req.body.privateKey.length < 32 || req.body.privateKey.length > 4096) {
    res.status(400).json({
      message: "Invalid private key"
    })
    return false
  }

  return true
}
