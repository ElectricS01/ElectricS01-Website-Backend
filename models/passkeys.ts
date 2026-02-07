import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Users from "./users"

@Table
export default class Passkeys extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  userId!: number

  @Column({
    allowNull: false,
    type: DataType.TEXT,
    unique: true
  })
  credentialID!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT
  })
  credentialPublicKey!: string

  @Column({
    allowNull: false,
    type: DataType.BIGINT
  })
  counter!: number

  @Column({
    allowNull: false
  })
  credentialDeviceType!: string

  @Column({
    allowNull: false
  })
  credentialBackedUp!: boolean

  @Column(DataType.TEXT)
  transports!: string

  @Column({
    defaultValue: "Passkey"
  })
  name!: string

  @BelongsTo(() => Users)
  user!: Users
}
