import Sessions from "../models/sessions"
import Users from "../models/users"
import { NextFunction, Response } from "express"
import { RequestUserSession } from "../types/express"

export default async function authSession(
  req: RequestUserSession,
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
  req.session = session
  next()
  return
}
