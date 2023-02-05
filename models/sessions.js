"use strict"
const { Model } = require("sequelize")
const cryptoRandomString = require("crypto-random-string")
module.exports = (sequelize, DataTypes) => {
  class Sessions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Sessions.init(
    {
      token: {
        type: DataTypes.STRING
      },
      userId: {
        type: DataTypes.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      expiredAt: {
        type: DataTypes.DATE
      }
    },
    {
      sequelize,
      modelName: "Sessions"
    }
  )
  return Sessions
}
