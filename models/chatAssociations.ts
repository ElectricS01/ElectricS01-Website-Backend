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
  declare userId: number

  @BelongsTo(() => Users, {
    foreignKey: "userId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  declare user: Users

  @ForeignKey(() => Chats)
  @Column({
    allowNull: false
  })
  declare chatId: number

  @BelongsTo(() => Chats, "chatId")
  declare chat: Chats

  @Column({
    allowNull: false,
    defaultValue: "Member"
  })
  declare type: string

  @Column({
    allowNull: false,
    defaultValue: -1
  })
  declare lastRead: number

  @Column({
    defaultValue: 0
  })
  declare notifications: number
}
