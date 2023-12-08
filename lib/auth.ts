import { NextFunction, Response } from "express"
import { RequestUser } from "../types/express"
import Sessions from "../models/sessions"
import Users from "../models/users"

export default async function auth(
  req: RequestUser,
  res: Response,
  next: NextFunction
) {
  const token = req.header("Authorization")
  if (!token) return res.status(401).send("Access denied. No token provided.")
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
    return next()
  }
  req.user = session.user
  return next()
}
