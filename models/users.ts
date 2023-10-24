import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript"
import Friends from "../models/friends"

@Table
export default class Users extends Model {
  @Column({
    type: DataType.STRING,
    unique: true
  })
  username!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    },
    unique: true
  })
  email!: string

  @Column(DataType.STRING)
  password!: string

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  emailVerified!: boolean

  @Column(DataType.STRING)
  emailToken!: string

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
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

  @Column(DataType.JSON)
  switcherHistory!: boolean

  @Column(DataType.STRING)
  tetris!: boolean

  @Column(DataType.STRING)
  tonkgame!: boolean

  @HasMany(() => Friends, "friendId")
  friend!: Friends[]
}
