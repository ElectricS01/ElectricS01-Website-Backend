"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class Feedback extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Feedback.hasOne(models.Friends, {
        foreignKey: "friendId",
        as: "friend"
      })
    }
  }
  Feedback.init(
    {
      userID: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      feedback: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Feedback"
    }
  )
  return Feedback
}
