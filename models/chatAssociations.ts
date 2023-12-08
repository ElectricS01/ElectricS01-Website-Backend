import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Chats from "./chats"
import Users from "./users"

@Table
export default class ChatAssociations extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false,
    type: DataType.INTEGER
  })
  userId!: number

  @BelongsTo(() => Users, "userId")
  user!: Users

  @ForeignKey(() => Chats)
  @Column({
    allowNull: false,
    type: DataType.INTEGER
  })
  chatId!: number

  @BelongsTo(() => Chats, "chatId")
  chat!: Chats

  @Column({
    allowNull: false,
    defaultValue: "Member",
    type: DataType.STRING
  })
  type!: string

  @Column({
    allowNull: false,
    defaultValue: -1,
    type: DataType.STRING
  })
  lastRead!: number
}
