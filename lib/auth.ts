import Sessions from "../models/sessions"
import Users from "../models/users"
import { NextFunction, Response } from "express"
import { RequestUser } from "../types/express"

export default async function (
  req: RequestUser,
  res: Response,
  next: NextFunction
) {
  const token = req.header("Authorization")
  if (!token) return res.status(401).send("Access denied. No token provided.")
  const session = await Sessions.findOne({
    where: { token },
    include: [
      {
        model: Users,
        as: "user"
      }
    ]
  })
  if (!session || !session.user)
    return res.status(401).send("Access denied. Invalid token.")
  req.user = session.user
  return next()
}
