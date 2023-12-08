import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript"
import Friends from "../models/friends"

@Table
export default class Users extends Model {
  @Column({
    type: DataType.STRING,
    unique: true
  })
  username!: string

  @Column({
    allowNull: false,
    type: DataType.STRING,
    unique: true,
    validate: {
      isEmail: true
    }
  })
  email!: string

  @Column(DataType.STRING)
  password!: string

  @Column({
    defaultValue: false,
    type: DataType.BOOLEAN
  })
  emailVerified!: boolean

  @Column(DataType.STRING)
  emailToken!: string

  @Column({
    defaultValue: false,
    type: DataType.BOOLEAN
  })
  admin!: boolean

  @Column(DataType.STRING)
  avatar!: string

  @Column(DataType.STRING)
  banner!: string

  @Column(DataType.TEXT)
  description!: string

  @Column(DataType.STRING)
  directMessages!: string

  @Column(DataType.BOOLEAN)
  friendRequests!: boolean

  @Column(DataType.STRING)
  status!: string

  @Column(DataType.STRING)
  statusMessage!: string

  @Column(DataType.BOOLEAN)
  showCreated!: boolean

  @Column(DataType.BOOLEAN)
  saveSwitcher!: boolean

  @Column({ defaultValue: [], type: DataType.JSON })
  switcherHistory!: boolean

  @Column(DataType.STRING)
  tetris!: boolean

  @Column(DataType.STRING)
  tonkGame!: boolean

  @HasMany(() => Friends, "friendId")
  friend!: Friends[]
}
