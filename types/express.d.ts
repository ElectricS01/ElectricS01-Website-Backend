import { Request } from "express"
import Sessions from "models/sessions"
import User from "models/users"
export interface RequestUser extends Request {
  user: User
}
export interface RequestUserSession extends Request {
  session: Sessions
}
