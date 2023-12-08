import { Sequelize } from "sequelize-typescript"
import config from "./config/config.json"

const dbConfig: Record<string, unknown> =
  config[(process.env.NODE_ENV || "development") as keyof typeof config]

const sequelize = new Sequelize({
  ...dbConfig,
  modelMatch: () => true,
  models: [`${__dirname}/models`]
})

export default sequelize
