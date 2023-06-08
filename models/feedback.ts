import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey
} from "sequelize-typescript"
import Users from "./users"

@Table({
  freezeTableName: true
})
export default class Feedback extends Model {
  @ForeignKey(() => Users)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userID!: string

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  feedback!: string
}
