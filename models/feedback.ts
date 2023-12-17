import { Column, ForeignKey, Model, Table } from "sequelize-typescript"
import Users from "./users"

@Table({
  freezeTableName: true
})
export default class Feedback extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  userId!: number

  @Column({
    allowNull: false
  })
  feedback!: string
}
