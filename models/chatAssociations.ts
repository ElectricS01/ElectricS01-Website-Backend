import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript"
import Users from "./users"
import Chats from "./chats"

@Table
export default class ChatAssociations extends Model {
  @ForeignKey(() => Users)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number

  @BelongsTo(() => Users, "userID")
  user!: Users

  @ForeignKey(() => Chats)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  chatId!: number

  @BelongsTo(() => Chats, "chatId")
  chat!: Chats

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  type!: number
}
