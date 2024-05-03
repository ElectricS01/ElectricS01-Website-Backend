import { Sequelize } from "sequelize-typescript"
import * as process from "node:process"

const dbConfig: Record<string, unknown> = {
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  dialect: process.env.DATABASE_DIALECT
}

const sequelize = new Sequelize({
  ...dbConfig,
  modelMatch: () => true,
  models: [`${__dirname}/models`]
})

export default sequelize
