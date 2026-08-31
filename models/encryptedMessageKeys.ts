import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from "sequelize-typescript"
import Users from "./users"
import Messages from "./messages"

@Table({ timestamps: false })
export default class EncryptedMessageKeys extends Model {
  @PrimaryKey
  @ForeignKey(() => Messages)
  @Column({
    allowNull: false
  })
  declare messageId: number

  @PrimaryKey
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  declare userId: number

  @Column({
    allowNull: false,
    type: DataType.BLOB
  })
  declare encryptedMessageKey: Buffer

  @Column({
    allowNull: true,
    type: DataType.BLOB
  })
  declare nonce: Buffer

  @BelongsTo(() => Messages)
  declare message: Messages

  @BelongsTo(() => Users)
  declare user: Users
}
