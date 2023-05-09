import Sessions from "../models/sessions"
import Users from "../models/users"
import { Response, NextFunction } from "express"
import { RequestUser } from "../types/express"

export default async function (
  req: RequestUser,
  res: Response,
  next: NextFunction
) {
  const authorizationHeader = req.header("Authorization")
  if (!authorizationHeader)
    return res.status(401).send("Access denied. No token provided.")

  const token = authorizationHeader
  if (!token) return res.status(401).send("Access denied. Invalid token.")

  const session = await Sessions.findOne({
    where: { token },
    include: [
      {
        model: Users,
        as: "user"
      }
    ]
  })
  if (!session) return res.status(401).send("Access denied. Invalid token.")

  req.user = session.user
  return next()
}
