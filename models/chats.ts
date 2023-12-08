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
    allowNull: false,
    type: DataType.STRING
  })
  name!: string

  @Column(DataType.STRING)
  description!: string

  @Column(DataType.STRING)
  icon!: string

  @ForeignKey(() => Users)
  @Column({
    allowNull: false,
    type: DataType.INTEGER
  })
  owner!: number

  @Column({
    allowNull: false,
    type: DataType.BOOLEAN
  })
  requireVerification!: boolean

  @Column({
    allowNull: false,
    type: DataType.DATE
  })
  latest!: boolean

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
    defaultValue: "Member",
    type: DataType.STRING
  })
  allowInvite!: string
}
