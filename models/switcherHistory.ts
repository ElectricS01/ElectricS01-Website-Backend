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
export default class SwitcherHistory extends Model {
  @ForeignKey(() => Users)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: string

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  item!: string
}
