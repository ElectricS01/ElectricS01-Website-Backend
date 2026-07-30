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
  declare userId: number

  @Column({
    allowNull: false,
    type: DataType.TEXT,
    unique: true
  })
  declare credentialID: string

  @Column({
    allowNull: false,
    type: DataType.TEXT
  })
  declare credentialPublicKey: string

  @Column({
    allowNull: false,
    type: DataType.BIGINT
  })
  declare counter: number

  @Column({
    allowNull: false
  })
  declare credentialDeviceType: string

  @Column({
    allowNull: false
  })
  declare credentialBackedUp: boolean

  @Column(DataType.TEXT)
  declare transports: string

  @Column({
    defaultValue: "Passkey"
  })
  declare name: string

  @BelongsTo(() => Users)
  declare user: Users
}
