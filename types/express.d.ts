import { Request } from "express"
import Sessions from "models/sessions"
import User from "models/users"
export interface RequestUser extends Request {
  user: User
  session: Sessions
}
export interface RequestUserFile extends RequestUser {
  file: Express.Multer.File
}
