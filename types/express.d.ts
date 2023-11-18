import User from "models/users"
import { Request } from "express"
import Sessions from "../models/sessions"
export interface RequestUser extends Request {
  user: User
}
export interface RequestUserSession extends Request {
  user: User
  session: Sessions
}
