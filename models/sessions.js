"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class Sessions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Sessions.belongsTo(models.Users, {
        as: "user"
      })
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
