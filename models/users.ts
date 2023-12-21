import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript"
import Friends from "../models/friends"

@Table
export default class Users extends Model {
  @Column({
    unique: true
  })
  username!: string

  @Column({
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  })
  email!: string

  @Column
  password!: string

  @Column({
    defaultValue: false
  })
  emailVerified!: boolean

  @Column
  emailToken!: string

  @Column({
    defaultValue: false
  })
  admin!: boolean

  @Column
  avatar!: string

  @Column
  banner!: string

  @Column(DataType.TEXT)
  description!: string

  @Column
  directMessages!: string

  @Column
  friendRequests!: boolean

  @Column
  status!: string

  @Column
  statusMessage!: string

  @Column
  showCreated!: boolean

  @Column
  saveSwitcher!: boolean

  @Column({ defaultValue: "off" })
  encryption!: string

  @Column({ defaultValue: false })
  savePrivateKey!: boolean

  @Column(DataType.TEXT)
  publicKey!: string

  @Column(DataType.TEXT)
  privateKey!: string

  @Column({ defaultValue: [], type: DataType.JSON })
  switcherHistory!: boolean

  @Column
  tetris!: string

  @Column
  tonkGame!: string

  @HasMany(() => Friends, "friendId")
  friend!: Friends[]
}
