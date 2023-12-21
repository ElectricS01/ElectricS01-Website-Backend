import {
  BelongsTo,
  Column,
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
    allowNull: false
  })
  userId!: number

  @BelongsTo(() => Users, "userId")
  user!: Users

  @ForeignKey(() => Chats)
  @Column({
    allowNull: false
  })
  chatId!: number

  @BelongsTo(() => Chats, "chatId")
  chat!: Chats

  @Column({
    allowNull: false,
    defaultValue: "Member"
  })
  type!: string

  @Column({
    allowNull: false,
    defaultValue: -1
  })
  lastRead!: number

  @Column({
    defaultValue: 0
  })
  notifications!: number
}
