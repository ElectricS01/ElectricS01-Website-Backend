import { NextFunction, Response } from "express"
import { RequestUser } from "../types/express"
import Sessions from "../models/sessions"
import Users from "../models/users"
import cryptoRandomString from "crypto-random-string"

const SESSION_LENGTH_MS = 30 * 24 * 60 * 60 * 1000

export const createSession = async (
  userId: number,
  userAgent: string
): Promise<Sessions> =>
  await Sessions.create({
    expiresAt: new Date(Date.now() + SESSION_LENGTH_MS),
    token: cryptoRandomString({ length: 128 }),
    userAgent,
    userId
  })

export default async function auth(
  req: RequestUser,
  res: Response,
  next: NextFunction
) {
  const token = req.header("Authorization")
  if (!token) {
    res.status(401).send("Access denied. No token provided.")
    return
  }
  const session = await Sessions.findOne({
    include: [
      {
        as: "user",
        model: Users
      }
    ],
    where: { token }
  })
  if (!session || !session.user) {
    res.status(401).send("Access denied. Invalid token.")
    return
  }

  if (session.expiresAt && session.expiresAt < new Date()) {
    await session.destroy()
    res.status(401).send("Access denied. Token expired.")
    return
  }

  req.user = session.user
  req.session = session
  next()
  return
}
