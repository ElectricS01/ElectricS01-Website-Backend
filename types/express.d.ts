import User from "models/users"
import { Request } from "express"
export interface RequestUser extends Request {
  user: User
}
