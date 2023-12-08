import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
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

  @BelongsTo(() => Users, "userId")
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
    allowNull: false,
    defaultValue: "Member"
  })
  type!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: -1
  })
  lastRead!: number
}
