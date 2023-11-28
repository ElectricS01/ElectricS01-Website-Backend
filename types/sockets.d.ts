import User from "models/users"
import { WebSocket } from "ws"
export interface AuthWebSocket extends WebSocket {
  user: User
}
