import argon2 from "argon2"
import { Response } from "express"
import { RequestUser } from "types/express"

export default async function verifyPassword(
  req: RequestUser,
  res: Response
): Promise<boolean> {
  if (!req.body.password) {
    res.status(400).json({
      message: "Password is required"
    })
    return false
  }

  if (typeof req.body.password !== "string") {
    res.status(400).json({
      message: "Password must be a string"
    })
    return false
  }

  if (!(await argon2.verify(req.user.password, req.body.password))) {
    res.status(400).json({
      message: "Incorrect password"
    })
    return false
  }

  return true
}
