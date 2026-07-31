import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  HasOne,
  Model,
  Table
} from "sequelize-typescript"
import ChatAssociations from "./chatAssociations"
import Users from "./users"
import Messages from "./messages"
import { ChatType } from "../types/chat"

@Table
export default class Chats extends Model {
  @Column({
    allowNull: false
  })
  declare name: string

  @Column
  declare description: string

  @Column
  declare icon: string

  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  declare owner: number

  @Column({
    allowNull: false
  })
  declare requireVerification: boolean

  @Column({
    allowNull: false,
    type: DataType.DATE
  })
  declare latest: number

  @Column({
    allowNull: false,
    defaultValue: ChatType.Group,
    type: DataType.INTEGER
  })
  declare type: ChatType

  @HasOne(() => ChatAssociations)
  declare association: ChatAssociations

  @HasMany(() => Messages)
  declare messages: Messages

  @HasMany(() => Messages)
  declare pins: Messages

  @BelongsTo(() => Users, {
    as: "ownerDetails",
    foreignKey: "owner"
  })
  declare ownerDetails: Users

  @Column({
    allowNull: false,
    defaultValue: "Member"
  })
  declare allowInvite: string
}
