import {
  Column,
  DataType,
  HasMany,
  HasOne,
  Model,
  Table
} from "sequelize-typescript"
import Friends from "../models/friends"
import Scores from "../models/scores"
import Passkeys from "../models/passkeys"
import { EncryptionType } from "../types/user"

@Table
export default class Users extends Model {
  @Column({
    allowNull: false,
    unique: true
  })
  declare username: string

  @Column({
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  })
  declare email: string

  @Column
  declare password: string

  @Column({
    defaultValue: false
  })
  declare emailVerified: boolean

  @Column
  declare emailToken: string

  @Column({
    defaultValue: false
  })
  declare otpVerified: boolean

  @Column
  declare otpSecret: string

  @Column({
    defaultValue: false
  })
  declare admin: boolean

  @Column
  declare avatar: string

  @Column
  declare banner: string

  @Column(DataType.TEXT)
  declare description: string

  @Column({
    defaultValue: "everyone"
  })
  declare directMessages: string

  @Column({
    defaultValue: true
  })
  declare friendRequests: boolean

  @Column({ defaultValue: "online" })
  declare status: string

  @Column
  declare statusMessage: string

  @Column
  declare gameName: string

  @Column
  declare gameStatus: string

  @Column(DataType.DATE)
  declare playingSince: string

  @Column({
    defaultValue: true
  })
  declare showCreated: boolean

  @Column({ defaultValue: true })
  declare saveSwitcher: boolean

  @Column({
    allowNull: false,
    defaultValue: EncryptionType.Off,
    type: DataType.STRING
  })
  declare encryption: EncryptionType

  @Column({ defaultValue: false })
  declare savePrivateKey: boolean

  @Column(DataType.TEXT)
  declare publicKey: string

  @Column(DataType.TEXT)
  declare privateKey: string

  @Column({ defaultValue: [], type: DataType.JSON })
  declare switcherHistory: boolean

  @HasOne(() => Friends, "friendId")
  declare friend: Friends

  @HasMany(() => Scores, "userId")
  declare tetris: Scores[]

  @HasMany(() => Passkeys, "userId")
  declare passkeys: Passkeys[]
}
