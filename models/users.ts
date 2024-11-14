import {
  Column,
  DataType,
  HasOne,
  HasMany,
  Model,
  Table
} from "sequelize-typescript"
import Friends from "../models/friends"
import Scores from "../models/scores"

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

  @Column({
    defaultValue: true
  })
  friendRequests!: boolean

  @Column
  status!: string

  @Column
  statusMessage!: string

  @Column
  gameName!: string

  @Column
  gameStatus!: string

  @Column(DataType.DATE)
  playingSince!: string

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

  @HasOne(() => Friends, "friendId")
  friend!: Friends

  @HasMany(() => Scores, "userId")
  tetris!: Scores[]
}
