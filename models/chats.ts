import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table
} from "sequelize-typescript"
import ChatAssociations from "./chatAssociations"
import Users from "./users"

@Table
export default class Chats extends Model {
  @Column({
    allowNull: false
  })
  name!: string

  @Column(DataType.STRING)
  description!: string

  @Column(DataType.STRING)
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
    defaultValue: 0,
    type: DataType.INTEGER
  })
  type!: number

  @HasMany(() => ChatAssociations)
  associations!: ChatAssociations[]

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
