import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table
} from "sequelize-typescript"
import Users from "./users"
import ChatAssociations from "./chatAssociations"

@Table
export default class Chats extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string

  @Column(DataType.STRING)
  description!: string

  @Column(DataType.STRING)
  icon!: string

  @ForeignKey(() => Users)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  owner!: number

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false
  })
  requireVerification!: boolean

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  latest!: boolean

  @Column({
    allowNull: false,
    type: DataType.INTEGER,
    defaultValue: 0
  })
  type!: number

  @HasMany(() => ChatAssociations)
  associations!: ChatAssociations[]

  @BelongsTo(() => Users, {
    foreignKey: "owner",
    as: "ownerDetails" // Provide the alias used in the association
  })
  ownerDetails!: Users

  @Column({
    allowNull: false,
    type: DataType.STRING,
    defaultValue: "Member"
  })
  allowInvite!: string
}
