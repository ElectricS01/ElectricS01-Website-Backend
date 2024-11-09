import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  HasMany,
  Model,
  Table
} from "sequelize-typescript"
import ChatAssociations from "./chatAssociations"
import Users from "./users"
import Messages from "./messages"

@Table
export default class Chats extends Model {
  @Column({
    allowNull: false
  })
  name!: string

  @Column
  description!: string

  @Column
  icon!: string

  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  owner!: number

  @Column({
    allowNull: false
  })
  requireVerification!: boolean

  @Column({
    allowNull: false,
    type: DataType.DATE
  })
  latest!: number

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  type!: number

  @HasOne(() => ChatAssociations)
  association!: ChatAssociations

  @HasMany(() => Messages)
  messages!: Messages

  @HasMany(() => Messages)
  pins!: Messages

  @BelongsTo(() => Users, {
    as: "ownerDetails",
    foreignKey: "owner"
  })
  ownerDetails!: Users

  @Column({
    allowNull: false,
    defaultValue: "Member"
  })
  allowInvite!: string
}
